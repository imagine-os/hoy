import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { MarkdownViewer } from '../../components/organism/MarkdownViewer/MarkdownViewer';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Select } from '../../components/atom/Input/Input';
import { assetUrl } from '../docs/docsIndex';
import { chapterFor, chaptersFor, decisionsFor, manualRoute, placeholdersFor } from './manualIndex';
import './manual.css';

const DEFAULT = '00-index';

/** Sidebar with chapter list, decisions summary link and print. Shared by the chapter and decisions pages. */
export function ManualSidebar({ active }: { active?: string }) {
  const { t, lang } = useI18n();
  const list = chaptersFor(lang);
  const decisions = decisionsFor(lang).length;
  const navigate = useNavigate();
  const toPath = (slug: string) => (slug === DEFAULT ? '/manual' : `/manual/${slug}`);
  return (
    <aside className="manual-side">
      <div className="manual-mobile">
        <Select aria-label={t('manual.chapters')} value={active === 'decisions' ? 'decisions' : active ?? DEFAULT} onChange={(e) => navigate(e.target.value === 'decisions' ? '/manual/decisions' : toPath(e.target.value))}>
          <option value="decisions">! {t('manual.decisions')} ({decisions})</option>
          {list.map((c) => <option key={c.slug} value={c.slug}>{c.number} · {c.title}</option>)}
        </Select>
      </div>
      <div>
        <h2 className="manual-h2">{t('manual.title')}</h2>
        <p className="xs muted">{t('manual.langNote')}</p>
      </div>
      <nav className="manual-nav" aria-label={t('manual.summary')}>
        <div className="eyebrow">{t('manual.summary')}</div>
        <NavLink to="/manual/decisions" className={({ isActive }) => `manual-link ${isActive || active === 'decisions' ? 'is-active' : ''}`}>
          <span className="manual-num">!</span><span>{t('manual.decisions')} <Badge tone="warn">{decisions}</Badge></span>
        </NavLink>
      </nav>
      <nav className="manual-nav" aria-label={t('manual.chapters')}>
        <div className="eyebrow">{t('manual.chapters')}</div>
        {list.map((c) => (
          <NavLink key={c.slug} to={c.slug === DEFAULT ? '/manual' : `/manual/${c.slug}`} end className={({ isActive }) => `manual-link ${isActive || active === c.slug ? 'is-active' : ''}`}>
            <span className="manual-num">{c.number}</span><span>{c.title}{c.role && <span className="manual-role">{c.role}</span>}</span>
          </NavLink>
        ))}
      </nav>
      <div className="manual-print"><Button variant="secondary" size="sm" onClick={() => window.print()}>{t('manual.print')}</Button></div>
    </aside>
  );
}

/** K-03 — one chapter of the operations manual in the app language, with prev/next. */
export function ManualPage() {
  const { t, lang } = useI18n();
  const { chapter: slug = DEFAULT } = useParams();
  const hit = chapterFor(lang, slug);
  const list = chaptersFor(lang);
  const i = list.findIndex((c) => c.slug === slug);
  const prev = i > 0 ? list[i - 1] : undefined;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : undefined;
  const pending = hit ? placeholdersFor(lang).filter((p) => p.chapter.slug === slug).length : 0;
  return (
    <div className="manual">
      <ManualSidebar active={slug} />
      <article className="manual-main">
        {!hit && <p className="muted">{t('manual.notFound')} — {slug}</p>}
        {hit && (
          <>
            <div className="manual-meta">
              <code className="xs">{hit.chapter.path}</code>
              {hit.chapter.role && <span>{t('manual.role')}: <strong>{hit.chapter.role}</strong></span>}
              {hit.chapter.version && <span>{t('manual.version')}: <strong>{hit.chapter.version}</strong></span>}
              {hit.chapter.updated && <span>{t('manual.updated')}: <strong>{hit.chapter.updated}</strong></span>}
              {pending > 0 && <Badge>{t('manual.placeholders.count', { n: pending })}</Badge>}
            </div>
            {hit.fallback && <div className="mdv"><blockquote className="mdv-callout mdv-callout-note">{t('manual.fallback')}</blockquote></div>}
            <MarkdownViewer source={hit.chapter.body} path={hit.chapter.path} resolveAsset={assetUrl} resolveLink={manualRoute} />
            <nav className="manual-prevnext" aria-label={`${t('manual.prev')} / ${t('manual.next')}`}>
              {prev && <Link to={prev.slug === DEFAULT ? '/manual' : `/manual/${prev.slug}`}><span className="eyebrow">← {t('manual.prev')}</span><span>{prev.number} · {prev.title}</span></Link>}
              {next && <Link className="is-next" to={`/manual/${next.slug}`}><span className="eyebrow">{t('manual.next')} →</span><span>{next.number} · {next.title}</span></Link>}
            </nav>
          </>
        )}
      </article>
    </div>
  );
}
