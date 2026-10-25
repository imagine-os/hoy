// Source-only AD-01 room-publication drift; execution evidence belongs to adapter/UI tests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { parseData, schemaInventory } from './check-cms-contracts.mjs';
const load = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const parse = path => ts.createSourceFile(path, load(path), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const name = node => node && (ts.isIdentifier(node) || ts.isStringLiteral(node)) ? node.text : undefined;
const prop = (node, key) => node && ts.isObjectLiteralExpression(node) ? node.properties.find(p => ts.isPropertyAssignment(p) && name(p.name) === key)?.initializer : undefined;
function walk(node, visit) { visit(node); ts.forEachChild(node, child => walk(child, visit)); }
function variable(file, key) { let found; walk(file, n => { if (ts.isVariableDeclaration(n) && name(n.name) === key) found = n.initializer; }); assert(found, `Missing ${key}`); return found; }
function literal(node) {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => { assert(ts.isPropertyAssignment(p)); return [name(p.name), literal(p.initializer)]; }));
  throw Error('Room contract must be literal');
}
const path = 'src/modules/admin/roomPublication.contract.ts';
const contract = literal(variable(parse(path), 'ROOM_PUBLICATION_CONTRACT'));
assert.deepEqual(contract.featureIds, ['AD-01']);
assert.deepEqual(contract.pages, ['M-02', 'M-14', 'S-05', 'S-04']);
assert.equal(contract.table, 'rooms');
assert.deepEqual(contract.tables, [contract.table]);
assert.equal(contract.backendMapping, 'pending');
assert.equal(contract.subscription, 'local-events');
assert.equal(contract.writeScope, 'prospective-only');
assert.equal(contract.newDraftPublished, false);
assert.deepEqual(contract.views, ['catalog-publication', 'prospective-room-selection']);
assert.deepEqual(contract.clientExtension, { field: 'active', type: 'optional-boolean', legacyUndefined: 'published', malformed: 'unavailable' });
const schema = schemaInventory(load('src/data/schema.ts'));
const room = schema.get(contract.table);
assert(room, 'Room table missing');
assert(!room.has(contract.publicationField), 'Client publication must not silently become a SQL/declarative schema column');
for (const field of contract.dataFields) assert(room.has(field) || field === contract.clientExtension.field, `Unknown room field ${field}`);
for (const field of [contract.identityField, contract.tenantField]) assert(room.has(field), `Unknown room identity field ${field}`);
let roomType;
walk(parse('src/data/schema.ts'), n => { if (ts.isInterfaceDeclaration(n) && name(n.name) === 'RoomRow') roomType = n; });
const extension = roomType?.members.find(n => name(n.name) === contract.publicationField);
assert(extension?.questionToken && extension.type?.kind === ts.SyntaxKind.BooleanKeyword, 'RoomRow must declare optional client active:boolean');

function calls(file, targets) {
  let found = false;
  walk(file, n => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && targets.includes(n.expression.text)) found = true; });
  return found;
}
const helper = parse('src/data/roomPublication.ts');
for (const key of ['roomIsPublished', 'requireAssignableRoom']) assert(helper.statements.some(n => (ts.isFunctionDeclaration(n) && name(n.name) === key || ts.isVariableStatement(n) && n.declarationList.declarations.some(d => name(d.name) === key)) && n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)), `Missing actual exported ${key}`);
const consumers = [
  ['src/modules/admin/ContentPage.tsx', ['roomIsPublished']],
  ['src/data/contentBatch.ts', ['roomIsPublished', 'requireAssignableRoom']],
  ['src/data/classRecurrence.ts', ['requireAssignableRoom']],
  ['src/data/sessionEditorial.ts', ['requireAssignableRoom']],
  ['src/modules/classSchedule/pages.tsx', ['roomIsPublished']],
  ['src/modules/staff/RoomsPage.tsx', ['roomIsPublished']],
  ['src/modules/staff/RegisterPage.tsx', ['roomIsPublished']],
  ['src/data/MockProvider.ts', ['requireAssignableRoom']],
];
for (const [source, targets] of consumers) assert(calls(parse(source), targets), `${source} must use actual prospective room helper`);
const admin = parse('src/modules/admin/ContentPage.tsx');
assert.equal(prop(prop(variable(admin, 'BLANK'), 'rooms'), contract.publicationField)?.kind, ts.SyntaxKind.FalseKeyword, 'New room draft must start unpublished');
for (const source of ['src/modules/admin/contentRecovery.ts', 'src/data/contentBatch.ts']) {
  const text = load(source), start = text.indexOf('rooms:');
  assert(start >= 0 && /\bactive\b/.test(text.slice(start, text.indexOf(']', start) + 1)), `${source} room field allowlist lost active`);
}
const recovery = load('src/modules/admin/contentRecovery.ts');
assert(recovery.includes("'active'") && recovery.includes("typeof value !== 'boolean'") && recovery.includes('content.publish') && recovery.includes('content.unpublish'), 'Publication type/audit binding missing');

