import { defineSpec } from '../../specs/define';
import { ALL_SIGNED_IN, EVERYONE } from '../../auth/roles';
import { MANUAL_ACTIONS, REQUEST_ACTIONS } from './actionDefs';

export const manualSpec = defineSpec({
  code: 'K-03', name: { es: 'Manual de operaciones', en: 'Operations manual' },
  purpose: { es: 'Cómo funciona el club en persona y en el software, en siete partes, leído como un LMS del equipo: cada persona ve su manual filtrado por rol (obligatorio / recomendado), marca lo que leyó, sigue su formación Día 1 / Semana 1 / Mes 1 con la firma de quien la entrena, y el owner o coordinación ajustan las secciones y políticas marcadas como editables sin tocar el repositorio. Español primero, inglés como espejo.', en: 'How the club runs in person and in software, in seven parts, read as a team LMS: each person sees their manual filtered by role (required / recommended), marks what they read, follows their Day 1 / Week 1 / Month 1 training with their trainer’s sign-off, and the owner or coordination adjust the sections and policies marked editable without touching the repository. Spanish first, English as a mirror.' },
  layout: [
    'ManualCover (wordmark, title, tagline, version + updated, chapter/reading/figure counts, decisions badge, LensSelect)',
    'LmsCover (lens ≠ all): "Tu manual" · tiles (ProgressRing required read, required, recommended, training summary, decisions, requests, sources) · Start here · Required · Recommended',
    'ManualTiles (lens = all): chapters, decisions, requests, sources',
    'TeamView (coordinator / admin / super_admin): StatTile ×4 + DataTable (person, required read, training stage)',
    'ManualSearch (filters chapters by title, summary, role and body)',
    'StartHere (lens = all: three chapters per role)',
    'PartGrid (part icon · ChapterCard per chapter: icon, number, title, level for the lens, read, reading time, figures, decisions)',
    'ChapterSidebar (LensSelect, parts and chapters with icons and lens level / read marks, decisions, sources, search, print)',
    'ChapterHead (part eyebrow, chapter icon, title, summary, LevelChip, ReadButton, reading time, version, updated, editable count)',
    'SectionBlock × n (editable tag, "Editado por … · Ver original", history, suggestions, restore, Editar → MarkdownEditor with live preview)',
    'MarkdownViewer (callouts, EN HOYOS screen boxes, {{for}} scoped blocks, Figure captures with capture date + stale badge, LiveBlock and manual directives)',
    'RequestBox ("Pedir un cambio": section + text → manual_requests)',
    'Toc (sticky in-page outline from the ## headings, desktop)',
    'PrevNext',
  ],
  data: ['docs_entries', 'tenants', 'profiles', 'users', 'user_roles', 'memberships', 'class_sessions', 'teachers', 'bookings', 'manual_progress', 'manual_training', 'manual_overrides', 'manual_requests', 'studio_policies', 'audit_log'], roles: EVERYONE,
  logic: [
    'Chapters are docs/ops-manual/<lang>/<NN-slug>.md: the index (titles, parts, headings, decisions, screen boxes) is built at build time by scripts/lib/docmeta.mjs and each body loads on demand; the slug is shared across languages and adding a chapter needs no code change.',
    'Lens: the signed-in role by default; `?as=<role>` or `?as=all` in the hash query switches it (the same key as the hub map embed pattern, so a framed manual opened as a teacher already reads as the teacher’s). Links inside the manual keep an explicit lens.',
    'Audience is data: src/modules/ops-manual/audience.ts (the 00-index §4 matrix keyed by chapter number; owner = admin, super_admin = owner ∪ admin columns, plus marketing and developer). Required first, then recommended; a chapter that does not apply is dimmed, never hidden.',
    'Reading progress: "Marcar como leído" writes manual_progress {user_id, chapter_slug, version, read_at}; a chapter whose front-matter version moved shows "Hay una versión nueva".',
    'Training: {{training:<role>}} renders the Day 1 / Week 1 / Month 1 checklist from training.ts (seeded verbatim from chapter 09) with a checkbox per item in manual_training; coordination and up pick a person from the roster and "Firmar etapa" (item_key __signoff, signed_by).',
    'Editing beside the markdown: a `##` section carrying {{editable:owner}} or {{editable:coordinator}} can be rewritten by that level and up; the edit is a manual_overrides row (status live, version n) shown in place with "Editado por … · Ver original", a history and "Restaurar original" (status reverted — history is never deleted). Suggestions (status suggested, e.g. from an agent through manual.suggestEdit) wait on the section’s "Sugerencias" chip.',
    '{{studio:<key>}} renders a text policy from studio_policies (seed src/data/seed/studioPolicies.ts) with an inline 44 px edit for the allowed level; an M-08 policy key (or {{policy:…}}) shows the live value and, for an editor, "Este valor se cambia en Ajustes (M-08a) →".',
    '{{for:teacher,front_desk}} … {{/for}} scopes a passage: shown with "Para: …" when the lens matches or is all; collapsed into a <details> "Solo para …" otherwise (never removed).',
    '{{audience}} renders the matrix; {{audience:<slug|number>}} a "Para: …" chip row; {{source:<id>}} a SourceEmbed of docs/source/index.json.',
    '`> EN HOYOS:` / `> IN HOYOS:` blockquotes render as compact screen boxes (page codes as chips, `->` as arrows); `> NOTA:` / `> NOTE:` as a note; `> DECISIÓN PENDIENTE:` feeds K-04.',
    'Figures show their capture date (src/app/captureDates.ts, from the git date of docs/screenshots/<CODE>/es-1280.jpg) and "puede estar desactualizada" when a changelog entry naming the code is newer than the capture.',
    'Every write appends an audit_log row (useAudit("admin")). Print: sidebar, outline, search, tools and shell chrome hidden.',
  ],
  integrations: [], states: ['home, lens = all (tiles + start here + grid)', 'home, lens = a role (Tu manual)', 'home as coordination / admin (team view)', 'chapter', 'chapter, required / recommended / not applicable for the lens', 'chapter read / new version', 'section edited (override live)', 'section editor open', 'section with suggestions', 'scoped block collapsed', 'chapter not found', 'untranslated (ES fallback)', 'search results', 'print'],
  actions: MANUAL_ACTIONS,
  checkedAt: [360, 390, 768, 1280, 1920, 2560, 3840],
  notes: [
    'Policies quoted in prose are the exception, not the rule: a number that M-08 owns is written as `{{policy:…}}`; a text rule the owner adapts is `{{studio:…}}`.',
    'Prices are never typed in a chapter; `{{pricing:<family>}}` reads src/tenant/pricing.ts, the only place a price exists.',
    '"Reescribir con IA" is a Placeholder: an agent does it today through the actions registry (manual.suggestEdit → the owner approves).',
  ],
});

