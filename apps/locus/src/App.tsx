import { useQuery } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type { ServiceHealth } from "@locus/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServiceStatus } from "@/services/health";
import { cn } from "@/lib/utils";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-2.5 rounded-full",
        ok ? "bg-emerald-500" : "bg-destructive",
      )}
      aria-hidden
    />
  );
}

function App() {
  const [lastShortcut, setLastShortcut] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ["service-health"],
    queryFn: getServiceStatus,
    refetchInterval: 10_000,
  });

  const health: ServiceHealth | undefined = healthQuery.data;

  useEffect(() => {
    const unlistenVoice = listen("locus:toggle-voice", () => {
      setLastShortcut("Modo voz (Ctrl+Alt+V) — Fase 6");
    });

    return () => {
      void unlistenVoice.then((fn) => fn());
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-6 p-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">LOCUS</h1>
        <p className="text-sm text-muted-foreground">Fase 1 — fundación</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Estado de servicios</CardTitle>
          <CardDescription>Ollama y OpenClaw Gateway en local</CardDescription>
        </CardHeader>
        <CardContent>
          {healthQuery.isLoading && !health ? (
            <p className="text-sm text-muted-foreground">Comprobando…</p>
          ) : (
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <StatusDot ok={health?.ollama ?? false} />
                <span className="font-medium">Ollama</span>
                <span className="ml-auto text-muted-foreground">
                  {health?.ollama
                    ? "activo"
                    : health?.ollamaError ?? "no responde"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <StatusDot ok={health?.openclaw ?? false} />
                <span className="font-medium">OpenClaw Gateway</span>
                <span className="ml-auto text-muted-foreground">
                  {health?.openclaw
                    ? "activo"
                    : health?.openclawError ?? "no responde"}
                </span>
              </li>
            </ul>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void healthQuery.refetch()}
          >
            Actualizar
          </Button>
        </CardFooter>
      </Card>

      {lastShortcut && (
        <p className="text-sm text-muted-foreground">
          Atajo detectado: {lastShortcut}
        </p>
      )}

      <footer className="mt-auto text-sm text-muted-foreground">
        Atajos: Ctrl+Alt+L (barra) · Ctrl+Alt+V (voz)
      </footer>
    </main>
  );
}

export default App;
