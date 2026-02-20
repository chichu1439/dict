// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod ocr;
mod hotkey;
mod tts;
mod services;

use models::{TranslationRequest, TranslationResponse};
use ocr::models::{OcrRequest, OcrResult};
use tts::models::{TtsRequest, TtsResponse};

#[tauri::command]
async fn translate(request: TranslationRequest) -> Result<TranslationResponse, String> {
    services::translate(request).await
}

#[tauri::command]
async fn translate_stream(app: tauri::AppHandle, request: TranslationRequest, request_id: String) -> Result<(), String> {
    services::translate_stream(app, request, request_id).await
}

#[tauri::command]
async fn ocr(request: OcrRequest) -> Result<OcrResult, String> {
    ocr::perform_ocr(request).await
}

#[tauri::command]
async fn capture_and_ocr(x: i32, y: i32, w: i32, h: i32, language: Option<String>) -> Result<OcrResult, String> {
    ocr::capture_and_ocr(x, y, w, h, language).await
}

#[tauri::command]
async fn capture_screen(x: i32, y: i32, w: i32, h: i32) -> Result<String, String> {
    ocr::capture_screen(x, y, w, h).await
}

#[tauri::command]
async fn speak(request: TtsRequest) -> Result<TtsResponse, String> {
    tts::speak(request).await
}

use serde::Serialize;

#[derive(Serialize)]
struct MonitorInfo {
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    name: String,
}

#[tauri::command]
async fn get_mouse_monitor() -> Result<MonitorInfo, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;
        use windows::Win32::Graphics::Gdi::{MonitorFromPoint, GetMonitorInfoW, MONITOR_DEFAULTTONEAREST, MONITORINFOEXW};
        use windows::Win32::Foundation::POINT;
        
        unsafe {
            let mut point = POINT::default();
            let _ = GetCursorPos(&mut point);
            
            let h_monitor = MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST);
            let mut mi = MONITORINFOEXW::default();
            mi.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
            
            if GetMonitorInfoW(h_monitor, &mut mi as *mut _ as *mut _).as_bool() {
                let rect = mi.monitorInfo.rcMonitor;
                let name = String::from_utf16_lossy(&mi.szDevice);
                let name = name.trim_matches('\0').to_string();

                return Ok(MonitorInfo {
                    x: rect.left,
                    y: rect.top,
                    w: rect.right - rect.left,
                    h: rect.bottom - rect.top,
                    name,
                });
            }
        }
    }
    Err("Not supported on this platform".to_string())
}

use tauri::Emitter;
use tauri::Manager;

#[tauri::command]
async fn emit_to_main<R: tauri::Runtime>(app: tauri::AppHandle<R>, event: String, payload: String) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        // Force window to foreground
        // Unminimize first
        if let Ok(is_minimized) = main.is_minimized() {
            if is_minimized {
                let _ = main.unminimize();
            }
        }
        
        // Show window
        let _ = main.show();
        
        // Focus window
        let _ = main.set_focus();
        
        // Force activate on Windows
        #[cfg(target_os = "windows")]
        {
            // Optional: Use Win32 API to force foreground if set_focus fails
            // But usually set_focus works if called from backend user interaction chain
        }

        // We need to parse the payload back to JSON or send as string?
        // Let's send as string and let frontend parse it, or use emit directly if we can
        // But emit takes Serialize. String is Serialize.
        main.emit(&event, payload).map_err(|e| e.to_string())
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
fn ocr_ready_check() -> Result<(), String> {
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(hotkey::HotkeyState::new())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(|app, shortcut, _event| {
            hotkey::handle_shortcut(app, shortcut);
        }).build())
        .invoke_handler(tauri::generate_handler![
            translate, 
            translate_stream, 
            ocr, 
            capture_and_ocr, 
            capture_screen, 
            speak, 
            hotkey::get_hotkeys, 
            hotkey::set_hotkey, 
            hotkey::register_hotkeys, 
            hotkey::clear_hotkey_processing, 
            get_mouse_monitor,
            emit_to_main,
            ocr_ready_check
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
