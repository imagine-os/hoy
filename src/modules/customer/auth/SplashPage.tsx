import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { Wordmark } from '../../../components/atom/Wordmark/Wordmark';
import { Button } from '../../../components/atom/Button/Button';
import { BreathingRings } from '../../../components/organism/BreathingRings/BreathingRings';
import { AuthShell } from './AuthShell';

const AUTO_MS = 2800;

/** A-01 Splash — three rings breathe around the wordmark while the session restores; then sign-in. */
export function SplashPage() {
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setReady(true), 900);
    const b = setTimeout(() => nav('/auth/sign-in', { replace: true }), AUTO_MS);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [nav]);
  return (
    <AuthShell bare>
      <div className="auth-splash">
        <BreathingRings size={300}>
          <span className="auth-splash-line">{t('customer.splash.line1')}</span>
          <Wordmark height={64} />
          <span className="auth-splash-line">{t('customer.splash.line2')}</span>
        </BreathingRings>
        <p className="auth-splash-tag muted">{bi(tenant.tagline)}</p>
        <div className="auth-splash-load" role="status" aria-live="polite">
          <span className={`auth-spinner ${ready ? 'is-done' : ''}`} aria-hidden />
          <span className="xs muted">{ready ? t('customer.splash.ready') : t('customer.splash.loading')}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => nav('/auth/sign-in', { replace: true })}>{t('customer.splash.continue')} →</Button>
      </div>
    </AuthShell>
  );
}
