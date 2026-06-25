use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceHealth {
    pub ollama: bool,
    pub openclaw: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ollama_error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub openclaw_error: Option<String>,
}

pub async fn check_ollama() -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    client
        .get("http://127.0.0.1:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub async fn check_openclaw() -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get("http://127.0.0.1:18789/v1/models")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    // Gateway up: 200 OK or 401 without token
    if response.status().is_success() || response.status().as_u16() == 401 {
        return Ok(());
    }

    Err(format!("OpenClaw respondió {}", response.status()))
}

pub async fn get_service_health() -> ServiceHealth {
    let ollama = check_ollama().await;
    let openclaw = check_openclaw().await;

    ServiceHealth {
        ollama: ollama.is_ok(),
        openclaw: openclaw.is_ok(),
        ollama_error: ollama.err(),
        openclaw_error: openclaw.err(),
    }
}
