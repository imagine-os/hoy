import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const strings = readFileSync('src/modules/website/strings.ts', 'utf8');
for (const key of ['site.schedule.body', 'site.schedule.legendBody']) {
  const line = strings.split('\n').find(line => line.includes(`'${key}'`));
  assert(line?.includes('es:') && line.includes('en:'));
  assert(!line.includes('{mats}'), `${key} must not advertise a fixed room capacity`);
}
const empty = strings.split('\n').find(line => line.includes("'site.calendar.empty'"));
assert(empty.includes('flechas') && empty.includes('arrows'));
const page = readFileSync('src/modules/website/pages/SchedulePage.tsx', 'utf8');
assert(!page.includes('tenant.studio.mats'));
const pricing = readFileSync('src/tenant/pricing.ts', 'utf8');
assert(pricing.includes('confirmar el precio según tu grupo'));
assert(pricing.includes('confirm the price for your group'));
assert(!pricing.includes('each additional person adds a fixed amount'));
console.log('Public schedule and private-class copy regression checks passed');
