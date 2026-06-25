use crate::spotlight_window::read_gateway_token;
use serde::{Deserialize, Serialize};

const GATEWAY_CHAT_URL: &str = "http://127.0.0.1:18789/v1/chat/completions";

#[derive(Debug, Deserialize, Serialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Option<Vec<ChatChoice>>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: Option<ChatMessageBody>,
}

#[derive(Debug, Deserialize)]
struct ChatMessageBody {
    content: Option<String>,
}

pub async fn send_chat_completion(messages: Vec<ChatMessage>) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let body = serde_json::json!({
        "model": "openclaw/default",
        "messages": messages,
        "stream": false
    });

    let mut request = client
        .post(GATEWAY_CHAT_URL)
        .header("Content-Type", "application/json")
        .json(&body);

    if let Some(token) = read_gateway_token() {
        request = request.header("Authorization", format!("Bearer {token}"));
    }

    let response = request.send().await.map_err(|e| e.to_string())?;

    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!(
            "OpenClaw respondió {status}: {}",
            text.chars().take(200).collect::<String>()
        ));
    }

    let parsed: ChatCompletionResponse = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    Ok(parsed
        .choices
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.message)
        .and_then(|m| m.content)
        .unwrap_or_else(|| "(sin respuesta)".to_string()))
}
