use crate::models::{TranslationRequest, TranslationResult};
use super::TranslationService;
use async_trait::async_trait;
use serde_json::{json, Value};

pub struct DeepLService;

#[async_trait]
impl TranslationService for DeepLService {
    fn name(&self) -> &str {
        "DeepL"
    }

    async fn translate(&self, request: &TranslationRequest, api_key: &str) -> Result<TranslationResult, String> {
        let client = reqwest::Client::new();
        
        let payload = json!({
            "text": vec![&request.text],
            "source_lang": request.source_lang.to_uppercase(),
            "target_lang": request.target_lang.to_uppercase()
        });

        let response = client
            .post("https://api-free.deepl.com/v2/translate")
            .header("Authorization", format!("DeepL-Auth-Key {}", api_key))
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

        let translation = body["translations"][0]["text"]
            .as_str()
            .unwrap_or("Translation failed")
            .to_string();

        Ok(TranslationResult {
            service: self.name().to_string(),
            text: translation,
        })
    }
}
