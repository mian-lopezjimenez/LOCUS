use crate::chat_cancel::ChatCancelState;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State};

const OPENCLAW_CHAT_URL: &str = "http://127.0.0.1:18789/v1/chat/completions";

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    message: Option<ChatMessage>,
}

#[derive(Debug, Deserialize)]
struct StreamChunk {
    choices: Option<Vec<StreamChoice>>,
}

#[derive(Debug, Deserialize)]
struct StreamChoice {
    delta: Option<StreamDelta>,
}

#[derive(Debug, Deserialize)]
struct StreamDelta {
    content: Option<String>,
}

fn openclaw_config_path() -> Option<PathBuf> {
  let home = std::env::var("USERPROFILE")
    .or_else(|_| std::env::var("HOME"))
    .ok()?;
  Some(
    PathBuf::from(home)
      .join(".openclaw")
      .join("openclaw.json"),
  )
}

fn read_gateway_token() -> Option<String> {
  let path = openclaw_config_path()?;
  let text = fs::read_to_string(path).ok()?;
  let json: serde_json::Value = serde_json::from_str(&text).ok()?;
  json
    .pointer("/gateway/auth/token")
    .and_then(|v| v.as_str())
    .map(|s| s.to_string())
}

fn build_request(
  messages: &[ChatMessage],
  model: &str,
  stream: bool,
) -> serde_json::Value {
  serde_json::json!({
    "model": model,
    "messages": messages,
    "stream": stream,
  })
}

fn auth_header() -> Option<String> {
  read_gateway_token().map(|token| format!("Bearer {token}"))
}

async fn send_non_streaming(
  client: &reqwest::Client,
  messages: &[ChatMessage],
  model: &str,
) -> Result<String, String> {
  let mut request = client
    .post(OPENCLAW_CHAT_URL)
    .json(&build_request(messages, model, false));

  if let Some(auth) = auth_header() {
    request = request.header("Authorization", auth);
  }

  let response = request
    .send()
    .await
    .map_err(|e| format!("No se pudo contactar con OpenClaw: {e}"))?;

  if !response.status().is_success() {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    return Err(format!("OpenClaw respondió {status}: {body}"));
  }

  let parsed: ChatCompletionResponse = response
    .json()
    .await
    .map_err(|e| format!("Respuesta inválida de OpenClaw: {e}"))?;

  let content = parsed
    .choices
    .and_then(|choices| choices.into_iter().next())
    .and_then(|choice| choice.message)
    .map(|message| message.content)
    .unwrap_or_default();

  Ok(content)
}

fn parse_sse_data(line: &str) -> Option<String> {
  let data = line.strip_prefix("data:")?.trim();
  if data == "[DONE]" {
    return None;
  }

  let chunk: StreamChunk = serde_json::from_str(data).ok()?;
  chunk
    .choices?
    .into_iter()
    .next()?
    .delta?
    .content
}

async fn send_streaming(
  app: &AppHandle,
  cancel: &ChatCancelState,
  client: &reqwest::Client,
  messages: &[ChatMessage],
  model: &str,
) -> Result<String, String> {
  let mut request = client
    .post(OPENCLAW_CHAT_URL)
    .json(&build_request(messages, model, true));

  if let Some(auth) = auth_header() {
    request = request.header("Authorization", auth);
  }

  let response = request
    .send()
    .await
    .map_err(|e| format!("No se pudo contactar con OpenClaw: {e}"))?;

  if !response.status().is_success() {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    return Err(format!("OpenClaw respondió {status}: {body}"));
  }

  let mut stream = response.bytes_stream();
  let mut buffer = String::new();
  let mut full_content = String::new();

  while let Some(chunk_result) = stream.next().await {
    if cancel.is_cancelled() {
      let _ = app.emit("chat:cancelled", ());
      return Ok(full_content);
    }

    let chunk = chunk_result.map_err(|e| format!("Error leyendo stream: {e}"))?;
    buffer.push_str(&String::from_utf8_lossy(&chunk));

    while let Some(pos) = buffer.find('\n') {
      let line = buffer[..pos].trim_end_matches('\r').to_string();
      buffer = buffer[pos + 1..].to_string();

      if line.is_empty() || line.starts_with(':') {
        continue;
      }

      if let Some(delta) = parse_sse_data(&line) {
        full_content.push_str(&delta);
        let _ = app.emit("chat:chunk", delta);
      }
    }
  }

  Ok(full_content)
}

#[tauri::command]
pub async fn send_chat_message(
  messages: Vec<ChatMessage>,
  model: String,
) -> Result<String, String> {
  let client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(120))
    .build()
    .map_err(|e| e.to_string())?;

  send_non_streaming(&client, &messages, &model).await
}

#[tauri::command]
pub async fn send_chat_message_stream(
  app: AppHandle,
  cancel_state: State<'_, ChatCancelState>,
  messages: Vec<ChatMessage>,
  model: String,
) -> Result<String, String> {
  cancel_state.reset();

  let client = reqwest::Client::builder()
    .timeout(std::time::Duration::from_secs(120))
    .build()
    .map_err(|e| e.to_string())?;

  let result = send_streaming(&app, &cancel_state, &client, &messages, &model).await;

  if cancel_state.is_cancelled() {
    return result;
  }

  match &result {
    Ok(_) if !cancel_state.is_cancelled() => {
      let _ = app.emit("chat:done", ());
    }
    Err(message) => {
      let _ = app.emit("chat:error", message.clone());
    }
    _ => {}
  }

  result
}
