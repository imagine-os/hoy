// H-6 test double: Company OS credits vouchers as the integration guide ("Credits 1.1.0") describes them, behind the
// raw port the production voucher screens use (`request()`: `/query`, `POST /api/voucher`, `POST /api/credit_lot`, with
// Idempotency-Key replays), plus the two mapped tables they read (plans ↔ product, payments ↔ payment). Rows are kept
// in Company OS field names. Fictional data only. Not shipped: tests and the dev-server harness import it.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** A refusal as the transport throws it: the code is the message, with the HTTP status. */
const refuse = (code, status = 422) => Object.assign(new Error(code), { code, status });
/** No answer: the transport's lost response (status 0), which may or may not have committed. */
const noAnswer = () => Object.assign(new TypeError('Failed to fetch'), { status: 0 });

export function fakeCredits({ today = '2026-11-02', products = [], payments = [], vouchers = [] } = {}) {
  const state = {
    today, products: structuredClone(products), payments: structuredClone(payments), vouchers: structuredClone(vouchers), lots: [],
    /** The caller's person id (`person.user` = the login): what `/query person { user: $me }` answers. */
    me: 'per_cust',
    /** Staff read vouchers; a member has no `voucher` read in the recipe. */
    readVouchers: true,
    keys: [], replays: new Map(), writes: [], fail: null,
  };
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
    const row = { ...body, id: id('vch'), created_at: stamp(), updated_at: stamp(), max_uses: body.max_uses ?? 1, code: code(), uses: 0, redeemed_by: null, redeemed_at: null };
    state.vouchers.push(row);
    return structuredClone(row);
  }
  function redeem(body) {
    if (!body.person) throw refuse('validation_failed');
    const wanted = String(body.voucher_code ?? '').trim().toUpperCase();
    const v = state.vouchers.find((x) => x.code === wanted);
    if (!v) throw refuse('voucher_invalid');
    if (v.valid_until && v.valid_until < state.today) throw refuse('voucher_expired');
    if (v.uses >= v.max_uses || state.lots.some((l) => l.voucher === v.id && l.person === body.person)) throw refuse('voucher_used_up');
    const lot = { id: id('lot'), created_at: stamp(), updated_at: stamp(), person: body.person, source: v.kind, quantity: v.classes, product: v.product ?? null, valid_from: state.today, valid_until: v.valid_until ?? null, voucher: v.id, voucher_code: wanted };
    state.lots.push(lot);
    Object.assign(v, { uses: v.uses + 1, redeemed_by: body.person, redeemed_at: stamp(), updated_at: stamp() });
    return structuredClone(lot);
  }
  const balance = (person) => state.lots.filter((l) => l.person === person && (!l.valid_until || l.valid_until >= state.today)).reduce((n, l) => n + l.quantity, 0);
  /** A stored row as a Company OS record. */
  const record = (row) => { const { id: rid, created_at, updated_at, ...data } = row; return { id: rid, data: structuredClone(data), createdAt: created_at, updatedAt: updated_at }; };

  const listeners = new Map();
  /** Like CompanyOSProvider.request: a write refetches every subscribed table. */
  const emitAll = () => { for (const [table, set] of listeners) for (const cb of set) cb({ table, type: 'reset' }); };

  function query(spec) {
    if (spec.entity === 'person') {
      const mine = spec.filter?.field === 'user' && spec.filter?.value?.$me === true;
      return mine && state.me ? [{ id: state.me, data: { name: 'Persona Ficticia' } }] : [];
    }
    if (spec.entity !== 'voucher') throw refuse(`unknown entity "${spec.entity}"`, 400);
    if (!state.readVouchers) throw refuse('forbidden', 403);
    const rows = [...state.vouchers];
    for (const s of [...(spec.sort ?? [])].reverse()) rows.sort((a, b) => String(a[s.field] ?? '').localeCompare(String(b[s.field] ?? '')) * (s.dir === 'desc' ? -1 : 1));
    const offset = spec.offset ?? 0, limit = Math.min(spec.limit ?? 100, 500);
    return rows.slice(offset, offset + limit).map(record);
  }
  const CREATES = { '/api/voucher': createVoucher, '/api/credit_lot': redeem };

  /** The raw port (`cosOf(data).request`): paths relative to `/t/<tenant>`, answers as the API sends them. */
  async function request(method, path, body, { idempotencyKey } = {}) {
    if (method === 'POST' && path === '/query') return { data: query(body ?? {}) };
    const create = method === 'POST' ? CREATES[path] : null;
    if (!create) throw refuse('not_found', 404);
    if (idempotencyKey != null && !/^[A-Za-z0-9_-]{8,128}$/.test(idempotencyKey)) throw refuse('idempotency_key_invalid', 400);
    if (idempotencyKey) state.keys.push(idempotencyKey);
    // ADR 0040: the same key and body replays the first success; the same key with another body or route is a conflict.
    const prior = idempotencyKey && state.replays.get(idempotencyKey);
    if (prior) {
      if (prior.path !== path || JSON.stringify(prior.body) !== JSON.stringify(body)) throw refuse('idempotency_conflict', 409);
      return structuredClone(prior.answer);
    }
    state.writes.push({ path, body: structuredClone(body), key: idempotencyKey ?? null });
    // 'network': the request never arrived. 'lost': the server committed, then the answer was lost on the way back.
    // Any other value: the server refuses with that code (nothing is stored under the key).
    const fail = state.fail;
    if (fail && fail !== 'lost') { state.fail = null; throw fail === 'network' ? noAnswer() : refuse(fail); }
    const answer = { data: record(create(body)) };
    if (idempotencyKey) state.replays.set(idempotencyKey, { path, body: structuredClone(body), answer: structuredClone(answer) });
    emitAll();
    if (fail === 'lost') { state.fail = null; throw noAnswer(); }
    return answer;
  }

  /**
   * Wraps a provider (MockProvider in the harness): adds the raw port, serves `plans` and `payments` from this fake
   * (mapped with the real `{ adapterFor, fromRecord }` when given, else as stored), and refuses the table writes the
   * production build refuses for vouchers (`credit_lots` has no adapter; the `vouchers` table is the demo shape).
   */
  function wrap(inner, mapping = null) {
    const rows = { plans: () => state.products, payments: () => state.payments };
    const entityOf = { plans: 'product', payments: 'payment' };
    const read = (table) => (mapping ? rows[table]().map((r) => mapping.fromRecord(mapping.adapterFor(table), record(r))) : structuredClone(rows[table]()));
    const provider = Object.create(inner);
    provider.name = 'fake-company-os';
    provider.request = request;
    provider.list = async (table, q) => (rows[table] ? read(table) : inner.list(table, q));
    provider.peek = (table, q) => (rows[table] ? read(table) : inner.peek?.(table, q));
    provider.get = async (table, rowId) => (rows[table] ? read(table).find((r) => r.id === rowId) ?? null : inner.get(table, rowId));
    provider.subscribe = (table, cb) => {
      if (!rows[table] && table !== 'vouchers') return inner.subscribe(table, cb);
      listeners.set(table, new Set([...(listeners.get(table) ?? []), cb]));
      return () => listeners.get(table)?.delete(cb);
    };
    provider.insert = async (table, body) => {
      if (table === 'vouchers' || table === 'credit_lots' || entityOf[table]) throw refuse('not_in_launch');
      return inner.insert(table, body);
    };
    provider.emit = emitAll;
    return provider;
  }
  return { state, createVoucher, redeem, balance, request, wrap };
}

