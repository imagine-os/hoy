import { createHash } from 'node:crypto';

const checkoutBase = 'https://checkout.wompi.co/p/';
const apiBase = 'https://sandbox.wompi.co/v1/';
const sandboxPublic = /^pub_test_[a-zA-Z0-9_]{8,128}$/;
const sandboxIntegrity = /^test_integrity_[a-zA-Z0-9_]{8,128}$/;
const sandboxPrivate = /^prv_test_[a-zA-Z0-9_]{8,128}$/;
const referencePattern = /^hoy-test-[a-zA-Z0-9_-]{1,80}$/;
const transactionPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,127}$/;
const states = new Set(['PENDING','APPROVED','DECLINED','VOIDED','ERROR']);

function validQuote(quote) {
  return typeof quote?.id === 'string' && referencePattern.test(quote.id)
    && quote.currency === 'COP' && Number.isSafeInteger(quote.amountInCents)
    && quote.amountInCents > 0;
}

// This accepts a persisted, server-owned quote, never browser-submitted amounts.
// Not mounted in a route. No collection of card data or customer information.
export function checkoutForQuote(quote, { publicKey, integrityKey, now = Date.now } = {}) {
  const time = Date.parse(quote?.expiresAt);
  if (!validQuote(quote) || !sandboxPublic.test(publicKey ?? '')
    || !sandboxIntegrity.test(integrityKey ?? '') || !Number.isFinite(time)
    || new Date(time).toISOString() !== quote.expiresAt || time <= now())
    throw Error('checkout_unavailable');
  const signature = createHash('sha256')
    .update(quote.id + quote.amountInCents + quote.currency + quote.expiresAt + integrityKey)
    .digest('hex');
  const checkout = new URL(checkoutBase);
  checkout.search = new URLSearchParams({
    'public-key': publicKey, currency: quote.currency,
    'amount-in-cents': String(quote.amountInCents), reference: quote.id,
    'expiration-time': quote.expiresAt, 'signature:integrity': signature
  }).toString();
  return checkout.href;
}

// Caller must match the quote to a verified customer and tenant, and atomically
// process this result at most once. This adapter cannot change any payment record.
export async function checkSandboxTransaction(id, quote, { privateKey, request = fetch } = {}) {
  const denial = () => new Error('sandbox_transaction_unverified');
  if (!validQuote(quote) || typeof id !== 'string' || !transactionPattern.test(id)
    || !sandboxPrivate.test(privateKey ?? '')) throw denial();
  try {
    const response = await request(new URL('transactions/' + encodeURIComponent(id), apiBase), {
      method:'GET', redirect:'error', signal:AbortSignal.timeout(5000),
      headers: { Accept:'application/json', Authorization:'Bearer '+privateKey }
    });
    if (!response.ok || !response.body || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel().catch(() => {});
      throw denial();
    }
    const reader=response.body.getReader(), chunks=[];
    let size=0;
    try {
      for (;;) {
        const {value,done}=await reader.read();
        if(done) break;
        size+=value.byteLength;
        if(size>128*1024) throw denial();
        chunks.push(value);
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const tx = JSON.parse(Buffer.concat(chunks).toString('utf8'))?.data;
    if (!tx || tx.id!==id || tx.reference!==quote.id || tx.amount_in_cents!==quote.amountInCents
      || tx.currency!==quote.currency || !states.has(tx.status)) throw denial();
    return {id,status:tx.status};
  } catch { throw denial(); }
}
