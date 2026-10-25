// Source-only SW-02 drift check. Runtime/domain checks remain separate required evidence.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const load = path => readFileSync(resolve(root, path), 'utf8');
const ast = path => ts.createSourceFile(path, load(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const name = node => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : undefined;
const prop = (node, key) => node && ts.isObjectLiteralExpression(node)
  ? node.properties.find(p => ts.isPropertyAssignment(p) && name(p.name) === key)?.initializer : undefined;
function walk(node, visit) { visit(node); ts.forEachChild(node, child => walk(child, visit)); }
function variable(file, key) {
  let found;
  walk(file, node => { if (ts.isVariableDeclaration(node) && name(node.name) === key) found = node.initializer; });
  assert(found, `Missing declaration ${key}`);
  return found;
}
function literal(node) {
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => {
    assert(ts.isPropertyAssignment(p), 'Contract must use explicit literal properties');
    return [name(p.name), literal(p.initializer)];
  }));
  throw Error('Contract inventory must remain literal');
}
const symbol = 'PUBLIC_HOME_PRICING_CONTRACT';
const contract = literal(variable(ast('src/modules/website/publicHomePricing.contract.ts'), symbol));
assert.deepEqual(contract.featureIds, ['SW-02']);
assert.deepEqual(contract.pages, ['W-01']);
assert.equal(contract.view, 'public-offers');
assert.equal(contract.backendMapping, 'pending');
assert.equal(contract.subscription, 'local-events');
assert.deepEqual(contract.refresh, { clock: 'studio-date', events: ['midnight', 'focus', 'visibilitychange'], cleanup: true });
assert.deepEqual(contract.tables, [contract.table]);
assert.deepEqual(contract.items, ['trial', 'pack12', 'private']);

// Validate the real declarative schema, not a second copy of its field inventory.
const schema = ast('src/data/schema.ts');
let table;
walk(schema, node => { if (ts.isObjectLiteralExpression(node) && prop(node, 'name') && ts.isStringLiteral(prop(node, 'name')) && prop(node, 'name').text === contract.table && prop(node, 'columns')) table = node; });
assert(table, `Contract table ${contract.table} absent from schema`);
const baseColumns = variable(schema, 'BASE_COLUMNS');
assert(ts.isArrayLiteralExpression(baseColumns), 'BASE_COLUMNS shape changed; review schema binding');
assert(ts.isArrayLiteralExpression(prop(table, 'columns')), 'Plan columns shape changed; review schema binding');
const schemaFields = new Set([...baseColumns.elements, ...prop(table, 'columns').elements].flatMap(column => {
  const field = prop(column, 'name');
  return field && ts.isStringLiteral(field) ? [field.text] : [];
}));
assert(schemaFields.has(contract.tenantField), 'Tenant field absent from actual schema');
assert(schemaFields.has('id'), 'Plan identity absent from actual schema');
const catalog = ast('src/data/productCatalog.ts');
let catalogPlan;
walk(catalog, node => { if (ts.isTypeAliasDeclaration(node) && name(node.name) === 'CatalogPlan') catalogPlan = node; });
assert(catalogPlan && ts.isIntersectionTypeNode(catalogPlan.type), 'CatalogPlan extension shape changed');
assert(catalogPlan.type.types.some(t => ts.isTypeReferenceNode(t) && t.typeName.getText(catalog) === 'PlanRow'), 'CatalogPlan must retain actual PlanRow');
const typedExtensions = new Map(catalogPlan.type.types.filter(ts.isTypeLiteralNode).flatMap(t => t.members.map(m => [name(m.name), m])));
const pendingExtensions = new Map([['frontend_catalog', 'CatalogDraft'], ['frontend_publication', 'CatalogPublication']]);
for (const field of contract.dataFields) {
  if (schemaFields.has(field)) continue;
  const member = typedExtensions.get(field);
  assert(member?.questionToken && pendingExtensions.get(field) === member.type?.getText(catalog), `Unmapped optional browser field ${field}`);
}
assert(contract.dataFields.includes(contract.tenantField));
assert(contract.dataFields.includes(contract.snapshotField));
assert.equal(typedExtensions.get(contract.snapshotField)?.type?.getText(catalog), 'CatalogPublication');
assert(/export interface CatalogPublication\b/.test(load('src/data/catalogPublication.ts')), 'Published snapshot type missing');

function importsContract(path) {
  const file = ast(path);
  return file.statements.some(s => ts.isImportDeclaration(s) && s.moduleSpecifier.text.endsWith('/publicHomePricing.contract') &&
    s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings) && s.importClause.namedBindings.elements.some(e => name(e.propertyName ?? e.name) === symbol));
}
for (const path of ['src/modules/website/publicHomePricing.ts', 'src/modules/website/usePublicHomePricing.ts', 'src/modules/website/specs.ts']) assert(importsContract(path), `${path} must bind the shared contract`);
assert(load('src/modules/website/publicHomePricing.ts').includes(`${symbol}.items`), 'Helper item type lost its contract binding');
// Actual row/plan fields consumed by the projection must remain represented in its inventory.
walk(ast('src/modules/website/publicHomePricing.ts'), node => {
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && ['row', 'plan'].includes(node.expression.text)) {
    const field = node.name.text;
    if (schemaFields.has(field) || typedExtensions.has(field)) assert(contract.dataFields.includes(field), `Projection field ${field} absent from contract`);
  }
});

const hook = load('src/modules/website/usePublicHomePricing.ts');
for (const field of ['table', 'tenantField']) assert(hook.includes(`${symbol}.${field}`), `Hook lost ${field} binding`);
const specs = ast('src/modules/website/specs.ts');
const homeCall = prop(variable(specs, 'siteSpecs'), 'home');
assert(homeCall && ts.isCallExpression(homeCall), 'W-01 spec binding changed');
const home = homeCall.arguments[0];
assert.equal(literal(prop(home, 'code')), 'W-01');
const data = prop(home, 'data');
assert(data && ts.isArrayLiteralExpression(data) && data.elements.some(e => ts.isSpreadElement(e) && e.expression.getText(specs) === `${symbol}.tables`), 'W-01 data must include the contract tables');
for (const page of ['HomePage', 'ClassicHomePage']) assert(load(`src/modules/website/pages/${page}.tsx`).includes('usePublicHomePricing'), `${page} missing actual pricing hook`);

// Fixture/test links are checked without executing application code or pretending they passed.
const domain = load('scripts/test-public-home-pricing.mjs');
assert(domain.includes('publicHomePricing') && domain.includes('frontend_publication') && /assert\b/.test(domain), 'Domain check must bind actual helper, synthetic publication fixture and assertions');
const lifecycle = load('scripts/test-public-home-pricing-ui.mjs');
assert(/usePublicHomePricing|public-home-pricing-harness/.test(lifecycle) && /assert\b/.test(lifecycle), 'Lifecycle check must bind actual hook/harness and assertions');
const native = load('scripts/test-public-home-pricing-native.mjs');
assert(native.includes('/admin/products') && native.includes('/site') && /assert\b/.test(native), 'Native check must bind actual admin publication and public page assertions');
console.log('PASS SW-02 Home contract: schema/typed extensions, helper/hook, W-01 data and synthetic test bindings; backend mapping pending. Runtime tests not executed.');
