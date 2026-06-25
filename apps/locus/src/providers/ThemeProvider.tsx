import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyThemeClass, resolveTheme, systemResolvedTheme } from "@/lib/theme";
import { loadSettings, saveSettings } from "@/services/settings";
import type { ResolvedTheme, ThemePreference } from "@/types/settings";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>(systemResolvedTheme());

  useEffect(() => {
    void loadSettings().then((settings) => {
      const next = settings.theme ?? "system";
      setPreferenceState(next);
      const resolvedTheme = resolveTheme(next);
      setResolved(resolvedTheme);
      applyThemeClass(resolvedTheme);
    });
  }, []);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = systemResolvedTheme();
      setResolved(next);
      applyThemeClass(next);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    const resolvedTheme = resolveTheme(next);
    setPreferenceState(next);
    setResolved(resolvedTheme);
    applyThemeClass(resolvedTheme);
    void saveSettings({ theme: next });
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}
