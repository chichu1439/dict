use crate::models::TranslationResult;
use futures_util::StreamExt;
use reqwest;
use std::env;

pub async fn translate(
    text: &str,
    _source_lang: &str,
    target_lang: &str,
    config: Option<&serde_json::Value>,
) -> Result<TranslationResult, String> {
    let api_key = if let Some(c) = config {
        c.get("apiKey").and_then(|v| v.as_str()).map(|s| s.to_string())
    } else {
        None
    };

    let api_url = config
        .and_then(|c| c.get("apiUrl"))
        .and_then(|v| v.as_str())
        .unwrap_or("https://api.openai.com/v1/chat/completions");

    let model = config
        .and_then(|c| c.get("model"))
        .and_then(|v| v.as_str())
        .unwrap_or("gpt-3.5-turbo");

    let api_key = api_key
        .or_else(|| env::var("OPENAI_API_KEY").ok())
        .or_else(|| {
            std::fs::read_to_string(".env")
                .map_err(|_| ())
                .and_then(|s| {
                    s.lines()
                        .find(|l| l.starts_with("OPENAI_API_KEY="))
                        .map(|l| l.trim_start_matches("OPENAI_API_KEY=").to_string())
                        .ok_or(())
                })
                .ok()
        })
        .ok_or_else(|| "API key not found in config or environment".to_string())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client
        .post(api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": format!("You are a translation engine. Translate the following text to {}. Output ONLY the translated text, no explanations.", target_lang)
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "max_tokens": 1000
        }))
        .send()
        .await
        .map_err(|e| format!("OpenAI API request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error: {}", error_text));
    }

    let json: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse OpenAI response: {}", e))?;

    let translated_text = json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or("No translation in response")?;

    Ok(TranslationResult {
        name: "OpenAI".to_string(),
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
) -> Result<String, String>
where
    F: FnMut(&str),
{
    let api_key = if let Some(c) = config {
        c.get("apiKey").and_then(|v| v.as_str()).map(|s| s.to_string())
    } else {
        None
    };

    let api_url = config
        .and_then(|c| c.get("apiUrl"))
        .and_then(|v| v.as_str())
        .unwrap_or("https://api.openai.com/v1/chat/completions");

    let model = config
        .and_then(|c| c.get("model"))
        .and_then(|v| v.as_str())
        .unwrap_or("gpt-3.5-turbo");

    let api_key = api_key
        .or_else(|| env::var("OPENAI_API_KEY").ok())
        .or_else(|| {
            std::fs::read_to_string(".env")
                .map_err(|_| ())
                .and_then(|s| {
                    s.lines()
                        .find(|l| l.starts_with("OPENAI_API_KEY="))
                        .map(|l| l.trim_start_matches("OPENAI_API_KEY=").to_string())
                        .ok_or(())
                })
                .ok()
        })
        .ok_or_else(|| "API key not found in config or environment".to_string())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .post(api_url)
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": format!("You are a translation engine. Translate the following text to {}. Output ONLY the translated text, no explanations.", target_lang)
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            "max_tokens": 1000,
            "stream": true
        }))
        .send()
        .await
        .map_err(|e| format!("OpenAI API request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error: {}", error_text));
    }

    let mut full_text = String::new();
    let mut buffer = String::new();
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = std::str::from_utf8(&chunk)
            .map_err(|e| format!("Invalid UTF-8 in stream: {}", e))?;
        buffer.push_str(chunk_str);

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.is_empty() || !line.starts_with("data:") {
                continue;
            }

            let data = line.trim_start_matches("data:").trim();
            if data == "[DONE]" {
                return Ok(full_text);
            }

            let json: serde_json::Value = serde_json::from_str(data)
                .map_err(|e| format!("Failed to parse stream JSON: {}", e))?;
            let delta = json["choices"][0]["delta"]["content"]
                .as_str()
                .or_else(|| json["choices"][0]["message"]["content"].as_str())
                .unwrap_or("");
            if !delta.is_empty() {
                on_delta(delta);
                full_text.push_str(delta);
            }
        }
    }

    Ok(full_text)
}
