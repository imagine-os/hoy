import type { ReactNode } from 'react';
import './BreathingRings.css';

export interface BreathingRingsProps {
  /** Diameter of the outer ring. */
  size?: number;
  /** Turn the 7 s breath off (reduced motion also disables it). */
  animate?: boolean;
  children?: ReactNode;
}

/** Three concentric rings that breathe on the 7 s cycle (--dur-breath) around whatever sits in the middle (A-01). */
export function BreathingRings({ size = 300, animate = true, children }: BreathingRingsProps) {
  const rings = [{ d: size, delay: 0 }, { d: size * 0.73, delay: 0.6 }, { d: size * 0.5, delay: 1.2 }];
  return (
    <div className={`breath ${animate ? 'is-animated' : ''}`} style={{ width: size, height: size }} aria-hidden={!children}>
      {rings.map((r, i) => <span key={i} className="breath-ring" style={{ width: r.d, height: r.d, animationDelay: `${r.delay}s` }} />)}
      {children && <div className="breath-center">{children}</div>}
    </div>
  );
}
