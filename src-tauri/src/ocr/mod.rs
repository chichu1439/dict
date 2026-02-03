pub mod models;

use crate::ocr::models::{OcrRequest, OcrResult};

#[cfg(target_os = "windows")]
use windows::{
    Foundation::TypedArray,
    Graphics::Imaging::BitmapDecoder,
    Media::Ocr::{OcrEngine, OcrResult},
    Storage::Streams::{InMemoryRandomAccessStream, RandomAccessStreamOptions},
};

#[cfg(target_os = "windows")]
pub async fn perform_ocr(request: OcrRequest) -> Result<OcrResult, String> {
    let image_data = if let Some(path) = request.image_path {
        tokio::fs::read(&path).await
            .map_err(|e| format!("Failed to read image: {}", e))?
    } else if let Some(data) = request.image_data {
        base64::Engine::new(&data)
            .decode(base64::alphabet::STANDARD)
            .map_err(|e| format!("Failed to decode base64: {}", e))?
    } else {
        return Err("No image data provided".to_string());
    };

    let decoder = BitmapDecoder::new()
        .map_err(|e| format!("Failed to create decoder: {}", e))?;

    let bitmap = decoder
        .decode(&InMemoryRandomAccessStream::new_from_bytes(
            &image_data,
            RandomAccessStreamOptions::default(),
        ))
        .await
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let engine = OcrEngine::new()
        .map_err(|e| format!("Failed to create OCR engine: {}", e))?;

    let result = engine
        .recognize_async(bitmap, OcrResult {})
        .await
        .map_err(|e| format!("OCR failed: {}", e))?;

    let text = result
        .text()
        .unwrap_or_default()
        .to_string();

    Ok(OcrResult {
        text,
        confidence: result.text_angle().unwrap_or(0.0).abs() as f64,
    })
}

#[cfg(not(target_os = "windows"))]
pub async fn perform_ocr(_request: OcrRequest) -> Result<OcrResult, String> {
    Err("Windows OCR API is only available on Windows platform. Use Tesseract.js as fallback on other platforms.".to_string())
}
