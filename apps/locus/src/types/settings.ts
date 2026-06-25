export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export type AppSettings = {
  selectedModel: string;
  theme: ThemePreference;
  /** Modelo Ollama para analizar imágenes cuando el chat no tiene visión. */
  visionModel?: string;
};
