mod supervisor;

use supervisor::get_service_health;
use tauri::{Emitter, Manager};

#[tauri::command]
async fn get_service_status() -> supervisor::ServiceHealth {
    get_service_health().await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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

                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }

                            let shortcut_str = shortcut.to_string().to_lowercase();
                            if shortcut_str.contains('l') {
                                let _ = handle.emit("locus:toggle-spotlight", ());
                            } else if shortcut_str.contains('v') {
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
        .invoke_handler(tauri::generate_handler![get_service_status])
        .run(tauri::generate_context!())
        .expect("error al ejecutar LOCUS");
}
