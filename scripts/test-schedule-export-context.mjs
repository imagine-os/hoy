import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const hook=readFileSync(new URL('../src/modules/staff/desk/useCos.ts',import.meta.url),'utf8'),page=readFileSync(new URL('../src/modules/classSchedule/live/LiveSchedulePage.tsx',import.meta.url),'utf8');
assert.match(hook,/current: state\.source === source/,'current derives from captured result provenance, not render-time stamps');
assert.match(hook,/setState\(\{ source,/,'successful reads retain closure source');
assert.match(hook,/\[data, request, key, version, \.\.\.deps\]/,'context, query and reload version fence reads');
assert.match(page,/\[user\.id, role, viewAs, viewAsPerson\?\.id, status, signedIn\]/,'actor/role/view-as/session dependencies');
assert.match(page,/q\.current/);assert.match(page,/type="button"[^\n]*onClick=\{exportDates\}/);
assert.ok(!page.includes('const exportSnapshot'),'no render-time result stamping');console.log('export result provenance contracts PASS');
