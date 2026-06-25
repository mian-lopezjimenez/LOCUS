import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "@/types/settings";

const DEFAULT_SETTINGS: AppSettings = {
  selectedModel: "openclaw/default",
  theme: "system",
};

export async function loadSettings(): Promise<AppSettings> {
  const settings = await invoke<Partial<AppSettings>>("load_settings");
  return { ...DEFAULT_SETTINGS, ...settings };
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = await loadSettings();
  await invoke("save_settings", {
    settings: { ...current, ...partial },
  });
}
