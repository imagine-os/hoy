// Development-only harness for the H-4 launch booking screens: the production routes, shells and pages (served by a
// dev server with VITE_HOY_BUILD=production), on the in-browser MockProvider store (`hoyos.db.v1`, so a test can seed a
// held booking) and a ready session for one fictional persona in place of Clerk. Not in any build. Fictional data only.
import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../src/design/ThemeProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { MockProvider } from '../src/data/MockProvider';
import { SessionContext } from '../src/auth/sessionContext';
import { RequireRole } from '../src/auth/RequireRole';
import { getRedirects, getRoutes, getStrings } from '../src/app/registry';
import { withShell } from '../src/app/shells';
import { PolicySync } from '../src/modules/customer/policy';
import { qaSession } from './vouchers-cos-harness';

export function mountBookingLaunchHarness(userId: string) {
  const routes = getRoutes();
  createRoot(document.getElementById('root')!).render(
    <ThemeProvider>
      <I18nProvider tables={getStrings()}>
        <DataProviderRoot provider={new MockProvider()}>
          <SessionContext.Provider value={qaSession(userId)}>
            <PolicySync />
            <HashRouter>
              <Suspense fallback={<div aria-busy="true" />}>
                <Routes>
                  {routes.map((r) => <Route key={r.path} path={r.path} element={<RequireRole roles={r.roles}>{withShell(r, r.element)}</RequireRole>} />)}
                  {getRedirects().map((r) => <Route key={`redirect:${r.from}`} path={r.from} element={<Navigate to={r.to} replace />} />)}
                  <Route path="*" element={<p>FICTIONAL OTHER DESTINATION</p>} />
                </Routes>
              </Suspense>
            </HashRouter>
          </SessionContext.Provider>
        </DataProviderRoot>
      </I18nProvider>
    </ThemeProvider>,
  );
}
