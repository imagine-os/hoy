import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthenticateWithRedirectCallback, useClerk, useUser } from '@clerk/react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_HOME, ROLE_LABEL, type Role } from '../../auth/roles';
import { cosJson } from '../../auth/cosRequest';
import { sendEmailCode, signInWithGoogle, verifyEmailCode, type ClerkLike, type CodeMode } from '../../auth/clerkFlows';
import {
  asksEmergencyContact, classifySignup, clerkErrorKind, isEmail, parseSignupConfig, signupBody, signupFormErrors,
  SIGNUP_FORM_LIMITS, type AuthErrorKind, type SignupConfig, type SignupForm,
} from '../../auth/companyOsIdentity';
import { customerAuthLink, customerReturn } from '../customer/auth/customerReturn';
import { safeAuthBack } from '../../auth/visitorSignIn';
import { AuthShell } from '../customer/auth/AuthShell';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Notice } from '../../components/molecule/Notice/Notice';
import './identity.css';

/** Where a signed-in person lands: a customer follows the validated `next` (SW-03); staff go to their home. */
const homeFor = (role: Role, next: string | null) => (role === 'customer' && customerReturn(next)) || ROLE_HOME[role];
const errKey = (kind: AuthErrorKind) => `identity.err.${kind}`;
const errorText = (err: unknown) => errKey(clerkErrorKind(err));

function Shell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <AuthShell>
      <div className="auth-col" data-identity>
        <div className="stack-sm auth-intro"><h1 className="cust-title">{title}</h1>{sub && <p className="muted small">{sub}</p>}</div>
        {children}
      </div>
    </AuthShell>
  );
}

/** A-02 / A-03 in the production build: one screen for every session state (CU-01, CU-03, PL-04). */
export function CosAuthPage({ mode }: { mode: CodeMode }) {
  const { t } = useI18n();
  const session = useSession();
  const [params] = useSearchParams();
  const next = params.get('next');
  if (session.status === 'loading') return <Shell title={t('identity.signin.title')}><p className="muted" aria-busy="true">{t('identity.loading')}</p></Shell>;
  if (session.status === 'ready' && session.signedIn) return <Navigate to={homeFor(session.role, next)} replace />;
  if (session.status === 'needs-signup') {
    if (mode !== 'sign-up') return <Navigate to={customerAuthLink('/auth/sign-up', params)} replace />;
    return <Shell title={t('identity.register.title')} sub={t('identity.register.sub')}><RegisterForm /></Shell>;
  }
  if (session.status === 'unverified' || session.status === 'no-role' || session.status === 'error') return <SessionProblem />;
  const title = t(mode === 'sign-up' ? 'identity.signup.title' : 'identity.signin.title');
  return (
    <Shell title={title} sub={t(mode === 'sign-up' ? 'identity.signup.sub' : 'identity.signin.sub')}>
      <EmailCodeCard back={customerAuthLink(mode === 'sign-up' ? '/auth/sign-up' : '/auth/sign-in', params)} />
      <p className="small identity-center">
        {mode === 'sign-up'
          ? <>{t('identity.have')} <Link to={customerAuthLink('/auth/sign-in', params)}>{t('identity.signin.title')}</Link></>
          : <>{t('identity.new')} <Link to={customerAuthLink('/auth/sign-up', params)}>{t('identity.create')}</Link></>}
      </p>
    </Shell>
  );
}

