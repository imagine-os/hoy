import { useEffect, useRef, useState } from 'react';
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
  const allow = () => {
    if (spent.current || !isCleanHome(window.location)) return;
    spent.current = true;
    setConsent('allow');
  };
  return (
    <section aria-label={es ? 'Medición publicitaria opcional' : 'Optional ad measurement'} className="container stack-sm">
      {consent === 'idle' && <>
        <p className="small">{es
          ? 'Si lo permites, HOY usará Meta Pixel para registrar una visita a esta página y medir sus anuncios. Es opcional y no afecta tus reservas.'
          : 'If you allow it, HOY will use Meta Pixel to record one visit to this page and measure its ads. This is optional and does not affect booking.'}</p>
        <div>
          <button type="button" onClick={allow}>{es ? 'Permitir esta visita' : 'Allow for this visit'}</button>{' '}
          <button type="button" onClick={() => setConsent('decline')}>{es ? 'No permitir' : 'Do not allow'}</button>
        </div>
      </>}
      {consent === 'allow' && <>
        <button type="button" onClick={() => setConsent('stop')}>{es ? 'Detener la medición' : 'Stop measurement'}</button>
        <iframe title={es ? 'Medición de visita' : 'Visit measurement'} hidden src={FRAME} sandbox="allow-scripts" referrerPolicy="no-referrer" />
      </>}
      {(consent === 'decline' || consent === 'stop') && <p className="small" role="status">{es ? 'Medición desactivada para esta visita.' : 'Measurement is off for this visit.'}</p>}
    </section>
  );
}
