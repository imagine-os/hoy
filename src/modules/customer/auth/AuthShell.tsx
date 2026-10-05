import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTheme } from '../../../design/ThemeProvider';
import { tenant } from '../../../tenant/tenant';
import { TopBar } from '../../../components/organism/TopBar/TopBar';
import { LangToggle } from '../../../components/molecule/LangToggle/LangToggle';
import '../customer.css';

/**
 * Public shell for the auth flow (A-01…A-03, C-21, E-04): the same top bar as AppShell (wordmark, language, theme) over
 * one centred column — 480 px on a phone, 576 px from 900 px — so site → sign-in → app reads as one system (D-0006).
 */
export function AuthShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="auth">
      {!bare && <TopBar brand homeTo="/hub" actions={<><LangToggle size="sm" /><button type="button" className="auth-iconbtn ctl-round" onClick={toggleTheme} aria-label={t('core.theme.toggle')}>{theme === 'dark' ? '☾' : '☀'}</button></>} />}
      <main className="auth-main">{children}</main>
      {!bare && <footer className="auth-foot xs muted">{tenant.legalName} · {tenant.city} · <Link to="/site/legal/privacy">{t('customer.profile.legal.privacy')}</Link> · <Link to="/hub">{t('core.nav.hub')}</Link></footer>}
    </div>
  );
}
