import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { RouteDef, Surface } from '../../../specs/types';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { TopBar } from '../../organism/TopBar/TopBar';
import { NavBar } from '../../organism/NavBar/NavBar';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import { Avatar } from '../../atom/Avatar/Avatar';
import './PhoneShell.css';

export interface PhoneShellProps {
  surface: Surface;
  routes: RouteDef[];
  homeTo: string;
  children: ReactNode;
  /** Hide the shell's own top bar when the page brings its own. */
  bare?: boolean;
}

/** Mobile-first shell: brand top bar, content column, bottom nav. Centres as a column on desktop. */
export function PhoneShell({ surface, routes, homeTo, children, bare = false }: PhoneShellProps) {
  const { t } = useI18n();
  const { user, hasRole } = useSession();
  const items = routes.filter((r) => r.surface === surface && r.nav && hasRole(r.roles)).sort((a, b) => a.nav!.order - b.nav!.order)
    .map((r) => ({ to: r.path, label: t(r.nav!.labelKey), icon: r.nav!.icon, end: r.path === homeTo }));
  return (
    <div className="phoneshell">
      <div className="phoneshell-col">
        {!bare && <TopBar brand homeTo={homeTo} actions={<><LangToggle size="sm" /><Link to="/" className="phoneshell-avatar" title={t('core.nav.hub')}><Avatar name={user.name} initials={user.initials} size={30} /></Link></>} />}
        <main className="phoneshell-main">{children}</main>
        {items.length > 0 && <div className="phoneshell-nav"><NavBar items={items} /></div>}
      </div>
    </div>
  );
}
