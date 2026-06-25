# LOCUS — Briefing del proyecto

> Documento vivo. Se actualiza conforme se define el alcance. El stack tecnológico se decidirá al cerrar este briefing.

---

## 1. Visión general

**LOCUS** es una herramienta de IA de escritorio **personal** que integra múltiples modelos especializados en distintos ámbitos. Actúa como un agente unificado con control total del PC, ejecutándose en **segundo plano** desde el arranque del sistema.

Tres formas de interactuar:

1. **Modo voz** — atajo global → escucha → respuesta hablada.
2. **Barra de prompt** — atajo global distinto → escribir texto al agente (modo compacto o completo).
3. **Terminal** — terminal independiente de LOCUS, configurable como predeterminado en Windows.

**Principio rector:** 100 % local. Modelos locales, voz local, sin APIs en la nube.

**Estado actual del entorno:** Ollama instalado ✅ · OpenClaw sin instalar (empezar de cero).

---

## 2. Problema / oportunidad

Un asistente genérico no basta para tareas especializadas. Se necesita:

- Orquestar modelos distintos según el dominio de la tarea.
- Acceso real al PC sin fricción (siempre disponible al encender).
- Privacidad total: nada sale del equipo.
- Interacción natural (voz, texto rápido, terminal).

---

## 3. Público objetivo

| Aspecto | Definición |
|---------|------------|
| Usuario | **Solo el propietario** (herramienta personal) |
| Plataforma principal | **Windows** |
| Multiplataforma | Deseable si el diseño lo permite sin complicar el MVP |

---

## 4. Propuesta de valor

- **Agente orquestador** con modelo genérico que deriva al modelo especializado cuando la tarea lo requiera.
- **Siempre disponible** en segundo plano; sin abrir apps manualmente.
- **Tres interfaces** adaptadas al contexto (voz, barra prompt, terminal).
- **Control total del PC** con salvaguardas en operaciones sensibles.
- **Memoria persistente** de conversaciones pasadas.
- **Stack local:** Ollama (motor de modelos) + OpenClaw (capa de agente).

---

## 5. Arquitectura conceptual (borrador)

