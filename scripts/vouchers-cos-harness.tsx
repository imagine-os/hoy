// Development-only harness for the H-6 production voucher screens: the real pages, the real session and i18n, and the
// fake Company OS credits API (scripts/lib/fake-credits.mjs) in place of CompanyOSProvider. Fictional data only.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { MockProvider } from '../src/data/MockProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { SessionProvider } from '../src/auth/SessionProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { getStrings } from '../src/app/registry';
import { GiftVoucherPage, VoucherDeskPage, VoucherRedeemPage, VoucherStudioPage } from '../src/modules/vouchers/production/pages';
import { giftPaymentNotes } from '../src/modules/vouchers/production/model';
import { fakeCredits, fixtures } from './lib/fake-credits.mjs';
import { dateKey } from '../src/i18n/format';

export function mountVoucherHarness(path: string) {
  const fake = fakeCredits({ today: dateKey(), products: fixtures.products, payments: fixtures.payments(giftPaymentNotes({ name: 'Juliana Ficticia', email: 'juliana@demo.hoyos.test' })) });
  const data = fake.wrap(new MockProvider());
  const q = { fake, data, ready: false, navigate: (_: string) => {} };
  (window as unknown as { qaVoucher: typeof q }).qaVoucher = q;
  function Where() {
    const loc = useLocation();
    q.navigate = useNavigate(); q.ready = true;
    return <pre id="qa-where">{JSON.stringify({ path: loc.pathname + loc.search, state: loc.state ?? null })}</pre>;
  }
  const el = document.createElement('div');
  el.id = 'qa-voucher-root';
  document.getElementById('root')!.style.display = 'none';
  document.body.append(el);
  createRoot(el).render(
    <I18nProvider tables={getStrings()}>
      <DataProviderRoot provider={data}>
        <SessionProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/app/vouchers" element={<VoucherRedeemPage />} />
              <Route path="/app/vouchers/:code" element={<VoucherRedeemPage />} />
              <Route path="/app/gift-voucher" element={<GiftVoucherPage />} />
              <Route path="/admin/vouchers" element={<VoucherStudioPage />} />
              <Route path="/staff/vouchers" element={<VoucherDeskPage />} />
              <Route path="*" element={<p>FICTIONAL OTHER DESTINATION</p>} />
            </Routes>
            <Where />
          </MemoryRouter>
        </SessionProvider>
      </DataProviderRoot>
    </I18nProvider>,
  );
}
