// A small in-memory Company OS for the H-5 tests: the routes the launch payment screens call, with the server rules
// they rely on (payments 2.6.0 price check at approval, status moves, receipt numbering; bookings 1.4.0 hold confirm and
// freeze; files upload/confirm; ADR 0038 settings; ADR 0040 Idempotency-Key replay). Fictional data only.
// It is NOT Company OS: it exists so the frontend's requests and its handling of answers can be checked offline.

const err = (code, status = 422) => Object.assign(new Error(code), { code, status });
const clone = (v) => JSON.parse(JSON.stringify(v));
const stable = (v) => JSON.stringify(v, (_, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));

/** Fields each entity stores; anything else in a write is dropped silently, like the real runtime. */
const FIELDS = {
  person: ['name', 'email', 'phone', 'user'],
  member: ['person', 'price_audience'],
  product: ['key', 'name', 'kind', 'price', 'tax_rate_percent', 'credits', 'validity_days', 'freezable', 'audience', 'active'],
  payment: ['person', 'product', 'amount', 'method', 'status', 'date', 'concept', 'reference', 'provider', 'notes', 'for_entity', 'for_id', 'price_override_reason'],
  booking: ['person', 'occurrence', 'status', 'entitlement', 'payment_method', 'hold_until', 'hold_frozen_at', 'hold_left_minutes'],
  invoice: ['kind', 'number', 'payment', 'person', 'product', 'total', 'issued_at'],
  file: ['owner_entity', 'owner_id', 'kind', 'status', 'mime', 'filename', 'size_bytes'],
};
const MOVES = { pending: ['approved', 'declined', 'voided'], approved: ['refunded', 'voided'] };

