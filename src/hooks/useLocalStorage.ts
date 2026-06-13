import { useEffect, useState } from "react";

/**
 * Persistent state backed by localStorage. Lazy-inits from storage (falling back
 * to `initial`) and writes back on change. Mirrors the dismiss pattern used in
 * InstallPrompt, generalized for reuse (e.g. collapsed sidebar groups).
 */
export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      /* ignore corrupt/unavailable storage */
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota/unavailable storage */
    }
  }, [key, value]);

  return [value, setValue] as const;
}
