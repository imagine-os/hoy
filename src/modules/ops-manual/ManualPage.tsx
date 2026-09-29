import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useActions } from '../../actions';
import { MarkdownViewer, headingSlug } from '../../components/organism/MarkdownViewer/MarkdownViewer';
import { LiveBlock } from '../../components/organism/LiveBlock/LiveBlock';
import { Figure } from '../../components/organism/Figure/Figure';
import { SourceEmbed } from '../../components/organism/SourceEmbed/SourceEmbed';
import { ChapterCard } from '../../components/molecule/ChapterCard/ChapterCard';
import { Toc } from '../../components/molecule/Toc/Toc';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Icon } from '../../components/atom/Icon/Icon';
import { Input, Select } from '../../components/atom/Input/Input';
import { tenant } from '../../tenant/tenant';
import { captureInfo } from '../../app/captureDates';
import { assetUrl } from '../docs/docsIndex';
import {
  START_HERE, chapterFor, chaptersByPart, chaptersFor, decisionsFor, decisionsIn, loadBodies,
  manualRoute, partOf, placeholdersFor, placeholdersIn, readingTime, searchChapters, useChapterBody, type Chapter,
} from './manualIndex';
import { levelFor } from './audience';
import { chapterIcon, partIcon, MANUAL_ICON } from './chapterIcons';
import { ManualCtx } from './context';
import { useLens } from './lens';
import { AudienceChips, AudienceMatrix, LensSelect, LevelChip, LmsCover, ManualTiles, ReadButton, ScopedBlock, TeamView, TrainingBlock, useLensSubject, useRoleName } from './lms';
import { PolicyWithNote, RequestBox, SectionBlock, StudioValue } from './editing';
import { useOverrides, useProgress, useStudioPolicies } from './manualData';
import { splitSections } from './sections';
import { sourceById, sourceView } from './sources';
import { useManualHandlers } from './manualActions';
import { manualSpec } from './specs';
import './manual.css';

const HOME = '/manual';
const chapterPath = (slug: string) => `/manual/${slug}`;
const splitRoles = (role: string) => role.split(/[,·]/).map((r) => r.trim()).filter(Boolean);

/** The manual's own version and date: the newest any chapter declares. */
function manualVersion(list: Chapter[]) {
  // Versions compare numerically (0.13.0 > 0.8.0); dates compare as strings.
  const num = (v: string) => v.split('.').map((n) => n.padStart(4, '0')).join('.');
  const pick = (get: (c: Chapter) => string) => { const v = list.map(get).filter(Boolean).sort((a, b) => num(a).localeCompare(num(b))); return v.length ? v[v.length - 1] : ''; };
  return { version: pick((c) => c.version), updated: pick((c) => c.updated) };
}

/** Labels the chapter card's meta row needs, from the manual's string table. */
function useCardLabels() {
  const { t } = useI18n();
  return { minutes: t('manual.meta.minutes'), figure: t('manual.meta.figure'), figures: t('manual.meta.figures'), decisions: t('manual.meta.decisions'), placeholders: t('manual.meta.placeholders') };
}

