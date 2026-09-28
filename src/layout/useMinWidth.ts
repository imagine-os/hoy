import { useEffect, useState } from 'react';
import { BREAKPOINTS, type Breakpoint } from '../design/tokens';

/**
 * True while the viewport is at least `bp` wide (a breakpoint name from `BREAKPOINTS` or a px number).
 * Initialised from matchMedia so the first render is already right (no dock → top-bar flash); inside a DeviceFrame
 * iframe it reads the frame's own viewport, so the simulator shows the true phone layout at 390 px.
 */
export function useMinWidth(bp: Breakpoint | number): boolean {
  const px = typeof bp === 'number' ? bp : BREAKPOINTS[bp];
  const query = `(min-width: ${px}px)`;
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}
