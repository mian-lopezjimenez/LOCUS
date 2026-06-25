# LOCUS — Stack tecnológico

> Definido a partir del [BRIEFING.md](./BRIEFING.md) y las preferencias del usuario.  
> Prioridades: **ligero** → **UI pulida** → **mantenible** → **portable** → **velocidad de entrega**.

---

## 1. Resumen ejecutivo

| Capa | Tecnología |
|------|------------|
| **App de escritorio** | **Tauri 2** (Rust + WebView nativo) |
| **UI** | **React 19** + **TypeScript** + **Vite** |
| **Estilos** | **Tailwind CSS v4** + **shadcn/ui** |
| **Agente IA** | **OpenClaw Gateway** (proceso gestionado por LOCUS) |
| **Modelos** | **Ollama** (ya instalado; LOCUS supervisa salud) |
| **Monorepo** | **pnpm workspaces** |
| **Terminal** | **xterm.js** + **portable-pty** (Rust) — por fases |
| **Voz (Fase 6)** | **whisper.cpp** (STT) + **Piper** (TTS) — evaluación diferida |

**Filosofía:** Rust donde importa rendimiento y sistema (tray, hotkeys, PTY, procesos). TypeScript donde importa UI y productividad (React, cliente HTTP OpenClaw).

---

## 2. Por qué Tauri (y no Electron ni C# puro)

| Criterio | Tauri 2 | Electron | C# / WinUI |
|----------|---------|----------|------------|
| RAM en reposo | ~30–80 MB | ~150–300 MB | ~20–50 MB |
| UI pulida con TS | ✅ React | ✅ React | ⚠️ XAML distinto a tu experiencia |
| Atajos globales + overlay | ✅ Plugins oficiales | ✅ `globalShortcut` | ✅ Pero solo Windows |
| Portable Linux/macOS | ✅ Mismo código | ✅ | ❌ Reescritura |
| Mantenibilidad (tú + TS) | ✅ UI en TS; lógica SO en Rust | ✅ Todo TS | ⚠️ Curva C# |

Tauri encaja con tu prioridad #1 (ligero) sin renunciar a TypeScript en la UI ni a multiplataforma futura.

---

## 3. OpenClaw — recomendación: LOCUS controla todo

**Decisión:** LOCUS es el **único punto de entrada**. Gestiona el ciclo de vida de los servicios que necesita.

```
Arranque Windows
      │
      ▼
┌─────────────┐     health      ┌──────────────┐
│    LOCUS    │ ──────────────► │    Ollama    │  (ya instalado; aviso si caído)
│  (Tauri)    │                 │ :11434       │
└──────┬──────┘                 └──────────────┘
       │ spawn / health
       ▼
┌──────────────┐
│  OpenClaw    │  ← LOCUS arranca `openclaw gateway` si no responde en :18789
│  Gateway     │
│  :18789      │
└──────────────┘
```

| Servicio | Quién lo gestiona | Comportamiento |
|----------|-------------------|----------------|
| **LOCUS** | Autostart Windows (`tauri-plugin-autostart`) | Tray, atajos, UI |
| **OpenClaw Gateway** | **LOCUS** (subproceso supervisado) | Arranque, reinicio si cae, token en config local |
| **Ollama** | Usuario (instalador oficial) | LOCUS hace **health check**; muestra error claro si no está activo |

**Por qué no dejar OpenClaw suelto:** Es una herramienta personal always-on. No quieres acordarte de levantar dos servicios. Un icono en bandeja = todo funciona.

**Por qué no gestionar Ollama desde LOCUS (de momento):** En Windows Ollama suele instalarse como app de bandeja propia. Forzar su arranque añade complejidad sin mucho beneficio. LOCUS solo verifica que responde.

**Instalación inicial de OpenClaw:** Script de setup (`pnpm setup`) que ejecuta `npm install -g openclaw` (o instalación local en el monorepo) + `openclaw onboard` con Ollama local-only.

---

## 4. Arquitectura de componentes

```
┌──────────────────────────────────────────────────────────────────┐
│                         apps/locus (Tauri 2)                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Frontend (React + TS)                                      │  │
│  │  · SpotlightBar    · ChatFullView    · TerminalView        │  │
│  │  · ConfirmDialog   · Settings        · Tray menu           │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
│  ┌──────────────────────────▼─────────────────────────────────┐  │
│  │  Backend Rust (src-tauri)                                   │  │
│  │  · global shortcuts  · autostart  · window manager           │  │
│  │  · openclaw supervisor  · ollama health  · pty sessions    │  │
│  │  · confirm bridge (acciones sensibles)                      │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTP / WebSocket
                              ▼
                    OpenClaw Gateway :18789
                              │
                              ▼
                         Ollama :11434
```

### Ventanas Tauri

