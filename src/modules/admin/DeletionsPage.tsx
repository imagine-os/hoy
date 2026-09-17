import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { DeletionRequestRow, DeletionStatus } from '../../data/schema';
import { formatDate, formatDateTime } from '../../i18n/format';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge } from '../../components/atom/Badge/Badge';
import { Button } from '../../components/atom/Button/Button';
import { Card } from '../../components/molecule/Card/Card';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Notice } from '../../components/molecule/Notice/Notice';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { useAudit } from '../staff/audit';
import { maskPhone, usePeople } from '../staff/people';
import './admin.css';

type Filter = 'open' | DeletionStatus | 'all';
const FILTERS: Filter[] = ['open', 'requested', 'processing', 'done', 'cancelled', 'all'];
const TONE: Record<DeletionStatus, 'warn' | 'primary' | 'success' | 'neutral'> = { requested: 'warn', processing: 'primary', done: 'success', cancelled: 'neutral' };

/**
 * The anonymisation checklist (manual chapter 23). Each key is one step the server-side job (or, until
 * it exists, the admin in M-03) performs; "Marcar hecha" needs every step ticked. Stored per request in
 * `deletion_requests.checklist` so a case can be picked up by someone else mid-way.
 */
export const DELETION_STEPS = ['profile', 'contact', 'notifications', 'messages', 'auth', 'payments', 'confirm'] as const;
export type DeletionStep = (typeof DELETION_STEPS)[number];

