use base64::{engine::general_purpose::STANDARD, Engine};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const MAX_TEXT_BYTES: usize = 512_000;
const MAX_IMAGE_BYTES: usize = 8_000_000;

const TEXT_EXTENSIONS: &[&str] = &[
    "txt", "md", "py", "json", "js", "ts", "tsx", "jsx", "rs", "go", "java", "c", "cpp", "h",
    "css", "html", "xml", "yaml", "yml", "toml", "sh", "sql", "csv", "rb", "php", "swift", "kt",
];

const IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "gif"];

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadTextAttachmentResult {
    pub name: String,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadImageAttachmentResult {
    pub name: String,
    pub mime_type: String,
    pub data_url: String,
    pub size_bytes: usize,
}

fn extension_of(path: &str) -> Option<String> {
    Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
}

fn mime_for_extension(ext: &str) -> &'static str {
    match ext {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    }
}

fn file_name_of(path: &str, fallback: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(fallback)
        .to_string()
}

fn attachments_root(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver app_data_dir: {e}"))?
        .join("attachments");
    fs::create_dir_all(&dir).map_err(|e| format!("No se pudo crear carpeta de adjuntos: {e}"))?;
    Ok(dir)
}

fn sanitize_filename(name: &str) -> String {
    let mut safe = String::with_capacity(name.len());
    for ch in name.chars() {
        if ch.is_alphanumeric() || matches!(ch, '.' | '-' | '_') {
            safe.push(ch);
        } else {
            safe.push('_');
        }
    }
    if safe.is_empty() {
        "archivo".to_string()
    } else {
        safe
    }
}

fn decode_data_url(data_url: &str) -> Result<Vec<u8>, String> {
    let base64_part = data_url
        .split_once(',')
        .map(|(_, data)| data)
        .ok_or("Data URL inválida")?;
    STANDARD
        .decode(base64_part)
        .map_err(|e| format!("No se pudo decodificar la imagen: {e}"))
}

#[tauri::command]
pub async fn read_text_attachment(path: String) -> Result<ReadTextAttachmentResult, String> {
    let ext = extension_of(&path).ok_or("Archivo sin extensión")?;
    if !TEXT_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!("Extensión .{ext} no soportada para texto"));
    }

    let bytes = fs::read(&path).map_err(|e| format!("No se pudo leer el archivo: {e}"))?;
    if bytes.len() > MAX_TEXT_BYTES {
        return Err(format!(
            "El archivo supera el límite de {} KB",
            MAX_TEXT_BYTES / 1024
        ));
    }

    let content = String::from_utf8(bytes)
        .map_err(|_| "El archivo no es texto UTF-8 válido".to_string())?;

    Ok(ReadTextAttachmentResult {
        name: file_name_of(&path, "archivo.txt"),
        content,
    })
}

#[tauri::command]
pub async fn read_image_attachment(path: String) -> Result<ReadImageAttachmentResult, String> {
    let ext = extension_of(&path).ok_or("Archivo sin extensión")?;
    if !IMAGE_EXTENSIONS.contains(&ext.as_str()) {
        return Err(format!("Extensión .{ext} no soportada para imagen"));
    }

    let bytes = fs::read(&path).map_err(|e| format!("No se pudo leer la imagen: {e}"))?;
    let size_bytes = bytes.len();
    if size_bytes > MAX_IMAGE_BYTES {
        return Err(format!(
            "La imagen supera el límite de {} MB",
            MAX_IMAGE_BYTES / 1_000_000
        ));
    }

    let mime_type = mime_for_extension(&ext).to_string();
    let data_url = format!("data:{mime_type};base64,{}", STANDARD.encode(&bytes));

    Ok(ReadImageAttachmentResult {
        name: file_name_of(&path, "imagen.png"),
        mime_type,
        data_url,
        size_bytes,
    })
}

#[tauri::command]
pub async fn persist_image_attachment(
    app: AppHandle,
    conversation_id: String,
    message_id: String,
    name: String,
    mime_type: String,
    data_url: String,
) -> Result<String, String> {
    let bytes = decode_data_url(&data_url)?;
    if bytes.len() > MAX_IMAGE_BYTES {
        return Err(format!(
            "La imagen supera el límite de {} MB",
            MAX_IMAGE_BYTES / 1_000_000
        ));
    }

    let safe_name = sanitize_filename(&name);
    let ext = extension_of(&safe_name).unwrap_or_else(|| {
        mime_type
            .strip_prefix("image/")
            .unwrap_or("png")
            .to_string()
    });
    let file_name = if extension_of(&safe_name).is_some() {
        safe_name
    } else {
        format!("{safe_name}.{ext}")
    };

    let dir = attachments_root(&app)?
        .join(&conversation_id)
        .join(&message_id);
    fs::create_dir_all(&dir).map_err(|e| format!("No se pudo guardar la imagen: {e}"))?;

    let file_path = dir.join(&file_name);
    fs::write(&file_path, bytes).map_err(|e| format!("No se pudo guardar la imagen: {e}"))?;

    Ok(format!("{conversation_id}/{message_id}/{file_name}"))
}

#[tauri::command]
pub async fn load_image_data_url(app: AppHandle, relative_path: String) -> Result<String, String> {
    let path = attachments_root(&app)?.join(&relative_path);
    let bytes = fs::read(&path).map_err(|e| format!("No se pudo cargar la imagen: {e}"))?;
    let ext = extension_of(&relative_path).unwrap_or_else(|| "png".to_string());
    let mime = mime_for_extension(&ext);
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(&bytes)))
}
