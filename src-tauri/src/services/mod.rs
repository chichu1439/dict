pub mod openai;
pub mod deepl;
pub mod google;
pub mod alibaba;
pub mod google_free;
pub mod claude;
pub mod ernie;

use crate::models::{TranslationRequest, TranslationResponse, TranslationResult};
use crate::error::{AppError, Result};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

fn check_api_key(service_config: Option<&serde_json::Value>) -> bool {
    service_config
        .and_then(|config| config.get("apiKey"))
        .and_then(|key| key.as_str())
        .map(|key| !key.is_empty())
        .unwrap_or(false)
}

fn make_error_result(name: &str, error: impl Into<String>) -> TranslationResult {
    TranslationResult {
        name: name.to_string(),
        text: String::new(),
        error: Some(error.into()),
    }
}

pub async fn translate(request: TranslationRequest) -> Result<TranslationResponse> {
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
                    if !check_api_key(service_config) {
                        println!("OpenAI service skipped - no API key configured");
                        return make_error_result("OpenAI", "No API key configured");
                    }
                    
                    match openai::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("OpenAI translation error: {}", e);
                            make_error_result("OpenAI", e)
                        },
                    }
                }
                "claude" => {
                    if !check_api_key(service_config) {
                        println!("Claude service skipped - no API key configured");
                        return make_error_result("Claude", "No API key configured");
                    }
                    
                    match claude::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("Claude translation error: {}", e);
                            make_error_result("Claude", e)
                        },
                    }
                }
                "ernie" | "wenxin" | "文心一言" => {
                    let has_api_key = service_config
                        .and_then(|c| c.get("apiKey"))
                        .and_then(|k| k.as_str())
                        .map(|k| !k.is_empty())
                        .unwrap_or(false);
                    let has_secret_key = service_config
                        .and_then(|c| c.get("secretKey"))
                        .and_then(|k| k.as_str())
                        .map(|k| !k.is_empty())
                        .unwrap_or(false);
                    
                    if !has_api_key || !has_secret_key {
                        println!("Ernie service skipped - API key or secret key not configured");
                        return make_error_result("Ernie", "API key and secret key required");
                    }
                    
                    match ernie::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("Ernie translation error: {}", e);
                            make_error_result("Ernie", e)
                        },
                    }
                }
                "zhipu" => {
                    if !check_api_key(service_config) {
                        println!("Zhipu service skipped - no API key configured");
                        return make_error_result("Zhipu", "No API key configured");
                    }
                    
                    let mut config_obj = service_config.cloned().unwrap_or(serde_json::json!({}));
                    if let Some(obj) = config_obj.as_object_mut() {
                        obj.entry("apiUrl".to_string())
                            .or_insert(serde_json::Value::String("https://open.bigmodel.cn/api/paas/v4/chat/completions".to_string()));
                        obj.entry("model".to_string())
                            .or_insert(serde_json::Value::String("glm-4-flash".to_string()));
                    }
                    
                    match openai::translate(&text, &source_lang, &target_lang, Some(&config_obj)).await {
                        Ok(mut result) => {
                            result.name = "Zhipu".to_string();
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("Zhipu translation error: {}", e);
                            make_error_result("Zhipu", e)
                        },
                    }
                }
                "groq" => {
                    let mut config_obj = service_config.cloned().unwrap_or(serde_json::json!({}));
                    if let Some(obj) = config_obj.as_object_mut() {
                        obj.entry("apiUrl".to_string())
                            .or_insert(serde_json::Value::String("https://api.groq.com/openai/v1/chat/completions".to_string()));
                        obj.entry("model".to_string())
                            .or_insert(serde_json::Value::String("llama3-8b-8192".to_string()));
                    }

                    match openai::translate(&text, &source_lang, &target_lang, Some(&config_obj)).await {
                        Ok(mut result) => {
                            result.name = "Groq".to_string();
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("Groq translation error: {}", e);
                            make_error_result("Groq", e)
                        },
                    }
                }
                "gemini" => {
                    let mut config_obj = service_config.cloned().unwrap_or(serde_json::json!({}));
                    if let Some(obj) = config_obj.as_object_mut() {
                        obj.entry("apiUrl".to_string())
                            .or_insert(serde_json::Value::String("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions".to_string()));
                        obj.entry("model".to_string())
                            .or_insert(serde_json::Value::String("gemini-1.5-flash".to_string()));
                    }

                    match openai::translate(&text, &source_lang, &target_lang, Some(&config_obj)).await {
                        Ok(mut result) => {
                            result.name = "Gemini".to_string();
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("Gemini translation error: {}", e);
                            make_error_result("Gemini", e)
                        },
                    }
                }
                "deepl" => {
                    match deepl::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("DeepL translation error: {}", e);
                            make_error_result("DeepL", e)
                        },
                    }
                }
                "google" => {
                    match google::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("Google translation error: {}", e);
                            make_error_result("Google", e)
                        },
                    }
                }
                "alibaba" => {
                    match alibaba::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("Alibaba translation error: {}", e);
                            make_error_result("Alibaba", e)
                        },
                    }
                }
                "googlefree" | "google native" => {
                    match google_free::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            result
                        },
                        Err(e) => {
                            println!("GoogleFree translation error: {}", e);
                            make_error_result("GoogleFree", e)
                        },
                    }
                }
                _ => {
                    println!("Unknown service: {}", service_name);
                    make_error_result(&service_name, "Service not supported")
                }
            };
            
            println!("Service {} completed with result: {:?}", service_name, result);
            result
        });
        handles.push(handle);
    }

    println!("Waiting for all translation services to complete...");
    let mut final_results = Vec::new();

    for handle in handles {
        match handle.await {
            Ok(result) => {
                if let Some(error) = &result.error {
                    println!("Service {} failed with error: {}", result.name, error);
                } else {
                    println!("Service {} completed successfully", result.name);
                }
                final_results.push(result);
            }
            Err(e) => {
                println!("Translation task failed: {}", e);
            }
        }
    }

    println!("Translation completed. Total results: {}", final_results.len());

    if final_results.is_empty() {
        return Err(AppError::Translation("No translation services returned results".to_string()));
    }

    Ok(TranslationResponse { results: final_results })
}

