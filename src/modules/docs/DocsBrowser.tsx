import { NavLink, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { MarkdownViewer } from '../../components/organism/MarkdownViewer/MarkdownViewer';
import { assetUrl, docByPath, docTree } from './docsIndex';
import './docs.css';

export interface DocsBrowserProps {
  /** Sub-folder of docs/ this browser is limited to ('' = all, 'ops-manual/' = the manual). */
  prefix: string;
  /** Route base, e.g. '/docs' or '/manual'. */
  routeBase: string;
  defaultDoc: string;
  title: string;
}

/** Sidebar tree + markdown viewer over docs/**. Used by /docs and /manual. */
export function DocsBrowser({ prefix, routeBase, defaultDoc, title }: DocsBrowserProps) {
  const { t } = useI18n();
  const { '*': splat } = useParams();
  const path = splat ? `docs/${prefix}${splat}${splat.endsWith('.md') ? '' : '.md'}` : defaultDoc;
  const doc = docByPath(path);
  const toRoute = (p: string) => (p.startsWith(`docs/${prefix}`) ? `${routeBase}/${p.slice(`docs/${prefix}`.length).replace(/\.md$/, '')}` : p.startsWith('docs/') ? `/docs/${p.slice(5).replace(/\.md$/, '')}` : undefined);
  const tree = docTree(prefix);
  return (
    <div className="docs">
      <aside className="docs-side">
        <h2 className="docs-h2">{title}</h2>
        <nav className="docs-nav" aria-label={title}>
          {tree.map(({ dir, items }) => (
            <div key={dir} className="docs-group">
              {dir && <div className="eyebrow docs-grouplabel">{dir.replace(`${prefix.replace(/\/$/, '')}/`, '').replace(prefix.replace(/\/$/, ''), '') || dir}</div>}
              {items.map((d) => <NavLink key={d.path} to={toRoute(d.path)!} className={({ isActive }) => `docs-link ${isActive || d.path === path ? 'is-active' : ''}`}>{d.title}</NavLink>)}
            </div>
          ))}
        </nav>
      </aside>
      <article className="docs-main">
        {doc ? <><p className="xs muted mono docs-path">{doc.path}</p><MarkdownViewer source={doc.source} path={doc.path} resolveAsset={assetUrl} resolveLink={toRoute} /></> : <p className="muted">{t('core.common.empty')} — {path}</p>}
      </article>
    </div>
  );
}
