// Development-only actual-page context harness; not imported by application routes.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../src/design/ThemeProvider';
import { DataProviderRoot, useData } from '../src/data/DataContext';
import { MockProvider } from '../src/data/MockProvider';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import type { Role } from '../src/auth/roles';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { getStrings } from '../src/app/registry';
import { PlansPage } from '../src/modules/customer/pages/PlansPage';
import { ClassesPage } from '../src/modules/customer/pages/PassesPage';
import '../src/modules/customer/customer.css';
export function mountRetainedClassPurchaseHarness(flow: 'plans' | 'classes') {
 const first = new MockProvider(), second = new MockProvider();
 const state = { paused: false, released: false, settled: false, actorId: '', roleValue: '', providerIndex: 0, actor: (_id: string) => {}, role: (_role: Role | null) => {}, swap: () => {}, nav: (_path: string) => {}, path: '', unmount: () => {}, release: () => {} };
 const originalAtomic = first.atomic.bind(first);
 first.atomic = async (action, options) => { try { return await originalAtomic(action, options); } finally { state.settled = true; } };
 const originalTimeout = window.setTimeout.bind(window);
 window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
  if (delay === 900 && !state.paused && !state.released && typeof callback === 'function') {
   state.paused = true; state.release = () => { state.released = true; state.paused = false; callback(...args); };
   return 0;
  }
  return originalTimeout(callback, delay, ...args);
 }) as typeof window.setTimeout;
 (window as unknown as { qaRetainedContext: typeof state }).qaRetainedContext = state;
 document.getElementById('root')!.style.display = 'none';
 const host = document.createElement('div'); host.id = 'qa-retained-context'; document.body.append(host);
 const root = createRoot(host); state.unmount = () => root.unmount();
 function Controls() { const session = useSession(); state.actorId = session.user.id; state.roleValue = session.role; state.providerIndex = useData() === first ? 0 : 1; state.actor = session.switchUser; state.role = session.setViewAs; state.nav = useNavigate(); const loc = useLocation(); state.path = loc.pathname + loc.search; return null; }
 function Body() { const [index, set] = React.useState(0); state.swap = () => set(i => 1 - i); return <DataProviderRoot provider={index ? second : first}><SessionProvider><MemoryRouter initialEntries={[flow === 'plans' ? '/app/plans?plan=pack12' : '/app/classes']}><Controls/><Routes><Route path="/app/plans" element={<PlansPage/>}/><Route path="/app/classes" element={<ClassesPage/>}/><Route path="*" element={<p>FICTIONAL DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>; }
 root.render(<ThemeProvider><I18nProvider tables={getStrings()}><Body/></I18nProvider></ThemeProvider>);
}