#[derive(Serialize, Clone)]
struct StreamPayload {
    request_id: String,
    service: String,
    delta: Option<String>,
    text: Option<String>,
    error: Option<String>,
    done: bool,
    all_done: bool,
}

pub async fn translate_stream(app: AppHandle, request: TranslationRequest, request_id: String) -> Result<()> {
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
        let app_handle = app.clone();
        let request_id_clone = request_id.clone();

        let handle = tokio::spawn(async move {
            let service_config = config.as_ref().and_then(|c| c.get(&service_name.to_lowercase()));

            let emit = |payload: StreamPayload| {
                let _ = app_handle.emit("translation-stream", payload);
            };

            let emit_error = |error: String| {
                emit(StreamPayload {
                    request_id: request_id_clone.clone(),
                    service: service_name.clone(),
                    delta: None,
                    text: None,
                    error: Some(error),
                    done: true,
                    all_done: false,
                });
            };

            match service_name.to_lowercase().as_str() {
                "openai" | "zhipu" | "groq" | "gemini" => {
                    if !check_api_key(service_config) {
                        emit_error("No API key configured".to_string());
                        return;
                    }

                    let mut config_obj = service_config.cloned().unwrap_or(serde_json::json!({}));
                    if let Some(obj) = config_obj.as_object_mut() {
                        match service_name.to_lowercase().as_str() {
                            "zhipu" => {
                                obj.entry("apiUrl".to_string())
                                    .or_insert(serde_json::Value::String("https://open.bigmodel.cn/api/paas/v4/chat/completions".to_string()));
                                obj.entry("model".to_string())
                                    .or_insert(serde_json::Value::String("glm-4-flash".to_string()));
                            }
                            "groq" => {
                                obj.entry("apiUrl".to_string())
                                    .or_insert(serde_json::Value::String("https://api.groq.com/openai/v1/chat/completions".to_string()));
                                obj.entry("model".to_string())
                                    .or_insert(serde_json::Value::String("llama3-8b-8192".to_string()));
                            }
                            "gemini" => {
                                obj.entry("apiUrl".to_string())
                                    .or_insert(serde_json::Value::String("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions".to_string()));
                                obj.entry("model".to_string())
                                    .or_insert(serde_json::Value::String("gemini-1.5-flash".to_string()));
                            }
                            _ => {}
                        }
                    }

                    let result = openai::translate_stream(
                        &text,
                        &source_lang,
                        &target_lang,
                        Some(&config_obj),
                        |delta| {
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: service_name.clone(),
                                delta: Some(delta.to_string()),
                                text: None,
                                error: None,
                                done: false,
                                all_done: false,
                            });
                        },
                    )
                    .await;

                    match result {
                        Ok(final_text) => {
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: service_name.clone(),
                                delta: None,
                                text: Some(final_text),
                                error: None,
                                done: true,
                                all_done: false,
                            });
                        }
                        Err(e) => {
                            emit_error(e);
                        }
                    }
                }
                "claude" => {
                    if !check_api_key(service_config) {
                        emit_error("No API key configured".to_string());
                        return;
                    }

                    let result = claude::translate_stream(
                        &text,
                        &source_lang,
                        &target_lang,
                        service_config,
                        |delta| {
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: service_name.clone(),
                                delta: Some(delta.to_string()),
                                text: None,
                                error: None,
                                done: false,
                                all_done: false,
                            });
                        },
                    )
                    .await;

                    match result {
                        Ok(final_text) => {
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: service_name.clone(),
                                delta: None,
                                text: Some(final_text),
                                error: None,
                                done: true,
                                all_done: false,
                            });
                        }
                        Err(e) => {
                            emit_error(e.to_string());
                        }
                    }
                }
                "ernie" | "wenxin" | "文心一言" => {
                    let has_api_key = service_config
                        .and_then(|c| c.get("apiKey"))
                        .and_then(|k| k.as_str())
                        .map(|k| !k.is_empty())
                        .unwrap_or(false);
                    let has_secret_key = service_config
                        .and_then(|c| c.get("secretKey"))
                        .and_then(|k| k.as_str())
                        .map(|k| !k.is_empty())
                        .unwrap_or(false);
                    
                    if !has_api_key || !has_secret_key {
                        emit_error("API key and secret key required".to_string());
                        return;
                    }

                    let result = ernie::translate_stream(
                        &text,
                        &source_lang,
                        &target_lang,
                        service_config,
                        |delta| {
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: service_name.clone(),
                                delta: Some(delta.to_string()),
                                text: None,
                                error: None,
                                done: false,
                                all_done: false,
                            });
                        },
                    )
                    .await;

                    match result {
                        Ok(final_text) => {
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: service_name.clone(),
                                delta: None,
                                text: Some(final_text),
                                error: None,
                                done: true,
                                all_done: false,
                            });
                        }
                        Err(e) => {
                            emit_error(e.to_string());
                        }
                    }
                }
                "deepl" => {
                    match deepl::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: result.name,
                                delta: None,
                                text: Some(result.text),
                                error: None,
                                done: true,
                                all_done: false,
                            });
                        }
                        Err(e) => emit_error(e),
                    }
                }
                "google" => {
                    match google::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: result.name,
                                delta: None,
                                text: Some(result.text),
                                error: None,
                                done: true,
                                all_done: false,
                            });
                        }
                        Err(e) => emit_error(e),
                    }
                }
                "alibaba" => {
                    match alibaba::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: result.name,
                                delta: None,
                                text: Some(result.text),
                                error: None,
                                done: true,
                                all_done: false,
                            });
                        }
                        Err(e) => emit_error(e),
                    }
                }
                "googlefree" | "google native" => {
                    match google_free::translate(&text, &source_lang, &target_lang, service_config).await {
                        Ok(mut result) => {
                            result.error = None;
                            emit(StreamPayload {
                                request_id: request_id_clone.clone(),
                                service: result.name,
                                delta: None,
                                text: Some(result.text),
                                error: None,
                                done: true,
                                all_done: false,
                            });
                        }
                        Err(e) => emit_error(e),
                    }
                }
                _ => {
                    emit_error("Service not supported".to_string());
                }
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        let _ = handle.await;
    }

    let _ = app.emit(
        "translation-stream",
        StreamPayload {
            request_id,
            service: String::new(),
            delta: None,
            text: None,
            error: None,
            done: true,
            all_done: true,
        },
    );

    Ok(())
}
