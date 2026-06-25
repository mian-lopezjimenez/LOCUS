use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

pub fn config_path() -> Option<PathBuf> {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()?;
    Some(PathBuf::from(home).join(".openclaw").join("openclaw.json"))
}

pub fn read_config_json() -> Option<serde_json::Value> {
    let path = config_path()?;
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn read_gateway_token() -> Option<String> {
    if let Ok(token) = std::env::var("OPENCLAW_GATEWAY_TOKEN") {
        if !token.is_empty() {
            return Some(token);
        }
    }

    read_config_json()?
        .pointer("/gateway/auth/token")
        .and_then(|value| value.as_str())
        .map(str::to_string)
}

/// Nombres Ollama permitidos por el agente (sin prefijo `ollama/`).
pub fn allowed_ollama_model_names() -> HashSet<String> {
    let Some(json) = read_config_json() else {
        return HashSet::new();
    };

    let mut allowed = HashSet::new();

    if let Some(models) = json
        .pointer("/agents/defaults/models")
        .and_then(|value| value.as_object())
    {
        for key in models.keys() {
            if let Some(name) = key.strip_prefix("ollama/") {
                allowed.insert(name.to_string());
            }
        }
    }

    if allowed.is_empty() {
        if let Some(entries) = json
            .pointer("/models/providers/ollama/models")
            .and_then(|value| value.as_array())
        {
            for entry in entries {
                if let Some(id) = entry.get("id").and_then(|value| value.as_str()) {
                    allowed.insert(id.to_string());
                }
            }
        }
    }

    allowed
}

pub fn ollama_model_allowed(ollama_name: &str) -> bool {
    let allowed = allowed_ollama_model_names();
    allowed.is_empty() || allowed.contains(ollama_name)
}

pub fn validate_model_selection(selection: &str) -> Result<(), String> {
    if selection == "openclaw" || selection.starts_with("openclaw/") {
        return Ok(());
    }

    let ollama_name = selection
        .strip_prefix("ollama:")
        .unwrap_or(selection);

    if ollama_model_allowed(ollama_name) {
        return Ok(());
    }

    Err(format!(
        "El modelo «{ollama_name}» no está permitido en OpenClaw. Añádelo al allowlist del agente con:\nopenclaw config set agents.defaults.models.\"ollama/{ollama_name}\" '{{}}' --merge"
    ))
}
