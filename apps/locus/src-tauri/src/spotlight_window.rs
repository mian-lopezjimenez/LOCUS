use crate::openclaw_config::read_gateway_token as read_config_token;
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
    read_config_token()
}
