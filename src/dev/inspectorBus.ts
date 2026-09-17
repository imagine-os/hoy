/** Tiny event bus so any component (PageStub, hub) can open the inspector without prop drilling. */
const EVT = 'hoyos:inspector';
export function openInspector() { window.dispatchEvent(new CustomEvent(EVT, { detail: 'open' })); }
export function onInspector(cb: (action: 'open' | 'toggle') => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}
