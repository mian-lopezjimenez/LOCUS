# LOCUS — Patrones y convenciones de código

> Guía obligatoria para implementar features en LOCUS.  
> Complementa [BRIEFING.md](./BRIEFING.md) (qué construimos) y [STACK.md](./STACK.md) (con qué lo construimos).

El objetivo es que cualquier contribución — humana o de agente — produzca código **predecible, pequeño y fácil de mantener**.

---

## 1. Principios generales

| Principio | En la práctica |
|-----------|----------------|
| **Mínimo alcance** | Un cambio = un propósito. No mezclar refactor con feature. |
| **Explícito > mágico** | Preferir código legible a abstracciones prematuras. |
| **Convención sobre configuración** | Si existe un patrón en este doc, seguirlo sin inventar otro. |
| **Local-first** | Nada sale del equipo; no añadir dependencias cloud por comodidad. |
| **UI en español de España** | Textos de usuario, mensajes de error y confirmaciones en castellano. |
| **UI con shadcn** | Toda interfaz nueva usa componentes de shadcn/ui. Sin HTML/buttons crudos salvo prototipo temporal. |

---

## 2. Estructura del monorepo

```
LOCUS/
├── apps/locus/              # App Tauri + React
│   ├── src/                 # Frontend
│   └── src-tauri/src/       # Backend Rust
├── packages/
│   ├── shared/              # Tipos, constantes, utils puros TS
│   ├── openclaw-client/     # Cliente HTTP OpenClaw
│   └── ui/                  # (futuro) componentes compartidos shadcn
└── docs/                    # Briefing, stack, este documento
```

- **Lógica de dominio reutilizable** → `packages/shared` o `packages/openclaw-client`.
- **Lógica específica de ventana Tauri / SO** → Rust (`src-tauri`).
- **UI de una ventana concreta** → `apps/locus/src`.

---

## 3. Estructura del frontend (`apps/locus/src`)

```
src/
├── components/          # Componentes React reutilizables
│   ├── ui/              # Wrappers shadcn (Button, Dialog, Select…)
│   └── chat/            # Piezas de dominio (MessageBubble, Composer…)
├── features/            # (opcional) agrupación por feature cuando crezca
│   └── spotlight/
├── hooks/               # Custom hooks (useChat, useConversations…)
├── lib/                 # Config de librerías (cn(), queryClient, marked)
├── services/            # Llamadas a Tauri invoke / APIs externas
├── types/               # Interfaces y types (sin lógica)
├── utils/               # Funciones puras reutilizables
├── App.tsx
└── main.tsx
```

### Reglas de ubicación

| Qué | Dónde |
|-----|--------|
| `interface`, `type`, enums | `types/` (un archivo por dominio: `chat.ts`, `conversation.ts`) |
| Función pura sin React ni side effects | `utils/` |
| Lógica con estado, efectos o Tauri | `hooks/` o `services/` |
| JSX reutilizable | `components/` |
| Comando `invoke("…")` encapsulado | `services/` |
| Estilos de primitivos shadcn | `components/ui/` |

**No** definir types inline en componentes si se usan en más de un sitio. **No** duplicar utils entre archivos.

---

## 4. Componentes React y SOLID

### Single Responsibility (S)

Un componente hace **una cosa visible**:

- `ChatComposer` → input + enviar.
- `ConversationList` → lista y selección.
- `MessageContent` → render de un mensaje (texto / markdown / typing).

Si un archivo supera ~150–200 líneas o mezcla lista + chat + header, **dividir**.

### Open/Closed (O)

Extender por composición, no por props gigantes:

```tsx
// ✅ Bien: composición
<ChatLayout header={<ChatHeader />} composer={<ChatComposer />} />

// ❌ Mal: 20 props booleanas
<Chat showHistory showModelSelector showExport onExport onDelete … />
```

### Liskov / Interface Segregation (I)

Props mínimas y específicas. Preferir varios tipos pequeños a un `ChatProps` monolítico.

### Dependency Inversion (D)

Los componentes **no** llaman a `invoke` directamente salvo prototipos. Pasar por `services/` o hooks:

```tsx
// services/conversations.ts
export async function loadStore(): Promise<SpotlightStore> {
  return invoke("load_spotlight_store");
}

// hooks/useConversations.ts
export function useConversations() {
  const [store, setStore] = useState<SpotlightStore | null>(null);
  // …
}
```

### Reglas prácticas de componentes

1. **Presentacional vs contenedor**: UI tonta recibe datos y callbacks; el hook/service orquesta.
2. **Sin lógica de negocio en JSX** — extraer a funciones en `utils/` o hooks.
3. **Un componente por archivo** (salvo subcomponentes privados muy pequeños en el mismo fichero).
4. **Nombres**: PascalCase para componentes; archivos igual que el componente (`ChatComposer.tsx`).
5. **Export nombrado** preferido; `export default` solo en entradas (`App.tsx`, `main.tsx`).

