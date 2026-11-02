import { useEffect, useSyncExternalStore } from 'react';
import { consentReadFrom, type ConsentRead } from './companyOsIdentity';

/**
 * Lane r2hoy2 (r2co2 contract): has this login, which holds the customer role, accepted the studio's documents? Company OS
 * says it in `GET /t/:t/signup` `registered`. Read once per login and tab (this cache; a reload reads again, though a deferral made in this browser session holds), only where
 * RequireRole asks (`consentCheckApplies`: the customer area, never a frame or a view-as), and it never keeps the customer
 * area closed: a failed read, an error status, an older Company OS without the flag, or no answer within
 * `CONSENT_READ_TIMEOUT_MS` passes (fail open, as before this lane) and is logged once. Why fail open: the consent is not
 * a server gate (Company OS tech-debt #74: nothing refuses a granted login that hasn't signed up), so a missing answer
 * must not lock a paying customer out of their bookings; the next session asks again.
 */
export const CONSENT_READ_TIMEOUT_MS = 4000;

const reads = new Map<string, Promise<ConsentRead>>();
const known = new Map<string, ConsentRead>();
/**
 * Review (C-01d): logins that chose "Continue for now". A later read for one of them that can't tell (failed, timed out,
 * an older Company OS) keeps the hold instead of failing open; only a recorded consent (`settleConsent`), a registered
 * answer or sign-up closed lift it. Viewing stays open either way.
 *
 * Owner 2026-11-03: the deferral lasts for the browser session, not just this module's memory: a reload or a new tab
 * keeps the hold. It is kept in `sessionStorage` under `DEFERRED_KEY` (a `hoyos.*` key, so the sign-out sweep removes it
 * too, IN-145) as a list of login ids only, no personal data. Every read and write is guarded: when storage throws or is
 * missing, the memory set alone holds it (this tab, as before).
 */
export const DEFERRED_KEY = 'hoyos.consent.deferred';
const memoryDeferred = new Set<string>();
const storage = (): Storage | null => { try { return (globalThis as { sessionStorage?: Storage }).sessionStorage ?? null; } catch { return null; } };
function storedLogins(): string[] {
  try {
    const raw = storage()?.getItem(DEFERRED_KEY);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
  } catch { return []; }
}
function storeLogins(ids: string[]): void {
  try {
    const st = storage();
    if (!st) return;
    if (ids.length) st.setItem(DEFERRED_KEY, JSON.stringify(ids)); else st.removeItem(DEFERRED_KEY);
  } catch { /* storage blocked or full: memory holds it for this tab */ }
}
const deferredLogins = {
  has: (id: string) => memoryDeferred.has(id) || storedLogins().includes(id),
  add: (id: string) => { memoryDeferred.add(id); const ids = storedLogins(); if (!ids.includes(id)) storeLogins([...ids, id]); },
  delete: (id: string) => { memoryDeferred.delete(id); const ids = storedLogins(); if (ids.includes(id)) storeLogins(ids.filter((x) => x !== id)); },
  clear: () => { memoryDeferred.clear(); storeLogins([]); },
};
/**
 * Logins whose hold notice's Retry asked for the consent step again (this tab). For a deferred login a "not registered"
 * answer keeps the hold (a reload must not bring the step back), except after Retry, which is the person asking for it.
 */
const retrying = new Set<string>();
const keepsHold = (userId: string, read: ConsentRead | 'timeout') =>
  deferredLogins.has(userId) && (read === 'timeout'
    || read.step === 'pass' && (read.reason === 'failed' || read.reason === 'unknown' || read.reason === 'deferred')
    || read.step === 'ask' && !retrying.has(userId));
const DEFERRED: ConsentRead = { step: 'pass', reason: 'deferred' };
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

/** A call that may never answer (fetch has no timeout): its answer, or `'timeout'` after `ms`. */
export function withTimeout<T>(call: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([call, new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), ms); })]).finally(() => clearTimeout(timer));
}

export interface ConsentReadOptions { timeoutMs?: number; log?: (...args: unknown[]) => void }

