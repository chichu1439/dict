pub mod models;

use crate::ocr::models::{OcrRequest, OcrResult as AppOcrResult};

// Windows-specific OCR implementation
#[cfg(target_os = "windows")]
use windows::{
    Graphics::Imaging::BitmapDecoder,
    Media::Ocr::OcrEngine,
    Globalization::Language,
    core::HSTRING,
    Storage::Streams::{InMemoryRandomAccessStream, DataWriter},
    Win32::Graphics::Gdi::{GetDC, CreateCompatibleDC, CreateCompatibleBitmap, SelectObject, BitBlt, GetDIBits, SRCCOPY, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, DeleteObject, DeleteDC, ReleaseDC},
    Win32::UI::WindowsAndMessaging::GetDesktopWindow,
};

#[cfg(target_os = "windows")]
use base64::{Engine as _, engine::general_purpose};

// Cross-platform screenshot capture trait
pub trait ScreenshotCapture {
    fn capture_screen(&self, x: i32, y: i32, w: i32, h: i32) -> Result<String, String>;
    fn capture_and_ocr(&self, x: i32, y: i32, w: i32, h: i32, language: Option<String>) -> Result<AppOcrResult, String>;
}

// Windows implementation
#[cfg(target_os = "windows")]
struct WindowsOcr;

#[cfg(target_os = "windows")]
impl ScreenshotCapture for WindowsOcr {
    fn capture_screen(&self, x: i32, y: i32, w: i32, h: i32) -> Result<String, String> {
        let (pixels, w, h) = unsafe { capture_bitmap(x, y, w, h)? };
        let bmp_data = create_bmp_file(&pixels, w, h);
        Ok(general_purpose::STANDARD.encode(&bmp_data))
    }
    
    fn capture_and_ocr(&self, x: i32, y: i32, w: i32, h: i32, language: Option<String>) -> Result<AppOcrResult, String> {
        // This function is kept for trait compatibility but might cause issues with block_on
        // Prefer using the standalone capture_and_ocr function which handles async correctly
        let (raw_pixels, w, h) = unsafe { capture_bitmap(x, y, w, h)? };
        
        // Use preprocess image here too for consistency?
        let (processed_pixels, new_w, new_h) = preprocess_image(&raw_pixels, w, h);
        let bmp_data = create_bmp_file(&processed_pixels, new_w, new_h);

        let rt = tokio::runtime::Handle::current();
        rt.block_on(recognize_bytes(bmp_data, language))
    }
}

// Fallback implementation using Tesseract.js for other platforms
#[cfg(not(target_os = "windows"))]
struct FallbackOcr;

#[cfg(not(target_os = "windows"))]
impl ScreenshotCapture for FallbackOcr {
    fn capture_screen(&self, _x: i32, _y: i32, _w: i32, _h: i32) -> Result<String, String> {
        Err("Screenshot capture requires native implementation. Use external tools or implement platform-specific capture.".to_string())
    }
    
    fn capture_and_ocr(&self, _x: i32, _y: i32, _w: i32, _h: i32, _language: Option<String>) -> Result<AppOcrResult, String> {
        Err("Native OCR not available on this platform. Consider using Tesseract.js or cloud OCR services.".to_string())
    }
}

// Factory function to get appropriate OCR implementation
fn get_ocr_impl() -> Box<dyn ScreenshotCapture> {
    #[cfg(target_os = "windows")]
    {
        Box::new(WindowsOcr)
    }
    #[cfg(not(target_os = "windows"))]
    {
        Box::new(FallbackOcr)
    }
}

