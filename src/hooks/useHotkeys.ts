import { useEffect } from "react";

export type HotkeyHandler = (e: KeyboardEvent) => void;
export type HotkeyMap = Record<string, HotkeyHandler>;

/**
 * Tiny hotkey hook: maps key combinations to handlers.
 * Combos: lowercase letter, "cmd+s" (matches both meta and ctrl), "cmd+enter", "1"-"9", "j"/"k".
 *
 * Skips events when the user is typing in inputs/textareas/contenteditable
 * (avoid swallowing j/k while editing copy).
 */
export function useHotkeys(map: HotkeyMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          // Allow only meta/ctrl combos through (cmd+s) -- those are global.
          if (!(e.metaKey || e.ctrlKey)) return;
        }
      }
      const cmd = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      const combo = cmd ? `cmd+${key}` : key;
      const fn = map[combo] ?? map[key];
      if (fn) {
        fn(e);
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map, enabled]);
}
