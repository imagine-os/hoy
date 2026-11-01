import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';
import type { ActionDef } from '../../actions/types';

/** The card families the hub lays out, in document order. Also the `surface` enum of `hub.enterAs`. */
export const HUB_SURFACES = ['promotions', 'app', 'site', 'coming-soon', 'teacher', 'desk', 'inbox', 'pos', 'admin', 'crm', 'messages', 'finance', 'marketing', 'manual', 'sources', 'docs', 'kb', 'dev'] as const;
export type HubSurfaceKey = (typeof HUB_SURFACES)[number];

/** The testing-hub row, in document order. Also the `tool` enum of `hub.openTool`. */
export const HUB_TOOLS = ['canvas', 'simulator', 'specs', 'layout', 'tables', 'components', 'tokens', 'decisions', 'screenshots'] as const;
export type HubToolKey = (typeof HUB_TOOLS)[number];

/** What HUB-01 can be asked to do — by a click, by window.__hoyos.run, and later by voice. */
const hubActions: ActionDef[] = [
  {
    id: 'hub.enterAs',
    label: { es: 'Entrar a una superficie', en: 'Enter a surface' },
    intent: { es: 'Entra a {surface} como su usuario demo', en: 'Enter {surface} as its demo user' },
    params: { surface: `enum:${HUB_SURFACES.join(',')}` },
  },
  { id: 'hub.openCanvas', label: { es: 'Abrir el lienzo', en: 'Open the canvas' }, intent: { es: 'Muéstrame todas las páginas en el lienzo', en: 'Show me every page on the canvas' }, permission: 'dev.tools' },
  { id: 'hub.openSimulator', label: { es: 'Abrir el simulador', en: 'Open the simulator' }, intent: { es: 'Abre el simulador de dispositivos', en: 'Open the device simulator' }, permission: 'dev.tools' },
  { id: 'hub.openTool', label: { es: 'Abrir una herramienta', en: 'Open a tool' }, intent: { es: 'Abre {tool}', en: 'Open {tool}' }, params: { tool: `enum:${HUB_TOOLS.join(',')}` } },
  { id: 'hub.toggleDevMode', label: { es: 'Modo dev', en: 'Dev mode' }, intent: { es: 'Enciende o apaga el modo dev', en: 'Turn dev mode on or off' }, permission: 'dev.tools' },
  { id: 'hub.setLang', label: { es: 'Cambiar idioma', en: 'Set the language' }, intent: { es: 'Pon la interfaz en {lang}', en: 'Put the interface in {lang}' }, params: { lang: 'enum:es,en' } },
  {
    id: 'hub.map',
    label: { es: 'Mapa del hub', en: 'Hub map' },
    intent: { es: 'Dame el mapa del hub', en: 'Give me the hub map' },
  },
  { id: 'hub.toggleTheme', label: { es: 'Cambiar tema', en: 'Toggle theme' }, intent: { es: 'Cambia entre claro y oscuro', en: 'Switch between light and dark' } },
  { id: 'hub.toggleWireframe', label: { es: 'Wireframe', en: 'Wireframe' }, intent: { es: 'Muestra el sistema en wireframe', en: 'Show the system as a wireframe' }, permission: 'dev.tools' },
];

