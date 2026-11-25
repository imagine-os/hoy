import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { allowedEvent, routeEligible, type MeasurementEvent } from './pixelPolicy';

/** Test/review injection only. No production caller supplies a sink and there is no Meta script/transport. */
export type MeasurementSink = (event: MeasurementEvent) => void;
type Preference = 'yes' | 'no' | null;
const KEY = 'hoy.measurement.ads.v1';
const Consent = createContext<{ active: boolean; emit: (event: MeasurementEvent) => void; last: { path: string | null } } | null>(null);
const unavailable = () => {};
function stored(): Preference {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'yes' || value === 'no' ? value : null;
  } catch { return null; }
}

export function Measurement({ sink, onStop, children }: { sink?: MeasurementSink; onStop?: () => void; children: ReactNode }) {
  const enabled = Boolean(sink);
  const [choice, setChoice] = useState<Preference>(() => enabled ? stored() : null);
  const current = useRef(choice);
  const last = useRef<{ path: string | null }>({ path: null });
  const [show, setShow] = useState(false);
  function choose(next: Preference, persist: boolean) {
    current.current = next;
    if (next !== 'yes') onStop?.();
    last.current.path = null;
    setChoice(next);
    if (persist) { try { localStorage.setItem(KEY, next ?? 'no'); } catch { /* preference remains for this page only */ } }
  }
  useEffect(() => {
    if (!enabled) return;
    const changed = (e: StorageEvent) => { if (e.key === KEY || e.key === null) choose(stored(), false); };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [enabled]);
  const value = useMemo(() => ({
    active: enabled && choice === 'yes',
    emit(event: MeasurementEvent) {
      if (!sink || current.current !== 'yes') return;
      const vetted = allowedEvent(event);
      if (vetted) { try { sink(vetted); } catch { /* measurement must never affect product behavior */ } }
    },
    last: last.current,
  }), [enabled, sink, choice]);
  if (!enabled) return <>{children}</>;
  return (
    <Consent.Provider value={value}>
      {children}
      <aside aria-label="Preferencias de publicidad / Advertising preferences">
        <button type="button" onClick={() => setShow(v => !v)} aria-expanded={show || choice === null}>
          Privacidad publicitaria / Advertising privacy
        </button>
        {(show || choice === null) && <div>
          <p>Opcional: compartir eventos generales con Meta para medir anuncios. / Optional: share general events with Meta to measure ads.</p>
          <button type="button" onClick={() => { choose('yes', true); setShow(false); }}>Permitir / Allow</button>
          <button type="button" onClick={() => { choose('no', true); setShow(false); }}>No permitir / Decline</button>
        </div>}
      </aside>
    </Consent.Provider>
  );
}

/** React Router is canonical for both SiteRouter's mapped paths and HashRouter. Ignore search/hash-only edits. */
export function MeasurementRoute({ handoff }: { handoff: boolean }) {
  const context = useContext(Consent);
  const { pathname } = useLocation();
  useEffect(() => {
    if (!context?.active || handoff || context.last.path === pathname) return;
    context.last.path = pathname;
    if (routeEligible(pathname)) context.emit({ name: 'PageView' });
  }, [context, handoff, pathname]);
  return null;
}

export function useMeasurement(): (event: MeasurementEvent) => void {
  return useContext(Consent)?.emit ?? unavailable;
}

/** One event per entry/ready product; local-only route identity is never added to the event. */
export function useMeasurementEntry(event: MeasurementEvent | null, localKey: string) {
  const context = useContext(Consent);
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!context?.active || !event || last.current === localKey) return;
    last.current = localKey;
    context.emit(event);
  }, [context, event, localKey]);
}

export function MeasurementEntry({ event, localKey }: { event: MeasurementEvent; localKey: string }) {
  useMeasurementEntry(event, localKey);
  return null;
}
