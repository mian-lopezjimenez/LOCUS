use tauri::{AppHandle, Emitter, LogicalPosition, Manager, Position, WebviewWindow};

const SPOTLIGHT_LABEL: &str = "spotlight";
const TOP_OFFSET: f64 = 48.0;

pub fn toggle(app: &AppHandle) {
    let Some(window) = app.get_webview_window(SPOTLIGHT_LABEL) else {
        eprintln!("LOCUS: ventana spotlight no encontrada");
        return;
    };

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }

    position_top_center(&window);
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit("spotlight:focus", ());
}

fn position_top_center(window: &WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };

    let monitor_size = monitor.size();
    let scale = monitor.scale_factor();
    let win_size = window
        .outer_size()
        .unwrap_or(tauri::PhysicalSize::new(640, 120));

    let x = ((monitor_size.width as f64 / scale) - (win_size.width as f64 / scale)) / 2.0;
    let _ = window.set_position(Position::Logical(LogicalPosition::new(x, TOP_OFFSET)));
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
