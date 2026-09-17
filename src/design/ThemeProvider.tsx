import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';
export type Skin = 'styled' | 'wireframe';

interface ThemeCtx {
  theme: Theme;
  skin: Skin;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setSkin: (s: Skin) => void;
  toggleSkin: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = 'hoyos.theme';

function read(): { theme: Theme; skin: Skin } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable */ }
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return { theme: prefersDark ? 'dark' : 'light', skin: 'styled' };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(read);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.skin = state.skin;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const setTheme = useCallback((theme: Theme) => setState((s) => ({ ...s, theme })), []);
  const setSkin = useCallback((skin: Skin) => setState((s) => ({ ...s, skin })), []);
  const value = useMemo<ThemeCtx>(() => ({
    ...state,
    setTheme,
    setSkin,
    toggleTheme: () => setTheme(state.theme === 'light' ? 'dark' : 'light'),
    toggleSkin: () => setSkin(state.skin === 'styled' ? 'wireframe' : 'styled'),
  }), [state, setTheme, setSkin]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme outside ThemeProvider');
  return v;
}
