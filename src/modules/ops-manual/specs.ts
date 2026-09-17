import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';

export const manualSpec = defineSpec({
  code: 'K-03', name: { es: 'Manual de operaciones', en: 'Operations manual' },
  purpose: { es: 'Cómo funciona el club en persona y en el software, en siete partes: quiénes somos, la operación diaria, clientes y planes, dinero, contenido y marca, legal y políticas, y el sistema. Igual para todos los que lo miran; español primero, inglés como espejo.', en: 'How the club runs in person and in software, in seven parts: who we are, daily operations, customers and plans, money, content and brand, legal and policies, and the system. Same for everyone who looks; Spanish first, English as a mirror.' },
  layout: [
    'ManualCover (wordmark, title, tagline, version + updated, chapter/reading/figure counts, decisions badge)',
    'ManualSearch (filters chapters by title, summary, role and body)',
    'StartHere (three chapters per role: recepción, maestros, admin, finanzas)',
    'PartGrid (ChapterCard per chapter: number, title, summary, role chips, reading time, figures, decisions)',
    'ChapterSidebar (parts and their chapters, decisions link, search, print)',
    'ChapterHead (part eyebrow, title, summary, role, reading time, version, updated)',
    'MarkdownViewer (callouts, Figure captures, LiveBlock directives, screenshot placeholders)',
    'Toc (sticky in-page outline from the ## headings, desktop)',
    'PrevNext',
  ],
  data: ['docs_entries', 'tenants', 'profiles', 'memberships', 'class_sessions', 'teachers', 'bookings'], roles: EVERYONE,
  logic: [
    'Chapters are docs/ops-manual/<lang>/<NN-slug>.md: the index (titles, parts, headings, decisions) is built at build time by scripts/lib/docmeta.mjs and each body loads on demand; the slug is shared across languages and adding a chapter needs no code change.',
    'Front matter is title, role, part (I…VII), version, updated and summary; `part` groups the chapters on the home grid and in the sidebar, `summary` is the card lead and is searched.',
    'Follows the app language: ES is the source; a missing EN chapter falls back to ES with a notice. Slugs retired by the 0.6.0 re-categorisation resolve through LEGACY_SLUGS.',
    'Reading time is the body word count / 200, figures are the markdown images that point at docs/screenshots, decisions and placeholders are counted from the body — nothing on a card is typed by hand.',
    '`> DECISIÓN PENDIENTE:` / `> DECISION NEEDED:` blockquotes render as highlighted callouts and feed K-04.',
    'A `{{directive}}` line (or a fenced ```live block) renders as a LiveBlock: pricing by family from src/tenant/pricing.ts, studio facts from src/tenant/tenant.ts, the policy values in force through usePolicy() (M-08), the table registry, the role list, the route manifest per surface and counts from the data layer. Every block carries the bilingual "Datos en vivo del sistema · Live from the system" caption and an unknown directive explains itself.',
    '`![caption](../../screenshots/<CODE>/<lang>-<width>.jpg "CODE · /route")` renders as a Figure: framed capture, code chip and a link to the live screen. `[screenshot: CODE — caption]` still renders as a dashed box for screens with no capture.',
    'Print: sidebar, outline, search and shell chrome hidden; callouts, figures and live blocks never split across pages.',
  ],
  integrations: [], states: ['home (cover + grid)', 'chapter', 'chapter not found', 'untranslated (ES fallback)', 'search results', 'print'],
  notes: [
    'Policies quoted in prose are the exception, not the rule: a number that M-08 owns is written as `{{policy:…}}` so the chapter cannot go stale.',
    'Prices are never typed in a chapter; `{{pricing:<family>}}` reads src/tenant/pricing.ts, the only place a price exists.',
  ],
});

export const decisionsSpec = defineSpec({
  code: 'K-04', name: { es: 'Decisiones pendientes', en: 'Decisions pending' },
  purpose: { es: 'Lista automática de todo lo que el estudio no ha definido, extraída de los bloques «DECISIÓN PENDIENTE» del manual, agrupada por capítulo y parte.', en: 'Automatic list of everything the studio has not defined, extracted from the manual’s "DECISION NEEDED" blocks, grouped by chapter and part.' },
  layout: ['PageHead (count)', 'DecisionList (grouped by chapter with its part eyebrow, section, link to chapter)', 'ChapterSidebar'],
  data: ['docs_entries'], roles: EVERYONE,
  logic: ['Extracted at build/run time from the markdown; editing a chapter updates the list, no code change.', 'Same list feeds ROADMAP.md "Open decisions for the owner".', 'Numbering runs across the whole manual so a decision can be cited as "K-04 #07".'],
  integrations: [], states: ['default', 'empty'],
});