function SessionProblem() {
  const { t } = useI18n();
  const { status, signedIn, signOut, refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const which = status === 'unverified' ? 'unverified' : status === 'no-role' ? 'noRole' : 'error';
  return (
    <Shell title={t(`identity.state.${which}.title`)}>
      <Card padding="lg" className="stack" data-session-problem={status}>
        <Notice tone={which === 'error' ? 'warn' : 'info'}>{t(`identity.state.${which}.body`)}</Notice>
        {which === 'error' && <Button block onClick={refresh}>{t('identity.retry')}</Button>}
        {signedIn && <Button block variant="secondary" loading={busy} onClick={async () => { setBusy(true); try { await signOut(); } finally { setBusy(false); } }}>{t('identity.signout')}</Button>}
      </Card>
    </Shell>
  );
}

/** CU-03: a one-time code by email (sign-in or new account), or Google. Clerk sends, expires and rate-limits the code. */
function EmailCodeCard({ back }: { back: string }) {
  const { t } = useI18n();
  const clerk = useClerk() as unknown as ClerkLike;
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeMode, setCodeMode] = useState<CodeMode>('sign-in');
  const [busy, setBusy] = useState<null | 'send' | 'verify' | 'google'>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    if (!isEmail(email)) { setError('identity.email.err'); return; }
    setBusy('send'); setError(null);
    try { setCodeMode(await sendEmailCode(clerk, email)); setCode(''); setStep('code'); }
    catch (err) { setError(errorText(err)); }
    finally { setBusy(null); }
  };
  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy('verify'); setError(null);
    // On success the session changes and the page moves on (to the app, or to finish sign-up).
    try { await verifyEmailCode(clerk, codeMode, code); }
    catch (err) { setError(errorText(err)); setBusy(null); }
  };
  const google = async () => {
    if (busy) return;
    setBusy('google'); setError(null);
    try { await signInWithGoogle(clerk, back); }
    catch (err) { setError(errorText(err)); setBusy(null); }
  };

  return (
    <Card padding="lg" className="stack">
      {step === 'email' ? (
        <form className="stack" onSubmit={send} noValidate data-step="email">
          <Field label={t('identity.email')}>{(id) => <Input id={id} type="email" autoComplete="email" inputMode="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          {error && <Notice tone="danger">{t(error)}</Notice>}
          <Button type="submit" block size="lg" loading={busy === 'send'}>{t('identity.sendCode')}</Button>
        </form>
      ) : (
        <form className="stack" onSubmit={verify} noValidate data-step="code">
          <p className="small">{t('identity.code.sent', { email: email.trim() })}</p>
          <Field label={t('identity.code')}>{(id) => <Input id={id} autoComplete="one-time-code" inputMode="numeric" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} />}</Field>
          {error && <Notice tone="danger">{t(error)}</Notice>}
          <Button type="submit" block size="lg" loading={busy === 'verify'} disabled={code.replace(/\s/g, '').length < 4}>{t('identity.code.cta')}</Button>
          <div className="identity-row">
            <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => void send()}>{t('identity.code.resend')}</Button>
            <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => { setStep('email'); setError(null); }}>{t('identity.code.change')}</Button>
          </div>
        </form>
      )}
      <div className="auth-divider"><span>{t('identity.or')}</span></div>
      <Button block variant="secondary" icon="G" loading={busy === 'google'} onClick={() => void google()}>{t('identity.google')}</Button>
    </Card>
  );
}

const EMPTY_FORM: SignupForm = { name: '', whatsapp: '+57 ', ecName: '', ecPhone: '+57 ', accepted: false };

