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
}: {
  role: ChatTurn["role"];
  content: string;
}) {
  if (role === "assistant") {
    return (
      <div
        className="spotlight-turn__markdown"
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
      />
    );
  }
  return <p className="spotlight-turn__text">{content}</p>;
}

function TypingIndicator() {
  return (
    <div className="spotlight-turn spotlight-turn--assistant">
      <div className="spotlight-typing" aria-label="Generando respuesta">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function Spotlight() {
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatTurn[]>([]);
  const closingRef = useRef(false);
  const isOpenRef = useRef(false);

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);

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
    void invoke<StoredTurn[]>("load_spotlight_session").then((stored) => {
      if (stored.length > 0) {
        const turns = mapStoredTurns(stored);
        setMessages(turns);
        messagesRef.current = turns;
      }
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

  const submit = async () => {
    const text = query.trim();
    if (!text || loading) return;

    const userTurn: ChatTurn = { id: newId(), role: "user", content: text };
    const nextMessages = [...messages, userTurn];

    setQuery("");
    setMessages(nextMessages);
    messagesRef.current = nextMessages;
    setLoading(true);

    try {
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...nextMessages
          .filter((m) => m.role !== "error")
          .map((m) => ({ role: m.role, content: m.content })),
      ];

      const answer = await invoke<string>("send_chat_message", {
        messages: apiMessages,
      });

      const assistantTurn: ChatTurn = {
        id: newId(),
        role: "assistant",
        content: answer || "(sin respuesta)",
      };
      const withAnswer = [...nextMessages, assistantTurn];
      setMessages(withAnswer);
      messagesRef.current = withAnswer;
      await persistMessages(withAnswer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al contactar con OpenClaw";
      const errorTurn: ChatTurn = {
        id: newId(),
        role: "error",
        content: message,
      };
      const withError = [...nextMessages, errorTurn];
      setMessages(withError);
      messagesRef.current = withError;
      await persistMessages(withError);
    } finally {
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
          <span className="spotlight-header__title">LOCUS</span>
          <button
            type="button"
            className="spotlight-btn spotlight-btn--icon"
            title="Modo completo (Fase 3)"
            onClick={() => void openFullView()}
            aria-label="Abrir modo completo"
          >
            ⤢
          </button>
        </header>

        <div className="spotlight-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`spotlight-turn spotlight-turn--${msg.role}`}
            >
              <MessageContent role={msg.role} content={msg.content} />
            </div>
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} className="spotlight-messages__anchor" />
        </div>

        <footer className="spotlight-composer">
          <input
            ref={inputRef}
            className="spotlight-composer__input"
            type="text"
            placeholder="Pregunta a LOCUS…"
            value={query}
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
          <button
            type="button"
            className="spotlight-btn spotlight-btn--send"
            onClick={() => void submit()}
            disabled={loading || !query.trim()}
            aria-label="Enviar"
          >
            →
          </button>
        </footer>
      </div>
    </div>
  );
}
