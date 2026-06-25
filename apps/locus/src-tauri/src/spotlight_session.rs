use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

const SESSION_FILE: &str = "spotlight-session.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredTurn {
    pub id: String,
    pub role: String,
    pub content: String,
}

fn session_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver app_data_dir: {e}"))?;
    Ok(dir.join(SESSION_FILE))
}

#[tauri::command]
pub fn load_spotlight_session(app: AppHandle) -> Result<Vec<StoredTurn>, String> {
    let path = session_path(&app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let text = fs::read_to_string(&path).map_err(|e| format!("Error leyendo sesión: {e}"))?;
    if text.trim().is_empty() {
        return Ok(Vec::new());
    }

    serde_json::from_str(&text).map_err(|e| format!("Error parseando sesión: {e}"))
}

#[tauri::command]
pub fn save_spotlight_session(app: AppHandle, messages: Vec<StoredTurn>) -> Result<(), String> {
    let path = session_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Error creando directorio de datos: {e}"))?;
    }

    let json = serde_json::to_string_pretty(&messages)
        .map_err(|e| format!("Error serializando sesión: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Error guardando sesión: {e}"))
}
