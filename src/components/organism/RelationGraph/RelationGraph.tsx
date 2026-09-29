import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { useT } from '../../../i18n/I18nProvider';
import type { Tone } from '../../../design/tokens';
import { layoutGraph, type Point } from '../../../data/relations';
import { Button } from '../../atom/Button/Button';
import './RelationGraph.css';

export type GraphTone = Tone | 'primary' | 'accent' | 'warn' | 'neutral';

export interface RelationGraphNode {
  id: string;
  label: string;
  /** Second line under the label (the table of a row, a row count). */
  sublabel?: string;
  tone?: GraphTone;
  /** focus = the centre of attention (bigger, ringed) · near = its neighbours (labelled) · dim = everything else (label on hover / focus). */
  state?: 'focus' | 'near' | 'dim';
  /** 0–1: grows the dot (a row count, a degree). */
  weight?: number;
  /** Groups nodes for the default layout (nodes of one cluster start on the same arc). */
  cluster?: string;
}
export interface RelationGraphEdge { from: string; to: string; label?: string; strong?: boolean }

export interface RelationGraphProps {
  nodes: RelationGraphNode[];
  edges: RelationGraphEdge[];
  /** Positions in the virtual 1000 × 640 space. Omit to use the deterministic force layout (layoutGraph). */
  positions?: Record<string, Point>;
  onActivate?: (id: string) => void;
  /** Names the graph for assistive tech ("Relaciones entre tablas"). */
  ariaLabel: string;
  legend?: { tone: GraphTone; label: string }[];
  /** Extra controls rendered beside zoom (a "neighbours only" toggle). */
  controls?: ReactNode;
  /** Text shown under the controls: how to use the keyboard. Defaults to core.graph.hint. */
  hint?: string;
}

export const GRAPH_W = 1000;
export const GRAPH_H = 640;
const MIN_Z = 0.4, MAX_Z = 4;

/**
 * An SVG relationship graph (0043, M-03). Nodes are focusable (Tab), Enter / Space activates one; the canvas pans
 * with a drag or the arrow keys and zooms with the buttons or + / − / 0 — nothing is pointer-only. Coordinates are
 * real CSS pixels of the box (the viewBox follows the element's size), so labels are set in rem and stay legible
 * on a 4K TV through the --ui band. Colours come from the D-01 class tones and semantic tokens only.
 */
