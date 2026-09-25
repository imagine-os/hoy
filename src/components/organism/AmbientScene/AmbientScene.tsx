import { useEffect, useRef, useState, type ReactNode } from 'react';
import './AmbientScene.css';

export interface AmbientSceneProps {
  poster: string;
  video?: string;
  alt: string;
  children?: ReactNode;
  className?: string;
  priority?: boolean;
  motion?: boolean;
}
/** Static image is the baseline; video only loads when visible and motion is enabled. */
export function AmbientScene({ poster, video, alt, children, className = '', priority = false, motion = true }: AmbientSceneProps) {
  const root = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(priority);
  const [permitted, setPermitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [requested, setRequested] = useState(false);
  useEffect(() => { if (video && visible && permitted) setRequested(true); }, [video, visible, permitted]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const update = () => setPermitted(motion && !preference.matches && !connection?.saveData);
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, [motion]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!permitted || !visible || !root.current) return;
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = root.current;
        if (el) el.style.setProperty('--scene-shift', `${Math.max(-24, Math.min(24, el.getBoundingClientRect().top * -.035))}px`);
      });
    };
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => { window.removeEventListener('scroll', update); cancelAnimationFrame(frame); root.current?.style.setProperty('--scene-shift', '0px'); };
  }, [permitted, visible]);
  useEffect(() => {
    const sync = () => {
      if (!player.current) return;
      if (visible && permitted && !document.hidden) player.current.play().catch(() => setFailed(true));
      else player.current.pause();
    };
    sync(); document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [visible, permitted, video, requested]);
  return <div ref={root} className={`ambient-scene ${className}`}>
    <img className="ambient-scene-media" src={poster} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} />
    {video && permitted && requested && !failed && <video ref={player} className="ambient-scene-media" src={video} poster={poster} muted loop playsInline preload="none" aria-hidden="true" onError={() => setFailed(true)} />}
    {children && <div className="ambient-scene-content">{children}</div>}
  </div>;
}
