use crate::models::TranslationResult;
use reqwest::Client;
use serde_json::Value;

pub async fn translate(
    text: &str,
    source_lang: &str,
    target_lang: &str,
    _config: Option<&serde_json::Value>,
) -> Result<TranslationResult, String> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = "https://translate.googleapis.com/translate_a/single";
    
    let res = client
        .get(url)
        .header("Accept", "*/*")
        .header("Accept-Language", "en-US,en;q=0.9")
        .header("Referer", "https://translate.google.com/")
        .query(&[
            ("client", "gtx"),
            ("sl", source_lang),
            ("tl", target_lang),
            ("dt", "t"),
            ("q", text),
        ])
        .send()
        .await
        .map_err(|e| format!("Google Free API request failed: {}", e))?;

    let status = res.status();
    
    // 根据状态码决定如何处理响应体
    if !status.is_success() {
        // 错误情况：获取错误体
        let error_body = res.text().await.unwrap_or_default();
        return Err(format!("Google Free API returned error: {} - {}", status, error_body));
    }

    // 成功情况：解析JSON
    let json: Value = res.json().await
        .map_err(|e| format!("Failed to parse Google Free response: {}", e))?;

    // Response structure: [[["translated", "original", ...], ...], ...]
    if let Some(sentences) = json.as_array()
        .and_then(|arr| arr.get(0))
        .and_then(|val| val.as_array())
    {
        let mut translated_text = String::new();
        for sentence in sentences {
            if let Some(text) = sentence.as_array()
                .and_then(|arr| arr.get(0))
                .and_then(|val| val.as_str())
            {
                translated_text.push_str(text);
            }
        }
        
        if translated_text.is_empty() {
             return Err("No translation found in response".to_string());
        }

        Ok(TranslationResult {
            name: "GoogleFree".to_string(),
            text: translated_text,
            error: None,
        })
    } else {
        Err("Invalid response format from Google Free API".to_string())
    }
}