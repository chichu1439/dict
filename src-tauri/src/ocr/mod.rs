pub mod models;
pub mod mathpix;
pub mod paddle;

use crate::ocr::models::{OcrRequest, OcrResult as AppOcrResult};
use crate::error::{AppError, Result};

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

pub trait ScreenshotCapture {
    fn capture_screen(&self, x: i32, y: i32, w: i32, h: i32) -> Result<String>;
    #[allow(dead_code)]
    fn capture_and_ocr(&self, x: i32, y: i32, w: i32, h: i32, language: Option<String>) -> Result<AppOcrResult>;
}

#[cfg(target_os = "windows")]
struct WindowsOcr;

#[cfg(target_os = "windows")]
impl ScreenshotCapture for WindowsOcr {
    fn capture_screen(&self, x: i32, y: i32, w: i32, h: i32) -> Result<String> {
        let (pixels, w, h) = unsafe { capture_bitmap(x, y, w, h)? };
        let bmp_data = create_bmp_file(&pixels, w, h);
        Ok(general_purpose::STANDARD.encode(&bmp_data))
    }
    
    fn capture_and_ocr(&self, x: i32, y: i32, w: i32, h: i32, language: Option<String>) -> Result<AppOcrResult> {
        let (raw_pixels, w, h) = unsafe { capture_bitmap(x, y, w, h)? };
        let (processed_pixels, new_w, new_h) = preprocess_image(&raw_pixels, w, h);
        let bmp_data = create_bmp_file(&processed_pixels, new_w, new_h);

        let rt = tokio::runtime::Handle::current();
        rt.block_on(recognize_bytes(bmp_data, language))
    }
}

#[cfg(not(target_os = "windows"))]
struct FallbackOcr;

#[cfg(not(target_os = "windows"))]
impl ScreenshotCapture for FallbackOcr {
    fn capture_screen(&self, _x: i32, _y: i32, _w: i32, _h: i32) -> Result<String> {
        Err(AppError::PlatformNotSupported("Screenshot capture requires native implementation".to_string()))
    }
    
    fn capture_and_ocr(&self, _x: i32, _y: i32, _w: i32, _h: i32, _language: Option<String>) -> Result<AppOcrResult> {
        Err(AppError::PlatformNotSupported("Native OCR not available on this platform".to_string()))
    }
}

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

#[cfg(target_os = "windows")]
unsafe fn capture_bitmap(x: i32, y: i32, w: i32, h: i32) -> Result<(Vec<u8>, i32, i32)> {
    let hwnd = GetDesktopWindow();
    let hdc_screen = GetDC(hwnd);
    let hdc_mem = CreateCompatibleDC(hdc_screen);
    
    let hbm_screen = CreateCompatibleBitmap(hdc_screen, w, h);
    SelectObject(hdc_mem, hbm_screen);
    
    if BitBlt(hdc_mem, 0, 0, w, h, hdc_screen, x, y, SRCCOPY).is_err() {
        DeleteObject(hbm_screen);
        DeleteDC(hdc_mem);
        ReleaseDC(hwnd, hdc_screen);
        return Err(AppError::Ocr("BitBlt failed".to_string()));
    }
    
    let mut bi = BITMAPINFOHEADER {
        biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
        biWidth: w,
        biHeight: -h,
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
        return Err(AppError::Ocr("GetDIBits failed".to_string()));
    }
    
    DeleteObject(hbm_screen);
    DeleteDC(hdc_mem);
    ReleaseDC(hwnd, hdc_screen);
    
    Ok((pixels, w, h))
}

