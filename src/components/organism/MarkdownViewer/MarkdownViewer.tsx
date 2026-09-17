import type { ReactNode } from 'react';
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown';
import { Link } from 'react-router-dom';
import './MarkdownViewer.css';

export interface MarkdownFigure {
  /** Resolved image URL. */
  url: string;
  /** Raw src as written in the markdown (relative to the document). */
  src: string;
  /** Alt text / caption. */
  alt: string;
  /** Markdown title attribute, the `CODE · /route` chip contract. */
  title: string;
}

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
  /**
   * Renders a live-data directive: a `{{kind}}` / `{{kind:arg}}` line, or a fenced ```live block
   * holding `kind:arg`. When absent the directive renders as a muted code chip, so a document that
   * uses directives is still readable in a viewer that does not supply data.
   */
  directive?: (kind: string, arg?: string) => ReactNode;
  /**
   * Renders an image that carries a markdown title as a figure (frame, caption, code chip, link).
   * When absent such an image renders as a plain `<img>`, exactly as before.
   */
  figure?: (fig: MarkdownFigure) => ReactNode;
  /** Adds an `id` to every `##` heading so an in-page table of contents can link to it. */
  headingIds?: boolean;
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

/** `## 3. Check-in` → `check-in`. The anchor id of a heading; stable across languages of the same chapter only by position, so the TOC computes it the same way. */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\d+[.)]\s*/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'section';
}

/**
 * GFM pipe tables. `react-markdown` alone does not parse them (that is remark-gfm, which this repo
 * does not depend on), so a table block is wrapped in a fenced ```table block here and rendered as a
 * real `<table>` by the `pre` override below. Tables inside fenced code blocks are left alone.
 */
const TABLE_DELIM = /^\s*\|?(\s*:?-{1,}:?\s*\|)+\s*:?-{1,}:?\s*\|?\s*$/;

