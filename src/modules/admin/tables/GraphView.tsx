import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { TABLE_GROUPS, tableRegistry, type BaseRow } from '../../../data/schema';
import { columnLabel, rowTitle, tableLabel } from '../../../data/labels';
import { getRelations, layoutGraph, neighborsOf, schemaGraph, type Point } from '../../../data/relations';
import { GRAPH_H, GRAPH_W, RelationGraph, type RelationGraphEdge, type RelationGraphNode } from '../../../components/organism/RelationGraph/RelationGraph';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Button } from '../../../components/atom/Button/Button';
import type { Def, Resolve } from './model';

const toneOf = (table: string) => TABLE_GROUPS.find((g) => g.id === tableRegistry[table]?.group)?.tone ?? 'neutral';
let fullLayout: Record<string, Point> | null = null;

export interface GraphViewProps {
  def: Def;
  counts: Record<string, number>;
  /** The row at the centre of the row-level graph (?focus=), or null for the table-level graph. */
  focus: BaseRow | null;
  resolve: Resolve;
  rowsOf: (table: string) => BaseRow[];
  onTable: (table: string) => void;
  onRow: (table: string, id: string) => void;
  onOpenRow: (id: string) => void;
  onRelated: (table: string, column: string, id: string) => void;
  onClearFocus: () => void;
}

/** Graph view: every table and its foreign keys, the current one ringed with its neighbours; or one row and its links. */
export function GraphView(p: GraphViewProps) {
  return p.focus ? <RowGraph {...p} focus={p.focus} /> : <TableGraph {...p} />;
}

