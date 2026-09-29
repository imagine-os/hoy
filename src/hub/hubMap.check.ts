/**
 * Consistency check for the hub map data: the role facts duplicated in `./hubMap.data.ts` (which must
 * stay import-free for plain node) against `src/auth/roles.ts` + `src/auth/demoUsers.ts`, the card and
 * tool lists against the `hub.enterAs` / `hub.openTool` enums, and the accent against D-01.
 * Returns problems as strings; the app warns in dev (src/app/manifest.ts) and `scripts/gen-hub-map.mjs`
 * fails the build on any.
 */
import { ROLES, ROLE_HOME, ROLE_LABEL, type Role } from '../auth/roles';
import { demoUserByRole } from '../auth/demoUsers';
import { brand } from '../design/tokens';
import { HUB_SURFACES, HUB_TOOLS } from '../modules/hub/specs';
import { HOY_PRODUCT, HUB_EXPERIENCES, HUB_ROLES, HUB_TOOL_LIST } from './hubMap.data';

export function checkHubMapData(): string[] {
  const problems: string[] = [];
  const ids = HUB_ROLES.map((r) => r.id);
  for (const role of ROLES) if (!ids.includes(role)) problems.push(`role ${role} missing from HUB_ROLES`);
  for (const r of HUB_ROLES) {
    if (!(ROLES as readonly string[]).includes(r.id)) { problems.push(`HUB_ROLES has unknown role ${r.id}`); continue; }
    const role = r.id as Role;
    if (r.label.es !== ROLE_LABEL[role].es || r.label.en !== ROLE_LABEL[role].en) problems.push(`role ${role}: label differs from ROLE_LABEL`);
    if (r.home !== ROLE_HOME[role]) problems.push(`role ${role}: home ${r.home} ≠ ROLE_HOME ${ROLE_HOME[role]}`);
    const demo = demoUserByRole(role);
    if (role === 'public') { if (r.demoUser) problems.push('role public: the visitor has no demo user'); }
    else if (!r.demoUser || r.demoUser.id !== demo.id || r.demoUser.firstName !== demo.name.split(' ')[0]) problems.push(`role ${role}: demoUser ≠ ${demo.id} ${demo.name.split(' ')[0]}`);
  }
  if (new Set(ids).size !== ids.length) problems.push('HUB_ROLES has a duplicate id');
  const exp = HUB_EXPERIENCES.map((e) => e.id).join(',');
  if (exp !== HUB_SURFACES.join(',')) problems.push(`HUB_EXPERIENCES order ${exp} ≠ HUB_SURFACES ${HUB_SURFACES.join(',')}`);
  for (const e of HUB_EXPERIENCES) if (!ids.includes(e.roleId)) problems.push(`experience ${e.id}: unknown roleId ${e.roleId}`);
  const tools = HUB_TOOL_LIST.map((t) => t.id).join(',');
  if (tools !== HUB_TOOLS.join(',')) problems.push(`HUB_TOOL_LIST order ${tools} ≠ HUB_TOOLS ${HUB_TOOLS.join(',')}`);
  if (HOY_PRODUCT.accent.toLowerCase() !== brand.deepBlue.toLowerCase()) problems.push(`product accent ${HOY_PRODUCT.accent} ≠ D-01 brand.deepBlue ${brand.deepBlue}`);
  return problems;
}
