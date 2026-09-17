import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';
export const docsSpec = defineSpec({
  code: 'K-02', name: { es: 'Documentación', en: 'Documentation' },
  purpose: { es: 'Visor en la app de docs/**: reglas, prompts, changelog, arquitectura, capturas. Los .md son la fuente; no hay CMS.', en: 'In-app viewer for docs/**: rules, prompts, changelog, architecture, screenshots. The .md files are the source; no CMS.' },
  layout: ['DocsSidebar (tree by folder)', 'MarkdownViewer'], data: ['docs_entries'], roles: EVERYONE,
  logic: ['import.meta.glob loads every docs/**/*.md as raw text at build time.', 'Relative images resolve to bundled URLs; .md links become routes.'],
  integrations: [], states: ['default', 'doc not found'],
});
export const manualSpec = defineSpec({
  code: 'K-03', name: { es: 'Manual de operaciones', en: 'Operations manual' },
  purpose: { es: 'Cómo funciona el club en persona y en el software, por rol. Igual para todos los que lo miran.', en: 'How the club runs in person and in software, by role. Same for everyone who looks.' },
  layout: ['DocsSidebar (ops-manual tree)', 'MarkdownViewer'], data: ['docs_entries'], roles: EVERYONE,
  logic: ['Limited to docs/ops-manual/**.'], integrations: [], states: ['default', 'placeholder structure only'],
});
