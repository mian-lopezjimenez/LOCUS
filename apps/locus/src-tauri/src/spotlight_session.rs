use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;
use uuid::Uuid;

const STORE_FILE: &str = "spotlight-store.json";
const LEGACY_SESSION_FILE: &str = "spotlight-session.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredTurn {
    pub id: String,
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub messages: Vec<StoredTurn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpotlightStore {
    pub active_conversation_id: String,
    pub conversations: Vec<Conversation>,
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo resolver app_data_dir: {e}"))
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join(STORE_FILE))
}

fn legacy_session_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join(LEGACY_SESSION_FILE))
}

fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

fn title_from_messages(messages: &[StoredTurn]) -> String {
    messages
        .iter()
        .find(|m| m.role == "user")
        .map(|m| m.content.trim())
        .filter(|text| !text.is_empty())
        .map(|text| {
            let collapsed = text.replace('\n', " ");
            if collapsed.chars().count() > 48 {
                let truncated: String = collapsed.chars().take(45).collect();
                format!("{truncated}…")
            } else {
                collapsed
            }
        })
        .unwrap_or_else(|| "Nueva conversación".to_string())
}

pub fn empty_conversation() -> Conversation {
    let id = Uuid::new_v4().to_string();
    let timestamp = now_iso();
    Conversation {
        id: id.clone(),
        title: "Nueva conversación".to_string(),
        created_at: timestamp.clone(),
        updated_at: timestamp,
        messages: Vec::new(),
    }
}

fn default_store() -> SpotlightStore {
    let conversation = empty_conversation();
    let id = conversation.id.clone();
    SpotlightStore {
        active_conversation_id: id,
        conversations: vec![conversation],
    }
}

fn read_store_file(path: &PathBuf) -> Result<SpotlightStore, String> {
    let text = fs::read_to_string(path).map_err(|e| format!("Error leyendo almacén: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("Error parseando almacén: {e}"))
}

fn write_store_file(path: &PathBuf, store: &SpotlightStore) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Error creando directorio de datos: {e}"))?;
    }

    let json = serde_json::to_string_pretty(store)
        .map_err(|e| format!("Error serializando almacén: {e}"))?;
    fs::write(path, json).map_err(|e| format!("Error guardando almacén: {e}"))
}

fn migrate_legacy_session(app: &AppHandle) -> Result<Option<SpotlightStore>, String> {
    let legacy_path = legacy_session_path(app)?;
    if !legacy_path.exists() {
        return Ok(None);
    }

    let text =
        fs::read_to_string(&legacy_path).map_err(|e| format!("Error leyendo sesión legacy: {e}"))?;
    if text.trim().is_empty() {
        return Ok(None);
    }

    let messages: Vec<StoredTurn> =
        serde_json::from_str(&text).map_err(|e| format!("Error parseando sesión legacy: {e}"))?;

    if messages.is_empty() {
        return Ok(None);
    }

    let id = Uuid::new_v4().to_string();
    let timestamp = now_iso();
    let title = title_from_messages(&messages);
    let store = SpotlightStore {
        active_conversation_id: id.clone(),
        conversations: vec![Conversation {
            id,
            title,
            created_at: timestamp.clone(),
            updated_at: timestamp,
            messages,
        }],
    };

    Ok(Some(store))
}

fn normalize_store(mut store: SpotlightStore) -> SpotlightStore {
    if store.conversations.is_empty() {
        return default_store();
    }

    if !store
        .conversations
        .iter()
        .any(|c| c.id == store.active_conversation_id)
    {
        store.active_conversation_id = store.conversations[0].id.clone();
    }

    store
}

fn load_or_init_store(app: &AppHandle) -> Result<SpotlightStore, String> {
    let path = store_path(app)?;
    if path.exists() {
        return Ok(normalize_store(read_store_file(&path)?));
    }

    if let Some(migrated) = migrate_legacy_session(app)? {
        write_store_file(&path, &migrated)?;
        return Ok(migrated);
    }

    let store = default_store();
    write_store_file(&path, &store)?;
    Ok(store)
}

