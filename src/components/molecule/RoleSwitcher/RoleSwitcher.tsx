import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { demoUsers } from '../../../auth/demoUsers';
import { ROLE_LABEL, ROLES, type Role } from '../../../auth/roles';
import { Select } from '../../atom/Input/Input';
import { Avatar } from '../../atom/Avatar/Avatar';
import { Button } from '../../atom/Button/Button';
import { PRODUCTION_BUILD } from '../../../config/launch';
import './RoleSwitcher.css';

/**
 * Review build: switch demo user, and (super admin only) "view as" another role. Production build (PL-03): no persona
 * list; the signed-in person and a sign-out button.
 */
export function RoleSwitcher({ compact = false }: { compact?: boolean }) {
  return PRODUCTION_BUILD ? <AccountChip compact={compact} /> : <DemoRoleSwitcher compact={compact} />;
}

function AccountChip({ compact }: { compact: boolean }) {
  const { t } = useI18n();
  const { user, signedIn, signOut } = useSession();
  if (!signedIn) return null;
  return (
    <div className={`roleswitcher ${compact ? 'is-compact' : ''}`} data-account-chip>
      <Avatar name={user.name} initials={user.initials} size={28} />
      {!compact && <span className="small">{user.name}</span>}
      <Button size="sm" variant="ghost" icon="log-out" onClick={() => void signOut()}>{t('core.session.signOut')}</Button>
    </div>
  );
}

function DemoRoleSwitcher({ compact }: { compact: boolean }) {
  const { bi, t } = useI18n();
  const { user, isSuperAdmin, viewAs, switchUser, setViewAs } = useSession();
  return (
    <div className={`roleswitcher ${compact ? 'is-compact' : ''}`}>
      {!compact && <Avatar name={user.name} initials={user.initials} size={28} />}
      <label className="sr-only" htmlFor="rs-user">{t('core.session.switch')}</label>
      <Select id="rs-user" value={user.id} onChange={(e) => switchUser(e.target.value)} aria-label={t('core.session.switch')}>
        {demoUsers.map((u) => <option key={u.id} value={u.id}>{u.name} · {bi(ROLE_LABEL[u.role])}</option>)}
      </Select>
      {isSuperAdmin && (
        <Select value={viewAs ?? ''} onChange={(e) => setViewAs((e.target.value || null) as Role | null)} aria-label={t('core.dev.viewAs')}>
          <option value="">{t('core.dev.viewAs')}: —</option>
          {ROLES.filter((r) => r !== 'super_admin').map((r) => <option key={r} value={r}>{t('core.dev.viewAs')}: {bi(ROLE_LABEL[r])}</option>)}
        </Select>
      )}
    </div>
  );
}
