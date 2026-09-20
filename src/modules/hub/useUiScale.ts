import { useEffect, useState, type RefObject } from 'react';

/**
 * Reads the hub's `--ui` step (1 · 1.125 ≥1920 · 1.375 ≥2560 · 1.75 ≥3840) in JavaScript.
 * CSS does the scaling on its own everywhere else; the one thing CSS cannot do is tell the phone
 * preview how far above 1 it is allowed to scale its device frame on a 4K wall.
 */
export function useUiScale(ref: RefObject<HTMLElement | null>): number {
  const [ui, setUi] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const read = () => {
      const raw = Number.parseFloat(getComputedStyle(el).getPropertyValue('--ui'));
      setUi(Number.isFinite(raw) && raw > 0 ? raw : 1);
    };
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, [ref]);
  return ui;
}