| Ventana | Rol | Config clave |
|---------|-----|--------------|
| `spotlight` | Barra compacta centro superior | `transparent`, `decorations: false`, `alwaysOnTop`, oculta por defecto |
| `chat` | Modo completo + historial | Redimensionable, misma estética |
| `terminal` | Terminal + panel agente | Ventana independiente; Fase 4 |
| — | Tray icon | Sin ventana principal visible al inicio |

---

## 5. Stack por capa (detalle)

### 5.1 Backend Rust (`apps/locus/src-tauri`)

| Dependencia / plugin | Uso |
|----------------------|-----|
| `tauri` 2.x | Core |
| `tauri-plugin-global-shortcut` | `Ctrl+Win+V`, `Ctrl+Win+L` |
| `tauri-plugin-autostart` | Arranque con Windows |
| `tauri-plugin-positioner` | Centrar barra arriba (`Position.Top`) |
| `tokio` | Async (supervisor OpenClaw, PTY) |
| `reqwest` | Health checks Ollama / OpenClaw |
| `portable-pty` | Sesiones shell reales (terminal) |
| `serde` / `serde_json` | Config y mensajes IPC |
| `tracing` | Logs |

### 5.2 Frontend (`apps/locus/src`)

| Dependencia | Uso |
|-------------|-----|
| `react` 19 + `react-dom` | UI |
| `vite` | Bundler + HMR |
| `typescript` | Tipado |
| `tailwindcss` v4 | Estilos utility-first |
| `@radix-ui/*` + `shadcn/ui` | Componentes accesibles y pulidos |
| `@tanstack/react-query` | Estado servidor (chat, historial) |
| `zustand` | Estado UI local (barra abierta, tema) |
| `xterm` + `@xterm/addon-fit` + `@xterm/addon-webgl` | Terminal (Fase 4) |
| `framer-motion` | Animaciones suaves barra / respuestas |

### 5.3 Paquetes compartidos (`packages/`)

| Paquete | Contenido |
|---------|-----------|
| `@locus/openclaw-client` | Cliente TS: chat completions, sesiones, streaming |
| `@locus/shared` | Tipos, constantes, utilidades |
| `@locus/ui` | Componentes reutilizables (opcional; puede vivir en app al inicio) |

### 5.4 Integración OpenClaw

**Fase 1 — HTTP (simple, suficiente para MVP texto):**

- Habilitar en `openclaw.json`:
  ```json5
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true }
      }
    }
  }
  ```
- LOCUS llama a `POST http://127.0.0.1:18789/v1/chat/completions`
- Auth: Bearer token (`OPENCLAW_GATEWAY_TOKEN` en config local de LOCUS)
- Modelo: `openclaw/default` o header `x-openclaw-model`
- Streaming: SSE del endpoint para respuestas en tiempo real en la barra

**Fase 3+ — WebSocket (si hace falta):**

- Protocolo Gateway completo para sesiones, historial nativo, aprobaciones
- Evaluar `@openclaw/sdk` cuando necesitemos operaciones más allá de chat

**Confirmaciones sensibles:**

- OpenClaw puede solicitar aprobación de herramientas
- LOCUS intercepta vía Gateway y muestra `ConfirmDialog` (texto) o pregunta hablada (Fase 6)
- El backend Rust pausa la ejecución hasta respuesta del usuario

---

## 6. Terminal LOCUS — enfoque por fases

### Fase 4a — Terminal integrado (MVP terminal)

