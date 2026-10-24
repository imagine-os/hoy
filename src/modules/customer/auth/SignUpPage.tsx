import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import {SignupLegalConsent,type SignupLegalConsentProps} from '../../../components/organism/SignupLegalConsent/SignupLegalConsent';
import {readSignupLegal,signupLegalKey,type SignupLegalReference} from './signupLegal';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Avatar } from '../../../components/atom/Avatar/Avatar';
import { AuthShell } from './AuthShell';
import { SIGNUP_LIMITS, signupErrors } from './signupValidation';
import { customerAuthLink, customerReturn } from './customerReturn';
import { registerMockCustomer } from './mockRegistration';
import { tenant } from '../../../tenant/tenant';
import { publishLaunchNotification } from '../../launch-notifications';

interface Form { first: string; last: string; email: string; whatsapp: string; password: string; birthday: string; ecName: string; ecPhone: string; photo: string | null; consent: boolean; marketing: boolean }
const EMPTY: Form = { first: '', last: '', email: '', whatsapp: `${tenant.dialCode} `, password: '', birthday: '', ecName: '', ecPhone: `${tenant.dialCode} `, photo: null, consent: false, marketing: false };

export function passwordStrength(p: string): 0 | 1 | 2 | 3 {
  if (p.length < 8) return 0;
  let s = 1; if (p.length >= 12) s++; if (/[^a-zA-Z0-9]/.test(p) || (/\d/.test(p) && /[a-zA-Z]/.test(p))) s++;
  return Math.min(3, s) as 1 | 2 | 3;
}

