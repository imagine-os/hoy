import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../design/ThemeProvider';
import { I18nProvider } from '../i18n/I18nProvider';
import { SessionProvider } from '../auth/SessionProvider';
import { DataProviderRoot } from '../data/DataContext';
import { RequireRole } from '../auth/RequireRole';
import { DevTools } from '../dev/DevTools';
import { getRedirects, getRoutes, getStrings } from './registry';
import { withShell } from './shells';
import { ScrollToTop } from './ScrollToTop';
import { SampleRoute } from './SampleRoute';
import { RouteTitle } from './RouteTitle';
import { publishManifest } from './manifest';
import { PolicySync } from '../modules/customer/policy';
import { Toasts } from '../components/molecule/Toast/Toast';
import { PRODUCTION_BUILD } from '../config/launch';
import { WireframeGate } from './WireframeGate';
import { PrivateDocsWatch } from '../modules/docs/PrivateDocsWatch';
import { SiteHandoff, SiteRouter } from './SiteRouter';
import { bootRoute, cleanPathOf } from '../modules/website/paths';

/**
 * Lane H-SEO (D11): which router the address opens with. Production: the public website on real paths (`SiteRouter`),
 * the app, staff and the Hub on hash routes (`HashRouter`); an old `/#/site/…` address moves to its real path first.
 * The review build keeps hash routes only (src/modules/website/paths.ts `bootRoute`).
 */
function currentMode(): 'path' | 'hash' {
  const boot = bootRoute(window.location.pathname, window.location.hash, PRODUCTION_BUILD);
  if (boot.replace) window.history.replaceState(null, '', boot.replace);
  return boot.mode;
}

function AppRouter({ mode, onLeave, children }: { mode: 'path' | 'hash'; onLeave: (href: string, replace: boolean) => void; children: ReactNode }) {
  return mode === 'path' ? <SiteRouter onLeave={onLeave}>{children}</SiteRouter> : <HashRouter>{children}</HashRouter>;
}

export function App() {
  const allRoutes = getRoutes();
  const allStrings = getStrings();
  publishManifest(allRoutes);
  const [mode, setMode] = useState(currentMode);
  useEffect(() => {
    const pop = () => setMode(currentMode());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  // The website leaving for the app (`/#/app/…`), and a website route reached inside the app moving to its real path.
  const leave = useCallback((href: string, replace: boolean) => { window.history[replace ? 'replaceState' : 'pushState'](null, '', href); setMode('hash'); }, []);
  const handoff = useCallback((href: string) => { window.history.replaceState(null, '', href); setMode('path'); }, []);
  const siteOnPaths = PRODUCTION_BUILD && mode === 'hash';
  return (
    <ThemeProvider>
      <I18nProvider tables={allStrings}>
        <DataProviderRoot>
          <SessionProvider>
            <PolicySync />
            {/* Lane Y3: the wireframe skin is the super admin's only, reset on sign-out. */}
            {PRODUCTION_BUILD && <WireframeGate />}
            {PRODUCTION_BUILD && <PrivateDocsWatch />}
            <AppRouter mode={mode} onLeave={leave}>
              <ScrollToTop />
              {/* Hub-map sample routes (/app/class/sample) open today's real record (0029). */}
              <SampleRoute />
              <RouteTitle routes={allRoutes} />
              {/* The one boundary every lazily-loaded module resolves under (src/app/lazyPage.ts). */}
              <Suspense fallback={<div className="lazy-fallback" aria-busy="true" />}>
                <Routes>
                  {allRoutes.map((r) => (
                    <Route key={r.path} path={r.path} element={siteOnPaths && cleanPathOf(r.path) !== null ? <SiteHandoff onPath={handoff} /> : <RequireRole roles={r.roles}>{withShell(r, r.element)}</RequireRole>} />
                  ))}
                  {getRedirects().map((r) => <Route key={`redirect:${r.from}`} path={r.from} element={<Navigate to={r.to} replace />} />)}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <DevTools />
              {/* The one toast stack; anything calls toast() from src/app/toast.ts. */}
              <Toasts />
            </AppRouter>
          </SessionProvider>
        </DataProviderRoot>
      </I18nProvider>
    </ThemeProvider>
  );
}
