import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, StringTable } from './types';
import { coreStrings } from './core';

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Pick from a bilingual object. */
  bi: (v: { es: string; en?: string } | undefined) => string;
  dict: StringTable;
}

const Ctx = createContext<I18nCtx | null>(null);
const KEY = 'hoyos.lang';
const warned = new Set<string>();

function readLang(): Lang {
  try { const v = localStorage.getItem(KEY); if (v === 'en' || v === 'es') return v; } catch { /* ignore */ }
  return 'es'; // Spanish is the default language.
}

function translate(dict: StringTable, lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = dict[key];
  if (!entry) {
    if (import.meta.env.DEV && !warned.has(key)) { warned.add(key); console.warn(`[i18n] missing key: ${key}`); }
    return `⟨${key}⟩`;
  }
  let s = lang === 'en' ? entry.en ?? entry.es : entry.es;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function I18nProvider({ tables, children }: { tables: StringTable[]; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  const dict = useMemo(() => Object.assign({}, coreStrings, ...tables) as StringTable, [tables]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(dict, lang, key, vars), [dict, lang]);
  const bi = useCallback((v: { es: string; en?: string } | undefined) => (v ? (lang === 'en' ? v.en ?? v.es : v.es) : ''), [lang]);

  const value = useMemo<I18nCtx>(() => ({ lang, setLang, t, bi, dict }), [lang, setLang, t, bi, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}
/** `const t = useT(); t('module.key', { n: 3 })` */
export function useT() { return useI18n().t; }
export function useLang() { const { lang, setLang } = useI18n(); return { lang, setLang }; }
