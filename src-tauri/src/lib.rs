use std::sync::{Arc, Mutex};

// 배포 빌드에서 실행되는 Next sidecar 초기화에만 필요한 import다.
// 개발 모드에서는 사용하지 않으므로 조건부로 가져와 Rust warning을 막는다.
#[cfg(not(debug_assertions))]
use std::{
    fs::OpenOptions,
    io::Write,
    net::TcpListener,
};

use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_shell::process::CommandChild;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    let app = builder
        .setup(|_app| {
            #[cfg(not(debug_assertions))]
            start_next_sidecar(_app.handle())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window_minimize,
            window_toggle_maximize,
            window_close,
            window_is_maximized,
        ])
        .build(tauri::generate_context!())
        .expect("error while running PKT Study Fullstack");

    app.run(|app, event| {
        match event {
            tauri::RunEvent::ExitRequested { .. }
            | tauri::RunEvent::WindowEvent {
                event: tauri::WindowEvent::CloseRequested { .. },
                ..
            } => stop_next_server(app),
            _ => {}
        }
    });
}

fn stop_next_server<R: tauri::Runtime>(app: &AppHandle<R>) {
    if let Some(server) = app.try_state::<NextServer>() {
        if let Some(child) = server.child.lock().expect("sidecar lock").take() {
            let _ = child.kill();
        }
    }
}

#[tauri::command]
fn window_minimize(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|error| error.to_string())
}

#[tauri::command]
fn window_toggle_maximize(window: WebviewWindow) -> Result<bool, String> {
    let maximized = window.is_maximized().map_err(|error| error.to_string())?;
    if maximized {
        window.unmaximize().map_err(|error| error.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|error| error.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
fn window_close(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    stop_next_server(&app);
    window.close().map_err(|error| error.to_string())?;
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn window_is_maximized(window: WebviewWindow) -> Result<bool, String> {
    window.is_maximized().map_err(|error| error.to_string())
}

struct NextServer {
    child: Arc<Mutex<Option<CommandChild>>>,
}

#[cfg(not(debug_assertions))]
fn start_next_sidecar<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) -> tauri::Result<()> {
    use std::{thread, time::Duration};
    use tauri_plugin_shell::ShellExt;

    let app: tauri::AppHandle<R> = (*app_handle).clone();
    let next_port = TcpListener::bind(("127.0.0.1", 0))
        .and_then(|listener| listener.local_addr())
        .map(|address| address.port())
        .map_err(|error| {
            tauri::Error::Anyhow(std::io::Error::new(
                std::io::ErrorKind::AddrNotAvailable,
                format!("failed to allocate Next.js port: {error}"),
            ).into())
        })?;
    let resource_dir = match app.path().resource_dir() {
        Ok(path) => path,
        Err(error) => {
            let fallback = std::env::current_exe()
                .ok()
                .and_then(|path| path.parent().map(|dir| dir.to_path_buf()))
                .and_then(|macos_dir| macos_dir.parent().map(|dir| dir.join("Resources")));
            if let Some(path) = fallback.filter(|path| path.is_dir()) {
                eprintln!("resource directory lookup failed ({error}); using {}", path.display());
                path
            } else {
                eprintln!("resource directory lookup failed: {error}");
                return Err(error);
            }
        }
    };
    let next_dir = resource_dir.join("next");
    let data_dir = app_handle.path().app_data_dir().map_err(|error| {
        tauri::Error::Anyhow(error.into())
    })?;
    std::fs::create_dir_all(&data_dir).map_err(|error| {
        tauri::Error::Anyhow(error.into())
    })?;
    let database_path = data_dir.join("pkt-study.db");
    let packaged_database_path = next_dir.join(".data").join("pkt-study.db");
    if !database_path.exists() && packaged_database_path.exists() {
        std::fs::copy(&packaged_database_path, &database_path).map_err(|error| {
            tauri::Error::Anyhow(error.into())
        })?;
        eprintln!("initialized user SQLite database from packaged local seed: {}", database_path.display());
    }
    eprintln!("resource directory: {}", resource_dir.display());
    eprintln!("next directory: {}", next_dir.display());
    eprintln!("SQLite data directory: {}", data_dir.display());
    let sidecar = match app.shell().sidecar("node") {
        Ok(command) => command,
        Err(error) => {
            eprintln!("node sidecar lookup failed: {error}");
            return Err(tauri::Error::Anyhow(error.into()));
        }
    };
    let (mut events, child) = sidecar
        .args(["server.js"])
        .current_dir(next_dir)
        .env("HOSTNAME", "127.0.0.1")
        .env("PORT", next_port.to_string())
        .env("NODE_ENV", "production")
        .env("PKT_STUDY_DESKTOP", "1")
        .env("PKT_STUDY_DATA_DIR", data_dir.to_string_lossy().to_string())
        .env("PKT_STUDY_SEED_DB", packaged_database_path.to_string_lossy().to_string())
        .spawn()
        .map_err(|error| {
            eprintln!("node sidecar spawn failed: {error}");
            tauri::Error::Anyhow(error.into())
        })?;

    let child = Arc::new(Mutex::new(Some(child)));
    app.manage(NextServer {
        child: Arc::clone(&child),
    });

    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let log_path = std::env::temp_dir().join("pkt-study-fullstack-next.log");
    let event_window = window.clone();
    tauri::async_runtime::spawn(async move {
        let mut log = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)
            .ok();
        while let Some(event) = events.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    let message = String::from_utf8_lossy(&line);
                    if let Some(log) = log.as_mut() {
                        let _ = writeln!(log, "[stderr] {message}");
                    }
                    let _ = event_window.eval(
                        "document.querySelector('.status').textContent = 'Next 서버 오류 로그가 기록되었습니다.'",
                    );
                }
                tauri_plugin_shell::process::CommandEvent::Error(error) => {
                    if let Some(log) = log.as_mut() {
                        let _ = writeln!(log, "[error] {error}");
                    }
                    let _ = event_window.eval(
                        "document.querySelector('.status').textContent = 'Next 서버 실행 오류가 발생했습니다.'",
                    );
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                    if let Some(log) = log.as_mut() {
                        let _ = writeln!(log, "[terminated] code={:?} signal={:?}", payload.code, payload.signal);
                    }
                    let _ = event_window.eval(
                        "document.querySelector('.status').textContent = 'Next 서버가 종료되었습니다. 로그를 확인하세요.'",
                    );
                    break;
                }
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    if let Some(log) = log.as_mut() {
                        let _ = writeln!(log, "[stdout] {}", String::from_utf8_lossy(&line));
                    }
                }
                _ => {}
            }
        }
    });

    thread::spawn(move || {
        for _ in 0..120 {
            if std::net::TcpStream::connect(("127.0.0.1", next_port)).is_ok() {
                let _ = window.eval(&format!("window.location.replace('http://127.0.0.1:{next_port}')"));
                return;
            }
            thread::sleep(Duration::from_millis(250));
        }
        let _ = window.eval("document.querySelector('.status').textContent = '서버를 시작하지 못했습니다.'");
    });

    Ok(())
}