---

## 5. shadcn/ui (obligatorio)

Stack oficial: **Tailwind CSS v4 + shadcn/ui** (ver [STACK.md](./STACK.md)).

**Toda la UI del proyecto debe construirse con shadcn/ui.** Botones, inputs, diálogos, selects, menús, scroll, toasts, etc. provienen del registro shadcn, no de elementos HTML estilizados a mano ni de librerías UI alternativas.

### Regla de oro: wrapper sí, editar el primitivo no

Los archivos en `src/components/ui/` son **generados por shadcn** y se tratan como **read-only**:

| Permitido | Prohibido |
|-----------|-----------|
| Instalar o actualizar vía CLI / MCP | Editar `components/ui/button.tsx` (u otro primitivo) para cambiar estilos o comportamiento |
| Pasar `className` desde un wrapper | Añadir lógica de negocio dentro de `components/ui/` |
| Componer primitivos en `components/` o `components/chat/` | Copiar un primitivo a otra carpeta y modificarlo ahí |

Si necesitas otro comportamiento, otro aspecto o props de dominio → **crea un wrapper** en `components/` (o subcarpeta de dominio):

```
components/
├── ui/                    # ← SOLO shadcn (no tocar manualmente)
│   ├── button.tsx
│   └── select.tsx
├── chat/
│   ├── ModelSelect.tsx    # ← wrapper con lógica LOCUS
│   └── ChatComposer.tsx
└── ConversationList.tsx
```

```tsx
// ✅ Bien: wrapper que adapta el primitivo sin modificarlo
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SendButtonProps = {
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

export function SendButton({ disabled, onClick, className }: SendButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      className={cn("bg-primary hover:bg-primary/90", className)}
      aria-label="Enviar"
    >
      →
    </Button>
  );
}
```

```tsx
// ❌ Mal: modificar components/ui/button.tsx para el caso LOCUS
// ❌ Mal: <button className="spotlight-btn"> en CSS plano
```

Al actualizar un componente shadcn (`npx shadcn@latest add button --overwrite`), los cambios deben poder aplicarse **sin perder personalizaciones**, porque estas viven en los wrappers.

### Cuándo usar cada primitivo shadcn

| Caso | Componente shadcn |
|------|-------------------|
| Botones, iconos | `Button` |
| Diálogos / confirmaciones | `AlertDialog`, `Dialog` |
| Selectores (modelo, etc.) | `Select` |
| Inputs y textarea | `Input`, `Textarea` |
| Menús y dropdowns | `DropdownMenu` |
| Scroll en listas | `ScrollArea` |
| Tooltips | `Tooltip` |
| Toasts / errores | `Sonner` |

### Convenciones adicionales

- Instalar componentes en `src/components/ui/` con el **CLI** o el **MCP de shadcn** (ver §5.1).
- Usar `cn()` desde `lib/utils.ts` para combinar clases Tailwind en wrappers.
- Tokens de diseño vía variables CSS de shadcn (tema oscuro por defecto, coherente con `#1a1b1e`).
- Evitar CSS plano en archivos `.css` por componente; migrar gradualmente a Tailwind + shadcn.
- Si falta un componente en el proyecto, **instalarlo** antes de implementar (no improvisar un sustituto).

```tsx
// components/chat/ModelSelect.tsx — wrapper de dominio
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ModelInfo } from "@/types/models";

export function ModelSelect({ models, value, onChange, disabled }: ModelSelectProps) {
  // …
}
```

### 5.1 MCP de shadcn en Cursor

El servidor MCP oficial de shadcn permite al agente **buscar, listar e instalar** componentes en el registro sin adivinar APIs ni props.

#### Configuración en este repo

