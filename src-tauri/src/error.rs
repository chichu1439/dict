use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Translation error: {0}")]
    Translation(String),

    #[error("OCR error: {0}")]
    Ocr(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("API error: {service} - {message}")]
    Api { service: String, message: String },

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("HTTP error: {0}")]
    Http(String),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),

    #[error("Rate limit exceeded for {service}")]
    RateLimitExceeded { service: String },

    #[error("Authentication failed for {service}")]
    AuthFailed { service: String },

    #[error("Timeout: {0}")]
    Timeout(String),

    #[error("Platform not supported: {0}")]
    PlatformNotSupported(String),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

pub type Result<T> = std::result::Result<T, AppError>;

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            AppError::Timeout(err.to_string())
        } else if err.is_connect() {
            AppError::Network(format!("Connection failed: {}", err))
        } else if err.is_status() {
            match err.status() {
                Some(status) => {
                    if status.as_u16() == 401 {
                        AppError::AuthFailed { service: "unknown".to_string() }
                    } else if status.as_u16() == 429 {
                        AppError::RateLimitExceeded { service: "unknown".to_string() }
                    } else {
                        AppError::Http(format!("HTTP {}: {}", status, err))
                    }
                }
                None => AppError::Http(err.to_string()),
            }
        } else {
            AppError::Network(err.to_string())
        }
    }
}

impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
