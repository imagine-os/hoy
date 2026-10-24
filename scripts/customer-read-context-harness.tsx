// Development-only actual-hook harness. Never imported by application routes.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { DataProviderRoot } from '../src/data/DataContext';
import { MockProvider } from '../src/data/MockProvider';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import type { Role } from '../src/auth/roles';
import { tenant } from '../src/tenant/tenant';
import { useMyBookings, useMyNotifications, usePaymentMethods, useAllSessionsJoined, useMyProfile, useMyInvites, useSessionJoined } from '../src/modules/customer/hooks';
export function mountCustomerReadContext(failure = false) {
  const first = new MockProvider(), second = new MockProvider(), originalTenant = tenant.id;
  const tables = ['notifications', 'payment_methods', 'bookings', 'class_sessions', 'modalities', 'teachers', 'rooms', 'class_templates', 'profiles', 'users', 'invites'];
  const state = { paused: false, hold: false, failure, frames: [] as { actor: string; role: string; tenant: string; provider: number; rows: string[] }[], queries: [] as unknown[], writes: 0, release: () => {}, actor: (_id: string) => {}, role: (_role: Role | null) => {}, swap: () => {}, tenant: (_id: string) => {}, unmount: () => {} };
  let releaseAll: (() => void)[] = [];
  state.release = () => { state.hold = false; for (const release of releaseAll) release(); releaseAll = []; };
  for (const [index, provider] of [first, second].entries()) {
    const list = provider.list.bind(provider);
    provider.list = async (table, query) => {
      if (!tables.includes(table) || query?.where?.id === '__none__' || query?.where?.user_id === '__none__') return list(table, query);
      state.queries.push({ provider: index, table, query });
      const held = index === 0 && state.hold, fail = state.failure;
      if (held) { state.paused = true; await new Promise<void>(resolve => releaseAll.push(resolve)); }
      if (held && fail) throw Error('fictional_delayed_read');
      // Deliberately ignores query: the hook must defensively scope provider results too.
      const common = { created_at: '2026-10-23T00:00:00Z', updated_at: '2026-10-23T00:00:00Z' };
      return [
        { ...common, id: 'own-' + index, tenant_id: originalTenant, user_id: 'usr_super', inviter_user_id: 'usr_super' },
        { ...common, id: 'actor-' + index, tenant_id: originalTenant, user_id: 'usr_cust', inviter_user_id: 'usr_cust' },
        { ...common, id: 'foreign-' + index, tenant_id: 'fictional_foreign', user_id: 'usr_super', inviter_user_id: 'usr_super' },
        { ...common, id: 'same-id', tenant_id: 'fictional_foreign', user_id: 'usr_super', inviter_user_id: 'usr_super' },
      ] as never;
    };
    provider.insert = provider.update = provider.remove = (async () => { state.writes++; throw Error('unexpected_write'); }) as never;
  }
  (window as unknown as { qaCustomerRead: typeof state }).qaCustomerRead = state;
  const host = document.createElement('div'); host.id = 'qa-customer-read-context'; document.getElementById('root')!.style.display = 'none'; document.body.append(host);
  const root = createRoot(host);
  state.unmount = () => { root.unmount(); tenant.id = originalTenant; };
  function Reads({ provider }: { provider: number }) {
    const session = useSession(), notifications = useMyNotifications(), cards = usePaymentMethods(), bookings = useMyBookings(), sessions = useAllSessionsJoined(), profile = useMyProfile(), invites = useMyInvites(), joined = useSessionJoined("own-" + provider);
    state.actor = session.switchUser; state.role = session.setViewAs;
    const rows = [...notifications.rows, ...cards.rows, ...bookings.rows, ...(profile.profile ? [profile.profile] : []), ...invites.rows].map(row => row.id);
    React.useLayoutEffect(() => { state.frames.push({ actor: session.user.id, role: session.role, tenant: tenant.id, provider, rows }); });
    return <div><output data-rows>{JSON.stringify(rows)}</output><output data-sessions>{sessions.length}</output><output data-joined>{joined.joined?.session.id ?? ""}</output></div>;
  }
  function Body() {
    const [provider, setProvider] = React.useState(0), [, redraw] = React.useState(0);
    state.swap = () => setProvider(n => 1 - n); state.tenant = id => { tenant.id = id; redraw(n => n + 1); };
    return <DataProviderRoot provider={provider ? second : first}><SessionProvider><Reads provider={provider}/></SessionProvider></DataProviderRoot>;
  }
  // Start with unresolved reads so every case crosses a real pending-read context boundary.
  state.hold = true;
  root.render(<Body/>);
}
