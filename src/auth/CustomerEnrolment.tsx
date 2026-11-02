import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useSession } from './SessionProvider';
import { ROLE_HOME } from './roles';
import { cosJson } from './cosRequest';
import { classifySignup, consentReadFrom, enrolmentBody, enrolmentNameError, parseSignupConfig, signupHeld, signupNoticeKey, SIGNUP_FORM_LIMITS, usableLoginName, type SignupConfig } from './companyOsIdentity';
import { CONSENT_READ_TIMEOUT_MS, deferConsent, settleConsent, withTimeout } from './signupStatus';

/** Lane review (r2hoy2): the consent step's own calls give up after this; fetch has no timeout of its own. */
const CONSENT_POST_TIMEOUT_MS = 15_000;
import { ConsentCheck } from '../modules/identity/pages';
import { Card } from '../components/molecule/Card/Card';
import { Notice } from '../components/molecule/Notice/Notice';
import { Button } from '../components/atom/Button/Button';
import { Input } from '../components/atom/Input/Input';
import { Field } from '../components/molecule/Field/Field';

/**
 * Owner 2026-11-01 (review round 2): every registered login is a customer; there is no special way to become one. A
 * signed-in studio login (staff, the super admin) that doesn't hold the customer role yet is enrolled here, on its first
 * customer-area visit or purchase, through Company OS sign-up for an existing login (`POST /t/:t/signup`, ADR 0038
 * amendment 2026-11-01): nothing to fill in. The only step it may see is the one every new customer sees, accepting the
 * studio's current documents once. On success the session re-reads `/me` and the page opens as a customer.
 * Idempotent: `already_registered` with `/me` holding the role is success. Never in a read-only document (a preview frame,
 * view-as): RequireRole doesn't mount it there (`enrolsAsCustomer`). Production only; RequireRole loads it lazily.
 */
/**
 * Automatic sign-ups per login in this tab (lane review): a 201 that /me never reflects (the tenant's sign-up role isn't
 * the customer role) would otherwise remount this page and post again forever. Survives remounts; Retry is manual.
 */
const autoTries = new Map<string, number>();
const AUTO_TRIES = 2;

/**
 * Lane r2hoy2 (r2co2 contract): `consent`, the same page for a login that holds the customer role already but never
 * signed up (`GET /signup` `registered: false`: invited staff, desk-invited customers). RequireRole passes the config it
 * read (no second read); the page shows the same consent step and posts the same sign-up (Company OS completes it on
 * the same login, person and facet), with lines that don't speak of turning customer access on. Success, or a 409
 * `already_registered` with `/me` holding the role, settles the check for the session (`settleConsent`) and the page
 * opens. Sign-up closed meanwhile: nothing to accept here, the page opens (fail open, like a failed read).
 *
 * hoy-jas-1nov (root cause of the 1 Nov "no profile" reports): a login with no usable name (`usableLoginName`; email-code
 * sign-in gives none) is asked for it on this step, required, 2+ characters and no "@", and the sign-up sends it. Company
 * OS stays strict (a person needs a name): its 400 `validation` brings the step back with the name field explaining it.
 * Decision C-01d: "Continue for now" defers the consent (`deferConsent`): the customer area opens, new bookings and
 * purchases wait for it (`ConsentHoldNotice`).
 */