// Windows-specific bitmap capture function
#[cfg(target_os = "windows")]
unsafe fn capture_bitmap(x: i32, y: i32, w: i32, h: i32) -> Result<(Vec<u8>, i32, i32), String> {
    let hwnd = GetDesktopWindow();
    let hdc_screen = GetDC(hwnd);
    let hdc_mem = CreateCompatibleDC(hdc_screen);
    
    let hbm_screen = CreateCompatibleBitmap(hdc_screen, w, h);
    SelectObject(hdc_mem, hbm_screen);
    
    // BitBlt from screen to memory DC
    if BitBlt(hdc_mem, 0, 0, w, h, hdc_screen, x, y, SRCCOPY).is_err() {
        DeleteObject(hbm_screen);
        DeleteDC(hdc_mem);
        ReleaseDC(hwnd, hdc_screen);
        return Err("BitBlt failed".to_string());
    }
    
    // Prepare to get bits
    let mut bi = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: w,
        biHeight: -h, // Top-down
        biPlanes: 1,
        biBitCount: 32,
        biCompression: BI_RGB.0,
        ..Default::default()
    };
    
    let mut pixels: Vec<u8> = vec![0; (w * h * 4) as usize];
    
    if GetDIBits(
        hdc_screen, 
        hbm_screen, 
        0, 
        h as u32, 
        Some(pixels.as_mut_ptr() as *mut _), 
        &mut bi as *mut _ as *mut _, 
        DIB_RGB_COLORS
    ) == 0 {
        DeleteObject(hbm_screen);
        DeleteDC(hdc_mem);
        ReleaseDC(hwnd, hdc_screen);
        return Err("GetDIBits failed".to_string());
    }
    
    // Cleanup GDI objects
    DeleteObject(hbm_screen);
    DeleteDC(hdc_mem);
    ReleaseDC(hwnd, hdc_screen);
    
    Ok((pixels, w, h))
}

// Helper to create BMP file format from raw pixels
#[cfg(target_os = "windows")]
fn create_bmp_file(pixels: &[u8], w: i32, h: i32) -> Vec<u8> {
    let mut bmp_data = Vec::new();
    
    // Bitmap File Header (14 bytes)
    let file_size = 14 + 40 + pixels.len() as u32;
    bmp_data.extend_from_slice(b"BM"); // Signature
    bmp_data.extend_from_slice(&file_size.to_le_bytes()); // File size
    bmp_data.extend_from_slice(&0u32.to_le_bytes()); // Reserved
    bmp_data.extend_from_slice(&(14 + 40 as u32).to_le_bytes()); // Offset to pixel data
    
    // Bitmap Info Header (40 bytes)
    let bi_size = 40u32;
    bmp_data.extend_from_slice(&bi_size.to_le_bytes());
    bmp_data.extend_from_slice(&w.to_le_bytes());
    bmp_data.extend_from_slice(&(-h).to_le_bytes()); // Top-down
    bmp_data.extend_from_slice(&1u16.to_le_bytes()); // Planes
    bmp_data.extend_from_slice(&32u16.to_le_bytes()); // BitCount
    bmp_data.extend_from_slice(&0u32.to_le_bytes()); // Compression (BI_RGB)
    bmp_data.extend_from_slice(&(pixels.len() as u32).to_le_bytes()); // SizeImage
    bmp_data.extend_from_slice(&3780u32.to_le_bytes()); // XPelsPerMeter (96 DPI)
    bmp_data.extend_from_slice(&3780u32.to_le_bytes()); // YPelsPerMeter
    bmp_data.extend_from_slice(&0u32.to_le_bytes()); // ClrUsed
    bmp_data.extend_from_slice(&0u32.to_le_bytes()); // ClrImportant
    
    // Pixel Data
    bmp_data.extend_from_slice(pixels);
    
    bmp_data
}

// Image processing: Upscale 2x and add padding
// This significantly improves OCR accuracy for small text
#[cfg(target_os = "windows")]
fn preprocess_image(src_pixels: &[u8], w: i32, h: i32) -> (Vec<u8>, i32, i32) {
    let scale = 2;
    let padding = 20;
    
    let new_w = w * scale + padding * 2;
    let new_h = h * scale + padding * 2;
    let mut new_pixels = vec![255u8; (new_w * new_h * 4) as usize]; // Initialize with white background
    
    // Simple nearest neighbor upscaling + padding
    for y in 0..h {
        for x in 0..w {
            let src_idx = ((y * w + x) * 4) as usize;
            let b = src_pixels[src_idx];
            let g = src_pixels[src_idx + 1];
            let r = src_pixels[src_idx + 2];
            let a = src_pixels[src_idx + 3]; // Usually ignored for OCR, but keep it consistent
            
            // Map to destination coordinates (with padding)
            let dest_y_start = y * scale + padding;
            let dest_x_start = x * scale + padding;
            
            // Fill scale*scale block
            for dy in 0..scale {
                for dx in 0..scale {
                    let dest_idx = (((dest_y_start + dy) * new_w + (dest_x_start + dx)) * 4) as usize;
                    new_pixels[dest_idx] = b;
                    new_pixels[dest_idx + 1] = g;
                    new_pixels[dest_idx + 2] = r;
                    new_pixels[dest_idx + 3] = a;
                }
            }
        }
    }
    
    (new_pixels, new_w, new_h)
}

