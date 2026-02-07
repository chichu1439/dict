pub mod models;

use crate::hotkey::models::HotkeyConfig;

#[tauri::command]
pub fn get_hotkeys() -> HotkeyConfig {
    HotkeyConfig::default()
}

#[tauri::command]
pub fn set_hotkey(_action: String, _shortcut: String) -> Result<(), String> {
    Ok(())
}
