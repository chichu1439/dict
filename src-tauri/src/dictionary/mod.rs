use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryEntry {
    pub word: String,
    pub phonetic: Option<String>,
    pub phonetics: Vec<Phonetic>,
    pub meanings: Vec<Meaning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Phonetic {
    pub text: Option<String>,
    pub audio: Option<String>,
    pub source_url: Option<String>,
    pub license: Option<License>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct License {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meaning {
    #[serde(rename = "partOfSpeech")]
    pub part_of_speech: String,
    pub definitions: Vec<Definition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Definition {
    pub definition: String,
    pub example: Option<String>,
}

/// 查询 Free Dictionary API
pub async fn lookup_word(word: &str) -> Result<Vec<DictionaryEntry>> {
    let url = format!("https://api.dictionaryapi.dev/api/v2/entries/en/{}", word);
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| AppError::Network(format!("Failed to fetch dictionary: {}", e)))?;
    
    if !response.status().is_success() {
        return Err(AppError::Unknown(format!("Dictionary API error: {}", response.status())));
    }
    
    let entries: Vec<DictionaryEntry> = response
        .json()
        .await
        .map_err(|e| AppError::Unknown(format!("Failed to parse dictionary response: {}", e)))?;
    
    Ok(entries)
}

/// 获取音标（优先 UK，其次 US）
pub fn get_phonetics(entry: &DictionaryEntry) -> (Option<String>, Option<String>) {
    let mut uk_phonetic = None;
    let mut us_phonetic = None;
    
    for phonetic in &entry.phonetics {
        if let Some(text) = &phonetic.text {
            // 根据音频 URL 判断是 UK 还是 US
            if let Some(audio) = &phonetic.audio {
                if audio.contains("-uk-") || audio.contains("/uk/") {
                    uk_phonetic = Some(text.clone());
                } else if audio.contains("-us-") || audio.contains("/us/") {
                    us_phonetic = Some(text.clone());
                }
            }
            
            // 如果没有找到特定地区的音标，使用第一个
            if uk_phonetic.is_none() && us_phonetic.is_none() {
                uk_phonetic = Some(text.clone());
            }
        }
    }
    
    (uk_phonetic, us_phonetic)
}

/// 获取发音音频 URL
pub fn get_audio_url(entry: &DictionaryEntry, accent: &str) -> Option<String> {
    for phonetic in &entry.phonetics {
        if let Some(audio) = &phonetic.audio {
            match accent {
                "uk" | "UK" | "british" => {
                    if audio.contains("-uk-") || audio.contains("/uk/") {
                        return Some(audio.clone());
                    }
                }
                "us" | "US" | "american" => {
                    if audio.contains("-us-") || audio.contains("/us/") {
                        return Some(audio.clone());
                    }
                }
                _ => {
                    // 返回第一个可用的音频
                    if !audio.is_empty() {
                        return Some(audio.clone());
                    }
                }
            }
        }
    }
    
    // 如果没有找到特定口音，返回第一个可用音频
    entry.phonetics.iter().find_map(|p| {
        p.audio.as_ref().filter(|a| !a.is_empty()).cloned()
    })
}
