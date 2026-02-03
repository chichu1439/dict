use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyAction {
    pub name: String,
    pub shortcut: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HotkeyConfig {
    pub hotkeys: Vec<HotkeyAction>,
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            hotkeys: vec![
                HotkeyAction {
                    name: "input_translation".to_string(),
                    shortcut: "CmdOrCtrl+Alt+A".to_string(),
                },
                HotkeyAction {
                    name: "select_translation".to_string(),
                    shortcut: "CmdOrCtrl+Alt+D".to_string(),
                },
                HotkeyAction {
                    name: "screenshot_ocr".to_string(),
                    shortcut: "CmdOrCtrl+Alt+S".to_string(),
                },
                HotkeyAction {
                    name: "silent_ocr".to_string(),
                    shortcut: "CmdOrCtrl+Shift+Alt+S".to_string(),
                },
            ],
        }
    }
}
