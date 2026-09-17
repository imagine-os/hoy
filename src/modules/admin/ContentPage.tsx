import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, ModalityRow, RoomRow, TeacherRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { tenant } from '../../tenant/tenant';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Field } from '../../components/molecule/Field/Field';
import { Card } from '../../components/molecule/Card/Card';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { TeacherCard } from '../../components/organism/TeacherCard/TeacherCard';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit } from '../staff/audit';
import './admin.css';

type Entity = 'class_templates' | 'teachers' | 'modalities' | 'rooms';
type FieldKind = 'text' | 'int' | 'bool' | 'bi' | 'select' | 'ref' | 'time' | 'list';
interface FieldDef { name: string; kind: FieldKind; label: Bi; options?: readonly string[]; ref?: 'modalities' | 'teachers' | 'rooms'; required?: boolean; hint?: Bi }

const WEEKDAYS: Bi[] = [{ es: 'Domingo', en: 'Sunday' }, { es: 'Lunes', en: 'Monday' }, { es: 'Martes', en: 'Tuesday' }, { es: 'Miércoles', en: 'Wednesday' }, { es: 'Jueves', en: 'Thursday' }, { es: 'Viernes', en: 'Friday' }, { es: 'Sábado', en: 'Saturday' }];
const FIELDS: Record<Entity, FieldDef[]> = {
  class_templates: [
    { name: 'title', kind: 'text', label: { es: 'Título', en: 'Title' }, required: true },
    { name: 'modality_id', kind: 'ref', ref: 'modalities', label: { es: 'Modalidad', en: 'Modality' } },
    { name: 'teacher_id', kind: 'ref', ref: 'teachers', label: { es: 'Profesor/a', en: 'Teacher' } },
    { name: 'room_id', kind: 'ref', ref: 'rooms', label: { es: 'Sala', en: 'Room' } },
    { name: 'weekday', kind: 'select', options: ['0', '1', '2', '3', '4', '5', '6'], label: { es: 'Día', en: 'Weekday' } },
    { name: 'start_time', kind: 'time', label: { es: 'Hora', en: 'Start time' } },
    { name: 'duration_min', kind: 'int', label: { es: 'Duración (min)', en: 'Duration (min)' } },
    { name: 'capacity', kind: 'int', label: { es: 'Cupos', en: 'Capacity' }, hint: { es: 'Máximo: mats del estudio', en: 'Max: studio mats' } },
    { name: 'level', kind: 'select', options: ['all', 'beginner', 'intermediate', 'advanced'], label: { es: 'Nivel', en: 'Level' } },
  ],
  teachers: [
    { name: 'display_name', kind: 'text', label: { es: 'Nombre público', en: 'Public name' }, required: true },
    { name: 'bio', kind: 'bi', label: { es: 'Bio', en: 'Bio' } },
    { name: 'specialties', kind: 'list', label: { es: 'Especialidades', en: 'Specialties' } },
    { name: 'rate_per_class', kind: 'int', label: { es: 'Tarifa por clase (COP)', en: 'Rate per class (COP)' } },
    { name: 'photo_url', kind: 'text', label: { es: 'Foto (URL)', en: 'Photo (URL)' }, hint: { es: 'Marcador hasta tener fotos reales', en: 'Placeholder until real photos land' } },
  ],
  modalities: [
    { name: 'name_es', kind: 'text', label: { es: 'Nombre (ES)', en: 'Name (ES)' }, required: true },
    { name: 'name_en', kind: 'text', label: { es: 'Nombre (EN)', en: 'Name (EN)' } },
    { name: 'slug', kind: 'text', label: { es: 'Slug', en: 'Slug' } },
    { name: 'movement', kind: 'select', options: ['enraiza', 'fluye', 'arde', 'libera'], label: { es: 'Movimiento', en: 'Movement' } },
    { name: 'description', kind: 'bi', label: { es: 'Descripción', en: 'Description' } },
    { name: 'intensity', kind: 'int', label: { es: 'Intensidad 1–5', en: 'Intensity 1–5' } },
    { name: 'duration_min', kind: 'int', label: { es: 'Duración (min)', en: 'Duration (min)' } },
    { name: 'heated', kind: 'bool', label: { es: 'Sala caliente', en: 'Heated' } },
  ],
  rooms: [
    { name: 'name', kind: 'text', label: { es: 'Nombre', en: 'Name' }, required: true },
    { name: 'capacity', kind: 'int', label: { es: 'Capacidad (mats)', en: 'Capacity (mats)' } },
    { name: 'heated', kind: 'bool', label: { es: 'Calefacción', en: 'Heated' } },
    { name: 'notes', kind: 'text', label: { es: 'Notas', en: 'Notes' } },
  ],
};
const BLANK: Record<Entity, Record<string, unknown>> = {
  class_templates: { title: '', modality_id: '', teacher_id: '', room_id: '', weekday: 1, start_time: '07:00', duration_min: 60, capacity: tenant.studio.mats, level: 'all', active: false },
  teachers: { user_id: null, display_name: '', bio: { es: '', en: '' }, photo_url: null, specialties: [], certifications: null, rate_per_class: 0, active: false, rating_avg: null },
  modalities: { slug: '', name_es: '', name_en: '', movement: 'fluye', description: { es: '', en: '' }, intensity: 3, heated: false, duration_min: 60, active: false },
  rooms: { name: '', capacity: tenant.studio.mats, heated: false, notes: null },
};

