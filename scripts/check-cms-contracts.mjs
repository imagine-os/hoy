/** Bounded source inventory check. No TypeScript loader, bundler, network or application execution. */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const start = '/* cms-data:start */', end = '/* cms-data:end */';
const sha = text => createHash('sha256').update(text).digest('hex');
const sourceDigest = sources => sha([...sources].sort((a,b)=>a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map(s=>`${s.path}:${s.sha256}`).join('\n'));
const strings = text => [...text.matchAll(/['"]([^'"\n]*)['"]/g)].map(match => match[1]);
const quoted = (text, value) => text.includes(`'${value}'`) || text.includes(`"${value}"`);
const baseFields = { id: { type: 'uuid' }, tenant_id: { type: 'uuid' }, created_at: { type: 'timestamptz' }, updated_at: { type: 'timestamptz' } };
const kinds = new Set(['form-preview', 'cards', 'summary-ledger-list', 'review-list', 'table-tool']);
const operators = new Set(['is', 'is_not', 'contains', 'empty', 'not_empty', 'before', 'after', 'gt', 'lt', 'in']);

export function parseData(text) {
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < a || text.indexOf(start, a + 1) !== -1) throw Error('expected one CMS JSON data block');
  return JSON.parse(text.slice(a + start.length, b));
}

