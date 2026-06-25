import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow, currentMonitor } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect, useRef, useState } from "react";
import { marked } from "marked";
import "./Spotlight.css";

marked.setOptions({ gfm: true, breaks: true });

const SYSTEM_PROMPT =
  "Eres LOCUS, un asistente personal en castellano de España. Responde de forma clara y concisa.";

const SIDEBAR_WIDTH = 420;
const SLIDE_MS = 220;
const DEFAULT_MODEL = "openclaw/default";

type ChatTurn = {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
};

type StoredTurn = {
  id: string;
  role: string;
  content: string;
};

type ModelInfo = {
  id: string;
  label: string;
  supportsVision: boolean;
};

type AppSettings = {
  selectedModel: string;
};

type SidebarBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  offscreenX: number;
};

function newId(): string {
  return crypto.randomUUID();
}

function mapStoredTurns(stored: StoredTurn[]): ChatTurn[] {
  return stored.map((m) => ({
    id: m.id,
    role: m.role as ChatTurn["role"],
    content: m.content,
  }));
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

async function getSidebarBounds(): Promise<SidebarBounds | null> {
  const monitor = await currentMonitor();
  if (!monitor) return null;

  const scale = monitor.scaleFactor;
  const work = monitor.workArea;
  const width = SIDEBAR_WIDTH;
  const height = work.size.height / scale;
  const x = work.position.x / scale + work.size.width / scale - width;
  const y = work.position.y / scale;
  const offscreenX = work.position.x / scale + work.size.width / scale;

  return { x, y, width, height, offscreenX };
}

async function animateWindowX(
  win: ReturnType<typeof getCurrentWindow>,
  fromX: number,
  toX: number,
  y: number,
  durationMs: number,
) {
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const x = fromX + (toX - fromX) * easeOutCubic(t);
      void win.setPosition(new LogicalPosition(x, y));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

async function placeSidebar(
  win: ReturnType<typeof getCurrentWindow>,
  bounds: SidebarBounds,
  x: number,
) {
  await win.setSize(new LogicalSize(bounds.width, bounds.height));
  await win.setPosition(new LogicalPosition(x, bounds.y));
}

function MessageContent({
  role,
  content,
  streaming,
}: {
  role: ChatTurn["role"];
  content: string;
  streaming?: boolean;
}) {
  if (role === "assistant" && !streaming && content) {
    return (
      <div
        className="spotlight-turn__markdown"
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
      />
    );
  }
  return <p className="spotlight-turn__text">{content}</p>;
}

export function Spotlight() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatTurn[]>([]);
  const closingRef = useRef(false);
  const isOpenRef = useRef(false);
  const streamingIdRef = useRef<string | null>(null);
  const streamUnlistenersRef = useRef<Array<() => void>>([]);

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const persistMessages = useCallback(async (turns: ChatTurn[]) => {
    await invoke("save_spotlight_session", {
      messages: turns.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
    });
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const cleanupStreamListeners = useCallback(() => {
    for (const unlisten of streamUnlistenersRef.current) {
      unlisten();
    }
    streamUnlistenersRef.current = [];
  }, []);

  const appendStreamChunk = useCallback((chunk: string) => {
    const id = streamingIdRef.current;
    if (!id) return;

    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m,
      );
      messagesRef.current = updated;
      return updated;
    });
  }, []);

  const openPanel = useCallback(async () => {
    const win = getCurrentWindow();
    const bounds = await getSidebarBounds();
    if (!bounds) return;

    closingRef.current = false;
    await placeSidebar(win, bounds, bounds.offscreenX);
    await win.show();
    await animateWindowX(win, bounds.offscreenX, bounds.x, bounds.y, SLIDE_MS);
    isOpenRef.current = true;
    await win.setFocus();
    focusInput();
  }, [focusInput]);

  const closePanel = useCallback(async () => {
    if (closingRef.current || !isOpenRef.current) return;

    const win = getCurrentWindow();
    const bounds = await getSidebarBounds();
    if (!bounds) {
      await win.hide();
      isOpenRef.current = false;
      return;
    }

    closingRef.current = true;
    await animateWindowX(win, bounds.x, bounds.offscreenX, bounds.y, SLIDE_MS);
    await win.hide();
    isOpenRef.current = false;
    closingRef.current = false;
  }, []);

  useEffect(() => {
    void Promise.all([
      invoke<StoredTurn[]>("load_spotlight_session"),
      invoke<AppSettings>("load_settings"),
      invoke<ModelInfo[]>("list_chat_models"),
    ]).then(([stored, settings, modelList]) => {
      if (stored.length > 0) {
        const turns = mapStoredTurns(stored);
        setMessages(turns);
        messagesRef.current = turns;
      }
      setSelectedModel(settings.selectedModel || DEFAULT_MODEL);
      setModels(modelList);
    });
  }, []);

  useEffect(() => {
    const unlistenOpen = listen("spotlight:open", () => {
      void openPanel();
    });
    const unlistenClose = listen("spotlight:close", () => {
      void closePanel();
    });
    return () => {
      void unlistenOpen.then((fn) => fn());
      void unlistenClose.then((fn) => fn());
    };
  }, [openPanel, closePanel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void closePanel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePanel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => () => cleanupStreamListeners(), [cleanupStreamListeners]);

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    await invoke("save_settings", {
      settings: { selectedModel: modelId },
    });
  };

  const startNewChat = async () => {
    if (loading) return;
    if (messages.length > 0) {
      const ok = window.confirm("¿Empezar una conversación nueva? Se borrará el historial actual.");
      if (!ok) return;
    }
    setMessages([]);
    messagesRef.current = [];
    await persistMessages([]);
    focusInput();
  };

  const stopGeneration = () => {
    void invoke("cancel_chat_generation");
  };

  const submit = async () => {
    const text = query.trim();
    if (!text || loading) return;

    const userTurn: ChatTurn = { id: newId(), role: "user", content: text };
    const assistantId = newId();
    const assistantTurn: ChatTurn = {
      id: assistantId,
      role: "assistant",
      content: "",
    };
    const nextMessages = [...messages, userTurn, assistantTurn];

    setQuery("");
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setLoading(true);
    streamingIdRef.current = assistantId;
    setStreamingId(assistantId);
    cleanupStreamListeners();

    const unlistenChunk = await listen<string>("chat:chunk", (event) => {
      appendStreamChunk(event.payload);
    });
    const unlistenCancelled = await listen("chat:cancelled", () => {
      cleanupStreamListeners();
    });

    streamUnlistenersRef.current = [unlistenChunk, unlistenCancelled];

    try {
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
          .filter((m) => m.role !== "error")
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];

      const answer = await invoke<string>("send_chat_message_stream", {
        messages: apiMessages,
        model: selectedModel,
      });

      setMessages((prev) => {
        const streamed =
          prev.find((m) => m.id === assistantId)?.content ?? "";
        const finalContent = answer || streamed;
        if (!finalContent.trim()) {
          const updated = prev.filter((m) => m.id !== assistantId);
          messagesRef.current = updated;
          return updated;
        }
        const updated = prev.map((m) =>
          m.id === assistantId ? { ...m, content: finalContent } : m,
        );
        messagesRef.current = updated;
        return updated;
      });
      await persistMessages(messagesRef.current);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al contactar con OpenClaw";
      const withoutAssistant = messagesRef.current.filter(
        (m) => m.id !== assistantId,
      );
      const errorTurn: ChatTurn = {
        id: newId(),
        role: "error",
        content: message,
      };
      const withError = [...withoutAssistant, errorTurn];
      setMessages(withError);
      messagesRef.current = withError;
      await persistMessages(withError);
    } finally {
      cleanupStreamListeners();
      streamingIdRef.current = null;
      setStreamingId(null);
      setLoading(false);
      focusInput();
    }
  };

  const openFullView = async () => {
    const main = await WebviewWindow.getByLabel("main");
    await main?.show();
    await main?.setFocus();
    await closePanel();
  };

  return (
    <div className="spotlight-root">
      <div className="spotlight-sidebar">
        <header className="spotlight-header">
          <div className="spotlight-header__left">
            <span className="spotlight-header__title">LOCUS</span>
            <select
              className="spotlight-header__model"
              value={selectedModel}
              onChange={(e) => void handleModelChange(e.target.value)}
              disabled={loading}
              title="Modelo de IA"
              aria-label="Seleccionar modelo"
            >
              {models.length === 0 ? (
                <option value={selectedModel}>{selectedModel}</option>
              ) : (
                models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                    {model.supportsVision ? " · visión" : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="spotlight-header__actions">
            <button
              type="button"
              className="spotlight-btn spotlight-btn--icon"
              title="Nueva conversación"
              onClick={() => void startNewChat()}
              disabled={loading}
              aria-label="Nueva conversación"
            >
              +
            </button>
            <button
              type="button"
              className="spotlight-btn spotlight-btn--icon"
              title="Modo completo (Fase 3)"
              onClick={() => void openFullView()}
              aria-label="Abrir modo completo"
            >
              ⤢
            </button>
          </div>
        </header>

        <div className="spotlight-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`spotlight-turn spotlight-turn--${msg.role}`}
            >
              <MessageContent
                role={msg.role}
                content={msg.content}
                streaming={loading && msg.id === streamingId}
              />
            </div>
          ))}
          <div ref={bottomRef} className="spotlight-messages__anchor" />
        </div>

        <footer className="spotlight-composer">
          <textarea
            ref={inputRef}
            className="spotlight-composer__input"
            placeholder="Pregunta a LOCUS…"
            value={query}
            rows={1}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            disabled={loading}
            spellCheck={false}
            autoComplete="off"
          />
          {loading ? (
            <button
              type="button"
              className="spotlight-btn spotlight-btn--stop"
              onClick={() => void stopGeneration()}
              aria-label="Detener generación"
              title="Detener"
            >
              ⏹
            </button>
          ) : (
            <button
              type="button"
              className="spotlight-btn spotlight-btn--send"
              onClick={() => void submit()}
              disabled={!query.trim()}
              aria-label="Enviar"
            >
              →
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
