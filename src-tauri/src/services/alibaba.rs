use crate::models::TranslationResult;
use chrono::Utc;
use hmac::{Hmac, Mac};
use reqwest::Client;
use serde::Deserialize;
use sha1::Sha1;
use base64::{Engine as _, engine::general_purpose};
use std::collections::BTreeMap;
use std::env;
use uuid::Uuid;

#[derive(Deserialize)]
struct AlibabaResponse {
    #[serde(rename = "Data")]
    data: Option<AlibabaData>,
    #[serde(rename = "Message")]
    message: Option<String>,
}

#[derive(Deserialize)]
struct AlibabaData {
    #[serde(rename = "Translated")]
    translated: String,
}

pub async fn translate(
    text: &str,
    source_lang: &str,
    target_lang: &str,
    config: Option<&serde_json::Value>,
) -> Result<TranslationResult, String> {
    let (access_key_id, access_key_secret) = if let Some(c) = config {
        (
            c.get("accessKeyId").and_then(|v| v.as_str()).map(|s| s.to_string()),
            c.get("accessKeySecret").and_then(|v| v.as_str()).map(|s| s.to_string())
        )
    } else {
        (None, None)
    };

    let access_key_id = access_key_id
        .or_else(|| env::var("ALIBABA_ACCESS_KEY_ID").ok())
        .or_else(|| read_env("ALIBABA_ACCESS_KEY_ID").ok())
        .ok_or_else(|| "ALIBABA_ACCESS_KEY_ID not found".to_string())?;

    let access_key_secret = access_key_secret
        .or_else(|| env::var("ALIBABA_ACCESS_KEY_SECRET").ok())
        .or_else(|| read_env("ALIBABA_ACCESS_KEY_SECRET").ok())
        .ok_or_else(|| "ALIBABA_ACCESS_KEY_SECRET not found".to_string())?;

    let client = Client::new();
    let url = "https://mt.aliyuncs.com/";

    let mut params = BTreeMap::new();
    params.insert("Action", "TranslateGeneral");
    params.insert("Format", "JSON");
    params.insert("Version", "2018-10-12");
    params.insert("AccessKeyId", access_key_id.as_str());
    params.insert("SignatureMethod", "HMAC-SHA1");
    let timestamp = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    params.insert("Timestamp", &timestamp);
    params.insert("SignatureVersion", "1.0");
    let nonce = Uuid::new_v4().to_string();
    params.insert("SignatureNonce", &nonce);
    
    // Convert logic for source/target langs if needed (Alibaba uses 'zh', 'en', etc.)
    // 'auto' might be supported or might need empty. Alibaba supports 'auto'.
    let source = if source_lang == "auto" { "auto" } else { source_lang };
    params.insert("SourceLanguage", source);
    params.insert("TargetLanguage", target_lang);
    params.insert("SourceText", text);
    params.insert("Scene", "general");
    params.insert("FormatType", "text");

    // Calculate Signature
    let signature = calculate_signature(&params, "POST", &access_key_secret)?;
    
    // We must send params in body for POST, but signature is calculated on them.
    // For Alibaba RPC, usually params are sent as query params or form urlencoded.
    // Let's use form urlencoded for POST.
    let mut form_params = params.clone();
    form_params.insert("Signature", signature.as_str());

    let response = client
        .post(url)
        .form(&form_params)
        .send()
        .await
        .map_err(|e| format!("Alibaba API request failed: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Alibaba API error: {}", error_text));
    }

    let result: AlibabaResponse = response.json().await
        .map_err(|e| format!("Failed to parse Alibaba response: {}", e))?;

    if let Some(data) = result.data {
        Ok(TranslationResult {
            name: "Alibaba".to_string(),
            text: data.translated,
            error: None,
        })
    } else {
        Err(result.message.unwrap_or_else(|| "Unknown error from Alibaba".to_string()))
    }
}

fn calculate_signature(
    params: &BTreeMap<&str, &str>,
    method: &str,
    secret: &str,
) -> Result<String, String> {
    let mut canonicalized_query_string = String::new();
    for (key, value) in params {
        if !canonicalized_query_string.is_empty() {
            canonicalized_query_string.push('&');
        }
        canonicalized_query_string.push_str(&percent_encode(key));
        canonicalized_query_string.push('=');
        canonicalized_query_string.push_str(&percent_encode(value));
    }

    let string_to_sign = format!(
        "{}&{}&{}",
        method,
        percent_encode("/"),
        percent_encode(&canonicalized_query_string)
    );

    let key = format!("{}&", secret);
    type HmacSha1 = Hmac<Sha1>;
    let mut mac = HmacSha1::new_from_slice(key.as_bytes())
        .map_err(|_| "Invalid HMAC key".to_string())?;
    mac.update(string_to_sign.as_bytes());
    let result = mac.finalize();
    let signature = general_purpose::STANDARD.encode(result.into_bytes());

    Ok(signature)
}

fn percent_encode(input: &str) -> String {
    url::form_urlencoded::byte_serialize(input.as_bytes())
        .collect::<String>()
        .replace("+", "%20")
        .replace("*", "%2A")
        .replace("%7E", "~")
}

fn read_env(key: &str) -> Result<String, ()> {
    std::fs::read_to_string(".env")
        .map_err(|_| ())
        .and_then(|s| {
            s.lines()
                .find(|l| l.starts_with(key))
                .map(|l| l.trim_start_matches(&format!("{}=", key)).to_string())
                .ok_or(())
        })
}
