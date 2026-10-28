// company-os.json says which Company OS release this frontend needs ({ "requires": ">=A.B.C" }).
// The production deploy refuses a release tag without a valid one, so catch a broken or missing file here
// first, in every pull request and before every deploy. Fails when the file is missing or not JSON, when
// "requires" isn't exactly ">=MAJOR.MINOR.PATCH", or when it carries any other key (one source of truth).
// Run: node scripts/check-company-os.mjs
import { readFileSync } from 'node:fs';

let data;
try {
  data = JSON.parse(readFileSync(new URL('../company-os.json', import.meta.url), 'utf8'));
} catch (err) {
  console.error(`❌ check-company-os: company-os.json is missing or not valid JSON (${err.message})`);
  process.exit(1);
}
const keys = data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [];
if (keys.length !== 1 || keys[0] !== 'requires') {
  console.error(`❌ check-company-os: company-os.json must have exactly one key, "requires" (found: ${keys.join(', ') || 'none'})`);
  process.exit(1);
}
if (typeof data.requires !== 'string' || !/^>=\d+\.\d+\.\d+$/.test(data.requires)) {
  console.error(`❌ check-company-os: "requires" must look like ">=1.5.0" (found: ${JSON.stringify(data.requires)})`);
  process.exit(1);
}
console.log(`✅ check-company-os: this frontend requires Company OS ${data.requires}`);
