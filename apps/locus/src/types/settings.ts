export type ThemePreference = "system" | "light" | "dark";

export type ResolvedTheme = "light" | "dark";

export type AppSettings = {
  selectedModel: string;
  theme: ThemePreference;
};
