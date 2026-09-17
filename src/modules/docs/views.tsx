import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { MarkdownViewer } from '../../components/organism/MarkdownViewer/MarkdownViewer';
import { Card } from '../../components/molecule/Card/Card';
import { Badge, type BadgeTone } from '../../components/atom/Badge/Badge';
import { assetUrl, docsRoute, screenshotGroups, useDocSource, useDocSources, type DocEntry } from './docsIndex';

const CODE = /\b([A-Z]{1,3}-\d{2}[a-z]?)\b/g;

/** Inline text with page codes wrapped in <code>. */
export function withCodes(text: string): ReactNode {
  const parts = text.split(CODE);
  return parts.map((p, i) => (i % 2 ? <code key={i} className="docs-code">{p}</code> : <Fragment key={i}>{p}</Fragment>));
}

// ---------- Kanban ----------
const COLUMN = /^(backlog|to do|todo|doing|in progress|done|blocked)$/i;
const TONE: Record<string, BadgeTone> = { backlog: 'neutral', 'to do': 'neutral', todo: 'neutral', doing: 'primary', 'in progress': 'primary', done: 'success', blocked: 'danger' };
export interface KanbanLane { title: string; columns: { title: string; items: string[] }[] }

/**
 * docs/kanban.md → lanes. `## Backlog|Doing|Done|Blocked` are columns of the default lane; any other
 * `##` starts a lane (one per worker/module) whose `###` headings are its columns. `- ` lines are cards.
 */
