use crate::error::{AppError, Result};
use crate::ocr::models::OcrResult;
use std::process::Command;
use serde::Deserialize;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Deserialize)]
struct PaddleOcrResult {
    text: String,
    confidence: f64,
}

#[cfg(target_os = "windows")]
fn create_command(program: &str) -> Command {
    let mut cmd = Command::new(program);
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(target_os = "windows"))]
fn create_command(program: &str) -> Command {
    Command::new(program)
}

fn find_python() -> Option<String> {
    let candidates = ["python", "python3", "py"];
    
    for cmd_name in candidates {
        let result = create_command(cmd_name)
            .args(["--version"])
            .output();
        
        if let Ok(output) = result {
            if output.status.success() {
                println!("Found Python: {}", cmd_name);
                return Some(cmd_name.to_string());
            }
        }
    }
    
    None
}

pub fn is_paddle_ocr_available() -> bool {
    let python_cmd = match find_python() {
        Some(cmd) => cmd,
        None => {
            println!("Python not found");
            return false;
        }
    };
    
    let result = create_command(&python_cmd)
        .args(["-c", "import paddleocr; print('ok')"])
        .output();
    
    match result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let success = output.status.success() && stdout.contains("ok");
            println!("PaddleOCR check: success={}, stdout={}", success, stdout);
            success
        }
        Err(e) => {
            println!("PaddleOCR check failed: {}", e);
            false
        }
    }
}

pub fn paddle_ocr_recognize(image_data: &[u8]) -> Result<OcrResult> {
    let python_cmd = find_python()
        .ok_or_else(|| AppError::Ocr("Python not found. Please install Python.".to_string()))?;
    
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join("paddle_ocr_temp.png");
    
    println!("Writing temp image to: {:?}", temp_path);
    std::fs::write(&temp_path, image_data)
        .map_err(|e| AppError::Ocr(format!("Failed to write temp image: {}", e)))?;
    
    let script = r#"
import paddleocr
import json
import sys

try:
    ocr = paddleocr.PaddleOCR(use_angle_cls=True, lang='ch', show_log=False)
    result = ocr.ocr(sys.argv[1], cls=True)

    text_lines = []
    total_conf = 0.0
    count = 0

    for line in result:
        if line:
            for word_info in line:
                text_lines.append(word_info[1][0])
                total_conf += word_info[1][1]
                count += 1

    avg_conf = total_conf / count if count > 0 else 0.0

    output = {
        "text": "\n".join(text_lines),
        "confidence": avg_conf
    }
    print(json.dumps(output, ensure_ascii=False))
except Exception as e:
    import traceback
    error_output = {"error": str(e), "traceback": traceback.format_exc()}
    print(json.dumps(error_output, ensure_ascii=False))
    sys.exit(1)
"#;
    
    let path_str = temp_path.to_string_lossy();
    println!("Running PaddleOCR with image: {}", path_str);
    
    let output = create_command(&python_cmd)
        .args(["-c", script, &path_str])
        .output()
        .map_err(|e| AppError::Ocr(format!("Failed to run PaddleOCR: {}", e)))?;
    
    let _ = std::fs::remove_file(&temp_path);
    
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    
    println!("PaddleOCR stdout: {}", stdout);
    if !stderr.is_empty() {
        println!("PaddleOCR stderr: {}", stderr);
    }
    
    if !output.status.success() {
        return Err(AppError::Ocr(format!("PaddleOCR failed: {} {}", stdout, stderr)));
    }
    
    let result: PaddleOcrResult = serde_json::from_str(&stdout)
        .map_err(|e| AppError::Ocr(format!("Failed to parse PaddleOCR output: {} (output was: {})", e, stdout)))?;
    
    Ok(OcrResult {
        text: result.text,
        confidence: result.confidence,
    })
}

pub async fn init_paddle_ocr() -> Result<()> {
    if is_paddle_ocr_available() {
        println!("PaddleOCR (Python) is available");
        Ok(())
    } else {
        Err(AppError::Ocr("PaddleOCR not found. Please install: pip install paddleocr".to_string()))
    }
}
