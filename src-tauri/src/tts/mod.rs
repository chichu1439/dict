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
use std::sync::Mutex;
#[cfg(target_os = "windows")]
use std::sync::OnceLock;

#[cfg(target_os = "windows")]
static GLOBAL_MEDIA_PLAYER: OnceLock<Mutex<Option<(MediaPlayer, windows::Media::SpeechSynthesis::SpeechSynthesisStream)>>> = OnceLock::new();

#[cfg(target_os = "windows")]
pub async fn speak(request: crate::tts::models::TtsRequest) -> Result<crate::tts::models::TtsResponse> {
    let synthesizer = SpeechSynthesizer::new()
        .map_err(|e| AppError::Unknown(format!("Failed to create synthesizer: {}", e)))?;

    let stream = synthesizer
        .SynthesizeTextToStreamAsync(&HSTRING::from(&request.text))
        .map_err(|e| AppError::Unknown(format!("Failed to start synthesis: {}", e)))?
        .await
        .map_err(|e| AppError::Unknown(format!("Synthesis failed: {}", e)))?;

    let player = MediaPlayer::new()
        .map_err(|e| AppError::Unknown(format!("Failed to create media player: {}", e)))?;
    
    let content_type = stream.ContentType()
        .map_err(|e| AppError::Unknown(format!("Failed to get content type: {}", e)))?;
        
    let source = MediaSource::CreateFromStream(&stream, &content_type)
        .map_err(|e| AppError::Unknown(format!("Failed to create media source: {}", e)))?;
        
    player.SetSource(&source)
        .map_err(|e| AppError::Unknown(format!("Failed to set source: {}", e)))?;
        
    player.Play()
        .map_err(|e| AppError::Unknown(format!("Failed to play: {}", e)))?;

    let mut global_player = GLOBAL_MEDIA_PLAYER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|e| AppError::Unknown(format!("Failed to lock global player: {}", e)))?;
    
    *global_player = Some((player, stream));

    Ok(crate::tts::models::TtsResponse {
        success: true,
        message: "TTS playback started".to_string(),
    })
}

#[cfg(not(target_os = "windows"))]
pub async fn speak(_request: crate::tts::models::TtsRequest) -> Result<crate::tts::models::TtsResponse> {
    Err(AppError::PlatformNotSupported("Windows Speech API is only available on Windows platform".to_string()))
}
