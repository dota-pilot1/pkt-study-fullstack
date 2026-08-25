use std::{
    fs::OpenOptions,
    io::Write,
    sync::{Arc, Mutex},
};

use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;

#[cfg(not(debug_assertions))]
const NEXT_PORT: u16 = 4300;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            #[cfg(not(debug_assertions))]
            start_next_sidecar(_app.handle())?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running PKT Study Fullstack");

    app.run(|app, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            if let Some(server) = app.try_state::<NextServer>() {
                if let Some(child) = server.child.lock().expect("sidecar lock").take() {
                    let _ = child.kill();
                }
            }
        }
    });
}

struct NextServer {
    child: Arc<Mutex<Option<CommandChild>>>,
}

#[cfg(not(debug_assertions))]
fn start_next_sidecar<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) -> tauri::Result<()> {
    use std::{thread, time::Duration};
    use tauri_plugin_shell::ShellExt;

    let app: tauri::AppHandle<R> = (*app_handle).clone();
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
    eprintln!("resource directory: {}", resource_dir.display());
    eprintln!("next directory: {}", next_dir.display());
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
        .env("PORT", NEXT_PORT.to_string())
        .env("NODE_ENV", "production")
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
            if std::net::TcpStream::connect(("127.0.0.1", NEXT_PORT)).is_ok() {
                let _ = window.eval("window.location.replace('http://127.0.0.1:4300')");
                return;
            }
            thread::sleep(Duration::from_millis(250));
        }
        let _ = window.eval("document.querySelector('.status').textContent = '서버를 시작하지 못했습니다.'");
    });

    Ok(())
}
