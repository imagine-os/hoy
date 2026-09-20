/**
 * The one-line notice bus. Any module (Placeholder, the hub, a dev tool) calls `toast()`; the
 * single `<Toasts/>` mounted in App.tsx renders them in a polite live region and dismisses them.
 * No provider, no prop drilling — the same shape as `src/dev/inspectorBus.ts`.
 */
export type ToastTone = 'neutral' | 'success' | 'warn' | 'danger';

export interface ToastMessage {
  id: string;
  text: string;
  tone: ToastTone;
  /** Milliseconds before it auto-dismisses. */
  ttl: number;
}

type Listener = (t: ToastMessage) => void;
const listeners = new Set<Listener>();
let seq = 0;

/** Show a one-line notice. Returns its id so a caller can key off it. */
export function toast(text: string, tone: ToastTone = 'neutral', ttl = 4000): string {
  const message: ToastMessage = { id: `t${++seq}`, text, tone, ttl };
  for (const l of [...listeners]) l(message);
  return message.id;
}

export function onToast(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
