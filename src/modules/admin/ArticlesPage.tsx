import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import type { ContentArticleRow } from '../../data/schema';
import type { Bi } from '../../specs/types';
import { formatDateTime } from '../../i18n/format';
import { DataTable, type DataTableColumn } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { Input, Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Field } from '../../components/molecule/Field/Field';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { MarkdownEditor } from '../../components/molecule/MarkdownEditor/MarkdownEditor';
import { BiField, ContentHead, fromLocalInput, toLocalInput, useContentEditing } from './contentNav';
import './admin.css';

type Status = 'draft' | 'scheduled' | 'published';
const SECTIONS = ['rules', 'about', 'faq'] as const;
const TONE: Record<Status, 'warn' | 'primary' | 'success'> = { draft: 'warn', scheduled: 'primary', published: 'success' };

/** Derived status: `published` plus a future `publish_at` is scheduled, not live. */
export function articleStatus(a: ContentArticleRow, now = Date.now()): Status {
  if (!a.published) return 'draft';
  if (a.publish_at && new Date(a.publish_at).getTime() > now) return 'scheduled';
  return 'published';
}

const blank = (): Partial<ContentArticleRow> => ({
  slug: '', section: 'rules', icon: null, title: { es: '', en: '' }, summary: { es: '', en: '' },
  body_md: { es: '', en: '' }, checklist: null, video_label: null, required: false, sort: 99,
  published: false, publish_at: null,
});

/** M-02a — the articles editor: bilingual title, markdown body with a live preview, slug, category, schedule. */
export function ArticlesPage() {
  const { t, bi, lang } = useI18n();
  const { data, audit, canWrite } = useContentEditing();
  const { rows, loading } = useTable<ContentArticleRow>('content_articles', { orderBy: { column: 'sort' } });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const row = rows.find((r) => r.id === selected) ?? null;
  const shown = useMemo(() => rows.filter((r) => filter === 'all' || articleStatus(r) === filter), [rows, filter]);

  const add = async () => {
    const body = blank();
    const created = await data.insert<ContentArticleRow>('content_articles', body);
    await audit('content.create', 'content_articles', created.id, { after: body });
    setSelected(created.id);
  };
  const remove = async (r: ContentArticleRow) => {
    if (!confirm(t('admin.content.deleteConfirm'))) return;
    await data.remove('content_articles', r.id);
    await audit('content.delete', 'content_articles', r.id, { before: { slug: r.slug, title: r.title } });
    setSelected(null);
  };
  const setPublished = async (r: ContentArticleRow, published: boolean, publishAt: string | null = r.publish_at) => {
    await data.update('content_articles', r.id, { published, publish_at: publishAt });
    await audit(published ? 'content.publish' : 'content.unpublish', 'content_articles', r.id, { before: { published: r.published, publish_at: r.publish_at }, after: { published, publish_at: publishAt } });
  };

  const cols: DataTableColumn<ContentArticleRow>[] = [
    { key: 'title', label: t('admin.articles.col.title'), render: (r) => <><strong className="small">{bi(r.title) || <span className="muted">{t('admin.articles.untitled')}</span>}</strong><div className="xs muted mono">{r.slug || '—'}</div></> },
    { key: 'section', label: t('admin.articles.col.section'), render: (r) => <Chip>{t(`admin.articles.section.${r.section}`)}</Chip> },
    { key: 'status', label: t('admin.articles.col.status'), sortable: false, render: (r) => { const s = articleStatus(r); return <Badge tone={TONE[s]}>{t(`admin.articles.status.${s}`)}</Badge>; } },
    { key: 'publish_at', label: t('admin.articles.col.when'), render: (r) => r.publish_at ? <span className="xs mono">{formatDateTime(r.publish_at, lang)}</span> : <span className="muted">—</span> },
    { key: 'sort', label: t('admin.articles.col.sort'), align: 'right', width: 80 },
  ];

  return (
    <div className="stack">
      <ContentHead current="articles" title={t('admin.articles.title')} subtitle={t('admin.articles.subtitle')}
        actions={<>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('core.common.search')} style={{ width: 200 }} aria-label={t('core.common.search')} />
          {canWrite && <Button size="sm" onClick={add}>{t('admin.articles.add')}</Button>}
        </>} />
      <div className="row wrap" role="tablist" aria-label={t('admin.articles.col.status')}>
        {(['all', 'published', 'scheduled', 'draft'] as const).map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? t('admin.articles.filter.all') : t(`admin.articles.status.${f}`)}
            {f !== 'all' ? ` · ${rows.filter((r) => articleStatus(r) === f).length}` : ''}
          </Chip>
        ))}
      </div>

      {loading && rows.length === 0
        ? <EmptyState tone="loading" title={t('core.common.loading')} />
        : rows.length === 0
          ? <EmptyState title={t('admin.articles.empty')} body={t('admin.articles.empty.body')} action={canWrite && <Button size="sm" onClick={add}>{t('admin.articles.add')}</Button>} />
          : <DataTable columns={cols} rows={shown} rowKey={(r) => r.id} search={search} dense onRowClick={(r) => setSelected(r.id)} selectedKey={selected} emptyText={t('admin.articles.emptyFilter')} />}

      <Drawer open={!!row} onClose={() => setSelected(null)} width={720}
        title={<div className="row wrap"><span>{t('admin.articles.editor')}</span>{row && <Badge tone={TONE[articleStatus(row)]}>{t(`admin.articles.status.${articleStatus(row)}`)}</Badge>}</div>}
        footer={row && canWrite ? (
          <div className="row-between wrap">
            <Button variant="danger" size="sm" onClick={() => remove(row)}>{t('core.common.delete')}</Button>
            <div className="row wrap">
              {articleStatus(row) !== 'published' && <Button size="sm" onClick={() => setPublished(row, true, null)}>{t('admin.articles.publishNow')}</Button>}
              {row.published && <Button size="sm" variant="ghost" onClick={() => setPublished(row, false)}>{t('admin.articles.unpublish')}</Button>}
            </div>
          </div>
        ) : undefined}>
        {row && <ArticleEditor key={row.id} row={row} readOnly={!canWrite} onSave={async (patch) => {
          await data.update('content_articles', row.id, patch);
          await audit('content.update', 'content_articles', row.id, { before: Object.fromEntries(Object.keys(patch).map((k) => [k, row[k]])), after: patch });
        }} />}
      </Drawer>
    </div>
  );
}

