// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod translate;
mod services;
mod ocr;
mod hotkey;

use models::{TranslationRequest, TranslationResponse};
use translate::TranslationService;
use ocr::models::{OcrRequest, OcrResult};
use hotkey::models::HotkeyConfig;

#[tauri::command]
async fn ocr(request: OcrRequest) -> Result<OcrResult, String> {
    ocr::perform_ocr(request).await
}

#[tauri::command]
fn get_hotkeys() -> HotkeyConfig {
    hotkey::get_hotkeys()
}

#[tauri::command]
fn set_hotkey(action: String, shortcut: String) -> Result<(), String> {
    hotkey::set_hotkey(action, shortcut)
}

#[tauri::command]
async fn translate(request: TranslationRequest) -> Result<TranslationResponse, String> {
    use services::{openai::OpenAIService, deepl::DeepLService};
    
    let mut results = Vec::new();
    let openai = OpenAIService;
    let deepl = DeepLService;
    
    for service_name in &request.services {
        if service_name == "OpenAI" {
            if let Ok(result) = openai.translate(&request, "").await {
                results.push(result);
            }
        } else if service_name == "DeepL" {
            if let Ok(result) = deepl.translate(&request, "").await {
                results.push(result);
            }
        }
    }
    
    Ok(TranslationResponse { results })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