El proyecto incluye `.cursor/mcp.json` en la raíz:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["-y", "shadcn@latest", "mcp"]
    }
  }
}
```

**Pasos para activarlo:**

1. Abre **Cursor → Settings → MCP**.
2. Comprueba que el servidor **shadcn** aparece con punto verde (conectado).
3. Si no está activo, reinicia Cursor tras clonar el repo.

**Inicializar o regenerar la config** (desde la raíz del monorepo o desde `apps/locus` cuando exista `components.json`):

```bash
cd apps/locus
pnpm dlx shadcn@latest mcp init --client cursor
```

Eso crea o actualiza `.cursor/mcp.json`. En monorepo conviene commitear ese archivo para que todo el equipo use el mismo MCP.

#### Uso por el agente / desarrollador

Con el MCP activo, se puede pedir en el chat de Cursor, por ejemplo:

- *«Añade los componentes button, dialog y select al proyecto»*
- *«Lista los componentes disponibles en el registro shadcn»*
- *«Crea un formulario de contacto con componentes shadcn»*

El agente debe **usar el MCP de shadcn** para instalar primitivos en `components/ui/` y luego **crear wrappers** en `components/` para la lógica LOCUS.

#### Requisitos previos

Antes de instalar componentes vía MCP, el frontend debe tener init de shadcn:

```bash
cd apps/locus
pnpm dlx shadcn@latest init
```

Eso genera `components.json` y la estructura base (`components/ui`, alias `@/`, Tailwind). Sin esto, el MCP puede fallar al escribir archivos.

#### Si el MCP no conecta (Windows)

- Verifica que `npx` está en el PATH (`where npx` en PowerShell).
- En Cursor Settings → MCP, revisa los logs del servidor shadcn.
- Como alternativa, instala manualmente: `pnpm dlx shadcn@latest add button`.

Documentación oficial: [ui.shadcn.com/docs/mcp](https://ui.shadcn.com/docs/mcp)

---

## 6. Types (`types/`)

```ts
// types/chat.ts
export type ChatRole = "user" | "assistant" | "error";

export type ChatTurn = {
  id: string;
  role: ChatRole;
  content: string;
};
```

### Reglas

- `type` para unions y objetos simples; `interface` para contratos extensibles (p. ej. props de componentes).
- Sufijos: `Props` para props (`ChatComposerProps`), sin sufijo para entidades de dominio.
- Tipos compartidos entre app y packages → `packages/shared/src`.
- Tipos solo usados en un componente → pueden quedarse en el mismo archivo **solo si** no se exportan.
- Alineación con Rust: usar `camelCase` en TS; serde en Rust con `rename_all = "camelCase"`.

---

## 7. Utils (`utils/`)

Solo funciones **puras** (misma entrada → misma salida, sin I/O):

```ts
// utils/text.ts
export function truncateTitle(text: string, max = 48): string { … }

// utils/model.ts
export function normalizeModelId(modelId: string): string { … }

// utils/date.ts
export function formatConversationDate(iso: string): string { … }
```

### Qué no va en utils

- Llamadas a `invoke`, `fetch`, `localStorage`.
- Hooks de React.
- Componentes JSX.

---

## 8. Hooks (`hooks/`)

Un hook = un concern:

| Hook | Responsabilidad |
|------|-----------------|
| `useConversations` | Cargar, guardar, cambiar y borrar conversaciones |
| `useChatStream` | Streaming, cancelación, eventos `chat:chunk` |
| `useSpotlightWindow` | Abrir/cerrar panel, animación ventana |
| `useModels` | Lista de modelos + persistencia en settings |

Patrón recomendado:

```ts
export function useChatStream() {
  const [loading, setLoading] = useState(false);
  const send = useCallback(async (…) => { … }, []);
  return { loading, send, stop };
}
```

---

## 9. Services (`services/`)

Capa fina sobre Tauri / HTTP. Un archivo por dominio:

```
services/
├── conversations.ts   # load_spotlight_store, upsert, delete…
├── chat.ts            # send_chat_message_stream, cancel…
├── settings.ts        # load/save settings
└── models.ts          # list_chat_models
```

- Manejar errores aquí o propagar `Error` con mensaje claro en español.
- No importar React en `services/`.

---

## 10. Estado

| Tipo de estado | Herramienta |
|----------------|-------------|
| Servidor / async (chat, modelos, salud) | `@tanstack/react-query` |
| UI local (panel abierto, tema, drawer) | `zustand` |
| Estado de formulario simple | `useState` en el componente |
| Refs para valores en callbacks async | `useRef` |

Evitar un store global gigante. Preferir stores por feature.

---

## 11. Backend Rust (`src-tauri`)

### Organización

```
src-tauri/src/
├── lib.rs              # Registro de comandos y setup
├── openclaw_chat.rs    # Dominio: chat + streaming
├── spotlight_session.rs
├── settings.rs
├── ollama.rs
└── supervisor.rs
```

### Reglas

- Un módulo por dominio; comandos `#[tauri::command]` en el módulo que corresponda.
- Tipos compartidos con el frontend: `Serialize`/`Deserialize` + `camelCase`.
- Errores al usuario: `Result<T, String>` con mensaje en español.
- I/O pesada o red: `async` + `tokio`.
- Estado compartido (cancelación, etc.): `tauri::State<T>` con tipos pequeños.
- **No** poner lógica de UI en Rust; solo sistema, persistencia y proxy a servicios.

### Nuevos comandos Tauri