#[cfg(target_os = "windows")]
fn create_bmp_file(pixels: &[u8], w: i32, h: i32) -> Vec<u8> {
    let mut bmp_data = Vec::new();
    
    let file_size = 14 + 40 + pixels.len() as u32;
    bmp_data.extend_from_slice(b"BM");
    bmp_data.extend_from_slice(&file_size.to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    bmp_data.extend_from_slice(&(14 + 40 as u32).to_le_bytes());
    
    let bi_size = 40u32;
    bmp_data.extend_from_slice(&bi_size.to_le_bytes());
    bmp_data.extend_from_slice(&w.to_le_bytes());
    bmp_data.extend_from_slice(&(-h).to_le_bytes());
    bmp_data.extend_from_slice(&1u16.to_le_bytes());
    bmp_data.extend_from_slice(&32u16.to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    bmp_data.extend_from_slice(&(pixels.len() as u32).to_le_bytes());
    bmp_data.extend_from_slice(&3780u32.to_le_bytes());
    bmp_data.extend_from_slice(&3780u32.to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    bmp_data.extend_from_slice(&0u32.to_le_bytes());
    
    bmp_data.extend_from_slice(pixels);
    
    bmp_data
}

#[cfg(target_os = "windows")]
fn bilinear_interpolate(pixels: &[u8], w: i32, h: i32, x: f64, y: f64) -> (u8, u8, u8, u8) {
    let x0 = x.floor() as i32;
    let y0 = y.floor() as i32;
    let x1 = (x0 + 1).min(w - 1);
    let y1 = (y0 + 1).min(h - 1);
    let x0_clamped = x0.max(0).min(w - 1);
    let y0_clamped = y0.max(0).min(h - 1);
    
    let dx = x - x0 as f64;
    let dy = y - y0 as f64;
    
    let idx = |px: i32, py: i32| -> usize {
        ((py * w + px) * 4) as usize
    };
    
    let i00 = idx(x0_clamped, y0_clamped);
    let i10 = idx(x1, y0_clamped);
    let i01 = idx(x0_clamped, y1);
    let i11 = idx(x1, y1);
    
    let interp = |c: usize| -> u8 {
        let v00 = pixels[i00 + c] as f64;
        let v10 = pixels[i10 + c] as f64;
        let v01 = pixels[i01 + c] as f64;
        let v11 = pixels[i11 + c] as f64;
        
        let top = v00 * (1.0 - dx) + v10 * dx;
        let bottom = v01 * (1.0 - dx) + v11 * dx;
        let value = top * (1.0 - dy) + bottom * dy;
        
        value.round().clamp(0.0, 255.0) as u8
    };
    
    (interp(0), interp(1), interp(2), interp(3))
}

#[cfg(target_os = "windows")]
fn preprocess_image(src_pixels: &[u8], w: i32, h: i32) -> (Vec<u8>, i32, i32) {
    let scale = 2;
    let padding = 20;
    
    let new_w = w * scale + padding * 2;
    let new_h = h * scale + padding * 2;
    let mut new_pixels = vec![255u8; (new_w * new_h * 4) as usize];
    
    let scale_f = scale as f64;
    
    for dest_y in 0..(h * scale) {
        for dest_x in 0..(w * scale) {
            let src_x = (dest_x as f64) / scale_f;
            let src_y = (dest_y as f64) / scale_f;
            
            let (b, g, r, a) = bilinear_interpolate(src_pixels, w, h, src_x, src_y);
            
            let dest_idx = (((dest_y + padding) * new_w + (dest_x + padding)) * 4) as usize;
            new_pixels[dest_idx] = b;
            new_pixels[dest_idx + 1] = g;
            new_pixels[dest_idx + 2] = r;
            new_pixels[dest_idx + 3] = a;
        }
    }
    
    (new_pixels, new_w, new_h)
}

#[cfg(target_os = "windows")]
async fn recognize_bytes(image_data: Vec<u8>, language: Option<String>) -> Result<AppOcrResult> {
    let stream = InMemoryRandomAccessStream::new()
        .map_err(|e| AppError::Ocr(format!("Failed to create stream: {}", e)))?;
    
    let writer = DataWriter::CreateDataWriter(&stream
        .GetOutputStreamAt(0)
        .map_err(|e| AppError::Ocr(format!("Failed to get output stream: {}", e)))?)
        .map_err(|e| AppError::Ocr(format!("Failed to create data writer: {}", e)))?;
    
    writer.WriteBytes(&image_data)
        .map_err(|e| AppError::Ocr(format!("Failed to write bytes: {}", e)))?;
    
    writer
        .StoreAsync()
        .map_err(|e| AppError::Ocr(format!("Failed to store async: {}", e)))?
        .await
        .map_err(|e| AppError::Ocr(format!("Failed to await store: {}", e)))?;
        
    writer
        .FlushAsync()
        .map_err(|e| AppError::Ocr(format!("Failed to flush async: {}", e)))?
        .await
        .map_err(|e| AppError::Ocr(format!("Failed to await flush: {}", e)))?;
        
    writer.DetachStream()
        .map_err(|e| AppError::Ocr(format!("Failed to detach stream: {}", e)))?;
        
    stream.Seek(0)
        .map_err(|e| AppError::Ocr(format!("Failed to seek stream: {}", e)))?;

    println!("Creating bitmap decoder from stream...");
    let decoder = BitmapDecoder::CreateAsync(&stream)
        .map_err(|e| AppError::Ocr(format!("Failed to create decoder: {}", e)))?
        .await
        .map_err(|e| AppError::Ocr(format!("Failed to await decoder: {}", e)))?;
    
    println!("Bitmap decoder created successfully");

    println!("Getting software bitmap from decoder...");
    let bitmap = decoder
        .GetSoftwareBitmapAsync()
        .map_err(|e| AppError::Ocr(format!("Failed to get software bitmap: {}", e)))?
        .await
        .map_err(|e| AppError::Ocr(format!("Failed to await software bitmap: {}", e)))?;
    
    println!("Software bitmap created successfully");

    println!("Creating Windows OCR engine with language: {:?}", language);
    let engine = match language.as_deref() {
        Some(lang) if lang != "auto" => {
            let tag = match lang {
                "zh" | "zh-CN" => "zh-Hans",
                "zh-TW" => "zh-Hant",
                "en" => "en-US",
                "ja" => "ja-JP",
                "ko" => "ko-KR",
                other => other,
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
                                .map_err(|e| AppError::Ocr(format!("Failed to create OCR engine from user profile: {}", e)))?
                        }
                    }
                },
                Err(err) => {
                    println!("Failed to create Language object for {}, falling back to user profile: {}", tag, err);
                    OcrEngine::TryCreateFromUserProfileLanguages()
                        .map_err(|e| AppError::Ocr(format!("Failed to create OCR engine from user profile: {}", e)))?
                }
            }
        }
        _ => {
            println!("Using user profile languages for OCR (auto mode)");
            OcrEngine::TryCreateFromUserProfileLanguages()
                .map_err(|e| AppError::Ocr(format!("Failed to create OCR engine from user profile: {}", e)))?
        }
    };
    
    println!("Windows OCR engine created successfully");

    println!("Starting OCR recognition on bitmap...");
    let result = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| AppError::Ocr(format!("Failed to initiate OCR: {}", e)))?
        .await
        .map_err(|e| AppError::Ocr(format!("OCR execution failed: {}", e)))?;
    
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

