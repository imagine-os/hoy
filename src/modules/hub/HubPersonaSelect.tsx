import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_HOME, ROLE_LABEL, type Role } from '../../auth/roles';
import { isViewAsFailure, VIEWABLE_ROLES } from '../../auth/viewAs';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { Select } from '../../components/atom/Input/Input';
import type { HubPeople } from './hubPeople';
import '../../components/molecule/RoleSwitcher/RoleSwitcher.css';

/**
 * The production Hub's persona dropdown (lane Y3): the review build's persona switcher, with real people. The signed-in
 * super admin first, then every viewable role with the person holding it (the one view-as samples). Choosing one views
 * the studio as that role, read-only, and opens its home; a role nobody holds says so and can't be chosen.
 */
export function HubPersonaSelect({ people }: { people: HubPeople | null }) {
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const { user, setViewAs } = useSession();
  const choose = (value: string) => {
    const role = VIEWABLE_ROLES.find((r) => r === value);
    if (!role) return;
    setViewAs(role);
    nav(ROLE_HOME[role]);
  };
  const label = (role: Role) => {
    const p = people?.[role] ?? null;
    const name = !people ? '…' : isViewAsFailure(p) ? t('hub.persona.unavailable') : p ? p.name : t('hub.persona.nobody');
    return `${name} · ${bi(ROLE_LABEL[role])}`;
  };
  return (
    <div className="roleswitcher">
      <Avatar name={user.name} initials={user.initials} size={28} />
      <label className="sr-only" htmlFor="hub-persona">{t('core.session.switch')}</label>
      <Select id="hub-persona" data-hub-persona value="" onChange={(e) => choose(e.target.value)} aria-label={t('core.session.switch')}>
        <option value="">{user.name} · {bi(ROLE_LABEL.super_admin)}</option>
        {VIEWABLE_ROLES.map((role) => (
          <option key={role} value={role} disabled={people !== null && people[role] === null}>{label(role)}</option>
        ))}
      </Select>
    </div>
  );
}
