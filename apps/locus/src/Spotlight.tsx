import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect, useRef, useState } from "react";
import "./Spotlight.css";

export function Spotlight() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hide = useCallback(async () => {
    setQuery("");
    setResponse(null);
    setError(null);
    await getCurrentWindow().hide();
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    focusInput();
    const unlisten = listen("spotlight:focus", () => focusInput());
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [focusInput]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void hide();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hide]);

  const submit = async () => {
    const text = query.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const answer = await invoke<string>("send_chat_message", {
        messages: [
          {
            role: "system",
            content:
              "Eres LOCUS, un asistente personal en castellano de España. Responde de forma clara y concisa.",
          },
          { role: "user", content: text },
        ],
      });
      setResponse(answer || "(sin respuesta)");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al contactar con OpenClaw";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const openFullView = async () => {
    const main = await WebviewWindow.getByLabel("main");
    await main?.show();
    await main?.setFocus();
    await hide();
  };

  return (
    <div className="spotlight-root">
      <div className="spotlight-bar">
        <input
          ref={inputRef}
          className="spotlight-input"
          type="text"
          placeholder="Pregunta a LOCUS…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          disabled={loading}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className="spotlight-btn spotlight-btn--icon"
          title="Modo completo (Fase 3)"
          onClick={() => void openFullView()}
          aria-label="Abrir modo completo"
        >
          ⤢
        </button>
        <button
          type="button"
          className="spotlight-btn spotlight-btn--send"
          onClick={() => void submit()}
          disabled={loading || !query.trim()}
        >
          {loading ? "…" : "→"}
        </button>
      </div>

      {(loading || response || error) && (
        <div className="spotlight-response">
          {loading && <p className="spotlight-response__loading">Pensando…</p>}
          {error && <p className="spotlight-response__error">{error}</p>}
          {response && <p className="spotlight-response__text">{response}</p>}
        </div>
      )}
    </div>
  );
}
