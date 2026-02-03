pub mod services;

use async_trait::async_trait;
use crate::models::{TranslationRequest, TranslationResult};

#[async_trait]
pub trait TranslationService {
    fn name(&self) -> &str;
    async fn translate(&self, request: &TranslationRequest, api_key: &str) -> Result<TranslationResult, String>;
}
