import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { MarkdownViewer } from '../../components/organism/MarkdownViewer/MarkdownViewer';
import { LiveBlock } from '../../components/organism/LiveBlock/LiveBlock';
import { Figure } from '../../components/organism/Figure/Figure';
import { ChapterCard } from '../../components/molecule/ChapterCard/ChapterCard';
import { Toc } from '../../components/molecule/Toc/Toc';
import { Wordmark } from '../../components/atom/Wordmark/Wordmark';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Input, Select } from '../../components/atom/Input/Input';
import { tenant } from '../../tenant/tenant';
import { assetUrl } from '../docs/docsIndex';
import {
  START_HERE, chapterFor, chaptersByPart, chaptersFor, decisionsFor, decisionsIn, headingsIn, loadBodies,
  manualRoute, partOf, placeholdersFor, placeholdersIn, readingTime, searchChapters, useChapterBody, type Chapter,
} from './manualIndex';
import './manual.css';

const HOME = '/manual';
const chapterPath = (slug: string) => `/manual/${slug}`;
const splitRoles = (role: string) => role.split(/[,·]/).map((r) => r.trim()).filter(Boolean);

/** The manual's own version and date: the newest any chapter declares. */
function manualVersion(list: Chapter[]) {
  const pick = (get: (c: Chapter) => string) => { const v = list.map(get).filter(Boolean).sort(); return v.length ? v[v.length - 1] : ''; };
  return { version: pick((c) => c.version), updated: pick((c) => c.updated) };
}

/** Bilingual labels the chapter card's meta row needs. */
function useCardLabels() {
  const { lang } = useI18n();
  return lang === 'en'
    ? { minutes: 'min read', figures: 'figures', decisions: 'decisions', placeholders: 'to capture' }
    : { minutes: 'min de lectura', figures: 'capturas', decisions: 'decisiones', placeholders: 'por capturar' };
}