/** Fictional catalogue and payments in Company OS field names: two gift products, a retired gift, a pack, payments in every state. */
export const fixtures = {
  products: [
    { id: 'prd_gift1', key: 'gift_single', kind: 'gift', name: 'Regalo: 1 clase', credits: 1, price: 38000, validity_days: 60, active: true },
    { id: 'prd_gift12', key: 'gift_pack12', kind: 'gift', name: 'Regalo: 12 clases', credits: 12, price: 400000, validity_days: null, active: true },
    { id: 'prd_gift_off', key: 'gift_off', kind: 'gift', name: 'Regalo retirado', credits: 4, price: 100000, active: false },
    { id: 'prd_pack', key: 'pack_12', kind: 'pack', name: 'Paquete 12', credits: 12, price: 400000, active: true },
  ],
  payments: (notes) => [
    { id: 'pay_gift_ok', person: 'usr_c01', product: 'prd_gift12', status: 'approved', amount: 400000, date: '2026-11-01', notes },
    { id: 'pay_gift_pending', person: 'usr_c01', product: 'prd_gift1', status: 'pending', amount: 38000, date: '2026-11-01', notes },
    { id: 'pay_gift_declined', person: 'usr_c01', product: 'prd_gift1', status: 'declined', amount: 38000, date: '2026-11-01', notes },
    { id: 'pay_pack', person: 'usr_c01', product: 'prd_pack', status: 'approved', amount: 400000, date: '2026-11-01', notes: '' },
    { id: 'pay_gift_nostatus', person: 'usr_c01', product: 'prd_gift1', amount: 38000, date: '2026-11-01', notes },
    { id: 'pay_gift_nonotes', person: 'usr_c02', product: 'prd_gift1', status: 'approved', amount: 38000, date: '2026-11-01', notes: null },
  ],
};
