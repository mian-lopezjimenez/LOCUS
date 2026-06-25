use std::fs;

#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("Ruta de archivo vacía".to_string());
    }

    if let Some(parent) = std::path::Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("No se pudo crear la carpeta: {e}"))?;
        }
    }

    fs::write(&path, contents).map_err(|e| format!("No se pudo guardar el archivo: {e}"))
}
