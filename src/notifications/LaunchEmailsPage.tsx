import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { useData } from '../data/DataContext';
import { formatDateTime } from '../i18n/format';
import { Card } from '../components/molecule/Card/Card';
import { Button } from '../components/atom/Button/Button';
import { Badge, type BadgeTone } from '../components/atom/Badge/Badge';
import { Notice } from '../components/molecule/Notice/Notice';
import { EmptyState } from '../components/molecule/EmptyState/EmptyState';
import { DataTable } from '../components/organism/DataTable/DataTable';
import { EmailPreview } from '../components/organism/EmailPreview/EmailPreview';
import { LAUNCH_EMAILS, LAUNCH_SAMPLE, renderSample, type LaunchEmail } from './launchEmails';
import { DELIVERY_STATUSES, cosRequest, readDeliveryLog, type DeliveryRow } from './deliveryLog';

/** comms statuses by meaning: only a provider-confirmed delivery is green; held or queued is waiting; anything lost is red. */
const TONE: Record<string, BadgeTone> = { delivered: 'success', sent: 'primary', queued: 'warn', scheduled: 'warn', failed: 'danger', bounced: 'danger', skipped: 'danger' };

type LogState = { status: 'unavailable' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: DeliveryRow[] };

/**
 * M-04 in the production build (H-9): the launch emails as Company OS sends them, and their real delivery status.
 * No editor, no test send and no local "sent" record; the review build keeps the M-04 workbench.
 */
export function LaunchEmailsPage() {
  const { t, bi } = useI18n();
  const data = useData();
  const [log, setLog] = useState<LogState>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const request = cosRequest(data);
    if (!request) { setLog({ status: 'unavailable' }); return; }
    let live = true;
    setLog({ status: 'loading' });
    readDeliveryLog(request, LAUNCH_EMAILS.map((e) => e.key))
      .then((rows) => { if (live) setLog({ status: 'ready', rows }); }, () => { if (live) setLog({ status: 'error' }); });
    return () => { live = false; };
  }, [data, retry]);

  return (
    <div className="stack" data-launch-emails>
      <div className="page-head"><div><h1>{t('notifications.launch.title')}</h1><p className="muted small">{t('notifications.launch.subtitle')}</p></div></div>
      <Notice>{t('notifications.launch.boundary')}</Notice>
      <section className="stack-sm" aria-label={t('notifications.delivery.title')}>
        <h2 className="adm-h2">{t('notifications.delivery.title')}</h2>
        <DeliveryLog log={log} onRetry={() => setRetry((n) => n + 1)} nameOf={(key) => { const e = LAUNCH_EMAILS.find((x) => x.key === key); return e ? bi(e.name) : key; }} />
      </section>
      <section className="stack-sm" aria-label={t('notifications.launch.templates')}>
        <h2 className="adm-h2">{t('notifications.launch.templates')}</h2>
        {LAUNCH_EMAILS.map((e) => <TemplateCard key={e.key} email={e} />)}
      </section>
    </div>
  );
}

function DeliveryLog({ log, onRetry, nameOf }: { log: LogState; onRetry: () => void; nameOf: (key: string) => string }) {
  const { t, lang } = useI18n();
  if (log.status === 'unavailable') return <div data-delivery="unavailable"><Notice>{t('notifications.delivery.unavailable')}</Notice></div>;
  if (log.status === 'loading') return <EmptyState tone="loading" title={t('notifications.delivery.loading')} />;
  if (log.status === 'error') return <div data-delivery="error"><Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={onRetry}>{t('notifications.delivery.retry')}</Button>}>{t('notifications.delivery.error')}</Notice></div>;
  const statusLabel = (s: string) => ((DELIVERY_STATUSES as readonly string[]).includes(s) ? t(`notifications.status.${s}`) : s);
  const columns = [
    { key: 'at', label: t('notifications.delivery.when'), render: (r: DeliveryRow) => <span className="mono small">{r.at ? formatDateTime(r.at, lang) : '—'}</span> },
    { key: 'template', label: t('notifications.delivery.template'), render: (r: DeliveryRow) => nameOf(r.template) },
    { key: 'address', label: t('notifications.delivery.to'), render: (r: DeliveryRow) => <span className="small">{r.address ?? '—'}</span> },
    { key: 'status', label: t('notifications.delivery.status'), render: (r: DeliveryRow) => <Badge tone={TONE[r.status] ?? 'neutral'}>{statusLabel(r.status)}</Badge> },
    { key: 'error', label: t('notifications.delivery.reason'), render: (r: DeliveryRow) => <code className="xs">{r.error ?? ''}</code> },
  ];
  return <DataTable columns={columns} rows={log.rows as unknown as (DeliveryRow & Record<string, unknown>)[]} rowKey={(r) => r.id} dense pageSize={20} emptyText={t('notifications.delivery.empty')} />;
}

function TemplateCard({ email: e }: { email: LaunchEmail }) {
  const { t, bi } = useI18n();
  const [open, setOpen] = useState(false);
  const blocked = !!e.blocked, partly = blocked && e.automations.length > 0;
  return (
    <Card padding="sm" data-launch-email={e.key}>
      <div className="stack-sm">
        <div className="row-between wrap">
          <div className="row wrap"><strong>{bi(e.name)}</strong><Badge>{e.row}</Badge>{blocked && <Badge tone="warn">{t(partly ? 'notifications.launch.partial' : 'notifications.launch.blocked')}</Badge>}</div>
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{t(open ? 'notifications.launch.hide' : 'notifications.launch.show')}</Button>
        </div>
        <p className="small"><span className="muted">{t('notifications.launch.trigger')}:</span> {bi(e.trigger)} · <span className="muted">{t(`notifications.launch.sender.${e.sender}`)}</span></p>
        {e.blocked && <Notice tone="warn" title={t('notifications.launch.blocked.body')}><ul>{e.blocked.blockers.map((b, i) => <li key={i} className="small">{bi(b.summary)}</li>)}</ul></Notice>}
        {open && <EmailPreview envelope={t('notifications.launch.preview')} subject={renderSample(e.subject, LAUNCH_SAMPLE)} body={renderSample(e.body, LAUNCH_SAMPLE)} />}
      </div>
    </Card>
  );
}
