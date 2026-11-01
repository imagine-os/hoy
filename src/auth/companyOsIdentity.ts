import type { Role } from './roles';

/**
 * Production identity rules (H-2, CU-01…CU-04, PL-04), kept pure so they are tested without a browser or Clerk.
 *
 * - The role comes from Company OS `GET /t/:t/me` (`roleKeys`, `isSuperAdmin`), never from the browser. `ROLE_KEYS` is
 *   the one table of Hoy's recipe role keys and the app role each opens; an unknown key opens nothing (fail closed).
 * - A Clerk session that is not yet a member of the tenant (`403 no access to this tenant` / `account_not_invited`)
 *   must finish sign-up: `POST /t/:t/signup` with name, WhatsApp and the required consents (ADR 0038).
 * - `caps` are carried for screen gates; the role key decides the screens.
 */

/**
 * Company OS role key → HoyOS role (`src/auth/roles.ts`), in primary order: a person holding several roles works as
 * the first one listed here. The order is the widest studio access first:
 * Administration, Super admin, Coordinator, Finance, Front desk, Marketing, Maintenance, Developer, Teacher, Customer.
 * Administration comes before Super admin because every Administration login also holds the tenant `super_admin`
 * membership (decision AD-04: Company OS needs it for module settings and the team routes), so a person with both is
 * Administration; Super admin is a `super_admin` login without `administrator` (or a platform operator).
 * `super_admin` counts only with `/me` `isSuperAdmin` (the flag Company OS computes from that membership).
 * `public_site` (ADR 0029, the signed-out site's service identity) is never a user role and is not listed.
 */
export const ROLE_KEYS: readonly { key: string; role: Role }[] = Object.freeze([
  { key: 'administrator', role: 'admin' },
  { key: 'super_admin', role: 'super_admin' },
  { key: 'booking_manager', role: 'coordinator' },
  { key: 'treasurer', role: 'finance' },
  { key: 'front_desk', role: 'front_desk' },
  { key: 'marketing', role: 'marketing' },
  { key: 'maintenance', role: 'maintenance' },
  { key: 'developer', role: 'developer' },
  { key: 'coach', role: 'teacher' },
  { key: 'member', role: 'customer' },
] as const);
/** Company OS role key → HoyOS role. A null-prototype map, so `__proto__` or `toString` are not keys. */
export const ROLE_OF_KEY: Readonly<Record<string, Role>> = Object.freeze(Object.assign(Object.create(null) as Record<string, Role>, Object.fromEntries(ROLE_KEYS.map((r) => [r.key, r.role]))));
/** HoyOS role → its Company OS role key (`public` has none). */
export const KEY_OF_ROLE: Readonly<Partial<Record<Role, string>>> = Object.freeze(Object.fromEntries(ROLE_KEYS.map((r) => [r.role, r.key])));

export interface MeInfo {
  userId: string;
  name: string;
  email: string;
  roleKeys: string[];
  isSuperAdmin: boolean;
  caps: string[];
}

const str = (v: unknown, max = 320): string | null => (typeof v === 'string' && v.length <= max ? v : null);

/** Keeps only the fields the frontend uses; null when the shape is not a `/me` answer. */
export function parseMe(raw: unknown): MeInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  const user = v.user && typeof v.user === 'object' ? v.user as Record<string, unknown> : null;
  const userId = str(user?.id, 128);
  if (!userId || !Array.isArray(v.roleKeys)) return null;
  return {
    userId,
    name: str(user?.name, 200) ?? '',
    email: str(user?.email) ?? '',
    roleKeys: v.roleKeys.filter((k): k is string => typeof k === 'string'),
    isSuperAdmin: v.isSuperAdmin === true,
    caps: Array.isArray(v.caps) ? v.caps.filter((c): c is string => typeof c === 'string') : [],
  };
}