function ArticleEditor({ row, readOnly, onSave }: { row: ContentArticleRow; readOnly: boolean; onSave: (patch: Partial<ContentArticleRow>) => Promise<void> }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => pick(row));
  const [bodyLang, setBodyLang] = useState<'es' | 'en'>('es');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(pick(row)); }, [row.id, row.updated_at]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(pick(row));
  const slugError = !draft.slug.trim() ? t('admin.content.required') : /^[a-z0-9-]+$/.test(draft.slug) ? undefined : t('admin.articles.slugRule');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="stack">
      <div className="grid grid-2">
        <Field label={t('admin.articles.slug')} required error={slugError} hint={t('admin.articles.slug.hint')}>
          {(id) => <Input id={id} disabled={readOnly} value={draft.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />}
        </Field>
        <Field label={t('admin.articles.col.section')} hint={t('admin.articles.section.hint')}>
          {(id) => <Select id={id} disabled={readOnly} value={draft.section} onChange={(e) => set('section', e.target.value as Draft['section'])}>{SECTIONS.map((s) => <option key={s} value={s}>{t(`admin.articles.section.${s}`)}</option>)}</Select>}
        </Field>
      </div>
      <BiField label={t('admin.articles.titleField')} value={draft.title} onChange={(v) => set('title', v)} disabled={readOnly} />
      <BiField label={t('admin.articles.summary')} value={draft.summary} onChange={(v) => set('summary', v)} disabled={readOnly} />

      <div className="stack-sm">
        <div className="row-between wrap">
          <span className="eyebrow">{t('admin.articles.body')}</span>
          <div className="row">{(['es', 'en'] as const).map((l) => <Chip key={l} selected={bodyLang === l} onClick={() => setBodyLang(l)}>{l.toUpperCase()}</Chip>)}</div>
        </div>
        <MarkdownEditor
          value={draft.body_md[bodyLang]}
          onChange={(v) => set('body_md', { ...draft.body_md, [bodyLang]: v })}
          editLabel={`Markdown · ${bodyLang.toUpperCase()}`}
          previewLabel={t('admin.content.preview')}
          placeholder={t('admin.articles.body.ph')}
          emptyPreview={t('admin.articles.body.empty')}
          disabled={readOnly}
        />
      </div>

      <div className="grid grid-2">
        <Field label={t('admin.articles.publishAt')} hint={t('admin.articles.publishAt.hint')}>
          {(id) => <Input id={id} type="datetime-local" disabled={readOnly} value={toLocalInput(draft.publish_at)} onChange={(e) => set('publish_at', fromLocalInput(e.target.value))} />}
        </Field>
        <Field label={t('admin.articles.col.sort')}>
          {(id) => <Input id={id} type="number" disabled={readOnly} value={String(draft.sort)} onChange={(e) => set('sort', Number(e.target.value) || 0)} />}
        </Field>
      </div>

      {!readOnly && (
        <div className="row-between wrap">
          <span className="xs muted">{dirty ? t('admin.content.unsaved') : t('admin.content.upToDate')}</span>
          <Button size="sm" disabled={!dirty || !!slugError} loading={saving} onClick={async () => { setSaving(true); try { await onSave(draft); } finally { setSaving(false); } }}>{t('core.common.save')}</Button>
        </div>
      )}
    </div>
  );
}

interface Draft extends Record<string, unknown> { slug: string; section: ContentArticleRow['section']; title: Bi; summary: Bi; body_md: Bi; publish_at: string | null; sort: number }
const pick = (r: ContentArticleRow): Draft => ({ slug: r.slug ?? '', section: r.section, title: r.title ?? { es: '', en: '' }, summary: r.summary ?? { es: '', en: '' }, body_md: r.body_md ?? { es: '', en: '' }, publish_at: r.publish_at ?? null, sort: r.sort ?? 0 });
