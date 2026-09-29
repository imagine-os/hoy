import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData } from '../../data/DataContext';
import type { HoursOverrideKind, HoursOverrideRow } from '../../data/schema';
import { formatDate, fromDateKey } from '../../i18n/format';
import { addDaysToKey, datesBetween } from '../../tenant/hours';
import { upcomingColombianHolidays } from '../../tenant/holidays.co';
import { useActions } from '../../actions/bus';
import type { ActionHandler } from '../../actions/types';
import { toast } from '../../app/toast';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input, Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Badge, type BadgeTone } from '../../components/atom/Badge/Badge';
import { Notice } from '../../components/molecule/Notice/Notice';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Icon } from '../../components/atom/Icon/Icon';
import { useAudit } from '../staff/audit';
import { useOpeningHours } from './settings';
import { need } from './actions';
import { M08g } from './specs';

const KINDS: readonly HoursOverrideKind[] = ['holiday', 'special', 'event'];
const KIND_TONE: Record<HoursOverrideKind, BadgeTone> = { holiday: 'danger', special: 'highlight', event: 'primary' };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The form behind the drawer: one override, as strings. */
interface Draft { id: string | null; start_date: string; end_date: string; closed: boolean; open: string; close: string; label_es: string; label_en: string; kind: HoursOverrideKind; note: string }
const emptyDraft = (date: string): Draft => ({ id: null, start_date: date, end_date: date, closed: true, open: '', close: '', label_es: '', label_en: '', kind: 'holiday', note: '' });
const draftOf = (o: HoursOverrideRow): Draft => ({ id: o.id, start_date: o.start_date, end_date: o.end_date, closed: o.closed, open: o.open ?? '', close: o.close ?? '', label_es: o.label?.es ?? '', label_en: o.label?.en ?? '', kind: o.kind, note: o.note ?? '' });

/** The one validation M-08g, the drawer and the WebMCP action share. Returns a string key or null. */
export function validateOverride(d: Pick<Draft, 'start_date' | 'end_date' | 'closed' | 'open' | 'close' | 'label_es'>): string | null {
  if (!d.start_date) return 'admin.settings.hours.err.start';
  if (d.end_date && d.end_date < d.start_date) return 'admin.settings.hours.err.end';
  if (!d.label_es.trim()) return 'admin.settings.hours.err.label';
  if (!d.closed) {
    const o = d.open.trim(), c = d.close.trim();
    if (!!o !== !!c) return 'admin.settings.hours.err.times';
    if (o && (!TIME_RE.test(o) || !TIME_RE.test(c) || c <= o)) return 'admin.settings.hours.err.times';
  }
  return null;
}

const toRow = (d: Draft, by: string): Partial<HoursOverrideRow> => ({
  start_date: d.start_date, end_date: d.end_date || d.start_date, closed: d.closed,
  open: d.closed ? null : d.open.trim() || null, close: d.closed ? null : d.close.trim() || null,
  label: { es: d.label_es.trim(), en: d.label_en.trim() || d.label_es.trim() }, kind: d.kind, note: d.note.trim() || null,
  // Any edit makes the row pending again for the Google push (the server clears it by setting google_synced_at).
  created_by: by,
});

/**
 * M-08g `/admin/settings/hours` — the dated exceptions to the weekly hours (D-0013). Rendered inside the
 * M-08 settings shell (SettingsPage group `hours`). hours.write gates every write; every write is audited.
 */
