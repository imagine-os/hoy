import type { PaymentRow } from './schema';
import { readPaymentQuote, type FrozenSaleQuote } from './operationalQuotes';

/** Optional browser-demo metadata. Missing metadata on historical payments stays missing. */
export interface PendingDeskIntent {
  version: 1; kind: 'booking'; tenantId: string; customerId: string;
  sessionId: string; matNumber: number | null; planId: string;
  quoteFingerprint: string; requestKey: string;
}
export interface DeskIntentScope { tenantId: string; customerId: string; sessionId: string; matNumber: number | null; planId: string }
const nonempty = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.length <= 4096;
const validScope = (s: DeskIntentScope) => [s.tenantId,s.customerId,s.sessionId,s.planId].every(nonempty) && (s.matNumber === null || Number.isSafeInteger(s.matNumber) && s.matNumber > 0);
const key = (s: DeskIntentScope) => `desk:${JSON.stringify([s.tenantId,s.customerId,s.sessionId,s.matNumber,s.planId])}`;
/** Canonical JSON prevents object key order from changing the accepted quote identity. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string,unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function makePendingDeskIntent(scope: DeskIntentScope, quote: FrozenSaleQuote): PendingDeskIntent {
  if (!validScope(scope) || quote.tenantId !== scope.tenantId || quote.planId !== scope.planId || quote.kind !== 'class' || quote.quantity !== 1) throw Error('desk_intent_scope');
  return { version:1,kind:'booking',...scope,quoteFingerprint:canonical(quote),requestKey:key(scope) };
}
export function readPendingDeskIntent(payment: PaymentRow): PendingDeskIntent | null {
  const raw = payment.frontend_desk_intent;
  if (raw === undefined) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('desk_intent_invalid');
  const i=raw as PendingDeskIntent, quote=readPaymentQuote(payment);
  if (i.version!==1 || i.kind!=='booking' || !validScope(i) || i.tenantId!==payment.tenant_id || i.customerId!==payment.user_id || i.planId!==payment.plan_id
    || !quote || quote.kind!=='class' || quote.quantity!==1 || i.quoteFingerprint!==canonical(quote) || i.requestKey!==key(i)) throw Error('desk_intent_invalid');
  return {version:1,kind:'booking',tenantId:i.tenantId,customerId:i.customerId,sessionId:i.sessionId,matNumber:i.matNumber,planId:i.planId,quoteFingerprint:i.quoteFingerprint,requestKey:i.requestKey};
}
/** Scoped pending reconciliation: never reinterpret old product-only rows or silently replace a conflict. */
export function findPendingDeskRequest(rows: PaymentRow[], scope: DeskIntentScope): PaymentRow | null {
  if (!validScope(scope)) throw Error('desk_intent_scope');
  const matches: PaymentRow[]=[];
  for (const row of rows) {
    if (row.tenant_id!==scope.tenantId || row.user_id!==scope.customerId || row.status!=='pending' || row.provider!=='manual' || row.method!=='cash') continue;
    const intent=readPendingDeskIntent(row);
    if (!intent || intent.sessionId!==scope.sessionId) continue;
    if (intent.planId!==scope.planId || intent.matNumber!==scope.matNumber) throw Error('desk_intent_conflict');
    matches.push(row);
  }
  if (matches.length>1) throw Error('desk_intent_duplicate');
  return matches[0]??null;
}
