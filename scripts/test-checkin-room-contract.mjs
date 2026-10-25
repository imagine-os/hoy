// Source-only S-02 display contract check. Runtime results remain separate evidence.
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
function variable(file, key) { let value; walk(file, n => { if (ts.isVariableDeclaration(n) && name(n.name) === key) value = n.initializer; }); assert(value, `Missing ${key}`); return value; }
function literal(node) {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression);
  if (ts.isStringLiteral(node)) return node.text;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(n => { assert(ts.isPropertyAssignment(n)); return [name(n.name), literal(n.initializer)]; }));
  throw Error('S-02 room inventory must be literal');
}
const contractPath = 'src/modules/staff/checkinRoom.contract.ts';
const contract = literal(variable(parse(contractPath), 'CHECKIN_ROOM_CONTRACT'));
assert.deepEqual(contract.featureIds, ['AD-01']);
assert.deepEqual(contract.pages, ['S-02']);
assert.equal(contract.route, '/staff/checkin');
assert.equal(contract.table, 'rooms');
assert.deepEqual(contract.tables, ['rooms']);
assert.deepEqual(contract.states, ['idle', 'loading', 'ready', 'unavailable', 'error']);
assert.equal(contract.writes, false);
assert.equal(contract.mode, 'retained-reference-label');
assert.equal(contract.view, 'selected-class-room-label');
assert.equal(contract.backendMapping, 'pending');
assert.equal(contract.subscription, 'local-events');
const inventory = schemaInventory(load('src/data/schema.ts'));
for (const field of contract.dataFields) assert(inventory.get(contract.table)?.has(field), `Unknown room field ${field}`);
for (const field of contract.sessionFields) assert(inventory.get('class_sessions')?.has(field), `Unknown selection field ${field}`);
assert(contract.dataFields.includes(contract.identityField) && contract.dataFields.includes(contract.tenantField));

const helperPath = 'src/modules/staff/checkinRoom.ts', readerPath = 'src/modules/staff/useCheckinRoom.ts';
const helper = parse(helperPath), reader = parse(readerPath);
for (const source of [helper, reader]) walk(source, n => {
  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) assert(!['insert', 'update', 'remove', 'atomic'].includes(n.expression.name.text), 'Room label helper/reader must not mutate data');
});
const helperSource = load(helperPath);
for (const field of contract.dataFields) assert(helperSource.includes(`row.${field}`), `Room validator lost ${field}`);
let roleList;
walk(helper, n => { if (ts.isArrayLiteralExpression(n) && n.elements.every(ts.isStringLiteral) && n.elements.some(e => e.text === 'front_desk')) roleList = n.elements.map(e => e.text); });
assert.deepEqual(roleList, contract.roles, 'Display roles drifted from the contract');
const routes = load('src/modules/staff/index.ts');
assert(routes.split('\n').some(line => line.includes(`'${contract.route}'`) && line.includes('spec: S02') && line.includes("page('CheckinPage')") && line.includes('roles: desk')), 'S-02 route/component/role binding missing');
const routeFile = parse('src/modules/staff/index.ts');
assert.deepEqual(literal(variable(routeFile, 'desk')), contract.roles, 'Display roles differ from actual route roles');
let actualRead;
walk(reader, n => { if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'list') actualRead = n; });
assert.equal(actualRead?.arguments[0]?.text, contract.table);
const where = prop(actualRead?.arguments[1], 'where');
assert.equal(name(prop(where, contract.identityField)), 'roomId');
assert.equal(name(prop(where, contract.tenantField)), 'tenantId');
const readerSource = load(readerPath);
for (const field of contract.sessionFields) assert(readerSource.includes(`selected?.${field}`), `Reader scope lost selection ${field}`);
for (const binding of ['canReadCheckinRoom', 'checkinRoomName', 'current.current', 'request === generation', '.catch(', 'off?.()', 'retry']) assert(readerSource.includes(binding), `Reader lost ${binding} lifecycle binding`);
walk(reader, n => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) assert(n.expression.text !== 'useTable', 'Room label must not call generic useTable'); });
const page = load('src/modules/staff/CheckinPage.tsx');
assert(page.includes('useCheckinRoom(data, selected?.session, user.id, role, tenant.id)'), 'Actual selected session/actor/provider not bound to room reader');
assert(page.includes('data-checkin-room={room.status}') && page.includes('room.name') && page.includes('room.retry'), 'Selected-class label/status/retry rendering missing');
for (const state of ['ready', 'loading', 'unavailable', 'error']) assert(page.includes(`room.status === '${state}'`), `UI state ${state} missing`);
const specs = parse('src/modules/staff/specs.ts');
const s02 = variable(specs, 'S02');
assert(ts.isCallExpression(s02));
const data = prop(s02.arguments[0], 'data');
assert(data && ts.isArrayLiteralExpression(data) && data.elements.some(n => n.text === contract.table), 'S-02 spec missing rooms');

const descriptor = parseData(load('src/cms/features/ad01-content-propagation.ts'));
const fixtures = parseData(load('src/cms/fixtures.ts'));
assert(descriptor.revision >= 3 && descriptor.pages.length >= 13 && fixtures.length >= 40, 'Prior PR110 inventory must be preserved');
const registered = descriptor.pages.find(p => p.code === 'S-02');
assert(registered?.specEntities.includes(contract.table) && registered.views.length === 0, 'S-02 mapping/table preferences drift');
for (const field of contract.dataFields) assert(descriptor.entities.find(e => e.name === contract.table)?.fields.includes(field), `CMS room field ${field} missing`);
for (const source of [contractPath, helperPath, readerPath]) assert(descriptor.sources.some(s => s.path === source), `CMS fingerprint missing ${source}`);
const samples = registered.fixtureIds.map(id => fixtures.find(f => f.id === id));
for (const term of ['loading', 'ready', 'missing', 'error', 'foreign', 'duplicate', 'legacy', 'unpublished', 'actor', 'provider']) assert(samples.some(f => f?.state.toLowerCase().includes(term)), `S-02 sample ${term} missing`);

const domainPath = 'scripts/test-checkin-room.mjs', uiPath = 'scripts/test-checkin-room-ui.mjs', nativePath = 'scripts/test-checkin-room-production.mjs';
for (const test of [domainPath, uiPath, nativePath, 'scripts/test-checkin-room-contract.mjs']) assert(descriptor.adapterTests.some(t => t.path === test), `CMS adapter reference missing ${test}`);
const domain = load(domainPath);
assert(domain.includes('checkinRoom') && /assert\b/.test(domain), 'Domain test lost actual room validator');
const fixture = load('scripts/checkin-room-fixture.mjs');
assert(fixture.includes('rooms') && /MockProvider|admissionFixture/.test(fixture), 'Synthetic fixture must bind actual room/provider rows');
const harness = load('scripts/checkin-room-harness.tsx');
assert(/CheckinPage|useCheckinRoom/.test(harness) && /DataProviderRoot|MockProvider/.test(harness), 'Harness must exercise actual reader/page');
for (const path of [uiPath, nativePath]) assert(/assert\b/.test(load(path)) && /checkin-room|staff\/checkin/.test(load(path)), `Test ${path} missing real fixture/route binding`);
console.log('PASS AD-01 S-02 room-label contract: schema, actual read-only scoped reader/rendering, roles/spec/CMS and test bindings. Runtime tests not executed.');
