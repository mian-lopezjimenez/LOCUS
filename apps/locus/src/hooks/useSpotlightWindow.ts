import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef } from "react";
import { useSpotlightUiStore } from "@/stores/spotlight-ui";
import { getSidebarBounds, placeSidebar, animateWindowX } from "@/utils/window";

export function useSpotlightWindow(focusInput: () => void) {
  const closingRef = useRef(false);
  const isOpenRef = useRef(false);
  const setHistoryOpen = useSpotlightUiStore((state) => state.setHistoryOpen);

  const openPanel = useCallback(async () => {
    const win = getCurrentWindow();
    const bounds = await getSidebarBounds();
    if (!bounds) return;

    closingRef.current = false;
    await placeSidebar(win, bounds, bounds.offscreenX);
    await win.show();
    await animateWindowX(win, bounds.offscreenX, bounds.x, bounds.y);
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
    await animateWindowX(win, bounds.x, bounds.offscreenX, bounds.y);
    await win.hide();
    isOpenRef.current = false;
    closingRef.current = false;
    setHistoryOpen(false);
  }, [setHistoryOpen]);

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
      if (event.key !== "Escape") return;

      if (useSpotlightUiStore.getState().historyOpen) {
        setHistoryOpen(false);
        return;
      }

      void closePanel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closePanel, setHistoryOpen]);

  return { openPanel, closePanel };
}
