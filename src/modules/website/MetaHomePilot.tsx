import { useEffect, useRef, useState, type FormEvent } from 'react';
import { loadAppConfig } from '../../auth/appConfig';
import { PRODUCTION_BUILD } from '../../config/launch';

const ORIGIN = 'https://hoyhumanclub.com';
const FRAME = '/__hoy/meta-home-pageview';
const UNLOCK = '/__hoy/meta-home-unlock';

export function isCleanHome(loc: Pick<Location, 'origin' | 'pathname' | 'search' | 'hash'>) {
  return loc.origin === ORIGIN && loc.pathname === '/' && !loc.search && !loc.hash;
}

// Explicit, one-use opt-in for this page visit only. Persistent account consent is unrelated.
export function MetaHomePilot({ lang }: { lang: string }) {
  const [enabled, setEnabled] = useState(false);
  const [consent, setConsent] = useState<'idle' | 'pending' | 'allow' | 'decline' | 'stop' | 'failed'>('idle');
  const spent = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!PRODUCTION_BUILD || !isCleanHome(window.location)) return;
    let active = true;
    void loadAppConfig().then(cfg => { if (active && cfg.metaHomePilot && isCleanHome(window.location)) setEnabled(true); }, () => {});
    const leave = () => { if (!isCleanHome(window.location)) { activeRequest.current?.abort(); setEnabled(false); } };
    window.addEventListener('hashchange', leave);
    window.addEventListener('popstate', leave);
    return () => {
      active = false;
      activeRequest.current?.abort();
      window.removeEventListener('hashchange', leave);
      window.removeEventListener('popstate', leave);
    };
  }, []);
  if (!enabled || !isCleanHome(window.location)) return null;
  const es = lang === 'es';
  const allow = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (spent.current || !isCleanHome(window.location)) return;
    spent.current = true;
    const form = event.currentTarget;
    const key = new FormData(form).get('key');
    form.reset();
    if (typeof key !== 'string') return;
    const request = new AbortController();
    activeRequest.current = request;
    setConsent('pending');
    try {
      const result = await fetch(UNLOCK, { method: 'POST', body: key, credentials: 'same-origin',
        cache: 'no-store', mode: 'same-origin', signal: request.signal });
      if (!request.signal.aborted && isCleanHome(window.location)) setConsent(result.status === 204 ? 'allow' : 'failed');
    } catch {
      if (!request.signal.aborted) setConsent('failed');
    }
  };
  const stop = () => { activeRequest.current?.abort(); setConsent('stop'); };
  return (
    <section aria-label={es ? 'Prueba de medición publicitaria' : 'Ad measurement test'} className="container stack-sm">
      {consent === 'idle' && <form action={UNLOCK} method="post" onSubmit={allow}>
        <p className="small">{es
          ? 'Prueba para personal autorizado. Al continuar, Meta recibirá una visita de prueba y datos técnicos del navegador. No afecta tus reservas.'
          : 'For authorized testers. If you continue, Meta receives one test visit and technical browser data. This does not affect booking.'}</p>
        <label>{es ? 'Clave de prueba' : 'Test key'}{' '}
          <input type="password" name="key" required minLength={43} maxLength={43} pattern={String.raw`[A-Za-z0-9_\-]{43}`} autoComplete="off" />
        </label>{' '}
        <button type="submit">{es ? 'Permitir esta visita' : 'Allow for this visit'}</button>{' '}
        <button type="button" onClick={() => setConsent('decline')}>{es ? 'No permitir' : 'Do not allow'}</button>
      </form>}
      {(consent === 'allow' || consent === 'pending') && <button type="button" onClick={stop}>{es ? 'Detener la medición' : 'Stop measurement'}</button>}
      {consent === 'allow' && <iframe title={es ? 'Medición de visita' : 'Visit measurement'} hidden src={FRAME} sandbox="allow-scripts" referrerPolicy="no-referrer" />}
      {consent === 'failed' && <p className="small" role="status">{es ? 'No se pudo iniciar la prueba.' : 'Could not start the test.'}</p>}
      {(consent === 'decline' || consent === 'stop') && <p className="small" role="status">{es ? 'Medición desactivada para esta visita.' : 'Measurement is off for this visit.'}</p>}
    </section>
  );
}
