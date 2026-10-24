import { Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../design/ThemeProvider';
import { I18nProvider } from '../i18n/I18nProvider';
import { SessionProvider, useSession } from '../auth/SessionProvider';
import { DataProviderRoot, useData } from '../data/DataContext';
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
import { LaunchNotificationHost } from '../modules/launch-notifications';
import { tenant } from '../tenant/tenant';

/** Preview-only, in-memory action handoff. It never starts a send or changes route/session state. */
function LaunchNotificationBridge() {
  const provider = useData(), { user, role } = useSession(), location = useLocation();
  return <LaunchNotificationHost provider={provider} tenantId={tenant.id} actorId={user.id} role={role} path={location.pathname + location.search} />;
}


export function App() {
  const allRoutes = getRoutes();
  const allStrings = getStrings();
  publishManifest(allRoutes);
  return (
    <ThemeProvider>
      <I18nProvider tables={allStrings}>
        <DataProviderRoot>
          <SessionProvider>
            <PolicySync />
            <HashRouter>
              <ScrollToTop />
              {/* Hub-map sample routes (/app/class/sample) open today's real record (0029). */}
              <SampleRoute />
              <RouteTitle routes={allRoutes} />
              {/* The one boundary every lazily-loaded module resolves under (src/app/lazyPage.ts). */}
              <Suspense fallback={<div className="lazy-fallback" aria-busy="true" />}>
                <Routes>
                  {allRoutes.map((r) => (
                    <Route key={r.path} path={r.path} element={<RequireRole roles={r.roles}>{withShell(r, r.element)}</RequireRole>} />
                  ))}
                  {getRedirects().map((r) => <Route key={`redirect:${r.from}`} path={r.from} element={<Navigate to={r.to} replace />} />)}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <DevTools />
              {/* The one toast stack; anything calls toast() from src/app/toast.ts. */}
              <Toasts />
              <LaunchNotificationBridge />
            </HashRouter>
          </SessionProvider>
        </DataProviderRoot>
      </I18nProvider>
    </ThemeProvider>
  );
}
