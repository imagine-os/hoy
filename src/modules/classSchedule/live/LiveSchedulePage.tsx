import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { addDays, dateKey, formatDateTime, studioDate } from '../../../i18n/format';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Input, Select } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { useCosQueries, type CosRow } from '../../staff/desk/useCos';
import { batch, errorCode, newActionKey, type BatchOp } from '../../staff/desk/wire';
import { deskErrorText } from '../../staff/desk/strings';
import {
  WEEKDAYS, cancelOccurrenceOps, createCoachOps, createResourceOps, createScheduleOps, generateOps, publishScheduleOps,
  scheduleProblems, updateCoachOps, updateResourceOps, updateScheduleOps, type ScheduleDraft,
} from './scheduleOps';

type Tab = 'classes' | 'dates' | 'teachers' | 'rooms';
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
/** The instant the studio day `key` (YYYY-MM-DD, studio timezone) starts. */
const studioMidnight = (key: string) => { const [y, m, d] = key.split('-').map(Number); return studioDate(y, m - 1, d).toISOString(); };
const idOf = (v: unknown) => (v && typeof v === 'object' ? str((v as { id?: unknown }).id) : str(v));

/** AD-01 / AD-02 in the production build: classes (schedules), their dates (occurrences), teachers (coaches) and rooms. */
export function LiveSchedulePage() {
  const { t, lang } = useI18n();
  const { can } = useSession();
  const canWrite = can('classes.write');
  const [tab, setTab] = useState<Tab>('classes');
  const now = new Date();
  // Studio days, not UTC ones: from the start of today in Medellín, so yesterday's evening classes are not listed.
  const from = studioMidnight(dateKey(now));
  const until14 = studioMidnight(dateKey(addDays(now, 14)));
  const q = useCosQueries({
    schedules: { entity: 'schedule', sort: [{ field: 'weekday', dir: 'asc' }, { field: 'start_time', dir: 'asc' }] },
    resources: { entity: 'resource', filter: { field: 'kind', op: 'eq', value: 'room' }, sort: [{ field: 'name', dir: 'asc' }] },
    coaches: { entity: 'coach', include: [{ field: 'person', fields: ['name', 'email', 'phone'] }] } as never,
    occurrences: { entity: 'occurrence', filter: { and: [{ field: 'starts_at', op: 'gte', value: from }, { field: 'starts_at', op: 'lt', value: until14 }] }, sort: [{ field: 'starts_at', dir: 'asc' }] },
  });
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = q.rows;
  const rooms = rows?.resources ?? [], coaches = rows?.coaches ?? [];
  const roomName = (id: unknown) => str(rooms.find(r => r.id === idOf(id))?.name) || '—';
  const coachName = (id: unknown) => { const c = coaches.find(x => x.id === idOf(id)); return c ? str((c.person as { name?: string } | null)?.name) || '—' : '—'; };
  const weekday = (d: number) => new Intl.DateTimeFormat(lang === 'en' ? 'en' : 'es-CO', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 10, 1 + d))); // 1 Nov 2026 is a Sunday

  /** Every write: one batch with a fresh key per click; a retry of the same click reuses it. */
  const run = async (ops: BatchOp[], key: string, ok: string) => {
    if (!q.request || busy) return null;
    setBusy(true); setMessage(null);
    try { const ids = await batch(q.request, ops, key); setMessage({ tone: 'ok', text: ok }); q.reload(); return ids; }
    catch (e) { setMessage({ tone: 'error', text: deskErrorText(errorCode(e), t) }); return null; }
    finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('schedule.title')}</h1><p className="muted small">{t('live.intro')}</p></div></div>
      <div className="row wrap" role="tablist">{(['classes', 'dates', 'teachers', 'rooms'] as Tab[]).map(k => <Chip key={k} selected={tab === k} onClick={() => setTab(k)}>{t(`live.tab.${k}`)}</Chip>)}</div>
      {message && <p className={`small ${message.tone === 'error' ? 'register-diff' : 'rooms-free'}`} role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p>}
      {!q.request && <EmptyState compact tone="error" title={t('live.loadError')} body={deskErrorText('disconnected', t)} />}
      {q.error && <EmptyState compact tone="error" title={t('live.loadError')} body={deskErrorText(q.error, t)} action={<Button size="sm" onClick={q.reload}>{t('core.common.retry')}</Button>} />}
      {q.loading && !rows && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
      {rows && tab === 'classes' && <Classes rows={rows.schedules} rooms={rooms} coaches={coaches} roomName={roomName} coachName={coachName} weekday={weekday} canWrite={canWrite} busy={busy} run={run} />}
      {rows && tab === 'dates' && <Dates rows={rows.occurrences} roomName={roomName} coachName={coachName} canWrite={canWrite} busy={busy} run={run} lang={lang} />}
      {rows && tab === 'teachers' && <Teachers rows={coaches} canWrite={canWrite} busy={busy} run={run} />}
      {rows && tab === 'rooms' && <Rooms rows={rooms} canWrite={canWrite} busy={busy} run={run} />}
      <p className="xs muted">{t('live.faq')}</p>
    </div>
  );
}