/** `productDates` / `approvedBy`: payments 2.7.0 (CO-6) is on; set false to act like 2.6.0. */
export function fakeCos({ productDates = true, approvedBy = true, users = {}, now = () => Date.now() } = {}) {
  const fields = clone(FIELDS);
  if (productDates) fields.product.push('valid_from', 'valid_until');
  if (approvedBy) fields.payment.push('approved_by', 'approved_at');
  const db = { person: [], member: [], product: [], payment: [], booking: [], invoice: [], file: [] };
  const keys = new Map();
  const settings = { review_hours: '', review_closed_dates: '', hold_minutes_transfer: 15, hold_minutes_desk: 60, reschedule_hours: 12, late_cancel_hours: 12, policy_as_of_booking: true, hold_frozen_while_payment_pending: true };
  const calls = [], uploads = new Map();
  let seq = 0, receiptNo = 0, me = 'usr_desk';
  const roleOf = (u) => users[u]?.role ?? 'front_desk';
  const id = (p) => `${p}_${String(++seq).padStart(4, '0')}`;
  const pick = (entity, data) => Object.fromEntries(Object.entries(data).filter(([k]) => fields[entity].includes(k)).map(([k, v]) => [k, v === '' ? null : v]));
  const rec = (entity, data, by = me) => ({ id: id(entity), data: pick(entity, data), createdAt: new Date(now() + seq).toISOString(), updatedAt: new Date(now()).toISOString(), createdBy: by });
  const myPersonId = () => db.person.find((p) => p.data.user === me)?.id;

  /** Like the API: a filter on a field the entity doesn't have is a 400 (pseudo-fields `id`, `created_by` allowed). */
  const checkFilter = (entity, f) => {
    if (!f || f.all) return;
    if (f.and || f.or) return (f.and ?? f.or).forEach((x) => checkFilter(entity, x));
    if (f.field !== 'id' && f.field !== 'created_by' && !fields[entity].includes(f.field)) throw err('invalid query', 400);
  };
  const test = (r, f) => {
    if (!f || f.all) return true;
    if (f.and) return f.and.every((x) => test(r, x));
    if (f.or) return f.or.some((x) => test(r, x));
    const v = f.field === 'id' ? r.id : r.data[f.field];
    const want = f.value && typeof f.value === 'object' && f.value.$me ? me : f.value;
    switch (f.op) {
      case 'eq': return v === want; case 'neq': return v !== want; case 'in': return want.includes(v);
      case 'gte': return v != null && v >= want; case 'lte': return v != null && v <= want; case 'gt': return v > want; case 'lt': return v < want;
      case 'contains': return typeof v === 'string' && v.toLowerCase().includes(String(want).toLowerCase());
      case 'is_null': return v == null; case 'is_not_null': return v != null;
      default: throw err('invalid query', 400);
    }
  };
  /** Row policies: a customer reads only their own person, member, payments, bookings and invoices. */
  const visible = (entity, r) => {
    if (roleOf(me) !== 'member') return true;
    const mine = myPersonId();
    if (entity === 'person') return r.data.user === me;
    if (['member', 'payment', 'booking', 'invoice'].includes(entity)) return r.data.person === mine;
    if (entity === 'file') return r.createdBy === me;
    return entity === 'product';
  };

  function paymentRules(before, after, by) {
    const product = after.product ? db.product.find((p) => p.id === after.product) : null;
    if (after.product && (!product || product.data.active === false) && (!before || before.product !== after.product)) throw err('product_inactive');
    if (!Number.isFinite(after.amount) || after.amount <= 0 || (product && !Number.isInteger(after.amount))) throw err('invalid_amount');
    if (['transfer', 'card_terminal'].includes(after.method) && !after.reference) throw err('reference_required');
    if (product?.data.audience) {
      const member = db.member.find((m) => m.data.person === after.person);
      if (!member || !product.data.audience.split(',').includes(member.data.price_audience)) throw err('audience_not_allowed');
    }
    const from = before?.status, to = after.status;
    if (!before && !['pending', 'approved', 'declined'].includes(to)) throw err('invalid_status_transition');
    if (before && from !== to && !(MOVES[from] ?? []).includes(to)) throw err('invalid_status_transition');
    const approving = to === 'approved' && from !== 'approved';
    if (approving && product && after.amount !== product.data.price) {
      if (!after.price_override_reason) throw err('amount_mismatch');
      if (before && before.price_override_reason === after.price_override_reason) throw err('reason_required');
    }
    if (before && before.status !== 'pending') { after.for_entity = before.for_entity; after.for_id = before.for_id; }
    // Server-set on approval (payments 2.7.0); a client value is never kept.
    if (fields.payment.includes('approved_by')) { if (approving) { after.approved_by = by; after.approved_at = new Date(now()).toISOString(); } else { after.approved_by = before?.approved_by ?? null; after.approved_at = before?.approved_at ?? null; } }
    if (after.for_entity === 'booking' && (!before || before.for_id !== after.for_id) && !db.booking.some((b) => b.id === after.for_id)) throw err('for_record_not_found');
    return { approving, product };
  }
  function afterPayment(r, approving, product) {
    const booking = r.data.for_entity === 'booking' ? db.booking.find((b) => b.id === r.data.for_id) : null;
    if (booking && booking.data.status === 'held') {
      if (approving) { booking.data.status = 'booked'; booking.data.hold_frozen_at = null; booking.data.hold_left_minutes = null; }
      else if (r.data.status === 'pending' && settings.hold_frozen_while_payment_pending && !booking.data.hold_frozen_at) {
        booking.data.hold_left_minutes = Math.max(0, Math.round((Date.parse(booking.data.hold_until) - now()) / 60000));
        booking.data.hold_frozen_at = new Date(now()).toISOString();
      } else if (r.data.status === 'declined' && booking.data.hold_frozen_at) {
        booking.data.hold_until = new Date(now() + (booking.data.hold_left_minutes ?? 0) * 60000).toISOString(); booking.data.hold_frozen_at = null; booking.data.hold_left_minutes = null;
      }
    }
    if (approving && product) db.invoice.push(rec('invoice', { kind: 'receipt', number: ++receiptNo, payment: r.id, person: r.data.person, product: product.id, total: r.data.amount, issued_at: new Date(now()).toISOString() }, 'server'));
  }

  function write(op, ids) {
    const data = op.data && Object.fromEntries(Object.entries(op.data).map(([k, v]) => [k, v && typeof v === 'object' && '$ref' in v ? ids[v.$ref] : v]));
    if (op.entity === 'invoice') throw err('invoice_system_managed');
    if (op.entity === 'file' && op.op === 'create') throw err('file_create_via_files_route');
    const role = roleOf(me);
    if (role === 'member' && !['payment', 'booking'].includes(op.entity)) throw err('forbidden', 403);
    if (role === 'front_desk' && op.entity === 'product') throw err('forbidden', 403);
    if (op.op === 'create') {
      const r = rec(op.entity, data);
      if (op.entity === 'payment') {
        r.data.status ??= 'approved'; r.data.provider ??= 'manual';
        if (role === 'member' && (r.data.status !== 'pending' || r.data.person !== myPersonId())) throw err('forbidden', 403);
        const { approving, product } = paymentRules(null, r.data, me);
        db.payment.push(r); afterPayment(r, approving, product);
      } else db[op.entity].push(r);
      return r.id;
    }
    const list = db[op.entity], r = list.find((x) => x.id === op.id);
    if (!r || !visible(op.entity, r)) throw err('not found', 404);
    if (op.ifMatch && r.data[op.ifMatch.field] !== op.ifMatch.value) throw err('ifMatch mismatch', 409);
    if (op.op === 'delete') { list.splice(list.indexOf(r), 1); return r.id; }
    const next = { ...r.data, ...pick(op.entity, data) };
    if (op.entity === 'payment') {
      // Hoy's member write policy on payment: own row AND status pending, checked on the stored row and on the result (ADR 0033).
      if (role === 'member' && (r.data.status !== 'pending' || next.status !== 'pending' || next.person !== myPersonId())) throw err('write_forbidden', 403);
      const { approving, product } = paymentRules(r.data, next, me);
      r.data = next; afterPayment(r, approving, product);
    } else if (op.entity === 'booking' && next.status === 'checked_in' && r.data.status === 'held') throw err('invalid_transition');
    else r.data = next;
    r.updatedAt = new Date(now()).toISOString();
    return r.id;
  }

  async function request(method, path, body, opts = {}) {
    calls.push({ method, path, body: clone(body ?? null), key: opts.idempotencyKey ?? null, as: me });
    if (method === 'GET' && path === '/me') return { user: { id: me } };
    if (method === 'GET' && path === '/members') return { members: Object.entries(users).map(([id, u]) => ({ id, name: u.name, email: `${id}@example.test` })) };
    if (method === 'POST' && path === '/query') {
      if (!db[body.entity]) throw err('unknown entity', 404);
      checkFilter(body.entity, body.filter);
      const rows = (db[body.entity] ?? []).filter((r) => visible(body.entity, r) && test(r, body.filter));
      return { data: clone(rows.slice(body.offset ?? 0, (body.offset ?? 0) + (body.limit ?? 100))) };
    }
    let m;
    if (method === 'GET' && (m = /^\/api\/(\w+)\/([\w-]+)$/.exec(path))) {
      const r = db[m[1]]?.find((x) => x.id === m[2]);
      if (!r || !visible(m[1], r)) throw err('not found', 404);
      return { data: clone(r) };
    }
    if (method === 'POST' && path === '/batch') {
      const key = opts.idempotencyKey;
      const sig = stable({ body, me });
      if (key) {
        if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw err('idempotency_key_invalid', 400);
        const prior = keys.get(key);
        if (prior) { if (prior.sig !== sig) throw err('idempotency_conflict', 409); return { ...clone(prior.answer), replayed: true }; }
      }
      const snapshot = JSON.stringify(db), counter = [seq, receiptNo];
      try {
        const ids = [];
        body.ops.forEach((op, i) => { try { ids.push(write(op, ids)); } catch (e) { e.opIndex = i; throw e; } });
        const answer = { ids };
        if (key) keys.set(key, { sig, answer });
        return clone(answer);
      } catch (e) { Object.assign(db, JSON.parse(snapshot)); [seq, receiptNo] = counter; throw e; }
    }
    if (method === 'POST' && path === '/files') {
      const owner = db[body.ownerEntity]?.find((x) => x.id === body.ownerId);
      if (!owner || !visible(body.ownerEntity, owner)) throw err('file_owner_not_found');
      if (!['image/png', 'image/jpeg'].includes(body.mime)) throw err('file_type_not_allowed');
      if (body.sizeBytes > 10 * 1024 * 1024) throw err('file_too_large');
      const f = rec('file', { owner_entity: body.ownerEntity, owner_id: body.ownerId, kind: body.kind, status: 'pending', mime: body.mime, filename: body.filename, size_bytes: body.sizeBytes });
      db.file.push(f);
      return { file: clone(f), uploadUrl: `https://storage.example.test/upload/${f.id}` };
    }
    if (method === 'POST' && (m = /^\/files\/([\w-]+)\/confirm$/.exec(path))) {
      const f = db.file.find((x) => x.id === m[1]);
      if (!f) throw err('not found', 404);
      if (f.data.status !== 'pending') throw err('file_not_pending', 409);
      if (!uploads.has(f.id)) throw err('file_upload_missing', 409);
      f.data.status = 'ready';
      return { file: clone(f) };
    }
    if (path === '/modules/bookings/settings') {
      if (roleOf(me) !== 'super_admin') throw err('forbidden', 403);
      if (method === 'PATCH') {
        for (const [k, v] of Object.entries(body.settings)) {
          if (!(k in settings)) throw err('invalid_settings');
          if (typeof v === 'number' && v < 0) throw err('invalid_settings');
          settings[k] = v;
        }
      }
      return { module: 'bookings', version: '1.4.0', settings: clone(settings) };
    }
    throw err(`no route ${method} ${path}`, 404);
  }
  /** The browser's PUT of the bytes to the upload link (Supabase in production). */
  const put = async (url, init) => { uploads.set(url.split('/').pop(), init.body); return { ok: true, status: 200 }; };
  return {
    db, calls, settings, put, request,
    fileBlob: async (fileId) => new Blob([uploads.get(fileId) ?? new Uint8Array()], { type: 'image/png' }),
    as(user) { me = user; return this; },
    seed(entity, data, by = 'usr_admin') { const r = rec(entity, data, by); db[entity].push(r); return r; },
    keyCount: () => keys.size,
  };
}
