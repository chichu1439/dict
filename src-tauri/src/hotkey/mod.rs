pub mod models;

use crate::hotkey::models::HotkeyConfig;

#[tauri::command]
pub fn get_hotkeys() -> HotkeyConfig {
    HotkeyConfig::default()
}

#[tauri::command]
pub fn set_hotkey(action: String, shortcut: String) -> Result<(), String> {
    Ok(())
}
