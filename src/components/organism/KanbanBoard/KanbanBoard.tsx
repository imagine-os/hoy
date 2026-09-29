import { useMemo, useState, type ReactNode } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useT } from '../../../i18n/I18nProvider';
import { Badge, type BadgeTone } from '../../atom/Badge/Badge';
import { Button } from '../../atom/Button/Button';
import { Icon } from '../../atom/Icon/Icon';
import { Select } from '../../atom/Input/Input';
import './KanbanBoard.css';

export interface KanbanColumn { id: string; label: string; tone?: BadgeTone }
export interface KanbanCard {
  id: string;
  column: string;
  title: ReactNode;
  /** Lines under the title (field: value). */
  meta?: ReactNode;
  /** Plain-text name of the card for the move menu and the drag handle's label. */
  name: string;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  /** Called when a card lands in another column — by drag or by the "Move to…" menu. Omit for a read-only board. */
  onMove?: (cardId: string, toColumn: string) => void;
  onOpen?: (cardId: string) => void;
  ariaLabel: string;
  /** Cards shown per column before "Show more". */
  pageSize?: number;
}

/**
 * A board of cards in columns (0043, M-03 "Tablero"). Cards move by dragging the grip (pointer, touch or keyboard
 * through dnd-kit) AND through a "Move to…" menu on every card, so nothing is drag-only. Column headers show counts;
 * on phones the columns scroll horizontally with snap.
 */
export function KanbanBoard({ columns, cards, onMove, onOpen, ariaLabel, pageSize = 30 }: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const byColumn = useMemo(() => {
    const m = new Map<string, KanbanCard[]>(columns.map((c) => [c.id, []]));
    for (const card of cards) m.get(card.column)?.push(card);
    return m;
  }, [columns, cards]);
  const onDragEnd = (e: DragEndEvent) => {
    const to = e.over?.id ? String(e.over.id) : null;
    const card = cards.find((c) => c.id === String(e.active.id));
    if (to && card && card.column !== to) onMove?.(card.id, to);
  };
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="kanban" role="group" aria-label={ariaLabel}>
        {columns.map((col) => <Lane key={col.id} col={col} cards={byColumn.get(col.id) ?? []} columns={columns} onMove={onMove} onOpen={onOpen} pageSize={pageSize} />)}
      </div>
    </DndContext>
  );
}

function Lane({ col, cards, columns, onMove, onOpen, pageSize }: { col: KanbanColumn; cards: KanbanCard[]; columns: KanbanColumn[]; onMove?: KanbanBoardProps['onMove']; onOpen?: KanbanBoardProps['onOpen']; pageSize: number }) {
  const t = useT();
  const [limit, setLimit] = useState(pageSize);
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const headId = `kanban-${col.id}`;
  return (
    <section ref={setNodeRef} className={`kanban-lane ${isOver ? 'is-over' : ''}`} aria-labelledby={headId}>
      <header className="kanban-head">
        <h3 id={headId} className="kanban-title"><Badge tone={col.tone}>{col.label}</Badge></h3>
        <span className="kanban-count">{cards.length}</span>
      </header>
      <ul className="kanban-cards">
        {cards.length === 0 && <li className="kanban-empty small muted">{t('core.kanban.empty')}</li>}
        {cards.slice(0, limit).map((card) => <Card key={card.id} card={card} columns={columns} onMove={onMove} onOpen={onOpen} />)}
      </ul>
      {cards.length > limit && <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + pageSize)}>{t('core.kanban.more', { n: Math.min(pageSize, cards.length - limit) })}</Button>}
    </section>
  );
}

function Card({ card, columns, onMove, onOpen }: { card: KanbanCard; columns: KanbanColumn[]; onMove?: KanbanBoardProps['onMove']; onOpen?: KanbanBoardProps['onOpen'] }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id, disabled: !onMove });
  return (
    <li ref={setNodeRef} className={`kanban-card ${isDragging ? 'is-dragging' : ''}`} style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}>
      <div className="kanban-cardhead">
        {onOpen ? <button type="button" className="kanban-open" onClick={() => onOpen(card.id)}>{card.title}</button> : <span className="kanban-open">{card.title}</span>}
        {onMove && <button type="button" className="kanban-grip ctl-round" aria-label={t('core.kanban.drag', { name: card.name })} title={t('core.kanban.drag', { name: card.name })} {...attributes} {...listeners}><Icon name="grip" size="sm" /></button>}
      </div>
      {card.meta && <div className="kanban-meta small">{card.meta}</div>}
      {onMove && (
        <Select className="kanban-move" aria-label={t('core.kanban.moveTo', { name: card.name })} value="" onChange={(e) => { if (e.target.value) onMove(card.id, e.target.value); }}>
          <option value="">{t('core.kanban.moveShort')}</option>
          {columns.filter((c) => c.id !== card.column).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
      )}
    </li>
  );
}
