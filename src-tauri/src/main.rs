// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod error;
mod models;
mod ocr;
mod hotkey;
mod tts;
mod services;
mod phonetic;
mod dictionary;

use error::AppError;
use models::{TranslationRequest, TranslationResponse};
use ocr::models::{OcrRequest, OcrResult};
use ocr::mathpix::{MathpixRequest, MathpixResult};
use tts::models::{TtsRequest, TtsResponse};

fn error_to_string<E: Into<AppError>>(err: E) -> String {
    err.into().to_string()
}

#[tauri::command]
async fn translate(request: TranslationRequest) -> Result<TranslationResponse, String> {
    services::translate(request).await.map_err(error_to_string)
}

#[tauri::command]
async fn translate_stream(app: tauri::AppHandle, request: TranslationRequest, request_id: String) -> Result<(), String> {
    services::translate_stream(app, request, request_id).await.map_err(error_to_string)
}

#[tauri::command]
async fn ocr(request: OcrRequest) -> Result<OcrResult, String> {
    ocr::perform_ocr(request).await.map_err(|e: AppError| e.to_string())
}

#[tauri::command]
async fn ocr_with_engine(request: OcrRequest, engine: String) -> Result<OcrResult, String> {
    ocr::perform_ocr_with_engine(request, &engine).await.map_err(|e: AppError| e.to_string())
}

#[tauri::command]
async fn capture_and_ocr(x: i32, y: i32, w: i32, h: i32, language: Option<String>) -> Result<OcrResult, String> {
    ocr::capture_and_ocr(x, y, w, h, language).await.map_err(|e: AppError| e.to_string())
}

#[tauri::command]
async fn capture_and_ocr_with_engine(x: i32, y: i32, w: i32, h: i32, language: Option<String>, engine: String) -> Result<OcrResult, String> {
    ocr::capture_and_ocr_with_engine(x, y, w, h, language, &engine).await.map_err(|e: AppError| e.to_string())
}

#[tauri::command]
async fn init_paddle_ocr_cmd() -> Result<String, String> {
    ocr::paddle::init_paddle_ocr().await.map(|_| "PaddleOCR initialized successfully".to_string()).map_err(|e: AppError| e.to_string())
}

#[tauri::command]
fn check_paddle_ocr_status() -> bool {
    ocr::paddle::is_paddle_ocr_available()
}

#[tauri::command]
async fn capture_screen(x: i32, y: i32, w: i32, h: i32) -> Result<String, String> {
    ocr::capture_screen(x, y, w, h).await.map_err(|e: AppError| e.to_string())
}

#[tauri::command]
async fn speak(request: TtsRequest) -> Result<TtsResponse, String> {
    tts::speak(request).await.map_err(|e: AppError| e.to_string())
}

#[tauri::command]
fn get_phonetic(text: String) -> Result<Option<phonetic::PhoneticResult>, String> {
    if phonetic::is_single_english_word(&text) {
        Ok(phonetic::get_phonetic_both(&text))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn lookup_dictionary(word: String) -> Result<Option<dictionary::DictionaryEntry>, String> {
    match dictionary::lookup_word(&word).await {
        Ok(entries) => {
            if let Some(entry) = entries.into_iter().next() {
                Ok(Some(entry))
            } else {
                Ok(None)
            }
        }
        Err(e) => {
            println!("Dictionary lookup failed: {}", e);
            Ok(None)
        }
    }
}

#[tauri::command]
async fn recognize_formula(request: MathpixRequest, config: Option<serde_json::Value>) -> Result<MathpixResult, String> {
    ocr::mathpix::recognize_formula(request.image_data, request.image_url, config.as_ref())
        .await
        .map_err(|e: AppError| e.to_string())
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
    Err(AppError::PlatformNotSupported("Monitor info only available on Windows".to_string()).to_string())
}

use tauri::Emitter;
use tauri::Manager;

#[tauri::command]
async fn emit_to_main<R: tauri::Runtime>(app: tauri::AppHandle<R>, event: String, payload: String) -> Result<(), String> {
    if let Some(main) = app.get_webview_window("main") {
        if let Ok(is_minimized) = main.is_minimized() {
            if is_minimized {
                let _ = main.unminimize();
            }
        }
        
        let _ = main.show();
        let _ = main.set_focus();

        main.emit(&event, payload).map_err(|e| AppError::Unknown(e.to_string()).to_string())
    } else {
        Err(AppError::Unknown("Main window not found".to_string()).to_string())
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
            ocr_with_engine,
            capture_and_ocr, 
            capture_and_ocr_with_engine,
            capture_screen, 
            speak,
            get_phonetic,
            lookup_dictionary,
            recognize_formula,
            init_paddle_ocr_cmd,
            check_paddle_ocr_status,
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