/** Search field shared by the cover and the sidebar; results link straight into a chapter. */
function ManualSearch({ autoFocusResults = false }: { autoFocusResults?: boolean }) {
  const { t, lang } = useI18n();
  const { link } = useLens();
  const [q, setQ] = useState('');
  const [bodies, setBodies] = useState<Map<string, string>>();
  // The full text loads the first time someone searches; until then titles, summaries and headings answer.
  useEffect(() => { if (q.trim().length > 1 && !bodies) loadBodies(lang).then(setBodies).catch(() => undefined); }, [q, lang, bodies]);
  const hits = useMemo(() => (q.trim().length > 1 ? searchChapters(lang, q, bodies) : []), [q, lang, bodies]);
  return (
    <div className="manual-search">
      <Input type="search" value={q} placeholder={t('manual.search.placeholder')} aria-label={t('manual.search')} onChange={(e) => setQ(e.target.value)} />
      {q.trim().length > 1 && (
        <div className="manual-search-out" role="status">
          <div className="xs muted">{t('manual.search.count', { n: hits.length })}</div>
          {hits.length > 0 && (
            <ul className="manual-search-list">
              {hits.slice(0, autoFocusResults ? 12 : 8).map((c) => (
                <li key={c.slug}><Link to={link(chapterPath(c.slug))}><Icon name={chapterIcon(c.number)} size={16} /><span className="manual-num">{c.number}</span>{c.title}</Link></li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Sidebar with the lens, the parts and their chapters (icons, level, read), decisions, sources, search and print. */
export function ManualSidebar({ active }: { active?: string }) {
  const { t, lang, bi } = useI18n();
  const roleName = useRoleName();
  const parts = chaptersByPart(lang);
  const list = chaptersFor(lang);
  const decisions = decisionsFor(lang).length;
  const navigate = useNavigate();
  const { lens, link } = useLens();
  const subject = useLensSubject(lens);
  const { readOf } = useProgress(subject?.id);
  const go = (v: string) => navigate(link(v === 'home' ? HOME : v === 'decisions' ? '/manual/decisions' : v === 'sources' ? '/docs/source' : chapterPath(v)));
  return (
    <aside className="manual-side">
      <LensSelect compact />
      <div className="manual-mobile">
        <Select aria-label={t('manual.chapters')} value={active ?? 'home'} onChange={(e) => go(e.target.value)}>
          <option value="home">▤ {t('manual.title')}</option>
          <option value="decisions">! {t('manual.decisions')} ({decisions})</option>
          <option value="sources">❐ {t('manual.sources.nav')}</option>
          {list.map((c) => {
            const l = lens === 'all' ? undefined : levelFor(c, lens);
            return <option key={c.slug} value={c.slug}>{c.number} · {c.title}{l === 'required' ? ' ●' : l === 'recommended' ? ' ○' : ''}</option>;
          })}
        </Select>
      </div>
      <div className="manual-side-top">
        <Link className="manual-side-brand" to={link(HOME)}><Wordmark height={22} /><span>{t('manual.title')}</span></Link>
        <p className="xs muted">{t('manual.langNote')}</p>
      </div>
      <ManualSearch />
      <nav className="manual-nav" aria-label={t('manual.summary')}>
        <NavLink to={link('/manual/decisions')} className={({ isActive }) => `manual-link ${isActive || active === 'decisions' ? 'is-active' : ''}`}>
          <span className="manual-link-icon" aria-hidden><Icon name={MANUAL_ICON.decisions} size={18} /></span><span>{t('manual.decisions')} <Badge tone="warn">{decisions}</Badge></span>
        </NavLink>
        <NavLink to="/docs/source" className={({ isActive }) => `manual-link ${isActive || active === 'sources' ? 'is-active' : ''}`}>
          <span className="manual-link-icon" aria-hidden><Icon name={MANUAL_ICON.sources} size={18} /></span><span>{t('manual.sources.nav')}</span>
        </NavLink>
      </nav>
      {lens !== 'all' && <p className="xs muted manual-side-legend">{t('manual.side.legend', { role: roleName(lens) })}</p>}
      {parts.map((p) => (
        <nav key={p.key || 'loose'} className="manual-nav" aria-label={p.label ? bi(p.label) : t('manual.chapters')}>
          <div className="eyebrow manual-nav-part"><Icon name={partIcon(p.key)} size={14} />{p.key ? `${t('manual.part')} ${p.key} · ${bi(p.label!)}` : t('manual.chapters')}</div>
          {p.chapters.map((c) => {
            const l = lens === 'all' ? undefined : levelFor(c, lens);
            const read = subject ? readOf(subject.id, c.slug) : undefined;
            return (
              <NavLink key={c.slug} to={link(chapterPath(c.slug))} end className={({ isActive }) => `manual-link ${isActive || active === c.slug ? 'is-active' : ''} ${lens !== 'all' && !l ? 'is-na' : ''}`}>
                <span className="manual-link-icon" aria-hidden><Icon name={chapterIcon(c.number)} size={18} /></span>
                <span className="grow"><span className="manual-num">{c.number}</span> {c.title}{c.role && lens === 'all' && <span className="manual-role">{c.role}</span>}</span>
                {l && <span className={`manual-link-level is-${l}`} title={t(`manual.level.${l}`, { role: roleName(lens) })} aria-label={t(`manual.level.${l}`, { role: roleName(lens) })}>{read ? '✓' : l === 'required' ? '●' : '○'}</span>}
              </NavLink>
            );
          })}
        </nav>
      ))}
      <div className="manual-print"><Button variant="secondary" size="sm" onClick={() => window.print()}>{t('manual.print')}</Button></div>
    </aside>
  );
}

/** K-03 home — the cover, the lens dashboard ("Tu manual"), the team view, search and the part grid. */
export function ManualHome() {
  const { t, lang, bi } = useI18n();
  const roleName = useRoleName();
  const parts = chaptersByPart(lang);
  const list = chaptersFor(lang);
  const labels = useCardLabels();
  const pending = placeholdersFor(lang);
  const decisions = decisionsFor(lang);
  const { version, updated } = manualVersion(list);
  const figures = list.reduce((n, c) => n + c.figures, 0);
  const minutes = list.reduce((n, c) => n + readingTime(c), 0);
  const bySlug = (slug: string) => list.find((c) => c.slug === slug);
  const { lens, link } = useLens();
  const subject = useLensSubject(lens);
  const { readOf } = useProgress(subject?.id);
  const handlers = useManualHandlers();
  useActions(manualSpec, handlers);
  return (
    <ManualCtx.Provider value={{ lens }}>
      <div className="manual">
        <ManualSidebar />
        <article className="manual-main manual-home">
          <header className="manual-cover">
            <Wordmark height={54} />
            <h1>{t('manual.title')}</h1>
            <p className="manual-cover-tag">{t('manual.tagline')}</p>
            <p className="manual-cover-lead">{t('manual.cover.lead', { studio: tenant.name, city: tenant.city })}</p>
            <div className="manual-cover-meta">
              <span>{t('manual.version')} <strong>{version || '—'}</strong></span>
              <span>{t('manual.updated')} <strong>{updated || '—'}</strong></span>
              <span>{t('manual.cover.chapters', { n: list.length, parts: parts.filter((p) => p.key).length })}</span>
              <span>{t('manual.cover.weight', { min: minutes, img: figures })}</span>
              <Link to={link('/manual/decisions')}><Badge tone="warn">{t('manual.decisions.count', { n: decisions.length })}</Badge></Link>
            </div>
            <div className="manual-cover-lens"><LensSelect /></div>
          </header>

          {lens === 'all' ? <ManualTiles chapters={list.length} minutes={minutes} /> : <LmsCover />}

          <TeamView />

          <section className="manual-block">
            <h2 className="manual-h2 manual-h2-icon"><span className="manual-part-icon" aria-hidden><Icon name={MANUAL_ICON.search} size={20} /></span>{t('manual.search')}</h2>
            <ManualSearch autoFocusResults />
          </section>

          {lens === 'all' && (
            <section className="manual-block">
              <h2 className="manual-h2 manual-h2-icon"><span className="manual-part-icon" aria-hidden><Icon name={MANUAL_ICON.start} size={20} /></span>{t('manual.start')}</h2>
              <p className="muted small">{t('manual.start.lead')}</p>
              <div className="manual-start">
                {START_HERE.map((path) => (
                  <div key={path.key} className="manual-start-col">
                    <div className="eyebrow">{bi(path.label)}</div>
                    <ol>
                      {path.slugs.map((slug) => { const c = bySlug(slug); return c ? <li key={slug}><Link to={link(chapterPath(slug))}><Icon name={chapterIcon(c.number)} size={16} /><span className="manual-num">{c.number}</span>{c.title}</Link></li> : null; })}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          {parts.map((p) => (
            <section key={p.key || 'loose'} className="manual-block">
              <div className="manual-part-head">
                <div className="eyebrow">{p.key ? `${t('manual.part')} ${p.key}` : ''}</div>
                <h2 className="manual-h2 manual-h2-icon"><span className="manual-part-icon" aria-hidden><Icon name={partIcon(p.key)} size={20} /></span>{p.label ? bi(p.label) : t('manual.chapters')}</h2>
                {p.lead && <p className="muted small">{bi(p.lead)}</p>}
              </div>
              <div className="manual-grid">
                {p.chapters.map((c) => {
                  const l = lens === 'all' ? undefined : levelFor(c, lens) ?? 'na';
                  return (
                    <ChapterCard
                      key={c.slug} number={c.number} title={c.title} summary={c.summary} roles={lens === 'all' ? splitRoles(c.role) : []}
                      to={link(chapterPath(c.slug))} minutes={readingTime(c)} figures={c.figures}
                      decisions={decisionsIn(c).length} placeholders={placeholdersIn(c).length} labels={labels}
                      icon={<Icon name={chapterIcon(c.number)} size={20} />}
                      level={l} levelLabel={l ? t(`manual.level.${l}`, { role: roleName(lens) }) : undefined}
                      read={!!subject && !!readOf(subject.id, c.slug)} readLabel={t('manual.read.short')}
                    />
                  );
                })}
              </div>
            </section>
          ))}

          {pending.length > 0 && (
            <p className="xs muted">{t('manual.placeholders.total', { n: pending.length })}</p>
          )}
        </article>
      </div>
    </ManualCtx.Provider>
  );
}

/** The directives a chapter may write, the manual's own first (0031), then the LiveBlock data blocks. */
function ManualDirective({ kind, arg }: { kind: string; arg?: string }) {
  const { t } = useI18n();
  switch (kind) {
    case 'audience': return arg ? <p className="manual-aud-line"><AudienceChips slug={arg} /></p> : <AudienceMatrix />;
    case 'training': return <TrainingBlock role={arg} />;
    case 'studio': return <StudioValue policyKey={arg} />;
    case 'policy': return <PolicyWithNote field={arg} />;
    case 'source': {
      const s = arg ? sourceById(arg) : undefined;
      if (!s) return <div className="live live-unknown"><p><code>{`{{source${arg ? `:${arg}` : ''}}}`}</code> {t('manual.live.unknown')}</p></div>;
      return <SourceEmbed doc={sourceView(s)} level={4}><Link to={`/docs/source?doc=${s.id}`}>{t('manual.source.allSources')} →</Link></SourceEmbed>;
    }
    case 'editable': return null; // consumed by the section splitter; a stray one renders nothing
    default: return <LiveBlock kind={kind} arg={arg} />;
  }
}

/** K-03 — one chapter in the app language: sections (editable, overridable), live blocks, figures, requests. */
export function ManualPage() {
  const { t, lang, bi } = useI18n();
  const { role } = useSession();
  const { chapter: slug } = useParams();
  const hit = slug ? chapterFor(lang, slug) : undefined;
  const list = chaptersFor(lang);
  const i = hit ? list.findIndex((c) => c.slug === hit.chapter.slug) : -1;
  const prev = i > 0 ? list[i - 1] : undefined;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : undefined;
  const chapter = hit?.chapter;
  const pending = chapter ? placeholdersIn(chapter).length : 0;
  const body = useChapterBody(chapter);
  const part = chapter ? partOf(chapter.part) : undefined;
  const { lens, link } = useLens();
  const overrides = useOverrides(chapter?.slug, chapter?.lang ?? lang);
  const sections = useMemo(() => (body === undefined ? [] : splitSections(body)), [body]);
  const headings = useMemo(() => sections.filter((s) => s.heading).map((s) => ({ id: headingSlug(s.heading), text: s.heading })), [sections]);
  const handlers = useManualHandlers();
  useActions(manualSpec, handlers);
  const { byKey } = useStudioPolicies();
  // `{{studio:<key>}}` inside a sentence (not on its own line) reads as the value itself.
  const inline = (md: string) => md.replace(/(\S[^\n]*?)\{\{\s*studio\s*:\s*([a-z0-9_]+)\s*\}\}|\{\{\s*studio\s*:\s*([a-z0-9_]+)\s*\}\}(?=[^\n]*\S)/g, (m, pre: string | undefined, k1?: string, k2?: string) => {
    const row = byKey(k1 ?? k2 ?? '');
    const value = row ? (lang === 'en' ? row.value_en || row.value_es : row.value_es) : m;
    return `${pre ?? ''}**${value}**`;
  });
  const render = (md: string) => chapter ? (
    <MarkdownViewer
      source={inline(md)} path={chapter.path} resolveAsset={assetUrl} resolveLink={manualRoute} headingIds
      directive={(kind, arg) => <ManualDirective kind={kind} arg={arg} />}
      scope={(roles, content) => <ScopedBlock roles={roles}>{content}</ScopedBlock>}
      figure={(f) => { const code = f.title.split('·')[0].trim(); const info = captureInfo(code); return <Figure url={f.url} caption={f.alt} title={f.title} captured={info.captured} stale={info.stale} />; }}
    />
  ) : null;
  const editableCount = sections.filter((s) => s.editable).length;
  return (
    <ManualCtx.Provider value={{ chapter, lens }}>
      <div className="manual">
        <ManualSidebar active={chapter?.slug ?? slug} />
        <article className="manual-main">
          {!hit && <p className="muted">{t('manual.notFound')} — {slug} · <Link to={link(HOME)}>{t('manual.title')}</Link></p>}
          {hit && chapter && (
            <>
              <header className="manual-chapter-head">
                <div className="eyebrow manual-chapter-eyebrow">
                  {part && <Icon name={partIcon(chapter.part)} size={14} />}
                  {part ? `${t('manual.part')} ${chapter.part} · ${bi(part.label)}` : t('manual.chapters')}
                  {' · '}{chapter.number}
                </div>
                <div className="manual-chapter-title">
                  <span className="manual-chapter-icon" aria-hidden><Icon name={chapterIcon(chapter.number)} size={28} /></span>
                  <h1>{chapter.title}</h1>
                </div>
                {chapter.summary && <p className="manual-chapter-lead">{chapter.summary}</p>}
                <div className="manual-chapter-lms">
                  <LevelChip chapter={chapter} />
                  <ReadButton chapter={chapter} />
                </div>
                <div className="manual-meta">
                  <span>{readingTime(chapter)} {t('manual.meta.minutes')}</span>
                  {chapter.figures > 0 && <span>{chapter.figures} {t(chapter.figures === 1 ? 'manual.meta.figure' : 'manual.meta.figures')}</span>}
                  {chapter.version && <span>{t('manual.version')}: <strong>{chapter.version}</strong></span>}
                  {chapter.updated && <span>{t('manual.updated')}: <strong>{chapter.updated}</strong></span>}
                  {pending > 0 && <Badge>{t('manual.placeholders.count', { n: pending })}</Badge>}
                  {editableCount > 0 && role !== 'customer' && role !== 'public' && <Badge tone="primary">{t('manual.edit.count', { n: editableCount })}</Badge>}
                  {chapter.role && <span className="xs">{t('manual.role')}: {chapter.role}</span>}
                </div>
              </header>
              {hit.fallback && <div className="mdv"><blockquote className="mdv-callout mdv-callout-note">{t('manual.fallback')}</blockquote></div>}
              <div className="manual-reading">
                <div className="manual-body">
                  {body === undefined && <p className="muted small">{t('core.common.loading')}</p>}
                  {body !== undefined && sections.map((s, k) => (
                    <SectionBlock key={`${s.heading}-${k}`} chapter={chapter} section={s} overrides={overrides} render={render} />
                  ))}
                  {body !== undefined && <RequestBox chapter={chapter} headings={headings.map((h) => h.text)} />}
                </div>
                <div className="manual-aside"><Toc items={headings} label={t('manual.onThisPage')} /></div>
              </div>
              <nav className="manual-prevnext" aria-label={`${t('manual.prev')} / ${t('manual.next')}`}>
                {prev && <Link to={link(chapterPath(prev.slug))}><span className="eyebrow">← {t('manual.prev')}</span><span><Icon name={chapterIcon(prev.number)} size={16} /> {prev.number} · {prev.title}</span></Link>}
                {next && <Link className="is-next" to={link(chapterPath(next.slug))}><span className="eyebrow">{t('manual.next')} →</span><span><Icon name={chapterIcon(next.number)} size={16} /> {next.number} · {next.title}</span></Link>}
              </nav>
            </>
          )}
        </article>
      </div>
    </ManualCtx.Provider>
  );
}