type Run = (ops: BatchOp[], key: string, ok: string) => Promise<string[] | null>;

function Classes({ rows, rooms, coaches, roomName, coachName, weekday, canWrite, busy, run }: { rows: CosRow[]; rooms: CosRow[]; coaches: CosRow[]; roomName: (id: unknown) => string; coachName: (id: unknown) => string; weekday: (d: number) => string; canWrite: boolean; busy: boolean; run: Run }) {
  const { t } = useI18n();
  const blank = (): ScheduleDraft => ({ title: '', weekday: 1, start_time: '07:00', resource: rooms[0]?.id ?? '', coach: '', capacity: num(rooms[0]?.capacity) || 1, valid_from: dateKey(new Date()), valid_until: '', active: false });
  const [edit, setEdit] = useState<{ id: string | null; draft: ScheduleDraft; key: string } | null>(null);
  const [until, setUntil] = useState(dateKey(addDays(new Date(), 28)));
  const [genKey, setGenKey] = useState(newActionKey);
  const room = edit ? rooms.find(r => r.id === edit.draft.resource) : undefined;
  const problems = edit ? scheduleProblems(edit.draft, room ? num(room.capacity) : undefined) : [];
  const toDraft = (r: CosRow): ScheduleDraft => ({ title: str(r.title), weekday: num(r.weekday), start_time: str(r.start_time), resource: idOf(r.resource), coach: idOf(r.coach), capacity: num(r.capacity), valid_from: str(r.valid_from), valid_until: str(r.valid_until), active: r.active !== false });
  const save = async () => {
    if (!edit || problems.length) return;
    const ids = await run(edit.id ? updateScheduleOps(edit.id, edit.draft) : createScheduleOps(edit.draft), edit.key, t('live.saved'));
    if (ids) setEdit(null);
  };
  return (
    <div className="stack">
      {canWrite && <div className="row wrap"><Button icon="plus" onClick={() => setEdit({ id: null, draft: blank(), key: newActionKey() })}>{t('live.new')}</Button>
        <Field label={t('live.generate')}>{id => <Input id={id} type="date" value={until} onChange={e => { setUntil(e.target.value); setGenKey(newActionKey()); }} />}</Field>
        <Button variant="secondary" disabled={busy || !until} onClick={async () => { if (await run(generateOps(until), genKey, t('live.saved'))) setGenKey(newActionKey()); }}>{t('live.generate.go')}</Button></div>}
      {edit && <Card title={edit.id ? t('live.edit') : t('live.new')}>
        <div className="grid grid-2">
          <Field label={t('live.f.title')} required>{id => <Input id={id} value={edit.draft.title} onChange={e => setEdit({ ...edit, draft: { ...edit.draft, title: e.target.value } })} />}</Field>
          <Field label={t('live.f.weekday')}>{id => <Select id={id} value={edit.draft.weekday} onChange={e => setEdit({ ...edit, draft: { ...edit.draft, weekday: Number(e.target.value) } })}>{WEEKDAYS.map(d => <option key={d} value={d}>{weekday(d)}</option>)}</Select>}</Field>
          <Field label={t('live.f.start')}>{id => <Input id={id} type="time" step={3600} value={edit.draft.start_time} onChange={e => setEdit({ ...edit, draft: { ...edit.draft, start_time: e.target.value } })} />}</Field>
          <Field label={t('live.f.room')}>{id => <Select id={id} value={edit.draft.resource} onChange={e => { const r = rooms.find(x => x.id === e.target.value); setEdit({ ...edit, draft: { ...edit.draft, resource: e.target.value, capacity: r ? num(r.capacity) : edit.draft.capacity } }); }}><option value="">—</option>{rooms.map(r => <option key={r.id} value={r.id}>{str(r.name)} · {t('live.rooms.mats', { n: num(r.capacity) })}</option>)}</Select>}</Field>
          <Field label={t('live.f.teacher')}>{id => <Select id={id} value={edit.draft.coach} onChange={e => setEdit({ ...edit, draft: { ...edit.draft, coach: e.target.value } })}><option value="">—</option>{coaches.filter(c => c.active !== false).map(c => <option key={c.id} value={c.id}>{coachName(c.id)}</option>)}</Select>}</Field>
          <Field label={t('live.f.capacity')}>{id => <Input id={id} inputMode="numeric" value={String(edit.draft.capacity)} onChange={e => setEdit({ ...edit, draft: { ...edit.draft, capacity: Number(e.target.value.replace(/\D/g, '')) || 0 } })} />}</Field>
          <Field label={t('live.f.from')}>{id => <Input id={id} type="date" value={edit.draft.valid_from} onChange={e => setEdit({ ...edit, draft: { ...edit.draft, valid_from: e.target.value } })} />}</Field>
          <Field label={t('live.f.until')}>{id => <Input id={id} type="date" value={edit.draft.valid_until ?? ''} onChange={e => setEdit({ ...edit, draft: { ...edit.draft, valid_until: e.target.value } })} />}</Field>
        </div>
        <Toggle checked={edit.draft.active} onChange={on => setEdit({ ...edit, draft: { ...edit.draft, active: on } })} label={t('live.published')} />
        {problems.map(p => <p key={p} className="xs register-diff">{t(`live.problem.${p}`)}</p>)}
        <div className="row wrap"><Button disabled={busy || problems.length > 0} loading={busy} onClick={save}>{t('live.save')}</Button><Button variant="ghost" onClick={() => setEdit(null)}>{t('core.common.cancel')}</Button></div>
      </Card>}
      {rows.length === 0 ? <EmptyState compact title={t('live.empty')} /> : rows.map(r => (
        <Card key={r.id} padding="sm" title={str(r.title)} eyebrow={`${weekday(num(r.weekday))} · ${str(r.start_time)}`} actions={canWrite && <div className="row wrap">
          <Button size="sm" variant="outline" onClick={() => setEdit({ id: r.id, draft: toDraft(r), key: newActionKey() })}>{t('live.edit')}</Button>
          <Button size="sm" variant="tonal" disabled={busy} onClick={() => run(publishScheduleOps(r.id, r.active === false), newActionKey(), t('live.saved'))}>{r.active === false ? t('live.publish') : t('live.unpublish')}</Button>
        </div>}>
          <p className="small">{coachName(r.coach)} · {roomName(r.resource)} · {t('live.rooms.mats', { n: num(r.capacity) })} <Badge tone={r.active === false ? 'neutral' : 'success'}>{r.active === false ? t('live.draft') : t('live.published')}</Badge></p>
        </Card>
      ))}
    </div>
  );
}

