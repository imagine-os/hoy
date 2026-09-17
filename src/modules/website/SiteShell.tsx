import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useTheme } from '../../design/ThemeProvider';
import { tenant } from '../../tenant/tenant';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { LangToggle } from '../../components/molecule/LangToggle/LangToggle';
import { Button } from '../../components/atom/Button/Button';
import './site.css';

const NAV = [['/site/about', 'about'], ['/site/modalities', 'modalities'], ['/site/schedule', 'schedule'], ['/site/teachers', 'teachers'], ['/site/plans', 'plans'], ['/site/contact', 'contact']] as const;

/** Public website chrome: header with nav + footer. Pages of this module wrap themselves in it. */
export function SiteShell({ children }: { children: ReactNode }) {
  const { t, bi } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="site">
      <header className="site-head">
        <div className="container site-head-in">
          <Link to="/site" className="site-brand" onClick={() => setOpen(false)}><Wordmark height={30} /></Link>
          <nav className={`site-nav ${open ? 'is-open' : ''}`} aria-label="Site">
            {NAV.map(([to, k]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'is-active' : '')} onClick={() => setOpen(false)}>{t(`site.nav.${k}`)}</NavLink>)}
          </nav>
          <div className="site-actions">
            <LangToggle size="sm" />
            <button type="button" className="site-iconbtn" onClick={toggleTheme} aria-label={t('core.theme.toggle')}>{theme === 'dark' ? '☾' : '☀'}</button>
            <Link to="/auth/sign-in"><Button size="sm">{t('site.nav.signin')}</Button></Link>
            <button type="button" className="site-burger" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>☰</button>
          </div>
        </div>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-foot">
        <div className="container site-foot-in">
          <div className="stack-sm">
            <Wordmark height={24} />
            <span className="small muted">{bi(tenant.tagline)} · {tenant.city}</span>
          </div>
          <div className="site-foot-links small">
            <Link to="/site/legal/terms">{t('site.legal.terms')}</Link>
            <Link to="/site/legal/privacy">{t('site.legal.privacy')}</Link>
            <Link to="/site/contact">{t('site.nav.contact')}</Link>
            <Link to="/">{t('site.footer.hub')}</Link>
          </div>
          <span className="xs muted">{t('site.footer.rights', { year: new Date().getFullYear(), name: tenant.legalName })}</span>
        </div>
      </footer>
    </div>
  );
}

export function PageHead({ title, body }: { title: string; body?: string }) {
  return (
    <div className="site-pagehead container">
      <h1>{title}</h1>
      {body && <p className="muted site-lead">{body}</p>}
    </div>
  );
}
