import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import type { FaqEntryRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { Card } from '../../components/molecule/Card/Card';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import { Field } from '../../components/molecule/Field/Field';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { BiField, ContentHead, useContentEditing } from './contentNav';
import './admin.css';

interface Group { key: string; title: Bi; lead: Bi; page: number; entries: FaqEntryRow[] }

/**
 * M-02b — the FAQ editor. Sections come from the rows themselves (`group_key`), order is `sort` and
 * moves one step at a time: no drag-and-drop, because two buttons are keyboard-reachable, obvious
 * on a phone and impossible to do by accident.
 */
export function FaqAdminPage() {
  const { t, bi } = useI18n();
  const { data, audit, canWrite } = useContentEditing();
  const { rows, loading } = useTable<FaqEntryRow>('faq_entries', { orderBy: { column: 'sort' } });
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState<1 | 2 | 0>(0);
  const row = rows.find((r) => r.id === selected) ?? null;

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, FaqEntryRow[]>();
    for (const r of rows) map.set(r.group_key, [...(map.get(r.group_key) ?? []), r]);
    return [...map.entries()]
      .map(([key, entries]) => {
        const sorted = [...entries].sort((a, b) => a.sort - b.sort);
        return { key, title: sorted[0].group_title, lead: sorted[0].group_lead, page: sorted[0].page, entries: sorted };
      })
      .filter((g) => page === 0 || g.page === page)
      .sort((a, b) => a.page - b.page || a.key.localeCompare(b.key));
  }, [rows, page]);

  const swap = async (group: Group, index: number, dir: -1 | 1) => {
    const a = group.entries[index], b = group.entries[index + dir];
    if (!a || !b) return;
    await data.update('faq_entries', a.id, { sort: b.sort });
    await data.update('faq_entries', b.id, { sort: a.sort });
    await audit('content.reorder', 'faq_entries', a.id, { before: { sort: a.sort }, after: { sort: b.sort }, group: group.key });
  };
  const togglePublished = async (r: FaqEntryRow) => {
    await data.update('faq_entries', r.id, { published: !r.published });
    await audit(r.published ? 'content.unpublish' : 'content.publish', 'faq_entries', r.id, { before: r.published, after: !r.published });
  };
  const addEntry = async (group?: Group) => {
    const g = group ?? groups[0];
    const nextKey = g?.key ?? `s${rows.length + 1}`;
    const body: Partial<FaqEntryRow> = {
      group_key: nextKey,
      group_title: g?.title ?? { es: 'Sección nueva', en: 'New section' },
      group_lead: g?.lead ?? { es: '', en: '' },
      page: g?.page ?? 1,
      question: { es: '', en: '' }, answer: { es: '', en: '' },
      sort: (g ? Math.max(...g.entries.map((e) => e.sort)) : Math.max(0, ...rows.map((r) => r.sort))) + 1,
      published: false,
    };
    const created = await data.insert<FaqEntryRow>('faq_entries', body);
    await audit('content.create', 'faq_entries', created.id, { after: { group: nextKey } });
    setSelected(created.id);
  };
  const addGroup = async () => {
    const n = new Set(rows.map((r) => r.group_key)).size + 1;
    const body: Partial<FaqEntryRow> = {
      group_key: `s${n}`, group_title: { es: `Sección ${n}`, en: `Section ${n}` }, group_lead: { es: '', en: '' },
      page: 1, question: { es: '', en: '' }, answer: { es: '', en: '' }, sort: Math.max(0, ...rows.map((r) => r.sort)) + 1, published: false,
    };
    const created = await data.insert<FaqEntryRow>('faq_entries', body);
    await audit('content.create', 'faq_entries', created.id, { after: { group: body.group_key, newGroup: true } });
    setSelected(created.id);
  };
  const remove = async (r: FaqEntryRow) => {
    if (!confirm(t('admin.content.deleteConfirm'))) return;
    await data.remove('faq_entries', r.id);
    await audit('content.delete', 'faq_entries', r.id, { before: { question: r.question } });
    setSelected(null);
  };

  return (
    <div className="stack">
      <ContentHead current="faq" title={t('admin.faq.title')} subtitle={t('admin.faq.subtitle')}
        actions={canWrite ? <>
          <Button size="sm" variant="ghost" onClick={addGroup}>{t('admin.faq.addGroup')}</Button>
          <Button size="sm" onClick={() => addEntry()}>{t('admin.faq.addEntry')}</Button>
        </> : undefined} />

      <div className="row wrap" role="tablist" aria-label={t('admin.faq.page')}>
        {([0, 1, 2] as const).map((p) => <Chip key={p} selected={page === p} onClick={() => setPage(p)}>{p === 0 ? t('admin.faq.page.all') : t('admin.faq.page.n', { n: p })}</Chip>)}
        <span className="xs muted">{t('admin.faq.count', { n: rows.length, published: rows.filter((r) => r.published).length })}</span>
      </div>

      {loading && rows.length === 0 && <EmptyState tone="loading" title={t('core.common.loading')} />}
      {!loading && groups.length === 0 && <EmptyState title={t('admin.faq.empty')} body={t('admin.faq.empty.body')} action={canWrite && <Button size="sm" onClick={addGroup}>{t('admin.faq.addGroup')}</Button>} />}

      {groups.map((g) => (
        <Card key={g.key} padding="sm" title={bi(g.title) || g.key}
          eyebrow={`${g.key} · ${t('admin.faq.page.n', { n: g.page })}`}
          actions={canWrite ? <Button size="sm" variant="ghost" onClick={() => addEntry(g)}>{t('admin.faq.addHere')}</Button> : undefined}>
          {bi(g.lead) && <p className="xs muted">{bi(g.lead)}</p>}
          <div className="adm-lines">
            {g.entries.map((e, i) => (
              <div key={e.id} className="adm-line">
                <span className="adm-faq-move">
                  <Button size="sm" variant="ghost" disabled={!canWrite || i === 0} onClick={() => swap(g, i, -1)} aria-label={t('admin.faq.up')}>↑</Button>
                  <Button size="sm" variant="ghost" disabled={!canWrite || i === g.entries.length - 1} onClick={() => swap(g, i, 1)} aria-label={t('admin.faq.down')}>↓</Button>
                </span>
                <button type="button" className="grow adm-faq-q" onClick={() => setSelected(e.id)}>
                  <span className="small">{bi(e.question) || t('admin.faq.untitled')}</span>
                  <span className="xs muted">{(bi(e.answer) || '').slice(0, 90) || t('admin.faq.noAnswer')}</span>
                </button>
                <Badge tone={e.published ? 'success' : 'warn'}>{t(e.published ? 'admin.content.published' : 'admin.content.draft')}</Badge>
                <Toggle size="sm" checked={e.published} disabled={!canWrite} onChange={() => togglePublished(e)} label={t('admin.content.published')} />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Drawer open={!!row} onClose={() => setSelected(null)} width={560} title={t('admin.faq.editor')}
        footer={row && canWrite ? <div className="row-between wrap"><Button variant="danger" size="sm" onClick={() => remove(row)}>{t('core.common.delete')}</Button><Toggle size="sm" checked={row.published} label={t('admin.content.published')} onChange={() => togglePublished(row)} /></div> : undefined}>
        {row && <FaqEditor key={row.id} row={row} readOnly={!canWrite} onSave={async (patch) => {
          await data.update('faq_entries', row.id, patch);
          await audit('content.update', 'faq_entries', row.id, { before: Object.fromEntries(Object.keys(patch).map((k) => [k, row[k]])), after: patch });
          // Section title, lead and page belong to the section, not to one row: keep the siblings in step.
          const shared = { group_title: patch.group_title, group_lead: patch.group_lead, page: patch.page };
          const siblings = rows.filter((r) => r.id !== row.id && r.group_key === (patch.group_key ?? row.group_key));
          for (const sib of siblings) {
            if (JSON.stringify({ group_title: sib.group_title, group_lead: sib.group_lead, page: sib.page }) === JSON.stringify(shared)) continue;
            await data.update('faq_entries', sib.id, shared);
          }
        }} />}
      </Drawer>
    </div>
  );
}

interface FaqDraft extends Record<string, unknown> { group_key: string; group_title: Bi; group_lead: Bi; page: number; question: Bi; answer: Bi; sort: number }
const pick = (r: FaqEntryRow): FaqDraft => ({ group_key: r.group_key, group_title: r.group_title, group_lead: r.group_lead, page: r.page, question: r.question, answer: r.answer, sort: r.sort });

function FaqEditor({ row, readOnly, onSave }: { row: FaqEntryRow; readOnly: boolean; onSave: (patch: Partial<FaqEntryRow>) => Promise<void> }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => pick(row));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(pick(row)); }, [row.id, row.updated_at]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(row));
  const set = <K extends keyof FaqDraft>(k: K, v: FaqDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div className="stack">
      <BiField label={t('admin.faq.question')} value={draft.question} onChange={(v) => set('question', v)} disabled={readOnly} rows={2} />
      <BiField label={t('admin.faq.answer')} value={draft.answer} onChange={(v) => set('answer', v)} disabled={readOnly} rows={5} />
      <div className="grid grid-2">
        <Field label={t('admin.faq.groupKey')} hint={t('admin.faq.groupKey.hint')}>
          {(id) => <Input id={id} disabled={readOnly} value={draft.group_key} onChange={(e) => set('group_key', e.target.value.trim())} />}
        </Field>
        <Field label={t('admin.faq.page')} hint={t('admin.faq.page.hint')}>
          {(id) => <Select id={id} disabled={readOnly} value={String(draft.page)} onChange={(e) => set('page', Number(e.target.value))}>{[1, 2].map((p) => <option key={p} value={p}>{t('admin.faq.page.n', { n: p })}</option>)}</Select>}
        </Field>
      </div>
      <BiField label={t('admin.faq.groupTitle')} value={draft.group_title} onChange={(v) => set('group_title', v)} disabled={readOnly} rows={1} hint={t('admin.faq.groupTitle.hint')} />
      <BiField label={t('admin.faq.groupLead')} value={draft.group_lead} onChange={(v) => set('group_lead', v)} disabled={readOnly} rows={2} />
      {!readOnly && (
        <div className="row-between wrap">
          <span className="xs muted">{dirty ? t('admin.content.unsaved') : t('admin.content.upToDate')}</span>
          <Button size="sm" disabled={!dirty} loading={saving} onClick={async () => { setSaving(true); try { await onSave(draft); } finally { setSaving(false); } }}>{t('core.common.save')}</Button>
        </div>
      )}
    </div>
  );
}
