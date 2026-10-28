/**
 * PL-07 — one set of text limits for launch forms, so a field validates its length the same way everywhere.
 * Inputs set `maxLength`; `clip()` keeps a pasted value inside the limit. Text is always stored and rendered as text
 * (React escapes it); nothing in a launch form is rendered as HTML.
 */
export const LIMITS = { name: 80, title: 120, email: 254, phone: 20, note: 500, message: 1000, url: 300, address: 160 } as const;

export const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
export const isEmail = (value: string) => value.length <= LIMITS.email && EMAIL_RE.test(value.trim());

/** Only an absolute https link may become a public `href` (an admin-typed `javascript:` link must never run). */
export function safeHttpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const u = new URL(value.trim()); return u.protocol === 'https:' && value.length <= LIMITS.url ? u.href : null; } catch { return null; }
}
