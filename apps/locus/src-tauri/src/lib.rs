mod attachments;
mod chat_cancel;
mod ollama;
mod export;
mod openclaw_config;
mod openclaw_chat;
mod settings;
mod spotlight_session;
mod spotlight_window;
mod supervisor;

use chat_cancel::ChatCancelState;
use spotlight_session::{
    create_conversation, delete_conversation, load_spotlight_session, load_spotlight_store,
    save_spotlight_session, save_spotlight_store, set_active_conversation, upsert_conversation,
};
use spotlight_window::{read_gateway_token, toggle as toggle_spotlight};
use supervisor::get_service_health;
use tauri::{Emitter, Manager};

#[tauri::command]
async fn get_service_status() -> supervisor::ServiceHealth {
    get_service_health().await
}

#[tauri::command]
fn get_gateway_token() -> Option<String> {
    read_gateway_token()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ChatCancelState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::TrayIconBuilder;
                use tauri_plugin_global_shortcut::ShortcutState;

                let handle = app.handle().clone();
                match app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcuts(["ctrl+alt+l", "ctrl+alt+v"])?
                        .with_handler(move |app, shortcut, event| {
                            if event.state != ShortcutState::Pressed {
                                return;
                            }

                            eprintln!("LOCUS: atajo pulsado — {shortcut}");

                            let shortcut_str = shortcut.to_string().to_lowercase();
                            if shortcut_str.contains('l') {
                                toggle_spotlight(app);
                            } else if shortcut_str.contains('v') {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                                let _ = handle.emit("locus:toggle-voice", ());
                            }
                        })
                        .build(),
                ) {
                    Ok(_) => eprintln!("LOCUS: atajos registrados — Ctrl+Alt+L, Ctrl+Alt+V"),
                    Err(e) => eprintln!("LOCUS: error registrando atajos: {e}"),
                }

                let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
                let show = MenuItem::with_id(app, "show", "Mostrar LOCUS", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &quit])?;

                let _tray = TrayIconBuilder::new()
                    .menu(&menu)
                    .tooltip("LOCUS")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_service_status,
            get_gateway_token,
            openclaw_chat::send_chat_message,
            openclaw_chat::send_chat_message_stream,
            chat_cancel::cancel_chat_generation,
            settings::load_settings,
            settings::save_settings,
            ollama::list_chat_models,
            attachments::read_text_attachment,
            attachments::read_image_attachment,
            attachments::read_pdf_attachment,
            attachments::read_pdf_bytes,
            attachments::persist_image_attachment,
            attachments::persist_pdf_attachment,
            attachments::load_image_data_url,
            attachments::load_pdf_bytes,
            export::write_text_file,
            load_spotlight_store,
            save_spotlight_store,
            create_conversation,
            set_active_conversation,
            delete_conversation,
            upsert_conversation,
            load_spotlight_session,
            save_spotlight_session
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar LOCUS");
}