function TableGraph({ def, counts, onTable }: GraphViewProps) {
  const { t, bi, lang } = useI18n();
  const [near, setNear] = useState(false);
  const g = useMemo(() => schemaGraph(), []);
  const neighbours = useMemo(() => new Set([def.name, ...neighborsOf(def.name, lang).map((n) => n.table)]), [def.name, lang]);
  const max = Math.max(1, ...Object.values(counts));
  const shown = near ? g.nodes.filter((n) => neighbours.has(n.id)) : g.nodes;
  const edges: RelationGraphEdge[] = g.edges.filter((e) => !near || (neighbours.has(e.from) && neighbours.has(e.to))).map((e) => ({ ...e, strong: e.from === def.name || e.to === def.name }));
  const positions = useMemo(() => {
    if (!near) return (fullLayout ??= layoutGraph(g.nodes.map((n) => ({ id: n.id, cluster: n.group })), g.edges, GRAPH_W, GRAPH_H));
    return layoutGraph(shown.map((n) => ({ id: n.id, cluster: n.group })), edges, GRAPH_W, GRAPH_H, { iterations: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, def.name]);
  const nodes: RelationGraphNode[] = shown.map((n) => ({
    id: n.id, label: tableLabel(n.id, lang), tone: toneOf(n.id), cluster: n.group,
    state: n.id === def.name ? 'focus' : neighbours.has(n.id) ? 'near' : 'dim',
    sublabel: neighbours.has(n.id) ? t('core.common.rows', { n: counts[n.id] ?? 0 }) : undefined,
    weight: Math.log1p(counts[n.id] ?? 0) / Math.log1p(max),
  }));
  return (
    <RelationGraph nodes={nodes} edges={edges} positions={positions} onActivate={onTable} ariaLabel={t('admin.tables.graph.aria', { table: tableLabel(def, lang) })}
      legend={TABLE_GROUPS.map((x) => ({ tone: x.tone, label: bi(x.label) }))}
      controls={<Toggle size="sm" checked={near} onChange={setNear} label={t('admin.tables.graph.neighbours')} />}
      hint={t('admin.tables.graph.hint')} />
  );
}

/** Row level: the row in the centre, the rows it points at on the right, the tables pointing at it on the left (with counts). */
function RowGraph({ def, focus, resolve, rowsOf, onRow, onOpenRow, onRelated, onClearFocus }: GraphViewProps & { focus: BaseRow }) {
  const { t, lang } = useI18n();
  const centre = `row:${def.name}:${focus.id}`;
  const { nodes, edges, positions } = useMemo(() => {
    const nodes: RelationGraphNode[] = [{ id: centre, label: rowTitle(def, focus, lang, resolve), sublabel: tableLabel(def, lang), tone: toneOf(def.name), state: 'focus' }];
    const edges: RelationGraphEdge[] = [];
    const out = def.columns.filter((c) => c.references && c.name !== 'tenant_id' && typeof focus[c.name] === 'string').map((c) => ({ c, ref: resolve(c.references!, focus[c.name] as string) })).filter((x) => !!x.ref);
    for (const { c, ref } of out) {
      const id = `row:${c.references}:${ref!.id}`;
      if (!nodes.some((n) => n.id === id)) nodes.push({ id, label: rowTitle(c.references!, ref!, lang, resolve), sublabel: columnLabel(def, c, lang), tone: toneOf(c.references!), state: 'near' });
      edges.push({ from: centre, to: id, strong: true });
    }
    const incoming = getRelations().filter((e) => e.to === def.name).map((e) => ({ e, n: rowsOf(e.from).filter((r) => r[e.column] === focus.id).length })).filter((x) => x.n > 0);
    for (const { e, n } of incoming) {
      const id = `rel:${e.from}:${e.column}`;
      nodes.push({ id, label: tableLabel(e.from, lang), sublabel: t('admin.tables.graph.relCount', { n, column: columnLabel(e.from, e.column, lang) }), tone: toneOf(e.from), state: 'near', weight: Math.min(1, Math.log1p(n) / Math.log1p(50)) });
      edges.push({ from: id, to: centre });
    }
    // radial: outgoing on the right arc, incoming on the left arc
    const positions: Record<string, Point> = { [centre]: { x: GRAPH_W / 2, y: GRAPH_H / 2 } };
    const place = (ids: string[], from: number, to: number) => ids.forEach((id, i) => {
      const a = ids.length === 1 ? (from + to) / 2 : from + ((to - from) * i) / (ids.length - 1);
      const r = (ids.length > 8 ? (i % 2 ? 0.3 : 0.43) : 0.4) * GRAPH_H;
      positions[id] = { x: GRAPH_W / 2 + Math.cos(a) * r * 1.35, y: GRAPH_H / 2 + Math.sin(a) * r };
    });
    const outIds = nodes.filter((n) => n.id !== centre && n.id.startsWith('row:')).map((n) => n.id);
    const inIds = nodes.filter((n) => n.id.startsWith('rel:')).map((n) => n.id);
    if (outIds.length === 0) place(inIds, -Math.PI / 2, Math.PI * 1.5 - (Math.PI * 2) / Math.max(1, inIds.length));
    else if (inIds.length === 0) place(outIds, -Math.PI / 2, Math.PI * 1.5 - (Math.PI * 2) / Math.max(1, outIds.length));
    else { place(outIds, -Math.PI * 0.42, Math.PI * 0.42); place(inIds, Math.PI * 0.58, Math.PI * 1.42); }
    return { nodes, edges, positions };
  }, [def, focus, lang, resolve, rowsOf, centre, t]);
  const activate = (id: string) => {
    if (id === centre) return onOpenRow(focus.id);
    const [kind, table, rest] = id.split(':');
    if (kind === 'row') onRow(table, rest);
    else onRelated(table, rest, focus.id);
  };
  return (
    <RelationGraph nodes={nodes} edges={edges} positions={positions} onActivate={activate} ariaLabel={t('admin.tables.graph.rowAria', { row: nodes[0].label })}
      controls={<Button size="sm" variant="secondary" icon="graph" onClick={onClearFocus}>{t('admin.tables.graph.allTables')}</Button>}
      hint={t('admin.tables.graph.rowHint')} />
  );
}

