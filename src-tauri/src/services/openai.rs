use crate::models::{TranslationRequest, TranslationResult};
use super::TranslationService;
use async_trait::async_trait;
use serde_json::{json, Value};

pub struct OpenAIService;

#[async_trait]
impl TranslationService for OpenAIService {
    fn name(&self) -> &str {
        "OpenAI"
    }

    async fn translate(&self, request: &TranslationRequest, api_key: &str) -> Result<TranslationResult, String> {
        let client = reqwest::Client::new();
        
        let payload = json!({
            "model": "gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": format!("Translate the following text from {} to {}. Only return the translation, no explanation.", 
                        request.source_lang, request.target_lang)
                },
                {
                    "role": "user",
                    "content": &request.text
                }
            ]
        });

        let response = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("API error: {}", response.status()));
        }

        let body: Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let translation = body["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("Translation failed")
            .to_string();

        Ok(TranslationResult {
            service: self.name().to_string(),
            text: translation,
        })
    }
}
