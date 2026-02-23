pub mod models;

use crate::error::{AppError, Result};

#[cfg(target_os = "windows")]
use windows::{
    Media::SpeechSynthesis::SpeechSynthesizer,
    Media::Playback::MediaPlayer,
    Media::Core::MediaSource,
    core::HSTRING,
};

#[cfg(target_os = "windows")]
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
use std::sync::Mutex;
#[cfg(target_os = "windows")]
use std::sync::OnceLock;

#[cfg(target_os = "windows")]
static GLOBAL_MEDIA_PLAYER: OnceLock<Mutex<Option<(MediaPlayer, windows::Media::SpeechSynthesis::SpeechSynthesisStream)>>> = OnceLock::new();

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
fn speak_with_powershell(text: &str) -> Result<()> {
    println!("TTS: Trying PowerShell TTS for: {}", &text[..text.len().min(30)]);
    
    let script = format!(
        r#"Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('{}');"#,
        text.replace("'", "''")
    );
    
    let output = Command::new("powershell")
        .args(["-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| AppError::Unknown(format!("Failed to run PowerShell TTS: {}", e)))?;
    
    if output.status.success() {
        println!("TTS: PowerShell TTS succeeded");
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(AppError::Unknown(format!("PowerShell TTS failed: {}", stderr)))
    }
}

#[cfg(target_os = "windows")]
pub async fn speak(request: crate::tts::models::TtsRequest) -> Result<crate::tts::models::TtsResponse> {
    println!("TTS: Starting speech synthesis for text: {}", &request.text[..request.text.len().min(50)]);
    
    // 检查文本是否为空
    if request.text.trim().is_empty() {
        return Err(AppError::Unknown("Text is empty".to_string()));
    }
    
    // 首先尝试使用 Windows Media Foundation
    let result = try_speak_with_media_foundation(&request.text, request.voice.as_deref()).await;
    
    match result {
        Ok(_) => {
            println!("TTS: Media Foundation TTS succeeded");
            Ok(crate::tts::models::TtsResponse {
                success: true,
                message: "TTS playback started".to_string(),
            })
        }
        Err(e) => {
            println!("TTS: Media Foundation failed: {}, trying PowerShell", e);
            // 备用方案：使用 PowerShell
            speak_with_powershell(&request.text)?;
            Ok(crate::tts::models::TtsResponse {
                success: true,
                message: "TTS playback started (PowerShell)".to_string(),
            })
        }
    }
}

#[cfg(target_os = "windows")]
async fn try_speak_with_media_foundation(text: &str, voice_preference: Option<&str>) -> Result<()> {
    use windows::Media::SpeechSynthesis::SpeechSynthesizer;
    
    // 创建语音合成器
    let synthesizer = SpeechSynthesizer::new()
        .map_err(|e| AppError::Unknown(format!("Failed to create synthesizer: {:?}", e)))?;
    
    println!("TTS: Synthesizer created, voice preference: {:?}", voice_preference);
    
    // Windows 语音合成器会自动根据系统设置选择语音
    // 如果要区分英式/美式，需要用户安装对应的语音包
    // 这里我们记录偏好，但实际播放取决于系统安装的语音
    if let Some(voice_type) = voice_preference {
        println!("TTS: Requested voice type: {}", voice_type);
        // 注意：Windows 需要通过 "设置 -> 时间和语言 -> 语音" 安装对应语音包
        // 代码层面无法直接强制切换，只能通过 SSML 标记语言指定语言
    }
    
    let stream = synthesizer
        .SynthesizeTextToStreamAsync(&HSTRING::from(text))
        .map_err(|e| AppError::Unknown(format!("Failed to start synthesis: {:?}", e)))?
        .await
        .map_err(|e| AppError::Unknown(format!("Synthesis failed: {:?}", e)))?;
    
    println!("TTS: Stream created");
    
    let player = MediaPlayer::new()
        .map_err(|e| AppError::Unknown(format!("Failed to create media player: {:?}", e)))?;
    
    let content_type = stream.ContentType()
        .map_err(|e| AppError::Unknown(format!("Failed to get content type: {:?}", e)))?;
    
    let source = MediaSource::CreateFromStream(&stream, &content_type)
        .map_err(|e| AppError::Unknown(format!("Failed to create media source: {:?}", e)))?;
    
    player.SetSource(&source)
        .map_err(|e| AppError::Unknown(format!("Failed to set source: {:?}", e)))?;
    
    player.Play()
        .map_err(|e| AppError::Unknown(format!("Failed to play: {:?}", e)))?;
    
    println!("TTS: Playback started");
    
    let mut global_player = GLOBAL_MEDIA_PLAYER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|e| AppError::Unknown(format!("Failed to lock global player: {}", e)))?;
    
    *global_player = Some((player, stream));
    
    Ok(())
}

#[cfg(not(target_os = "windows"))]
pub async fn speak(_request: crate::tts::models::TtsRequest) -> Result<crate::tts::models::TtsResponse> {
    Err(AppError::PlatformNotSupported("Windows Speech API is only available on Windows platform".to_string()))
}
