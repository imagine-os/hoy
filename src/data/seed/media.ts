/**
 * M-02d — the media library, seeded as a checklist of the art the studio still owes.
 *
 * One row per known slot in the app and the site. `status: 'pending'` means the component renders a
 * branded empty slot (MediaPlaceholder) with the ratio and the brief; pasting a `url` and flipping
 * `status` to 'ready' makes the real image appear everywhere that slot is used, with no deploy.
 *
 * `slot_key` is the contract between this table and the components, so keep the keys stable.
 */
import type { MediaAssetRow } from '../schema';
import { base } from './catalog';

interface Slot {
  key: string;
  kind: MediaAssetRow['kind'];
  ratio: string;
  movement?: MediaAssetRow['movement'];
  label: { es: string; en: string };
  alt: { es: string; en: string };
  brief: { es: string; en: string };
}

const SLOTS: Slot[] = [
  {
    key: 'class.hero', kind: 'photo', ratio: '16 / 9', movement: 'arde',
    label: { es: 'Clase · foto principal', en: 'Class · hero photo' },
    alt: { es: 'Sala en clase, vista amplia', en: 'The room mid-class, wide view' },
    brief: { es: 'Sala llena en plena clase, cámara a la altura del mat, luz natural lateral. Sin caras reconocibles en primer plano; con autorización de imagen firmada de quienes aparezcan.', en: 'Full room mid-class, camera at mat height, natural side light. No recognisable faces in the foreground; signed image releases from anyone visible.' },
  },
  {
    key: 'teacher.portrait', kind: 'photo', ratio: '4 / 3', movement: 'enraiza',
    label: { es: 'Profesor · retrato', en: 'Teacher · portrait' },
    alt: { es: 'Retrato del profesor', en: 'Portrait of the teacher' },
    brief: { es: 'Retrato de medio cuerpo sobre fondo arena, mirada a cámara, ropa de práctica propia. Mismo encuadre y misma luz para los ocho profesores.', en: 'Half-body portrait on a sand background, looking at camera, their own practice clothes. Same framing and same light for all eight teachers.' },
  },
  {
    key: 'event.cover', kind: 'photo', ratio: '4 / 5', movement: 'libera',
    label: { es: 'Evento · portada', en: 'Event · cover' },
    alt: { es: 'Portada del evento', en: 'Event cover' },
    brief: { es: 'Vertical, para la tarjeta de evento en la app. Detalle del ritual del evento (cuencos, velas, mats en círculo) más que retratos.', en: 'Vertical, for the event card in the app. A detail of the event ritual (bowls, candles, mats in a circle) rather than portraits.' },
  },
  {
    key: 'studio.tour', kind: 'video', ratio: '16 / 9', movement: 'fluye',
    label: { es: 'Reglas del club · video del recorrido', en: 'Club rules · studio-tour video' },
    alt: { es: 'Recorrido por el estudio', en: 'Tour of the studio' },
    brief: { es: '60–90 s, sin voz en off: entrada, recepción, vestieres, casilleros, sala. Subtítulos ES/EN quemados. Mismo recorrido que hace recepción el primer día.', en: '60–90 s, no voice-over: entrance, front desk, changing rooms, lockers, the room. Burned-in ES/EN subtitles. The same walk the front desk does on day one.' },
  },
  {
    key: 'site.hero', kind: 'photo', ratio: '21 / 9', movement: 'fluye',
    label: { es: 'Web · hero principal', en: 'Website · main hero' },
    alt: { es: 'La sala vacía con luz de mañana', en: 'The empty room in morning light' },
    brief: { es: 'Panorámica de la sala vacía con luz de las 6:30 a.m. Formato ultra ancho, sin texto quemado: el titular va encima en código.', en: 'Panorama of the empty room in 6:30 a.m. light. Ultra-wide, no burned-in text: the headline sits on top in code.' },
  },
  {
    key: 'site.about', kind: 'photo', ratio: '4 / 3', movement: 'enraiza',
    label: { es: 'Web · sobre nosotros', en: 'Website · about' },
    alt: { es: 'Detalle del espacio', en: 'Detail of the space' },
    brief: { es: 'Detalle material del espacio: madera, cal, mats apilados, una planta. Nada de personas; acompaña el manifiesto.', en: 'A material detail of the space: wood, lime, stacked mats, a plant. No people; it accompanies the manifesto.' },
  },
  {
    key: 'site.contact.map', kind: 'illustration', ratio: '16 / 9', movement: 'libera',
    label: { es: 'Web · mapa de contacto', en: 'Website · contact map' },
    alt: { es: 'Mapa de la ubicación del estudio', en: 'Map of the studio location' },
    brief: { es: 'Mientras no haya proveedor de mapas: ilustración del barrio con la cuadra marcada y las dos referencias que la gente usa para llegar. Exportar a 2x.', en: 'Until there is a map provider: an illustration of the neighbourhood with the block marked and the two landmarks people actually navigate by. Export at 2x.' },
  },
];

export const mediaAssets: MediaAssetRow[] = SLOTS.map((s, i) => ({
  ...base(`med_${s.key.replace(/\./g, '_')}`, 20),
  slot_key: s.key,
  kind: s.kind,
  ratio: s.ratio,
  label: s.label,
  alt: s.alt,
  brief: s.brief,
  movement: s.movement ?? null,
  url: null,
  credit: null,
  status: 'pending',
  sort: (i + 1) * 10,
} as MediaAssetRow));
