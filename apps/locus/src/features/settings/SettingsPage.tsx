import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeSetting } from "@/features/settings/ThemeSetting";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROUTES } from "@/lib/routes";

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Volver al chat"
          onClick={() => navigate(ROUTES.chat)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-sm font-medium">Ajustes</h1>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-medium">Apariencia</h2>
              <p className="text-xs text-muted-foreground">
                Elige cómo se muestra LOCUS en este equipo.
              </p>
            </div>
            <ThemeSetting />
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
