use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsRequest {
    pub text: String,
    pub voice: Option<String>, // "uk" 或 "us"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TtsResponse {
    pub success: bool,
    pub message: String,
}
