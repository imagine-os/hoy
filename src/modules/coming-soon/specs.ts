import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';

export const comingSoonSpec = defineSpec({
  code: 'W-11',
  name: { es: 'Próximamente', en: 'Coming soon' },
  purpose: { es: 'La página de preapertura, separada del sitio completo y accesible desde su propia tarjeta en el hub.', en: 'A standalone pre-launch page, separate from the full website and accessible from its own hub card.' },
  layout: ['Landing'], data: [], roles: EVERYONE, integrations: [],
  logic: [
    'Independent /coming-soon route: no SiteShell, edition selector, booking, launch date or lead collection.',
    'Uses the existing brand wordmark, tenant identity, approved brand tagline and concept sanctuary artwork.',
    'AmbientScene reuses the existing local loop with a still fallback, reduced-motion/save-data support and an explicit pause control.',
    'The only external link opens the existing studio Instagram profile; no visitor data is collected or submitted.',
    'Spanish and English share the normal language switch; the full website and its Latest default remain unchanged.',
  ],
  states: ['Spanish', 'English', 'motion playing', 'motion paused', 'reduced motion', 'video unavailable'],
  checkedAt: [],
});