// Windows-specific OCR implementation
#[cfg(target_os = "windows")]
async fn recognize_bytes(image_data: Vec<u8>, language: Option<String>) -> Result<AppOcrResult, String> {
    // Create stream from bytes
    let stream = InMemoryRandomAccessStream::new()
        .map_err(|e| format!("Failed to create stream: {}", e))?;
    
    let writer = DataWriter::CreateDataWriter(&stream
        .GetOutputStreamAt(0)
        .map_err(|e| format!("Failed to get output stream: {}", e))?)
        .map_err(|e| format!("Failed to create data writer: {}", e))?;
    
    writer.WriteBytes(&image_data)
        .map_err(|e| format!("Failed to write bytes: {}", e))?;
    
    writer
        .StoreAsync()
        .map_err(|e| format!("Failed to store async: {}", e))?
        .await
        .map_err(|e| format!("Failed to await store: {}", e))?;
        
    writer
        .FlushAsync()
        .map_err(|e| format!("Failed to flush async: {}", e))?
        .await
        .map_err(|e| format!("Failed to await flush: {}", e))?;
        
    writer.DetachStream()
        .map_err(|e| format!("Failed to detach stream: {}", e))?;
        
    stream.Seek(0)
        .map_err(|e| format!("Failed to seek stream: {}", e))?;

    // Create decoder and bitmap
    println!("Creating bitmap decoder from stream...");
    let decoder = BitmapDecoder::CreateAsync(&stream)
        .map_err(|e| format!("Failed to create decoder: {}", e))?
        .await
        .map_err(|e| format!("Failed to await decoder: {}", e))?;
    
    println!("Bitmap decoder created successfully");

    println!("Getting software bitmap from decoder...");
    let bitmap = decoder
        .GetSoftwareBitmapAsync()
        .map_err(|e| format!("Failed to get software bitmap: {}", e))?
        .await
        .map_err(|e| format!("Failed to await software bitmap: {}", e))?;
    
    println!("Software bitmap created successfully");

    // OCR
    println!("Creating Windows OCR engine with language: {:?}", language);
    let engine = match language.as_deref() {
        Some(lang) if lang != "auto" => {
            // Try to match specific language tags first
            // Windows OCR uses BCP-47 tags
            let tag = match lang {
                "zh" | "zh-CN" => "zh-Hans",
                "zh-TW" => "zh-Hant",
                "en" => "en-US",
                "ja" => "ja-JP",
                "ko" => "ko-KR",
                other => other, // Pass through other tags like "de", "fr", etc.
            };
            println!("Trying to create language from tag: {}", tag);
            let h = HSTRING::from(tag);
            match Language::CreateLanguage(&h) {
                Ok(l) => {
                    match OcrEngine::TryCreateFromLanguage(&l) {
                        Ok(e) => e,
                        Err(err) => {
                            println!("Failed to create OCR engine from language {}, falling back to user profile: {}", tag, err);
                            OcrEngine::TryCreateFromUserProfileLanguages()
                                .map_err(|e| format!("Failed to create OCR engine from user profile: {}", e))?
                        }
                    }
                },
                Err(err) => {
                    println!("Failed to create Language object for {}, falling back to user profile: {}", tag, err);
                    OcrEngine::TryCreateFromUserProfileLanguages()
                        .map_err(|e| format!("Failed to create OCR engine from user profile: {}", e))?
                }
            }
        }
        _ => {
            println!("Using user profile languages for OCR (auto mode)");
            OcrEngine::TryCreateFromUserProfileLanguages()
                .map_err(|e| format!("Failed to create OCR engine from user profile: {}", e))?
        }
    };
    
    println!("Windows OCR engine created successfully");

    println!("Starting OCR recognition on bitmap...");
    let result = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| format!("Failed to initiate OCR: {}", e))?
        .await
        .map_err(|e| format!("OCR execution failed: {}", e))?;
    
    println!("OCR recognition completed");

    let text = match result.Text().ok() {
        Some(t) => {
            let text_str = t.to_string();
            println!("OCR text detected: '{}'", text_str);
            text_str
        },
        None => {
            println!("No text detected by OCR engine");
            String::new()
        },
    };

    let confidence = if let Some(angle_ref) = result.TextAngle().ok() {
        if let Some(angle) = angle_ref.Value().ok() {
            angle.abs() as f64
        } else {
            0.0
        }
    } else {
        0.0
    };

    Ok(AppOcrResult {
        text,
        confidence,
    })
}

