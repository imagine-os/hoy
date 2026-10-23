// Development-only actual-component read failure/race harness. Never imported by the app.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { MockProvider } from '../src/data/MockProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { ThemeProvider } from '../src/design/ThemeProvider';
import { getStrings } from '../src/app/registry';
import { StaffHomePage } from '../src/modules/staff/HomePage';
import { tenant } from '../src/tenant/tenant';
import '../src/styles/global.css';
export async function mountReceptionHomeHarness() {
 const provider = new MockProvider(), original = provider.list.bind(provider);
 window.qaHome = { mode: 'loading', pending: [], reads: [], provider };
 provider.list = async (table, query) => {
  if (query?.where?.tenant_id === tenant.id) {
   window.qaHome.reads.push({ table, query });
   // Capture before waiting, so delayed callbacks represent genuinely stale data.
   const rows = await original(table, query);
   const mode = window.qaHome.mode;
   if (mode === 'loading') return new Promise(resolve => window.qaHome.pending.push(() => resolve(rows)));
   if (mode === 'error') throw Error('FICTIONAL home read failure');
   if (mode === 'empty') return [];
   return rows;
  }
  return original(table, query);
 };
 function Controls() { const session = useSession(), navigate = useNavigate(); window.qaHome.switchUser = session.switchUser; window.qaHome.navigate = navigate; return null; }
 document.getElementById('root')!.style.display = 'none';
 const mount = document.createElement('div'); mount.id = 'qa-home'; mount.className = 'container'; document.body.append(mount);
 const h = React.createElement;
 createRoot(mount).render(h(ThemeProvider, null, h(I18nProvider, { tables: getStrings() }, h(DataProviderRoot, { provider }, h(SessionProvider, null, h(MemoryRouter, { initialEntries: ['/staff'] }, h(Controls), h(Routes, null, h(Route, { path: '/staff', element: h(StaffHomePage) }), h(Route, { path: '*', element: h('p', null, 'FICTIONAL LEFT HOME') }))))))));
}