// Preserve the existing whole-sale staging boundary, rather than adding a financial rewrite.
const register = parse('src/modules/staff/RegisterPage.tsx');
let stagedSale = false;
walk(register, n => {
  if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression) || n.expression.name.text !== 'atomic') return;
  const callback = n.arguments[0];
  if (!callback || !ts.isArrowFunction(callback)) return;
  let payment = false, booking = false, receipt = false;
  walk(callback.body, call => {
    if (!ts.isCallExpression(call)) return;
    if (ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === 'insert') {
      if (call.arguments[0]?.text === 'payments') payment = true;
      if (call.arguments[0]?.text === 'space_bookings') booking = true;
    }
    if (ts.isIdentifier(call.expression) && call.expression.text === 'captureLaunchReceipt') receipt = true;
  });
  stagedSale ||= payment && booking && receipt;
});
assert(stagedSale, 'S-04 payment, receipt and new space booking must remain inside existing atomic boundary');
for (const [source, key] of [['src/modules/admin/specs.ts', 'M02'], ['src/modules/classSchedule/specs.ts', 'scheduleSpec'], ['src/modules/staff/specs.ts', 'S05'], ['src/modules/staff/specs.ts', 'S04']]) {
  const file = parse(source), declaration = variable(file, key);
  const definition = ts.isCallExpression(declaration) ? declaration.arguments[0] : declaration;
  const data = prop(definition, 'data');
  assert(data && ts.isArrayLiteralExpression(data) && data.elements.some(n => ts.isStringLiteral(n) && n.text === contract.table), `${key} spec must declare rooms`);
}
const descriptor = parseData(load('src/cms/features/ad01-content-propagation.ts'));
assert(descriptor.sources.some(s => s.path === path) && descriptor.sources.some(s => s.path === 'src/data/roomPublication.ts'), 'AD-01 descriptor must fingerprint actual contract/helper');
assert(descriptor.entities.find(e => e.name === 'rooms')?.fields.includes(contract.publicationField), 'AD-01 rooms inventory missing client field');
assert(descriptor.mockExtensions.some(e => e.entity === 'rooms' && e.field === contract.publicationField && e.type === 'bool' && e.reason.includes('pending')), 'AD-01 must declare pending browser-only room extension');

const domain = load('scripts/test-room-publication.mjs');
assert(domain.includes('roomPublication') && domain.includes('MockProvider') && /assert\b/.test(domain), 'Domain tests must bind real room helper/provider');
const fixture = load('scripts/room-publication-fixture.mjs');
assert(fixture.includes('rooms') && /MockProvider|admissionFixture/.test(fixture), 'Fixture must bind real room/provider model');
const harness = load('scripts/room-publication-harness.tsx');
assert(/ContentPage|RegisterPage|ClassSchedulePage/.test(harness) && /DataProviderRoot|MockProvider/.test(harness), 'Harness must bind real consumers/provider');
for (const source of ['scripts/test-room-publication-ui.mjs', 'scripts/test-room-publication-production.mjs']) assert(/assert\b/.test(load(source)) && /room-publication|admin\/content/.test(load(source)), `${source} missing actual fixture/route assertions`);
console.log('PASS AD-01 room publication source contract: client extension, prospective callers, whole-sale atomic boundary, specs/CMS and synthetic test bindings. Runtime tests not executed.');