```
┌─────────────────────────────────────────────────────────┐
│                        LOCUS                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Modo voz │  │ Barra prompt │  │ Terminal LOCUS   │  │
│  │ (STT/TTS)│  │ compacta /   │  │ (independiente,  │  │
│  │          │  │ modo completo│  │  predeterminable)│  │
│  └────┬─────┘  └──────┬───────┘  └────────┬─────────┘  │
│       └───────────────┼───────────────────┘             │
│                       ▼                                 │
│              Orquestador / router                       │
│         (modelo genérico → especialista)                │
│                       │                                 │
│                       ▼                                 │
│                   OpenClaw                              │
│         (agentes, herramientas, sesiones)               │
│                       │                                 │
│                       ▼                                 │
│                    Ollama                               │
│              (modelos LLM locales)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Modos de funcionamiento

### 6.1 Modo voz

| Aspecto | Definición |
|---------|------------|
| Atajo | `Ctrl + Win + V` (V = Voz) — ver §6.4 |
| Flujo | Usuario habla → STT local → agente procesa → TTS local responde |
| Idioma | **Castellano de España** (principal) |
| Privacidad | STT y TTS 100 % locales; sin servicios cloud |
| Confirmaciones | Diálogo o pregunta hablada **sí/no** en acciones sensibles |

### 6.2 Barra de prompt (texto)

#### Modo compacto (por defecto al invocar el atajo)

| Aspecto | Definición |
|---------|------------|
| Atajo | `Ctrl + Win + L` (L = LOCUS) — ver §6.4 |
| Posición | **Centro superior** de la pantalla, estilo **Spotlight** (macOS) / PowerToys Run |
| Apariencia | Barra fina tipo **barra de búsqueda** flotante en pantalla |
| Layout | Cuadro de texto + **botón** al lado para abrir modo completo |
| Respuesta IA | Al contestar, el texto de la IA aparece **debajo** de la barra (sin abrir el modo completo) |
| Uso | Consultas rápidas sin salir del contexto actual |

#### Modo completo

| Aspecto | Definición |
|---------|------------|
| Activación | Botón junto a la barra de texto |
| Contenido | Lista de **conversaciones** + **historial** de cada una |
| Uso | Revisar hilos pasados, continuar conversaciones largas |

### 6.3 Terminal LOCUS

| Aspecto | Definición |
|---------|------------|
| Tipo | **Terminal independiente** de LOCUS (no wrapper de PowerShell/CMD) |
| Configuración | El usuario puede establecerlo como **terminal predeterminado** en Windows |
| Comportamiento | Chat con el agente + ejecución de **comandos reales** del SO bajo demanda |
| Invocación | Abrir la app `locus` (o similar) desde menú inicio, atajo, o como terminal por defecto |

### 6.4 Atajos de teclado globales (propuesta)

| Modo | Atajo | Motivo |
|------|-------|--------|
| **Voz** (escucha) | `Ctrl + Win + V` | V = Voz; poco usado por otras apps; fácil de recordar |
| **Barra prompt** | `Ctrl + Win + L` | L = LOCUS; par simétrico al de voz |
| **Cerrar barra** (sugerido) | `Escape` | Comportamiento estándar de overlays |
| **Modo completo** (sugerido) | Botón en UI o `Ctrl + Win + Shift + L` | Evita conflicto con la barra compacta |

**Notas:**

- `Win + Shift + S` está ocupado (captura de pantalla en Windows); por eso no se usa.
- `Alt + Space` suele estar tomado por launchers (PowerToys, etc.).
- Los atajos serán **configurables** en una fase posterior; estos son los valores por defecto.
- El mismo atajo de voz puede **alternar** escucha activa / detenida (toggle).

**Validado por el usuario** ✅

---

## 7. Modelos y orquestación

### 7.1 Estrategia de modelos

| Rol | Descripción |
|-----|-------------|
| **Modelo genérico** | Punto de entrada; atiende la petición o deriva |
| **Modelos especializados** | Uno o más por ámbito (código, investigación, automatización, etc.) |
| **Derivación** | Si el genérico no resuelve bien, pasa la tarea al modelo más específico |

Los ámbitos no están cerrados: pueden ser **cualquier dominio** según los modelos que se instalen.

### 7.2 Configuración de modelos — ¿dónde se hace?

Sí, en gran parte desde **OpenClaw** y **Ollama**. División de responsabilidades:

| Capa | Qué configuras | Cómo |
|------|----------------|------|
| **Ollama** | Qué modelos están **descargados** y disponibles en el PC | `ollama pull <modelo>`, `ollama list` |
| **OpenClaw** | Qué modelo usa **cada agente**, proveedores, fallbacks, herramientas | `~/.openclaw/openclaw.json` |
| **LOCUS** (futuro) | UI amigable para cambiar modelos, atajos, preferencias | Capa de configuración sobre OpenClaw/Ollama |

El usuario no editará JSON a mano en el día a día; LOCUS expondrá configuración, pero **OpenClaw sigue siendo la fuente de verdad** para agentes y modelos asignados.

### 7.3 Rol de OpenClaw

[OpenClaw](https://docs.openclaw.ai/) es la **capa de agente** sobre Ollama:

- Conecta con Ollama y servidores locales compatibles con OpenAI API.
- Ejecuta herramientas (shell, navegador, archivos, skills).
- Gestiona múltiples agentes con workspaces y sesiones aisladas.
- Configura modelos distintos por agente en `openclaw.json`.
- Modo 100 % offline si solo hay proveedores locales.

Para **genérico → especialista por tarea**, LOCUS añadirá orquestación propia o un agente router en OpenClaw.

### 7.4 Rol de Ollama

| Función | Descripción |
|---------|-------------|
| Servidor local | Modelos LLM en `localhost:11434` |
| Gestión | `ollama pull`, biblioteca de modelos |
| Integración | OpenClaw consume proveedor `ollama/` |

### 7.5 Hardware del usuario

| Componente | Especificación |
|------------|----------------|
| CPU | AMD Ryzen 5 3600 (6C/12T) |
| GPU | NVIDIA RTX 2060 Super (**8 GB VRAM**) |
| RAM | 32 GB DDR4 |

**Implicaciones para modelos:**

| Rango | Viabilidad | Notas |
|-------|------------|-------|
| **7B–8B** (Q4/Q5) | ✅ Ideal | Caben en VRAM; buen equilibrio velocidad/calidad con OpenClaw |
| **14B** (Q4) | ⚠️ Ajustado | Posible con offloading a RAM; más lentitud |
| **32B+** | ❌ No recomendado | Excede VRAM; muy lento solo en CPU/RAM |

### 7.6 Modelos iniciales recomendados (propuesta)

| Rol | Modelo sugerido | Uso |
|-----|-----------------|-----|
| **Genérico** | `qwen2.5:7b` o `llama3.1:8b` | Preguntas, apuntes, conversación general |
| **Programación** | `qwen2.5-coder:7b` | Código, scripts, automatizaciones |
| **Alternativa general** | `mistral:7b` | Buen rendimiento en 8 GB VRAM |

*Definitivos tras instalar OpenClaw y hacer pruebas de tool-calling en el hardware real.*

### 7.7 Casos de uso principales

| Ámbito | Ejemplos |
|--------|----------|
| **Apuntes** | Redactar, resumir, organizar notas y documentos |
| **Programación** | Escribir código, depurar, explicar snippets, generar scripts |
| **Preguntas** | Consultas generales, investigación, dudas técnicas |
| **Automatización** | Tareas en el PC, comandos, flujos repetitivos, control del sistema |

Estos casos alimentan la elección del modelo genérico y del primer especialista (programación/automatización) en Fase 5.

---

## 8. Control del PC y seguridad

| Aspecto | Definición |
|---------|------------|
| Alcance | **Control total** del ordenador |
| Operaciones sensibles | **Confirmación obligatoria** antes de ejecutar |
| Canales de confirmación | **Texto** (diálogo modal) y **voz** (pregunta sí/no hablada) |
| Criterio de “sensible” | Por definir (borrados, instalaciones, cambios de sistema, etc.) |

---

## 9. Memoria e historial

| Requisito | Estado |
|-----------|--------|
| Recordar conversaciones pasadas | ✅ Requerido |
| Persistencia entre sesiones | ✅ Requerido |
| UI de historial | Modo completo de la barra prompt + terminal |
| Backend | OpenClaw guarda sesiones por agente; LOCUS unifica y expone en la UI |

---

## 10. Requisitos no funcionales

| Requisito | Estado |
|-----------|--------|
| Arranque automático con el PC | ✅ |
| Proceso en segundo plano | ✅ |
| Atajo global → modo voz | ✅ `Ctrl + Win + V` |
| Atajo global → barra prompt | ✅ `Ctrl + Win + L` |
| Voz 100 % local (STT + TTS) | ✅ (fase posterior al MVP inicial) |
| Modelos 100 % locales (sin cloud) | ✅ |
| Idioma principal: castellano (España) | ✅ |
| Terminal independiente + predeterminable | ✅ |
| Confirmación texto + voz | ✅ |
| Historial de conversaciones | ✅ |
| Windows como plataforma principal | ✅ |
| Stack tecnológico | ✅ Ver [STACK.md](./STACK.md) |

---

## 11. Alcance MVP — propuesta de fases

### Por qué este orden

Empezar por **texto** (no voz) permite validar el núcleo — OpenClaw + Ollama + control del PC — con menos fricción. La voz local en castellano (STT/TTS) es la parte más costosa de integrar y conviene dejarla para cuando el agente ya funcione bien por texto.

### Fase 1 — Fundación (empezar aquí)

- [ ] Instalar y configurar **OpenClaw** apuntando a **Ollama** (local only)
- [ ] Descargar **1 modelo genérico** en Ollama (tamaño según hardware)
- [ ] **Servicio LOCUS** en segundo plano + arranque automático Windows
- [ ] Comunicación básica: LOCUS ↔ OpenClaw Gateway
- [ ] Primera prueba: petición de texto → respuesta del agente

### Fase 2 — Barra prompt compacta

- [ ] Overlay flotante tipo barra de búsqueda (`Ctrl + Win + L`)
- [ ] Respuesta de la IA **debajo** de la barra
- [ ] Botón para abrir modo completo
- [ ] Confirmaciones sensibles vía **diálogo modal** (texto)

### Fase 3 — Modo completo + historial

- [ ] Vista con lista de conversaciones
- [ ] Historial por conversación
- [ ] Continuar hilos anteriores

### Fase 4 — Terminal LOCUS

- [ ] Terminal independiente con chat del agente
- [ ] Ejecución de comandos reales del SO
- [ ] Documentación para configurarlo como terminal predeterminado en Windows

### Fase 5 — Orquestación multi-modelo

- [ ] Segundo modelo especializado en Ollama
- [ ] Router genérico → especialista
- [ ] Configuración de modelos desde LOCUS (wrapper sobre OpenClaw)

### Fase 6 — Modo voz

- [ ] STT local (castellano de España)
- [ ] TTS local (castellano de España)
- [ ] Atajo `Ctrl + Win + V`
- [ ] Confirmaciones sensibles por voz (sí/no)

### Fuera del MVP inicial

- Soporte Linux/macOS
- Bandeja del sistema con panel de configuración avanzada
- Perfiles de confirmación (estricto / permisivo)
- Muchos modelos especializados

---

## 12. Decisiones pendientes

| # | Tema | Estado |
|---|------|--------|
| D1 | Terminal independiente LOCUS | ✅ Confirmado |
| D2 | Orquestación genérico → especialista | ⏳ Diseño técnico (Fase 5) |
| D3 | Modelos STT/TTS locales | ⏳ Fase 6 |
| D4 | Hardware objetivo | ✅ Ryzen 5 3600 · RTX 2060 Super 8GB · 32GB RAM |
| D5 | Atajos de teclado | ✅ `Ctrl+Win+V` (voz) · `Ctrl+Win+L` (prompt) |
| D6 | Posición barra prompt | ✅ Centro superior, estilo Spotlight |
| D7 | Stack tecnológico | ✅ Definido en [STACK.md](./STACK.md) |

**Briefing funcional:** ✅ Cerrado.

---

## 13. Criterios de éxito

| Criterio | Medida |
|----------|--------|
| Disponibilidad | LOCUS activo tras cada arranque sin intervención manual |
| Privacidad | Ninguna petición de IA ni voz sale del PC |
| Utilidad | Completa tareas reales en el PC (archivos, comandos, apps) |
| Seguridad | Acciones sensibles piden confirmación (texto y voz) |
| UX rápida | Barra compacta responde sin abrir ventana completa |
| Historial | Conversaciones recuperables en modo completo |

---

## 14. Preguntas abiertas

*Ninguna pendiente a nivel funcional. El siguiente bloque de trabajo es la elección del stack tecnológico (§17).*

---

## 15. Decisiones tomadas

| ID | Decisión |
|----|----------|
| D-01 | Nombre: **LOCUS** |
| D-02 | Herramienta **personal** |
| D-03 | **Windows** primero |
| D-04 | **100 % local** — sin cloud |
| D-05 | Idioma: **castellano de España** |
| D-06 | **Ollama** instalado; modelos vía `ollama pull` |
| D-07 | **OpenClaw** desde cero; config de agentes/modelos ahí |
| D-08 | Modelo genérico + especialistas con derivación |
| D-09 | Control total + confirmación en acciones sensibles |
| D-10 | Confirmaciones en **texto y voz** |
| D-11 | Historial en modo completo de la barra prompt |
| D-12 | **Terminal independiente** LOCUS, predeterminable en Windows |
| D-13 | Barra compacta (tipo búsqueda) + respuesta debajo + botón a modo completo |
| D-14 | Atajos propuestos: voz `Ctrl+Win+V`, prompt `Ctrl+Win+L` |
| D-15 | MVP: empezar por fundación OpenClaw+Ollama → barra texto → historial → terminal → voz |
| D-16 | Hardware: Ryzen 5 3600, RTX 2060 Super 8GB, 32GB RAM |
| D-17 | Atajos validados: `Ctrl+Win+V`, `Ctrl+Win+L` |
| D-18 | Barra prompt: centro superior estilo Spotlight |
| D-19 | Casos de uso: apuntes, programación, preguntas, automatizaciones |

---

## 16. Historial de cambios

| Versión | Cambios |
|---------|---------|
| 0.1 | Visión inicial |
| 0.2 | Personal, local-only, OpenClaw investigado |
| 0.3 | Terminal independiente, UX barra prompt, atajos, fases MVP, Ollama instalado, confirmaciones dual |
| 0.4 | Hardware, atajos y UX confirmados; casos de uso; modelos recomendados; briefing funcional cerrado |
| 0.5 | Stack tecnológico definido en STACK.md |

---

## 17. Stack tecnológico

Definido en **[STACK.md](./STACK.md)**. Resumen:

- **Tauri 2** + **React/TypeScript** + **Tailwind/shadcn**
- LOCUS supervisa **OpenClaw Gateway**; health check de **Ollama**
- Monorepo **pnpm**; desarrollo primero, instalador después
- Terminal: **xterm.js + portable-pty**; predeterminado Windows en fase posterior

**Próximo paso:** scaffold del monorepo e implementación Fase 1.
