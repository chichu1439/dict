use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MathpixRequest {
    pub image_data: Option<String>,
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MathpixResult {
    pub latex: String,
    pub latex_styled: Option<String>,
    pub confidence: Option<f64>,
    pub error: Option<String>,
}

pub async fn recognize_formula(
    image_data: Option<String>,
    image_url: Option<String>,
    config: Option<&serde_json::Value>,
) -> crate::error::Result<MathpixResult> {
    let app_id = config
        .and_then(|c| c.get("appId"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| crate::error::AppError::Config("Mathpix App ID not configured".to_string()))?;

    let app_key = config
        .and_then(|c| c.get("appKey"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| crate::error::AppError::Config("Mathpix App Key not configured".to_string()))?;

    let api_url = config
        .and_then(|c| c.get("apiUrl"))
        .and_then(|v| v.as_str())
        .unwrap_or("https://api.mathpix.com/v3/text");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| crate::error::AppError::Network(format!("Failed to create HTTP client: {}", e)))?;

    let mut body = serde_json::json!({
        "formats": ["latex_simplified", "latex_styled"],
        "data_options": {
            "include_asciimath": false,
            "include_latex": true,
            "include_mathml": false
        }
    });

    if let Some(data) = image_data {
        body["src"] = serde_json::json!(format!("data:image/png;base64,{}", data));
    } else if let Some(url) = image_url {
        body["src"] = serde_json::json!(url);
    } else {
        return Err(crate::error::AppError::InvalidRequest(
            "Either image_data or image_url must be provided".to_string()
        ));
    }

    let response = client
        .post(api_url)
        .header("app_id", &app_id)
        .header("app_key", &app_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(crate::error::AppError::Api {
            service: "Mathpix".to_string(),
            message: error_text,
        });
    }

    let json: serde_json::Value = response.json().await?;

    let latex = json["latex_simplified"]
        .as_str()
        .or_else(|| json["latex"].as_str())
        .map(|s| s.to_string())
        .unwrap_or_default();

    let latex_styled = json["latex_styled"].as_str().map(|s| s.to_string());

    let confidence = json["confidence"]
        .as_f64()
        .or_else(|| json["confidence_rate"].as_f64());

    Ok(MathpixResult {
        latex,
        latex_styled,
        confidence,
        error: None,
    })
}
