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
import { PartialTeamChange, TEAM_ROLES, changeRole, invite, inviteRedirect, isTeamRole, listTeam, needsRepair, removeFromTeam, resendInvitation, sendInvitationEmail, teamGuard, teamRoleOf, type InviteOutcome, type TeamRoleKey, type TeamUser } from './teamApi';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** AD-06 in the production build: invite, re-send an invitation, change role and remove Front desk and Administration users. */
export function TeamUsersPanel() {
  const { t } = useI18n();
  const { user } = useSession();
  const request = cosRequest(useData());
  const [users, setUsers] = useState<TeamUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  /** The invitation link when the invitation exists but its email didn't go out: shown once, to copy, never stored. */
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  /** A half-applied role change or removal, to run again on the refreshed list. */
  const [retry, setRetry] = useState<{ userId: string; next: TeamRoleKey | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<{ email: string; role: TeamRoleKey }>({ email: '', role: 'front_desk' });
  // `request` is stable per provider; `t` is read through a ref so a re-render never re-fetches.
  const tRef = useRef(t); tRef.current = t;
  const load = useCallback(async () => {
    if (!request) return;
    try { setUsers(await listTeam(request)); } catch (e) { setError(deskErrorText(errorCode(e), tRef.current)); }
  }, [request]);
  useEffect(() => { void load(); }, [load]);
  const roleLabel = (k: string) => t(`team.role.${isTeamRole(k) ? k : 'other'}`);
  // One action at a time: a ref, so a double click lands before React re-renders with `busy`.
  const running = useRef(false);
  const act = async (id: string, work: () => Promise<string>) => {
    if (!request || running.current) return;
    running.current = true;
    setBusy(id); setError(null); setNotice(null); setLink(null); setRetry(null); setCopied(false);
    try { setNotice(await work()); } catch (e) {
      const repair = (e as { repair?: boolean }).repair ? ` ${t('team.repairNeeded')}` : '';
      setError(((e as { teamText?: string }).teamText ?? deskErrorText(errorCode(e), t)) + repair);
    } finally {
      // The list is read again before the next action (a retry) can start, so it never works from old memberships.
      await load(); running.current = false; setBusy(null);
    }
  };
  /** The email step of an invitation (§12: this app sends it). When only the email fails, the link is shown to copy. */
  const deliver = async (email: string, role: TeamRoleKey, res: InviteOutcome, done: string) => {
    const repair = res.repair ? ` ${t('team.repairNeeded')}` : '';
    if (res.kind !== 'invited') return t(res.kind === 'added' ? 'team.added' : res.kind === 'has_account' ? 'team.hasAccount' : 'team.signedUp', { email, role: roleLabel(role) }) + repair;
    try {
      await sendInvitationEmail(request!, { email, subject: t('team.mail.subject', { studio: tenant.name }), body: t('team.mail.body', { studio: tenant.name, role: roleLabel(role), url: res.url }) });
    } catch (e) {
      setLink({ email, url: res.url });
      throw Object.assign(new Error('mail_failed'), { teamText: t('team.mailFailed', { email, code: errorCode(e) }) + repair });
    }
    return t(done, { email, role: roleLabel(role) }) + repair;
  };
  /** Like `act`, with the team's own copy: a half-applied change says what happened, a failed email keeps its link. */
  const teamAct = (id: string, work: () => Promise<string>, again?: { userId: string; next: TeamRoleKey | null }) => act(id, async () => {
    try { return await work(); } catch (e) {
      if (e instanceof PartialTeamChange) { if (again) setRetry(again); throw Object.assign(new Error(e.step), { teamText: t(`team.partial.${e.step}`, { code: errorCode(e.cause) }) }); }
      throw e;
    }
  });
  const sendInvite = () => {
    const email = form.email.trim().toLowerCase(), role = form.role;
    if ((users ?? []).some(u => u.email.toLowerCase() === email)) { setNotice(null); setLink(null); setRetry(null); setError(t('team.already')); return; }
    void teamAct('invite', async () => {
      const res = await invite(request!, email, role, inviteRedirect(location.origin, role));
      setForm({ email: '', role });
      return deliver(email, role, res, 'team.invited');
    });
  };
  const resend = (u: TeamUser) => {
    const role = teamRoleOf(u);
    if (!role) return;
    void teamAct(`resend:${u.userId}`, async () => deliver(u.email.trim().toLowerCase(), role, await resendInvitation(request!, u, inviteRedirect(location.origin, role)), 'team.resent'));
  };
  const setRole = (u: TeamUser, next: TeamRoleKey, done: string) => teamAct(u.userId, async () => { await changeRole(request!, u, next); return t(done); }, { userId: u.userId, next });
  const remove = (u: TeamUser) => teamAct(u.userId, async () => { await removeFromTeam(request!, u); return t('team.removed'); }, { userId: u.userId, next: null });
  const runRetry = () => {
    const u = retry && (users ?? []).find(x => x.userId === retry.userId);
    if (!retry) return;
    if (!u) { setRetry(null); setError(null); setNotice(t('team.partial.gone')); return; }
    if (guarded(u, retry.next)) return;
    if (retry.next) void setRole(u, retry.next, 'team.changed'); else void remove(u);
  };
  const copyLink = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); setCopied(true); } catch { setCopied(false); }
  };
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
        {link && (
          <div className="row wrap">
            <Field label={t('team.link', { email: link.email })}>{id => <Input id={id} readOnly value={link.url} onFocus={e => e.currentTarget.select()} />}</Field>
            <Button size="sm" variant="secondary" icon="copy" onClick={() => void copyLink()}>{t(copied ? 'team.link.copied' : 'team.link.copy')}</Button>
          </div>
        )}
        {retry && <Button size="sm" variant="secondary" disabled={!!busy} onClick={runRetry}>{t('team.partial.retry')}</Button>}
        {!users ? <EmptyState compact tone="loading" title={t('core.common.loading')} /> : users.length === 0 ? <EmptyState compact title={t('team.empty')} /> : users.map(u => {
          const current = teamRoleOf(u) as TeamRoleKey;
          return <div key={u.userId} className="row-between wrap">
            <span><strong className="small crm-name">{u.name || u.email}</strong> <span className="xs muted">{u.email}</span> <Badge tone={current === 'administrator' ? 'primary' : 'neutral'}>{roleLabel(current)}</Badge></span>
            <span className="row wrap">
              <Select aria-label={t('team.role')} value={current} disabled={!!busy} onChange={e => { const next = e.target.value as TeamRoleKey; if (next !== current && !guarded(u, next)) void setRole(u, next, 'team.changed'); }}>{TEAM_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}</Select>
              {needsRepair(u) && <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => { if (!guarded(u, current)) void setRole(u, current, 'team.repaired'); }}>{t('team.repair')}</Button>}
              {/* The list can't tell who has signed up: Company OS answers `already_signed_up` and the notice says so. */}
              {u.userId !== user.id && <Button size="sm" variant="ghost" icon="mail" disabled={!!busy} loading={busy === `resend:${u.userId}`} onClick={() => resend(u)}>{t('team.resend')}</Button>}
              <Button size="sm" variant="outline" disabled={!!busy} loading={busy === u.userId} onClick={() => { if (!guarded(u, null)) void remove(u); }}>{t('team.remove')}</Button>
            </span>
          </div>;
        })}
      </div>
    </Card>
  );
}
