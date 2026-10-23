// Development-only actual Checkout harness. No application route imports this module.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { MockProvider } from '../src/data/MockProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { getStrings } from '../src/app/registry';
import { CheckoutPage } from '../src/modules/customer/pages/CheckoutPage';

export function mountDeskConfirmationHarness(path: string) {
  const provider = new MockProvider(), second = new MockProvider();
  const state = { provider, providerIndex: 0, paymentId: '', readFail: false, corrupt: false, hold: false, paused: false, proofsStarted: 0, proofsSettled: 0, release: () => {},
    actor: '', role: '', switchUser: (_id: string) => {}, setViewAs: (_role: unknown) => {}, swap: () => {}, navigate: (_path: string) => {}, unmount: () => {} };
  (window as unknown as { qaDeskConfirmation: typeof state }).qaDeskConfirmation = state;
  const get = provider.get.bind(provider);
  let barrier: Promise<void> | null = null;
  provider.get = async (table, id) => {
    if (table === 'payments' && id === state.paymentId && provider.peek('payments', { where: { id } }).some(row => row.status === 'approved')) {
      if (state.hold) {
        if (!barrier) { state.paused = true; barrier = new Promise<void>(resolve => { state.release = () => { state.hold = false; state.paused = false; barrier = null; resolve(); }; }); }
        await barrier;
      }
      if (state.readFail) throw Error('fictional_desk_confirmation_read');
    }
    const row = await get(table, id);
    if (table === 'payments' && id === state.paymentId && state.corrupt && row?.frontend_receipt) {
      return { ...row, frontend_receipt: { ...(row.frontend_receipt as object), item: { es: 'FICTIONAL ALTERED COPY', en: 'FICTIONAL ALTERED COPY' } } };
    }
    return row;
  };
  const element = document.createElement('div'); element.id = 'qa-desk-confirmation';
  document.getElementById('root')!.style.display = 'none'; document.body.append(element);
  const root = createRoot(element); state.unmount = () => root.unmount();
  function Controls() { const session = useSession(); state.actor = session.user.id; state.role = session.role; state.switchUser = session.switchUser; state.setViewAs = session.setViewAs; state.navigate = useNavigate(); return null; }
  function Harness() { const [index, setIndex] = React.useState(0); state.providerIndex = index; state.swap = () => setIndex(n => 1 - n); return <DataProviderRoot provider={index ? second : provider}><SessionProvider><MemoryRouter initialEntries={[path]}><Controls/><Routes><Route path="/app/checkout/:id" element={<CheckoutPage/>}/><Route path="*" element={<p>FICTIONAL RECORD DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>; }
  root.render(<I18nProvider tables={getStrings()}><Harness/></I18nProvider>);
}
