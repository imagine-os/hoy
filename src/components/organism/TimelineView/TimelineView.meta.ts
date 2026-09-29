import { createElement as h, useState } from 'react';
import { defineMeta } from '../../../design/meta';
import { addDaysKey, dateKey } from '../../../i18n/format';
import { useI18n } from '../../../i18n/I18nProvider';
import { TimelineView, type TimelineZoom } from './TimelineView';

interface DemoRow { id: string; title: string; from: string; to: string | null; plan: string; status: 'active' | 'paused' | 'expired' }
const k = (n: number) => addDaysKey(dateKey(), n);
const ROWS: DemoRow[] = [
  { id: 'm1', title: 'Camila García', from: k(-40), to: k(-10), plan: 'Mensual', status: 'expired' },
  { id: 'm2', title: 'Camila García', from: k(-9), to: k(21), plan: 'Mensual', status: 'active' },
  { id: 'm3', title: 'Tomás López', from: k(-20), to: k(70), plan: 'Trimestral', status: 'active' },
  { id: 'm4', title: 'Sara Martínez', from: k(-5), to: k(25), plan: 'Mensual', status: 'paused' },
  { id: 'm5', title: 'Julián Rey', from: k(3), to: null, plan: 'Clase suelta', status: 'active' },
];
const TONE = { active: 'success', paused: 'warn', expired: 'danger' } as const;

function Demo({ zoom: z0, grouped }: { zoom: TimelineZoom; grouped: boolean }) {
  const { lang } = useI18n();
  const [zoom, setZoom] = useState<TimelineZoom>(z0);
  const [cursor, setCursor] = useState(dateKey());
  return h(TimelineView<DemoRow>, {
    rows: ROWS, zoom, onZoomChange: setZoom, cursor, onCursorChange: setCursor, lang, ariaLabel: 'Membresías',
    getDate: (r) => r.from, getEnd: (r) => r.to, getTitle: (r) => r.title, getTone: (r) => TONE[r.status], getMuted: (r) => r.status === 'expired',
    getGroup: grouped ? (r) => ({ key: r.plan, label: r.plan }) : undefined, groupLabel: 'Plan', onOpen: () => {},
  });
}

export default defineMeta({
  tier: 'organism', name: 'TimelineView',
  description: {
    es: 'Línea de tiempo genérica (0045, M-03 «Línea de tiempo»): barras de inicio a fin (un rombo cuando no hay fin) en carriles por grupo con etiquetas fijas a la izquierda; zoom día · semana · mes · trimestre, anterior / hoy / siguiente, línea de hoy, desplazamiento horizontal con imán. Las barras que se cruzan se apilan dentro del carril. Bajo 768 px un solo carril y el grupo como ficha en cada barra.',
    en: 'Generic timeline (0045, M-03 “Timeline”): bars from start to end (a diamond when there is no end) in lanes by group with sticky labels on the left; zoom day · week · month · quarter, previous / today / next, a today line, horizontal scroll with snap. Overlapping bars stack inside their lane. Below 768 px one lane and the group as a chip on each bar.',
  },
  props: [
    { name: 'rows', type: 'T[]', required: true, description: { es: 'Las filas; las que no tienen fecha no se muestran.', en: 'The rows; rows without a date are left out.' } },
    { name: 'getDate / getEnd', type: '(row) => string | null', required: true, description: { es: 'Inicio y fin (fecha o marca de tiempo); sin fin = punto.', en: 'Start and end (date or timestamp); no end = a point.' } },
    { name: 'getTitle / getTone / getMuted', type: '(row) => …', required: true, description: { es: 'Texto de la barra, tono de clase o de estado, atenuada.', en: 'Bar text, class or status tone, muted.' } },
    { name: 'getGroup · groupOrder · groupLabel', type: '(row) => { key, label } · string[] · string', description: { es: 'Carriles (profesor, sala, estado…), su orden y su nombre.', en: 'Lanes (teacher, room, status…), their order and their name.' } },
    { name: 'zoom / onZoomChange', type: "'day' | 'week' | 'month' | 'quarter'", required: true, description: { es: 'Alcance del eje (control segmentado, botones y teclas + / −).', en: 'Axis reach (segmented control, buttons and the + / − keys).' } },
    { name: 'cursor / onCursorChange', type: 'YYYY-MM-DD', required: true, description: { es: 'Un día dentro del rango mostrado.', en: 'A day inside the range shown.' } },
    { name: 'onOpen · lang · ariaLabel · selectedKey', type: '…', required: true, description: { es: 'Abrir la fila, idioma para Intl, nombre de la región, fila abierta.', en: 'Open the row, language for Intl, region name, open row.' } },
  ],
  states: ['day · week · month · quarter zoom', 'lanes by group', 'single lane (no group, or phone with group chips)', 'bar', 'point marker', 'bar cut at the range edge (dashed end)', 'stacked overlapping bars', 'today line', 'muted', 'selected', 'empty range with jump to the previous / next row'],
  usages: [
    { title: { es: 'Membresías por plan · mes', en: 'Memberships by plan · month' }, render: () => h(Demo, { zoom: 'month', grouped: true }) },
    { title: { es: 'Un carril · trimestre', en: 'One lane · quarter' }, render: () => h(Demo, { zoom: 'quarter', grouped: false }) },
  ],
  a11y: [
    { es: 'El área desplazable es enfocable: flechas ← → desplazan, + / − cambian el zoom, RePág / AvPág el periodo, T vuelve a hoy; ↑ ↓ pasan de una barra a otra.', en: 'The scroll area is focusable: ← → scroll, + / − change the zoom, Page Up / Down the period, T goes to today; ↑ ↓ move between bars.' },
    { es: 'Cada barra es un botón de 44 px cuya etiqueta dice el título y las fechas completas (también como tooltip, el texto visible se recorta).', en: 'Every bar is a 44 px button whose label says the title and the full dates (also as a tooltip; the visible text truncates).' },
    { es: 'Nada se arrastra: las barras solo abren la fila.', en: 'Nothing drags: bars only open the row.' },
  ],
  usedBy: ['M-03'],
});