pub async fn perform_ocr(request: OcrRequest) -> Result<AppOcrResult> {
    perform_ocr_with_engine(request, "windows").await
}

pub async fn perform_ocr_with_engine(request: OcrRequest, engine: &str) -> Result<AppOcrResult> {
    println!("Starting OCR processing with engine: {}...", engine);
    
    let image_data = if let Some(path) = request.image_path {
        println!("Loading image from path: {}", path);
        match tokio::fs::read(&path).await {
            Ok(data) => {
                println!("Image loaded successfully, size: {} bytes", data.len());
                data
            }
            Err(e) => {
                return Err(AppError::Io(e));
            }
        }
    } else if let Some(data) = request.image_data {
        println!("Decoding base64 image data, size: {} chars", data.len());
        match general_purpose::STANDARD.decode(&data) {
            Ok(decoded) => {
                println!("Base64 decoded successfully, size: {} bytes", decoded.len());
                decoded
            }
            Err(e) => {
                return Err(AppError::Ocr(format!("Failed to decode base64 image data: {}", e)));
            }
        }
    } else {
        return Err(AppError::InvalidRequest("No image data provided. Please provide either image_path or image_data.".to_string()));
    };

    println!("Processing image with OCR, size: {} bytes", image_data.len());

    if engine == "paddle" {
        paddle::paddle_ocr_recognize(&image_data)
    } else {
        #[cfg(target_os = "windows")]
        {
            recognize_bytes(image_data, request.language).await
        }
        #[cfg(not(target_os = "windows"))]
        {
            Err(AppError::PlatformNotSupported("Windows OCR API is only available on Windows platform".to_string()))
        }
    }
}

pub async fn capture_screen(x: i32, y: i32, w: i32, h: i32) -> Result<String> {
    println!("Capturing screenshot at ({}, {}) size ({}x{})", x, y, w, h);
    let ocr_impl = get_ocr_impl();
    ocr_impl.capture_screen(x, y, w, h)
}

pub async fn capture_and_ocr(x: i32, y: i32, w: i32, h: i32, language: Option<String>) -> Result<AppOcrResult> {
    capture_and_ocr_with_engine(x, y, w, h, language, "windows").await
}

pub async fn capture_and_ocr_with_engine(x: i32, y: i32, w: i32, h: i32, language: Option<String>, engine: &str) -> Result<AppOcrResult> {
    println!("Capturing and performing OCR at ({}, {}) size ({}x{}) with engine: {}", x, y, w, h, engine);
    
    #[cfg(target_os = "windows")]
    {
        let (raw_pixels, w, h) = unsafe { capture_bitmap(x, y, w, h)? };
        
        if engine == "paddle" {
            let png_data = create_png_from_pixels(&raw_pixels, w, h);
            paddle::paddle_ocr_recognize(&png_data)
        } else {
            println!("Preprocessing image: {}x{} -> Upscaling 2x with padding", w, h);
            let (processed_pixels, new_w, new_h) = preprocess_image(&raw_pixels, w, h);
            let bmp_data = create_bmp_file(&processed_pixels, new_w, new_h);
            recognize_bytes(bmp_data, language).await
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        let ocr_impl = get_ocr_impl();
        ocr_impl.capture_and_ocr(x, y, w, h, language)
    }
}

#[cfg(target_os = "windows")]
fn create_png_from_pixels(pixels: &[u8], w: i32, h: i32) -> Vec<u8> {
    let img: image::ImageBuffer<image::Rgba<u8>, Vec<u8>> = image::ImageBuffer::from_raw(
        w as u32, h as u32, pixels.to_vec()
    ).expect("Failed to create image buffer");
    
    let mut png_data = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut png_data), image::ImageFormat::Png)
        .expect("Failed to write PNG");
    png_data
}
