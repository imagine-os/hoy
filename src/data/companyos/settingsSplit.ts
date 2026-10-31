/**
 * The studio settings split (decision F-01, lane H2). Hoy saves its settings as one JSON object (`tenants.settings`,
 * `src/modules/admin/settings.ts`); Company OS keeps it as two comms `setting` records so that row policies can keep
 * the pay data from every role but Administration and Finance, and from the signed-out site:
 * - `studio_settings`: everything a customer, a teacher or a visitor may see (profile, hours, policies, transfer
 *   instructions, the contacts customers are routed to…);
 * - `studio_private`: the payroll (rate card, payout method, signer), the integrations, and the staff-only contacts.
 * Pure functions, so the provider and the tests share them.
 */
export const PUBLIC_SETTINGS_KEY = 'studio_settings';
export const PRIVATE_SETTINGS_KEY = 'studio_private';
/** Whole sections that are private. */
export const PRIVATE_SECTIONS = ['payroll', 'integrations'] as const;
/** WhatsApp contact intents only staff are routed to (src/tenant/contacts.ts): teacher payroll, coordination, owner. */
export const PRIVATE_CONTACTS = ['payroll', 'coordinator', 'owner'] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

/** One settings object → its public part and its private part (empty parts are `{}`). */
export function splitSettings(all: unknown): { pub: Obj; priv: Obj } {
  const pub: Obj = {};
  const priv: Obj = {};
  if (!isObj(all)) return { pub, priv };
  for (const [key, value] of Object.entries(all)) {
    if ((PRIVATE_SECTIONS as readonly string[]).includes(key)) { priv[key] = value; continue; }
    if (key === 'contacts' && isObj(value)) {
      const open: Obj = {};
      const staff: Obj = {};
      for (const [intent, route] of Object.entries(value)) ((PRIVATE_CONTACTS as readonly string[]).includes(intent) ? staff : open)[intent] = route;
      if (Object.keys(open).length) pub.contacts = open;
      if (Object.keys(staff).length) priv.contacts = staff;
      continue;
    }
    pub[key] = value;
  }
  return { pub, priv };
}

/** The two records' values → the one settings object (the private record wins; contacts merge by intent). */
export function mergeSettingsRecords(pubValue: unknown, privValue: unknown): Obj {
  const pub = isObj(pubValue) ? pubValue : {};
  const priv = isObj(privValue) ? privValue : {};
  const out: Obj = { ...pub, ...priv };
  if (isObj(pub.contacts) || isObj(priv.contacts)) out.contacts = { ...(isObj(pub.contacts) ? pub.contacts : {}), ...(isObj(priv.contacts) ? priv.contacts : {}) };
  return out;
}

/** Stable comparison of two JSON values (key order ignored). */
export function sameJson(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown => (Array.isArray(v) ? v.map(norm) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm(v[k])])) : v ?? null);
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}
