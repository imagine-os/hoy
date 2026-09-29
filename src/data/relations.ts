/**
 * 0043 — the relation graph of the data model, derived from `ColumnDef.references` (every foreign key points at `id`).
 * Used by the table manager (M-03): FK chips, the "Related" section of the row drawer, and the graph view.
 * `tenant_id → tenants` is on every table, so it is left out of the graph (it would connect everything to one node).
 * Pure data + functions, no React.
 */
import type { Lang } from '../i18n/types';
import { tables, tableRegistry, type TableGroup, type TableKind } from './schema';
import { columnLabel, tableLabel } from './labels';

export interface RelationEdge { from: string; column: string; to: string }

let cache: RelationEdge[] | null = null;
/** Every foreign key except the tenant one: `from.column → to.id`. */
export function getRelations(): RelationEdge[] {
  if (cache) return cache;
  cache = [];
  for (const t of tables) for (const c of t.columns) if (c.references && c.name !== 'tenant_id') cache.push({ from: t.name, column: c.name, to: c.references });
  return cache;
}

export interface Neighbor extends RelationEdge {
  direction: 'out' | 'in';
  /** The other table. */
  table: string;
  /** Human name of the relation in the current language: out = the column label, in = "Bookings · User". */
  label: string;
}

/** Outgoing (this table points at) and incoming (other tables point here) relations, with human names. */
export function neighborsOf(table: string, lang: Lang): Neighbor[] {
  const out: Neighbor[] = [];
  for (const e of getRelations()) {
    if (e.from === table) out.push({ ...e, direction: 'out', table: e.to, label: columnLabel(e.from, e.column, lang) });
    if (e.to === table) out.push({ ...e, direction: 'in', table: e.from, label: reverseName(e, lang) });
  }
  return out;
}

/** The auto-derived reverse name of a relation, read from the target's side: users ← bookings.user_id = "Reservas · Usuario". */
export function reverseName(e: RelationEdge, lang: Lang): string {
  return `${tableLabel(e.from, lang)} · ${columnLabel(e.from, e.column, lang)}`;
}

export interface GraphNode { id: string; group: TableGroup; kind?: TableKind; rows?: number }
export interface GraphEdge { from: string; to: string; label?: string }

/** Tables as nodes (with group, kind and an optional row count) and FK edges, merged per table pair. */
export function schemaGraph(rowCount?: (table: string) => number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = tables.map((t) => ({ id: t.name, group: t.group, kind: t.kind, rows: rowCount?.(t.name) }));
  const seen = new Map<string, GraphEdge>();
  for (const e of getRelations()) {
    if (e.from === e.to) continue;
    const k = `${e.from}>${e.to}`;
    if (!seen.has(k)) seen.set(k, { from: e.from, to: e.to, label: e.column });
  }
  return { nodes, edges: [...seen.values()] };
}

export interface Point { x: number; y: number }

/** Small seeded PRNG (mulberry32) so the layout is identical on every render and every machine. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * A deterministic, cluster-anchored force-directed layout (no dependency). Each cluster (the table group) gets an
 * anchor on an ellipse and its nodes start on rings around it (busiest first, in the middle). A short force pass then
 * relaxes the picture: nodes closer than a label's width push apart, edges pull gently (weakened for hubs such as
 * `users`, so one busy table does not collapse the picture) and a spring holds each node near its anchor, so colours
 * read as regions. Positions fit `width × height` with a margin; the same input always gives the same output.
 */