1. Implementar en módulo de dominio.
2. Registrar en `lib.rs` → `invoke_handler`.
3. Encapsular en `services/*.ts` del frontend.
4. Consumir desde hook o componente contenedor.

---

## 12. Paquetes compartidos (`packages/`)

| Paquete | Contenido |
|---------|-----------|
| `@locus/shared` | Constantes (`OPENCLAW_GATEWAY_URL`), tipos comunes, utils puros |
| `@locus/openclaw-client` | Cliente HTTP OpenClaw (cuando no pase por Tauri) |
| `@locus/ui` | Componentes shadcn reutilizables entre apps (cuando existan) |

Importar con `workspace:*` en `package.json`. No duplicar tipos entre app y packages.

---

## 13. Estilos y UX

- **Tema**: oscuro por defecto; coherente con sidebar actual (`#1a1b1e`).
- **Animaciones**: `framer-motion` para transiciones de panel; evitar animar ventana Tauri y CSS a la vez.
- **Accesibilidad**: componentes Radix/shadcn; `aria-label` en botones solo icono.
- **Atajos**: documentar en código si afectan al comportamiento (`Enter` envía, `Shift+Enter` nueva línea, `Escape` cierra).

---

## 14. Persistencia y datos

| Dato | Ubicación |
|------|-----------|
| Conversaciones | `%APPDATA%/com.mike.locus/spotlight-store.json` |
| Settings (modelo sidebar) | `%APPDATA%/com.mike.locus/settings.json` |
| Config OpenClaw | `~/.openclaw/openclaw.json` (solo lectura desde LOCUS salvo feature explícita) |

- Adjuntos futuros: carpeta `attachments/`, no base64 en JSON.
- Migraciones: al cambiar formato, migrar en Rust al cargar (como `spotlight-session.json` → `spotlight-store.json`).

---

## 15. OpenClaw y modelos

- Campo `model` en body: siempre `openclaw` o `openclaw/<agentId>`.
- Override Ollama: header `x-openclaw-model: ollama/<nombre>`.
- Lista de modelos: agentes desde `/v1/models` + modelos Ollama instalados.
- No hardcodear un modelo concreto salvo constante `DEFAULT_MODEL` en un solo sitio.

---

## 16. Errores y feedback

- Mensajes al usuario: claros, en español, sin stack traces.
- Errores de red: distinguir “OpenClaw no responde” vs “modelo inválido”.
- Estados de carga: indicador visible (typing dots, skeleton shadcn).
- Confirmaciones destructivas: `AlertDialog` (borrar conversación, etc.).

---

## 17. Testing y calidad

- `pnpm exec tsc --noEmit` antes de dar por cerrada una feature de frontend.
- `cargo check` en `apps/locus/src-tauri` tras cambios Rust.
- Tests unitarios en `utils/` y lógica crítica de Rust cuando el comportamiento no sea trivial.
- No añadir tests que solo asserten lo obvio.

---

## 18. Git y commits

- Commits solo cuando el usuario lo pida.
- Mensajes en imperativo, enfocados en el *por qué*.
- No commitear secretos (`.env`, tokens, `openclaw.json` del usuario).

---

## 19. Checklist antes de abrir PR / terminar tarea

- [ ] ¿El componente nuevo es pequeño y con una responsabilidad?
- [ ] ¿Types en `types/` y utils en `utils/`?
- [ ] ¿Toda UI nueva usa shadcn (sin `<button>` / CSS plano improvisado)?
- [ ] ¿Personalizaciones en wrappers, **sin** editar `components/ui/`?
- [ ] ¿Componentes faltantes instalados vía MCP/CLI antes de usarlos?
- [ ] ¿`invoke` está en `services/`, no disperso?
- [ ] ¿Textos en español?
- [ ] ¿Sin dependencias innecesarias?
- [ ] ¿`tsc` y `cargo check` pasan?
- [ ] ¿Diff mínimo (sin refactors no pedidos)?

---

## 20. Deuda conocida (migración gradual)

El código actual (`Spotlight.tsx` monolítico, CSS plano) es MVP válido. Al tocar una zona:

1. Extraer types → `types/`.
2. Extraer utils → `utils/`.
3. Extraer servicios → `services/`.
4. Dividir componentes → `components/chat/`.
5. Sustituir CSS custom por wrappers shadcn + Tailwind (sin tocar `components/ui/`).

No hacer big-bang refactor; migrar **al editar** cada archivo.

---

## Referencias

- [BRIEFING.md](./BRIEFING.md) — visión y fases
- [STACK.md](./STACK.md) — dependencias y arquitectura
- [shadcn/ui](https://ui.shadcn.com/)
- [Tauri 2 commands](https://v2.tauri.app/develop/calling-rust/)
