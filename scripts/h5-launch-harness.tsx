// Dev-only harness for test-h5-launch-ui.mjs: renders the H-5 launch screens (the production build's payment, product
// and settings pages) on the review MockProvider plus the in-memory Company OS stand-in, so they can be driven in a
// browser before the real CompanyOSProvider (H-3) lands. No application imports this file. Fictional data only.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MockProvider } from '../src/data/MockProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { SessionProvider } from '../src/auth/SessionProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { ThemeProvider } from '../src/design/ThemeProvider';
import { coreStrings } from '../src/i18n/core';
import { strings as productStrings } from '../src/modules/products/strings';
import { strings as policyStrings } from '../src/modules/booking-policies';
import { strings as receiptStrings } from '../src/modules/launch-receipts';
import { payLaunchStrings } from '../src/modules/transfers/launch/strings';
import { TransferPayPage } from '../src/modules/transfers/launch/TransferPayPage';
import { PendingPaymentsPage } from '../src/modules/transfers/launch/PendingPaymentsPage';
import { PaymentsReportPage } from '../src/modules/transfers/launch/PaymentsReportPage';
import { ProductMasterPage } from '../src/modules/products/launch/ProductMasterPage';
import { BookingPoliciesPage } from '../src/modules/booking-policies/BookingPoliciesPage';
import { CustomerReceiptPage, StaffReceiptPage } from '../src/modules/launch-receipts/launch/ReceiptPages';
import { fakeCos } from './lib/fake-cos.mjs';

const USERS = { usr_admin: { role: 'super_admin', name: 'Ana Admin' }, usr_desk: { role: 'front_desk', name: 'Diego Desk' }, usr_cust: { role: 'member', name: 'Carla Cliente' } };
const T0 = Date.now();
const cos = fakeCos({ users: USERS, now: () => Date.now() });
const carla = cos.seed('person', { name: 'Carla Cliente', email: 'carla@example.test', user: 'usr_cust' });
cos.seed('member', { person: carla.id, price_audience: 'general' });
const P = (d: Record<string, unknown>) => cos.seed('product', { active: true, valid_from: '2026-01-01', valid_until: null, ...d });
P({ key: 'single', name: 'Clase individual', kind: 'single', price: 55000, credits: 0 });
P({ key: 'trial', name: 'Clase de prueba', kind: 'trial', price: 35000, credits: 1 });
P({ key: 'pack12', name: 'Paquete de 12 clases', kind: 'pack', price: 600000, credits: 12, validity_days: 90 });
P({ key: 'pack12_smtc', name: 'Paquete Santa María', kind: 'pack', price: 480000, credits: 12, validity_days: 90, audience: 'affiliate' });
P({ key: 'private', name: 'Clase privada', kind: 'private', price: 250000 });
const held = cos.seed('booking', { person: carla.id, occurrence: 'occ_1', status: 'held', entitlement: 'single', payment_method: 'transfer', hold_until: new Date(T0 + 15 * 60000).toISOString() }, 'usr_cust');
cos.seed('booking', { person: carla.id, occurrence: 'occ_2', status: 'held', entitlement: 'single', payment_method: 'desk', hold_until: new Date(T0 + 55 * 60000).toISOString() }, 'usr_cust');

const PAGES = {
  pay: { path: '/app/pay/:what/:id', element: <TransferPayPage /> },
  queue: { path: '/staff/transfers', element: <PendingPaymentsPage /> },
  report: { path: '/admin/payments/report', element: <PaymentsReportPage /> },
  products: { path: '/admin/products', element: <ProductMasterPage /> },
  policies: { path: '/admin/settings/booking-policies', element: <BookingPoliciesPage /> },
  receipt: { path: '/app/receipts/:paymentId', element: <CustomerReceiptPage /> },
  staffReceipt: { path: '/staff/receipts/:paymentId', element: <StaffReceiptPage /> },
};

/** The test sets the session (localStorage) before calling this; `cosUser` is who the fake server sees. */
function mount(page: keyof typeof PAGES, url: string, cosUser: string) {
  cos.as(cosUser);
  const provider = Object.assign(new MockProvider(), { request: cos.request, fileBlob: cos.fileBlob });
  // The browser's PUT to the upload link goes to the fake storage, never to the network.
  (window as unknown as { fetch: typeof fetch }).fetch = cos.put as unknown as typeof fetch;
  const p = PAGES[page];
  createRoot(document.getElementById('root')!).render(<ThemeProvider><I18nProvider tables={[coreStrings, productStrings, policyStrings, receiptStrings, payLaunchStrings]}><DataProviderRoot provider={provider}><SessionProvider>
    <MemoryRouter initialEntries={[url]}><main className="app-main" style={{ padding: 16 }}><Routes><Route path={p.path} element={p.element} /><Route path="*" element={<p>route moved</p>} /></Routes></main></MemoryRouter>
  </SessionProvider></DataProviderRoot></I18nProvider></ThemeProvider>);
}
Object.assign(window, { H5: { mount, cos, heldId: held.id } });