// Main OCR function with improved error handling
pub async fn perform_ocr(request: OcrRequest) -> Result<AppOcrResult, String> {
    println!("Starting OCR processing...");
    
    let image_data = if let Some(path) = request.image_path {
        println!("Loading image from path: {}", path);
        match tokio::fs::read(&path).await {
            Ok(data) => {
                println!("Image loaded successfully, size: {} bytes", data.len());
                data
            }
            Err(e) => {
                return Err(format!("Failed to read image file '{}': {}", path, e));
            }
        }
    } else if let Some(data) = request.image_data {
        println!("Decoding base64 image data, size: {} chars", data.len());
        #[cfg(target_os = "windows")]
        {
            match general_purpose::STANDARD.decode(&data) {
                Ok(decoded) => {
                    println!("Base64 decoded successfully, size: {} bytes", decoded.len());
                    decoded
                }
                Err(e) => {
                    return Err(format!("Failed to decode base64 image data: {}", e));
                }
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            return Err("Base64 image decoding not supported on this platform".to_string());
        }
    } else {
        return Err("No image data provided. Please provide either image_path or image_data.".to_string());
    };

    println!("Processing image with OCR, size: {} bytes", image_data.len());

    #[cfg(target_os = "windows")]
    {
        match recognize_bytes(image_data, request.language).await {
            Ok(result) => {
                println!("OCR completed successfully, text length: {}", result.text.len());
                Ok(result)
            }
            Err(e) => {
                println!("OCR processing failed: {}", e);
                Err(format!("OCR processing failed: {}", e))
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Windows OCR API is only available on Windows platform. Consider using Tesseract.js as fallback on other platforms.".to_string())
    }
}

// Screenshot capture function
pub async fn capture_screen(x: i32, y: i32, w: i32, h: i32) -> Result<String, String> {
    println!("Capturing screenshot at ({}, {}) size ({}x{})", x, y, w, h);
    let ocr_impl = get_ocr_impl();
    ocr_impl.capture_screen(x, y, w, h)
}

// Combined screenshot and OCR function
pub async fn capture_and_ocr(x: i32, y: i32, w: i32, h: i32, language: Option<String>) -> Result<AppOcrResult, String> {
    println!("Capturing and performing OCR at ({}, {}) size ({}x{})", x, y, w, h);
    
    #[cfg(target_os = "windows")]
    {
        // Capture bitmap (synchronous but fast enough, or could wrap in spawn_blocking if needed)
        // GDI capture is usually fast.
        let (raw_pixels, w, h) = unsafe { capture_bitmap(x, y, w, h)? };
        
        // Preprocess image (Upscale + Padding) to improve OCR accuracy
        println!("Preprocessing image: {}x{} -> Upscaling 2x with padding", w, h);
        let (processed_pixels, new_w, new_h) = preprocess_image(&raw_pixels, w, h);
        
        // Create BMP file format
        let bmp_data = create_bmp_file(&processed_pixels, new_w, new_h);
        
        // Run OCR (async)
        recognize_bytes(bmp_data, language).await
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        let ocr_impl = get_ocr_impl();
        ocr_impl.capture_and_ocr(x, y, w, h, language)
    }
}
