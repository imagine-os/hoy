import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { KanbanBoard, type KanbanCard } from './KanbanBoard';

function Demo() {
  const [cards, setCards] = useState<KanbanCard[]>([
    { id: 'b1', column: 'booked', title: 'Camila García', name: 'Camila García', meta: 'Hot Vinyasa · 06:30' },
    { id: 'b2', column: 'booked', title: 'Tomás López', name: 'Tomás López', meta: 'Pilates · 08:00' },
    { id: 'b3', column: 'checked_in', title: 'Sara Martínez', name: 'Sara Martínez', meta: 'Barre · 08:00' },
  ]);
  return h(KanbanBoard, {
    ariaLabel: 'Reservas por estado', cards, onOpen: () => {},
    onMove: (id: string, to: string) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, column: to } : c))),
    columns: [{ id: 'booked', label: 'Reservada', tone: 'primary' }, { id: 'checked_in', label: 'Llegó', tone: 'success' }, { id: 'no_show', label: 'No vino', tone: 'danger' }],
  });
}

export default defineMeta({
  tier: 'organism', name: 'KanbanBoard',
  description: { es: 'Tablero de tarjetas por columnas (0043, M-03): arrastrar desde el asa o mover con el menú “Mover a…”; conteo por columna; desplazamiento horizontal con imán en teléfonos.', en: 'Board of cards in columns (0043, M-03): drag from the grip or move with the “Move to…” menu; count per column; horizontal scroll with snap on phones.' },
  props: [
    { name: 'columns', type: '{ id, label, tone? }[]', required: true, description: { es: 'Columnas en orden (un valor de enum o booleano).', en: 'Columns in order (an enum or boolean value).' } },
    { name: 'cards', type: '{ id, column, title, name, meta? }[]', required: true, description: { es: 'Tarjetas; name es el texto para el menú y el asa.', en: 'Cards; name is the text for the menu and the grip.' } },
    { name: 'onMove', type: '(cardId, toColumn) => void', description: { es: 'Sin él, el tablero es de solo lectura.', en: 'Without it the board is read-only.' } },
    { name: 'onOpen', type: '(cardId) => void', description: { es: 'Abrir la tarjeta (el título es un botón).', en: 'Open the card (the title is a button).' } },
    { name: 'pageSize', type: 'number', default: '30', description: { es: 'Tarjetas por columna antes de “Mostrar más”.', en: 'Cards per column before “Show more”.' } },
  ],
  states: ['default', 'dragging', 'column drop target', 'empty column', 'more cards', 'read-only'],
  usages: [{ title: { es: 'Reservas por estado', en: 'Bookings by status' }, render: () => h(Demo) }],
  a11y: [
    { es: 'Cada tarjeta tiene un menú “Mover a…” (select nativo) además del asa de arrastre; el asa también se mueve con teclado (Espacio, flechas).', en: 'Every card has a “Move to…” menu (native select) besides the drag grip; the grip also moves with the keyboard (Space, arrows).' },
    { es: 'Cada columna es una sección con su encabezado; el título de la tarjeta es un botón de 44 px.', en: 'Each column is a section with its heading; the card title is a 44 px button.' },
  ],
  usedBy: ['M-03'],
});
