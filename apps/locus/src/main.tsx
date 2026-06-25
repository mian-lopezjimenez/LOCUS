import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { Spotlight } from "@/features/spotlight";
import { AppProviders } from "@/providers/AppProviders";
import { applyThemeClass, systemResolvedTheme } from "@/lib/theme";
import "@/index.css";

applyThemeClass(systemResolvedTheme());

async function bootstrap() {
  const label = (await getCurrentWindow()).label;
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("No se encontró #root");
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AppProviders>
        {label === "spotlight" ? <Spotlight /> : <App />}
      </AppProviders>
    </React.StrictMode>,
  );
}

void bootstrap();
