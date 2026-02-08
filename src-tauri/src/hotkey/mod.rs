use tauri::{AppHandle, Manager, Runtime, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_clipboard_manager::ClipboardExt;
use std::sync::Mutex;
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Duration;
use enigo::{Enigo, Key, Keyboard, Settings, Direction};

pub mod models;
use models::{HotkeyConfig, HotkeyAction};

pub struct HotkeyState {
    pub mapping: Mutex<HashMap<String, String>>,
    pub is_processing: Mutex<bool>,
}

impl HotkeyState {
    pub fn new() -> Self {
        Self {
            mapping: Mutex::new(HashMap::new()),
            is_processing: Mutex::new(false),
        }
    }
}

#[tauri::command]
pub fn get_hotkeys() -> HotkeyConfig {
    HotkeyConfig::default()
}

#[tauri::command]
pub fn set_hotkey(_action: String, _shortcut: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn clear_hotkey_processing(app: AppHandle) -> Result<(), String> {
    if let Some(state) = app.try_state::<HotkeyState>() {
        *state.is_processing.lock().unwrap() = false;
        println!("Hotkey processing flag cleared by frontend");
        Ok(())
    } else {
        Err("Hotkey state not found".to_string())
    }
}

#[tauri::command]
pub fn register_hotkeys(app: AppHandle, hotkeys: Vec<HotkeyAction>) -> Result<(), String> {
    println!("register_hotkeys called with {} hotkeys", hotkeys.len());
    
    // Debug: Print all received hotkeys
    for (i, hotkey) in hotkeys.iter().enumerate() {
        println!("Hotkey {}: name='{}', shortcut='{}'", i, hotkey.name, hotkey.shortcut);
    }
    
    let state = app.state::<HotkeyState>();
    let global_shortcut = app.global_shortcut();
    
    // Try to unregister any existing shortcuts first
    println!("Attempting to unregister any existing shortcuts...");
    match global_shortcut.unregister_all() {
        Ok(_) => println!("Successfully unregistered existing shortcuts"),
        Err(e) => println!("No existing shortcuts to unregister or failed: {}", e),
    }
    // Small delay to ensure cleanup
    std::thread::sleep(std::time::Duration::from_millis(50));

    let mut mapping = state.mapping.lock().unwrap();
    mapping.clear();

    for hotkey in hotkeys {
        if hotkey.shortcut.trim().is_empty() {
            continue;
        }
        
        let shortcut_str = hotkey.shortcut.clone();
        let action_name = hotkey.name.clone();
        
        // Register the shortcut
        match global_shortcut.register(shortcut_str.as_str()) {
            Ok(_) => {
                if let Ok(shortcut_obj) = Shortcut::from_str(&shortcut_str) {
                    let normalized_str = shortcut_obj.to_string();
                    println!("Registered hotkey: {} -> {} (Action: {})", shortcut_str, normalized_str, action_name);
                    
                    // 注册多种格式以确保匹配
                    let formats = generate_shortcut_formats(&normalized_str);
                    for format in formats {
                        mapping.insert(format, action_name.clone());
                    }
                }
            },
            Err(e) => {
                println!("Failed to register shortcut {}: {}", shortcut_str, e);
                return Err(format!("Failed to register {}: {}", shortcut_str, e));
            }
        }
    }
    
    // 打印当前映射用于调试
    println!("Current hotkey mappings:");
    for (key, value) in mapping.iter() {
        println!("  {} -> {}", key, value);
    }
    
    Ok(())
}

fn generate_shortcut_formats(shortcut: &str) -> Vec<String> {
    let mut formats = Vec::new();
    
    // 原始格式
    formats.push(shortcut.to_string());
    
    // 转换为小写
    formats.push(shortcut.to_lowercase());
    
    // 移除Key前缀的格式
    let no_key = shortcut.replace("Key", "");
    if no_key != shortcut {
        formats.push(no_key.clone());
        formats.push(no_key.to_lowercase());
    }
    
    // 处理control/ctrl变体
    if shortcut.contains("control") {
        let ctrl_version = shortcut.replace("control", "ctrl");
        formats.push(ctrl_version.clone());
        formats.push(ctrl_version.to_lowercase());
        
        let no_key_ctrl = ctrl_version.replace("Key", "");
        if no_key_ctrl != ctrl_version {
            formats.push(no_key_ctrl.clone());
            formats.push(no_key_ctrl.to_lowercase());
        }
    }
    
    // 处理cmd/command变体（macOS）
    if shortcut.contains("cmd") && !shortcut.contains("command") {
        let command_version = shortcut.replace("cmd", "command");
        formats.push(command_version.clone());
        formats.push(command_version.to_lowercase());
    }
    
    formats
}

pub fn handle_shortcut<R: Runtime>(app: &AppHandle<R>, shortcut: &Shortcut) {
    let shortcut_str = shortcut.to_string();
    let state = app.state::<HotkeyState>();
    
    println!("Received shortcut: {}", shortcut_str);
    
    // Check if already processing to prevent duplicate triggers
    let is_processing = state.is_processing.lock().unwrap();
    if *is_processing {
        println!("Hotkey processing in progress, ignoring: {}", shortcut_str);
        return;
    }
    drop(is_processing);

    let action_name = {
        let mapping = state.mapping.lock().unwrap();
        
        println!("Looking for action for shortcut: {}", shortcut_str);
        println!("Available mappings count: {}", mapping.len());
        
        // 尝试多种格式匹配
        let formats = generate_shortcut_formats(&shortcut_str);
        println!("Generated {} formats to try: {:?}", formats.len(), formats);
        
        let mut found_action = None;
        
        for format in formats {
            println!("Trying format: {}", format);
            if let Some(action) = mapping.get(&format) {
                println!("✅ Matched format: {} -> {}", format, action);
                found_action = Some(action.clone());
                break;
            }
        }
        
        if found_action.is_none() {
            println!("❌ No action found for shortcut: {}", shortcut_str);
            println!("Available mappings:");
            for (key, value) in mapping.iter().take(10) { // Show first 10 mappings
                println!("  {} -> {}", key, value);
            }
            if mapping.len() > 10 {
                println!("  ... and {} more mappings", mapping.len() - 10);
            }
        }
        
        found_action
    };

    if let Some(action) = action_name {
        println!("Shortcut triggered: {} -> {}", shortcut_str, action);
        
        // Set processing flag
        *state.is_processing.lock().unwrap() = true;
        
        match action.as_str() {
            "input_translation" => {
                handle_input_translation(app);
            },
            "select_translation" => {
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    perform_selection_translation(app_handle).await;
                });
            },
            "screenshot_ocr" => {
                handle_screenshot_ocr(app, false);
            },
            "silent_ocr" => {
                handle_screenshot_ocr(app, true);
            },
            _ => {
                println!("Unknown action: {}", action);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("global-shortcut", shortcut_str);
                }
                // Clear processing flag for unknown actions
                *state.is_processing.lock().unwrap() = false;
            }
        }
    } else {
        println!("No action found for shortcut: {}", shortcut_str);
        // Clear processing flag
        *state.is_processing.lock().unwrap() = false;
    }
}

