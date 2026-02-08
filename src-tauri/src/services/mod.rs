pub mod openai;
pub mod deepl;
pub mod google;
pub mod alibaba;
pub mod google_free;

use crate::models::{TranslationRequest, TranslationResponse, TranslationResult};

pub async fn translate(
    request: TranslationRequest
) -> Result<TranslationResponse, String> {
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
            
            println!("Processing translation service: {}", service_name);
            
            let result = match service_name.to_lowercase().as_str() {
                "openai" => {
                    // Check if API key is available
                    let has_api_key = service_config
                        .and_then(|config| config.get("apiKey"))
                        .and_then(|key| key.as_str())
                        .map(|key| !key.is_empty())
                        .unwrap_or(false);
                    
                    if !has_api_key {
                        println!("OpenAI service skipped - no API key configured");
                        return TranslationResult {
                            name: "OpenAI".to_string(),
                            text: "".to_string(),
                            error: Some("No API key configured".to_string()),
                        };
                    }
                    
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
                        Err(e) => {
                            println!("OpenAI translation error: {}", e);
                            TranslationResult {
                                name: "OpenAI".to_string(),
                                text: "".to_string(),
                                error: Some(e),
                            }
                        },
                    }
                }
                "zhipu" => {
                    // Check if API key is available
                    let has_api_key = service_config
                        .and_then(|config| config.get("apiKey"))
                        .and_then(|key| key.as_str())
                        .map(|key| !key.is_empty())
                        .unwrap_or(false);
                    
                    if !has_api_key {
                        println!("Zhipu service skipped - no API key configured");
                        return TranslationResult {
                            name: "Zhipu".to_string(),
                            text: "".to_string(),
                            error: Some("No API key configured".to_string()),
                        };
                    }
                    
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
                            result.name = "Zhipu".to_string();
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("Zhipu translation error: {}", e);
                            TranslationResult {
                                name: "Zhipu".to_string(),
                                text: "".to_string(),
                                error: Some(e),
                            }
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
                        Err(e) => {
                            println!("Groq translation error: {}", e);
                            TranslationResult {
                                name: "Groq".to_string(),
                                text: "".to_string(),
                                error: Some(e),
                            }
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
                        Err(e) => {
                            println!("Gemini translation error: {}", e);
                            TranslationResult {
                                name: "Gemini".to_string(),
                                text: "".to_string(),
                                error: Some(e),
                            }
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
                        Err(e) => {
                            println!("DeepL translation error: {}", e);
                            TranslationResult {
                                name: "DeepL".to_string(),
                                text: "".to_string(),
                                error: Some(e),
                            }
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
                        Err(e) => {
                            println!("Google translation error: {}", e);
                            TranslationResult {
                                name: "Google".to_string(),
                                text: "".to_string(),
                                error: Some(e),
                            }
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
                        Err(e) => {
                            println!("Alibaba translation error: {}", e);
                            TranslationResult {
                                name: "Alibaba".to_string(),
                                text: "".to_string(),
                                error: Some(e),
                            }
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
                        Err(e) => {
                            println!("GoogleFree translation error: {}", e);
                            TranslationResult {
                                name: "GoogleFree".to_string(),
                                text: "".to_string(),
                                error: Some(e),
                            }
                        },
                    }
                }
                _ => {
                    println!("Unknown service: {}", service_name);
                    TranslationResult {
                        name: service_name.clone(),
                        text: "".to_string(),
                        error: Some("Service not supported".to_string()),
                    }
                }
            };
            
            println!("Service {} completed with result: {:?}", service_name, result);
            result
        });
        handles.push(handle);
    }

    println!("Waiting for all translation services to complete...");
    let mut successful_results = Vec::new();
    let mut failed_services = Vec::new();

    for handle in handles {
        match handle.await {
            Ok(result) => {
                if result.error.is_none() && !result.text.is_empty() {
                    println!("Service {} completed successfully", result.name);
                    successful_results.push(result);
                } else if let Some(error) = &result.error {
                    println!("Service {} failed with error: {}", result.name, error);
                    failed_services.push(format!("{}: {}", result.name, error));
                } else {
                    println!("Service {} returned empty result", result.name);
                    failed_services.push(format!("{}: Empty result", result.name));
                }
            }
            Err(e) => {
                println!("Translation task failed: {}", e);
                failed_services.push(format!("Task error: {}", e));
            }
        }
    }

    println!("Translation completed. Successful: {}, Failed: {}", successful_results.len(), failed_services.len());

    if successful_results.is_empty() {
        if failed_services.is_empty() {
            return Err("No translation services returned results".to_string());
        } else {
            return Err(format!("All translation services failed:\n{}", failed_services.join("\n")));
        }
    }

    Ok(TranslationResponse { results: successful_results })
}