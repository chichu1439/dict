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
async fn ocr(_request: OcrRequest) -> Result<OcrResult, String> {
    ocr::perform_ocr(_request).await
}

#[tauri::command]
async fn speak(_request: TtsRequest) -> Result<TtsResponse, String> {
    tts::speak(_request).await
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![translate, ocr, speak, hotkey::get_hotkeys, hotkey::set_hotkey])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
