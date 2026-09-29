import { useEffect, useRef } from 'react';
import { classTones, TONES, TONE_HOOKS, type Tone } from '../../../design/tokens';
import './ElementCursor.css';

/** A tone hook class (`chip-moss`, `mediaslot-clay`, `tone-river`…) → its tone id. */
const HOOK_RE = new RegExp(`(?:^|\\s)(?:${TONE_HOOKS.join('|')})-(${TONES.join('|')})(?=\\s|$)`);
export function ElementCursor({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const orb = ref.current;
    if (!orb || !enabled) return;
    const media = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const hide = () => { orb.dataset.visible = 'false'; document.documentElement.classList.remove('element-cursor-active'); };
    const move = (e: PointerEvent) => {
      if (!media.matches || e.pointerType !== 'mouse') { hide(); return; }
      const target = e.target instanceof Element ? e.target : null;
      if (!target || target.closest('input,textarea,select,[contenteditable="true"],iframe,video')) { hide(); return; }
      const context = target.closest(`[data-tone], ${TONES.map((id) => `[class*="-${id}"]`).join(', ')}`);
      const found = context?.getAttribute('data-tone') ?? HOOK_RE.exec(context?.className?.toString() ?? '')?.[1];
      const key: Tone = found && found in classTones ? found as Tone : 'sun';
      orb.style.setProperty('--orb-color', classTones[key].dot);
      orb.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      orb.dataset.element = key; orb.dataset.visible = 'true';
      orb.dataset.interactive = String(!!target.closest('a,button,[role="button"],[role="tab"]'));
      document.documentElement.classList.add('element-cursor-active');
    };
    const down = () => { orb.dataset.pressed = 'true'; };
    const up = () => { orb.dataset.pressed = 'false'; };
    const key = (e: KeyboardEvent) => { if (e.key === 'Tab') hide(); };
    window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('blur', hide); window.addEventListener('keydown', key); document.documentElement.addEventListener('pointerleave', hide); media.addEventListener('change', hide);
    return () => { hide(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('blur', hide); window.removeEventListener('keydown', key); document.documentElement.removeEventListener('pointerleave', hide); media.removeEventListener('change', hide); };
  }, [enabled]);
  return enabled ? <div ref={ref} className="element-cursor" aria-hidden="true"><span className="element-cursor-halo"/><span className="element-cursor-core"/></div> : null;
}