export function parseKanban(source: string): KanbanLane[] {
  const lanes: KanbanLane[] = [];
  let lane: KanbanLane | undefined; let col: { title: string; items: string[] } | undefined;
  const ensureLane = (title: string) => { lane = lanes.find((l) => l.title === title) ?? (lanes.push({ title, columns: [] }), lanes[lanes.length - 1]); col = undefined; };
  const ensureCol = (title: string) => { if (!lane) ensureLane(''); col = lane!.columns.find((c) => c.title.toLowerCase() === title.toLowerCase()) ?? (lane!.columns.push({ title, items: [] }), lane!.columns[lane!.columns.length - 1]); };
  for (const raw of source.split('\n')) {
    const line = raw.trimEnd();
    const h2 = line.match(/^##\s+(.+)$/); const h3 = line.match(/^###\s+(.+)$/); const item = line.match(/^\s*[-*]\s+(.+)$/);
    if (h2) { if (COLUMN.test(h2[1].trim())) { if (!lane || lane.title !== '') ensureLane(''); ensureCol(h2[1].trim()); } else ensureLane(h2[1].trim()); }
    else if (h3) ensureCol(h3[1].trim());
    else if (item) { if (!col) ensureCol('Backlog'); col!.items.push(item[1].trim()); }
  }
  return lanes;
}

export function KanbanBoard({ source }: { source: string }) {
  const { t } = useI18n();
  const lanes = parseKanban(source);
  return (
    <div className="kanban">
      {lanes.map((lane) => (
        <section key={lane.title || 'general'} className="kanban-lane">
          <h2 className="kanban-lane-title">{lane.title || t('docs.kanban.general')}</h2>
          <div className="kanban-cols" style={{ gridTemplateColumns: `repeat(${Math.max(lane.columns.length, 1)}, minmax(0, 1fr))` }}>
            {lane.columns.map((c) => (
              <div key={c.title} className={`kanban-col kanban-col-${(TONE[c.title.toLowerCase()] ?? 'neutral')}`}>
                <div className="kanban-col-head"><span>{c.title}</span><Badge tone={TONE[c.title.toLowerCase()] ?? 'neutral'}>{c.items.length}</Badge></div>
                {c.items.map((it, i) => <div key={i} className="kanban-card">{withCodes(it.replace(/`/g, ''))}</div>)}
                {c.items.length === 0 && <div className="kanban-empty muted xs">{t('core.common.empty')}</div>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------- Changelog ----------
const HEADER_KEYS = new Set(['version', 'date', 'prompt', 'intent', 'decision', 'rejected', 'files']);

/** Body of a changelog entry: the markdown after the `key: value` header block. */
function bodyAfterHeader(source: string): string {
  const lines = source.split('\n');
  let i = 0; while (i < lines.length && /^\w+:\s/.test(lines[i]) && HEADER_KEYS.has(lines[i].split(':')[0])) i++;
  return lines.slice(i).join('\n').trim();
}

export function ChangelogEntry({ doc, compact = false }: { doc: DocEntry; compact?: boolean }) {
  const { t } = useI18n();
  const meta = doc.meta;
  const source = useDocSource(compact ? undefined : doc.path);
  const rest = source === undefined ? undefined : bodyAfterHeader(source);
  const promptTo = meta.prompt ? docsRoute(meta.prompt) : undefined;
  return (
    <Card title={<span className="row wrap"><Link to={docsRoute(doc.path)!}>{doc.title}</Link>{meta.version && <Badge tone="primary">v{meta.version}</Badge>}{meta.date && <Badge>{meta.date}</Badge>}</span>}>
      <dl className="cl-grid">
        {['intent', 'decision', 'rejected', 'files'].filter((k) => meta[k]).map((k) => <Fragment key={k}><dt className="eyebrow">{k}</dt><dd className={k === 'files' ? 'mono xs' : ''}>{withCodes(meta[k])}</dd></Fragment>)}
        {promptTo && <><dt className="eyebrow">prompt</dt><dd><Link to={promptTo} className="mono xs">{meta.prompt}</Link></dd></>}
      </dl>
      {!compact && rest === undefined && <p className="muted small">{t('core.common.loading')}</p>}
      {!compact && rest && <MarkdownViewer source={rest} path={doc.path} resolveAsset={assetUrl} resolveLink={docsRoute} />}
    </Card>
  );
}

export function ChangelogList({ entries }: { entries: DocEntry[] }) {
  const { t } = useI18n();
  const sorted = [...entries].sort((a, b) => b.path.localeCompare(a.path)); // newest (highest number) first
  return <div className="stack"><p className="muted small">{t('docs.changelog.intro', { n: sorted.length })}</p>{sorted.map((d) => <ChangelogEntry key={d.path} doc={d} compact />)}</div>;
}

// ---------- Prompt log ----------
export function PromptEntry({ doc }: { doc: DocEntry }) {
  const { t } = useI18n();
  const source = useDocSource(doc.path);
  if (source === undefined) return <p className="muted small">{t('core.common.loading')}</p>;
  const m = source.match(/^##\s+(Response|Respuesta)\b.*$/m);
  const prompt = m ? source.slice(0, m.index) : source;
  const response = m ? source.slice(m.index!) : '';
  return (
    <div className="prompt-entry">
      <section className="prompt-col"><div className="eyebrow prompt-label">{t('docs.prompts.prompt')}</div><MarkdownViewer source={prompt} path={doc.path} resolveAsset={assetUrl} resolveLink={docsRoute} /></section>
      <section className="prompt-col prompt-col-response"><div className="eyebrow prompt-label">{t('docs.prompts.response')}</div>{response ? <MarkdownViewer source={response} path={doc.path} resolveAsset={assetUrl} resolveLink={docsRoute} /> : <p className="muted small">{t('docs.prompts.noResponse')}</p>}</section>
    </div>
  );
}

export function PromptList({ entries }: { entries: DocEntry[] }) {
  const { t } = useI18n();
  const sorted = [...entries].sort((a, b) => b.path.localeCompare(a.path));
  const sources = useDocSources(sorted.map((d) => d.path));
  return (
    <div className="stack">
      <p className="muted small">{t('docs.prompts.intro', { n: sorted.length })}</p>
      {sorted.map((d) => {
        const bullets = [...(sources[d.path] ?? '').matchAll(/^- \*\*(\w+)\*\*:\s*(.+)$/gm)].map((x) => [x[1], x[2]] as const);
        return <Card key={d.path} title={<Link to={docsRoute(d.path)!}>{d.title}</Link>}><dl className="cl-grid">{bullets.map(([k, v]) => <Fragment key={k}><dt className="eyebrow">{k}</dt><dd>{withCodes(v.replace(/`/g, ''))}</dd></Fragment>)}</dl></Card>;
      })}
    </div>
  );
}

// ---------- Screenshots ----------
export function ScreenshotGallery() {
  const { t } = useI18n();
  const groups = screenshotGroups();
  return (
    <div className="stack">
      <p className="muted small">{t('docs.screenshots.intro')}</p>
      {groups.length === 0 && <Card tone="muted"><p className="muted">{t('docs.screenshots.empty')}</p></Card>}
      {groups.map((g) => (
        <Card key={g.code} title={<span className="row wrap"><code>{g.code}</code><Badge>{g.files.length}</Badge></span>}>
          <div className="shots">
            {g.files.map((f) => <figure key={f.path} className="shot"><a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt={`${g.code} ${f.name}`} loading="lazy" /></a><figcaption className="xs mono muted">{f.name}</figcaption></figure>)}
          </div>
        </Card>
      ))}
    </div>
  );
}