export const decisionsSpec = defineSpec({
  code: 'K-04', name: { es: 'Decisiones y solicitudes', en: 'Decisions and requests' },
  purpose: { es: 'Lo que el estudio no ha definido (los bloques «DECISIÓN PENDIENTE» del manual, por capítulo y parte) y lo que el equipo pidió cambiar en el manual («Pedir un cambio»), para que el owner o coordinación respondan en un solo lugar.', en: 'What the studio has not defined (the manual’s "DECISION NEEDED" blocks, by chapter and part) and what the team asked to change in the manual ("Request a change"), so the owner or coordination answer in one place.' },
  layout: ['PageHead (icon, counts)', 'RequestsPanel (coordination and up: open requests with answer, done / dismiss; closed in a details)', 'DecisionList (grouped by chapter with its part eyebrow and icon, section, link to chapter)', 'ChapterSidebar'],
  data: ['docs_entries', 'manual_requests', 'profiles', 'audit_log'], roles: EVERYONE,
  logic: ['Decisions are extracted at build time from the markdown; editing a chapter updates the list, no code change.', 'Same list feeds ROADMAP.md "Open decisions for the owner".', 'Numbering runs across the whole manual so a decision can be cited as "K-04 #07".', 'Requests come from manual_requests; answering sets status done / dismissed and the answer, and the requester sees it under the chapter’s request box.', 'The route stays /manual/decisions (renamed in 0031, kept for links).'],
  integrations: [], states: ['default', 'no decisions', 'no open requests', 'requests (lead)', 'requests hidden (not a lead)'],
  actions: [...REQUEST_ACTIONS, ...MANUAL_ACTIONS.filter((a) => a.id === 'manual.openSource')],
  checkedAt: [360, 390, 768, 1280, 1920],
});

export const sourcesSpec = defineSpec({
  code: 'K-05', name: { es: 'Documentos fuente', en: 'Source documents' },
  purpose: { es: 'Los documentos del owner de los que salen el manual y el sitio — el modelo de valor, los textos del sitio y el manual de marca — con un visor en línea, descarga y los capítulos que los citan.', en: 'The owner’s documents the manual and the website are written from — the value model, the website copy and the brand manual — with an inline viewer, download and the chapters that cite them.' },
  layout: ['PageHead (icon, count, lead)', 'SourceEmbed × n (kind, title, pages, date, summary, cover → inline PDF viewer, fullscreen, download, new tab)', 'ChapterLinks (chapters that embed it, with icons)', 'ChapterSidebar'],
  data: ['docs_entries'], roles: ALL_SIGNED_IN,
  logic: ['The list is docs/source/index.json; the files are public/source/<id>.pdf (+ <id>-cover.jpg). Adding a document needs no code change.', '`?doc=<id>` scrolls to one document and opens its viewer (manual.openSource).', 'A chapter embeds one with {{source:<id>}}.'],
  integrations: [], states: ['default', 'one document opened (?doc=)', 'viewer fullscreen'],
  actions: MANUAL_ACTIONS.filter((a) => a.id === 'manual.openSource'),
  checkedAt: [360, 390, 768, 1280, 1920],
});
