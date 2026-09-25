import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { varDefaults } from "./files.ts";

const storageKey = (name: string) => `ics:var:${name}`;

interface VarsState {
  /** Real values (used by Preview and download). */
  values: Record<string, string>;
  /** Values shown in the code panel (secrets masked unless revealed). */
  display: Record<string, string>;
  setValue: (name: string, value: string, persist: boolean) => void;
  registerSecret: (name: string) => void;
  toggleReveal: (name: string) => void;
  revealed: Record<string, boolean>;
}

const VarsContext = createContext<VarsState | null>(null);

export function VarsProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState(() => {
    const initial = { ...varDefaults };
    for (const name of Object.keys(initial)) {
      const stored = localStorage.getItem(storageKey(name));
      if (stored !== null) initial[name] = stored;
    }
    return initial;
  });
  const [secrets, setSecrets] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const setValue = useCallback((name: string, value: string, persist: boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (persist) localStorage.setItem(storageKey(name), value);
  }, []);
  const registerSecret = useCallback((name: string) => setSecrets((s) => (s[name] ? s : { ...s, [name]: true })), []);
  const toggleReveal = useCallback((name: string) => setRevealed((r) => ({ ...r, [name]: !r[name] })), []);

  const display = useMemo(() => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(values)) {
      out[name] = secrets[name] && !revealed[name] && value !== varDefaults[name] ? "•".repeat(value.length) : value;
    }
    return out;
  }, [values, secrets, revealed]);

  const state = useMemo(
    () => ({ values, display, setValue, registerSecret, toggleReveal, revealed }),
    [values, display, setValue, registerSecret, toggleReveal, revealed],
  );
  return <VarsContext value={state}>{children}</VarsContext>;
}

export function useVars(): VarsState {
  const ctx = useContext(VarsContext);
  if (!ctx) throw new Error("useVars outside VarsProvider");
  return ctx;
}