/** CU-01 / CU-02: the studio's sign-up after Clerk proved the email. Company OS stores the consents with their versions. */
function RegisterForm() {
  const { t } = useI18n();
  const { refresh } = useSession();
  const { user } = useUser();
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<SignupForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ReturnType<typeof signupFormErrors>>({});
  const [notice, setNotice] = useState<{ tone: 'warn' | 'danger' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const { status, body } = await cosJson('/signup');
      const parsed = status === 200 ? parseSignupConfig(body) : null;
      if (!alive.current) return;
      if (!parsed) { setLoadError(`http_${status}`); return; }
      setConfig(parsed);
    } catch { if (alive.current) setLoadError('network'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loadError) return <Card padding="lg" className="stack"><Notice tone="warn">{t('identity.register.failed', { code: loadError })}</Notice><Button onClick={() => void load()}>{t('identity.retry')}</Button></Card>;
  if (!config) return <p className="muted" aria-busy="true">{t('identity.register.loading')}</p>;
  if (!config.enabled) return <Card padding="lg"><Notice tone="info">{t('identity.register.closed')}</Notice></Card>;

  const set = <K extends keyof SignupForm>(k: K, v: SignupForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const fieldError = (k: keyof SignupForm) => errors[k] && t(`identity.field.${errors[k]}`);
  const version = (doc: string) => config.consents.find((c) => c.document === doc)?.version;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const found = signupFormErrors(form, config);
    setErrors(found); setNotice(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const { status, body } = await cosJson('/signup', { method: 'POST', body: signupBody(form, config) });
      const result = classifySignup(status, body);
      if (!alive.current) return;
      if (result.kind === 'done') { refresh(); return; }
      if (result.kind === 'consent-changed') { set('accepted', false); setNotice({ tone: 'warn', text: t('identity.register.changed') }); await load(); }
      else if (result.kind === 'disabled') setConfig({ ...config, enabled: false });
      else if (result.kind === 'unverified' || result.kind === 'unauthorized') refresh();
      else if (result.kind === 'invalid') setNotice({ tone: 'danger', text: t('identity.register.invalid', { code: result.code }) });
      else setNotice({ tone: 'danger', text: t('identity.register.failed', { code: result.code }) });
    } catch {
      if (alive.current) setNotice({ tone: 'danger', text: t('identity.register.failed', { code: 'network' }) });
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const email = user?.primaryEmailAddress?.emailAddress;
  return (
    <Card padding="lg">
      <form className="stack" onSubmit={submit} noValidate data-register>
        {email && <p className="small muted">{t('identity.register.email', { email })}</p>}
        <Field label={t('identity.register.name')} required error={fieldError('name')}>{(id) => <Input id={id} autoComplete="name" maxLength={SIGNUP_FORM_LIMITS.name} value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label={t('identity.register.whatsapp')} required hint={t('identity.register.whatsapp.hint')} error={fieldError('whatsapp')}>{(id) => <Input id={id} inputMode="tel" autoComplete="tel" maxLength={SIGNUP_FORM_LIMITS.whatsapp} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />}</Field>
        {asksEmergencyContact(config) && <>
          <div className="eyebrow">{t('identity.register.emergency')}</div>
          <div className="grid grid-2">
            <Field label={t('identity.register.ecName')} required error={fieldError('ecName')}>{(id) => <Input id={id} maxLength={SIGNUP_FORM_LIMITS.ecName} value={form.ecName} onChange={(e) => set('ecName', e.target.value)} />}</Field>
            <Field label={t('identity.register.ecPhone')} required error={fieldError('ecPhone')}>{(id) => <Input id={id} inputMode="tel" maxLength={SIGNUP_FORM_LIMITS.ecPhone} value={form.ecPhone} onChange={(e) => set('ecPhone', e.target.value)} />}</Field>
          </div>
        </>}
        {config.consents.length > 0 && (
          <div className="stack-sm">
            <label className="identity-consent">
              <input type="checkbox" checked={form.accepted} onChange={(e) => set('accepted', e.target.checked)} />
              <span>
                {t('identity.register.consent.pre')} <Link to="/site/legal/terms" target="_blank">{t('identity.register.terms')}</Link>
                {' '}{t('identity.register.consent.and')} <Link to="/site/legal/privacy" target="_blank">{t('identity.register.privacy')}</Link>
                {' '}{t('identity.register.consent.post')}
              </span>
            </label>
            <p className="xs muted">
              {[version('terms') && `${t('identity.register.terms')}: ${t('identity.register.version', { version: version('terms')! })}`,
                version('privacy') && `${t('identity.register.privacy')}: ${t('identity.register.version', { version: version('privacy')! })}`].filter(Boolean).join(' · ')}
            </p>
            {errors.accepted && <p className="xs identity-error" role="alert">{t('identity.field.consent')}</p>}
          </div>
        )}
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        <Button type="submit" block size="lg" loading={busy}>{t('identity.register.cta')}</Button>
      </form>
    </Card>
  );
}

/** A-07: back from Google. Clerk finishes the sign-in (or the sign-up of a new Google account) and returns. */
export function AuthCallbackPage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const target = `${window.location.origin}${window.location.pathname}#${safeAuthBack(params.get('back'))}`;
  return (
    <Shell title={t('identity.signin.title')}>
      <p className="muted" aria-busy="true">{t('identity.callback')}</p>
      <AuthenticateWithRedirectCallback signInForceRedirectUrl={target} signUpForceRedirectUrl={target} continueSignUpUrl={target} signInUrl={target} signUpUrl={target} />
    </Shell>
  );
}

/**
 * C-38: CU-04 — the sign-in email and a complete sign-out. Changing the email is done by the studio in Company OS (it
 * keeps login, person and receipts on one address and notifies the previous one); see clerkFlows.ts for why it is not
 * self-serve.
 */
export function AccessPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { user } = useUser();
  const { signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const current = user?.primaryEmailAddress?.emailAddress ?? '';
  return (
    <div className="container page stack identity-access" data-access-page>
      <h1 className="cust-title">{t('identity.access.title')}</h1>
      <Card padding="lg" className="stack">
        <div className="stack-sm"><span className="eyebrow">{t('identity.access.current')}</span><strong data-current-email>{current}</strong></div>
        <p className="small muted">{t('identity.access.changeByStudio')}</p>
      </Card>
      <Card padding="lg" className="stack">
        <p className="small muted">{t('identity.access.signout.body')}</p>
        <Button variant="secondary" loading={busy} onClick={async () => { setBusy(true); try { await signOut(); nav('/auth/sign-in', { replace: true }); } finally { setBusy(false); } }}>{t('identity.signout')}</Button>
      </Card>
    </div>
  );
}

/** The production `/no-access`: no persona switcher, no hub; the person's own home and sign-out instead. */
export function CosNoAccessPage() {
  const { t, bi } = useI18n();
  const { role, user, signedIn, status, signOut } = useSession();
  const [params] = useSearchParams();
  if (!signedIn || status !== 'ready' || user.role === 'public') return <Navigate to={customerAuthLink('/auth/sign-in', new URLSearchParams({ next: params.get('from') ?? '' }))} replace />;
  return (
    <div className="container page identity-narrow">
      <Card padding="lg" className="stack">
        <h1 className="noaccess-title">{t('identity.noAccess.title')}</h1>
        <p className="muted">{t('identity.noAccess.body', { role: bi(ROLE_LABEL[role]) })}</p>
        <div className="identity-row">
          <Link to={ROLE_HOME[role]}><Button>{t('identity.noAccess.home')}</Button></Link>
          <Button variant="secondary" onClick={() => void signOut()}>{t('identity.signout')}</Button>
        </div>
      </Card>
    </div>
  );
}
