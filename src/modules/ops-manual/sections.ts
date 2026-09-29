// A chapter body split at its `##` headings (0031), so one section can be edited, overridden or restored
// without touching the markdown in git. A `##` inside a fence or inside a `{{for:…}}` block does not split.
// `{{editable:owner}}` / `{{editable:coordinator}}` on a line of a section marks it editable at that level
// (owner = admin and super admin; coordinator = coordination too) and is removed from the rendered text.
export type EditLevel = 'owner' | 'coordinator';

export interface Section {
  /** Stable key within the chapter: the heading text, or '' for the part above the first `##`. */
  heading: string;
  /** The `## …` line as written ('' for the intro). */
  headingLine: string;
  /** Markdown under the heading, directive-free. */
  body: string;
  editable?: EditLevel;
}

const EDITABLE = /^\{\{\s*editable\s*:\s*(owner|coordinator)\s*\}\}\s*$/i;
const FOR_OPEN = /^\{\{\s*for\s*:/i;
const FOR_CLOSE = /^\{\{\s*\/\s*for\s*\}\}/i;

export function splitSections(md: string): Section[] {
  const out: Section[] = [{ heading: '', headingLine: '', body: '' }];
  const lines: string[][] = [[]];
  let fenced = false, depth = 0;
  for (const line of md.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (!fenced) {
      if (FOR_OPEN.test(line)) depth += 1;
      else if (FOR_CLOSE.test(line)) depth = Math.max(0, depth - 1);
      const h = depth === 0 && line.match(/^##\s+(.+?)\s*$/);
      if (h) { out.push({ heading: h[1], headingLine: line, body: '' }); lines.push([]); continue; }
      const e = line.match(EDITABLE);
      if (e) { out[out.length - 1].editable = e[1].toLowerCase() as EditLevel; continue; }
    }
    lines[lines.length - 1].push(line);
  }
  out.forEach((s, i) => { s.body = lines[i].join('\n').replace(/^\n+/, '').replace(/\n+$/, ''); });
  return out.filter((s, i) => i > 0 || s.body.trim());
}

/** The markdown of one section as rendered: heading line + body. */
export const sectionSource = (s: Pick<Section, 'headingLine'>, body: string) => (s.headingLine ? `${s.headingLine}\n\n${body}` : body);
