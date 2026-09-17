import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown';
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
  /** Extra react-markdown component overrides (applied after the built-in ones). */
  components?: Components;
}

/** Callout prefixes recognised at the start of a blockquote → tone class. */
const CALLOUTS: [RegExp, string][] = [
  [/^(DECISIÓN PENDIENTE|DECISION NEEDED|DECISION PENDING)\b/i, 'decision'],
  [/^(ADVERTENCIA|WARNING|CUIDADO|CAUTION)\b/i, 'warn'],
  [/^(NOTA|NOTE|TIP|CONSEJO)\b/i, 'note'],
];

function resolveRel(base: string | undefined, rel: string): string {
  if (!base) return rel;
  const parts = base.split('/').slice(0, -1);
  for (const seg of rel.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
  return parts.join('/');
}

/** Plain text of a hast node (used to sniff callout prefixes). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function textOf(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return String(node.value ?? '');
  return (node.children ?? []).map(textOf).join('');
}

/**
 * Documentation convention: a line `[screenshot: C-02 — caption]` is a placeholder for a capture that
 * does not exist yet. It becomes an image with the `placeholder:` scheme, rendered as a dashed box.
 */
export function preprocessMarkdown(source: string): string {
  return source.replace(/^\[screenshot:\s*([^\]]+)\]\s*$/gm, (_m, body: string) => {
    const code = body.match(/^([A-Z]+-\d{2}[a-z]?)/)?.[1] ?? 'screenshot';
    return `![${body.replace(/[[\]]/g, '')}](placeholder:${code})`;
  });
}

/** Renders markdown with the `.prose` styles, rewriting relative images and .md links. */
export function MarkdownViewer({ source, path, resolveAsset, resolveLink, components }: MarkdownViewerProps) {
  const builtIn: Components = {
    img: ({ src = '', alt }) => {
      if (src.startsWith('placeholder:')) {
        const code = src.slice('placeholder:'.length);
        return <span className="mdv-placeholder" role="img" aria-label={alt ?? code}><code className="mdv-placeholder-code">{code}</code><span className="mdv-placeholder-cap">{alt}</span></span>;
      }
      const url = /^(https?:)?\/\//.test(src) ? src : resolveAsset?.(resolveRel(path, src)) ?? src;
      return <img src={url} alt={alt ?? ''} loading="lazy" />;
    },
    a: ({ href = '', children }) => {
      if (/^(https?:)?\/\//.test(href) || href.startsWith('mailto:')) return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
      if (href.startsWith('#')) return <a href={href}>{children}</a>;
      const to = resolveLink?.(resolveRel(path, href.split('#')[0]));
      return to ? <Link to={to}>{children}</Link> : <a href={href}>{children}</a>;
    },
    blockquote: ({ node, children }) => {
      const text = textOf(node).trim();
      const tone = CALLOUTS.find(([re]) => re.test(text))?.[1];
      return tone ? <blockquote className={`mdv-callout mdv-callout-${tone}`}>{children}</blockquote> : <blockquote>{children}</blockquote>;
    },
  };
  return (
    <div className="prose mdv">
      <ReactMarkdown urlTransform={(url) => (url.startsWith('placeholder:') ? url : defaultUrlTransform(url))} components={{ ...builtIn, ...components }}>{preprocessMarkdown(source)}</ReactMarkdown>
    </div>
  );
}
