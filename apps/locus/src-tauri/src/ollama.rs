use serde::Deserialize;

const OLLAMA_TAGS_URL: &str = "http://127.0.0.1:11434/api/tags";

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
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

#[tauri::command]
pub async fn list_chat_models() -> Result<Vec<ModelInfo>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let mut models = vec![ModelInfo {
        id: crate::settings::DEFAULT_MODEL.to_string(),
        label: "OpenClaw (predeterminado)".to_string(),
        supports_vision: false,
    }];

    let response = client.get(OLLAMA_TAGS_URL).send().await;

    if let Ok(resp) = response {
        if resp.status().is_success() {
            if let Ok(parsed) = resp.json::<OllamaTagsResponse>().await {
                if let Some(items) = parsed.models {
                    for item in items {
                        models.push(ModelInfo {
                            label: item.name.clone(),
                            supports_vision: model_supports_vision(&item.name),
                            id: item.name,
                        });
                    }
                }
            }
        }
    }

    Ok(models)
}
