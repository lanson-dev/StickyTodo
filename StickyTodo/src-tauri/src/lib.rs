use std::fs;
use std::path::PathBuf;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

// ── Helpers ───────────────────────────────────────────────────────────────────

fn data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap_or_default()
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
fn load_todos(app: tauri::AppHandle) -> String {
    let path = data_dir(&app).join("todos.json");
    fs::read_to_string(path).unwrap_or_else(|_| "[]".into())
}

#[tauri::command]
fn save_todos(app: tauri::AppHandle, data: String) {
    let dir = data_dir(&app);
    let _ = fs::create_dir_all(&dir);
    let _ = fs::write(dir.join("todos.json"), data);
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> String {
    let path = data_dir(&app).join("config.json");
    fs::read_to_string(path).unwrap_or_else(|_| "{}".into())
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, data: String) {
    let dir = data_dir(&app);
    let _ = fs::create_dir_all(&dir);
    let _ = fs::write(dir.join("config.json"), data);
}

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, flag: bool) {
    let _ = window.set_always_on_top(flag);
}

#[tauri::command]
fn minimize_window(window: tauri::WebviewWindow) {
    let _ = window.minimize();
}

#[tauri::command]
fn close_window(window: tauri::WebviewWindow) {
    let _ = window.close();
}

// ── Entry point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();

            // Restore saved window state (size / position / alwaysOnTop)
            let dir = app.path().app_data_dir().unwrap_or_default();
            if let Ok(s) = fs::read_to_string(dir.join("config.json")) {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
                    if let (Some(w), Some(h)) = (v["width"].as_u64(), v["height"].as_u64()) {
                        let _ = win.set_size(tauri::PhysicalSize::new(w as u32, h as u32));
                    }
                    if let (Some(x), Some(y)) = (v["x"].as_i64(), v["y"].as_i64()) {
                        let _ = win
                            .set_position(tauri::PhysicalPosition::new(x as i32, y as i32));
                    }
                    if v["alwaysOnTop"].as_bool().unwrap_or(false) {
                        let _ = win.set_always_on_top(true);
                    }
                }
            }

            // Persist window bounds on move / resize (debounced 500 ms)
            let app_handle = app.handle().clone();
            let last_save = Arc::new(AtomicU64::new(0));

            win.on_window_event(move |event| {
                if !matches!(
                    event,
                    tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_)
                ) {
                    return;
                }
                let now = now_ms();
                if now.saturating_sub(last_save.load(Ordering::Relaxed)) < 500 {
                    return;
                }
                last_save.store(now, Ordering::Relaxed);

                let win = match app_handle.get_webview_window("main") {
                    Some(w) => w,
                    None => return,
                };
                let (pos, size) = match (win.outer_position(), win.outer_size()) {
                    (Ok(p), Ok(s)) => (p, s),
                    _ => return,
                };

                let dir = data_dir(&app_handle);
                let config_path = dir.join("config.json");
                let mut v = fs::read_to_string(&config_path)
                    .ok()
                    .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                    .unwrap_or(serde_json::json!({}));

                v["x"] = serde_json::json!(pos.x);
                v["y"] = serde_json::json!(pos.y);
                v["width"] = serde_json::json!(size.width);
                v["height"] = serde_json::json!(size.height);

                let _ = fs::create_dir_all(&dir);
                let _ = fs::write(&config_path, v.to_string());
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_todos,
            save_todos,
            load_config,
            save_config,
            set_always_on_top,
            minimize_window,
            close_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
