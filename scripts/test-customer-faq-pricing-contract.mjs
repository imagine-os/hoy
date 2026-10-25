// Source-only customer FAQ drift. Existing Home and FAQ projection checks remain independent.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { readPricingContract, sharedPricing } from './test-public-home-pricing-contract.mjs';
const load = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const parse = path => ts.createSourceFile(path, load(path), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const name = node => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : undefined;
const prop = (node, key) => node && ts.isObjectLiteralExpression(node) ? node.properties.find(p => ts.isPropertyAssignment(p) && name(p.name) === key)?.initializer : undefined;
function walk(node, visit) { visit(node); ts.forEachChild(node, child => walk(child, visit)); }
function variable(file, key) { let result; walk(file, n => { if (ts.isVariableDeclaration(n) && name(n.name) === key) result = n.initializer; }); assert(result, `Missing ${key}`); return result; }
const faq = readPricingContract('src/modules/website/faqPricing.contract.ts', 'FAQ_PRICING_CONTRACT', { PUBLISHED_PRICING_CONTRACT: sharedPricing });
const symbol = 'CUSTOMER_FAQ_PRICING_CONTRACT';
const contract = readPricingContract('src/modules/customer/faqPricing.contract.ts', symbol, { FAQ_PRICING_CONTRACT: faq });
assert.deepEqual(contract.featureIds, ['AD-01']);
assert.deepEqual(contract.pages, ['C-14', 'C-15']);
assert.deepEqual(contract.views, ['generated-prices']);
assert.deepEqual(contract.tables, faq.tables);
assert.deepEqual(contract.inputs, faq.inputs);
assert.deepEqual(contract.families, faq.families);
assert.equal(contract.backendMapping, 'pending');
assert.equal(contract.subscription, 'local-events');
assert.deepEqual(contract.faqRead, { table: 'faq_entries', tenantField: 'tenant_id', publishedField: 'published', published: true, orderField: 'sort', pageField: 'page' });

const schema = parse('src/data/schema.ts');
const base = variable(schema, 'BASE_COLUMNS');
assert(ts.isArrayLiteralExpression(base));
for (const [tableName, fields] of Object.entries(contract.inputs)) {
  let table;
  walk(schema, n => { const id = prop(n, 'name'); if (id && ts.isStringLiteral(id) && id.text === tableName && prop(n, 'columns')) table = n; });
  assert(table, `Unknown input ${tableName}`);
  const columns = prop(table, 'columns');
  assert(ts.isArrayLiteralExpression(columns));
  const declared = new Set([...base.elements, ...columns.elements].flatMap(n => { const id = prop(n, 'name'); return id && ts.isStringLiteral(id) ? [id.text] : []; }));
  for (const field of fields) assert(declared.has(field) || tableName === 'plans' && ['frontend_catalog', 'frontend_publication'].includes(field), `Unknown ${tableName}.${field}`);
}
function imports(path, imported, module) {
  return parse(path).statements.some(s => ts.isImportDeclaration(s) && s.moduleSpecifier.text.endsWith(module) && s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings) && s.importClause.namedBindings.elements.some(e => name(e.propertyName ?? e.name) === imported));
}
for (const path of ['src/modules/customer/specs.ts', 'src/modules/customer/pages/FaqPage.tsx']) assert(imports(path, symbol, '/faqPricing.contract'), `${path} lost customer contract`);
const specs = parse('src/modules/customer/specs.ts');
const exported = variable(specs, 'canvasSpecs');
for (const code of contract.pages) {
  const call = prop(exported, code);
  assert(call && ts.isCallExpression(call), `${code} spec missing`);
  const entry = call.arguments[1];
  const data = prop(entry, 'data');
  assert(data && ts.isArrayLiteralExpression(data) && data.elements.some(e => ts.isSpreadElement(e) && e.expression.getText(specs) === `${symbol}.tables`), `${code} data must use customer FAQ tables`);
}
const routes = load('src/modules/customer/index.ts');
for (const [route, code] of [['/app/faq', 'C-14'], ['/app/faq/2', 'C-15']]) assert(routes.split('\n').some(line => line.includes(`'${route}'`) && line.includes(`canvasSpecs['${code}']`) && line.includes("page('FaqPage'")), `${code} route/component binding missing`);
const page = parse('src/modules/customer/pages/FaqPage.tsx');
let read;
walk(page, n => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'useCustomerRows') read = n; });
assert(read && read.arguments[0]?.getText(page) === `${symbol}.faqRead.table`, 'FAQ lost actual customer read/table binding');
const query = read.arguments[1];
assert(prop(prop(query, 'where'), 'published')?.kind === ts.SyntaxKind.TrueKeyword, 'FAQ must request only published content');
assert.equal(prop(prop(query, 'orderBy'), 'column')?.text, contract.faqRead.orderField);
const body = load('src/modules/customer/pages/FaqPage.tsx');
assert(/\.page\s*===\s*page/.test(body), 'Existing FAQ page selection missing');
assert(imports('src/modules/customer/pages/FaqPage.tsx', 'renderFaqPricing', '/faqPricingView'), 'Customer lost shared generated renderer');
assert(body.includes('FaqAnswer') && body.includes('renderPricing'), 'Customer answer must render generated directives, not raw answer text');
const view = load('src/modules/website/faqPricingView.tsx');
for (const binding of ['renderFaqPricing', 'faqPricingLabel', 'faqPrices', 'PriceTable']) assert(view.includes(binding), `Shared view missing ${binding}`);
assert(/useFaqPricing|usePublishedPricingRows/.test(body), 'Customer lost shared pricing reader');
const alias = load('src/modules/website/useFaqPricing.ts');
assert(alias.includes('usePublishedPricingRows') && !/\buse(?:State|Effect|Data)\b/.test(alias), 'FAQ reader must reuse one core');

