import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "@/types/settings";

export async function loadSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("load_settings");
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await invoke("save_settings", { settings });
}
