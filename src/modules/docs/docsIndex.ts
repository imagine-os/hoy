// Every markdown file and image under docs/ at build time. Adding a doc needs no code change.
const mdFiles = import.meta.glob<string>('../../../docs/**/*.md', { query: '?raw', import: 'default', eager: true });
const assets = import.meta.glob<string>('../../../docs/**/*.{png,jpg,jpeg,gif,svg,webp}', { query: '?url', import: 'default', eager: true });

const strip = (k: string) => k.replace(/^\.\.\/\.\.\/\.\.\//, ''); // → 'docs/…'

export interface DocEntry { path: string; title: string; dir: string; source: string }

export const docs: DocEntry[] = Object.entries(mdFiles).map(([k, source]) => {
  const path = strip(k);
  const m = source.match(/^#\s+(.+)$/m);
  return { path, title: m ? m[1].trim() : path.split('/').pop()!.replace(/\.md$/, ''), dir: path.split('/').slice(1, -1).join('/'), source };
}).sort((a, b) => a.path.localeCompare(b.path));

export const assetUrl = (path: string): string | undefined => {
  const hit = Object.entries(assets).find(([k]) => strip(k) === path);
  return hit?.[1];
};

export const docByPath = (path: string) => docs.find((d) => d.path === path);

/** Tree grouped by first-level directory under docs/. */
export function docTree(prefix = ''): { dir: string; items: DocEntry[] }[] {
  const list = docs.filter((d) => d.path.startsWith(`docs/${prefix}`));
  const dirs = [...new Set(list.map((d) => d.dir))].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));
  return dirs.map((dir) => ({ dir, items: list.filter((d) => d.dir === dir) }));
}
