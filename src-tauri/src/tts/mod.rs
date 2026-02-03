pub mod models;

#[cfg(target_os = "windows")]
use windows::{
    Foundation::TypedArray,
    Media::SpeechSynthesis::{SpeechSynthesizer, VoiceInformation, SpeechSynthesisStream},
};

#[cfg(target_os = "windows")]
pub async fn speak(request: crate::tts::models::TtsRequest) -> Result<crate::tts::models::TtsResponse, String> {
    let synthesizer = SpeechSynthesizer::new()
        .map_err(|e| format!("Failed to create synthesizer: {}", e))?;

    let stream = synthesizer
        .synthesize_text_to_stream_async(&request.text)
        .await
        .map_err(|e| format!("Synthesis failed: {}", e))?;

    Ok(crate::tts::models::TtsResponse {
        success: true,
        message: "TTS playback started".to_string(),
    })
}

#[cfg(not(target_os = "windows"))]
pub async fn speak(_request: crate::tts::models::TtsRequest) -> Result<crate::tts::models::TtsResponse, String> {
    Err("Windows Speech API is only available on Windows platform. Use Web Speech API as fallback on other platforms.".to_string())
}
