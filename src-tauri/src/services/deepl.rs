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

    let api_key = api_key
        .or_else(|| env::var("DEEPL_API_KEY").ok())
        .or_else(|| {
            std::fs::read_to_string(".env")
                .map_err(|_| ())
                .and_then(|s| {
                    s.lines()
                        .find(|l| l.starts_with("DEEPL_API_KEY="))
                        .map(|l| l.trim_start_matches("DEEPL_API_KEY=").to_string())
                        .ok_or(())
                })
                .ok()
        })
        .ok_or_else(|| "DEEPL_API_KEY not found".to_string())?;

    let target = match target_lang.to_uppercase().as_str() {
        "ZH" | "ZH-HANS" => "ZH",
        "EN" => "EN-US",
        "JA" => "JA",
        "KO" => "KO",
        "FR" => "FR",
        "DE" => "DE",
        "ES" => "ES",
        "RU" => "RU",
        _ => "EN-US",
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
        
    let response = client
        .post("https://api-free.deepl.com/v2/translate")
        .header("Authorization", format!("DeepL-Auth-Key {}", api_key))
        .form(&[
            ("text", text),
            ("target_lang", target),
        ])
        .send()
        .await
        .map_err(|e| format!("DeepL API request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("DeepL API error: {}", error_text));
    }

    let json: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse DeepL response: {}", e))?;

    let translated_text = json["translations"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or("No translation in response")?;

    Ok(TranslationResult {
        name: "DeepL".to_string(),
        text: translated_text,
        error: None,
    })
}