/** The HoyOS role for a `/me` answer (its primary role, `ROLE_KEYS` order), or null when no key opens a role. */
export function roleFromMe(me: MeInfo): Role | null {
  const held = (key: string) => (key === 'super_admin' ? me.isSuperAdmin : me.roleKeys.includes(key));
  const hit = ROLE_KEYS.find((r) => held(r.key));
  if (hit) return hit.role;
  // A platform operator: `isSuperAdmin` without a tenant membership.
  return me.isSuperAdmin ? 'super_admin' : null;
}

/**
 * Every HoyOS role the login holds (test-hoy fixes, lane Y2), in primary order: the first is `roleFromMe`. A staff
 * member who also takes classes holds `customer` too (one email, owner 2026-11-01), and the customer area opens for
 * them. AD-04's technical `super_admin` membership of an Administration login is not a role it works as.
 */
export function rolesFromMe(me: MeInfo): Role[] {
  const primary = roleFromMe(me);
  if (!primary) return [];
  const held = (key: string) => (key === 'super_admin' ? me.isSuperAdmin : me.roleKeys.includes(key));
  const roles = ROLE_KEYS.filter((r) => held(r.key)).map((r) => r.role).filter((r) => !(r === 'super_admin' && primary === 'admin'));
  return roles.length ? roles : [primary];
}

/** The session's `isSuperAdmin`: `/me` says so and the person works as Super admin (not an AD-04 Administration). */
export const isSuperAdminMe = (me: MeInfo): boolean => me.isSuperAdmin && roleFromMe(me) === 'super_admin';

export type MeResult =
  | { kind: 'member'; me: MeInfo }
  | { kind: 'not-member' }
  | { kind: 'unverified' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; code: string };

const errorOf = (body: unknown): string => {
  const e = body && typeof body === 'object' ? (body as Record<string, unknown>).error : undefined;
  return typeof e === 'string' ? e : '';
};

export function classifyMe(status: number, body: unknown): MeResult {
  if (status === 200) { const me = parseMe(body); return me ? { kind: 'member', me } : { kind: 'error', code: 'me_invalid' }; }
  const code = errorOf(body);
  if (status === 401) return { kind: 'unauthorized' };
  if (status === 403 && code === 'email_not_verified') return { kind: 'unverified' };
  if (status === 403 && (code === 'account_not_invited' || code === 'no access to this tenant')) return { kind: 'not-member' };
  return { kind: 'error', code: code || `http_${status}` };
}

// ---------------------------------------------------------------------------------------------
// Sign-up (ADR 0038)
// ---------------------------------------------------------------------------------------------

export interface SignupConsent { document: string; version: string }
export interface SignupConfig { enabled: boolean; consents: SignupConsent[]; personFields: string[]; facetFields: string[] }

const parseConsents = (x: unknown): SignupConsent[] => Array.isArray(x) ? x.flatMap((c) => {
  const d = c && typeof c === 'object' ? c as Record<string, unknown> : {};
  return typeof d.document === 'string' && typeof d.version === 'string' ? [{ document: d.document, version: d.version }] : [];
}) : [];

export function parseSignupConfig(raw: unknown): SignupConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  if (v.enabled !== true) return v.enabled === false ? { enabled: false, consents: [], personFields: [], facetFields: [] } : null;
  const list = (x: unknown) => Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : [];
  const consents = parseConsents(v.consents);
  const personFields = list(v.personFields);
  // CU-01 needs name and WhatsApp on the person: a tenant that does not accept them cannot sign people up here.
  if (!personFields.includes('name') || !personFields.includes('phone')) return { enabled: false, consents: [], personFields: [], facetFields: [] };
  return { enabled: true, consents, personFields, facetFields: list(v.facetFields) };
}

/** What the customer types. Email is not here: Company OS takes the verified email from the Clerk session. */
export interface SignupForm { name: string; whatsapp: string; ecName: string; ecPhone: string; accepted: boolean }
export const SIGNUP_FORM_LIMITS = Object.freeze({ name: 200, whatsapp: 40, ecName: 200, ecPhone: 40 });

