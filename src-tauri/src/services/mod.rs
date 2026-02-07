pub mod openai;
pub mod deepl;
pub mod google;
pub mod alibaba;
pub mod google_free;

use crate::models::{TranslationRequest, TranslationResponse, TranslationResult};

pub async fn translate(
    request: TranslationRequest
) -> Result<TranslationResponse, String> {
    let mut results = Vec::new();
    let services = if request.services.is_empty() {
        vec!["OpenAI".to_string(), "DeepL".to_string(), "Alibaba".to_string(), "GoogleFree".to_string()]
    } else {
        request.services
    };

    let mut handles = Vec::new();

    for service in services {
        let text = request.text.clone();
        let source_lang = request.source_lang.clone();
        let target_lang = request.target_lang.clone();
        let config = request.config.clone();
        let service_name = service.clone();

        let handle = tokio::spawn(async move {
            let service_config = config.as_ref().and_then(|c| c.get(&service_name.to_lowercase()));
            
            match service_name.to_lowercase().as_str() {
                "openai" => {
                    match openai::translate(
                        &text,
                        &source_lang,
                        &target_lang,
                        service_config
                    ).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => TranslationResult {
                            name: "OpenAI".to_string(),
                            text: "".to_string(),
                            error: Some(e),
                        },
                    }
                }
                "zhipu" => {
                    let mut config_obj = service_config.cloned().unwrap_or(serde_json::json!({}));
                    if let Some(obj) = config_obj.as_object_mut() {
                         if !obj.contains_key("apiUrl") {
                            obj.insert("apiUrl".to_string(), serde_json::Value::String("https://open.bigmodel.cn/api/paas/v4/chat/completions".to_string()));
                        }
                        if !obj.contains_key("model") {
                            obj.insert("model".to_string(), serde_json::Value::String("glm-4-flash".to_string()));
                        }
                    }
                    
                    match openai::translate(
                        &text,
                        &source_lang,
                        &target_lang,
                        Some(&config_obj)
                    ).await {
                         Ok(mut result) => {
                            result.name = "Zhipu".to_string(); // Override name
                            result.error = None;
                            result
                        },
                        Err(e) => TranslationResult {
                            name: "Zhipu".to_string(),
                            text: "".to_string(),
                            error: Some(e),
                        },
                    }
                }
                "groq" => {
                    let mut config_obj = service_config.cloned().unwrap_or(serde_json::json!({}));
                    if let Some(obj) = config_obj.as_object_mut() {
                        if !obj.contains_key("apiUrl") {
                            obj.insert("apiUrl".to_string(), serde_json::Value::String("https://api.groq.com/openai/v1/chat/completions".to_string()));
                        }
                        if !obj.contains_key("model") {
                            obj.insert("model".to_string(), serde_json::Value::String("llama3-8b-8192".to_string()));
                        }
                    }

                    match openai::translate(
                        &text,
                        &source_lang,
                        &target_lang,
                         Some(&config_obj)
                    ).await {
                         Ok(mut result) => {
                            result.name = "Groq".to_string();
                            result.error = None;
                            result
                        },
                        Err(e) => TranslationResult {
                            name: "Groq".to_string(),
                            text: "".to_string(),
                            error: Some(e),
                        },
                    }
                }
                "gemini" => {
                    let mut config_obj = service_config.cloned().unwrap_or(serde_json::json!({}));
                    if let Some(obj) = config_obj.as_object_mut() {
                        if !obj.contains_key("apiUrl") {
                            obj.insert("apiUrl".to_string(), serde_json::Value::String("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions".to_string()));
                        }
                        if !obj.contains_key("model") {
                            obj.insert("model".to_string(), serde_json::Value::String("gemini-1.5-flash".to_string()));
                        }
                    }

                    match openai::translate(
                        &text,
                        &source_lang,
                        &target_lang,
                         Some(&config_obj)
                    ).await {
                         Ok(mut result) => {
                            result.name = "Gemini".to_string();
                            result.error = None;
                            result
                        },
                        Err(e) => TranslationResult {
                            name: "Gemini".to_string(),
                            text: "".to_string(),
                            error: Some(e),
                        },
                    }
                }
                "deepl" => {
                     match deepl::translate(
                        &text,
                        &source_lang,
                        &target_lang,
                        service_config
                    ).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => TranslationResult {
                            name: "DeepL".to_string(),
                            text: "".to_string(),
                            error: Some(e),
                        },
                    }
                }
                "google" => {
                     match google::translate(
                        &text,
                        &source_lang,
                        &target_lang,
                        service_config
                    ).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => TranslationResult {
                            name: "Google".to_string(),
                            text: "".to_string(),
                            error: Some(e),
                        },
                    }
                }
                "alibaba" => {
                     match alibaba::translate(
                        &text,
                        &source_lang,
                        &target_lang,
                        service_config
                    ).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => TranslationResult {
                            name: "Alibaba".to_string(),
                            text: "".to_string(),
                            error: Some(e),
                        },
                    }
                }
                "googlefree" | "google native" => {
                     match google_free::translate(
                        &text,
                        &source_lang,
                        &target_lang,
                        service_config
                    ).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => TranslationResult {
                            name: "GoogleFree".to_string(),
                            text: "".to_string(),
                            error: Some(e),
                        },
                    }
                }
                _ => TranslationResult {
                    name: service_name,
                    text: "".to_string(),
                    error: Some("Service not supported".to_string()),
                }
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        if let Ok(result) = handle.await {
            // Filter out unsupported services if needed, or keep them to show error
            if result.error != Some("Service not supported".to_string()) {
                results.push(result);
            }
        }
    }

    Ok(TranslationResponse { results })
}

