import { create } from "zustand";

type SpotlightUiState = {
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  toggleHistory: () => void;
};

export const useSpotlightUiStore = create<SpotlightUiState>((set) => ({
  historyOpen: false,
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
  toggleHistory: () => set((state) => ({ historyOpen: !state.historyOpen })),
}));
