// H-6 test double: Company OS credits vouchers as the integration guide ("Credits 1.1.0") describes them, behind the
// four DataProvider tables the production voucher screens use (vouchers, credit_lots, plans, payments). Fictional data
// only. Not shipped: tests and the dev-server harness import it.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const refuse = (code) => Object.assign(new Error(code), { code });

export function fakeCredits({ today = '2026-11-02', products = [], payments = [], vouchers = [] } = {}) {
  const state = { today, products: structuredClone(products), payments: structuredClone(payments), vouchers: structuredClone(vouchers), lots: [], keys: [], replays: new Map(), writes: [] };
  let seq = 0;
  const id = (p) => `${p}_${++seq}`;
  let rnd = 20261101;
  const code = () => { let c; do { c = Array.from({ length: 8 }, () => { rnd = (rnd * 1103515245 + 12345) % 2147483648; return ALPHABET[rnd % ALPHABET.length]; }).join(''); } while (state.vouchers.some((v) => v.code === c)); return c; };
  const whole = (n) => Number.isSafeInteger(n) && n > 0;
  const stamp = () => new Date(`${state.today}T15:00:00Z`).toISOString();

  function createVoucher(body) {
    if (!['gift', 'courtesy'].includes(body.kind)) throw refuse('validation_failed');
    if (!whole(body.classes) || (body.max_uses != null && !whole(body.max_uses))) throw refuse('invalid_quantity');
    // Server-set fields win over anything the client sends.
    const row = { ...body, id: id('vch'), tenant_id: 'ten_hoy', created_at: stamp(), updated_at: stamp(), max_uses: body.max_uses ?? 1, code: code(), uses: 0, redeemed_by: null, redeemed_at: null };
    state.vouchers.push(row);
    return structuredClone(row);
  }
  function redeem(body) {
    const wanted = String(body.voucher_code ?? '').toUpperCase();
    const v = state.vouchers.find((x) => x.code === wanted);
    if (!v) throw refuse('voucher_invalid');
    if (v.valid_until && v.valid_until < state.today) throw refuse('voucher_expired');
    if (v.uses >= v.max_uses || state.lots.some((l) => l.voucher === v.id && l.person === body.person)) throw refuse('voucher_used_up');
    const lot = { id: id('lot'), tenant_id: 'ten_hoy', created_at: stamp(), updated_at: stamp(), person: body.person, source: v.kind, quantity: v.classes, product: v.product ?? null, valid_from: state.today, valid_until: v.valid_until ?? null, voucher: v.id, voucher_code: wanted };
    state.lots.push(lot);
    Object.assign(v, { uses: v.uses + 1, redeemed_by: body.person, redeemed_at: stamp(), updated_at: stamp() });
    return structuredClone(lot);
  }
  const balance = (person) => state.lots.filter((l) => l.person === person && (!l.valid_until || l.valid_until >= state.today)).reduce((n, l) => n + l.quantity, 0);
  const tables = { vouchers: () => state.vouchers, credit_lots: () => state.lots, plans: () => state.products, payments: () => state.payments };

  /** Wraps a provider (MockProvider in the harness): the four voucher tables go to this fake, everything else passes through. */
  function wrap(inner) {
    const listeners = new Map();
    const emit = (table) => { for (const cb of listeners.get(table) ?? []) cb({ table, type: 'reset' }); };
    let currentKey = null;
    const provider = Object.create(inner);
    provider.name = 'fake-company-os';
    provider.list = async (table, q) => (tables[table] ? structuredClone(tables[table]()) : inner.list(table, q));
    provider.peek = (table, q) => (tables[table] ? structuredClone(tables[table]()) : inner.peek?.(table, q));
    provider.get = async (table, rowId) => (tables[table] ? structuredClone(tables[table]().find((r) => r.id === rowId) ?? null) : inner.get(table, rowId));
    provider.subscribe = (table, cb) => {
      if (!tables[table]) return inner.subscribe(table, cb);
      listeners.set(table, new Set([...(listeners.get(table) ?? []), cb]));
      return () => listeners.get(table)?.delete(cb);
    };
    provider.insert = async (table, body) => {
      if (table !== 'vouchers' && table !== 'credit_lots') return inner.insert(table, body);
      state.writes.push({ table, body: structuredClone(body), key: currentKey });
      // 'network': the request never arrived. 'lost': the server committed, then the answer was lost on the way back.
      if (state.fail && state.fail !== 'lost') { const f = state.fail; state.fail = null; throw f === 'network' ? new TypeError('Failed to fetch') : refuse(f); }
      const out = table === 'vouchers' ? createVoucher(body) : redeem(body);
      emit(table); if (table === 'credit_lots') emit('vouchers');
      if (state.fail === 'lost') { state.fail = null; throw Object.assign(new TypeError('Failed to fetch'), { committed: out }); }
      return out;
    };
    provider.atomic = async (action, { idempotencyKey } = {}) => {
      if (!idempotencyKey) throw refuse('idempotency_key_invalid');
      state.keys.push(idempotencyKey);
      if (state.replays.has(idempotencyKey)) return structuredClone(state.replays.get(idempotencyKey));
      currentKey = idempotencyKey;
      try { const out = await action(provider); state.replays.set(idempotencyKey, structuredClone(out)); return out; }
      catch (e) { if (e.committed) state.replays.set(idempotencyKey, structuredClone(e.committed)); throw e; }
      finally { currentKey = null; }
    };
    provider.emit = emit;
    return provider;
  }
  return { state, createVoucher, redeem, balance, wrap };
}

/** Fictional catalogue and payments: two gift products (Company OS shape and frontend `plans` shape), a pack, payments in every state. */
export const fixtures = {
  products: [
    { id: 'prd_gift1', key: 'gift_single', kind: 'gift', name: 'Regalo: 1 clase', credits: 1, price: 38000, validity_days: 60, active: true },
    { id: 'prd_gift12', slug: 'gift_pack12', family: 'regalos', name_es: 'Regalo: 12 clases', name_en: 'Gift: 12 classes', classes: 12, price: 400000, validity_days: null, active: true },
    { id: 'prd_gift_off', kind: 'gift', name: 'Regalo retirado', credits: 4, price: 100000, active: false },
    { id: 'prd_pack', kind: 'pack', name: 'Paquete 12', credits: 12, price: 400000, active: true },
  ],
  payments: (notes) => [
    { id: 'pay_gift_ok', person: 'usr_c01', product: 'prd_gift12', status: 'approved', amount: 400000, date: '2026-11-01', notes },
    { id: 'pay_gift_pending', person: 'usr_c01', product: 'prd_gift1', status: 'pending', amount: 38000, date: '2026-11-01', notes },
    { id: 'pay_gift_declined', person: 'usr_c01', product: 'prd_gift1', status: 'declined', amount: 38000, date: '2026-11-01', notes },
    { id: 'pay_pack', person: 'usr_c01', product: 'prd_pack', status: 'approved', amount: 400000, date: '2026-11-01', notes: '' },
    { id: 'pay_gift_nostatus', person: 'usr_c01', product: 'prd_gift1', amount: 38000, date: '2026-11-01', notes },
    { id: 'pay_gift_nonotes', user_id: 'usr_c02', plan_id: 'prd_gift1', status: 'approved', amount: 38000, paid_at: '2026-11-01T14:00:00Z', note: null },
  ],
};
