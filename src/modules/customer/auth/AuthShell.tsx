import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTheme } from '../../../design/ThemeProvider';
import { tenant } from '../../../tenant/tenant';
import { Wordmark } from '../../../components/atom/Wordmark/Wordmark';
import { LangToggle } from '../../../components/molecule/LangToggle/LangToggle';
import '../customer.css';

/** Minimal public shell for the auth flow: wordmark, language, theme, a single centred column. */
export function AuthShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="auth">
      {!bare && (
        <header className="auth-head">
          <Link to="/" className="auth-brand" title={t('core.nav.hub')}><Wordmark height={26} /></Link>
          <div className="row"><LangToggle size="sm" /><button type="button" className="auth-iconbtn" onClick={toggleTheme} aria-label={t('core.theme.toggle')}>{theme === 'dark' ? '☾' : '☀'}</button></div>
        </header>
      )}
      <main className="auth-main">{children}</main>
      {!bare && <footer className="auth-foot xs muted">{tenant.legalName} · {tenant.city} · <Link to="/site/legal/privacy">{t('customer.profile.legal.privacy')}</Link> · <Link to="/">{t('core.nav.hub')}</Link></footer>}
    </div>
  );
}
