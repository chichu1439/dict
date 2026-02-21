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
        .ok_or_else(|| AppError::Config("Ernie API key not configured".to_string()))?;

    let secret_key = config
        .and_then(|c| c.get("secretKey"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Config("Ernie secret key not configured".to_string()))?;

    let model = config
        .and_then(|c| c.get("model"))
        .and_then(|v| v.as_str())
        .unwrap_or("ernie-4.0-8k");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| AppError::Network(format!("Failed to create HTTP client: {}", e)))?;

    let token_url = format!(
        "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={}&client_secret={}",
        api_key, secret_key
    );

    let token_response = client
        .get(&token_url)
        .send()
        .await?;

    if !token_response.status().is_success() {
        let error_text = token_response.text().await.unwrap_or_default();
        return Err(AppError::Api { 
            service: "Ernie".to_string(), 
            message: format!("Failed to get access token: {}", error_text) 
        });
    }

    let token_json: serde_json::Value = token_response.json().await?;
    let access_token = token_json["access_token"]
        .as_str()
        .ok_or_else(|| AppError::Api { 
            service: "Ernie".to_string(), 
            message: "No access token in response".to_string() 
        })?;

    let model_endpoint = match model {
        "ernie-4.0-8k" => "completions_pro",
        "ernie-3.5-8k" => "completions",
        "ernie-speed-8k" => "ernie_speed",
        "ernie-lite-8k" => "ernie_lite",
        _ => "completions_pro",
    };

    let api_url = format!(
        "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/{}?access_token={}",
        model_endpoint, access_token
    );

    let response = client
        .post(&api_url)
        .json(&serde_json::json!({
            "messages": [
                {
                    "role": "user",
                    "content": format!("Translate the following text to {}. Output ONLY the translated text, no explanations:\n\n{}", target_lang, text)
                }
            ]
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Api { 
            service: "Ernie".to_string(), 
            message: error_text 
        });
    }

    let json: serde_json::Value = response.json().await?;

    let translated_text = json["result"]
        .as_str()
        .map(|s| s.trim().to_string())
        .ok_or_else(|| AppError::Translation("No translation in Ernie response".to_string()))?;

    Ok(TranslationResult {
        name: "Ernie".to_string(),
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
        .ok_or_else(|| AppError::Config("Ernie API key not configured".to_string()))?;

    let secret_key = config
        .and_then(|c| c.get("secretKey"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Config("Ernie secret key not configured".to_string()))?;

    let model = config
        .and_then(|c| c.get("model"))
        .and_then(|v| v.as_str())
        .unwrap_or("ernie-4.0-8k");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| AppError::Network(format!("Failed to create HTTP client: {}", e)))?;

    let token_url = format!(
        "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id={}&client_secret={}",
        api_key, secret_key
    );

    let token_response = client
        .get(&token_url)
        .send()
        .await?;

    if !token_response.status().is_success() {
        let error_text = token_response.text().await.unwrap_or_default();
        return Err(AppError::Api { 
            service: "Ernie".to_string(), 
            message: format!("Failed to get access token: {}", error_text) 
        });
    }

    let token_json: serde_json::Value = token_response.json().await?;
    let access_token = token_json["access_token"]
        .as_str()
        .ok_or_else(|| AppError::Api { 
            service: "Ernie".to_string(), 
            message: "No access token in response".to_string() 
        })?;

    let model_endpoint = match model {
        "ernie-4.0-8k" => "completions_pro",
        "ernie-3.5-8k" => "completions",
        "ernie-speed-8k" => "ernie_speed",
        "ernie-lite-8k" => "ernie_lite",
        _ => "completions_pro",
    };

    let api_url = format!(
        "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/{}?access_token={}",
        model_endpoint, access_token
    );

    let response = client
        .post(&api_url)
        .json(&serde_json::json!({
            "messages": [
                {
                    "role": "user",
                    "content": format!("Translate the following text to {}. Output ONLY the translated text, no explanations:\n\n{}", target_lang, text)
                }
            ],
            "stream": true
        }))
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(AppError::Api { 
            service: "Ernie".to_string(), 
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
                if let Some(result) = json.get("result").and_then(|r| r.as_str()) {
                    on_delta(result);
                    full_text.push_str(result);
                }
            }
        }
    }

    Ok(full_text)
}
