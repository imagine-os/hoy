import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { MapSlot } from './MapSlot';

export default defineMeta({
  tier: 'molecule', name: 'MapSlot',
  description: {
    es: 'La ubicación del estudio, leída de `tenant.location`. Por defecto (`provider="none"`) muestra un marco de marca con la dirección y un enlace profundo a Google Maps, sin pedir red: los screenshots siguen siendo offline. Con `"osm"` incrusta OpenStreetMap sin llave y con `"google"` el embed sin llave de Google.',
    en: 'The studio’s location, read from `tenant.location`. By default (`provider="none"`) it renders a branded frame with the address line and a Google Maps deep link, with no network request, so screenshots stay offline-safe. `"osm"` embeds key-less OpenStreetMap and `"google"` embeds Google’s key-less map.',
  },
  props: [
    { name: 'provider', type: "'none' | 'osm' | 'google'", default: 'none', description: { es: 'Proveedor del mapa. `none` no hace ninguna petición.', en: 'Map provider. `none` makes no request.' } },
    { name: 'ratio', type: "'16:9' | '4:3' | '4:5' | '1:1' | '21:9'", default: '16:9', description: { es: 'Proporción del marco.', en: 'Frame aspect ratio.' } },
    { name: 'heading', type: '{ es, en } | string', description: { es: 'Cejilla sobre la dirección. Por defecto "Dónde estamos".', en: 'Eyebrow above the address. Defaults to “Where we are”.' } },
    { name: 'address', type: '{ es, en } | string', description: { es: 'Sobrescribe `tenant.location.label`.', en: 'Overrides `tenant.location.label`.' } },
    { name: 'openLabel', type: '{ es, en } | string', description: { es: 'Texto del enlace a Google Maps.', en: 'Label of the Google Maps link.' } },
  ],
  states: ['placeholder (default)', 'osm embed', 'google embed'],
  usages: [
    { title: { es: 'Placeholder (por defecto)', en: 'Placeholder (default)' }, render: () => h(MapSlot) },
    { title: { es: 'OpenStreetMap incrustado', en: 'Embedded OpenStreetMap' }, render: () => h(MapSlot, { provider: 'osm', ratio: '4:3' }) },
  ],
  a11y: [
    { es: 'El iframe lleva `title` para que el lector de pantalla lo anuncie; el placeholder es texto real, no una imagen de mapa.', en: 'The iframe carries a `title` so a screen reader announces it; the placeholder is real text, not a picture of a map.' },
    { es: 'Las coordenadas se imprimen junto al enlace, así el dato existe aunque el mapa no cargue.', en: 'The coordinates print next to the link, so the information survives a map that will not load.' },
  ],
  usedBy: ['W-06'],
});
