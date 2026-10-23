// Development-only actual C-04 component harness; never imported by application routes.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { MockProvider } from '../src/data/MockProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { getStrings } from '../src/app/registry';
import { CheckoutPage } from '../src/modules/customer/pages/CheckoutPage';

export function mountPackageBookingRecovery() {
  const provider = new MockProvider(), second = new MockProvider();
  const state = { provider, second, mode: '', readFail: false, confirmationFault: '', hold: false, paused: false, release: () => {},
    actor: '', role: '', switchUser: (_id: string) => {}, setViewAs: (_role: unknown) => {}, swap: () => {}, navigate: (_path: string) => {}, unmount: () => {} };
  (window as unknown as { qaPackage: typeof state }).qaPackage = state;
  const atomic = provider.atomic.bind(provider), get = provider.get.bind(provider);
  provider.atomic = async (action, options) => {
    const mode = options?.idempotencyKey?.startsWith('checkout:') ? state.mode : '';
    if (mode) state.mode = '';
    if (['session_full', 'mat_taken', 'session_unavailable', 'same_day_conflict', 'booking_exists'].includes(mode)) throw Error(mode);
    const result = await atomic(action, { ...options, ...(mode === 'precommit' ? { failAfterWrites: 2 } : {}) });
    if (mode === 'lost') throw Error('fictional_checkout_ack_lost');
    return result;
  };
  provider.get = async (table, id) => {
    if (table === 'audit_log' && id.startsWith('mock_transaction_checkout:')) {
      if (state.readFail) throw Error('fictional_confirmation_read_failed');
      if (state.hold) { state.paused = true; await new Promise<void>(resolve => { state.release = () => { state.hold = false; state.paused = false; resolve(); }; }); }
    }
    const row = await get(table, id);
    if (table === 'bookings' && state.confirmationFault === 'missing-booking') return null;
    if (table === 'bookings' && row && state.confirmationFault === 'foreign-booking') return { ...row, tenant_id: 'fictional_foreign_tenant' };
    return row;
  };
  const element = document.createElement('div'); element.id = 'qa-package-recovery';
  document.getElementById('root')!.style.display = 'none'; document.body.append(element);
  const root = createRoot(element); state.unmount = () => root.unmount();
  function Controls() { const session = useSession(); state.actor = session.user.id; state.role = session.role; state.switchUser = session.switchUser; state.setViewAs = session.setViewAs; state.navigate = useNavigate(); return null; }
  function Harness() { const [index, setIndex] = React.useState(0); state.swap = () => setIndex(n => 1 - n); return <DataProviderRoot provider={index ? second : provider}><SessionProvider><MemoryRouter initialEntries={['/app/checkout/qa_admission_ui_session']}><Controls/><Routes><Route path="/app/checkout/:id" element={<CheckoutPage/>}/><Route path="*" element={<p>FICTIONAL BOOKING DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>; }
  root.render(<I18nProvider tables={getStrings()}><Harness/></I18nProvider>);
}