/** A-03 Create account — the minimum the studio needs, with WhatsApp first-class and the emergency contact from day one. */
export function SignUpPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { switchUser, user, role } = useSession();
  const location=useLocation();
  const contextKey=JSON.stringify([user.id,role,location.pathname,location.search]);
  const active = useRef<{ cancelled: boolean } | null>(null);
  const request = useRef(crypto.randomUUID());
  const mounted=useRef(false);
  const context=useRef({data,key:contextKey});
  if(context.current.data!==data||context.current.key!==contextKey){
    if(active.current)active.current.cancelled=true;
    active.current=null;request.current=crypto.randomUUID();
    context.current={data,key:contextKey};
  }
  const scope=context.current;
  const [params] = useSearchParams();
  const [f,setF]=useState<Form>(EMPTY);
  const [legal,setLegal]=useState<SignupLegalReference[]>([]);
  const [legalOwner,setLegalOwner]=useState<typeof scope|null>(null);
  const [consentOwner,setConsentOwner]=useState<typeof scope|null>(null);
  const [legalState,setLegalState]=useState<SignupLegalConsentProps['state']>('loading');
  const legalRef=useRef<SignupLegalReference[]>([]),legalEpoch=useRef(0),legalChanged=useRef(false);
  const loadLegal=useCallback(async()=>{
    const owner=scope;
    if(context.current!==owner)return;
    const epoch=++legalEpoch.current;
    setLegalOwner(owner);
    setLegalState('loading');
    try {
      const next=await readSignupLegal(data);
      if(epoch!==legalEpoch.current||context.current!==owner||!mounted.current)return;
      const changed=legalRef.current.length>0&&signupLegalKey(next)!==signupLegalKey(legalRef.current);
      if(changed){legalChanged.current=true;setF(value=>({...value,consent:false}));}
      legalRef.current=next;setLegal(next);
      setLegalState(legalChanged.current?'changed':'ready');
    } catch(error) {
      if(epoch!==legalEpoch.current||context.current!==owner||!mounted.current)return;
      setF(value=>({...value,consent:false}));
      setLegalState(error instanceof Error&&error.message==='registration_legal_unavailable'?'unavailable':'error');
    }
  },[scope]);
  useEffect(()=>{
    void loadLegal();
    const off=data.subscribe('legal_documents',()=>void loadLegal());
    const offSettings=data.subscribe('tenants',()=>void loadLegal());
    return()=>{legalEpoch.current++;off();offSettings();};
  },[data,loadLegal]);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {mounted.current=true;return()=>{mounted.current=false;if(active.current)active.current.cancelled=true;active.current=null;};}, []);
  const previousScope=useRef(scope);
  useEffect(()=>{if(previousScope.current===scope)return;previousScope.current=scope;setBusy(false);setDup(false);setFailure(null);setErrors({});setF(value=>({...value,consent:false}));},[scope]);
  const currentLegalState=legalOwner===scope?legalState:'loading';
  const currentConsent=consentOwner===scope&&f.consent;
  const cancel = () => { if (active.current) active.current.cancelled = true; active.current = null; setBusy(false); setFailure(t('customer.signup.cancelled')); };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const strength = passwordStrength(f.password);
  const invite = params.get('invite');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (active.current) return;
    setFailure(null);
    const er: typeof errors = Object.fromEntries(Object.entries(signupErrors(f)).map(([field,key])=>[field,t(key)]));
    if (f.password.length < 8) er.password = t('customer.form.password.err');
    else if (f.password.length > SIGNUP_LIMITS.password) er.password = t('customer.signup.tooLong');
    if (!currentConsent) er.consent = t('customer.signup.consent.err');
    setErrors(er);
    setDup(false);
    if (Object.keys(er).length || !['ready','changed'].includes(currentLegalState)) return;
    const attempt = { cancelled: false };
    active.current = attempt;
    const isCurrent=()=>mounted.current&&context.current===scope&&active.current===attempt&&!attempt.cancelled;
    setBusy(true);
    try {
      // Intentionally omit the validated demo password from command arguments and receipts.
      const userId = await registerMockCustomer(data, { first: f.first, last: f.last, email: f.email, whatsapp: f.whatsapp, birthday: f.birthday, ecName: f.ecName, ecPhone: f.ecPhone, photo: f.photo, consent: currentConsent, legal, marketing: f.marketing, invite }, request.current, () => !isCurrent());
      if (!isCurrent()) return;
      const targetPath = customerReturn(params.get('next')) ?? '/app';
      publishLaunchNotification(data, { type: 'welcome', ownerId: userId, requestId: request.current }, { tenantId: tenant.id, actorId: user.id, role, sourcePath: location.pathname + location.search, targetPath, isCurrent });
      switchUser(userId);
      if (!isCurrent()) return;
      nav(targetPath);
    } catch (error) {
      if (!isCurrent()) return;
      if (error instanceof Error && error.message === 'registration_duplicate') setDup(true);
      else if(error instanceof Error&&/^registration_legal_/.test(error.message)){setF(v=>({...v,consent:false}));legalChanged.current=true;setLegalState('changed');void loadLegal();}
      else setFailure(t('customer.signup.failed'));
    } finally {
      if (active.current === attempt) { active.current = null; setBusy(false); }
    }
  };

  const onPhoto = (file: File | undefined) => { if (!file || file.size > 1_500_000) return; const owner=context.current,r = new FileReader(); r.onload = () => {if(mounted.current&&context.current===owner)set('photo', String(r.result));}; r.readAsDataURL(file); };

  return (
    <AuthShell>
      <div className="auth-col">
        <div className="auth-dots" aria-label={t('customer.signup.step', { n: 1, total: 3 })}><i className="is-on" /><i /><i /></div>
        <div className="stack-sm auth-intro"><h1 className="cust-title">{t('customer.signup.title')}</h1><p className="muted small">{t('customer.signup.sub')}</p></div>
        <Notice tone="info" title={t('customer.signup.fixture.title')}>{t('customer.signup.fixture.body')}</Notice>
        <Card padding="lg">
          <form className="stack" onSubmit={submit} noValidate>
            <div className="grid grid-2">
              <Field label={t('customer.form.first')} required error={errors.first}>{(id) => <Input id={id} maxLength={SIGNUP_LIMITS.first} value={f.first} onChange={(e) => set('first', e.target.value)} autoComplete="given-name" />}</Field>
              <Field label={t('customer.form.last')} required error={errors.last}>{(id) => <Input id={id} maxLength={SIGNUP_LIMITS.last} value={f.last} onChange={(e) => set('last', e.target.value)} autoComplete="family-name" />}</Field>
            </div>
            <Field label={t('customer.form.email')} required error={errors.email}>{(id) => <Input id={id} type="email" maxLength={SIGNUP_LIMITS.email} value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />}</Field>
            <Field label={t('customer.form.whatsapp')} required hint={t('customer.form.whatsapp.hint', { dial: tenant.dialCode })} error={errors.whatsapp}>{(id) => <Input id={id} inputMode="tel" maxLength={SIGNUP_LIMITS.whatsapp} value={f.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} autoComplete="tel" />}</Field>
            <Field label={t('customer.form.password')} required hint={t('customer.form.password.hint')} error={errors.password}>{(id) => (
              <div className="stack-sm">
                <Input id={id} type="password" maxLength={SIGNUP_LIMITS.password} value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
                <div className={`auth-strength auth-strength-${strength}`} aria-hidden><i /><i /><i /></div>
                {f.password && <span className="xs muted">{t(`customer.form.strength.${strength}`)}</span>}
              </div>
            )}</Field>
            <Field label={t('customer.form.birthday')} error={errors.birthday} hint={t('customer.form.birthday.hint')}>{(id) => <Input id={id} type="date" value={f.birthday} onChange={(e) => set('birthday', e.target.value)} />}</Field>
            <div className="eyebrow">{t('customer.form.emergency')}</div>
            <p className="xs muted">{t('customer.signup.emergency.why')}</p>
            <div className="grid grid-2">
              <Field label={t('customer.form.name')} required error={errors.ecName}>{(id) => <Input id={id} maxLength={SIGNUP_LIMITS.ecName} value={f.ecName} onChange={(e) => set('ecName', e.target.value)} />}</Field>
              <Field label={t('customer.form.phone')} required error={errors.ecPhone}>{(id) => <Input id={id} inputMode="tel" maxLength={SIGNUP_LIMITS.ecPhone} value={f.ecPhone} onChange={(e) => set('ecPhone', e.target.value)} />}</Field>
            </div>
            <Field label={t('customer.form.photo')} hint={t('customer.form.photo.hint')}>{(id) => (
              <div className="row">
                <Avatar name={`${f.first || 'H'} ${f.last || 'O'}`} src={f.photo} size={48} />
                <label className="btn btn-secondary btn-sm" htmlFor={id}>{t('customer.form.photo.pick')}<input id={id} type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} /></label>
                <span className="xs muted">{t('customer.form.optional')}</span>
              </div>
            )}</Field>
            <SignupLegalConsent state={currentLegalState} documents={legal} accepted={currentConsent} disabled={busy} error={errors.consent} onChange={value=>{setConsentOwner(scope);set('consent',value);if(value){legalChanged.current=false;setLegalState('ready');setErrors(e=>({...e,consent:undefined}));}}} onRetry={()=>void loadLegal()}/>
            {dup && <Notice tone="warn" title={t('customer.signup.dup')} action={<Link to={customerAuthLink('/auth/sign-in', params)}><Button size="sm" variant="secondary">{t('customer.signin.cta')}</Button></Link>}>{t('customer.signup.dup.body')}</Notice>}
            {failure && <Notice tone="warn">{failure}</Notice>}
            {busy && <Button type="button" variant="secondary" onClick={cancel}>{t('customer.signup.cancel')}</Button>}
            <Button type="submit" block size="lg" loading={busy} disabled={!['ready','changed'].includes(currentLegalState)}>{t('customer.signup.cta')}</Button>
          </form>
        </Card>
        <p className="small" style={{ textAlign: 'center' }}>{t('customer.signup.have')} <Link to={customerAuthLink('/auth/sign-in', params)}>{t('customer.signin.cta')}</Link></p>
      </div>
    </AuthShell>
  );
}