fn save_store(app: &AppHandle, store: SpotlightStore) -> Result<SpotlightStore, String> {
    let normalized = normalize_store(store);
    write_store_file(&store_path(app)?, &normalized)?;
    Ok(normalized)
}

#[tauri::command]
pub fn load_spotlight_store(app: AppHandle) -> Result<SpotlightStore, String> {
    load_or_init_store(&app)
}

#[tauri::command]
pub fn save_spotlight_store(app: AppHandle, store: SpotlightStore) -> Result<SpotlightStore, String> {
    save_store(&app, store)
}

#[tauri::command]
pub fn upsert_conversation(
    app: AppHandle,
    conversation: Conversation,
) -> Result<SpotlightStore, String> {
    let mut store = load_or_init_store(&app)?;
    let mut updated = conversation;

    if updated.title.trim().is_empty() || updated.title == "Nueva conversación" {
        let derived = title_from_messages(&updated.messages);
        if derived != "Nueva conversación" {
            updated.title = derived;
        }
    }

    updated.updated_at = now_iso();

    if let Some(existing) = store.conversations.iter_mut().find(|c| c.id == updated.id) {
        *existing = updated;
    } else {
        store.conversations.push(updated);
    }

    store.conversations.sort_by(|a, b| {
        let a_time = DateTime::parse_from_rfc3339(&a.updated_at).ok();
        let b_time = DateTime::parse_from_rfc3339(&b.updated_at).ok();
        b_time.cmp(&a_time)
    });

    store.active_conversation_id = store
        .conversations
        .iter()
        .find(|c| c.id == store.active_conversation_id)
        .map(|c| c.id.clone())
        .unwrap_or_else(|| store.conversations[0].id.clone());

    save_store(&app, store)
}

#[tauri::command]
pub fn create_conversation(app: AppHandle) -> Result<SpotlightStore, String> {
    let mut store = load_or_init_store(&app)?;
    let conversation = empty_conversation();
    store.active_conversation_id = conversation.id.clone();
    store.conversations.insert(0, conversation);
    save_store(&app, store)
}

#[tauri::command]
pub fn set_active_conversation(app: AppHandle, conversation_id: String) -> Result<SpotlightStore, String> {
    let mut store = load_or_init_store(&app)?;
    if !store
        .conversations
        .iter()
        .any(|c| c.id == conversation_id)
    {
        return Err("Conversación no encontrada".to_string());
    }
    store.active_conversation_id = conversation_id;
    save_store(&app, store)
}

#[tauri::command]
pub fn delete_conversation(app: AppHandle, conversation_id: String) -> Result<SpotlightStore, String> {
    let mut store = load_or_init_store(&app)?;

    if store.conversations.len() <= 1 {
        let fresh = empty_conversation();
        store.active_conversation_id = fresh.id.clone();
        store.conversations = vec![fresh];
        return save_store(&app, store);
    }

    store.conversations.retain(|c| c.id != conversation_id);

    if store.active_conversation_id == conversation_id {
        store.active_conversation_id = store.conversations[0].id.clone();
    }

    save_store(&app, store)
}

// Compatibilidad con llamadas antiguas del frontend (si quedan referencias)
#[tauri::command]
pub fn load_spotlight_session(app: AppHandle) -> Result<Vec<StoredTurn>, String> {
    let store = load_or_init_store(&app)?;
    Ok(store
        .conversations
        .iter()
        .find(|c| c.id == store.active_conversation_id)
        .map(|c| c.messages.clone())
        .unwrap_or_default())
}

#[tauri::command]
pub fn save_spotlight_session(app: AppHandle, messages: Vec<StoredTurn>) -> Result<(), String> {
    let mut store = load_or_init_store(&app)?;
    let active_id = store.active_conversation_id.clone();

    if let Some(conversation) = store.conversations.iter_mut().find(|c| c.id == active_id) {
        conversation.messages = messages;
        if conversation.title == "Nueva conversación" {
            conversation.title = title_from_messages(&conversation.messages);
        }
        conversation.updated_at = now_iso();
    }

    save_store(&app, store)?;
    Ok(())
}
