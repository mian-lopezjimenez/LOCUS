use tauri::{AppHandle, Emitter, Manager};

const SPOTLIGHT_LABEL: &str = "spotlight";

pub fn toggle(app: &AppHandle) {
    let Some(window) = app.get_webview_window(SPOTLIGHT_LABEL) else {
        eprintln!("LOCUS: ventana spotlight no encontrada");
        return;
    };

    if window.is_visible().unwrap_or(false) {
        let _ = window.emit("spotlight:close", ());
        return;
    }

    let _ = window.emit("spotlight:open", ());
}

pub fn read_gateway_token() -> Option<String> {
    if let Ok(token) = std::env::var("OPENCLAW_GATEWAY_TOKEN") {
        if !token.is_empty() {
            return Some(token);
        }
    }

    let home = std::env::var("USERPROFILE")
        .ok()
        .or_else(|| std::env::var("HOME").ok())?;
    let path = std::path::PathBuf::from(home).join(".openclaw/openclaw.json");
    let text = std::fs::read_to_string(path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&text).ok()?;

    json.get("gateway")
        .and_then(|g| g.get("auth"))
        .and_then(|a| a.get("token"))
        .and_then(|t| t.as_str())
        .map(str::to_string)
}
