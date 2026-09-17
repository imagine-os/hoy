import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTheme } from '../../design/ThemeProvider';
import { ROLE_HOME, ROLE_LABEL, STAFF_ROLES, type Role } from '../../auth/roles';
import { demoUserByRole } from '../../auth/demoUsers';
import { tenant } from '../../tenant/tenant';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { LangToggle } from '../../components/molecule/LangToggle/LangToggle';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { RoleSwitcher } from '../../components/molecule/RoleSwitcher/RoleSwitcher';
import { Badge } from '../../components/atom/Badge/Badge';
import './hub.css';

const CARDS: { key: string; to: string; icon: string; role?: Role; cta?: string }[] = [
  { key: 'website', to: '/site', icon: '◎' },
  { key: 'customer', to: '/auth/sign-in', icon: '☼', cta: 'hub.signin' },
  { key: 'teacher', to: '/teach', icon: '✦', role: 'teacher' },
  { key: 'manual', to: '/manual', icon: '▤' },
  { key: 'docs', to: '/docs', icon: '❡' },
];

export function HubPage() {
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const { user, isSuperAdmin, devMode, setDevMode, switchUser } = useSession();
  const { theme, toggleTheme, skin, toggleSkin } = useTheme();

  const enter = (to: string, role?: Role) => { if (role) switchUser(role); nav(to); };

  return (
    <div className="hub">
      <header className="hub-head container">
        <div className="row"><Wordmark height={34} /><Badge tone="highlight">v0</Badge></div>
        <div className="row wrap">
          <LangToggle />
          <button type="button" className="hub-iconbtn" onClick={toggleTheme} aria-label={t('core.theme.toggle')}>{theme === 'dark' ? '☾' : '☀'}</button>
          {isSuperAdmin && <Toggle size="sm" checked={skin === 'wireframe'} onChange={toggleSkin} label={t('hub.wireframe')} />}
          {isSuperAdmin && <Toggle checked={devMode} onChange={setDevMode} label={t('core.dev.mode')} />}
        </div>
      </header>

      <main className="container hub-main">
        <section className="hub-hero">
          <p className="eyebrow">{tenant.legalName} · {tenant.city}</p>
          <h1>{t('hub.title')}</h1>
          <p className="muted hub-sub">{t('hub.subtitle')}</p>
          <div className="hub-session"><span className="small muted">{t('hub.session')}</span><RoleSwitcher /></div>
          {devMode && <p className="small hub-devhint">{t('hub.devHint')}</p>}
        </section>

        <section className="hub-grid">
          {CARDS.map((c) => (
            <Card key={c.key} interactive onClick={() => enter(c.to, c.role)} className="hub-card" padding="lg">
              <span className="hub-card-icon" aria-hidden>{c.icon}</span>
              <h3>{t(`hub.card.${c.key}`)}</h3>
              <p className="muted small grow">{t(`hub.card.${c.key}.body`)}</p>
              <span className="hub-card-cta">{c.role ? t('hub.enterAs', { name: demoUserByRole(c.role).name }) : t(c.cta ?? 'hub.open')} →</span>
            </Card>
          ))}

          <Card className="hub-card hub-card-staff" padding="lg">
            <span className="hub-card-icon" aria-hidden>▦</span>
            <h3>{t('hub.card.staff')}</h3>
            <p className="muted small">{t('hub.card.staff.body')}</p>
            <div className="hub-roles">
              {STAFF_ROLES.map((r) => (
                <Button key={r} size="sm" variant={user.role === r ? 'primary' : 'secondary'} onClick={() => enter(ROLE_HOME[r], r)}>{bi(ROLE_LABEL[r])}</Button>
              ))}
            </div>
          </Card>

          {isSuperAdmin && <Card className="hub-card hub-card-dev" padding="lg">
            <span className="hub-card-icon" aria-hidden>⌥</span>
            <h3>{t('hub.card.dev')}</h3>
            <p className="muted small">{t('hub.card.dev.body')}</p>
            <div className="hub-devlinks">
              <Link to="/dev/tokens">{t('hub.dev.tokens')}</Link>
              <Link to="/dev/components">{t('hub.dev.components')}</Link>
              <Link to="/dev/specs">{t('hub.dev.specs')}</Link>
              <Link to="/admin/tables">{t('hub.dev.tables')}</Link>
              <Link to="/dev/layout/C-01">{t('hub.dev.layout')}</Link>
              <Link to="/dev/knowledgebase">{t('hub.dev.kb')}</Link>
            </div>
          </Card>}
        </section>
      </main>
      <footer className="container hub-foot muted xs">{t('hub.footer')}</footer>
    </div>
  );
}
