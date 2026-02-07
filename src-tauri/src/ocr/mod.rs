pub mod models;

use crate::ocr::models::{OcrRequest, OcrResult as AppOcrResult};

#[cfg(target_os = "windows")]
use windows::{
    Graphics::Imaging::BitmapDecoder,
    Media::Ocr::OcrEngine,
    Storage::Streams::{InMemoryRandomAccessStream, DataWriter},
    Foundation::IAsyncOperation,
};

#[cfg(target_os = "windows")]
use base64::{Engine as _, engine::general_purpose};

#[cfg(target_os = "windows")]
pub async fn perform_ocr(request: OcrRequest) -> Result<AppOcrResult, String> {
    let image_data = if let Some(path) = request.image_path {
        tokio::fs::read(&path).await
            .map_err(|e| format!("Failed to read image: {}", e))?
    } else if let Some(data) = request.image_data {
        general_purpose::STANDARD
            .decode(&data)
            .map_err(|e| format!("Failed to decode base64: {}", e))?
    } else {
        return Err("No image data provided".to_string());
    };

    // Create stream from bytes
    let stream = InMemoryRandomAccessStream::new()
        .map_err(|e| format!("Failed to create stream: {}", e))?;
    
    let writer = DataWriter::CreateDataWriter(&stream.GetOutputStreamAt(0).map_err(|e| format!("Failed to get output stream: {}", e))?)
        .map_err(|e| format!("Failed to create data writer: {}", e))?;
    
    writer.WriteBytes(&image_data)
        .map_err(|e| format!("Failed to write bytes: {}", e))?;
    
    writer.StoreAsync()
        .map_err(|e| format!("Failed to store async: {}", e))?
        .await
        .map_err(|e| format!("Failed to await store: {}", e))?;
        
    writer.FlushAsync()
        .map_err(|e| format!("Failed to flush async: {}", e))?
        .await
        .map_err(|e| format!("Failed to await flush: {}", e))?;
        
    writer.DetachStream()
        .map_err(|e| format!("Failed to detach stream: {}", e))?;
        
    stream.Seek(0)
        .map_err(|e| format!("Failed to seek stream: {}", e))?;

    // Create decoder and bitmap
    let decoder = BitmapDecoder::CreateAsync(&stream)
        .map_err(|e| format!("Failed to create decoder: {}", e))?
        .await
        .map_err(|e| format!("Failed to await decoder: {}", e))?;

    let bitmap = decoder.GetSoftwareBitmapAsync()
        .map_err(|e| format!("Failed to get software bitmap: {}", e))?
        .await
        .map_err(|e| format!("Failed to await software bitmap: {}", e))?;

    // OCR
    let engine = OcrEngine::TryCreateFromUserProfileLanguages()
        .map_err(|e| format!("Failed to create OCR engine: {}", e))?;

    let result = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| format!("Failed to call RecognizeAsync: {}", e))?
        .await
        .map_err(|e| format!("OCR failed: {}", e))?;

    let text = result
        .Text()
        .map(|t| t.to_string())
        .unwrap_or_default();

    // Calculate "confidence" simply as 0.0 or derived from text angle (legacy behavior requested?)
    // The previous code tried `result.text_angle()`. The method is `TextAngle()`.
    let confidence = result.TextAngle().map(|a| a.0).unwrap_or(0.0).abs() as f64;

    Ok(AppOcrResult {
        text,
        confidence,
    })
}

#[cfg(not(target_os = "windows"))]
pub async fn perform_ocr(_request: OcrRequest) -> Result<AppOcrResult, String> {
    Err("Windows OCR API is only available on Windows platform. Use Tesseract.js as fallback on other platforms.".to_string())
}
