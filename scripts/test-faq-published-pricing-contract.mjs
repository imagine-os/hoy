// Source-only generated FAQ inventory. The imported check also preserves the Home bindings.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { readPricingContract, sharedPricing } from './test-public-home-pricing-contract.mjs';
const load = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const parse = path => ts.createSourceFile(path, load(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const name = node => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : undefined;
const prop = (node, key) => node && ts.isObjectLiteralExpression(node) ? node.properties.find(p => ts.isPropertyAssignment(p) && name(p.name) === key)?.initializer : undefined;
function walk(node, visit) { visit(node); ts.forEachChild(node, child => walk(child, visit)); }
function variable(file, key) { let result; walk(file, n => { if (ts.isVariableDeclaration(n) && name(n.name) === key) result = n.initializer; }); assert(result, `Missing ${key}`); return result; }
const symbol = 'FAQ_PRICING_CONTRACT';
const contract = readPricingContract('src/modules/website/faqPricing.contract.ts', symbol, { PUBLISHED_PRICING_CONTRACT: sharedPricing });
assert.deepEqual(contract.featureIds, ['SW-02']);
assert.deepEqual(contract.pages, ['W-10']);
assert.deepEqual(contract.tables, ['faq_entries', ...sharedPricing.tables]);
assert.deepEqual(contract.views, ['generated-prices', 'search', 'json-ld']);
for (const field of sharedPricing.dataFields) assert(contract.inputs.plans.includes(field), `FAQ lost shared plan input ${field}`);
assert.equal(contract.backendMapping, 'pending');
assert.equal(contract.subscription, 'local-events');

const schema = parse('src/data/schema.ts');
const base = variable(schema, 'BASE_COLUMNS');
assert(ts.isArrayLiteralExpression(base));
for (const [tableName, fields] of Object.entries(contract.inputs)) {
  let table;
  walk(schema, n => { const id = prop(n, 'name'); if (id && ts.isStringLiteral(id) && id.text === tableName && prop(n, 'columns')) table = n; });
  assert(table, `Unknown input table ${tableName}`);
  assert(ts.isArrayLiteralExpression(prop(table, 'columns')));
  const available = new Set([...base.elements, ...prop(table, 'columns').elements].flatMap(n => { const id = prop(n, 'name'); return id && ts.isStringLiteral(id) ? [id.text] : []; }));
  for (const field of fields) assert(available.has(field) || tableName === sharedPricing.table && sharedPricing.dataFields.includes(field), `Unknown ${tableName}.${field}`);
}
// Check actual projection reads, including fields outside the old declared inventory.
function assertProjectionInputs(fields, file) {
  walk(file, node => {
    const access = ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node);
    if (!access || !ts.isIdentifier(node.expression) || !['plan', 'row'].includes(node.expression.text)) return;
    const field = ts.isPropertyAccessExpression(node) ? node.name.text
      : node.argumentExpression && ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : null;
    assert(field, 'Dynamic plan/row indexing requires explicit projection inventory review');
    assert(fields.includes(field), `Projection field plans.${field} absent from FAQ contract`);
  });
}
const projection = parse('src/modules/website/faqPricing.ts');
assertProjectionInputs(contract.inputs.plans, projection);
// The actual legacy fallback reads active: the former shared-only input list must fail.
assert.throws(() => assertProjectionInputs(sharedPricing.dataFields, projection), /plans\.active absent/);
const pricing = parse('src/tenant/pricing.ts');
const labels = variable(pricing, 'FAMILY_LABEL');
assert(ts.isObjectLiteralExpression(labels));
const families = new Set(labels.properties.map(p => name(p.name)));
for (const family of contract.families) assert(families.has(family), `Unknown price family ${family}`);
const directives = [...load('src/data/seed/content.ts').matchAll(/\{\{pricing:([a-z_,]+)\}\}/g)].map(m => m[1]);
assert.deepEqual([...new Set(directives)].sort(), ['bienvenida,paquetes,privadas', 'regalos']);
for (const directive of directives) for (const family of directive.split(',')) assert(contract.families.includes(family), `Seed directive ${family} missing from FAQ inventory`);

function imports(path, imported, module) {
  return parse(path).statements.some(s => ts.isImportDeclaration(s) && s.moduleSpecifier.text.endsWith(module) && s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings) && s.importClause.namedBindings.elements.some(e => name(e.propertyName ?? e.name) === imported));
}
assert(imports('src/modules/website/faqPricing.contract.ts', 'PUBLISHED_PRICING_CONTRACT', '/publishedPricing.contract'));
for (const path of ['src/modules/website/faqPricing.ts', 'src/modules/website/specs.ts']) assert(imports(path, symbol, '/faqPricing.contract'), `${path} lost FAQ contract import`);
const alias = load('src/modules/website/useFaqPricing.ts');
assert(alias.includes('usePublishedPricingRows'), 'FAQ lost shared reader binding');
assert(!/\buse(?:State|Effect|Data)\b/.test(alias), 'FAQ must not introduce a duplicate catalog reader');
const specs = parse('src/modules/website/specs.ts');
const call = prop(variable(specs, 'siteSpecs'), 'faq');
assert(call && ts.isCallExpression(call));
const definition = call.arguments[0];
assert.equal(prop(definition, 'code')?.text, 'W-10');
const data = prop(definition, 'data');
assert(data && ts.isArrayLiteralExpression(data) && data.elements.some(e => ts.isSpreadElement(e) && e.expression.getText(specs) === `${symbol}.tables`), 'W-10 data must bind FAQ tables');
const page = load('src/modules/website/pages/FaqPage.tsx');
for (const seam of ['faqPrices', 'renderPricing', 'useFaqJsonLd']) assert(page.includes(seam), `W-10 missing ${seam} projection seam`);
assert(/prices\.(?:rows|status|date)/.test(page), 'W-10 must consume current pricing read state');
assert(load('src/components/molecule/FaqAnswer/FaqAnswer.tsx').includes('renderPricing'), 'Optional generated renderer missing');

// Bind actual synthetic fixture and UI tests, without running them or claiming their outcomes.
const domain = load('scripts/test-faq-published-pricing.mjs');
assert(domain.includes('faqPricing') && domain.includes('frontend_publication') && /assert\b/.test(domain), 'Domain fixtures lost actual published FAQ projection');
const lifecycle = load('scripts/test-faq-published-pricing-ui.mjs');
assert(/useFaqPricing|usePublishedPricingRows|faq-pricing-harness/.test(lifecycle) && /assert\b/.test(lifecycle), 'FAQ lifecycle test lost real reader/harness linkage');
const native = load('scripts/test-faq-published-pricing-production.mjs');
assert(native.includes('/site/faq') && /assert\b/.test(native), 'FAQ native test lost actual public FAQ assertions');
console.log('PASS W-10 generated pricing contract: schema, seed families, shared reader, spec, render/search/JSON-LD and test bindings. Runtime tests not executed.');
