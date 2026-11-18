import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
const out = await build({stdin:{contents:"export * from './src/modules/admin/team/accountHelp'; export {teamStrings} from './src/modules/admin/team/strings';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const { accountHelp, teamStrings } = await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
for (const kind of ['added', 'signed_up', 'has_account']) {
  const link=accountHelp({kind}, 'https://studio.example/#/auth/sign-in?next=/teacher', 'member@example.invalid');
  assert.deepEqual(link,{kind:'sign_in',url:'https://studio.example/#/auth/sign-in?next=/teacher',email:'member@example.invalid'});
}
assert.equal(accountHelp({kind:'invited',url:'https://identity.example/invite/secret'},'https://studio.example/signin','member@example.invalid'),null);
for(const key of ['team.signInLink','team.signInHelp']) for(const lang of ['es','en']) assert.ok(teamStrings[key][lang]);
const ui=await readFile('src/modules/admin/team/TeamUsersPanel.tsx','utf8');
assert.match(ui,/setLink\(accountHelp\(res,/);
assert.match(ui,/link.kind === 'sign_in'/);
assert.match(ui,/setLink\(null\)/); // next action clears prior recipient/link
console.log('existing-account sign-in help: all assertions passed');
