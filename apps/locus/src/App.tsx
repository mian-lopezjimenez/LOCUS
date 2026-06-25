import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import type { ServiceHealth } from "@locus/shared";
import "./App.css";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`status-dot ${ok ? "status-dot--ok" : "status-dot--err"}`}
      aria-hidden
    />
  );
}

function App() {
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastShortcut, setLastShortcut] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const status = await invoke<ServiceHealth>("get_service_status");
      setHealth(status);
    } catch (error) {
      console.error(error);
      setHealth({ ollama: false, openclaw: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const unlistenVoice = listen("locus:toggle-voice", () => {
      setLastShortcut("Modo voz (Ctrl+Alt+V) — Fase 6");
    });

    return () => {
      void unlistenVoice.then((fn) => fn());
    };
  }, []);

  return (
    <main className="app">
      <header className="app__header">
        <h1>LOCUS</h1>
        <p className="app__subtitle">Fase 1 — fundación</p>
      </header>

      <section className="card">
        <h2>Estado de servicios</h2>
        {loading && !health ? (
          <p className="muted">Comprobando…</p>
        ) : (
          <ul className="status-list">
            <li>
              <StatusDot ok={health?.ollama ?? false} />
              <span>Ollama</span>
              <span className="muted">
                {health?.ollama
                  ? "activo"
                  : health?.ollamaError ?? "no responde"}
              </span>
            </li>
            <li>
              <StatusDot ok={health?.openclaw ?? false} />
              <span>OpenClaw Gateway</span>
              <span className="muted">
                {health?.openclaw
                  ? "activo"
                  : health?.openclawError ?? "no responde"}
              </span>
            </li>
          </ul>
        )}
        <button type="button" className="btn" onClick={() => void refresh()}>
          Actualizar
        </button>
      </section>

      {lastShortcut && (
        <p className="shortcut-hint">Atajo detectado: {lastShortcut}</p>
      )}

      <footer className="app__footer muted">
        Atajos: Ctrl+Alt+L (barra) · Ctrl+Alt+V (voz)
      </footer>
    </main>
  );
}

export default App;
