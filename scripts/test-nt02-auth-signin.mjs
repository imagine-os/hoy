import {assert,suite,preview,openPreview,assertNoPreview,db,session,out} from './test-nt02-auth-common.mjs';
await suite('signin',async({open,checks})=>{
 for(const lang of ['en','es'])for(const width of [390,1280]){
  const en=lang==='en',{page:p,root,close}=await open(lang,width,'/auth/sign-in?next=%2Fapp%2Fplans%3Fplan%3D12-clases');
  const panel=root.locator('.demo-signin');await panel.waitFor();const before=await db(p),initialSession=await session(p);
  const policy=await p.evaluate(async()=>(await import('/src/modules/customer/policy.ts')).policy);
  const button=name=>panel.getByRole('button',{name,exact:true});
  const send=()=>button(en?'Show fictional email code':'Mostrar código de email ficticio');
  const resend=()=>button(en?'Generate another fictional code':'Generar otro código ficticio');
  const cancel=()=>button(en?'Cancel preview':'Cancelar prueba');
  const google=()=>button(en?'Preview fictional Google sign-in':'Probar acceso ficticio con Google');
  const active=()=>preview(p,'sign-in-code');
  const code=async()=>{const text=await panel.innerText(),match=text.match(en?/Fictional code: (\d{6})/:/Código ficticio: (\d{6})/);assert(match,'real action exposed exact active code');return match[1];};
  const type=async value=>panel.locator('.otp-cell').first().evaluate((e,value)=>{const d=new DataTransfer();d.setData('text',value);e.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:d}));},value);
  const untouched=async()=>{assert.deepEqual(await db(p),before);assert.deepEqual(await session(p),initialSession);};
  const show=async()=>{await p.clock.fastForward(policy.otpResendSeconds*1000+1000);await send().click();await assertNoPreview(p,'sign-in-code');await p.clock.runFor(700);await openPreview(p,'sign-in-code');const exact=await code();assert((await active().innerText()).includes(exact),'preview uses exact active challenge code');assert.equal(await active().count(),1);await untouched();return exact;};
  await assertNoPreview(p,'sign-in-code');await send().click();await cancel().click();await p.clock.runFor(700);await assertNoPreview(p,'sign-in-code');await untouched();
  await button(en?'Preview fictional delivery error':'Ver error de entrega ficticia').click();await p.clock.runFor(700);await assertNoPreview(p,'sign-in-code');await untouched();
  await show();assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await active().screenshot({path:`${out}/signin-${lang}-${width}.jpg`});
  await p.clock.fastForward(policy.otpValidMinutes*60000-1000);assert.equal(await active().count(),1,'unexpired challenge still available');await p.clock.fastForward(2000);await assertNoPreview(p,'sign-in-code');
  await resend().click();await assertNoPreview(p,'sign-in-code');await p.clock.runFor(700);await openPreview(p,'sign-in-code');assert((await active().innerText()).includes(await code()));
  const oldNode=await active().elementHandle();await p.clock.fastForward(policy.otpResendSeconds*1000+1000);await resend().click();await assertNoPreview(p,'sign-in-code');assert.equal(await oldNode.evaluate(e=>e.isConnected),false);await p.clock.runFor(700);await openPreview(p,'sign-in-code');const current=await code();assert((await active().innerText()).includes(current));
  const wrong=current==='000000'?'111111':'000000';for(let i=0;i<policy.lockoutAttempts;i++)await type(wrong);
  await panel.getByText(en?/Fictional sign-in paused/:/Acceso ficticio en pausa/).waitFor();await assertNoPreview(p,'sign-in-code');await untouched();
  await p.clock.fastForward(policy.lockoutMinutes*60000+1000);await show();await google().click();await assertNoPreview(p,'sign-in-code');await cancel().click();await assertNoPreview(p,'sign-in-code');await untouched();
  await show();await cancel().click();await assertNoPreview(p,'sign-in-code');await untouched();
  await p.clock.fastForward(policy.otpResendSeconds*1000+1000);await send().click();await p.evaluate(()=>window.qaNt02Auth.nav('/fictional-destination'));await p.clock.runFor(1000);await assertNoPreview(p,'sign-in-code');await untouched();
  await p.evaluate(()=>window.qaNt02Auth.nav('/auth/sign-in?next=%2Fapp%2Fplans%3Fplan%3D12-clases'));await panel.waitFor();await show();await type(await code());await root.getByText('FICTIONAL AUTH DESTINATION',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.qaNt02Auth.path),'/app/plans?plan=12-clases');assert.equal((await session(p)).userId,'usr_cust');await assertNoPreview(p,'sign-in-code');assert.deepEqual(await db(p),before,'original signin has no DB writes');
  checks.push(`${lang}/${width}: actual send/failure/retry; exact code, unexpired/expiry/resend replacement, lock/unlock, Google/cancel/unmount removal; original session+safe return; DB unchanged`);await close();
  const disabled=await open(lang,width,'/fictional-panel');const dp=disabled.root.locator('.demo-signin');await dp.waitFor();const original=await db(disabled.page);await dp.getByRole('button',{name:en?'Show fictional email code':'Mostrar código de email ficticio',exact:true}).click();await disabled.page.clock.runFor(700);await openPreview(disabled.page,'sign-in-code');await disabled.page.evaluate(()=>window.qaNt02Auth.disable());await preview(disabled.page,'sign-in-code').waitFor({state:'detached'});await assertNoPreview(disabled.page,'sign-in-code');assert(await dp.getByRole('button').count()===0);assert.deepEqual(await db(disabled.page),original);assert.equal((await session(disabled.page)).userId,'usr_public');checks.push(`${lang}/${width}: actual hook disabled clears active challenge and preview without writes`);await disabled.close();
 }
});
