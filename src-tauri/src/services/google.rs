use crate::models::TranslationResult;

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
        .or_else(|| std::env::var("GOOGLE_TRANSLATE_API_KEY").ok())
        .or_else(|| {
            std::fs::read_to_string(".env")
                .map_err(|_| ())
                .and_then(|s| {
                    s.lines()
                        .find(|l| l.starts_with("GOOGLE_TRANSLATE_API_KEY="))
                        .map(|l| l.trim_start_matches("GOOGLE_TRANSLATE_API_KEY=").to_string())
                        .ok_or(())
                })
                .ok()
        });

    match api_key {
        Some(key) => {
            let client = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
                
            let url = format!(
                "https://translation.googleapis.com/language/translate/v2?key={}",
                key
            );

            let response = client
                .post(&url)
                .json(&serde_json::json!({
                    "q": text,
                    "target": target_lang,
                    "format": "text"
                }))
                .send()
                .await
                .map_err(|e| format!("Google Translate API request failed: {}", e))?;

            if !response.status().is_success() {
                let error_text = response.text().await.unwrap_or_default();
                return Err(format!("Google Translate API error: {}", error_text));
            }

            let json: serde_json::Value = response.json().await
                .map_err(|e| format!("Failed to parse Google response: {}", e))?;

            let translated_text = json["data"]["translations"][0]["translatedText"]
                .as_str()
                .map(|s| s.to_string())
                .ok_or("No translation in response")?;

            Ok(TranslationResult {
                name: "Google".to_string(),
                text: translated_text,
                error: None,
            })
        }
        None => Err("Google Translate API key not configured. Set GOOGLE_TRANSLATE_API_KEY in .env file.".to_string())
    }
}
