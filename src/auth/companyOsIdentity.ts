import type { Role } from './roles';

/**
 * Production identity rules (H-2, CU-01…CU-04, PL-04), kept pure so they are tested without a browser or Clerk.
 *
 * - The role comes from Company OS `GET /t/:t/me` (`roleKeys`), never from the browser. Hoy's launch roles are
 *   `member` (customer), `front_desk` and `administrator`; a Company OS super admin works as Administration here
 *   (no dev tools in production). Any other role key opens nothing (fail closed).
 * - A Clerk session that is not yet a member of the tenant (`403 no access to this tenant` / `account_not_invited`)
 *   must finish sign-up: `POST /t/:t/signup` with name, WhatsApp and the required consents (ADR 0038).
 * - `caps` are carried for screen gates; Hoy's recipe gives its three roles none, so the role key decides.
 */
export const LAUNCH_ROLE_KEYS: Readonly<Record<string, Role>> = Object.freeze({ administrator: 'admin', front_desk: 'front_desk', member: 'customer' });
/** Highest first: a person with several roles works with the widest launch role. */
const ROLE_ORDER = ['administrator', 'front_desk', 'member'] as const;

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

/** The HoyOS role for a `/me` answer, or null when none of its role keys is a launch role. */
export function roleFromMe(me: MeInfo): Role | null {
  if (me.isSuperAdmin) return 'admin';
  const key = ROLE_ORDER.find((k) => me.roleKeys.includes(k));
  return key ? LAUNCH_ROLE_KEYS[key] : null;
}

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

export const asksEmergencyContact = (config: SignupConfig) => config.facetFields.includes('emergency_contact_name') && config.facetFields.includes('emergency_contact_phone');

/** The `POST /t/:t/signup` body: only fields the tenant allows, phones as `+57 300…` with the digits kept. */
export function signupBody(form: SignupForm, config: SignupConfig) {
  const phone = (s: string) => `${s.trim().startsWith('+') ? '+' : ''}${digits(s)}`;
  const person: Record<string, string> = {};
  if (config.personFields.includes('name')) person.name = form.name.trim();
  if (config.personFields.includes('phone')) person.phone = phone(form.whatsapp);
  const facet: Record<string, string> = {};
  if (asksEmergencyContact(config)) { facet.emergency_contact_name = form.ecName.trim(); facet.emergency_contact_phone = phone(form.ecPhone); }
  return { person, facet, consents: form.accepted ? config.consents.map((c) => ({ document: c.document, version: c.version })) : [] };
}

export type SignupResult =
  | { kind: 'done' }
  | { kind: 'consent-changed'; required: SignupConsent[] }
  | { kind: 'disabled' }
  | { kind: 'unverified' }
  | { kind: 'unauthorized' }
  | { kind: 'invalid'; code: string }
  | { kind: 'error'; code: string };

export function classifySignup(status: number, body: unknown): SignupResult {
  const code = errorOf(body);
  // A retry after a sign-up that went through answers 409 already_registered: treat it as done (ADR 0038).
  if (status === 201 || status === 200 || (status === 409 && code === 'already_registered')) return { kind: 'done' };
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
