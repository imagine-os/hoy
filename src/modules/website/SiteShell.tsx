import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useTheme } from '../../design/ThemeProvider';
import { tenant } from '../../tenant/tenant';
import { taglines } from '../../tenant/brand';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { LangToggle } from '../../components/molecule/LangToggle/LangToggle';
import { Button } from '../../components/atom/Button/Button';
import './site.css';

const NAV = [
  ['/site/about', 'about'], ['/site/classes', 'classes'], ['/site/schedule', 'schedule'],
  ['/site/teachers', 'teachers'], ['/site/plans', 'plans'], ['/site/contact', 'contact'],
] as const;

export const waHref = (message?: string) => {
  const number = tenant.contact.whatsapp.replace(/\D/g, '');
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
};

/** Public website chrome: header with nav + a footer that carries hours, address and social. */
export function SiteShell({ children }: { children: ReactNode }) {
  const { t, bi } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const pending = ` (${bi(tenant.contact.pendingLabel)})`;
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
        <div className="container site-foot-grid">
          <div className="stack-sm">
            <Wordmark height={26} />
            <span className="small">{bi(taglines.life)}</span>
            <span className="xs muted">{bi(tenant.tagline)} · {tenant.city}</span>
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('site.footer.visit')}</span>
            <span className="small">{tenant.contact.address}</span>
            <span className="small muted">{bi(tenant.hours)}</span>
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('site.footer.follow')}</span>
            <a className="small" href={waHref()} target="_blank" rel="noreferrer">WhatsApp {tenant.contact.whatsapp}{pending}</a>
            <a className="small" href={tenant.social.instagramUrl} target="_blank" rel="noreferrer">Instagram {tenant.social.instagram}{pending}</a>
            <a className="small" href={`mailto:${tenant.contact.email}`}>{tenant.contact.email}{pending}</a>
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('site.footer.explore')}</span>
            <Link className="small" to="/site/classes">{t('site.nav.classes')}</Link>
            <Link className="small" to="/site/plans">{t('site.nav.plans')}</Link>
            <Link className="small" to="/site/legal/terms">{t('site.legal.terms')}</Link>
            <Link className="small" to="/site/legal/privacy">{t('site.legal.privacy')}</Link>
            <Link className="small" to="/">{t('site.footer.hub')}</Link>
          </div>
          <div className="stack-sm">
            <span className="eyebrow">{t('site.footer.lang')}</span>
            <LangToggle size="sm" />
          </div>
        </div>
        <div className="container site-foot-bottom">
          <span className="xs muted">{t('site.footer.rights', { year: new Date().getFullYear(), name: tenant.legalName })}</span>
        </div>
      </footer>
    </div>
  );
}

export function PageHead({ title, body, eyebrow, back }: { title: string; body?: string; eyebrow?: string; back?: { to: string; label: string } }) {
  return (
    <div className="site-pagehead container">
      {back && <Link className="small site-back" to={back.to}>‹ {back.label}</Link>}
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {body && <p className="muted site-lead">{body}</p>}
    </div>
  );
}

/** Section heading used by every site section. */
export function SectionHead({ title, body, eyebrow, action }: { title: string; body?: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="site-section-top">
      <div className="site-section-head">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {body && <p className="muted">{body}</p>}
      </div>
      {action && <div className="site-section-action">{action}</div>}
    </div>
  );
}