const digits = (s: string) => s.replace(/\D/g, '');
/** A reachable WhatsApp/phone: 10–15 digits with an optional leading +, spaces and dashes. */
export const isPhoneNumber = (s: string) => /^\+?[\d\s().-]+$/.test(s.trim()) && digits(s).length >= 10 && digits(s).length <= 15;

export type SignupField = keyof SignupForm;
export function signupFormErrors(form: SignupForm, config: SignupConfig): Partial<Record<SignupField, 'required' | 'tooLong' | 'phone' | 'consent'>> {
  const errors: Partial<Record<SignupField, 'required' | 'tooLong' | 'phone' | 'consent'>> = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = 'required'; else if (name.length > SIGNUP_FORM_LIMITS.name) errors.name = 'tooLong';
  if (form.whatsapp.trim().length > SIGNUP_FORM_LIMITS.whatsapp) errors.whatsapp = 'tooLong'; else if (!isPhoneNumber(form.whatsapp)) errors.whatsapp = 'phone';
  if (asksEmergencyContact(config)) {
    const ec = form.ecName.trim();
    if (ec.length < 2) errors.ecName = 'required'; else if (ec.length > SIGNUP_FORM_LIMITS.ecName) errors.ecName = 'tooLong';
    if (form.ecPhone.trim().length > SIGNUP_FORM_LIMITS.ecPhone) errors.ecPhone = 'tooLong'; else if (!isPhoneNumber(form.ecPhone)) errors.ecPhone = 'phone';
  }
  if (config.consents.length > 0 && !form.accepted) errors.accepted = 'consent';
  return errors;
}

const EMERGENCY = ['emergency_contact_name', 'emergency_contact_phone'] as const;
/** Where the tenant keeps the emergency contact: on the person (Hoy since lane H2) or, for an older setup, the facet. */
export const emergencyContactOn = (config: SignupConfig): 'person' | 'facet' | null =>
  EMERGENCY.every((f) => config.personFields.includes(f)) ? 'person' : EMERGENCY.every((f) => config.facetFields.includes(f)) ? 'facet' : null;
export const asksEmergencyContact = (config: SignupConfig) => emergencyContactOn(config) !== null;

/** The `POST /t/:t/signup` body: only fields the tenant allows, phones as `+57 300…` with the digits kept. */
export function signupBody(form: SignupForm, config: SignupConfig) {
  const phone = (s: string) => `${s.trim().startsWith('+') ? '+' : ''}${digits(s)}`;
  const person: Record<string, string> = {};
  if (config.personFields.includes('name')) person.name = form.name.trim();
  if (config.personFields.includes('phone')) person.phone = phone(form.whatsapp);
  const facet: Record<string, string> = {};
  const on = emergencyContactOn(config);
  if (on) { const into = on === 'person' ? person : facet; into.emergency_contact_name = form.ecName.trim(); into.emergency_contact_phone = phone(form.ecPhone); }
  return { person, facet, consents: form.accepted ? config.consents.map((c) => ({ document: c.document, version: c.version })) : [] };
}

export type SignupResult =
  | { kind: 'done' }
  /** 409 `already_registered`: done only if `/me` now lists the sign-up role (`signupHeld`); else a conflict. */
  | { kind: 'already-registered' }
  /** 409 `email_linked_to_other_login` (r2co): the verified email is on a person another login holds. Never done. */
  | { kind: 'email-linked' }
  | { kind: 'consent-changed'; required: SignupConsent[] }
  | { kind: 'disabled' }
  | { kind: 'unverified' }
  | { kind: 'unauthorized' }
  | { kind: 'invalid'; code: string }
  | { kind: 'error'; code: string };

