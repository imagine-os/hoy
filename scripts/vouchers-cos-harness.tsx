// Development-only harness for the H-6 production voucher screens: the real pages, the real session and i18n, the real
// products/payments mapping, and the fake Company OS credits API (scripts/lib/fake-credits.mjs) behind the raw port in
// place of CompanyOSProvider. Fictional data only.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { MockProvider } from '../src/data/MockProvider';
import { DataProviderRoot } from '../src/data/DataContext';
import { SessionContext, type SessionCtx } from '../src/auth/sessionContext';
import { demoUserById } from '../src/auth/demoUsers';
import { roleCan } from '../src/auth/permissions';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { getStrings } from '../src/app/registry';
import { GiftVoucherPage, VoucherDeskPage, VoucherRedeemPage, VoucherStudioPage } from '../src/modules/vouchers/production/pages';
import { giftPaymentNotes } from '../src/modules/vouchers/production/model';
import { fakeCredits, fixtures } from './lib/fake-credits.mjs';
import { adapterFor, fromRecord } from '../src/data/companyos/mapping';
import { dateKey } from '../src/i18n/format';

/**
 * The signed-in user the production screens read through `useSession()`. Production signs in with Clerk only, so the
 * harness gives the screens a ready session for one fictional persona, shaped as ProductionSession builds it.
 */
export function qaSession(userId: string): SessionCtx {
  const user = demoUserById(userId);
  if (!user) throw new Error(`no fictional persona ${userId}`);
  const noop = () => {};
  return {
    status: 'ready', signedIn: true, user, role: user.role, isSuperAdmin: false, canDevMode: false, devMode: false, viewAs: null, caps: [],
    switchUser: noop, setDevMode: noop, setViewAs: noop, signOut: async () => {}, refresh: noop,
    can: (p) => roleCan(user.role, p), hasRole: (roles) => roles.includes('public') || roles.includes(user.role),
  };
}

export function mountVoucherHarness(path: string, userId: string) {
  const fake = fakeCredits({ today: dateKey(), products: fixtures.products, payments: fixtures.payments(giftPaymentNotes({ name: 'Juliana Ficticia', email: 'juliana@demo.hoyos.test' })) });
  // The session's user id is the login; the person Company OS answers for it is another id (`person.user` = the login).
  fake.state.me = `per_${userId}`;
  fake.state.readVouchers = demoUserById(userId)?.role !== 'customer';
  const data = fake.wrap(new MockProvider(), { adapterFor, fromRecord });
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
        <SessionContext.Provider value={qaSession(userId)}>
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
        </SessionContext.Provider>
      </DataProviderRoot>
    </I18nProvider>,
  );
}
