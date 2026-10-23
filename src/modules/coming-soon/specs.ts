import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';

export const comingSoonSpec = defineSpec({
  code: 'W-11',
  name: { es: 'Próximamente', en: 'Coming soon' },
  purpose: { es: 'La página de preapertura, separada del sitio completo y accesible desde su propia tarjeta en el hub.', en: 'A standalone pre-launch page, separate from the full website and accessible from its own hub card.' },
  layout: ['Landing'], data: [], roles: EVERYONE, integrations: [],
  logic: [
    'Public root and /coming-soon share the pre-launch page until 2026-10-30 in the tenant timezone, then replace the current history entry with /site. Open tabs recheck every second and on focus/visibility changes. /hub remains the separate testing hub.',
    'Uses the existing brand wordmark, tenant identity, approved brand tagline and static studio photograph.',
    'Top-right Login opens a Coming Soon dialog with Close, Escape, Back and focus restoration; no credentials, Clerk setup or authentication action.',
    'The only external link opens the existing studio Instagram profile; no visitor data is collected or submitted.',
    'Spanish and English share the normal language switch; the full website and its Latest default remain unchanged.',
  ],
  states: ['Spanish', 'English', 'login dialog before launch', 'static photograph', 'launch redirect', 'already-open tab crossing launch'],
  checkedAt: [344, 390, 768, 1280],
});
