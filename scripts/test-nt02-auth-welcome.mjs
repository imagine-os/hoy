import {assert,suite,preview,openPreview,assertNoPreview,db,session,fillSignup,submitSignup,assertOriginalRegistration,out} from './test-nt02-auth-common.mjs';
await suite('welcome',async({open,checks})=>{
 for(const lang of ['en','es'])for(const width of [390,1280]){
  const {page:p,root,close}=await open(lang,width,'/auth/sign-up?next=%2Fapp%2Fplans');
  await root.locator('.signup-legal input').waitFor();const before=await db(p);await assertNoPreview(p,'welcome');
  await fillSignup(root,lang);await submitSignup(root,lang).evaluate(el=>{el.click();el.click();});
  await root.getByText('FICTIONAL AUTH DESTINATION',{exact:true}).waitFor();await openPreview(p,'welcome');
  const owner=(await session(p)).userId;assert.notEqual(owner,'usr_public');assert.equal(await p.evaluate(()=>window.qaNt02Auth.path),'/app/plans');
  const committed=await db(p);await assertOriginalRegistration(before,committed,owner);
  const text=await preview(p,'welcome').innerText();assert(text.includes('fictional-nt02@example.test'));assert(!text.includes('FICTIONAL-SECRET-NEVER-PREVIEW'));assert(!text.includes('FICTIONAL EMERGENCY SECRET'));assert(!text.includes('{{'));assert.equal(await preview(p,'welcome').count(),1,'duplicate submit has one preview');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await preview(p,'welcome').screenshot({path:`${out}/welcome-${lang}-${width}.jpg`});
  assert.deepEqual(await db(p),committed,'rendering preview adds no writes');await p.evaluate(()=>window.qaNt02Auth.actor('usr_admin'));await preview(p,'welcome').waitFor({state:'detached'});await assertNoPreview(p,'welcome');assert.deepEqual(await db(p),committed);
  checks.push(`${lang}/${width}: confirmed registration, single handoff/new actor/safe target, no preview/contact/password/outbox writes; actor change hides preview`);await close();
  for(const mode of ['no-consent','duplicate','refusal']){
   const f=await open(lang,width,'/auth/sign-up');await f.root.locator('.signup-legal input').waitFor();const original=await db(f.page);
   const email=mode==='duplicate'?original.users.find(r=>r.id==='usr_cust').email:'fictional-nt02@example.test';await fillSignup(f.root,lang,email);
   if(mode==='no-consent')await f.root.locator('.signup-legal input').uncheck();if(mode==='refusal')await f.page.evaluate(()=>window.qaNt02Auth.failure=true);
   await submitSignup(f.root,lang).click();
   if(mode==='duplicate')await f.root.getByText(lang==='en'?'An account with that email or WhatsApp already exists':'Ya existe una cuenta con ese correo o WhatsApp',{exact:true}).waitFor();
   if(mode==='refusal')await f.root.getByText(lang==='en'?'Could not save the demo account. Retry with the same details; you have not been signed in.':'No se pudo guardar la cuenta de prueba. Reintenta con los mismos datos; no has iniciado sesión.',{exact:true}).waitFor();
   assert.deepEqual(await db(f.page),original);assert.equal((await session(f.page)).userId,'usr_public');await assertNoPreview(f.page,'welcome');
   if(mode==='refusal'){await f.page.evaluate(()=>window.qaNt02Auth.failure=false);await submitSignup(f.root,lang).click();await openPreview(f.page,'welcome');await assertOriginalRegistration(original,await db(f.page),(await session(f.page)).userId);}
   checks.push(`${lang}/${width}/${mode}: refused attempt has no welcome or writes${mode==='refusal'?'; original retry commits once':''}`);await f.close();
  }
  for(const change of ['cancel','actor','role','provider','route','unmount'])for(const afterCommit of [false,true]){
   const f=await open(lang,width,'/auth/sign-up?next=%2Fapp%2Fplans',change==='role'?'usr_super':'usr_public');await f.root.locator('.signup-legal input').waitFor();const original=await db(f.page);await fillSignup(f.root,lang);
   await f.page.evaluate(afterCommit=>{window.qaNt02Auth.hold=true;window.qaNt02Auth.afterCommit=afterCommit;},afterCommit);await submitSignup(f.root,lang).click();await f.page.waitForFunction(()=>window.qaNt02Auth.paused);
   const retained=await db(f.page);if(afterCommit)assert.equal(retained.users.length,original.users.length+1);else assert.deepEqual(retained,original);
   if(change==='cancel')await f.root.getByRole('button',{name:lang==='en'?'Cancel demo signup':'Cancelar registro de prueba',exact:true}).click();
   else await f.page.evaluate(change=>{const q=window.qaNt02Auth;if(change==='actor')q.actor('usr_admin');if(change==='role')q.role('teacher');if(change==='provider')q.swap();if(change==='route')q.nav('/auth/sign-up?next=%2Fapp%2Fgift');if(change==='unmount')q.unmount();},change);
   await f.page.waitForTimeout(50);const current=await session(f.page);await f.page.evaluate(()=>window.qaNt02Auth.release());await f.page.waitForTimeout(100);
   assert.deepEqual(await db(f.page),retained);assert.deepEqual(await session(f.page),current);await assertNoPreview(f.page,'welcome');assert.equal(await f.root.getByText('FICTIONAL AUTH DESTINATION',{exact:true}).count(),0);
   checks.push(`${lang}/${width}/${change}/${afterCommit?'postcommit':'precommit'}: stale acknowledgement has no welcome/session/navigation/additional writes`);await f.close();
  }
 }
});