export default function CustomerEnrolment({ consent }: { consent?: SignupConfig } = {}) {
  const { t } = useI18n();
  const { user, role, refresh, signOut } = useSession();
  const consentOnly = !!consent;
  const lines = consentOnly ? 'identity.accept' : 'identity.enrol';
  const loginName = usableLoginName(user);
  const askName = !loginName;
  const [typedName, setTypedName] = useState('');
  const [nameError, setNameError] = useState<'required' | 'email' | 'invalid' | null>(null);
  const [config, setConfig] = useState<SignupConfig | null>(consent ?? null);
  const [step, setStep] = useState<'loading' | 'consent' | 'sending' | 'closed' | 'notice'>(consent && (consent.consents.length || askName) ? 'consent' : 'loading');
  const [accepted, setAccepted] = useState(false);
  const [missingConsent, setMissingConsent] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'warn' | 'danger' | 'info'; text: string } | null>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const name = askName ? typedName : loginName;

  const enrol = useCallback(async (cfg: SignupConfig, withConsent: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setStep('sending');
    try {
      const post = cosJson('/signup', { method: 'POST', body: enrolmentBody(cfg, name, withConsent) });
      const answer = consentOnly ? await withTimeout(post, CONSENT_POST_TIMEOUT_MS) : await post;
      if (answer === 'timeout') throw new Error('signup_timeout');
      const { status, body } = answer;
      const result = classifySignup(status, body);
      if (!alive.current) return;
      if (result.kind === 'done' && consentOnly) { settleConsent(user.id); refresh(); return; }
      if (result.kind === 'done' || result.kind === 'unverified' || result.kind === 'unauthorized') { refresh(); return; }
      if (result.kind === 'consent-changed' && result.required.length === 0) {
        // Nothing to show the person: not a step they can take. Retry reads the documents again.
        setNotice({ tone: 'danger', text: t(`${lines}.failed`) }); setStep('notice'); return;
      }
      if (result.kind === 'disabled' && consentOnly) { settleConsent(user.id); return; }
      if (result.kind === 'disabled') { setStep('closed'); return; }
      if (result.kind === 'consent-changed') {
        const next = { ...cfg, consents: result.required };
        setConfig(next); setAccepted(false); setStep('consent');
        setNotice(withConsent ? { tone: 'warn', text: t('identity.register.changed') } : null);
        return;
      }
      // The typed name was refused (Company OS 400 validation): back to the step, the field says so.
      if (result.kind === 'invalid' && askName) { setNameError('invalid'); setNotice(null); setStep('consent'); return; }
      let held: boolean | null = null;
      if (result.kind === 'already-registered') {
        const me = await cosJson('/me').catch(() => null);
        if (!alive.current) return;
        held = me ? signupHeld(me.status, me.body) : null;
        if (held) { if (consentOnly) settleConsent(user.id); refresh(); return; }
      }
      const key = signupNoticeKey(result, { existingLogin: true, held, consentOnly });
      if (!key) { if (consentOnly) settleConsent(user.id); refresh(); return; }
      setNotice({ tone: key.endsWith('.failed') ? 'danger' : 'warn', text: t(key) });
      setStep('notice');
    } catch {
      if (!alive.current) return;
      setNotice({ tone: 'danger', text: t(`${lines}.failed`) });
      setStep('notice');
    } finally {
      busy.current = false;
    }
  }, [askName, consentOnly, lines, name, refresh, t, user.id]);

  const start = useCallback(async (manual = false) => {
    // The consent check's first pass uses the config RequireRole read (once per session); Retry reads it again.
    if (consent && !manual) {
      if (consent.consents.length > 0 || askName) return;
      const tries = autoTries.get(user.id) ?? 0;
      if (tries >= AUTO_TRIES) { setNotice({ tone: 'danger', text: t(`${lines}.failed`) }); setStep('notice'); return; }
      autoTries.set(user.id, tries + 1);
      await enrol(consent, false);
      return;
    }
    setStep('loading'); setNotice(null);
    try {
      if (consentOnly) {
        // Retry of the consent check: signed up meanwhile, closed, unreadable or silent now → the page opens (fail open).
        const answer = await withTimeout(cosJson('/signup'), CONSENT_READ_TIMEOUT_MS);
        if (!alive.current) return;
        if (answer === 'timeout') { console.warn('[signup] GET /signup gave no answer on retry; the customer area opens without the consent check'); settleConsent(user.id); return; }
        const read = consentReadFrom(answer.status, answer.body);
        if (!alive.current) return;
        if (read.step === 'pass') { settleConsent(user.id); return; }
        setConfig(read.config);
        if (read.config.consents.length > 0 || askName) { setStep('consent'); return; }
        await enrol(read.config, false);
        return;
      }
      const { status, body } = await cosJson('/signup');
      const parsed = status === 200 ? parseSignupConfig(body) : null;
      if (!alive.current) return;
      if (!parsed) { setNotice({ tone: 'danger', text: t('identity.enrol.failed') }); setStep('notice'); return; }
      setConfig(parsed);
      if (!parsed.enabled) { setStep('closed'); return; }
      if (parsed.consents.length > 0 || askName) { setStep('consent'); return; }
      const tries = autoTries.get(user.id) ?? 0;
      if (!manual && tries >= AUTO_TRIES) { setNotice({ tone: 'danger', text: t('identity.enrol.failed') }); setStep('notice'); return; }
      autoTries.set(user.id, tries + 1);
      await enrol(parsed, false);
    } catch {
      if (alive.current) { setNotice({ tone: 'danger', text: t(`${lines}.failed`) }); setStep('notice'); }
    }
  }, [askName, consent, consentOnly, enrol, lines, t, user.id]);
  const started = useRef(false);
  useEffect(() => { if (!started.current) { started.current = true; void start(); } }, [start]);

  // A customer's home is the customer area this page stands in front of: offer to sign out instead of a link back here.
  const home = consentOnly && ROLE_HOME[role].startsWith('/app')
    ? <p className="small"><Button variant="ghost" size="sm" onClick={() => void signOut()}>{t('identity.signout')}</Button></p>
    : <p className="small"><Link to={ROLE_HOME[role]}>{t('identity.enrol.back')}</Link></p>;
  if (step === 'loading' || step === 'sending' && !config?.consents.length && !askName) {
    return <div className="container page identity-narrow stack" data-enrol-customer="loading"><p className="muted" aria-busy="true">{t(`${lines}.loading`)}</p>{consentOnly && home}</div>;
  }
  if (step === 'closed') return <div className="container page identity-narrow stack" data-enrol-customer="closed"><Card padding="lg"><Notice tone="info">{t('identity.register.closed')}</Notice></Card>{home}</div>;
  if (step === 'notice' || !config) {
    return (
      <div className="container page identity-narrow stack" data-enrol-customer="notice">
        <Card padding="lg" className="stack">
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
          <Button variant="secondary" data-enrol-retry onClick={() => void start(true)}>{t('identity.retry')}</Button>
          {/* Lane review (r2hoy2): a customer already; a refusal they can't fix never keeps them out of their bookings. */}
          {consentOnly && <Button variant="ghost" data-consent-later onClick={() => deferConsent(user.id)}>{t('identity.accept.later')}</Button>}
        </Card>
        {home}
      </div>
    );
  }
  return (
    <div className="container page identity-narrow stack" data-enrol-customer="consent">
      <Card padding="lg">
        <form className="stack" noValidate onSubmit={(e) => {
          e.preventDefault();
          const nameProblem = askName ? enrolmentNameError(typedName) : null;
          const consentMissing = config.consents.length > 0 && !accepted;
          setNameError(nameProblem);
          setMissingConsent(consentMissing);
          if (nameProblem || consentMissing) return;
          void enrol(config, true);
        }}>
          <h1 className="cust-title">{t('identity.enrol.title')}</h1>
          {config.consents.length > 0 && <p className="muted">{t('identity.enrol.consent')}</p>}
          {askName && (
            <div data-enrol-name>
              <Field label={t('identity.name.label')} required hint={t('identity.name.hint')} error={nameError ? t(`identity.name.${nameError}`) : undefined}>
                {(id) => <Input id={id} autoComplete="name" maxLength={SIGNUP_FORM_LIMITS.name} value={typedName} onChange={(e) => { setTypedName(e.target.value); setNameError(null); }} />}
              </Field>
            </div>
          )}
          <ConsentCheck config={config} accepted={accepted} onChange={(v) => { setAccepted(v); if (v) setMissingConsent(false); }} error={missingConsent} />
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
          <Button type="submit" block size="lg" loading={step === 'sending'}>{t('identity.enrol.cta')}</Button>
        </form>
      </Card>
      {home}
    </div>
  );
}