/** The login's consent read: the cached one, or one `GET /signup` through `fetcher`. Never rejects. */
export function readConsent(userId: string, fetcher: () => Promise<{ status: number; body: unknown }>, { timeoutMs = CONSENT_READ_TIMEOUT_MS, log = console.warn }: ConsentReadOptions = {}): Promise<ConsentRead> {
  const cached = reads.get(userId);
  if (cached) return cached;
  const failed: ConsentRead = { step: 'pass', reason: 'failed' };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wait = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), timeoutMs); });
  const read = Promise.race([fetcher().then((r) => ({ r }), (error: unknown) => ({ error })), wait]).then((out) => {
    clearTimeout(timer);
    if (out === 'timeout') { log(`[signup] GET /signup gave no answer in ${timeoutMs} ms; the customer area opens without the consent check`); return failed; }
    if ('error' in out) { log('[signup] GET /signup failed; the customer area opens without the consent check:', (out.error as Error)?.message ?? out.error); return failed; }
    const result = consentReadFrom(out.r.status, out.r.body);
    if (result.step === 'pass' && result.reason === 'failed') log(`[signup] GET /signup answered ${out.r.status}; the customer area opens without the consent check`);
    if (result.step === 'pass' && result.reason === 'unknown') log('[signup] GET /signup has no registered flag (Company OS before people 1.9.0); the consent check is skipped');
    return result;
  }).then((result) => {
    if (keepsHold(userId, result)) return DEFERRED;
    if (result.step === 'pass') deferredLogins.delete(userId);
    return result;
  });
  reads.set(userId, read);
  void read.then((result) => { if (reads.get(userId) === read) { known.set(userId, result); notify(); } });
  return read;
}

/** The login's consent read once it has answered (undefined while it hasn't, or was never asked). */
export const peekConsent = (userId: string): ConsentRead | undefined => known.get(userId);

/** The login signed up (201, or `already_registered` with `/me` holding the role): it passes for the rest of the session. */
export function settleConsent(userId: string): void {
  deferredLogins.delete(userId);
  retrying.delete(userId);
  const done: ConsentRead = { step: 'pass', reason: 'registered' };
  reads.set(userId, Promise.resolve(done));
  known.set(userId, done);
  notify();
}

/**
 * Decision C-01d (owner 2026-11-02, replacing C-01c's "book anyway"): the consent step could not be recorded and the
 * person chose "Continue for now". The customer area opens for the rest of the session (existing bookings, balance,
 * account), but every new booking or purchase entry shows "record your consent to book" (`consentDeferred`).
 */
export function deferConsent(userId: string): void {
  deferredLogins.add(userId);
  retrying.delete(userId);
  reads.set(userId, Promise.resolve(DEFERRED));
  known.set(userId, DEFERRED);
  notify();
}

/**
 * The consent step's own Retry read ended without a step to show (passed, or no answer in time). The page opens (fail
 * open for viewing), but a login that had deferred keeps its hold unless the answer lifts it (registered, closed).
 */
export function passAfterRead(userId: string, read: ConsentRead | 'timeout'): void {
  if (keepsHold(userId, read)) deferConsent(userId); else settleConsent(userId);
}

/** New bookings and purchases wait for the consent (C-01d). Display only: Company OS doesn't refuse them yet (#74). */
export function consentDeferred(userId: string): boolean {
  const answer = known.get(userId);
  // Not read yet in this tab (a reload, a new tab, a page without the guard): the browser session's deferral holds.
  if (answer === undefined) return !retrying.has(userId) && deferredLogins.has(userId);
  return answer.step === 'pass' && answer.reason === 'deferred';
}

/**
 * The hold notice's Retry: forget this login's answer, so the guard of the page it stands on reads `GET /signup` again
 * (bounded) and shows the consent step; recording it (`settleConsent`) lifts the hold. A read that can't tell keeps it.
 */
export function retryConsent(userId: string): void {
  retrying.add(userId);
  reads.delete(userId);
  known.delete(userId);
  notify();
}

/** Whether this login's new bookings and purchases are held (C-01d), kept current. */
export function useConsentDeferred(userId: string): boolean {
  return useSyncExternalStore(subscribeConsent, () => consentDeferred(userId));
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Tests only: forget every read. */
export function resetConsentReads(): void { reads.clear(); known.clear(); deferredLogins.clear(); retrying.clear(); }

/**
 * Sign-out (IN-145: nothing of one person stays for the next): forget every consent read and deferral, in memory and in
 * the browser session's storage. `ProductionSession`'s clean-up calls it.
 */
export function clearConsentOnSignOut(): void { resetConsentReads(); notify(); }

/**
 * RequireRole's view of the check: `null` when it doesn't apply, `'pending'` while the read is out (at most
 * `CONSENT_READ_TIMEOUT_MS`), then the answer.
 */
export function useConsentRead(applies: boolean, userId: string, fetcher: (() => Promise<{ status: number; body: unknown }>) | null): ConsentRead | 'pending' | null {
  const answer = useSyncExternalStore(subscribeConsent, () => known.get(userId));
  // `answer` too (C-01d): the hold notice's Retry forgets the answer (`retryConsent`), and the guard reads again.
  useEffect(() => { if (applies && fetcher && !reads.has(userId)) void readConsent(userId, fetcher); }, [applies, userId, fetcher, answer]);
  if (!applies || !fetcher) return null;
  return answer ?? 'pending';
}
