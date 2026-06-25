use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

const SETTINGS_FILE: &str = "settings.json";
pub const DEFAULT_MODEL: &str = "openclaw/default";
pub const DEFAULT_THEME: &str = "system";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub selected_model: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub vision_model: Option<String>,
}

fn default_theme() -> String {
    DEFAULT_THEME.to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            selected_model: DEFAULT_MODEL.to_string(),
            theme: DEFAULT_THEME.to_string(),
            vision_model: None,
        }
    }
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver app_data_dir: {e}"))?;
    Ok(dir.join(SETTINGS_FILE))
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let text = fs::read_to_string(&path).map_err(|e| format!("Error leyendo ajustes: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Error parseando ajustes: {e}"))
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = settings_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Error creando directorio de datos: {e}"))?;
    }

    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Error serializando ajustes: {e}"))?;
    fs::write(&path, json).map_err(|e| format!("Error guardando ajustes: {e}"))
}