/** M-11 `/admin/crm/deletions` — the queue of account-deletion requests, with status actions and the checklist. */
export function DeletionsPage() {
  const { t, lang } = useI18n();
  const data = useData();
  const { user, hasRole } = useSession();
  const audit = useAudit('admin');
  const { byId } = usePeople();
  const { rows, loading } = useTable<DeletionRequestRow>('deletion_requests', { orderBy: { column: 'requested_at', dir: 'desc' } });
  const [filter, setFilter] = useState<Filter>('open');
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const canAct = hasRole(['super_admin', 'admin']);

  const open = rows.filter((r) => r.status === 'requested' || r.status === 'processing');
  const done90 = rows.filter((r) => r.status === 'done' && r.resolved_at && Date.now() - new Date(r.resolved_at).getTime() < 90 * 86400e3);
  const oldest = open.length ? Math.max(...open.map((r) => Math.floor((Date.now() - new Date(r.requested_at).getTime()) / 86400e3))) : 0;

  const who = (r: DeletionRequestRow) => (r.user_id ? byId.get(r.user_id)?.name : null) ?? r.email ?? maskPhone(r.phone);
  const list = useMemo(() => rows.filter((r) => filter === 'all' ? true : filter === 'open' ? r.status === 'requested' || r.status === 'processing' : r.status === filter).map((r) => ({ ...r, who: who(r), age: Math.floor((Date.now() - new Date(r.requested_at).getTime()) / 86400e3) })), [rows, filter, byId]); // eslint-disable-line react-hooks/exhaustive-deps
  type Row = (typeof list)[number];
  const row = rows.find((r) => r.id === selected) ?? null;
  const checklist = row?.checklist ?? {};
  const allTicked = DELETION_STEPS.every((s) => checklist[s]);

  const move = async (r: DeletionRequestRow, status: DeletionStatus) => {
    const closing = status === 'done' || status === 'cancelled';
    await data.update('deletion_requests', r.id, { status, resolved_at: closing ? new Date().toISOString() : null, resolved_by: closing ? user.id : null });
    await audit(`deletion.${status}`, 'deletion_requests', r.id, { before: r.status, after: status, user_id: r.user_id });
  };
  const tick = async (r: DeletionRequestRow, step: DeletionStep, on: boolean) => {
    const next = { ...(r.checklist ?? {}), [step]: on };
    await data.update('deletion_requests', r.id, { checklist: next });
    await audit('deletion.checklist', 'deletion_requests', r.id, { step, after: on });
  };
  const saveNote = async (r: DeletionRequestRow) => {
    if (note === null) return;
    await data.update('deletion_requests', r.id, { note: note.trim() || null });
    setNote(null);
  };

  const columns: DataTableColumn<Row>[] = [
    { key: 'requested_at', label: t('admin.deletions.col.when'), width: 150, render: (r) => <span className="mono small">{formatDate(r.requested_at, lang)}<span className="xs muted"> · {t('admin.deletions.age', { n: r.age })}</span></span> },
    { key: 'who', label: t('admin.deletions.col.who'), render: (r) => <span><span className="small">{r.who}</span>{r.user_id ? <span className="xs muted"> · {r.email ?? byId.get(r.user_id)?.email}</span> : <Badge>{t('admin.deletions.noAccount')}</Badge>}</span> },
    { key: 'channel', label: t('admin.deletions.col.channel'), render: (r) => <Badge>{t(`admin.deletions.channel.${r.channel}`)}</Badge> },
    { key: 'reason', label: t('admin.deletions.col.reason'), render: (r) => <span className="small muted">{r.reason ?? '—'}</span> },
    { key: 'status', label: t('admin.deletions.col.status'), render: (r) => <Badge tone={TONE[r.status]}>{t(`admin.deletions.status.${r.status}`)}</Badge> },
    { key: 'checklist', label: t('admin.deletions.col.checklist'), align: 'right', render: (r) => <span className="mono xs">{DELETION_STEPS.filter((s) => r.checklist?.[s]).length} / {DELETION_STEPS.length}</span> },
  ];

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.deletions.title')}</h1><p className="muted small">{t('admin.deletions.subtitle')}</p></div>
        <Link to="/admin/crm" className="small">← {t('admin.crm.title')}</Link>
      </div>
      <div className="grid grid-3">
        <StatTile label={t('admin.deletions.kpi.open')} value={open.length} hint={oldest ? t('admin.deletions.kpi.open.hint', { n: oldest }) : t('admin.deletions.kpi.open.none')} trend={oldest > 10 ? 'down' : 'flat'} />
        <StatTile label={t('admin.deletions.kpi.processing')} value={rows.filter((r) => r.status === 'processing').length} hint={t('admin.deletions.kpi.processing.hint')} />
        <StatTile label={t('admin.deletions.kpi.done')} value={done90.length} hint={t('admin.deletions.kpi.done.hint')} trend="up" />
      </div>
      <Notice tone="info">{t('admin.deletions.rule')}</Notice>
      <div className="row wrap" role="tablist">{FILTERS.map((f) => <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>{t(`admin.deletions.filter.${f}`)} · {f === 'all' ? rows.length : f === 'open' ? open.length : rows.filter((r) => r.status === f).length}</Chip>)}</div>
      {loading && rows.length === 0 ? <EmptyState tone="loading" title={t('core.common.loading')} /> : list.length === 0 ? <EmptyState title={t('admin.deletions.empty')} body={t('admin.deletions.empty.body')} /> : (
        <DataTable<Row> columns={columns} rows={list} rowKey={(r) => r.id} onRowClick={(r) => { setSelected(r.id); setNote(null); }} selectedKey={selected} dense />
      )}
      <p className="xs muted">{t('admin.deletions.footnote')}</p>

      <Drawer open={!!row} onClose={() => { setSelected(null); setNote(null); }} width={520} title={row ? <div className="row wrap"><span>{who(row)}</span><Badge tone={TONE[row.status]}>{t(`admin.deletions.status.${row.status}`)}</Badge></div> : undefined}>
        {row && (
          <div className="stack-sm">
            <div className="xs muted mono">{formatDateTime(row.requested_at, lang)} · {t(`admin.deletions.channel.${row.channel}`)} · {row.id}</div>
            <Card padding="sm" className="stack-sm">
              <div className="small"><strong>{t('admin.deletions.col.who')}:</strong> {who(row)}{row.email ? ` · ${row.email}` : ''}{row.phone ? ` · ${maskPhone(row.phone)}` : ''}</div>
              {row.user_id ? <Link to={`/admin/crm/${row.user_id}`} className="small">{t('admin.deletions.openCrm')} →</Link> : <span className="xs muted">{t('admin.deletions.noAccount.body')}</span>}
              {row.reason && <div className="small muted">“{row.reason}”</div>}
              {row.resolved_at && <div className="xs muted">{t('admin.deletions.resolved', { date: formatDateTime(row.resolved_at, lang), by: byId.get(row.resolved_by ?? '')?.name ?? '—' })}</div>}
            </Card>

            <div className="eyebrow">{t('admin.deletions.checklist')}</div>
            <Card padding="sm">
              {DELETION_STEPS.map((s) => (
                <label key={s} className="row small" style={{ padding: '6px 0', alignItems: 'flex-start', gap: 10 }}>
                  <input type="checkbox" checked={!!checklist[s]} disabled={!canAct || row.status === 'done' || row.status === 'cancelled'} onChange={(e) => { void tick(row, s, e.target.checked); }} style={{ marginTop: 3 }} />
                  <span><strong>{t(`admin.deletions.step.${s}`)}</strong><br /><span className="xs muted">{t(`admin.deletions.step.${s}.body`)}</span></span>
                </label>
              ))}
            </Card>

            <div className="eyebrow">{t('admin.deletions.note')}</div>
            <textarea className="input adm-textarea" rows={2} value={note ?? row.note ?? ''} disabled={!canAct} onChange={(e) => setNote(e.target.value)} onBlur={() => { void saveNote(row); }} placeholder={t('admin.deletions.note.ph')} aria-label={t('admin.deletions.note')} />

            {canAct && (row.status === 'requested' || row.status === 'processing') && (
              <div className="row wrap" style={{ marginTop: 8 }}>
                {row.status === 'requested' && <Button size="sm" onClick={() => move(row, 'processing')}>{t('admin.deletions.action.processing')}</Button>}
                <Button size="sm" variant={allTicked ? 'primary' : 'secondary'} disabled={!allTicked} onClick={() => move(row, 'done')}>{t('admin.deletions.action.done')}</Button>
                <Button size="sm" variant="ghost" onClick={() => move(row, 'cancelled')}>{t('admin.deletions.action.cancel')}</Button>
              </div>
            )}
            {!allTicked && row.status !== 'done' && row.status !== 'cancelled' && <p className="xs muted">{t('admin.deletions.action.done.blocked')}</p>}
            {!canAct && <p className="xs muted">{t('admin.deletions.readOnly')}</p>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