function tablesToFences(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) { fenced = !fenced; out.push(line); continue; }
    const next = lines[i + 1];
    if (!fenced && line.includes('|') && next !== undefined && next.includes('|') && TABLE_DELIM.test(next)) {
      const block = [line, next];
      let j = i + 2;
      while (j < lines.length && lines[j].trim() && lines[j].includes('|')) { block.push(lines[j]); j += 1; }
      out.push('', '```table', ...block, '```', '');
      i = j - 1;
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

const cellsOf = (row: string): string[] => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

type Align = 'left' | 'center' | 'right';
function alignOf(delim: string): Align[] {
  return cellsOf(delim).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'));
}

/** Renders a fenced ```table block as a real table; each cell keeps its inline markdown. */
function MdTable({ source, cell }: { source: string; cell: (md: string) => ReactNode }) {
  const rows = source.split('\n').filter((r) => r.trim());
  if (rows.length < 2) return <p>{source}</p>;
  const align = alignOf(rows[1]);
  const head = cellsOf(rows[0]);
  const body = rows.slice(2).map(cellsOf);
  return (
    <div className="mdv-table-wrap">
      <table>
        <thead><tr>{head.map((c, i) => <th key={i} style={{ textAlign: align[i] ?? 'left' }}>{cell(c)}</th>)}</tr></thead>
        <tbody>{body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ textAlign: align[j] ?? 'left' }}>{cell(c)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

/**
 * Documentation conventions applied before parsing:
 * 1. `[screenshot: C-02 — caption]` on its own line is a placeholder for a capture that does not
 *    exist yet. It becomes an image with the `placeholder:` scheme, rendered as a dashed box.
 * 2. `{{pricing}}` / `{{pricing:membresia}}` on its own line is a live-data directive. It becomes a
 *    fenced ```live block, which the `directive` prop renders (a fenced block is passed through
 *    react-markdown intact, unlike a custom element, which the default HTML handling drops).
 */
export function preprocessMarkdown(source: string): string {
  const withBlocks = source
    .replace(/^\[screenshot:\s*([^\]]+)\]\s*$/gm, (_m, body: string) => {
      const code = body.match(/^([A-Z]+-\d{2}[a-z]?)/)?.[1] ?? 'screenshot';
      return `![${body.replace(/[[\]]/g, '')}](placeholder:${code})`;
    })
    .replace(/^\{\{\s*([a-z][a-z0-9_]*)\s*(?::\s*([^}]*?))?\s*\}\}[ \t]*$/gim, (_m, kind: string, arg?: string) => (
      `\n\`\`\`live\n${kind}${arg ? `:${arg.trim()}` : ''}\n\`\`\`\n`
    ));
  return tablesToFences(withBlocks);
}

/** Raw text of a fenced block with the given language, or null when the node is not one. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fencedOf(node: any, lang: string): string | null {
  const code = node?.children?.find((c: { tagName?: string }) => c.tagName === 'code');
  const cls: string[] = code?.properties?.className ?? [];
  return cls.includes(`language-${lang}`) ? textOf(code).replace(/\n$/, '') : null;
}

/** Reads `kind:arg` out of a fenced ```live block node, or null when it is not one. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function liveOf(node: any): { kind: string; arg?: string } | null {
  const raw = fencedOf(node, 'live');
  if (raw === null) return null;
  const [kind, ...rest] = raw.trim().split(':');
  if (!kind) return null;
  return { kind, arg: rest.length ? rest.join(':').trim() || undefined : undefined };
}

/** Renders markdown with the `.prose` styles, rewriting relative images and .md links. */
export function MarkdownViewer({ source, path, resolveAsset, resolveLink, components, directive, figure, headingIds }: MarkdownViewerProps) {
  const assetUrl = (src: string) => (/^(https?:)?\/\//.test(src) ? src : resolveAsset?.(resolveRel(path, src)) ?? src);
  const builtIn: Components = {
    img: ({ src = '', alt, title }) => {
      if (src.startsWith('placeholder:')) {
        const code = src.slice('placeholder:'.length);
        return <span className="mdv-placeholder" role="img" aria-label={alt ?? code}><code className="mdv-placeholder-code">{code}</code><span className="mdv-placeholder-cap">{alt}</span></span>;
      }
      const url = assetUrl(src);
      if (title && figure) return <>{figure({ url, src, alt: alt ?? '', title })}</>;
      return <img src={url} alt={alt ?? ''} loading="lazy" />;
    },
    // A paragraph holding only a titled image is unwrapped, so the figure is a block of its own.
    p: ({ node, children }) => {
      const kids = (node?.children ?? []).filter((c) => !(c.type === 'text' && !String(c.value ?? '').trim()));
      const only = kids.length === 1 ? kids[0] : undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (figure && only && (only as any).tagName === 'img' && (only as any).properties?.title) return <>{children}</>;
      return <p>{children}</p>;
    },
    h2: ({ node, children }) => (headingIds ? <h2 id={headingSlug(textOf(node))}>{children}</h2> : <h2>{children}</h2>),
    pre: ({ node, children }) => {
      const tbl = fencedOf(node, 'table');
      if (tbl !== null) return <MdTable source={tbl} cell={renderCell} />;
      const live = liveOf(node);
      if (!live) return <pre>{children}</pre>;
      if (!directive) return <p className="mdv-live-raw"><code>{`{{${live.kind}${live.arg ? `:${live.arg}` : ''}}}`}</code></p>;
      return <>{directive(live.kind, live.arg)}</>;
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
  /** Inline markdown inside one table cell: same overrides, no paragraph wrapper. */
  function renderCell(md: string): ReactNode {
    if (!md) return null;
    return (
      <ReactMarkdown
        urlTransform={(url) => (url.startsWith('placeholder:') ? url : defaultUrlTransform(url))}
        components={{ ...builtIn, ...components, p: ({ children }) => <>{children}</>, table: undefined, pre: ({ children }) => <>{children}</> }}
      >{md}</ReactMarkdown>
    );
  }
  return (
    <div className="prose mdv">
      <ReactMarkdown urlTransform={(url) => (url.startsWith('placeholder:') ? url : defaultUrlTransform(url))} components={{ ...builtIn, ...components }}>{preprocessMarkdown(source)}</ReactMarkdown>
    </div>
  );
}
