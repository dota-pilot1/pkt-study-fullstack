import { create } from "zustand";

const CATEGORY_WIDTH_KEY = "pkt-study-category-width-v3";
const TOPIC_WIDTH_KEY = "pkt-study-topic-width-v3";

function readWidth(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

type PlaybookLayoutState = {
  categoryWidth: number;
  topicWidth: number;
  categoryCollapsed: boolean;
  topicCollapsed: boolean;
  hydrate: () => void;
  setCategoryWidth: (width: number) => void;
  setTopicWidth: (width: number) => void;
  toggleCategory: () => void;
  toggleTopic: () => void;
};

export const usePlaybookLayoutStore = create<PlaybookLayoutState>((set) => ({
  categoryWidth: 280,
  topicWidth: 300,
  categoryCollapsed: false,
  topicCollapsed: false,
  hydrate: () => set({
    categoryWidth: readWidth(CATEGORY_WIDTH_KEY, 280, 240, 560),
    topicWidth: readWidth(TOPIC_WIDTH_KEY, 300, 260, 600),
  }),
  setCategoryWidth: (width) => {
    const next = Math.min(560, Math.max(240, width));
    if (typeof window !== "undefined") window.localStorage.setItem(CATEGORY_WIDTH_KEY, String(next));
    set({ categoryWidth: next });
  },
  setTopicWidth: (width) => {
    const next = Math.min(600, Math.max(260, width));
    if (typeof window !== "undefined") window.localStorage.setItem(TOPIC_WIDTH_KEY, String(next));
    set({ topicWidth: next });
  },
  toggleCategory: () => set((state) => ({ categoryCollapsed: !state.categoryCollapsed })),
  toggleTopic: () => set((state) => ({ topicCollapsed: !state.topicCollapsed })),
}));
