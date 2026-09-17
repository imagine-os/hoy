import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData, useTable } from '../../../data/DataContext';
import type { DeletionRequestRow, LegalAcceptanceRow } from '../../../data/schema';
import { formatDate, formatDateTime } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { useSettings } from '../../admin/settings';
import { useAudit } from '../../staff/audit';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { LEGAL_KINDS, legalTitleKey } from '../legal';
import { canvasSpecs } from '../specs';
import { useMyProfile, useNotificationPrefs } from '../hooks';
import { downloadJson, PageHead } from '../ui';

const spec = canvasSpecs['C-26'];

/** The member's own rows, table by table, for the JSON export. `where` names the column that points at the user. */
const EXPORT_TABLES: [table: string, column: string][] = [
  ['users', 'id'], ['profiles', 'user_id'], ['user_roles', 'user_id'], ['memberships', 'user_id'], ['credits', 'user_id'], ['bookings', 'user_id'], ['waitlist', 'user_id'],
  ['payments', 'user_id'], ['payment_methods', 'user_id'], ['intentions', 'user_id'], ['reviews', 'user_id'], ['invites', 'inviter_user_id'], ['event_rsvps', 'user_id'],
  ['notifications', 'user_id'], ['notification_prefs', 'user_id'], ['consents', 'user_id'], ['legal_acceptances', 'user_id'], ['message_log', 'user_id'], ['deletion_requests', 'user_id'],
];

/**
 * C-26 `/app/account` — Cuenta y datos. The account-level rights the stores and Ley 1581 both expect
 * in one place: who holds the data, the consents the member controls, a copy of their own rows, the
 * legal library, and the request to delete the account. Deleting is a *request*: the row goes to
 * `deletion_requests`, admin follows it in M-11, and the anonymisation itself runs server-side later.
 */