export function classifySignup(status: number, body: unknown): SignupResult {
  const code = errorOf(body);
  if (status === 201 || status === 200) return { kind: 'done' };
  // Review round 2 (r2hoy, both reviews): Company OS answers 409 already_registered when the login already holds the
  // sign-up role (a retry after a lost answer, a double tap: ADR 0038 says "go to the app"), but also on a few other
  // paths (a unique-violation race). So it is never taken on its word: the form re-reads /me (`signupHeld`).
  if (status === 409 && code === 'already_registered') return { kind: 'already-registered' };
  if (status === 409 && code === 'email_linked_to_other_login') return { kind: 'email-linked' };
  if (status === 401) return { kind: 'unauthorized' };
  if (status === 403 && code === 'email_not_verified') return { kind: 'unverified' };
  if (status === 403 && code === 'signup_disabled') return { kind: 'disabled' };
  if (status === 422 && code === 'consent_required') {
    const details = body && typeof body === 'object' ? (body as Record<string, unknown>).details : null;
    const required = details && typeof details === 'object' ? parseConsents((details as Record<string, unknown>).required) : [];
    return { kind: 'consent-changed', required };
  }
  if (status === 400 || status === 422) return { kind: 'invalid', code: code || `http_${status}` };
  return { kind: 'error', code: code || `http_${status}` };
}

/** The tenant's sign-up role: the key `ROLE_KEYS` maps to the customer. */
const SIGNUP_ROLE_KEY = ROLE_KEYS.find((r) => r.role === 'customer')!.key;

/**
 * After a 409 `already_registered`: does the login now hold the sign-up role? `true` (it went through: go on), `false`
 * (a settled /me without it: a conflict), or `null` when /me could not say (failed, malformed): never taken as success.
 */
export function signupHeld(status: number, body: unknown): boolean | null {
  const me = classifyMe(status, body);
  if (me.kind === 'member') return me.me.roleKeys.includes(SIGNUP_ROLE_KEY);
  if (me.kind === 'not-member') return false;
  return null;
}

/**
 * The copy key for a sign-up answer that doesn't go on (`null`: it does). `existingLogin`: the Join form of a studio
 * login (review round 2, L4: Join wording, never a raw code or "create your account"). `held`: `signupHeld` after an
 * `already_registered`.
 */
export function signupNoticeKey(result: SignupResult, { existingLogin, held = null }: { existingLogin: boolean; held?: boolean | null }): string | null {
  const screen = existingLogin ? 'identity.join' : 'identity.register';
  switch (result.kind) {
    case 'done': return null;
    case 'already-registered': return held === true ? null : held === false ? `${screen}.conflict` : `${screen}.failed`;
    case 'email-linked': return 'identity.signup.emailLinked';
    case 'invalid': return result.code === 'duplicate_person_user' ? 'identity.signup.personLinked' : `${screen}.invalid`;
    case 'error': return `${screen}.failed`;
    default: return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Clerk errors → copy keys (CU-03: the code expires; repeated failures lock the account for a while)
// ---------------------------------------------------------------------------------------------

export type AuthErrorKind = 'wrong-code' | 'expired' | 'locked' | 'rate-limited' | 'email-invalid' | 'network' | 'generic';

export function clerkErrorKind(err: unknown): AuthErrorKind {
  const e = err && typeof err === 'object' ? err as Record<string, unknown> : {};
  const first = Array.isArray(e.errors) && e.errors[0] && typeof e.errors[0] === 'object' ? e.errors[0] as Record<string, unknown> : {};
  const code = typeof first.code === 'string' ? first.code : typeof e.code === 'string' ? e.code : '';
  if (code === 'form_code_incorrect' || code === 'form_param_format_invalid' && first.meta && (first.meta as Record<string, unknown>).paramName === 'code') return 'wrong-code';
  if (code === 'verification_expired' || code === 'verification_failed' || code === 'form_code_expired') return 'expired';
  if (code === 'user_locked' || code === 'user_locked_indefinitely') return 'locked';
  if (code === 'too_many_requests' || e.status === 429) return 'rate-limited';
  if (code === 'form_identifier_not_found' || code === 'form_param_format_invalid' || code === 'form_email_address_invalid') return 'email-invalid';
  if (code === 'network_error' || (err instanceof TypeError)) return 'network';
  return 'generic';
}

export const isEmail = (s: string) => s.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
