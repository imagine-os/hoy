import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Select } from '../../components/atom/Input/Input';
import { useI18n } from '../../i18n/I18nProvider';
import { MarkdownViewer } from '../../components/organism/MarkdownViewer/MarkdownViewer';
import { assetUrl, docByPath, docGroups, docs, docsRoute, useDocSource } from './docsIndex';
import { ChangelogEntry, ChangelogList, KanbanBoard, PromptEntry, PromptList, ScreenshotGallery } from './views';
import './docs.css';

/** K-02 — grouped sidebar over docs/** with purpose-built renderers for kanban, changelog, prompts and screenshots. */
export function DocsBrowser() {
  const { t, bi } = useI18n();
  const { '*': splat = '' } = useParams();
  const key = splat.replace(/\/$/, '').replace(/\.md$/, '');
  const path = key ? `docs/${key}.md` : 'docs/README.md';
  const doc = docByPath(path);
  const source = useDocSource(doc?.path);
  const groups = docGroups();
  const navigate = useNavigate();
  const current = `/docs${key ? `/${key}` : ''}`;

  let main: JSX.Element;
  if (key === 'changelog') main = <><h1>{t('docs.group.changelog')}</h1><ChangelogList entries={docs.filter((d) => /^docs\/changelog\/\d{4}-/.test(d.path))} /></>;
  else if (key === 'prompts') main = <><h1>{t('docs.group.prompts')}</h1><PromptList entries={docs.filter((d) => /^docs\/prompts\/\d{4}-/.test(d.path))} /></>;
  else if (key === 'screenshots') main = <><h1>{t('docs.group.screenshots')}</h1><ScreenshotGallery /></>;
  else if (!doc) main = <p className="muted">{t('core.common.empty')} — {path}</p>;
  else if (/^docs\/changelog\/\d{4}-/.test(path)) main = <ChangelogEntry doc={doc} />;
  else if (/^docs\/prompts\/\d{4}-/.test(path)) main = <PromptEntry doc={doc} />;
  else if (source === undefined) main = <p className="muted small">{t('core.common.loading')}</p>;
  else if (path === 'docs/kanban.md') main = <><h1>{doc.title}</h1><p className="muted small">{t('docs.kanban.intro')}</p><KanbanBoard source={source} /></>;
  else main = <MarkdownViewer source={source} path={doc.path} resolveAsset={assetUrl} resolveLink={docsRoute} />;

  const wide = key === 'kanban' || /^prompts\/\d{4}-/.test(key);
  return (
    <div className={`docs ${wide ? 'is-wide' : ''}`}>
      <aside className="docs-side">
        <h2 className="docs-h2">{t('docs.title')}</h2>
        <div className="docs-mobile">
          <Select aria-label={t('docs.title')} value={groups.some((g) => g.items.some((it) => it.to === current)) ? current : '/docs'} onChange={(e) => navigate(e.target.value)}>
            {groups.map((g) => <optgroup key={g.key} label={bi(g.label)}>{g.items.map((it) => <option key={it.to} value={it.to}>{it.title.endsWith(' ·') ? `${t('docs.all')} ${it.title.slice(0, -2)}` : it.title}</option>)}</optgroup>)}
          </Select>
        </div>
        <nav className="docs-nav" aria-label={t('docs.title')}>
          {groups.map((g) => (
            <div key={g.key} className="docs-group">
              <div className="eyebrow docs-grouplabel">{bi(g.label)}</div>
              {g.items.map((it) => <NavLink key={it.to} to={it.to} end className={({ isActive }) => `docs-link ${isActive ? 'is-active' : ''}`}>{it.title.endsWith(' ·') ? `${t('docs.all')} ${it.title.slice(0, -2)}` : it.title}</NavLink>)}
            </div>
          ))}
        </nav>
      </aside>
      <article className="docs-main stack">
        {doc && <p className="xs muted mono docs-path">{doc.path}</p>}
        {main}
      </article>
    </div>
  );
}