export const hubSpec = defineSpec({
  code: 'HUB-01',
  name: { es: 'Hub de pruebas', en: 'Testing hub' },
  purpose: {
    es: 'El hub público de pruebas en /hub: enseña el sistema entero de un vistazo y deja entrar a cualquier puesto del estudio con su usuario demo. Cada tarjeta muestra la pantalla real (captura, y la página en vivo cuando cabe), su estado y su ruta; abajo, el sistema en números y el hub de pruebas (lienzo, simulador, specs, tablas, componentes, tokens, decisiones, capturas).',
    en: 'The public testing hub at /hub: it shows the whole system at once and lets a tester enter any seat at the studio as its demo user. Every card shows the real screen (a capture, and the running page when there is room), its status and its route; below, the system in numbers and the testing hub (canvas, simulator, specs, tables, components, tokens, decisions, captures).',
  },
  layout: [
    'BrandBand (Wordmark, version Badge, LangToggle, theme, wireframe + dev toggles for super_admin)',
    'Hero (eyebrow tenant · city, h1, lead, tagline, BreathingRings art ≥ 900 px)',
    'SessionBar (RoleSwitcher, ProblemReport local draft, Ctrl + . hint in dev mode)',
    'FeaturedTraining · Promociones y bonos (P-02, same-session learning and isolated practice for every Hub role)',
    'BandA · Fuera del estudio (Customer app featured with a phone preview, Website, Coming soon page, Teacher app)',
    'BandB · El equipo (Front desk, Inbox, Caja, Admin, CRM, Mensajes transaccionales → M-04 + M-05 link, Finanzas, Marketing · borradores locales de fase futura)',
    'BandC · Construcción y pruebas (Manual, Documentos fuente, Docs, Kanban, Dev tools)',
    'ToolsRow · Hub de pruebas (9 tool cards)',
    'StatStrip (routes, codes, tables, components, actions, manual chapters)',
    'Footer',
  ],
  data: ['users', 'user_roles', 'feature_flags', 'page_layouts'],
  roles: EVERYONE,
  logic: [
    'OT-03 opens a validated, scoped browser-only draft with current pathname, demo actor and effective role. Preview/save/cancel/storage failure/retry exist; no report is sent and the source sends criterion remains unmet.',
    'Cards with switchUser enter as their role’s demo user. Promotions training and other same-session cards navigate without changing identity or permissions.',
    'The built / stub badge is read from the route manifest (src/app/manifest.ts routeManifest), not typed into the card.',
    '“Estás aquí / You are here” shows on the card whose route is ROLE_HOME for the current effective role.',
    'Previews layer a real capture (docs/screenshots/<code>/thumb-*) over a hue-tinted idle tile; a missing capture hides the image instead of breaking it.',
    'A preview upgrades to the running page only when it is in view (IntersectionObserver, 160 px margin) and the budget of 6 live frames has a slot for it: slots are granted in document order on first paint and then kept first-come-first-served, so a card scrolling in later never preempts one that is already live. A preview never boots a frame when the hub is itself framed, the URL carries live=0, or the page is driven by automation (navigator.webdriver) — so a screenshot pass always captures the same static-thumbnail hub.',
    'A framed preview runs under its own session (src/app/frameSession.ts shadows hoyos.session / hoyos.lang / hoyos.theme), so it never touches the tester’s.',
    'The stat strip counts live: routes and codes from the registry, tables from tableRegistry, components from the D-02 glob, actions from listActions(), manual chapters from the ops-manual glob.',
    'A card with comingSoon shows a “Próximamente” badge and its enter button is a Placeholder; hub.enterAs refuses it. Marketing now opens the M-18 future-phase local fictional draft prototype; no publishing or owner acceptance is implied.',
    'The dev-mode toggle renders for super_admin and developer (0031), the wireframe toggle for super_admin only; a tool whose route the current role cannot open still renders and lands on /no-access, as the guard does everywhere else.',
    'The bands and the tools row are drawn from the hub map data (src/hub/hubMap.data.ts): the same module scripts/gen-hub-map.mjs publishes as public/hub-map.json (schema hoy.hub-map/1) for other hosts — aluzina, between-gigs — so the hub and its map cannot drift. Only icons and preview shapes live in HubPage.tsx.',
    'hub.map answers with the published map URL and loads the map into window.__hoyos.hubMap.data.',
    'Hub type sizes, medallions, padding and grid width scale with a hub-scoped --ui variable: 1 · 1.125 (≥1920) · 1.375 (≥2560) · 1.75 (≥3840).',
  ],
  integrations: [],
  states: [
    'default (visitor)', 'signed in as a member', 'super admin', 'dev mode', 'wireframe skin',
    'dark theme', 'live previews on', 'live previews off (live=0)', 'automation: live previews off (navigator.webdriver)', 'framed (inside a preview or the simulator)',
    'no captures yet (idle tiles)', 'English', 'local report draft: edit / invalid / preview / storage failure / retry / saved without dispatch',
  ],
  actions: hubActions,
  checkedAt: [360, 390, 768, 1280, 1920, 2560, 3840],
  notes: [
    'Not part of the canvas; it is the public testing hub at /hub. The public root is Coming Soon; demo role switching remains isolated from production authentication.',
    'Referenced design: the cal-tenant-law hub (same stack) — brand band, floating session bar, 3fr/9fr surface bands, layered previews.',
  ],
});

/**
 * HUB-01 in the production build (Hoy test-fixes, lane Y3): Justin's Hub, unchanged in look, hooked to real data. The
 * same page as the review build (HubPage.tsx); this spec says what differs in production.
 */
