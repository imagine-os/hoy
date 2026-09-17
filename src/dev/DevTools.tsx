import { useEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { useT } from '../i18n/I18nProvider';
import { allRoutes } from '../app/registry';
import { InspectorPanel } from '../components/organism/InspectorPanel/InspectorPanel';
import { onInspector } from './inspectorBus';
import './DevTools.css';

/** Resolves the RouteDef for the current location. */
export function useCurrentRoute() {
  const { pathname } = useLocation();
  return allRoutes.find((r) => matchPath({ path: r.path, end: true }, pathname)) ?? null;
}

/** Floating spec chip + inspector panel. Only mounts its UI in dev mode; Ctrl+. toggles the panel. */
export function DevTools() {
  const { devMode } = useSession();
  const t = useT();
  const route = useCurrentRoute();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!devMode) { setOpen(false); return; }
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === '.') { e.preventDefault(); setOpen((o) => !o); } };
    window.addEventListener('keydown', onKey);
    const off = onInspector((a) => setOpen((o) => (a === 'open' ? true : !o)));
    return () => { window.removeEventListener('keydown', onKey); off(); };
  }, [devMode]);

  if (!devMode || !route) return null;
  return (
    <>
      <button type="button" className="specchip" onClick={() => setOpen(true)} title="Ctrl+." aria-label={`${t('core.dev.spec')} ${route.spec.code}`}>
        <span className="specchip-dot" aria-hidden />
        <span className="specchip-code">{route.spec.code}</span>
        <span className="specchip-label">{t('core.dev.spec')}</span>
      </button>
      <InspectorPanel spec={route.spec} open={open} onClose={() => setOpen(false)} routePath={route.path} />
    </>
  );
}