/** Read the existing declarative table catalog without importing application or private provider code. */
export function schemaInventory(text) {
  const starts = [...text.matchAll(/^  \{ name:\s*['"]([^'"]+)['"],\s*group:/gm)];
  if (!starts.length) throw Error('table catalog shape changed; update the bounded checker');
  const result = new Map();
  for (let i = 0; i < starts.length; i++) {
    const name = starts[i][1], block = text.slice(starts[i].index, starts[i + 1]?.index ?? text.indexOf('\n];', starts[i].index));
    const columnStart = block.indexOf('columns:');
    if (columnStart < 0) throw Error(`catalog columns missing: ${name}`);
    const columns = block.slice(columnStart);
    const fields = new Map(Object.entries(baseFields));
    const declarations = [...columns.matchAll(/\{\s*name:\s*['"]([^'"]+)['"]\s*,\s*type:\s*['"]([^'"]+)['"]/g)];
    for (let j = 0; j < declarations.length; j++) {
      const d = declarations[j], fragment = columns.slice(d.index, declarations[j + 1]?.index ?? columns.length);
      const enumText = fragment.match(/\benum:\s*\[([^\]]*)\]/)?.[1];
      const references = fragment.match(/\breferences:\s*['"]([^'"]+)['"]/)?.[1];
      fields.set(d[1], { type: d[2], ...(enumText ? { enumValues: strings(enumText) } : {}), ...(references ? { references } : {}) });
    }
    for (const m of columns.matchAll(/\bmoney\(['"]([^'"]+)['"]/g)) fields.set(m[1], { type: 'int' });
    // Explicit mock-only column helper in the existing catalog, not an unrestricted unknown-field escape.
    for (const m of columns.matchAll(/\bmockGiftColumn\(['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g)) fields.set(m[1], { type: m[2] });
    result.set(name, fields);
  }
  return result;
}

function sampleType(value, type) {
  if (value === null) return true; // samples may omit nullable/nonessential fields; not full seed records
  if (['int', 'numeric'].includes(type)) return typeof value === 'number' && Number.isFinite(value) && (type !== 'int' || Number.isInteger(value));
  if (type === 'bool') return typeof value === 'boolean';
  if (type === 'json') return value !== undefined;
  return typeof value === 'string';
}

export function validateFeature(feature, fixtures, load, inventory) {
  const errors = [], report = message => errors.push(`${feature.id ?? '?'}: ${message}`);
  const nonempty = (items, name) => { if (!Array.isArray(items) || !items.length) { report(`${name} must be nonempty`); return []; } return items; };
  if (!/^[a-z][a-z0-9-]*$/.test(feature.id ?? '') || !Number.isInteger(feature.revision) || feature.revision < 1) report('invalid feature id/revision');
  if (feature.backendMapping !== 'pending' || feature.subscription !== 'local-events') report('mapping or subscription cannot imply a connected backend');
  if (feature.identityField !== 'id' || feature.tenantField !== 'tenant_id' || !feature.actorScope?.trim()) report('identity/tenant/actor scope missing');
  const sources = nonempty(feature.sources, 'sources'), tests = nonempty(feature.adapterTests, 'adapterTests');
  const digest = sourceDigest(sources);
  const paths = new Set();
  for (const item of [...sources, ...tests]) {
    if (!/^(src|scripts)\/[\w/.-]+\.(ts|tsx|mjs)$/.test(item.path ?? '') || item.path.includes('..')) { report('invalid source/test path'); continue; }
    if (paths.has(item.path)) report(`duplicate fingerprint ${item.path}`);
    paths.add(item.path);
    try {
      const text = load(item.path);
      if (!/^[a-f0-9]{64}$/.test(item.sha256 ?? '') || sha(text) !== item.sha256) report(`source drift ${item.path}; review contract, fixtures and adapter tests; current sha256=${sha(text)}`);
    } catch { report(`missing source/test ${item.path}`); }
  }
  for (const test of tests) {
    if (!test.path?.startsWith('scripts/test-') || !test.verifies?.trim()) report('adapter test path/purpose missing');
    if (test.reviewedSourceDigest !== digest) report(`adapter test review is stale ${test.path}; review test adequacy for current source digest=${digest}`);
  }
  // At least one actual provider verification, not only a UI or filename inventory.
  if (!tests.some(test => { try { return /MockProvider/.test(load(test.path)); } catch { return false; } })) report('adapter tests must reference an actual MockProvider test');
  const declarations = new Map();
  for (const e of nonempty(feature.entities, 'entities')) {
    if (declarations.has(e.name)) report(`duplicate entity ${e.name}`);
    declarations.set(e.name, e);
    if (!inventory.has(e.name)) report(`unknown entity ${e.name}`);
    for (const key of Object.keys(baseFields)) if (!e.fields?.includes(key)) report(`${e.name}: required identity field ${key} missing`);
    if (!Array.isArray(e.usage) || !e.usage.length || e.usage.some(value => !['read', 'command-effect', 'dependency'].includes(value))) report(`${e.name}: invalid entity usage`);
    if (new Set(e.fields).size !== e.fields?.length) report(`${e.name}: duplicate fields`);
  }
  const extensions = new Map();
  for (const x of feature.mockExtensions ?? []) {
    const key = `${x.entity}.${x.field}`, original = inventory.get(x.entity)?.get(x.field);
    if (extensions.has(key)) report(`duplicate mock extension ${key}`);
    extensions.set(key, x);
    if (!declarations.get(x.entity)?.fields.includes(x.field) || !paths.has(x.source) || !x.reason?.includes('pending')) report(`unscoped mock extension ${key}`);
    if (!['uuid','text','int','numeric','bool','timestamptz','date','time','json','enum'].includes(x.type)) report(`invalid extension type ${key}`);
    if (original && (!x.enumValues?.length || original.type !== x.type || x.enumValues.some(value => original.enumValues?.includes(value)))) report(`extension must be an explicit new enum value or absent field: ${key}`);
    try { if (!load(x.source).includes(x.field) || x.enumValues?.some(value => !quoted(load(x.source), value))) report(`extension source does not contain field/value ${key}`); } catch { report(`missing extension source ${key}`); }
  }
  const field = (entity, name) => inventory.get(entity)?.get(name) ?? extensions.get(`${entity}.${name}`);
  for (const e of declarations.values()) for (const name of e.fields ?? []) if (!field(e.name, name)) report(`unknown field ${e.name}.${name}; declare browser-only extensions explicitly`);
  const fixtureMap = new Map(fixtures.map(f => [f.id, f]));
  const pageCodes = new Set();
  for (const p of nonempty(feature.pages, 'pages')) {
    if (pageCodes.has(p.code)) report(`duplicate page ${p.code}`);
    pageCodes.add(p.code);
    if (!kinds.has(p.viewKind)) report(`${p.code}: invalid actual view kind`);
    for (const path of [p.routeSource, p.specSource, p.componentSource]) if (!paths.has(path)) report(`${p.code}: source is not fingerprinted ${path}`);
    try {
      const routes = load(p.routeSource);
      if (!routes.split('\n').some(line => quoted(line, p.route) && /\bspec:/.test(line) && line.includes(p.routeSpec))) report(`${p.code}: route/spec binding missing`);
      const specs = load(p.specSource), at = specs.indexOf(p.specAnchor);
      if (!p.specAnchor || at < 0) report(`${p.code}: spec anchor missing`);
      else {
        const data = specs.slice(at).match(/\bdata:\s*\[([^\]]*)\]/)?.[1];
        if (!data || JSON.stringify(strings(data)) !== JSON.stringify(p.specEntities)) report(`${p.code}: spec data drift`);
      }
      if (!new RegExp(`export\\s+(?:function|const)\\s+${p.componentExport}\\b`).test(load(p.componentSource))) report(`${p.code}: component export missing`);
    } catch { report(`${p.code}: route/spec/component read failed`); }
    for (const entity of p.specEntities ?? []) if (entity !== 'any table in src/data/schema.ts (tableRegistry)' && !declarations.has(entity)) report(`${p.code}: spec entity missing from feature ${entity}`);
    if (p.viewKind === 'form-preview' && p.views?.length) report(`${p.code}: form cannot acquire table preferences`);
    for (const view of p.views ?? []) {
      if (!declarations.has(view.entity) || !['list','grid'].includes(view.kind)) report(`${p.code}: invalid view entity/kind`);
      const cfg = view.config ?? {};
      const used = [...(cfg.sorts ?? []).map(x => x.column), ...(cfg.filters ?? []).map(x => x.column), ...(cfg.hiddenColumns ?? []), ...(cfg.columnOrder ?? []), ...(cfg.cardFields ?? []), ...[cfg.groupBy, cfg.kanbanColumn, cfg.dateColumn, cfg.endColumn].filter(Boolean)];
      for (const name of used) if (!declarations.get(view.entity)?.fields.includes(name)) report(`${p.code}: undeclared view field ${view.entity}.${name}`);
      if (cfg.sorts?.some(s => !['asc','desc'].includes(s.dir)) || cfg.filters?.some(f => !operators.has(f.op))) report(`${p.code}: invalid filter/sort`);
    }
    const samples = nonempty(p.fixtureIds, `${p.code} fixtureIds`).map(id => fixtureMap.get(id));
    for (const f of samples) {
      if (!f || f.feature !== feature.id || f.page !== p.code || !p.states?.includes(f.state)) { report(`${p.code}: fixture identity/state mismatch`); continue; }
      if (f.sourceDigest !== digest) report(`${f.id}: fixture review is stale; review sample for current source digest=${digest}`);
      for (const row of nonempty(f.rows, `${f.id} rows`)) {
        const declared = declarations.get(row.entity), values = row.values ?? {};
        if (!declared) { report(`${f.id}: undeclared fixture entity ${row.entity}`); continue; }
        for (const key of Object.keys(baseFields)) if (typeof values[key] !== 'string' || !values[key]) report(`${f.id}: fixture identity ${key} missing`);
        if (values.tenant_id !== 'cms-fictional-tenant') report(`${f.id}: fixture tenant must be explicitly fictional`);
        for (const [key, value] of Object.entries(values)) {
          const def = field(row.entity, key), extension = extensions.get(`${row.entity}.${key}`);
          if (!declared.fields.includes(key) || !def) report(`${f.id}: unknown fixture field ${row.entity}.${key}`);
          else if (!sampleType(value, def.type) || def.enumValues && value !== null && ![...def.enumValues, ...(extension?.enumValues ?? [])].includes(value)) report(`${f.id}: fixture type/enum mismatch ${row.entity}.${key}`);
        }
      }
    }
    for (const state of nonempty(p.states, `${p.code} states`)) if (!samples.some(f => f?.state === state)) report(`${p.code}: no fixture for declared sample state ${state}`);
  }
  return errors;
}

function check(root) {
  const load = path => { const absolute = resolve(root, path); if (relative(root, absolute).startsWith('..')) throw Error('outside root'); return readFileSync(absolute, 'utf8'); };
  const inventory = schemaInventory(load('src/data/schema.ts'));
  const fixtures = parseData(load('src/cms/fixtures.ts'));
  const files = readdirSync(resolve(root, 'src/cms/features')).filter(path => path.endsWith('.ts')).sort();
  if (!files.length) throw Error('no covered feature manifests');
  if (new Set(fixtures.map(f => f.id)).size !== fixtures.length) throw Error('duplicate fixture id');
  const features = files.map(file => parseData(load(`src/cms/features/${file}`)));
  const errors = [], ids = new Set(), pages = new Set();
  for (const feature of features) {
    if (ids.has(feature.id)) errors.push(`duplicate feature ${feature.id}`);
    ids.add(feature.id);
    for (const page of feature.pages) { if (pages.has(page.code)) errors.push(`duplicate registered page ${page.code}`); pages.add(page.code); }
    errors.push(...validateFeature(feature, fixtures, load, inventory));
  }
  return { errors, features, pages: pages.size, fixtures, load, inventory };
}

function selfTest() {
  // Explicit in-memory catalog/files: independent of which feature branches are installed.
  const schema = "export const tables = [\n  { name: 'samples', group: 'system', columns: [{ name: 'status', type: 'enum', enum: ['pending','approved'] }, { name: 'amount', type: 'int' }] },\n];";
  const files = new Map([
    ['src/routes.ts', "{ path: '/samples', spec: sampleSpec }"],
    ['src/spec.ts', "export const sampleSpec = {code:'X-01',data:['samples']};"],
    ['src/Page.tsx', 'export function SamplePage() {}'],
    ['scripts/test-samples.mjs', '// Actual MockProvider test reference for this synthetic checker fixture.'],
  ]);
  const load = path => { if (!files.has(path)) throw Error('missing'); return files.get(path); };
  const feature = {id:'sample',revision:1,backendMapping:'pending',subscription:'local-events',tenantField:'tenant_id',identityField:'id',actorScope:'fictional actor',sources:[...files].filter(([path])=>path.startsWith('src/')).map(([path,text])=>({path,sha256:sha(text)})),adapterTests:[{path:'scripts/test-samples.mjs',sha256:sha(load('scripts/test-samples.mjs')),verifies:'synthetic provider reference'}],entities:[{name:'samples',fields:[...Object.keys(baseFields),'status','amount'],usage:['read']}],mockExtensions:[],pages:[{code:'X-01',route:'/samples',routeSource:'src/routes.ts',routeSpec:'sampleSpec',specSource:'src/spec.ts',specAnchor:'export const sampleSpec',specEntities:['samples'],componentSource:'src/Page.tsx',componentExport:'SamplePage',viewKind:'review-list',views:[{key:'list',entity:'samples',kind:'list',config:{sorts:[{column:'created_at',dir:'desc'}]}}],states:['pending'],fixtureIds:['sample-pending']}]};
  const fixtures=[{id:'sample-pending',feature:'sample',page:'X-01',state:'pending',rows:[{entity:'samples',values:{id:'cms-fictional-row',tenant_id:'cms-fictional-tenant',created_at:'2026-10-24T12:00:00Z',updated_at:'2026-10-24T12:00:00Z',status:'pending',amount:10}}]}];
  for (const test of feature.adapterTests) test.reviewedSourceDigest=sourceDigest(feature.sources);
  for (const fixture of fixtures) fixture.sourceDigest=sourceDigest(feature.sources);
  const inventory=schemaInventory(schema), validate=(f=feature,s=fixtures)=>validateFeature(f,s,load,inventory);
  assert.deepEqual(validate(),[]);
  const cases=[
    f=>{f.sources[0].sha256='0'.repeat(64);},
    f=>{f.entities[0].name='unknown';},
    f=>{f.entities[0].fields.push('unknown');},
    f=>{f.pages[0].route='/missing';},
    f=>{f.pages[0].specEntities=[];},
    f=>{f.pages[0].views[0].config.sorts[0].column='unknown';},
    f=>{f.pages[0].fixtureIds=['missing'];},
    f=>{f.pages[0].states.push('missing');},
    f=>{f.adapterTests=[];},
    f=>{f.backendMapping='connected';},
    f=>{f.adapterTests[0].reviewedSourceDigest='0'.repeat(64);},
    f=>{f.mockExtensions=[{entity:'samples',field:'extra',type:'json',source:'src/missing.ts',reason:'pending'}];},
  ];
  for(const mutate of cases){const copy=structuredClone(feature);mutate(copy);assert(validate(copy).length>0);}
  for(const mutate of [s=>{s[0].rows[0].values.status='invented';},s=>{s[0].rows[0].values.amount='wrong';},s=>{s[0].rows[0].values.tenant_id='real';},s=>{s[0].page='wrong';},s=>{s[0].sourceDigest='0'.repeat(64);}]){const copy=structuredClone(fixtures);mutate(copy);assert(validate(feature,copy).length>0);}
  const before=files.get('src/Page.tsx');files.set('src/Page.tsx',before+' // changed helper/consumer');assert(validate().some(e=>e.includes('source drift')));files.set('src/Page.tsx',before);
  files.delete('scripts/test-samples.mjs');assert(validate().some(e=>e.includes('missing source/test')));
  assert.throws(()=>parseData('no data block'));
  console.log(`PASS CMS checker: valid isolated contract and ${cases.length+8} negative/source-drift cases; no application tests executed.`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
 if (process.argv.includes('--self-test')) selfTest();
 else {
  try {
    const rootIndex=process.argv.indexOf('--root'), root=resolve(rootIndex>=0?process.argv[rootIndex+1]:process.cwd());
    const result=check(root);
    if(result.errors.length){console.error(result.errors.map(e=>`FAIL ${e}`).join('\n'));process.exitCode=1;}
    else console.log(`PASS CMS contract inventory: ${result.features.length} adopted feature groups, ${result.pages} page definitions. Backend mapping pending; runtime/provider tests are referenced, not executed.`);
  } catch(error){console.error(`FAIL CMS contract inventory: ${error.message}`);process.exitCode=1;}
 }
}
