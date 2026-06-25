use serde::Deserialize;

const OLLAMA_TAGS_URL: &str = "http://127.0.0.1:11434/api/tags";
const OPENCLAW_MODELS_URL: &str = "http://127.0.0.1:18789/v1/models";

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
}

#[derive(Debug, Deserialize)]
struct OpenClawModelsResponse {
    data: Option<Vec<OpenClawModelEntry>>,
}

#[derive(Debug, Deserialize)]
struct OpenClawModelEntry {
    id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub label: String,
    pub supports_vision: bool,
}

pub fn model_supports_vision(name: &str) -> bool {
    let lower = name.to_lowercase();
    ["llava", "moondream", "vision", "vl", "bakllava", "minicpm-v"]
        .iter()
        .any(|hint| lower.contains(hint))
}

fn openclaw_agent_label(id: &str) -> String {
    if id == "openclaw/default" {
        return "OpenClaw (predeterminado)".to_string();
    }
    if let Some(agent) = id.strip_prefix("openclaw/") {
        return format!("Agente {agent}");
    }
    id.to_string()
}

#[tauri::command]
pub async fn list_chat_models() -> Result<Vec<ModelInfo>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let mut models = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    if let Ok(resp) = client.get(OPENCLAW_MODELS_URL).send().await {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<OpenClawModelsResponse>().await {
                if let Some(entries) = parsed.data {
                    for entry in entries {
                        if seen_ids.insert(entry.id.clone()) {
                            models.push(ModelInfo {
                                id: entry.id.clone(),
                                label: openclaw_agent_label(&entry.id),
                                supports_vision: false,
                            });
                        }
                    }
                }
            }
        }
    }

    if models.is_empty() {
        let default_id = crate::settings::DEFAULT_MODEL.to_string();
        seen_ids.insert(default_id.clone());
        models.push(ModelInfo {
            id: default_id,
            label: "OpenClaw (predeterminado)".to_string(),
            supports_vision: false,
        });
    }

    if let Ok(resp) = client.get(OLLAMA_TAGS_URL).send().await {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<OllamaTagsResponse>().await {
                if let Some(items) = parsed.models {
                    for item in items {
                        let id = format!("ollama:{}", item.name);
                        if seen_ids.insert(id.clone()) {
                            models.push(ModelInfo {
                                label: item.name.clone(),
                                supports_vision: model_supports_vision(&item.name),
                                id,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(models)
}
