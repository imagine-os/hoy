import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useI18n } from '../../i18n/I18nProvider';
import { canvasSpecs } from '../../specs/canvasSpecs';
import type { PageSpec } from '../../specs/types';
import { getRoutes } from '../../app/registry';
import { useLayout } from '../../layout/useLayout';
import { Select } from '../../components/atom/Input/Input';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Card } from '../../components/molecule/Card/Card';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import './dev.css';

/** Pages known to render through useLayout. Add yours here when you wire it. */
const WIRED = new Set(['C-01', 'W-01']);

function allSpecs(): PageSpec[] {
  const m = new Map<string, PageSpec>(Object.entries(canvasSpecs));
  for (const r of getRoutes()) m.set(r.spec.code, r.spec);
  return [...m.values()].filter((s) => s.layout.length > 0).sort((a, b) => a.code.localeCompare(b.code));
}

export function LayoutEditorPage() {
  const { pageCode = 'C-01' } = useParams();
  const nav = useNavigate();
  const { t, bi } = useI18n();
  const specs = allSpecs();
  const spec = specs.find((s) => s.code === decodeURIComponent(pageCode)) ?? specs[0];
  const route = getRoutes().find((r) => r.spec.code === spec.code && !r.path.includes(':'));
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{t('dev.layout.title')}</h1><p className="muted small">{t('dev.layout.body', { code: spec.code })}</p></div>
        <div className="row wrap">
          <Select value={spec.code} onChange={(e) => nav(`/dev/layout/${encodeURIComponent(e.target.value)}`)} aria-label={t('dev.layout.pick')} style={{ width: 320 }}>
            {specs.map((s) => <option key={s.code} value={s.code}>{s.code} · {bi(s.name)}</option>)}
          </Select>
          {route && <Link to={route.path}><Button variant="secondary" size="sm">{t('dev.layout.preview')}</Button></Link>}
        </div>
      </div>
      <Editor key={spec.code} spec={spec} wired={WIRED.has(spec.code)} />
    </div>
  );
}

function Editor({ spec, wired }: { spec: PageSpec; wired: boolean }) {
  const { t } = useI18n();
  const { sections, hidden, save, reset, isCustom } = useLayout(spec);
  const [items, setItems] = useState(sections);
  useEffect(() => setItems(sections), [sections]);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(items, items.indexOf(String(active.id)), items.indexOf(String(over.id)));
    setItems(next);
    save(next);
  };
  const toggleHidden = (name: string, visible: boolean) => {
    const h = new Set(hidden); if (visible) h.delete(name); else h.add(name);
    save(items, [...h]);
  };
  return (
    <div className="grid grid-2 le-grid">
      <Card padding="sm">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ol className="le-list">{items.map((name, i) => <SortableRow key={name} id={name} index={i} hidden={hidden.has(name)} onToggle={(v) => toggleHidden(name, v)} />)}</ol>
          </SortableContext>
        </DndContext>
      </Card>
      <div className="stack-sm">
        <Card className="stack-sm">
          <div className="row wrap"><Badge tone={isCustom ? 'primary' : 'neutral'}>{isCustom ? t('dev.layout.custom') : t('dev.layout.default')}</Badge><Badge tone={wired ? 'success' : 'warn'}>{wired ? t('dev.layout.wired') : t('dev.layout.notWired')}</Badge></div>
          <p className="small muted">{spec.code} · {spec.layout.length} {t('core.nav.layout').toLowerCase()}</p>
          <div><Button variant="secondary" size="sm" onClick={reset} disabled={!isCustom}>{t('dev.layout.reset')}</Button></div>
        </Card>
        <Card tone="muted"><pre className="xs" style={{ margin: 0, background: 'none', padding: 0 }}>{`const { sections, isVisible } = useLayout(canvasSpecs['${spec.code}']);\n{sections.filter(isVisible).map(name => SECTIONS[name]?.())}`}</pre></Card>
      </div>
    </div>
  );
}

function SortableRow({ id, index, hidden, onToggle }: { id: string; index: number; hidden: boolean; onToggle: (visible: boolean) => void }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`le-row ${isDragging ? 'is-dragging' : ''} ${hidden ? 'is-hidden' : ''}`}>
      <button type="button" className="le-handle" {...attributes} {...listeners} aria-label="Drag">⋮⋮</button>
      <span className="le-index mono xs muted">{String(index + 1).padStart(2, '0')}</span>
      <span className="grow le-name">{id}</span>
      <Toggle size="sm" checked={!hidden} onChange={onToggle} label={hidden ? t('dev.layout.hidden') : t('dev.layout.visible')} />
    </li>
  );
}
