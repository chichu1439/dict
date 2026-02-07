pub mod models;

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
// Keep the media player alive to ensure playback completes
static GLOBAL_MEDIA_PLAYER: OnceLock<Mutex<Option<MediaPlayer>>> = OnceLock::new();

#[cfg(target_os = "windows")]
pub async fn speak(request: crate::tts::models::TtsRequest) -> Result<crate::tts::models::TtsResponse, String> {
    let synthesizer = SpeechSynthesizer::new()
        .map_err(|e| format!("Failed to create synthesizer: {}", e))?;

    let stream = synthesizer
        .SynthesizeTextToStreamAsync(&HSTRING::from(&request.text))
        .map_err(|e| format!("Failed to start synthesis: {}", e))?
        .await
        .map_err(|e| format!("Synthesis failed: {}", e))?;

    let player = MediaPlayer::new()
        .map_err(|e| format!("Failed to create media player: {}", e))?;
    
    let content_type = stream.ContentType()
        .map_err(|e| format!("Failed to get content type: {}", e))?;
        
    let source = MediaSource::CreateFromStream(&stream, &content_type)
        .map_err(|e| format!("Failed to create media source: {}", e))?;
        
    player.SetSource(&source)
        .map_err(|e| format!("Failed to set source: {}", e))?;
        
    player.Play()
        .map_err(|e| format!("Failed to play: {}", e))?;

    // Store the player in a global static to prevent it from being dropped immediately,
    // which would stop playback.
    let mut global_player = GLOBAL_MEDIA_PLAYER
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|e| format!("Failed to lock global player: {}", e))?;
    
    *global_player = Some(player);

    Ok(crate::tts::models::TtsResponse {
        success: true,
        message: "TTS playback started".to_string(),
    })
}

#[cfg(not(target_os = "windows"))]
pub async fn speak(_request: crate::tts::models::TtsRequest) -> Result<crate::tts::models::TtsResponse, String> {
    Err("Windows Speech API is only available on Windows platform. Use Web Speech API as fallback on other platforms.".to_string())
}
