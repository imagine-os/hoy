import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import './MarkdownViewer.css';

export interface MarkdownViewerProps {
  source: string;
  /** Path of the document (e.g. 'docs/rules/documentation.md') to resolve relative links/images. */
  path?: string;
  /** Resolves a relative asset path to a URL. */
  resolveAsset?: (rel: string) => string | undefined;
  /** Converts an internal .md link to an app route. */
  resolveLink?: (rel: string) => string | undefined;
}

function resolveRel(base: string | undefined, rel: string): string {
  if (!base) return rel;
  const parts = base.split('/').slice(0, -1);
  for (const seg of rel.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
  return parts.join('/');
}

/** Renders markdown with the `.prose` styles, rewriting relative images and .md links. */
export function MarkdownViewer({ source, path, resolveAsset, resolveLink }: MarkdownViewerProps) {
  return (
    <div className="prose mdv">
      <ReactMarkdown components={{
        img: ({ src = '', alt }) => {
          const url = /^(https?:)?\/\//.test(src) ? src : resolveAsset?.(resolveRel(path, src)) ?? src;
          return <img src={url} alt={alt ?? ''} loading="lazy" />;
        },
        a: ({ href = '', children }) => {
          if (/^(https?:)?\/\//.test(href) || href.startsWith('mailto:')) return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
          if (href.startsWith('#')) return <a href={href}>{children}</a>;
          const to = resolveLink?.(resolveRel(path, href.split('#')[0]));
          return to ? <Link to={to}>{children}</Link> : <a href={href}>{children}</a>;
        },
      }}>{source}</ReactMarkdown>
    </div>
  );
}
