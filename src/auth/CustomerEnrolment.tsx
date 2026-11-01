import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useSession } from './SessionProvider';
import { ROLE_HOME } from './roles';
import { cosJson } from './cosRequest';
import { classifySignup, consentReadFrom, enrolmentBody, parseSignupConfig, signupHeld, signupNoticeKey, type SignupConfig } from './companyOsIdentity';
import { settleConsent } from './signupStatus';
import { ConsentCheck } from '../modules/identity/pages';
import { Card } from '../components/molecule/Card/Card';
import { Notice } from '../components/molecule/Notice/Notice';
import { Button } from '../components/atom/Button/Button';

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
 */
export default function CustomerEnrolment({ consent }: { consent?: SignupConfig } = {}) {
  const { t } = useI18n();
  const { user, role, refresh, signOut } = useSession();
  const consentOnly = !!consent;
  const lines = consentOnly ? 'identity.accept' : 'identity.enrol';
  const [config, setConfig] = useState<SignupConfig | null>(consent ?? null);
  const [step, setStep] = useState<'loading' | 'consent' | 'sending' | 'closed' | 'notice'>(consent?.consents.length ? 'consent' : 'loading');
  const [accepted, setAccepted] = useState(false);
  const [missingConsent, setMissingConsent] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'warn' | 'danger' | 'info'; text: string } | null>(null);
  const alive = useRef(true);
  const busy = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const name = user.name && user.name !== user.email ? user.name : '';

  const enrol = useCallback(async (cfg: SignupConfig, withConsent: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setStep('sending');
    try {
      const { status, body } = await cosJson('/signup', { method: 'POST', body: enrolmentBody(cfg, name, withConsent) });
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
  }, [consentOnly, lines, name, refresh, t, user.id]);

  const start = useCallback(async (manual = false) => {
    // The consent check's first pass uses the config RequireRole read (once per session); Retry reads it again.
    if (consent && !manual) {
      if (consent.consents.length > 0) return;
      const tries = autoTries.get(user.id) ?? 0;
      if (tries >= AUTO_TRIES) { setNotice({ tone: 'danger', text: t(`${lines}.failed`) }); setStep('notice'); return; }
      autoTries.set(user.id, tries + 1);
      await enrol(consent, false);
      return;
    }
    setStep('loading'); setNotice(null);
    try {
      const { status, body } = await cosJson('/signup');
      if (consentOnly) {
        // Retry of the consent check: signed up meanwhile, closed, or unreadable now → the page opens (fail open).
        const read = consentReadFrom(status, body);
        if (!alive.current) return;
        if (read.step === 'pass') { settleConsent(user.id); return; }
        setConfig(read.config);
        if (read.config.consents.length > 0) { setStep('consent'); return; }
        await enrol(read.config, false);
        return;
      }
      const parsed = status === 200 ? parseSignupConfig(body) : null;
      if (!alive.current) return;
      if (!parsed) { setNotice({ tone: 'danger', text: t('identity.enrol.failed') }); setStep('notice'); return; }
      setConfig(parsed);
      if (!parsed.enabled) { setStep('closed'); return; }
      if (parsed.consents.length > 0) { setStep('consent'); return; }
      const tries = autoTries.get(user.id) ?? 0;
      if (!manual && tries >= AUTO_TRIES) { setNotice({ tone: 'danger', text: t('identity.enrol.failed') }); setStep('notice'); return; }
      autoTries.set(user.id, tries + 1);
      await enrol(parsed, false);
    } catch {
      if (alive.current) { setNotice({ tone: 'danger', text: t(`${lines}.failed`) }); setStep('notice'); }
    }
  }, [consent, consentOnly, enrol, lines, t, user.id]);
  const started = useRef(false);
  useEffect(() => { if (!started.current) { started.current = true; void start(); } }, [start]);

  // A customer's home is the customer area this page stands in front of: offer to sign out instead of a link back here.
  const home = consentOnly && ROLE_HOME[role].startsWith('/app')
    ? <p className="small"><Button variant="ghost" size="sm" onClick={() => void signOut()}>{t('identity.signout')}</Button></p>
    : <p className="small"><Link to={ROLE_HOME[role]}>{t('identity.enrol.back')}</Link></p>;
  if (step === 'loading' || step === 'sending' && !config?.consents.length) {
    return <div className="container page identity-narrow stack" data-enrol-customer="loading"><p className="muted" aria-busy="true">{t(`${lines}.loading`)}</p></div>;
  }
  if (step === 'closed') return <div className="container page identity-narrow stack" data-enrol-customer="closed"><Card padding="lg"><Notice tone="info">{t('identity.register.closed')}</Notice></Card>{home}</div>;
  if (step === 'notice' || !config) {
    return (
      <div className="container page identity-narrow stack" data-enrol-customer="notice">
        <Card padding="lg" className="stack">
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
          <Button variant="secondary" data-enrol-retry onClick={() => void start(true)}>{t('identity.retry')}</Button>
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
          if (!accepted) { setMissingConsent(true); return; }
          setMissingConsent(false);
          void enrol(config, true);
        }}>
          <h1 className="cust-title">{t('identity.enrol.title')}</h1>
          <p className="muted">{t('identity.enrol.consent')}</p>
          <ConsentCheck config={config} accepted={accepted} onChange={(v) => { setAccepted(v); if (v) setMissingConsent(false); }} error={missingConsent} />
          {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
          <Button type="submit" block size="lg" loading={step === 'sending'}>{t('identity.enrol.cta')}</Button>
        </form>
      </Card>
      {home}
    </div>
  );
}