/** M-02 — content CMS: templates, teachers, modalities, rooms. DataTable + Drawer, publish toggles, ES/EN fields, preview. */
export function ContentPage() {
  const { t, bi, lang } = useI18n();
  const data = useData();
  const { can } = useSession();
  const audit = useAudit('admin');
  const [entity, setEntity] = useState<Entity>('class_templates');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { rows, loading } = useTable<BaseRow>(entity, { orderBy: { column: FIELDS[entity][0].name } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: teachers } = useTable<TeacherRow>('teachers');
  const { rows: rooms } = useTable<RoomRow>('rooms');
  const refs = { modalities: modalities.map((m) => ({ id: m.id, label: bi({ es: m.name_es, en: m.name_en }) })), teachers: teachers.map((x) => ({ id: x.id, label: x.display_name })), rooms: rooms.map((r) => ({ id: r.id, label: r.name })) };
  const refLabel = (ref: keyof typeof refs, id: unknown) => refs[ref].find((r) => r.id === id)?.label ?? String(id ?? '—');
  const canWrite = can('content.write');
  const row = rows.find((r) => r.id === selected) ?? null;

  const columns = useMemo<DataTableColumn<BaseRow>[]>(() => {
    const first = FIELDS[entity].slice(0, entity === 'class_templates' ? 6 : 4);
    return [
      ...first.map<DataTableColumn<BaseRow>>((f) => ({ key: f.name, label: bi(f.label), render: (r) => {
        const v = r[f.name];
        if (f.kind === 'ref' && f.ref) return refLabel(f.ref, v);
        if (f.kind === 'bi') return bi((v as Bi | null) ?? { es: '', en: '' }) || <span className="muted">—</span>;
        if (f.kind === 'list') return (v as string[]).map((id) => <Chip key={id} movement={modalities.find((m) => m.id === id)?.movement}>{refLabel('modalities', id)}</Chip>);
        if (f.name === 'weekday') return bi(WEEKDAYS[Number(v)]);
        if (f.name === 'movement') return <Chip movement={v as ModalityRow['movement']} dot>{String(v)}</Chip>;
        if (typeof v === 'boolean') return v ? '✓' : '·';
        return v == null || v === '' ? <span className="muted">—</span> : String(v);
      } })),
      { key: 'active', label: t('admin.content.published'), width: 120, render: (r) => <span onClick={(e) => e.stopPropagation()}><Toggle size="sm" checked={!!r.active} disabled={!canWrite} onChange={(on) => publish(r, on)} /></span> },
    ];
  }, [entity, bi, refs, canWrite]);

  const publish = async (r: BaseRow, on: boolean) => {
    await data.update(entity, r.id, { active: on });
    await audit(on ? 'content.publish' : 'content.unpublish', entity, r.id, { before: !!r.active, after: on });
  };
  const add = async () => {
    const created = await data.insert(entity, BLANK[entity]);
    await audit('content.create', entity, created.id, { after: BLANK[entity] });
    setSelected(created.id);
  };
  const remove = async (r: BaseRow) => {
    if (!confirm(t('admin.content.deleteConfirm'))) return;
    await data.remove(entity, r.id);
    await audit('content.delete', entity, r.id, { before: r });
    setSelected(null);
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('admin.content.title')}</h1><p className="muted small">{t('admin.content.subtitle')}</p></div>
        <div className="row wrap">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('core.common.search')} style={{ width: 220 }} aria-label={t('core.common.search')} />
          {canWrite && <Button size="sm" onClick={add}>{t('admin.content.add')}</Button>}
        </div>
      </div>
      <div className="row wrap" role="tablist">
        {(Object.keys(FIELDS) as Entity[]).map((e) => <Chip key={e} selected={entity === e} onClick={() => { setEntity(e); setSelected(null); setSearch(''); }}>{t(`admin.content.tab.${e}`)}</Chip>)}
        <span className="xs muted">{t('admin.content.pricingNote')}</span>
      </div>
      {loading && rows.length === 0 ? <EmptyState tone="loading" title={t('core.common.loading')} /> : rows.length === 0 ? <EmptyState title={t('admin.content.empty')} body={t('admin.content.empty.body')} action={canWrite && <Button size="sm" onClick={add}>{t('admin.content.add')}</Button>} /> : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} search={search} onRowClick={(r) => setSelected(r.id)} selectedKey={selected} dense />
      )}
      <Drawer open={!!row} onClose={() => setSelected(null)} width={520} title={<div className="row wrap"><span>{t(`admin.content.tab.${entity}`)}</span>{row && <Badge tone={row.active ? 'success' : 'warn'}>{row.active ? t('admin.content.published') : t('admin.content.draft')}</Badge>}</div>}
        footer={row && canWrite ? <div className="row-between"><Button variant="danger" size="sm" onClick={() => remove(row)}>{t('core.common.delete')}</Button><Toggle size="sm" checked={!!row.active} label={t('admin.content.published')} onChange={(on) => publish(row, on)} /></div> : undefined}>
        {row && <Editor key={row.id} entity={entity} row={row} fields={FIELDS[entity]} refs={refs} modalities={modalities} readOnly={!canWrite} lang={lang} onSave={async (patch) => { await data.update(entity, row.id, patch); await audit('content.update', entity, row.id, { before: Object.fromEntries(Object.keys(patch).map((k) => [k, row[k]])), after: patch }); }} />}
      </Drawer>
    </div>
  );
}

