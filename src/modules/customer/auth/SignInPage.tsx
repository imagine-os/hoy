import {useData} from '../../../data/DataContext';
import {useMockSignIn} from './useMockSignIn';
import {DemoSignInPanel} from '../../../components/organism/DemoSignInPanel/DemoSignInPanel';
import { useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { demoUsers } from '../../../auth/demoUsers';
import { ROLE_HOME, ROLE_LABEL } from '../../../auth/roles';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Avatar } from '../../../components/atom/Avatar/Avatar';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { policy } from '../policy';
import { AuthShell } from './AuthShell';
import { canvasSpecs } from '../specs';
import { useActions } from '../../../actions';
import { need } from '../actions';

const spec = canvasSpecs['A-02'];
import { customerAuthLink, customerReturn } from './customerReturn';
import { MS } from '../../../i18n/format';

export const ATTEMPTS_KEY = 'hoyos.auth.attempts';
export const LOCK_KEY = 'hoyos.auth.lockUntil';
const readAttempts = () => { try { return Number(sessionStorage.getItem(ATTEMPTS_KEY) ?? 0); } catch { return 0; } };

/** A-02 Sign in — demo mode: pick a demo user, or type a demo email. Providers arrive with Supabase Auth. */
export function SignInPage() {
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const { switchUser, user, role } = useSession();
  const location = useLocation();
  const data=useData();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(readAttempts);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const people = demoUsers.filter((u) => u.role !== 'public');
  // A delayed demo form result belongs to the exact mounted form and session that submitted it.
  // Only memory holds these form values; credentials and attempt details are never persisted here.
  const live = useRef({ data, userId: user.id, role, route: '', email, password, mounted: false });
  live.current = { data, userId: user.id, role, route: `${location.pathname}${location.search}:${location.key}`, email, password, mounted: live.current.mounted };
  type LegacyAttempt = { scope: typeof live.current; attempts: number; cancelled: boolean };
  const legacyAttempt = useRef<LegacyAttempt | null>(null);
  const legacyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAttempt = (request: LegacyAttempt) => {
    const now = live.current, then = request.scope;
    return now.mounted && !request.cancelled && legacyAttempt.current === request
      && now.data === then.data && now.userId === then.userId && now.role === then.role
      && now.route === then.route && now.email === then.email && now.password === then.password;
  };
  const cancelLegacy = () => {
    if (legacyAttempt.current) legacyAttempt.current.cancelled = true;
    legacyAttempt.current = null;
    if (legacyTimer.current !== null) clearTimeout(legacyTimer.current);
    legacyTimer.current = null;
  };
  useLayoutEffect(() => {
    live.current.mounted = true;
    return () => { live.current.mounted = false; cancelLegacy(); };
  }, []);
  useLayoutEffect(() => {
    if (legacyAttempt.current && !currentAttempt(legacyAttempt.current)) {
      cancelLegacy(); setBusy(false); setError(null);
    }
  }, [data, user.id, role, location.pathname, location.search, location.key, email, password]);

  const enterAs = (id: string, isCurrent: () => boolean = () => true) => {
    if (!isCurrent()) return;
    const u = demoUsers.find((x) => x.id === id)!;
    switchUser(u.id);
    if (!isCurrent()) return;
    try { sessionStorage.removeItem(ATTEMPTS_KEY); } catch { /* ignore */ }
    if (!isCurrent()) return;
    nav(u.role === 'customer' && customerReturn(next) ? customerReturn(next)! : ROLE_HOME[u.role]);
  };

  const preview=useMockSignIn(()=>enterAs('usr_cust'),data.name==='mock');

  // WebMCP (0025): auth.signIn enters as a demo user and follows ?next= exactly like a tap on the picker.
  const enterRef = useRef(enterAs); enterRef.current = enterAs;
  const handlers = useMemo(() => ({
    'auth.signIn': (p?: Record<string, string>) => {
      const id = need(p, 'user');
      const signable = demoUsers.filter((x) => x.role !== 'public');
      const u = signable.find((x) => x.id === id);
      if (!u) throw new Error(`unknown demo user "${id}" — one of ${signable.map((x) => x.id).join(', ')}`);
      enterRef.current(u.id);
      return `signed in as ${u.id} (${u.role})`;
    },
  }), []);
  useActions(spec, handlers);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (legacyAttempt.current || !live.current.mounted) return;
    const request: LegacyAttempt = { scope: { ...live.current }, attempts, cancelled: false };
    legacyAttempt.current = request;
    setBusy(true); setError(null);
    legacyTimer.current = setTimeout(() => {
      const current = () => currentAttempt(request);
      if (!current()) return;
      legacyTimer.current = null;
      const finish = () => { if (legacyAttempt.current === request) legacyAttempt.current = null; if (live.current.mounted) setBusy(false); };
      const u = demoUsers.find((x) => x.email && x.email.toLowerCase() === request.scope.email.trim().toLowerCase());
      if (u && request.scope.password.length > 0) { enterAs(u.id, current); finish(); return; }
      const n = request.attempts + 1;
      if (!current()) return;
      setAttempts(n);
      if (!current()) return;
      try { sessionStorage.setItem(ATTEMPTS_KEY, String(n)); } catch { /* ignore */ }
      if (!current()) return;
      if (n >= policy.lockoutAttempts) {
        try { sessionStorage.setItem(LOCK_KEY, new Date(Date.now() + policy.lockoutMinutes * MS.min).toISOString()); } catch { /* ignore */ }
        if (!current()) return;
        nav('/auth/locked'); finish(); return;
      }
      if (!current()) return;
      setError(t('customer.signin.wrong', { n: policy.lockoutAttempts - n }));
      finish();
    }, 500);
  };

  return (
    <AuthShell>
      <div className="auth-col">
        <div className="stack-sm auth-intro"><h1 className="cust-title">{t('customer.signin.title')}</h1><p className="muted small">{t('customer.signin.sub')}</p></div>

        <DemoSignInPanel {...preview}/>
        <ListGroup title={t('customer.signin.demo')}>
          {people.map((u) => <ListRow key={u.id} icon={<Avatar name={u.name} initials={u.initials} size={32} />} title={u.name} subtitle={bi(u.blurb)} trailing={<Badge tone={u.role === 'customer' ? 'primary' : 'neutral'}>{bi(ROLE_LABEL[u.role])}</Badge>} onClick={() => enterAs(u.id)} />)}
        </ListGroup>

        <Card padding="lg" className="stack">
          <form className="stack" onSubmit={submit} noValidate>
            <Field label={t('customer.form.email')} hint={t('customer.signin.emailHint')}>{(id) => <Input id={id} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juliana@demo.hoyos.test" />}</Field>
            <Field label={t('customer.form.password')}>{(id) => <Input id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />}</Field>
            {error && <Notice tone="danger">{error}</Notice>}
            <Button type="submit" block size="lg" loading={busy}>{t('customer.signin.cta')}</Button>
            <Link to="/auth/recover" className="small" style={{ textAlign: 'center' }}>{t('customer.signin.forgot')}</Link>
          </form>
          <div className="auth-divider"><span>{t('customer.signin.or')}</span></div>
          <div className="stack-sm">
            <Button block variant="secondary" disabled icon="">{t('customer.signin.apple')}</Button>
            <Button block variant="secondary" disabled icon="G">{t('customer.signin.google')}</Button>
            <Button block variant="secondary" disabled icon="biometric">{t('customer.signin.biometric')}</Button>
            <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.signin.providersNote')}</p>
          </div>
        </Card>
        <p className="small" style={{ textAlign: 'center' }}>{t('customer.signin.new')} <Link to={customerAuthLink('/auth/sign-up', params)}>{t('customer.signin.create')}</Link></p>
      </div>
    </AuthShell>
  );
}