function Dates({ rows, roomName, coachName, canWrite, busy, run, lang }: { rows: CosRow[]; roomName: (id: unknown) => string; coachName: (id: unknown) => string; canWrite: boolean; busy: boolean; run: Run; lang: 'es' | 'en' }) {
  const { t } = useI18n();
  const [cancel, setCancel] = useState<{ id: string; reason: string; key: string } | null>(null);
  if (!rows.length) return <EmptyState compact title={t('live.dates.empty')} />;
  return <div className="stack-sm">{rows.map(o => {
    const booked = num(o.booked_count), cancelled = o.status === 'cancelled';
    return <Card key={o.id} padding="sm" title={str(o.title)} eyebrow={formatDateTime(str(o.starts_at), lang)} actions={canWrite && !cancelled && o.status === 'scheduled' && <Button size="sm" variant="outline" onClick={() => setCancel({ id: o.id, reason: '', key: newActionKey() })}>{t('live.cancel')}</Button>}>
      <p className="small">{coachName(o.coach)} · {roomName(o.resource)} · {booked}/{num(o.capacity)} {cancelled && <Badge tone="danger">{t('live.cancelled')}</Badge>}</p>
      {cancel?.id === o.id && <div className="stack-sm">
        <p className="xs">{t('live.cancel.body', { n: booked })}</p>
        <Field label={t('live.cancel.reason')} required>{id => <Input id={id} value={cancel.reason} onChange={e => setCancel({ ...cancel, reason: e.target.value })} autoFocus />}</Field>
        <div className="row wrap"><Button variant="danger" disabled={busy || !cancel.reason.trim()} loading={busy} onClick={async () => { if (await run(cancelOccurrenceOps(o.id, cancel.reason), cancel.key, t('live.cancel.done'))) setCancel(null); }}>{t('live.cancel.confirm', { n: booked })}</Button><Button variant="ghost" onClick={() => setCancel(null)}>{t('core.common.cancel')}</Button></div>
      </div>}
    </Card>;
  })}</div>;
}

