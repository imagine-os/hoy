import { useEffect, useRef } from 'react';
import { classTones, TONES, TONE_HOOKS, type Tone } from '../../../design/tokens';
import './ElementCursor.css';

/** A tone hook class (`chip-moss`, `mediaslot-clay`, `tone-river`…) → its tone id. */
const HOOK_RE = new RegExp(`(?:^|\\s)(?:${TONE_HOOKS.join('|')})-(${TONES.join('|')})(?=\\s|$)`);
/** Where the ring opens (40 px) and the dot shrinks. Keep in sync with the `cursor: none` list in the CSS. */
const INTERACTIVE = 'a, button, [role="button"], [role="tab"], label[for], summary, .is-interactive, .is-clickable';
/** Native cursor wins here (caret, media controls, embedded pages). */
const NATIVE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], iframe, video';
/** Reading text: the dot stays, the ring fades so it does not sit on the words. */
const TEXT = 'p, li, h1, h2, h3, h4, h5, h6';
const TONE_CONTEXT = `[data-tone], ${TONES.map((id) => `[class*="-${id}"]`).join(', ')}`;
/** Ring trail: share of the remaining distance covered per frame (≈ 0.22 feels weighted, not laggy). */
const LERP = 0.22;

/**
 * 0042 — the site cursor: an ink dot that sits exactly on the pointer and a thin primary ring that trails it.
 * Built only from theme tokens (`--color-ink`, `--color-primary`, `--color-surface`), so it follows light / dark.
 * A class tone under the pointer only tints the ring (60 % tone dot, 40 % primary); nothing else changes with tone.
 */
export function ElementCursor({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    const dot = root?.querySelector<HTMLElement>('.element-cursor-dot');
    const ring = root?.querySelector<HTMLElement>('.element-cursor-ring');
    if (!root || !dot || !ring || !enabled) return;
    const media = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const pos = { x: 0, y: 0 }; const trail = { x: 0, y: 0 };
    let frame = 0; let shown = false;
    const place = (el: HTMLElement, x: number, y: number) => { el.style.transform = `translate3d(${x}px,${y}px,0)`; };
    const step = () => {
      trail.x += (pos.x - trail.x) * LERP; trail.y += (pos.y - trail.y) * LERP;
      if (Math.abs(pos.x - trail.x) < 0.1 && Math.abs(pos.y - trail.y) < 0.1) { trail.x = pos.x; trail.y = pos.y; frame = 0; }
      else frame = requestAnimationFrame(step);
      place(ring, trail.x, trail.y);
    };
    const hide = () => {
      shown = false; root.dataset.visible = 'false'; cancelAnimationFrame(frame); frame = 0;
      document.documentElement.classList.remove('element-cursor-active');
    };
    const move = (e: PointerEvent) => {
      if (!media.matches || e.pointerType !== 'mouse') { hide(); return; }
      const target = e.target instanceof Element ? e.target : null;
      if (!target || target.closest(NATIVE)) { hide(); return; }
      pos.x = e.clientX; pos.y = e.clientY;
      place(dot, pos.x, pos.y);
      if (!shown) { trail.x = pos.x; trail.y = pos.y; place(ring, pos.x, pos.y); shown = true; }
      else if (!frame) frame = requestAnimationFrame(step);
      const interactive = !!target.closest(INTERACTIVE);
      const context = target.closest(TONE_CONTEXT);
      const found = context?.getAttribute('data-tone') ?? HOOK_RE.exec(context?.className?.toString() ?? '')?.[1];
      const tone: Tone | null = found && found in classTones ? found as Tone : null;
      if (tone) root.style.setProperty('--cursor-tone', `color-mix(in srgb, var(--tone-${tone}-dot) 60%, var(--color-primary))`);
      else root.style.removeProperty('--cursor-tone');
      root.dataset.tone = tone ?? '';
      root.dataset.interactive = String(interactive);
      root.dataset.text = String(!interactive && !!target.closest(TEXT));
      root.dataset.visible = 'true';
      document.documentElement.classList.add('element-cursor-active');
    };
    const down = () => { root.dataset.pressed = 'true'; };
    const up = () => { root.dataset.pressed = 'false'; };
    const key = (e: KeyboardEvent) => { if (e.key === 'Tab') hide(); };
    window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('blur', hide); window.addEventListener('keydown', key); document.documentElement.addEventListener('pointerleave', hide); media.addEventListener('change', hide);
    return () => { hide(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('blur', hide); window.removeEventListener('keydown', key); document.documentElement.removeEventListener('pointerleave', hide); media.removeEventListener('change', hide); };
  }, [enabled]);
  return enabled ? <div ref={ref} className="element-cursor" aria-hidden="true"><span className="element-cursor-ring" /><span className="element-cursor-dot" /></div> : null;
}