export function AccountPage() {
  const { t, lang } = useI18n();
  const data = useData();
  const { user } = useSession();
  const { settings } = useSettings();
  const audit = useAudit('app');
  const { sections, isVisible } = useLayout(spec);
  const { profile, account } = useMyProfile();
  const prefs = useNotificationPrefs();
  const { rows: acceptances } = useTable<LegalAcceptanceRow>('legal_acceptances', { where: { user_id: user.id, kind: 'privacy' } });
  const { rows: requests } = useTable<DeletionRequestRow>('deletion_requests', { where: { user_id: user.id }, orderBy: { column: 'requested_at', dir: 'desc' } });
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [reason, setReason] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const open = requests.find((r) => r.status === 'requested' || r.status === 'processing') ?? null;
  const privacy = useMemo(() => [...acceptances].sort((a, b) => b.accepted_at.localeCompare(a.accepted_at))[0], [acceptances]);
  const controllerName = settings.branding.displayName || tenant.name;
  const contactEmail = settings.profile.email || tenant.contact.email;
  const say = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 3000); };

  const setMarketing = async (channel: 'whatsapp' | 'email', on: boolean) => {
    await prefs.set(channel, 'marketing', on);
    const otherOn = prefs.isEnabled(channel === 'whatsapp' ? 'email' : 'whatsapp', 'marketing');
    if (profile) await data.update('profiles', profile.id, { marketing_optin: on || otherOn });
    await audit('consent.marketing', 'notification_prefs', null, { channel, after: on });
  };

  const exportData = async () => {
    setBusy(true);
    try {
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), controller: controllerName, subject: user.id, law: 'Ley 1581 de 2012' };
      for (const [table, column] of EXPORT_TABLES) out[table] = await data.list(table, { where: { [column]: user.id } });
      const paymentIds = (out.payments as { id: string }[]).map((p) => p.id);
      out.invoices = (await data.list<{ payment_id: string } & { id: string; tenant_id: string; created_at: string; updated_at: string }>('invoices')).filter((i) => paymentIds.includes(i.payment_id));
      downloadJson(`hoy-mis-datos-${new Date().toISOString().slice(0, 10)}.json`, out);
      await audit('account.export', 'users', user.id, { tables: EXPORT_TABLES.length + 1 });
      say(t('customer.account.export.done'));
    } finally { setBusy(false); }
  };

  const requestDeletion = async () => {
    setBusy(true);
    try {
      const row = await data.insert<DeletionRequestRow>('deletion_requests', { user_id: user.id, email: account?.email ?? user.email, phone: account?.phone ?? null, channel: 'app', status: 'requested', reason: reason.trim() || null, requested_at: new Date().toISOString(), resolved_at: null, resolved_by: null, checklist: null, note: null });
      await audit('account.deletion_request', 'deletion_requests', row.id, { after: 'requested', reason: reason.trim() || null });
      setStep(0); setReason(''); setUnderstood(false);
      say(t('customer.account.delete.sent'));
    } finally { setBusy(false); }
  };

  const cancelDeletion = async () => {
    if (!open || open.status !== 'requested') return;
    await data.update('deletion_requests', open.id, { status: 'cancelled', resolved_at: new Date().toISOString(), resolved_by: user.id });
    await audit('account.deletion_cancel', 'deletion_requests', open.id, { before: 'requested', after: 'cancelled' });
    say(t('customer.account.delete.cancelled'));
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    DataController: () => (
      <Card eyebrow={t('customer.account.controller')} padding="md">
        <p className="small">{t('customer.account.controller.body', { name: controllerName, legal: tenant.legalName, email: contactEmail })}</p>
        <p className="xs muted" style={{ marginTop: 6 }}>{t('customer.profile.legal.law')} · <Link to="/app/legal/privacy">{t('customer.profile.legal.privacy')}</Link></p>
      </Card>
    ),
    ConsentToggles: () => (
      <ListGroup title={t('customer.account.consents')}>
        <ListRow icon="◎" title={t('customer.account.consent.marketingWa')} subtitle={t('customer.account.consent.marketing.sub')} trailing={<Toggle size="sm" checked={prefs.isEnabled('whatsapp', 'marketing')} onChange={(v) => { void setMarketing('whatsapp', v); }} label="" />} />
        <ListRow icon="✉" title={t('customer.account.consent.marketingEmail')} subtitle={t('customer.account.consent.marketing.sub')} trailing={<Toggle size="sm" checked={prefs.isEnabled('email', 'marketing')} onChange={(v) => { void setMarketing('email', v); }} label="" />} />
        <ListRow icon="▣" title={t('customer.account.consent.processing')} subtitle={privacy ? t('customer.account.consent.processing.on', { v: privacy.version, date: formatDate(privacy.accepted_at, lang, { dateStyle: 'long' }) }) : t('customer.account.consent.processing.off')} to="/app/legal/privacy" trailing={<Badge tone={privacy ? 'success' : 'warn'}>{privacy ? `v${privacy.version}` : t('customer.legal.notAccepted.short')}</Badge>} />
        <ListRow icon="◉" title={t('customer.notifications.prefs.title')} subtitle={t('customer.notifications.prefs.byCategory')} to="/app/notifications" />
      </ListGroup>
    ),
    ExportData: () => (
      <Card eyebrow={t('customer.account.export')} padding="md">
        <p className="small">{t('customer.account.export.body')}</p>
        <div className="row wrap" style={{ marginTop: 12 }}>
          <Button size="sm" variant="secondary" loading={busy} onClick={exportData}>{t('customer.account.export.cta')}</Button>
          <Link to="/app/history" className="small">{t('core.nav.history')} →</Link>
        </div>
      </Card>
    ),
    LegalLinks: () => (
      <ListGroup title={t('customer.profile.legal')}>
        {LEGAL_KINDS.map((k) => <ListRow key={k} title={t(legalTitleKey(k))} to={`/app/legal/${k}`} />)}
      </ListGroup>
    ),
    DeleteAccount: () => open ? (
      <Card tone="highlight" eyebrow={t('customer.account.delete')} padding="md">
        <div className="row wrap" style={{ marginBottom: 8 }}>
          <Badge tone={open.status === 'processing' ? 'primary' : 'warn'}>{t(`customer.account.status.${open.status}`)}</Badge>
          <span className="xs muted">{t('customer.account.delete.requestedOn', { date: formatDateTime(open.requested_at, lang) })}</span>
        </div>
        <p className="small">{t(open.status === 'processing' ? 'customer.account.delete.processing.body' : 'customer.account.delete.pending.body')}</p>
        <p className="xs muted" style={{ marginTop: 6 }}>{t('customer.account.delete.retention')}</p>
        {open.status === 'requested' && <Button size="sm" variant="ghost" onClick={cancelDeletion} style={{ marginTop: 12 }}>{t('customer.account.delete.cancel')}</Button>}
      </Card>
    ) : (
      <ListGroup title={t('customer.account.delete')}>
        <ListRow icon="×" tone="danger" title={t('customer.profile.delete')} subtitle={t('customer.account.delete.sub')} onClick={() => setStep(1)} />
      </ListGroup>
    ),
  };

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.account.title')} sub={t('customer.account.sub')} back="/app/profile" />
      {flash && <Notice tone="success">{flash}</Notice>}
      <div className="stack">
        {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      </div>

      {/* Step 1 — what deleting means. Step 2 — the confirmation itself. Two taps, nothing destructive on the first. */}
      <Drawer open={step === 1} onClose={() => setStep(0)} side="bottom" title={t('customer.profile.delete.confirm.title')}
        footer={<><Button variant="ghost" onClick={() => setStep(0)}>{t('core.common.cancel')}</Button><Button variant="danger" disabled={!understood} onClick={() => setStep(2)}>{t('customer.account.delete.next')}</Button></>}>
        <div className="stack">
          <Notice tone="warn" title={t('customer.account.delete.what')}>{t('customer.account.delete.what.body')}</Notice>
          <ul className="cust-checklist small">
            <li>{t('customer.account.delete.keep.invoices')}</li>
            <li>{t('customer.account.delete.keep.profile')}</li>
            <li>{t('customer.account.delete.keep.access')}</li>
            <li>{t('customer.account.delete.keep.time')}</li>
          </ul>
          <label className="field-label"><span>{t('customer.account.delete.reason')}</span></label>
          <textarea className="input cust-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('customer.account.delete.reason.ph')} aria-label={t('customer.account.delete.reason')} />
          <Toggle size="sm" checked={understood} onChange={setUnderstood} label={t('customer.account.delete.understood')} />
          <p className="xs muted">{t('customer.profile.legal.law')} · <Link to="/app/legal/privacy">{t('customer.profile.legal.privacy')}</Link></p>
        </div>
      </Drawer>
      <Drawer open={step === 2} onClose={() => setStep(0)} side="bottom" title={t('customer.account.delete.confirm2.title')}>
        <div className="stack">
          <Notice tone="danger">{t('customer.account.delete.confirm2.body', { name: controllerName })}</Notice>
          <Button block variant="danger" loading={busy} onClick={requestDeletion}>{t('customer.account.delete.cta')}</Button>
          <Button block variant="ghost" onClick={() => setStep(1)}>{t('core.nav.back')}</Button>
        </div>
      </Drawer>
    </div>
  );
}