/** Search field shared by the cover and the sidebar; results link straight into a chapter. */
function ManualSearch({ autoFocusResults = false }: { autoFocusResults?: boolean }) {
  const { t, lang } = useI18n();
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
                <li key={c.slug}><Link to={chapterPath(c.slug)}><span className="manual-num">{c.number}</span>{c.title}</Link></li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Sidebar with the parts, their chapters, the decisions link, search and print. Shared by every manual page. */
export function ManualSidebar({ active }: { active?: string }) {
  const { t, lang, bi } = useI18n();
  const parts = chaptersByPart(lang);
  const list = chaptersFor(lang);
  const decisions = decisionsFor(lang).length;
  const navigate = useNavigate();
  return (
    <aside className="manual-side">
      <div className="manual-mobile">
        <Select aria-label={t('manual.chapters')} value={active ?? 'home'} onChange={(e) => navigate(e.target.value === 'home' ? HOME : e.target.value === 'decisions' ? '/manual/decisions' : chapterPath(e.target.value))}>
          <option value="home">▤ {t('manual.title')}</option>
          <option value="decisions">! {t('manual.decisions')} ({decisions})</option>
          {list.map((c) => <option key={c.slug} value={c.slug}>{c.number} · {c.title}</option>)}
        </Select>
      </div>
      <div>
        <Link className="manual-side-brand" to={HOME}><Wordmark height={22} /><span>{t('manual.title')}</span></Link>
        <p className="xs muted">{t('manual.langNote')}</p>
      </div>
      <ManualSearch />
      <nav className="manual-nav" aria-label={t('manual.summary')}>
        <NavLink to="/manual/decisions" className={({ isActive }) => `manual-link ${isActive || active === 'decisions' ? 'is-active' : ''}`}>
          <span className="manual-num">!</span><span>{t('manual.decisions')} <Badge tone="warn">{decisions}</Badge></span>
        </NavLink>
      </nav>
      {parts.map((p) => (
        <nav key={p.key || 'loose'} className="manual-nav" aria-label={p.label ? bi(p.label) : t('manual.chapters')}>
          <div className="eyebrow">{p.key ? `${t('manual.part')} ${p.key} · ${bi(p.label!)}` : t('manual.chapters')}</div>
          {p.chapters.map((c) => (
            <NavLink key={c.slug} to={chapterPath(c.slug)} end className={({ isActive }) => `manual-link ${isActive || active === c.slug ? 'is-active' : ''}`}>
              <span className="manual-num">{c.number}</span><span>{c.title}{c.role && <span className="manual-role">{c.role}</span>}</span>
            </NavLink>
          ))}
        </nav>
      ))}
      <div className="manual-print"><Button variant="secondary" size="sm" onClick={() => window.print()}>{t('manual.print')}</Button></div>
    </aside>
  );
}

/** K-03 home — the cover, the reading paths by role and the part-by-part grid of chapters. */
export function ManualHome() {
  const { t, lang, bi } = useI18n();
  const parts = chaptersByPart(lang);
  const list = chaptersFor(lang);
  const labels = useCardLabels();
  const decisions = decisionsFor(lang);
  const pending = placeholdersFor(lang);
  const { version, updated } = manualVersion(list);
  const figures = list.reduce((n, c) => n + c.figures, 0);
  const minutes = list.reduce((n, c) => n + readingTime(c), 0);
  const bySlug = (slug: string) => list.find((c) => c.slug === slug);
  return (
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
            <Link to="/manual/decisions"><Badge tone="warn">{t('manual.decisions.count', { n: decisions.length })}</Badge></Link>
          </div>
        </header>

        <section className="manual-block">
          <h2 className="manual-h2">{t('manual.search')}</h2>
          <ManualSearch autoFocusResults />
        </section>

        <section className="manual-block">
          <h2 className="manual-h2">{t('manual.start')}</h2>
          <p className="muted small">{t('manual.start.lead')}</p>
          <div className="manual-start">
            {START_HERE.map((path) => (
              <div key={path.key} className="manual-start-col">
                <div className="eyebrow">{bi(path.label)}</div>
                <ol>
                  {path.slugs.map((slug) => { const c = bySlug(slug); return c ? <li key={slug}><Link to={chapterPath(slug)}><span className="manual-num">{c.number}</span>{c.title}</Link></li> : null; })}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {parts.map((p) => (
          <section key={p.key || 'loose'} className="manual-block">
            <div className="manual-part-head">
              <div className="eyebrow">{p.key ? `${t('manual.part')} ${p.key}` : ''}</div>
              <h2 className="manual-h2">{p.label ? bi(p.label) : t('manual.chapters')}</h2>
              {p.lead && <p className="muted small">{bi(p.lead)}</p>}
            </div>
            <div className="manual-grid">
              {p.chapters.map((c) => (
                <ChapterCard
                  key={c.slug} number={c.number} title={c.title} summary={c.summary} roles={splitRoles(c.role)}
                  to={chapterPath(c.slug)} minutes={readingTime(c)} figures={c.figures}
                  decisions={decisionsIn(c).length} placeholders={placeholdersIn(c).length} labels={labels}
                />
              ))}
            </div>
          </section>
        ))}

        {pending.length > 0 && (
          <p className="xs muted">{t('manual.placeholders.total', { n: pending.length })}</p>
        )}
      </article>
    </div>
  );
}

/** K-03 — one chapter in the app language, with its in-page outline, live blocks, figures and prev/next. */
export function ManualPage() {
  const { t, lang, bi } = useI18n();
  const { chapter: slug } = useParams();
  const hit = slug ? chapterFor(lang, slug) : undefined;
  const list = chaptersFor(lang);
  const i = hit ? list.findIndex((c) => c.slug === hit.chapter.slug) : -1;
  const prev = i > 0 ? list[i - 1] : undefined;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : undefined;
  const chapter = hit?.chapter;
  const pending = chapter ? placeholdersIn(chapter).length : 0;
  const headings = useMemo(() => (chapter ? headingsIn(chapter) : []), [chapter]);
  const body = useChapterBody(chapter);
  const part = chapter ? partOf(chapter.part) : undefined;
  return (
    <div className="manual">
      <ManualSidebar active={chapter?.slug ?? slug} />
      <article className="manual-main">
        {!hit && <p className="muted">{t('manual.notFound')} — {slug} · <Link to={HOME}>{t('manual.title')}</Link></p>}
        {hit && chapter && (
          <>
            <header className="manual-chapter-head">
              <div className="eyebrow">
                {part ? `${t('manual.part')} ${chapter.part} · ${bi(part.label)}` : t('manual.chapters')}
                {' · '}{chapter.number}
              </div>
              <h1>{chapter.title}</h1>
              {chapter.summary && <p className="manual-chapter-lead">{chapter.summary}</p>}
              <div className="manual-meta">
                {chapter.role && <span>{t('manual.role')}: <strong>{chapter.role}</strong></span>}
                <span>{readingTime(chapter)} {lang === 'en' ? 'min read' : 'min de lectura'}</span>
                {chapter.figures > 0 && <span>{chapter.figures} {lang === 'en' ? 'figures' : 'capturas'}</span>}
                {chapter.version && <span>{t('manual.version')}: <strong>{chapter.version}</strong></span>}
                {chapter.updated && <span>{t('manual.updated')}: <strong>{chapter.updated}</strong></span>}
                {pending > 0 && <Badge>{t('manual.placeholders.count', { n: pending })}</Badge>}
                <code className="xs">{chapter.path}</code>
              </div>
            </header>
            {hit.fallback && <div className="mdv"><blockquote className="mdv-callout mdv-callout-note">{t('manual.fallback')}</blockquote></div>}
            <div className="manual-reading">
              <div className="manual-body">
                {body === undefined && <p className="muted small">{t('core.common.loading')}</p>}
                {body !== undefined && <MarkdownViewer
                  source={body}
                  path={chapter.path}
                  resolveAsset={assetUrl}
                  resolveLink={manualRoute}
                  headingIds
                  directive={(kind, arg) => <LiveBlock kind={kind} arg={arg} />}
                  figure={(f) => <Figure url={f.url} caption={f.alt} title={f.title} />}
                />}
              </div>
              <div className="manual-aside"><Toc items={headings} label={t('manual.onThisPage')} /></div>
            </div>
            <nav className="manual-prevnext" aria-label={`${t('manual.prev')} / ${t('manual.next')}`}>
              {prev && <Link to={chapterPath(prev.slug)}><span className="eyebrow">← {t('manual.prev')}</span><span>{prev.number} · {prev.title}</span></Link>}
              {next && <Link className="is-next" to={chapterPath(next.slug)}><span className="eyebrow">{t('manual.next')} →</span><span>{next.number} · {next.title}</span></Link>}
            </nav>
          </>
        )}
      </article>
    </div>
  );
}
