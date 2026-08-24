use std::sync::{Arc, Mutex};

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
    let resource_dir = app.path().resource_dir()?;
    let next_dir = resource_dir.join("next");
    let (mut events, child) = app
        .shell()
        .sidecar("node")
        .map_err(|error| tauri::Error::Anyhow(error.into()))?
        .args(["server.js"])
        .current_dir(next_dir)
        .env("HOSTNAME", "127.0.0.1")
        .env("PORT", NEXT_PORT.to_string())
        .env("NODE_ENV", "production")
        .spawn()
        .map_err(|error| tauri::Error::Anyhow(error.into()))?;

    let child = Arc::new(Mutex::new(Some(child)));
    app.manage(NextServer {
        child: Arc::clone(&child),
    });

    tauri::async_runtime::spawn(async move {
        while events.recv().await.is_some() {}
    });

    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };

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
