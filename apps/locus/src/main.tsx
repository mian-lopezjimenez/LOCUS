import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import { Spotlight } from "./Spotlight";

async function bootstrap() {
  const label = (await getCurrentWindow()).label;
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("No se encontró #root");
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      {label === "spotlight" ? <Spotlight /> : <App />}
    </React.StrictMode>,
  );
}

void bootstrap();
