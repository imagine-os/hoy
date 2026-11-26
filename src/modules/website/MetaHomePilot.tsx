import { useEffect, useRef, useState, type FormEvent } from 'react';
import { loadAppConfig } from '../../auth/appConfig';
import { PRODUCTION_BUILD } from '../../config/launch';

const ORIGIN = 'https://hoyhumanclub.com';
const FRAME = '/__hoy/meta-home-pageview';

export function isCleanHome(loc: Pick<Location, 'origin' | 'pathname' | 'search' | 'hash'>) {
  return loc.origin === ORIGIN && loc.pathname === '/' && !loc.search && !loc.hash;
}

// Explicit, one-use opt-in for this page visit only. Persistent account consent is unrelated.
export function MetaHomePilot({ lang }: { lang: string }) {
  const [enabled, setEnabled] = useState(false);
  const [consent, setConsent] = useState<'idle' | 'allow' | 'decline' | 'stop'>('idle');
  const spent = useRef(false);
  const target = useRef('');
  useEffect(() => {
    if (!PRODUCTION_BUILD || !isCleanHome(window.location)) return;
    let active = true;
    void loadAppConfig().then(cfg => { if (active && cfg.metaHomePilot && isCleanHome(window.location)) setEnabled(true); }, () => {});
    const leave = () => { if (!isCleanHome(window.location)) setEnabled(false); };
    window.addEventListener('hashchange', leave);
    window.addEventListener('popstate', leave);
    return () => {
      active = false;
      window.removeEventListener('hashchange', leave);
      window.removeEventListener('popstate', leave);
    };
  }, []);
  if (!enabled || !isCleanHome(window.location)) return null;
  const es = lang === 'es';
  if (!target.current) target.current = 'hoy-pilot-' + crypto.randomUUID();
  const allow = (event: FormEvent<HTMLFormElement>) => {
    if (spent.current || !isCleanHome(window.location)) {
      event.preventDefault();
      return;
    }
    spent.current = true;
    const form = event.currentTarget;
    window.setTimeout(() => { form.reset(); setConsent('allow'); }, 0);
  };
  return (
    <section aria-label={es ? 'Prueba de medición publicitaria' : 'Ad measurement test'} className="container stack-sm">
      <form action={FRAME} method="post" target={target.current} onSubmit={allow} hidden={consent !== 'idle'}>
        <p className="small">{es
          ? 'Prueba para personal autorizado. Al continuar, Meta recibirá una visita de prueba y datos técnicos del navegador. No afecta tus reservas.'
          : 'For authorized testers. If you continue, Meta receives one test visit and technical browser data. This does not affect booking.'}</p>
        <label>{es ? 'Clave de prueba' : 'Test key'}{' '}
          <input type="password" name="key" required minLength={43} maxLength={43} pattern={String.raw`[A-Za-z0-9_\-]{43}`} autoComplete="off" />
        </label>{' '}
        <button type="submit">{es ? 'Permitir esta visita' : 'Allow for this visit'}</button>{' '}
        <button type="button" onClick={() => setConsent('decline')}>{es ? 'No permitir' : 'Do not allow'}</button>
      </form>
      {consent === 'allow' && <button type="button" onClick={() => setConsent('stop')}>{es ? 'Detener la medición' : 'Stop measurement'}</button>}
      {(consent === 'idle' || consent === 'allow') && <iframe title={es ? 'Medición de visita' : 'Visit measurement'} hidden name={target.current} sandbox="allow-scripts" referrerPolicy="no-referrer" />}
      {(consent === 'decline' || consent === 'stop') && <p className="small" role="status">{es ? 'Medición desactivada para esta visita.' : 'Measurement is off for this visit.'}</p>}
    </section>
  );
}