// Preserve existing helper scope/lifecycle; no new server-authorization claim or stronger policy.
const customerRead = load('src/modules/customer/useCustomerRows.ts');
assert(/tenant_id:\s*tenant\.id/.test(customerRead), 'Existing customer query tenant scope missing');
assert(customerRead.includes('user.id') && customerRead.includes('state?.data === data') && customerRead.includes('request === generation'), 'Existing actor/provider/latest-read guard missing');
assert(customerRead.includes('stop()'), 'Customer subscription cleanup missing');

// References bind real synthetic fixtures and rendered tests; this command does not run them.
const fixturePath = 'scripts/customer-faq-pricing-fixture.mjs';
const fixture = load(fixturePath);
assert(imports(fixturePath, 'faqPricingFixture', '/faq-pricing-fixture.mjs'), 'Customer fixture must import the actual shared FAQ fixture');
function calls(path, target) {
  let found = false;
  walk(parse(path), node => { if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === target) found = true; });
  return found;
}
assert(calls(fixturePath, 'faqPricingFixture'), 'Customer fixture must call its imported shared fixture');
const baseFixturePath = 'scripts/faq-pricing-fixture.mjs';
const baseFixture = load(baseFixturePath);
assert(baseFixture.includes('MockProvider') && baseFixture.includes('new MockProvider()') && baseFixture.includes('src/data/MockProvider'), 'Shared fixture must instantiate the actual provider seed');
assert(baseFixture.includes('faq_entries') && /published:\s*true/.test(baseFixture) && /published:\s*false/.test(baseFixture), 'Shared fixture must retain actual published/private FAQ shapes');
assert(fixture.includes('faq_entries'), 'Customer fixture must extend actual FAQ rows');
// Validate top-level fields in actual FAQ fixture pushes and the customer row assignment.
for (const path of [baseFixturePath, fixturePath]) {
  const file = parse(path);
  const checkRow = row => {
    assert(ts.isObjectLiteralExpression(row));
    for (const property of row.properties) {
      if (ts.isSpreadAssignment(property)) continue;
      assert(contract.inputs.faq_entries.includes(name(property.name)), `Undeclared fixture FAQ field ${name(property.name)}`);
    }
  };
  walk(file, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.name.text === 'push' && node.expression.expression.getText(file).endsWith('.faq_entries')) for (const row of node.arguments) checkRow(row);
    if (node.expression.getText(file) === 'Object.assign' && node.arguments[0]?.getText(file) === 'first') checkRow(node.arguments[1]);
  });
}
const harnessPath = 'scripts/customer-faq-pricing-harness.tsx';
const harness = load(harnessPath);
assert(harness.includes('FaqPage') && harness.includes('DataProviderRoot'), 'Harness must mount actual customer page/provider');
for (const [command, module] of [['saveLocalProduct', '/data/catalogRevision'], ['changeLocalPublication', '/data/catalogPublication']]) {
  assert(imports(harnessPath, command, module) && calls(harnessPath, command), `Harness must import and call actual ${command}`);
}
assert(load('src/data/catalogRevision.ts').includes('data.atomic') && load('src/data/catalogRevision.ts').includes('frontend_catalog'), 'Actual draft command model missing');
assert(load('src/data/catalogPublication.ts').includes('data.atomic') && load('src/data/catalogPublication.ts').includes('frontend_publication'), 'Actual publication command model missing');
const lifecycle = load('scripts/test-customer-faq-pricing-ui.mjs');
assert(lifecycle.includes('customer-faq-pricing') && /assert\b/.test(lifecycle), 'Customer UI test binding missing');
const native = load('scripts/test-customer-faq-pricing-production.mjs');
assert(native.includes('/app/faq') && /assert\b/.test(native), 'Customer production route assertions missing');
console.log('PASS AD-01 customer FAQ contract: schema, C-14/C-15 specs/routes, existing scoped read, shared pricing/render and synthetic test bindings. Runtime tests not executed.');
