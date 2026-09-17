import { Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../design/ThemeProvider';
import { I18nProvider } from '../i18n/I18nProvider';
import { SessionProvider } from '../auth/SessionProvider';
import { DataProviderRoot } from '../data/DataContext';
import { RequireRole } from '../auth/RequireRole';
import { DevTools } from '../dev/DevTools';
import { getRoutes, getStrings } from './registry';
import { withShell } from './shells';
import { ScrollToTop } from './ScrollToTop';
import { RouteTitle } from './RouteTitle';
import { publishManifest } from './manifest';
import { PolicySync } from '../modules/customer/policy';

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
              <RouteTitle routes={allRoutes} />
              {/* The one boundary every lazily-loaded module resolves under (src/app/lazyPage.ts). */}
              <Suspense fallback={<div className="lazy-fallback" aria-busy="true" />}>
                <Routes>
                  {allRoutes.map((r) => (
                    <Route key={r.path} path={r.path} element={<RequireRole roles={r.roles}>{withShell(r, r.element)}</RequireRole>} />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
              <DevTools />
            </HashRouter>
          </SessionProvider>
        </DataProviderRoot>
      </I18nProvider>
    </ThemeProvider>
  );
}
