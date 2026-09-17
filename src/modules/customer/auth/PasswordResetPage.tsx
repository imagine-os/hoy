import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { OtpInput } from '../../../components/molecule/OtpInput/OtpInput';
import { SegmentedControl } from '../../../components/molecule/SegmentedControl/SegmentedControl';
import { policy } from '../policy';
import { AuthShell } from './AuthShell';
import { passwordStrength } from './SignUpPage';
import { tenant } from '../../../tenant/tenant';

type Channel = 'whatsapp' | 'email';
const RESEND_KEY = 'hoyos.auth.otpResendAt';
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

/** C-21 Password recovery — six-digit WhatsApp code, email as fallback. Simulated: the demo code is shown on screen. */
export function PasswordResetPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [ident, setIdent] = useState(`${tenant.dialCode} `);
  const [code, setCode] = useState(genCode);
  const [entered, setEntered] = useState('');
  const [wrong, setWrong] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [resendAt, setResendAt] = useState<number>(() => { try { return Number(sessionStorage.getItem(RESEND_KEY) ?? 0); } catch { return 0; } });
  const [now, setNow] = useState(Date.now());
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  const send = () => {
    setBusy(true);
    setTimeout(() => {
      const next = Date.now() + policy.otpResendSeconds * 1000;
      setResendAt(next); try { sessionStorage.setItem(RESEND_KEY, String(next)); } catch { /* ignore */ }
      setCode(genCode()); setEntered(''); setWrong(0); setInvalid(false); setStep(2); setBusy(false);
    }, 600);
  };
  const verify = (v: string) => {
    if (v === code) { setInvalid(false); setStep(3); return; }
    setInvalid(true); setEntered('');
    const n = wrong + 1; setWrong(n);
    if (n >= 3) { setCode(''); }
  };
  const save = () => { setBusy(true); setTimeout(() => { setBusy(false); setStep(4); }, 600); };
  const strength = passwordStrength(password);

  return (
    <AuthShell>
      <div className="auth-col">
        <Link to="/auth/sign-in" className="cust-back">‹ <span>{t('customer.reset.back')}</span></Link>
        <div className="auth-dots" aria-label={t('customer.signup.step', { n: Math.min(3, step), total: 3 })}>{[1, 2, 3].map((n) => <i key={n} className={step >= n ? 'is-on' : ''} />)}</div>

        {step === 1 && (
          <Card padding="lg" className="stack">
            <div className="stack-sm"><h1 className="cust-title">{t('customer.reset.title')}</h1><p className="muted small">{t('customer.reset.sub')}</p></div>
            <SegmentedControl block ariaLabel={t('customer.reset.channel')} value={channel} onChange={(c) => { setChannel(c); setIdent(c === 'whatsapp' ? `${tenant.dialCode} ` : ''); }} options={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'email', label: 'Email' }]} />
            <Field label={channel === 'whatsapp' ? t('customer.form.whatsapp') : t('customer.form.email')}>{(id) => <Input id={id} value={ident} onChange={(e) => setIdent(e.target.value)} inputMode={channel === 'whatsapp' ? 'tel' : 'email'} type={channel === 'email' ? 'email' : 'text'} />}</Field>
            <Button block size="lg" loading={busy} disabled={ident.trim().length < 5} onClick={send}>{t('customer.reset.send')}</Button>
            <p className="xs muted">{t('customer.reset.privacy')} · Ley 1581 de 2012</p>
          </Card>
        )}

        {step === 2 && (
          <Card padding="lg" className="stack">
            <div className="stack-sm"><h1 className="cust-title">{t('customer.reset.otp.title')}</h1><p className="muted small">{t('customer.reset.otp.sub', { to: ident, min: policy.otpValidMinutes })}</p></div>
            <Notice tone="info">{code ? t('customer.reset.demoCode', { code }) : t('customer.reset.codeInvalidated')}</Notice>
            <OtpInput value={entered} onChange={(v) => { setEntered(v); setInvalid(false); }} label={t('customer.reset.otp.title')} invalid={invalid} disabled={!code} onComplete={verify} />
            {invalid && code && <p className="small" style={{ color: 'var(--color-danger)', textAlign: 'center' }} role="alert">{t('customer.reset.wrong', { n: 3 - wrong })}</p>}
            <Button block variant="secondary" disabled={resendIn > 0} onClick={send}>{resendIn > 0 ? t('customer.reset.resendIn', { s: resendIn }) : t('customer.reset.resend')}</Button>
            <button type="button" className="cust-linkbtn small" onClick={() => { setChannel((c) => (c === 'whatsapp' ? 'email' : 'whatsapp')); setStep(1); }}>{channel === 'whatsapp' ? t('customer.reset.useEmail') : t('customer.reset.useWhatsapp')}</button>
          </Card>
        )}

        {step === 3 && (
          <Card padding="lg" className="stack">
            <div className="stack-sm"><h1 className="cust-title">{t('customer.reset.new.title')}</h1><p className="muted small">{t('customer.form.password.hint')}</p></div>
            <Field label={t('customer.form.password')} required>{(id) => (
              <div className="stack-sm">
                <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className={`auth-strength auth-strength-${strength}`} aria-hidden><i /><i /><i /></div>
                {password && <span className="xs muted">{t(`customer.form.strength.${strength}`)}</span>}
              </div>
            )}</Field>
            <Button block size="lg" loading={busy} disabled={password.length < 8} onClick={save}>{t('customer.reset.save')}</Button>
            <p className="xs muted">{t('customer.reset.signOutOthers')}</p>
          </Card>
        )}

        {step === 4 && (
          <Card padding="lg" className="stack">
            <Notice tone="success" title={t('customer.reset.done.title')}>{t('customer.reset.done.body')}</Notice>
            <Button block size="lg" onClick={() => nav('/auth/sign-in')}>{t('customer.signin.cta')}</Button>
          </Card>
        )}
      </div>
    </AuthShell>
  );
}
