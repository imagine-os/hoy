import type { DataProvider } from '../../data/types';
import type { NotificationPrefRow, UserRow } from '../../data/schema';
import { tenant } from '../../tenant/tenant';
import { PRODUCTION_BUILD } from '../../config/launch';

/**
 * The channels a person sets per category. Production: Company OS comms `notification_pref` (no row = enabled; the
 * server honours an opt-out when it sends). Hoy's tenant sends `email` and `in_app` (the review build's `push` is the
 * in-app notice); WhatsApp messages are sent by hand (`wa.me`, R-04), and the choice is kept for them.
 */
export const NOTIF_CHANNELS: readonly NotifChannel[] = PRODUCTION_BUILD ? ['whatsapp', 'email', 'in_app'] : ['whatsapp', 'email', 'push'];
export const NOTIF_CATEGORIES = ['bookings', 'waitlist', 'payments', 'events', 'marketing'] as const;
export type NotifChannel = 'whatsapp' | 'email' | 'push' | 'in_app';
export type NotifCategory = (typeof NOTIF_CATEGORIES)[number];
export interface PreferenceActor { userId: string; role: string }
export interface PreferenceRequest { requestId: string; channel: NotifChannel; category: NotifCategory | null; enabled: boolean; expected: string }
interface Receipt { version: 1; status: 'saved'; fingerprint: string; actorId: string; tenantId: string; ids: string[] }
const categories = (request: Pick<PreferenceRequest,'category'>): readonly NotifCategory[] => request.category === null ? NOTIF_CATEGORIES : [request.category];
function guard(data: DataProvider, actor: PreferenceActor) {
  if (!data.atomic) throw Error('prefs_disconnected');
  if (!['customer','teacher','super_admin'].includes(actor.role) || !actor.userId) throw Error('prefs_scope');
}
export async function readOwnPreferences(data: DataProvider, actor: PreferenceActor): Promise<NotificationPrefRow[]> {
  guard(data, actor);
  const account = await data.get<UserRow>('users', actor.userId);
  if (!account || account.id !== actor.userId || account.tenant_id !== tenant.id) throw Error('prefs_missing');
  const all = await data.list<NotificationPrefRow>('notification_prefs', { where: { tenant_id: tenant.id, user_id: actor.userId } });
  // Company OS categories are free text: a row for a category or channel this page doesn't show (written by comms or the
  // desk) is not this page's to judge, so production leaves it out instead of failing the page.
  const rows = PRODUCTION_BUILD ? all.filter((r) => NOTIF_CHANNELS.includes(r.channel) && NOTIF_CATEGORIES.includes(r.category)) : all;
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.tenant_id !== tenant.id || row.user_id !== actor.userId || !NOTIF_CHANNELS.includes(row.channel) || !NOTIF_CATEGORIES.includes(row.category) || typeof row.enabled !== 'boolean') throw Error('prefs_scope');
    const key = `${row.channel}:${row.category}`;
    if (seen.has(key)) throw Error('prefs_ambiguous');
    seen.add(key);
  }
  return rows;
}
export function preferenceRevision(rows: NotificationPrefRow[], request: Pick<PreferenceRequest,'channel'|'category'>): string {
  return JSON.stringify(categories(request).map(category => {
    const row = rows.find(r => r.channel === request.channel && r.category === category);
    return [category, row?.id ?? null, row?.enabled ?? true];
  }));
}
async function digest(value: unknown) {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(result)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
/** One atomic write per change (Company OS: one keyed `/batch`); the server applies the opt-out when it sends. */
export async function savePreferences(data: DataProvider, actor: PreferenceActor, input: PreferenceRequest, cancelled:()=>boolean=()=>false, options:{failAfterWrites?:number}={}) {
  guard(data, actor);
  const check = () => { if (cancelled()) throw Error('prefs_cancelled'); };
  if (!NOTIF_CHANNELS.includes(input.channel) || input.category !== null && !NOTIF_CATEGORIES.includes(input.category) || typeof input.enabled !== 'boolean' || !input.requestId || input.requestId.length > 128 || typeof input.expected !== 'string') throw Error('prefs_invalid');
  check();const now=await readOwnPreferences(data,actor);check();
  // Production: Company OS re-runs this callback on a retry, so a retry after a lost answer that committed finds the
  // choice already stored. That is the same request succeeding, not a stale one.
  if(PRODUCTION_BUILD&&categories(input).every(category=>(now.find(r=>r.channel===input.channel&&r.category===category)?.enabled??true)===input.enabled))return { status:'saved' as const };
  const fingerprint = await digest({ actor, input });check();
  const result = await data.atomic!(async tx => {
    check();const rows = await readOwnPreferences(tx,actor);check();
    if (preferenceRevision(rows,input) !== input.expected) throw Error('prefs_stale');
    const ids:string[]=[];
    for (const category of categories(input)) {
      check();const existing = rows.find(r=>r.channel===input.channel&&r.category===category);
      const row = existing ? await tx.update<NotificationPrefRow>('notification_prefs',existing.id,{enabled:input.enabled}) : await tx.insert<NotificationPrefRow>('notification_prefs',{user_id:actor.userId,tenant_id:tenant.id,channel:input.channel,category,enabled:input.enabled});
      ids.push(row.id);check();
    }
    return { version:1,status:'saved',fingerprint,actorId:actor.userId,tenantId:tenant.id,ids } satisfies Receipt;
  },{ idempotencyKey:`notification-prefs_${actor.userId}_${input.requestId}`,...options });
  check();
  if (!result || result.version!==1 || result.status!=='saved' || result.fingerprint!==fingerprint || result.actorId!==actor.userId || result.tenantId!==tenant.id || !Array.isArray(result.ids) || result.ids.length!==categories(input).length || result.ids.some(id=>typeof id!=='string'||!id) || new Set(result.ids).size!==result.ids.length) throw Error('prefs_replay_conflict');
  // Generic transaction replay skips its callback: fresh scope/existence/readback checks remain mandatory.
  const current = await readOwnPreferences(data,actor);check();
  for (const [index,category] of categories(input).entries()) {
    const row=current.find(r=>r.channel===input.channel&&r.category===category);
    if (!row || row.id!==result.ids[index] || row.enabled!==input.enabled) throw Error('prefs_stale');
  }
  return { status:'saved' as const };
}