export function HoursSettings() {
  const { t, bi, lang } = useI18n();
  const { can, user } = useSession();
  const data = useData();
  const audit = useAudit('admin');
  const hours = useOpeningHours();
  const canWrite = can('hours.write');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const today = hours.todayKey;
  const year = Number(today.slice(0, 4));
  const upcomingCount = hours.overrides.filter((o) => o.end_date >= today).length;

  const fmt = (k: string) => formatDate(fromDateKey(k), lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const dates = (o: HoursOverrideRow) => (o.start_date === o.end_date ? fmt(o.start_date) : `${fmt(o.start_date)} – ${fmt(o.end_date)}`);
  const hoursCell = (o: HoursOverrideRow) => (o.closed ? t('admin.settings.hours.closedCell') : o.open && o.close ? `${o.open}–${o.close}` : t('admin.settings.hours.usual'));
  const pendingGoogle = (o: HoursOverrideRow) => !o.google_synced_at || o.google_synced_at < o.updated_at;

  /** Inserts every Colombian holiday from today to the end of next year that has no override on its date yet. */
  const importHolidays = async (): Promise<number> => {
    if (!canWrite) throw new Error('hours.write required');
    // Read the provider, not the rendered list: two quick calls (a double click, an agent) must not import twice.
    const current = await data.list<HoursOverrideRow>('hours_overrides');
    const taken = new Set(current.map((o) => o.start_date));
    const fresh = upcomingColombianHolidays(today).filter((h) => !taken.has(h.date));
    for (const h of fresh) {
      await data.insert<HoursOverrideRow>('hours_overrides', { start_date: h.date, end_date: h.date, closed: true, open: null, close: null, label: h.label, kind: 'holiday', source: 'colombia', note: null, google_synced_at: null, created_by: user.id });
    }
    await audit('hours.import_holidays', 'hours_overrides', null, { added: fresh.length, dates: fresh.map((h) => h.date) });
    toast(fresh.length ? t('admin.settings.hours.import.done', { n: fresh.length }) : t('admin.settings.hours.import.none'), fresh.length ? 'success' : 'neutral');
    return fresh.length;
  };

  const save = async (d: Draft): Promise<HoursOverrideRow> => {
    if (!canWrite) throw new Error('hours.write required');
    const bad = validateOverride(d);
    if (bad) throw new Error(t(bad));
    const before = d.id ? await data.get<HoursOverrideRow>('hours_overrides', d.id) : null;
    const row = d.id
      ? await data.update<HoursOverrideRow>('hours_overrides', d.id, toRow(d, before?.created_by ?? user.id))
      : await data.insert<HoursOverrideRow>('hours_overrides', { ...toRow(d, user.id), source: 'manual', google_synced_at: null });
    await audit('hours.override.save', 'hours_overrides', row.id, { before, after: row });
    return row;
  };

  const remove = async (id: string) => {
    if (!canWrite) throw new Error('hours.write required');
    const before = await data.get<HoursOverrideRow>('hours_overrides', id);
    if (!before) throw new Error(`no override ${id}`);
    await data.remove('hours_overrides', id);
    await audit('hours.override.delete', 'hours_overrides', id, { before });
  };

  const submit = async () => {
    if (!draft) return;
    const bad = validateOverride(draft);
    if (bad) { setError(bad); return; }
    setBusy(true);
    try { await save(draft); toast(t('admin.settings.hours.saved'), 'success'); setDraft(null); } finally { setBusy(false); }
  };
  const doDelete = async () => {
    if (!draft?.id) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    try { await remove(draft.id); toast(t('admin.settings.hours.deleted'), 'success'); setDraft(null); } finally { setBusy(false); setConfirmDelete(false); }
  };
  const open = (d: Draft) => { setDraft(d); setError(null); setConfirmDelete(false); };

  // WebMCP (0039): the same writes, same validation, same audit.
  const impl = useMemo<Record<string, ActionHandler>>(() => ({
    'settings.hours.override.add': async (p) => {
      const closed = (p?.closed ?? 'true') !== 'false';
      const kind = (KINDS as readonly string[]).includes(p?.kind ?? '') ? (p!.kind as HoursOverrideKind) : closed ? 'holiday' : 'special';
      const start = need(p, 'start');
      const row = await save({ id: null, start_date: start, end_date: p?.end?.trim() || start, closed, open: p?.open ?? '', close: p?.close ?? '', label_es: need(p, 'label'), label_en: p?.label_en ?? '', kind, note: p?.note ?? '' });
      return `added ${row.id} (${row.start_date}${row.end_date !== row.start_date ? `–${row.end_date}` : ''}, ${row.closed ? 'closed' : `${row.open ?? 'usual'}–${row.close ?? 'usual'}`})`;
    },
    'settings.hours.override.remove': async (p) => {
      const id = p?.id?.trim() || (await data.list<HoursOverrideRow>('hours_overrides')).find((o) => o.start_date === p?.date?.trim())?.id;
      if (!id) throw new Error('pass id or a date that has an exception');
      await remove(id);
      return `removed ${id}`;
    },
    'settings.hours.holidays.import': async () => `added ${await importHolidays()} holidays`,
  }), [hours.overrides, canWrite, user.id, today, data, audit, t]);
  useActions(M08g, impl);

  const columns: DataTableColumn<HoursOverrideRow>[] = [
    { key: 'start_date', label: t('admin.settings.hours.col.dates'), sortable: true, render: (o) => <span className={o.end_date < today ? 'muted' : ''}>{dates(o)}</span> },
    { key: 'label', label: t('admin.settings.hours.col.label'), sortable: false, render: (o) => <strong className="small">{bi(o.label)}</strong> },
    { key: 'closed', label: t('admin.settings.hours.col.hours'), sortable: false, render: (o) => <span className="small">{hoursCell(o)}</span> },
    // Kind and source share a column so the table fits a 1280 settings column without a horizontal scroll.
    { key: 'kind', label: `${t('admin.settings.hours.col.kind')} · ${t('admin.settings.hours.col.source')}`, sortable: false, render: (o) => <span className="row wrap hours-badges"><Badge tone={KIND_TONE[o.kind]}>{t(`admin.settings.hours.kind.${o.kind}`)}</Badge><Badge tone={o.source === 'colombia' ? 'neutral' : 'primary'}>{t(`admin.settings.hours.source.${o.source}`)}</Badge></span> },
    { key: 'google_synced_at', label: <span title={t('admin.settings.hours.google.hint')}>{t('admin.settings.hours.col.google')}</span>, sortable: false, render: (o) => <Badge tone={pendingGoogle(o) ? 'warn' : 'success'}>{t(pendingGoogle(o) ? 'admin.settings.hours.google.pending' : 'admin.settings.hours.google.sent')}</Badge> },
  ];

  const next30 = datesBetween(today, addDaysToKey(today, 29));

  return (
    <>
      <Notice tone="info" icon="calendar-clock" title={t('admin.settings.hours.precedence.title')}>
        {t('admin.settings.hours.precedence')} {t('admin.settings.hours.weekly', { sentence: bi(hours.sentence) })} ·{' '}
        <Link to="/admin/settings">{t('admin.settings.hours.editWeekly')}</Link>
      </Notice>

      <Card
        icon="calendar-clock" title={t('admin.settings.hours.list')} eyebrow={t('admin.settings.hours.list.count', { n: hours.overrides.length, upcoming: upcomingCount })}
      >
        <div className="stack">
          {canWrite
            ? (
              <div className="row wrap">
                <Button size="sm" icon="plus" onClick={() => open(emptyDraft(today))}>{t('admin.settings.hours.add')}</Button>
                <Button size="sm" variant="secondary" icon="download" onClick={() => { void importHolidays(); }}>{t('admin.settings.hours.import', { year, next: year + 1 })}</Button>
              </div>
            )
            : <p className="xs muted">{t('admin.settings.hours.readonly')}</p>}
          {hours.loading && hours.overrides.length === 0
            ? <EmptyState tone="loading" title={t('core.common.loading')} compact />
            : hours.overrides.length === 0
              ? <EmptyState icon="calendar-clock" title={t('admin.settings.hours.empty')} body={t('admin.settings.hours.empty.body')} compact />
              : <DataTable<HoursOverrideRow> columns={columns} rows={hours.overrides} rowKey={(o) => o.id} onRowClick={(o) => open(draftOf(o))} selectedKey={draft?.id ?? null} dense />}
        </div>
      </Card>

      <Card icon="calendar" title={t('admin.settings.hours.upcoming')}>
        <div className="stack">
          <p className="small"><strong>{bi(hours.today)}</strong></p>
          <p className="xs muted">{t('admin.settings.hours.upcoming.body')}</p>
          <ol className="hours-days" aria-label={t('admin.settings.hours.upcoming')}>
            {next30.map((k) => {
              const eff = hours.effectiveHoursFor(k);
              return (
                <li key={k} className={`hours-day ${eff.override ? 'is-override' : ''} ${eff.hours ? '' : 'is-closed'}`}>
                  <span className="xs muted">{fmt(k)}</span>
                  <strong className="small">{eff.hours ? `${eff.hours.open}–${eff.hours.close}` : t('admin.settings.hours.closedCell')}</strong>
                  {eff.override && <span className="xs hours-day-why"><Icon name="calendar-clock" size="xs" /> {bi(eff.override.label)}</span>}
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <Drawer
        open={!!draft} onClose={() => setDraft(null)} width={520}
        title={draft?.id ? t('admin.settings.hours.drawer.edit') : t('admin.settings.hours.drawer.new')}
        footer={draft && canWrite ? (
          <div className="row-between wrap">
            {draft.id ? <Button variant="danger" size="sm" icon="trash" disabled={busy} onClick={doDelete}>{confirmDelete ? t('admin.settings.hours.delete.confirm') : t('core.common.delete')}</Button> : <span />}
            <div className="row">
              <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>{t('core.common.cancel')}</Button>
              <Button size="sm" loading={busy} onClick={submit}>{t('core.common.save')}</Button>
            </div>
          </div>
        ) : undefined}
      >
        {draft && (
          <div className="stack">
            {error && <Notice tone="danger">{t(error)}</Notice>}
            <div className="grid grid-2">
              <Field label={t('admin.settings.hours.f.start')} required>{(id) => <Input id={id} type="date" value={draft.start_date} disabled={!canWrite} invalid={error === 'admin.settings.hours.err.start'} onChange={(e) => setDraft({ ...draft, start_date: e.target.value, end_date: draft.end_date < e.target.value ? e.target.value : draft.end_date })} />}</Field>
              <Field label={t('admin.settings.hours.f.end')}>{(id) => <Input id={id} type="date" value={draft.end_date} min={draft.start_date} disabled={!canWrite} invalid={error === 'admin.settings.hours.err.end'} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} />}</Field>
            </div>
            <div className="grid grid-2">
              <Field label={t('admin.settings.hours.f.labelEs')} required>{(id) => <Input id={id} value={draft.label_es} disabled={!canWrite} invalid={error === 'admin.settings.hours.err.label'} placeholder="Día de la Raza" onChange={(e) => setDraft({ ...draft, label_es: e.target.value })} />}</Field>
              <Field label={t('admin.settings.hours.f.labelEn')} hint={t('admin.settings.hours.f.labelEn.hint')}>{(id) => <Input id={id} value={draft.label_en} disabled={!canWrite} placeholder="Columbus Day" onChange={(e) => setDraft({ ...draft, label_en: e.target.value })} />}</Field>
            </div>
            <Toggle checked={draft.closed} disabled={!canWrite} label={t('admin.settings.hours.f.closed')} onChange={(on) => setDraft({ ...draft, closed: on, kind: on && draft.kind === 'special' ? 'holiday' : !on && draft.kind === 'holiday' ? 'special' : draft.kind })} />
            {!draft.closed && (
              <div className="grid grid-2">
                <Field label={t('admin.settings.hours.f.open')} hint={t('admin.settings.hours.f.times.hint')}>{(id) => <Input id={id} type="time" value={draft.open} disabled={!canWrite} invalid={error === 'admin.settings.hours.err.times'} onChange={(e) => setDraft({ ...draft, open: e.target.value })} />}</Field>
                <Field label={t('admin.settings.hours.f.close')}>{(id) => <Input id={id} type="time" value={draft.close} disabled={!canWrite} invalid={error === 'admin.settings.hours.err.times'} onChange={(e) => setDraft({ ...draft, close: e.target.value })} />}</Field>
              </div>
            )}
            <Field label={t('admin.settings.hours.f.kind')}>{(id) => <Select id={id} value={draft.kind} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, kind: e.target.value as HoursOverrideKind })}>{KINDS.map((k) => <option key={k} value={k}>{t(`admin.settings.hours.kind.${k}`)}</option>)}</Select>}</Field>
            <Field label={t('admin.settings.hours.f.note')}>{(id) => <textarea id={id} className="input adm-textarea" rows={2} value={draft.note} disabled={!canWrite} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />}</Field>
            {draft.id && <p className="xs muted">{t('admin.settings.hours.google.hint')}</p>}
          </div>
        )}
      </Drawer>
    </>
  );
}
