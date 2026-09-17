// Writes src/design/tokens.css from src/design/tokens.ts (runtime injection does the same; this is for static use/docs).
import { writeFileSync } from 'node:fs';
const mod = await import('../src/design/tokens.ts');
writeFileSync(new URL('../src/design/tokens.css', import.meta.url), mod.buildTokensCss());
console.log('wrote src/design/tokens.css');
