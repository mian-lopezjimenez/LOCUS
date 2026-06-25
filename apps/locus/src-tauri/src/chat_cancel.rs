use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::State;

#[derive(Clone, Default)]
pub struct ChatCancelState {
    pub cancel: Arc<AtomicBool>,
}

impl ChatCancelState {
    pub fn reset(&self) {
        self.cancel.store(false, Ordering::Relaxed);
    }

    pub fn request_cancel(&self) {
        self.cancel.store(true, Ordering::Relaxed);
    }

    pub fn is_cancelled(&self) -> bool {
        self.cancel.load(Ordering::Relaxed)
    }
}

#[tauri::command]
pub fn cancel_chat_generation(state: State<'_, ChatCancelState>) {
    state.request_cancel();
}