function Teachers({ rows, canWrite, busy, run }: { rows: CosRow[]; canWrite: boolean; busy: boolean; run: Run }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState<{ id: string | null; personId: string; name: string; email: string; phone: string; active: boolean; key: string } | null>(null);
  const person = (c: CosRow) => (c.person ?? {}) as { id?: string; name?: string; email?: string; phone?: string };
  const sorted = useMemo(() => [...rows].sort((a, b) => str(person(a).name).localeCompare(str(person(b).name))), [rows]);
  return <div className="stack">
    {canWrite && <Button icon="plus" onClick={() => setEdit({ id: null, personId: '', name: '', email: '', phone: '', active: true, key: newActionKey() })}>{t('live.new')}</Button>}
    {edit && <Card title={edit.id ? t('live.edit') : t('live.new')}>
      <div className="grid grid-2">
        <Field label={t('live.f.name')} required>{id => <Input id={id} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />}</Field>
        {!edit.id && <Field label={t('live.f.email')}>{id => <Input id={id} type="email" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} />}</Field>}
        <Field label={t('live.f.phone')}>{id => <Input id={id} inputMode="tel" value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} />}</Field>
      </div>
      <Toggle checked={edit.active} onChange={on => setEdit({ ...edit, active: on })} label={t('live.f.active')} />
      <div className="row wrap"><Button disabled={busy || !edit.name.trim()} loading={busy} onClick={async () => { const d = { name: edit.name, email: edit.email, phone: edit.phone, active: edit.active }; if (await run(edit.id ? updateCoachOps(edit.id, edit.personId, d) : createCoachOps(d), edit.key, t('live.saved'))) setEdit(null); }}>{t('live.save')}</Button><Button variant="ghost" onClick={() => setEdit(null)}>{t('core.common.cancel')}</Button></div>
    </Card>}
    {sorted.length === 0 ? <EmptyState compact title={t('live.empty')} /> : sorted.map(c => <Card key={c.id} padding="sm" title={str(person(c).name) || '—'} actions={canWrite && <Button size="sm" variant="outline" onClick={() => setEdit({ id: c.id, personId: str(person(c).id), name: str(person(c).name), email: str(person(c).email), phone: str(person(c).phone), active: c.active !== false, key: newActionKey() })}>{t('live.edit')}</Button>}>
      <p className="small">{c.active === false ? <Badge>{t('live.draft')}</Badge> : <Badge tone="success">{t('live.f.active')}</Badge>}</p>
    </Card>)}
  </div>;
}

function Rooms({ rows, canWrite, busy, run }: { rows: CosRow[]; canWrite: boolean; busy: boolean; run: Run }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState<{ id: string | null; name: string; capacity: number; key: string } | null>(null);
  return <div className="stack">
    {canWrite && <Button icon="plus" onClick={() => setEdit({ id: null, name: '', capacity: 16, key: newActionKey() })}>{t('live.new')}</Button>}
    {edit && <Card title={edit.id ? t('live.edit') : t('live.new')}>
      <div className="grid grid-2">
        <Field label={t('live.f.name')} required>{id => <Input id={id} value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />}</Field>
        <Field label={t('live.f.capacity')}>{id => <Input id={id} inputMode="numeric" value={String(edit.capacity)} onChange={e => setEdit({ ...edit, capacity: Number(e.target.value.replace(/\D/g, '')) || 0 })} />}</Field>
      </div>
      <div className="row wrap"><Button disabled={busy || !edit.name.trim() || edit.capacity < 1} loading={busy} onClick={async () => { const d = { name: edit.name, capacity: edit.capacity }; if (await run(edit.id ? updateResourceOps(edit.id, d) : createResourceOps(d), edit.key, t('live.saved'))) setEdit(null); }}>{t('live.save')}</Button><Button variant="ghost" onClick={() => setEdit(null)}>{t('core.common.cancel')}</Button></div>
    </Card>}
    {rows.length === 0 ? <EmptyState compact title={t('live.empty')} /> : rows.map(r => <Card key={r.id} padding="sm" title={str(r.name)} actions={canWrite && <Button size="sm" variant="outline" onClick={() => setEdit({ id: r.id, name: str(r.name), capacity: num(r.capacity), key: newActionKey() })}>{t('live.edit')}</Button>}>
      <p className="small">{t('live.rooms.mats', { n: num(r.capacity) })}</p>
    </Card>)}
  </div>;
}
