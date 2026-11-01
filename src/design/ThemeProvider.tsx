import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PRODUCTION_BUILD } from '../config/launch';

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
/**
 * Production (Hoy test-fixes, lane Y3): the wireframe skin is the super admin's, for this tab only. It lives in
 * sessionStorage under a `hoyos.*` key (the sign-out clean-up removes it) instead of in the remembered theme, and
 * `WireframeGate` (src/app/WireframeGate.tsx) resets it for anyone else and on sign-out. The review build is unchanged.
 */
const SKIN_KEY = 'hoyos.skin';

function readSkin(): Skin {
  try { return sessionStorage.getItem(SKIN_KEY) === 'wireframe' ? 'wireframe' : 'styled'; } catch { return 'styled'; }
}

function read(): { theme: Theme; skin: Skin } {
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  let stored: { theme?: unknown; skin?: unknown } | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) stored = JSON.parse(raw);
  } catch { /* storage unavailable */ }
  const theme: Theme = stored?.theme === 'dark' || stored?.theme === 'light' ? stored.theme : prefersDark ? 'dark' : 'light';
  if (PRODUCTION_BUILD) return { theme, skin: readSkin() };
  return stored ? { theme, skin: stored.skin === 'wireframe' ? 'wireframe' : 'styled' } : { theme, skin: 'styled' };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(read);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.skin = state.skin;
    try {
      if (PRODUCTION_BUILD) {
        localStorage.setItem(KEY, JSON.stringify({ theme: state.theme }));
        if (state.skin === 'wireframe') sessionStorage.setItem(SKIN_KEY, 'wireframe'); else sessionStorage.removeItem(SKIN_KEY);
      } else localStorage.setItem(KEY, JSON.stringify(state));
    } catch { /* ignore */ }
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
