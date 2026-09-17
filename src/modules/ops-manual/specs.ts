import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';

export const manualSpec = defineSpec({
  code: 'K-03', name: { es: 'Manual de operaciones', en: 'Operations manual' },
  purpose: { es: 'Cómo funciona el club en persona y en el software, por rol. Igual para todos los que lo miran; español primero, inglés como espejo.', en: 'How the club runs in person and in software, by role. Same for everyone who looks; Spanish first, English as a mirror.' },
  layout: ['ChapterSidebar (titles from front matter, decisions summary link, print)', 'ChapterMeta (role, version, updated)', 'MarkdownViewer (callouts, screenshot placeholders)', 'PrevNext'],
  data: ['docs_entries'], roles: EVERYONE,
  logic: [
    'Chapters are docs/ops-manual/<lang>/<NN-slug>.md loaded with import.meta.glob at build time; the slug is shared across languages.',
    'Follows the app language: ES is the source; a missing EN chapter falls back to ES with a notice.',
    '`> DECISIÓN PENDIENTE:` / `> DECISION NEEDED:` blockquotes render as highlighted callouts and feed K-04.',
    '`[screenshot: CODE — caption]` lines render as dashed placeholder boxes until a real capture replaces them.',
    'Print: sidebar and shell chrome hidden; callouts and placeholders never split across pages.',
  ],
  integrations: [], states: ['default', 'chapter not found', 'untranslated (ES fallback)', 'print'],
  notes: ['Policies quoted in the manual (cancellation 2 h, waitlist 30 min, late grace) are read from M-08; the screen wins over the text.'],
});

export const decisionsSpec = defineSpec({
  code: 'K-04', name: { es: 'Decisiones pendientes', en: 'Decisions pending' },
  purpose: { es: 'Lista automática de todo lo que el estudio no ha definido, extraída de los bloques «DECISIÓN PENDIENTE» del manual, agrupada por capítulo y sección.', en: 'Automatic list of everything the studio has not defined, extracted from the manual’s "DECISION NEEDED" blocks, grouped by chapter and section.' },
  layout: ['PageHead (count)', 'DecisionList (grouped by chapter, section, link to chapter)'],
  data: ['docs_entries'], roles: EVERYONE,
  logic: ['Extracted at build/run time from the markdown; editing a chapter updates the list, no code change.', 'Same list feeds ROADMAP.md "Open decisions for the owner".'],
  integrations: [], states: ['default', 'empty'],
});
