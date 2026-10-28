import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Badge } from '../../../components/atom/Badge/Badge';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { cosRequest, errorCode } from '../../staff/desk/wire';
import { deskErrorText } from '../../staff/desk/strings';
import { TEAM_ROLES, changeRole, invite, isTeamRole, listTeam, removeFromTeam, sendInvitationEmail, teamGuard, type TeamRoleKey, type TeamUser } from './teamApi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** AD-06 in the production build: invite, change role and remove Front desk and Administration users. */
export function TeamUsersPanel() {
  const { t } = useI18n();
  const { user } = useSession();
  const request = cosRequest(useData());
  const [users, setUsers] = useState<TeamUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<{ email: string; role: TeamRoleKey }>({ email: '', role: 'front_desk' });
  // `request` is stable per provider; `t` is read through a ref so a re-render never re-fetches.
  const tRef = useRef(t); tRef.current = t;
  const load = useCallback(async () => {
    if (!request) return;
    try { setUsers(await listTeam(request)); } catch (e) { setError(deskErrorText(errorCode(e), tRef.current)); }
  }, [request]);
  useEffect(() => { void load(); }, [load]);
  const roleLabel = (k: string) => t(`team.role.${isTeamRole(k) ? k : 'other'}`);
  const act = async (id: string, work: () => Promise<unknown>, ok: string) => {
    if (!request || busy) return;
    setBusy(id); setError(null); setNotice(null);
    try { await work(); setNotice(ok); } catch (e) { setError(deskErrorText(errorCode(e), t)); } finally { setBusy(null); void load(); }
  };
  const sendInvite = () => act('invite', async () => {
    const res = await invite(request!, form.email, form.role, `${location.origin}/`);
    await sendInvitationEmail(request!, { email: form.email, subject: t('team.mail.subject', { studio: tenant.name }), body: t('team.mail.body', { studio: tenant.name, role: roleLabel(form.role), url: res.url }) });
    setForm({ email: '', role: form.role });
  }, t('team.invited', { email: form.email.trim() }));
  const guarded = (u: TeamUser, next: TeamRoleKey | null) => { const g = teamGuard(users ?? [], u, next, user.id); if (g) setError(t(`team.guard.${g}`)); return !!g; };

  if (!request) return null;
  return (
    <Card title={t('team.title')}>
      <div className="stack-sm">
        <p className="xs muted">{t('team.body')}</p>
        <div className="row wrap">
          <Field label={t('team.email')}>{id => <Input id={id} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />}</Field>
          <Field label={t('team.role')}>{id => <Select id={id} value={form.role} onChange={e => setForm({ ...form, role: e.target.value as TeamRoleKey })}>{TEAM_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</Select>}</Field>
          <Button disabled={!EMAIL.test(form.email.trim()) || !!busy} loading={busy === 'invite'} onClick={sendInvite}>{t('team.invite')}</Button>
        </div>
        {notice && <p className="small rooms-free" role="status">{notice}</p>}
        {error && <p className="small register-diff" role="alert">{error}</p>}
        {!users ? <EmptyState compact tone="loading" title={t('core.common.loading')} /> : users.length === 0 ? <EmptyState compact title={t('team.empty')} /> : users.map(u => {
          const current = u.memberships.find(m => isTeamRole(m.roleKey))?.roleKey as TeamRoleKey;
          return <div key={u.userId} className="row-between wrap">
            <span><strong className="small crm-name">{u.name || u.email}</strong> <span className="xs muted">{u.email}</span> <Badge tone={current === 'administrator' ? 'primary' : 'neutral'}>{roleLabel(current)}</Badge></span>
            <span className="row wrap">
              <Select aria-label={t('team.role')} value={current} disabled={!!busy} onChange={e => { const next = e.target.value as TeamRoleKey; if (next !== current && !guarded(u, next)) void act(u.userId, () => changeRole(request, u, next), t('team.changed')); }}>{TEAM_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</Select>
              <Button size="sm" variant="outline" disabled={!!busy} loading={busy === u.userId} onClick={() => { if (!guarded(u, null)) void act(u.userId, () => removeFromTeam(request, u), t('team.removed')); }}>{t('team.remove')}</Button>
            </span>
          </div>;
        })}
      </div>
    </Card>
  );
}