function Editor({ entity, row, fields, refs, modalities, readOnly, lang, onSave }: { entity: Entity; row: BaseRow; fields: FieldDef[]; refs: Record<'modalities' | 'teachers' | 'rooms', { id: string; label: string }[]>; modalities: ModalityRow[]; readOnly: boolean; lang: string; onSave: (patch: Record<string, unknown>) => Promise<void> }) {
  const { t, bi } = useI18n();
  const [draft, setDraft] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map((f) => [f.name, row[f.name]])));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(Object.fromEntries(fields.map((f) => [f.name, row[f.name]]))); }, [row.updated_at]);
  const dirty = fields.some((f) => JSON.stringify(draft[f.name]) !== JSON.stringify(row[f.name]));
  const errors = fields.filter((f) => f.required && !String(draft[f.name] ?? '').trim()).map((f) => f.name);
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const save = async () => { setSaving(true); try { await onSave(draft); } finally { setSaving(false); } };
  const d = draft as Record<string, string | number | boolean | Bi | string[] | null>;
  return (
    <div className="stack">
      <div className="stack-sm">
        {fields.map((f) => (
          <Field key={f.name} label={bi(f.label)} required={f.required} hint={f.hint ? bi(f.hint) : undefined} error={errors.includes(f.name) ? t('admin.content.required') : undefined}>
            {(id) => {
              const v = draft[f.name];
              if (f.kind === 'bool') return <Toggle checked={!!v} disabled={readOnly} onChange={(on) => set(f.name, on)} />;
              if (f.kind === 'int') return <Input id={id} type="number" disabled={readOnly} value={v == null ? '' : String(v)} onChange={(e) => set(f.name, e.target.value === '' ? null : Number(e.target.value))} />;
              if (f.kind === 'time') return <Input id={id} type="time" disabled={readOnly} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />;
              if (f.kind === 'select') return <Select id={id} disabled={readOnly} value={String(v ?? '')} onChange={(e) => set(f.name, f.name === 'weekday' ? Number(e.target.value) : e.target.value)}>{f.options!.map((o) => <option key={o} value={o}>{f.name === 'weekday' ? bi(WEEKDAYS[Number(o)]) : o}</option>)}</Select>;
              if (f.kind === 'ref' && f.ref) return <Select id={id} disabled={readOnly} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)}><option value="">—</option>{refs[f.ref].map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</Select>;
              if (f.kind === 'bi') { const b = (v as Bi | null) ?? { es: '', en: '' }; return <div className="stack-sm"><textarea id={id} className="input adm-textarea" disabled={readOnly} placeholder="ES" value={b.es} onChange={(e) => set(f.name, { ...b, es: e.target.value })} /><textarea className="input adm-textarea" disabled={readOnly} placeholder="EN" value={b.en} onChange={(e) => set(f.name, { ...b, en: e.target.value })} aria-label={`${bi(f.label)} EN`} /></div>; }
              if (f.kind === 'list') { const list = (v as string[]) ?? []; return <div className="row wrap">{modalities.map((m) => <Chip key={m.id} movement={m.movement} dot selected={list.includes(m.id)} onClick={readOnly ? undefined : () => set(f.name, list.includes(m.id) ? list.filter((x) => x !== m.id) : [...list, m.id])}>{bi({ es: m.name_es, en: m.name_en })}</Chip>)}</div>; }
              return <Input id={id} disabled={readOnly} value={v == null ? '' : String(v)} onChange={(e) => set(f.name, e.target.value === '' && f.name !== 'title' ? null : e.target.value)} />;
            }}
          </Field>
        ))}
      </div>
      {!readOnly && <div className="row-between wrap"><span className="xs muted">{dirty ? t('admin.content.unsaved') : t('admin.content.upToDate')}</span><Button size="sm" disabled={!dirty || errors.length > 0} loading={saving} onClick={save}>{t('core.common.save')}</Button></div>}
      <Card tone="muted" eyebrow={t('admin.content.preview')} padding="sm">
        {entity === 'class_templates' && <ClassRow title={String(d.title ?? '')} teacher={refs.teachers.find((x) => x.id === d.teacher_id)?.label ?? ''} startsAt={`2026-01-05T${String(d.start_time ?? '07:00')}:00`} durationMin={Number(d.duration_min ?? 60)} movement={modalities.find((m) => m.id === d.modality_id)?.movement ?? 'fluye'} booked={0} capacity={Number(d.capacity ?? 0)} />}
        {entity === 'teachers' && <TeacherCard name={String(d.display_name ?? '')} bio={(d.bio as Bi) ?? { es: '', en: '' }} photo={d.photo_url as string | null} rating={row.rating_avg as number | null} specialties={((d.specialties as string[]) ?? []).map((id) => modalities.find((m) => m.id === id)).filter(Boolean).map((m) => ({ label: bi({ es: m!.name_es, en: m!.name_en }), movement: m!.movement }))} />}
        {entity === 'modalities' && <div className="stack-sm"><Chip movement={d.movement as ModalityRow['movement']} dot>{lang === 'en' ? String(d.name_en || d.name_es) : String(d.name_es)}</Chip><p className="small">{bi((d.description as Bi) ?? { es: '' })}</p><span className="xs muted">{d.duration_min as number} min · {t('admin.content.intensity')} {String(d.intensity)}{d.heated ? ' · ♨' : ''}</span></div>}
        {entity === 'rooms' && <div className="row-between"><strong>{String(d.name ?? '')}</strong><Badge>{String(d.capacity)} mats{d.heated ? ' · ♨' : ''}</Badge></div>}
      </Card>
    </div>
  );
}