- Ventana Tauri con layout: **panel chat** (izq. o abajo) + **xterm.js** (PTY)
- Rust: `portable-pty` → PowerShell 7 como shell por defecto en Windows
- El agente puede ejecutar comandos reales vía PTY o vía herramientas OpenClaw
- Referencia: [tauri-terminal](https://github.com/marc2332/tauri-terminal), [terminon](https://github.com/Shabari-K-S/terminon)

### Fase 4b — Terminal predeterminado de Windows (posterior)

- Registrar LOCUS Terminal en el esquema de **terminal por defecto** de Windows 11
- Requiere empaquetado como ejecutable de terminal válido (ConPTY, protocolo de registro)
- **Más complejo** — no bloquea el resto del MVP
- Documentar pasos manuales para el usuario mientras tanto (acceso directo, perfil Windows Terminal opcional)

**Recomendación aceptada:** empezar por **4a**; **4b** cuando el terminal sea estable.

---

## 7. UI — limpio y moderno

| Aspecto | Decisión |
|---------|----------|
| Estética | Minimalista, bordes redondeados, sombra suave, tipografía **Inter** o **Segoe UI Variable** |
| Tema | **Claro/oscuro según sistema** (`prefers-color-scheme`) |
| Barra Spotlight | ~600px ancho, centrada arriba; input + botón expandir; respuesta en card debajo |
| Animaciones | Entrada/salida 150–200 ms; sin exceso |
| Iconografía | Lucide React |
| Accesibilidad | Focus trap en barra; Escape cierra |

---

## 8. Voz local (Fase 6 — candidatos)

| Función | Candidato | Notas |
|---------|-----------|-------|
| **STT** | `whisper.cpp` vía binding Rust (`whisper-rs`) | Modelo `base` o `small` en español; GPU CUDA con tu RTX 2060 Super |
| **TTS** | **Piper** | Voces neurales ES; local, ligero |
| **Wake / toggle** | Atajo `Ctrl+Win+V` (sin wake word en MVP) | Menos CPU que escucha continua |

Evaluación detallada al llegar a Fase 6.

---

## 9. Estructura del monorepo

```
LOCUS/
├── apps/
│   └── locus/                 # App Tauri principal
│       ├── src/               # React frontend
│       ├── src-tauri/         # Rust backend
│       └── package.json
├── packages/
│   ├── openclaw-client/       # Cliente API OpenClaw
│   └── shared/                # Tipos compartidos
├── scripts/
│   ├── setup.ps1              # Instala deps dev + OpenClaw + modelos Ollama
│   └── dev.ps1                # Arranca entorno desarrollo
├── BRIEFING.md
├── STACK.md
├── pnpm-workspace.yaml
└── package.json
```

---

## 10. Entorno de desarrollo (Windows)

| Herramienta | Versión | Para qué |
|-------------|---------|----------|
| **Node.js** | 22 LTS | pnpm, scripts, frontend |
| **pnpm** | 9+ | Monorepo |
| **Rust** | stable (rustup) | Tauri backend |
| **Visual Studio Build Tools** | 2022 | Linker Windows para Rust |
| **WebView2** | Runtime (suele venir en Win11) | Motor web de Tauri |
| **Ollama** | ✅ ya instalado | Modelos |
| **OpenClaw** | latest (npm global) | Se instala en setup |

```powershell
# Flujo desarrollo (Fase 1)
pnpm install
pnpm setup          # openclaw onboard + pull modelo
pnpm dev            # tauri dev
```

Distribución: **modo desarrollo primero** (opción C). Instalador `.msi` / NSIS en fase posterior con `tauri build`.

---

## 11. Plan de implementación alineado con stack

### Fase 1 — Fundación
- [ ] Scaffold monorepo + Tauri 2 + React + tray + autostart
- [ ] Supervisor OpenClaw + health Ollama (Rust)
- [ ] `@locus/openclaw-client`: ping + chat completion
- [ ] Prueba CLI/log: mensaje → respuesta agente

### Fase 2 — Barra Spotlight
- [ ] Ventana `spotlight` + `Ctrl+Win+L` + positioner top-center
- [ ] Streaming respuesta debajo de la barra
- [ ] `ConfirmDialog` para acciones sensibles

### Fase 3 — Chat completo
- [ ] Ventana `chat` + lista conversaciones
- [ ] Persistencia sesiones (OpenClaw + índice local SQLite si hace falta)

### Fase 4 — Terminal
- [ ] xterm.js + portable-pty + panel agente
- [ ] (Después) registro como terminal predeterminado Windows

### Fase 5 — Multi-modelo
- [ ] Config OpenClaw multi-agente + router LOCUS

### Fase 6 — Voz
- [ ] whisper.cpp STT + Piper TTS + `Ctrl+Win+V`

---

## 12. Decisiones de stack tomadas

| ID | Decisión |
|----|----------|
| S-01 | **Tauri 2** como framework de escritorio |
| S-02 | **React + TypeScript + Vite** para UI |
| S-03 | **Tailwind + shadcn/ui** para UI pulida y mantenible |
| S-04 | **pnpm monorepo** |
| S-05 | LOCUS **supervisa OpenClaw**; Ollama solo health check |
| S-06 | OpenClaw vía **HTTP chat completions** (MVP); WebSocket después si hace falta |
| S-07 | Terminal: **xterm.js + portable-pty**; predeterminado Windows en fase posterior |
| S-08 | Distribución: **desarrollo primero**, instalador después |
| S-09 | Tema UI: **sistema claro/oscuro**, diseño limpio moderno |
| S-10 | Voz diferida: **whisper.cpp + Piper** (candidatos) |

---

## 13. Trade-offs asumidos

| Trade-off | Por qué lo aceptamos |
|-----------|----------------------|
| UI en TS, no todo en Rust | Tu experiencia + ecosistema React + shadcn; Rust solo en hot path |
| HTTP antes que WebSocket OpenClaw | Menos complejidad en Fase 1; suficiente para chat |
| Terminal predeterminado más tarde | Reduce riesgo; 4a entrega valor antes |
| OpenClaw vía npm global | Estándar del proyecto; LOCUS lo lanza como subproceso |
| WebView2 en vez de Chromium embebido | Menor RAM; depende del runtime de Windows |

---

## 14. Historial

| Versión | Cambios |
|---------|---------|
| 0.1 | Stack inicial: Tauri 2, React, OpenClaw supervisado, terminal por fases |