export const hubProductionSpec = defineSpec({
  code: 'HUB-01',
  name: { es: 'Hub', en: 'Hub' },
  purpose: {
    es: 'El hub del super admin en producción, el mismo del hub de pruebas: cada puesto del estudio con su persona real, vistas previas en vivo de solo lectura, reportar un problema, la banda de construcción y pruebas, y el wireframe.',
    en: 'The super admin’s Hub in production, the same as the testing hub: every seat at the studio with its real person, live read-only previews, report a problem, the build & test band and the wireframe.',
  },
  layout: [
    'BrandBand (Wordmark, version Badge, LangToggle, theme, wireframe toggle for the super admin)',
    'Hero (eyebrow tenant · city, h1, lead, tagline, BreathingRings art ≥ 900 px)',
    'SessionBar (persona dropdown with the real person of each role, Report a problem)',
    'FeaturedTraining · Promociones y bonos (not in production yet: planned)',
    'BandA · Fuera del estudio (Customer app featured with a phone preview, Website, Coming soon page, Teacher app)',
    'BandB · El equipo (Front desk, Inbox, Caja, Admin, CRM, Mensajes transaccionales, Finanzas, Marketing planned)',
    'BandC · Construcción y pruebas (Manual, Documentos fuente, Docs, Kanban, Dev tools)',
    'ToolsRow · Hub de pruebas (9 tool cards; the ones production does not register are shown as planned)',
    'StatStrip (routes, codes, tables, components, actions, manual chapters)',
    'Footer',
  ],
  data: [],
  roles: ['super_admin'],
  logic: [
    'Only a super admin opens it (route roles); Administration logins, which also hold the backend super_admin membership (AD-04), do not (lane C rule). A full page without the staff shell (surface public, layout auto), as in the review build.',
    '“Entrar como {nombre}” and the persona dropdown name the real person holding each role: the one view-as samples (src/modules/hub/hubPeople.ts reuses loadViewAsSample: by membership, never the viewer, the first active coach for Teacher). The directory (GET /admin/users) is read once.',
    'Choosing a card or a person starts view-as (read-only, src/auth/viewAs.ts) and opens the role’s page; the super admin’s and public cards just navigate. A role nobody holds says so in the dropdown and cannot be chosen.',
    'A card or tool whose route the production build does not register yet shows “Planeada” and is not entered (promotions, marketing, the dev tools R-08 keeps out).',
    'Live previews (in view, at most 3, never under automation) run in frames under their own ?as= (src/app/productionFrame.ts): the frame’s view-as, language, theme and every hoyos.* key are its own and never touch the parent tab; every frame is read-only (the transport refuses writes, a same-origin write through fetch is refused unsent) and hides the view-as banner; clicks never reach a frame. Outside a frame ?as= is ignored, and in a frame it counts only for a real super admin.',
    'Report a problem creates a problem_report form_submission (summary, details, route; viewing_as is in the shape but stays empty, since the Hub is not open while viewing as; staff create, Administration and super admin read). A refusal is said in words and the text stays; after a lost answer the text locks and only a same-key retry is offered.',
    'The Construction & testing band ships for the super admin only: the operations manual, the source documents, the docs and changelog, the kanban (R-08 answered for these pages); the dev tools stay out.',
    'The wireframe toggle is the super admin’s, for this tab only (sessionStorage hoyos.skin), reset on sign-out and for anyone else (src/app/WireframeGate.tsx).',
  ],
  integrations: ['Company OS GET /admin/users (super admin), POST /query person and coach', 'Company OS POST /api/form_submission (form_key problem_report, forms 1.0.0, Idempotency-Key per report)'],
  states: ['default', 'people loading', 'a role nobody holds', 'people unavailable', 'live previews on', 'live previews off (automation)', 'report: edit / invalid / sending / refused / sent', 'wireframe skin', 'dark theme', 'English'],
  checkedAt: [390, 1280, 1920],
  notes: ['The review build’s HUB-01 (hubSpec) is the same page with demo users and local report drafts.'],
});

export const noAccessSpec = defineSpec({
  code: 'E-05',
  name: { es: 'Sin acceso', en: 'No access' },
  purpose: { es: 'Página amable cuando el rol actual no puede entrar a una ruta; ofrece volver al hub para cambiar de usuario demo.', en: 'Friendly page when the current role cannot enter a route; offers the hub to switch demo user.' },
  layout: ['Illustration', 'Title', 'Body (role name)', 'RoleSwitcher', 'CTA → hub'],
  data: ['user_roles'],
  roles: EVERYONE,
  logic: ['Authenticated forbidden roles arrive with ?from=<path>; visitors go to sign-in with an allowlisted customer return.', 'A hub tool card whose route the role cannot open lands here rather than disappearing.'],
  integrations: [],
  states: ['default'],
  checkedAt: [360, 390, 768, 1280, 1920],
});
