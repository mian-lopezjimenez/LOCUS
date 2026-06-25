import { Monitor, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/providers/ThemeProvider";
import type { ThemePreference } from "@/types/settings";

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: React.ReactNode;
}> = [
  { value: "system", label: "Sistema", icon: <Monitor className="size-3.5" /> },
  { value: "light", label: "Claro", icon: <Sun className="size-3.5" /> },
  { value: "dark", label: "Oscuro", icon: <Moon className="size-3.5" /> },
];

export function ThemeSelect() {
  const { preference, setPreference } = useTheme();

  return (
    <Select
      value={preference}
      onValueChange={(value) => setPreference(value as ThemePreference)}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-[108px] border-border bg-secondary text-xs"
        aria-label="Tema de la interfaz"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              {option.icon}
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
