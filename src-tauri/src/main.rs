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
async fn ocr(request: OcrRequest) -> Result<OcrResult, String> {
    ocr::perform_ocr(request).await
}

#[tauri::command]
async fn capture_and_ocr(x: i32, y: i32, w: i32, h: i32) -> Result<OcrResult, String> {
    ocr::capture_and_ocr(x, y, w, h).await
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

fn main() {
    tauri::Builder::default()
        .manage(hotkey::HotkeyState::new())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(|app, shortcut, _event| {
            hotkey::handle_shortcut(app, shortcut);
        }).build())
        .invoke_handler(tauri::generate_handler![translate, ocr, capture_and_ocr, capture_screen, speak, hotkey::get_hotkeys, hotkey::set_hotkey, hotkey::register_hotkeys, hotkey::clear_hotkey_processing, get_mouse_monitor])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}