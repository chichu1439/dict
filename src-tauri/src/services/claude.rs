use crate::models::TranslationResult;
use crate::error::{AppError, Result};
use futures_util::StreamExt;

pub async fn translate(
    text: &str,
    _source_lang: &str,
    target_lang: &str,
    config: Option<&serde_json::Value>,
) -> Result<TranslationResult> {
    let api_key = config
        .and_then(|c| c.get("apiKey"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Config("Claude API key not configured".to_string()))?;

    let api_url = config
        .and_then(|c| c.get("apiUrl"))
        .and_then(|v| v.as_str())
        .unwrap_or("https://api.anthropic.com/v1/messages");

    let model = config
        .and_then(|c| c.get("model"))
        .and_then(|v| v.as_str())
        .unwrap_or("claude-3-haiku-20240307");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| AppError::Network(format!("Failed to create HTTP client: {}", e)))?;

    let response = client
        .post(api_url)
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "max_tokens": 1024,
            "system": format!("You are a translation engine. Translate the following text to {}. Output ONLY the translated text, no explanations.", target_lang),
            "messages": [
                {
                    "role": "user",
                    "content": text
                }
            ]
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Api { 
            service: "Claude".to_string(), 
            message: error_text 
        });
    }

    let json: serde_json::Value = response.json().await?;

    let translated_text = json["content"][0]["text"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or_else(|| AppError::Translation("No translation in Claude response".to_string()))?;

    Ok(TranslationResult {
        name: "Claude".to_string(),
        text: translated_text,
        error: None,
    })
}

pub async fn translate_stream<F>(
    text: &str,
    _source_lang: &str,
    target_lang: &str,
    config: Option<&serde_json::Value>,
    mut on_delta: F,
) -> Result<String>
where
    F: FnMut(&str),
{
    let api_key = config
        .and_then(|c| c.get("apiKey"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Config("Claude API key not configured".to_string()))?;

    let api_url = config
        .and_then(|c| c.get("apiUrl"))
        .and_then(|v| v.as_str())
        .unwrap_or("https://api.anthropic.com/v1/messages");

    let model = config
        .and_then(|c| c.get("model"))
        .and_then(|v| v.as_str())
        .unwrap_or("claude-3-haiku-20240307");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| AppError::Network(format!("Failed to create HTTP client: {}", e)))?;

    let response = client
        .post(api_url)
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "max_tokens": 1024,
            "stream": true,
            "system": format!("You are a translation engine. Translate the following text to {}. Output ONLY the translated text, no explanations.", target_lang),
            "messages": [
                {
                    "role": "user",
                    "content": text
                }
            ]
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Api { 
            service: "Claude".to_string(), 
            message: error_text 
        });
    }

    let mut full_text = String::new();
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Network(format!("Stream error: {}", e)))?;
        let chunk_str = std::str::from_utf8(&chunk)
            .map_err(|e| AppError::Unknown(format!("Invalid UTF-8 in stream: {}", e)))?;

        for line in chunk_str.lines() {
            let line = line.trim();
            if line.is_empty() || !line.starts_with("data:") {
                continue;
            }

            let data = line.trim_start_matches("data:").trim();
            if data == "[DONE]" {
                return Ok(full_text);
            }

            if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(delta) = json.get("delta").and_then(|d| d.get("text")).and_then(|t| t.as_str()) {
                    on_delta(delta);
                    full_text.push_str(delta);
                }
            }
        }
    }

    Ok(full_text)
}
