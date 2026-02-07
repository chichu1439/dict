use crate::models::TranslationResult;
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

    let client = reqwest::Client::new();
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