export function RelationGraph({ nodes, edges, positions, onActivate, ariaLabel, legend, controls, hint }: RelationGraphProps) {
  const t = useT();
  const uid = useId().replace(/:/g, '');
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 960, h: 600 });
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const [hot, setHot] = useState<string | null>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const [ui, setUi] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const read = () => { const r = el.getBoundingClientRect(); if (r.width > 0) setSize({ w: Math.round(r.width), h: Math.round(r.height) }); setUi((parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16); };
    read();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(read) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const nodeKey = nodes.map((n) => n.id).join('|');
  const edgeKey = edges.map((e) => `${e.from}>${e.to}`).join('|');
  const layout = useMemo(
    () => positions ?? layoutGraph(nodes.map((n) => ({ id: n.id, cluster: n.cluster })), edges, GRAPH_W, GRAPH_H),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positions, nodeKey, edgeKey],
  );
  const sx = size.w / GRAPH_W, sy = size.h / GRAPH_H;
  const at = (id: string) => { const p = layout[id]; return p ? { x: p.x * sx, y: p.y * sy } : null; };
  const radius = (n: RelationGraphNode) => ui * ((n.state === 'focus' ? 16 : n.state === 'near' ? 11 : 8) + (n.weight ?? 0) * 8);
  const neighbours = useMemo(() => {
    if (!hot) return null;
    const s = new Set([hot]);
    for (const e of edges) { if (e.from === hot) s.add(e.to); if (e.to === hot) s.add(e.from); }
    return s;
  }, [hot, edges]);

  const zoom = (f: number) => setView((v) => {
    const z = Math.min(MAX_Z, Math.max(MIN_Z, v.z * f));
    const cx = size.w / 2, cy = size.h / 2;
    return { z, x: cx - ((cx - v.x) / v.z) * z, y: cy - ((cy - v.y) / v.z) * z };
  });
  const reset = () => setView({ z: 1, x: 0, y: 0 });
  const pan = (dx: number, dy: number) => setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));

  const onKey = (e: KeyboardEvent) => {
    const step = 48 * ui;
    const k = e.key;
    if (k === '+' || k === '=') { e.preventDefault(); zoom(1.25); }
    else if (k === '-' || k === '_') { e.preventDefault(); zoom(0.8); }
    else if (k === '0') { e.preventDefault(); reset(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); pan(step, 0); }
    else if (k === 'ArrowRight') { e.preventDefault(); pan(-step, 0); }
    else if (k === 'ArrowUp') { e.preventDefault(); pan(0, step); }
    else if (k === 'ArrowDown') { e.preventDefault(); pan(0, -step); }
  };
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest('.rgraph-node')) return;
    drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y, moved: false };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setView((v) => ({ ...v, x: d.x + dx, y: d.y + dy }));
  };
  const onUp = () => { drag.current = null; };

  const lit = (id: string) => (neighbours ? neighbours.has(id) : true);
  return (
    <div className="rgraph">
      <div className="rgraph-bar">
        <div className="row rgraph-zoom" role="group" aria-label={t('core.graph.zoom')}>
          <Button variant="secondary" size="sm" icon="zoom-in" className="ctl-round rgraph-iconbtn" onClick={() => zoom(1.25)} aria-label={t('core.graph.zoomIn')} title={t('core.graph.zoomIn')}>{null}</Button>
          <Button variant="secondary" size="sm" icon="zoom-out" className="ctl-round rgraph-iconbtn" onClick={() => zoom(0.8)} aria-label={t('core.graph.zoomOut')} title={t('core.graph.zoomOut')}>{null}</Button>
          <Button variant="secondary" size="sm" icon="locate" className="ctl-round rgraph-iconbtn" onClick={reset} aria-label={t('core.graph.reset')} title={t('core.graph.reset')}>{null}</Button>
        </div>
        {controls}
        <p className="small muted rgraph-hint">{hint ?? t('core.graph.hint')}</p>
      </div>
      <div ref={box} className="rgraph-canvas" tabIndex={0} role="group" aria-label={ariaLabel} onKeyDown={onKey}>
        <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 0.9); } }}>
          <defs>
            <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="rgraph-arrow" /></marker>
            <marker id={`${uid}-arrow-strong`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="rgraph-arrow is-strong" /></marker>
          </defs>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`}>
            <g className="rgraph-edges">
              {edges.map((e, i) => {
                const a = at(e.from), b = at(e.to);
                if (!a || !b) return null;
                const nb = nodes.find((n) => n.id === e.to);
                const r = nb ? radius(nb) + 3 * ui : 0;
                const d = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
                const ex = b.x - ((b.x - a.x) / d) * r, ey = b.y - ((b.y - a.y) / d) * r;
                const strong = e.strong || (!!hot && (e.from === hot || e.to === hot));
                const faded = !!neighbours && !strong;
                return <line key={`${e.from}-${e.to}-${i}`} x1={a.x} y1={a.y} x2={ex} y2={ey} className={`rgraph-edge ${strong ? 'is-strong' : ''} ${faded ? 'is-faded' : ''}`} markerEnd={`url(#${uid}-arrow${strong ? '-strong' : ''})`} />;
              })}
            </g>
            <g className="rgraph-nodes">
              {nodes.map((n) => {
                const p = at(n.id);
                if (!p) return null;
                const r = radius(n);
                const showLabel = n.state !== 'dim' || hot === n.id || (neighbours?.has(n.id) ?? false);
                return (
                  <g key={n.id} transform={`translate(${p.x} ${p.y})`} className={`rgraph-node rgraph-tone-${n.tone ?? 'neutral'} is-${n.state ?? 'near'} ${lit(n.id) ? '' : 'is-faded'} ${hot === n.id ? 'is-hot' : ''}`}
                    tabIndex={0} role="button" aria-label={n.sublabel ? `${n.label} · ${n.sublabel}` : n.label}
                    onClick={() => { if (!drag.current?.moved) onActivate?.(n.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onActivate?.(n.id); } }}
                    onPointerEnter={() => setHot(n.id)} onPointerLeave={() => setHot((h) => (h === n.id ? null : h))}
                    onFocus={() => setHot(n.id)} onBlur={() => setHot((h) => (h === n.id ? null : h))}>
                    <circle r={r + 8 * ui} className="rgraph-hit" />
                    {n.state === 'focus' && <circle r={r + 5 * ui} className="rgraph-ring" />}
                    <circle r={r} className="rgraph-dot" />
                    {showLabel && (
                      <text y={r + 14 * ui} className="rgraph-label" textAnchor="middle">
                        {n.label}
                        {n.sublabel && <tspan x={0} dy="1.25em" className="rgraph-sublabel">{n.sublabel}</tspan>}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </div>
      {legend && legend.length > 0 && (
        <ul className="rgraph-legend" aria-label={t('core.graph.legend')}>
          {legend.map((l) => <li key={`${l.tone}-${l.label}`} className="rgraph-legend-item"><span className={`rgraph-swatch rgraph-tone-${l.tone}`} aria-hidden />{l.label}</li>)}
        </ul>
      )}
    </div>
  );
}
