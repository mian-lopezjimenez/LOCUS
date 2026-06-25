import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/ThemeProvider";
import type { ThemePreference } from "@/types/settings";

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "system",
    label: "Sistema",
    description: "Sigue el tema del sistema operativo",
    icon: <Monitor className="size-4" />,
  },
  {
    value: "light",
    label: "Claro",
    description: "Interfaz con fondo claro",
    icon: <Sun className="size-4" />,
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Interfaz con fondo oscuro",
    icon: <Moon className="size-4" />,
  },
];

export function ThemeSetting() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Tema de la interfaz</legend>
      {OPTIONS.map((option) => {
        const selected = preference === option.value;

        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
              selected
                ? "border-primary/40 bg-primary/10"
                : "border-border hover:bg-muted/50",
            )}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={selected}
              onChange={() => setPreference(option.value)}
              className="sr-only"
            />
            <span
              className={cn(
                "mt-0.5 text-muted-foreground",
                selected && "text-primary",
              )}
            >
              {option.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