export function layoutGraph(nodes: { id: string; cluster?: string }[], edges: { from: string; to: string }[], width: number, height: number, opts: { iterations?: number; seed?: number } = {}): Record<string, Point> {
  const n = nodes.length;
  const out: Record<string, Point> = {};
  if (n === 0) return out;
  if (n === 1) { out[nodes[0].id] = { x: width / 2, y: height / 2 }; return out; }
  const rand = prng(opts.seed ?? hash(nodes.map((x) => x.id).join('|')));
  const ids = nodes.map((x) => x.id);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const valid = edges.map((e) => [idx.get(e.from), idx.get(e.to)] as const).filter((e): e is readonly [number, number] => e[0] != null && e[1] != null && e[0] !== e[1]);
  const deg = new Float64Array(n);
  for (const [a, b] of valid) { deg[a]++; deg[b]++; }
  const clusters = [...new Set(nodes.map((x) => x.cluster ?? ''))];
  const cx = width / 2, cy = height / 2;
  const unit = Math.min(width, height);
  const ring = unit * (clusters.length > 1 ? 0.075 : 0.12);
  const xs = new Float64Array(n), ys = new Float64Array(n), ax = new Float64Array(n), ay = new Float64Array(n);
  clusters.forEach((c, ci) => {
    const a = (ci / clusters.length) * Math.PI * 2 - Math.PI / 2;
    const px = clusters.length === 1 ? cx : cx + Math.cos(a) * width * 0.4;
    const py = clusters.length === 1 ? cy : cy + Math.sin(a) * height * 0.4;
    const members = nodes.map((x, i) => ({ x, i })).filter(({ x }) => (x.cluster ?? '') === c).sort((p, q) => deg[q.i] - deg[p.i] || p.x.id.localeCompare(q.x.id));
    let slot = 0, level = 0, cap = 1;
    for (const { i } of members) {
      if (slot >= cap) { level++; slot = 0; cap = 6 * level; }
      const ang = level === 0 ? 0 : (slot / cap) * Math.PI * 2 + level * 0.5;
      xs[i] = px + Math.cos(ang) * ring * level; ys[i] = py + Math.sin(ang) * ring * level;
      ax[i] = px; ay[i] = py; slot++;
    }
  });
  const minD = unit * 0.07;
  const iterations = opts.iterations ?? 160;
  let temp = unit * 0.02;
  const dx = new Float64Array(n), dy = new Float64Array(n);
  for (let it = 0; it < iterations; it++) {
    dx.fill(0); dy.fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = xs[i] - xs[j], ddy = ys[i] - ys[j];
        let d = Math.hypot(ddx, ddy);
        if (d < 0.01) { ddx = rand() - 0.5; ddy = rand() - 0.5; d = 0.5; }
        if (d > minD * 2) continue;
        const f = (minD * 2 - d) / d * 0.5;
        dx[i] += ddx * f; dy[i] += ddy * f; dx[j] -= ddx * f; dy[j] -= ddy * f;
      }
    }
    for (const [a, b] of valid) {
      const ddx = xs[a] - xs[b], ddy = ys[a] - ys[b];
      const w = 0.02 / Math.max(deg[a], deg[b]);
      dx[a] -= ddx * w; dy[a] -= ddy * w; dx[b] += ddx * w; dy[b] += ddy * w;
    }
    for (let i = 0; i < n; i++) {
      dx[i] += (ax[i] - xs[i]) * 0.04; dy[i] += (ay[i] - ys[i]) * 0.04;
      const len = Math.hypot(dx[i], dy[i]);
      if (len < 0.001) continue;
      const step = Math.min(len, temp);
      xs[i] += (dx[i] / len) * step; ys[i] += (dy[i] / len) * step;
    }
    temp = Math.max(0.5, temp * 0.98);
  }
  const m = unit * 0.09;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) { minX = Math.min(minX, xs[i]); maxX = Math.max(maxX, xs[i]); minY = Math.min(minY, ys[i]); maxY = Math.max(maxY, ys[i]); }
  const sx = (width - 2 * m) / Math.max(1, maxX - minX), sy = (height - 2 * m) / Math.max(1, maxY - minY);
  const kx = Math.min(sx, 3), ky = Math.min(sy, 3);
  const ox = (width - (maxX - minX) * kx) / 2, oy = (height - (maxY - minY) * ky) / 2;
  for (let i = 0; i < n; i++) out[ids[i]] = { x: ox + (xs[i] - minX) * kx, y: oy + (ys[i] - minY) * ky };
  return out;
}

/** True when a table has a column the calendar / timeline views could place rows by. */
export function dateColumnOf(table: string): string | null {
  const def = tableRegistry[table];
  const c = def?.columns.find((x) => x.type === 'timestamptz' || x.type === 'date');
  return c?.name ?? null;
}
