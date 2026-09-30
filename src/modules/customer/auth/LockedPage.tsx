import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useWhatsappLink } from '../../admin/settings';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { CountdownRing } from '../../../components/molecule/CountdownRing/CountdownRing';
import { policy } from '../policy';
import { AuthShell } from './AuthShell';
import { ATTEMPTS_KEY, LOCK_KEY } from './SignInPage';
import { MS } from '../../../i18n/format';

/** E-04 Sign-in locked — state the pause, count it down, route to recovery. */
export function LockedPage() {
  const { t, bi } = useI18n();
  // 0047: a locked account is a `support` handoff (M-08a contacts; the front desk by default).
  const wa = useWhatsappLink();
  const support = wa.resolve('support');
  const nav = useNavigate();
  const [until] = useState(() => {
    try { const v = sessionStorage.getItem(LOCK_KEY); if (v && new Date(v).getTime() > Date.now()) return v; } catch { /* ignore */ }
    const d = new Date(Date.now() + policy.lockoutMinutes * MS.min).toISOString();
    try { sessionStorage.setItem(LOCK_KEY, d); } catch { /* ignore */ }
    return d;
  });
  const unlock = () => { try { sessionStorage.removeItem(LOCK_KEY); sessionStorage.removeItem(ATTEMPTS_KEY); } catch { /* ignore */ } nav('/auth/sign-in', { replace: true }); };
  return (
    <AuthShell>
      <div className="auth-col">
        <Card padding="lg" className="stack cust-center">
          <Notice tone="warn" title={t('customer.locked.title')}>{t('customer.locked.body', { n: policy.lockoutAttempts, min: policy.lockoutMinutes })}</Notice>
          <CountdownRing until={until} tone="warn" size={150} label={t('customer.locked.wait')} showHours={false} onDone={unlock} />
          <Link to="/auth/recover" style={{ width: '100%' }}><Button block size="lg">{t('customer.locked.recover')}</Button></Link>
          <a href={wa.link('support', t('customer.locked.whatsappText'))} target="_blank" rel="noreferrer" style={{ width: '100%' }}><Button block variant="secondary">{t('customer.locked.whatsapp')}</Button></a>
          {support.note && <p className="xs muted">{bi(support.note)}</p>}
          <p className="xs muted">{t('customer.locked.security')}</p>
        </Card>
      </div>
    </AuthShell>
  );
}