fn handle_input_translation<R: Runtime>(app: &AppHandle<R>) {
    println!("Handling input translation");
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("focus-input", ());
        println!("Emitted focus-input event");
    }
    // Clear processing flag
    if let Some(state) = app.try_state::<HotkeyState>() {
        *state.is_processing.lock().unwrap() = false;
    }
}

fn handle_screenshot_ocr<R: Runtime>(app: &AppHandle<R>, silent: bool) {
    println!("Handling screenshot OCR, silent: {}", silent);
    if let Some(window) = app.get_webview_window("main") {
        let event_name = if silent { "trigger-silent-ocr" } else { "trigger-screenshot" };
        let _ = window.emit(event_name, ());
        println!("Emitted {} event", event_name);
    }
    // DON'T clear processing flag here - let the frontend handle it
    // The frontend will clear the flag when the screenshot process is complete
    println!("Screenshot OCR event emitted, processing flag retained");
}

async fn perform_selection_translation<R: Runtime>(app: AppHandle<R>) {
    println!("Starting selection translation...");
    
    // Small delay to ensure hotkey is released
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // 1. Simulate Ctrl+C with better error handling
    let copy_success = tauri::async_runtime::spawn_blocking(|| {
        match Enigo::new(&Settings::default()) {
            Ok(mut enigo) => {
                #[cfg(target_os = "macos")]
                {
                    println!("Using macOS copy shortcut (Cmd+C)");
                    let _ = enigo.key(Key::Meta, Direction::Press);
                    let _ = enigo.key(Key::C, Direction::Click);
                    let _ = enigo.key(Key::Meta, Direction::Release);
                }
                #[cfg(not(target_os = "macos"))]
                {
                    println!("Using Windows/Linux copy shortcut (Ctrl+C)");
                    let _ = enigo.key(Key::Control, Direction::Press);
                    let _ = enigo.key(Key::C, Direction::Click);
                    let _ = enigo.key(Key::Control, Direction::Release);
                }
                true
            },
            Err(e) => {
                println!("Failed to initialize Enigo: {}", e);
                false
            }
        }
    }).await.unwrap_or(false);

    if !copy_success {
        println!("Failed to simulate copy operation");
        // Clear processing flag
        if let Some(state) = app.try_state::<HotkeyState>() {
            *state.is_processing.lock().unwrap() = false;
        }
        return;
    }

    println!("Copy operation simulated successfully");

    // 2. Wait for clipboard to update with progressive delays
    let mut clipboard_text = String::new();
    for attempt in 1..=3 {
        tokio::time::sleep(Duration::from_millis(100 * attempt)).await;
        
        if let Ok(text) = app.clipboard().read_text() {
            let trimmed = text.trim();
            if !trimmed.is_empty() {
                clipboard_text = trimmed.to_string();
                println!("Clipboard content found on attempt {}: {}", attempt, clipboard_text);
                break;
            }
        }
        println!("Attempt {}: No clipboard content found", attempt);
    }

    if clipboard_text.is_empty() {
        println!("No text found in clipboard after selection");
        // Clear processing flag
        if let Some(state) = app.try_state::<HotkeyState>() {
            *state.is_processing.lock().unwrap() = false;
        }
        return;
    }

    println!("Processing translation for: {}", clipboard_text);

    // 3. Show window and emit translation event
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("selection-translation", clipboard_text.clone());
        println!("Emitted selection-translation event with text: {}", clipboard_text);
    }
    
    // Clear processing flag after completion
    if let Some(state) = app.try_state::<HotkeyState>() {
        *state.is_processing.lock().unwrap() = false;
    }
}