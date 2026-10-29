// Dev-only real SignInPage fixture. Not imported by application routes.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { DataProviderRoot, useData } from '../src/data/DataContext';
import { MockProvider } from '../src/data/MockProvider';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import type { Role } from '../src/auth/roles';
import { ThemeProvider } from '../src/design/ThemeProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { getStrings } from '../src/app/registry';
import { SignInPage } from '../src/modules/customer/auth/SignInPage';
import { LockedPage } from '../src/modules/customer/auth/LockedPage';
import '../src/modules/customer/customer.css';

export function mountLegacySignInContext() {
 const first = new MockProvider(), second = new MockProvider();
 const state = { actorId: '', roleValue: '', providerIndex: 0, path: '', arm: false, held: false,
  clearCalls: 0, released: false, release: () => {}, oldRelease: () => {}, nextAttempt: () => {}, actor: (_id: string) => {},
  role: (_role: Role | null) => {}, swap: () => {}, nav: (_path: string) => {}, unmount: () => {} };
 const set = window.setTimeout.bind(window), clear = window.clearTimeout.bind(window);
 let timer: number | null = null;
 window.setTimeout = ((fn: TimerHandler, delay?: number, ...args: unknown[]) => {
  if (state.arm && !state.held && delay === 500 && typeof fn === 'function') {
   state.held = true; timer = set(() => {}, 60_000); const capturedTimer = timer;
   state.release = () => { state.released = true; clear(capturedTimer); fn(...args); };
   return timer;
  }
  return set(fn, delay, ...args);
 }) as typeof window.setTimeout;
 window.clearTimeout = (id?: number) => { if (id === timer) state.clearCalls++; clear(id); };
 state.nextAttempt = () => { state.oldRelease = state.release; state.held = false; state.released = false; state.arm = true; };
 (window as unknown as { qaLegacyContext: typeof state }).qaLegacyContext = state;
 document.getElementById('root')!.style.display = 'none';
 const host = document.createElement('div'); host.id = 'qa-legacy-context'; document.body.append(host);
 const root = createRoot(host); state.unmount = () => root.unmount();
 function Controls() {
  const s = useSession(), data = useData(), loc = useLocation();
  state.actorId = s.user.id; state.roleValue = s.role; state.providerIndex = data === first ? 0 : 1;
  state.actor = s.switchUser; state.role = s.setViewAs; state.nav = useNavigate(); state.path = loc.pathname + loc.search;
  return null;
 }
 function Body() {
  const [index, setIndex] = React.useState(0); state.swap = () => setIndex(i => 1 - i);
  return <DataProviderRoot provider={index ? second : first}><SessionProvider><MemoryRouter initialEntries={['/auth/sign-in?next=%2Fapp%2Fprofile']}><Controls/><Routes>
   <Route path="/auth/sign-in" element={<SignInPage/>}/><Route path="/auth/locked" element={<LockedPage/>}/>
   <Route path="*" element={<p>FICTIONAL DESTINATION</p>}/>
  </Routes></MemoryRouter></SessionProvider></DataProviderRoot>;
 }
 root.render(<ThemeProvider><I18nProvider tables={getStrings()}><Body/></I18nProvider></ThemeProvider>);
}
