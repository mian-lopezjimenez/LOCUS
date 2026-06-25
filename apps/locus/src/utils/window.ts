import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { currentMonitor, type Window } from "@tauri-apps/api/window";
import { SIDEBAR_WIDTH, SLIDE_MS } from "@/lib/constants";
import type { SidebarBounds } from "@/types/spotlight";
import { easeOutCubic } from "./easing";

export async function getSidebarBounds(): Promise<SidebarBounds | null> {
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

export async function animateWindowX(
  win: Window,
  fromX: number,
  toX: number,
  y: number,
  durationMs: number = SLIDE_MS,
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

export async function placeSidebar(
  win: Window,
  bounds: SidebarBounds,
  x: number,
) {
  await win.setSize(new LogicalSize(bounds.width, bounds.height));
  await win.setPosition(new LogicalPosition(x, bounds.y));
}
