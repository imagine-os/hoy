import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';
export const docsSpec = defineSpec({
  code: 'K-02', name: { es: 'Documentación', en: 'Documentation' },
  purpose: { es: 'Visor en la app de docs/**: reglas, arquitectura, prompts, changelog, kanban, mapa de flujo, modelo de datos, capturas. Los .md son la fuente; no hay CMS.', en: 'In-app viewer for docs/**: rules, architecture, prompts, changelog, kanban, flow map, data model, screenshots. The .md files are the source; no CMS.' },
  layout: ['DocsSidebar (grouped: Overview, Rules, Architecture, Data model, Flow map, Kanban, Changelog, Prompts, Pages, Screenshots, Manual)', 'MarkdownViewer', 'KanbanBoard (lanes × columns)', 'ChangelogList / ChangelogEntry (newest first, header as definition grid)', 'PromptEntry (prompt | response side by side)', 'ScreenshotGallery (docs/screenshots/<code>/)'],
  data: ['docs_entries'], roles: EVERYONE,
  logic: [
    'import.meta.glob loads every docs/**/*.md as raw text and every image as a bundled URL at build time (works under base "./").',
    'Relative images resolve to bundled URLs; .md links become routes; manual chapters route to /manual/<slug>.',
    'Kanban: `## Backlog|Doing|Done|Blocked` are columns; any other `##` is a lane whose `###` are its columns.',
    'Changelog and prompt lists sort by file number descending (newest first).',
    'Prompt entries split at `## Response` into two columns.',
  ],
  integrations: [], states: ['default', 'doc not found', 'index pages (changelog, prompts, screenshots)', 'screenshots empty'],
});
