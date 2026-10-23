// SW-05 / AD-05 contact-email slice only. Isolated fictional browser Settings; no email sends/configuration.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.QA_BASE??'http://127.0.0.1:5180';
const targets=[{label:process.env.QA_LABEL??'current',base},...(process.env.QA_CANDIDATE_BASE?[{label:'saved-website-candidate',base:process.env.QA_CANDIDATE_BASE}]:[])];
const output=process.env.QA_OUTPUT??'docs/screenshots/contact-propagation';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--no-proxy-server']});
const checks=[],errors=[],artifacts=[];let active,testFailure=null;
const waitForText=async(locator,text)=>{
 let actual='';const deadline=Date.now()+5000;
 while(Date.now()<deadline){actual=await locator.textContent({timeout:200}).catch(()=>null);if(actual?.includes(text))return;await new Promise(resolve=>setTimeout(resolve,50));}
 assert.fail(`Expected rendered text ${JSON.stringify(text)}; observed ${JSON.stringify(actual)}`);
};
async function profileCard(page){const card=page.locator('.card').filter({has:page.getByLabel('Email',{exact:true})});await card.waitFor();return card;}
async function previewLang(page,lang){await page.locator('.emails-canvas [role=tablist]').getByRole('button',{name:lang.toUpperCase(),exact:true}).click();}
async function persistProfile(page,lang,email,confirmed){
 const card=await profileCard(page),field=card.getByLabel('Email',{exact:true}),toggle=card.getByRole('switch',{name:lang==='en'?'Email confirmed':'Correo confirmado',exact:true});
 await field.fill(email);if(await toggle.isChecked()!==confirmed)await toggle.locator('..').click();
 const save=card.getByRole('button',{name:lang==='en'?'Save':'Guardar',exact:true});assert(await save.isEnabled());await save.click();
 await card.getByText(lang==='en'?'Saved':'Guardado',{exact:true}).waitFor();
 await page.waitForFunction(({email,confirmed})=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));const p=s.db.tenants.find(t=>t.id==='ten_hoy').settings.profile;return p.email===email&&(p.confirmed||p.confirmedFields.email)===confirmed;},{email,confirmed});
}
async function capture(page,locator,file){
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1,{},{timeout:5000,polling:'raf'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${file} overflow${width}`);
  await locator.screenshot({path:`${output}/${file}-${width}.jpg`,quality:68,animations:'disabled'});
 }
}
try{
 for(const target of targets){
  const release=await(await fetch(`${target.base}/release.json`)).json();artifacts.push({label:target.label,sourceCommit:release.sourceCommit,base:target.base});
  for(const lang of (process.env.QA_LANGS??'es,en').split(',')){
   const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
   await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
   async function open(route,actor){
    const page=await ctx.newPage();active=page;await page.clock.install({time:new Date('2026-10-23T17:00:00Z')});
    await page.addInitScript(({lang,actor})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.session',JSON.stringify({userId:actor,devMode:false,viewAs:null}));},{lang,actor});
    page.on('pageerror',e=>errors.push({target:target.label,lang,message:e.message}));await page.goto(`${target.base}/#${route}`);return page;
   }
   const settings=await open('/admin/settings','usr_super');const card=await profileCard(settings);
   const brand=await card.getByLabel(lang==='en'?'Name':'Nombre',{exact:true}).inputValue();
   const legalName=await card.getByLabel(lang==='en'?'Legal name':'Razón social',{exact:true}).inputValue();
   const fallback=await card.getByLabel('Email',{exact:true}).inputValue();assert(fallback.includes('@'));
   // Only anonymize fixture profile display names; roles/permissions are never changed.
   await settings.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));s.db.profiles=s.db.profiles.map(p=>({...p,full_name:'Demo Member'}));localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});await settings.reload();await profileCard(settings);
   const contact=await open('/site/contact','usr_super');await contact.locator('.site-foot').waitFor();
   const more=await open('/app/more','usr_super');await more.locator('a[href^="mailto:"]').waitFor();
   const emails=await open('/admin/emails','usr_super');await emails.locator('.emailpreview-envelope').waitFor();await previewLang(emails,lang);
   const manual=await open('/manual/01-quienes-somos-y-filosofia','usr_super');
   const live=manual.locator('.live').filter({has:manual.getByRole('heading',{name:lang==='en'?'Studio contact':'Contacto del estudio',exact:true})});await live.waitFor();
   const initial=await settings.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));return {messageLog:JSON.stringify(s.db.message_log),templates:JSON.stringify(s.db.email_templates),comms:JSON.stringify(s.db.tenants.find(t=>t.id==='ten_hoy').settings.comms??null)};});
   const consumers=[contact,more,emails,manual];
   const checkAll=async(email,confirmed,state,shots)=>{
    const suffix=confirmed?'':lang==='en'?' (pending)':' (pendiente)';
    const contactLink=contact.locator('.site-main a[href^="mailto:"]');await waitForText(contactLink,email);assert.equal(await contactLink.getAttribute('href'),`mailto:${email}`);assert.equal(await contactLink.textContent(),email);
    const contactCard=contact.locator('.site-main .card').filter({has:contact.locator('a[href^="mailto:"]')});await contactCard.waitFor();assert.equal(await contactCard.getByText(lang==='en'?'Detail pending confirmation':'Dato pendiente de confirmar',{exact:true}).count(),confirmed?0:1);
    const footerLink=contact.locator('.site-foot a[href^="mailto:"]');await waitForText(footerLink,email+suffix);assert.equal(await footerLink.getAttribute('href'),`mailto:${email}`);assert.equal(await footerLink.textContent(),email+suffix);
    const moreLink=more.locator('a[href^="mailto:"]');await waitForText(moreLink,email+suffix);assert.equal(await moreLink.getAttribute('href'),`mailto:${email}`);assert.equal(await moreLink.locator('.listrow-sub').textContent(),email+suffix);
    const envelope=emails.locator('.emailpreview-envelope');await waitForText(envelope,`${brand} <${email}>${suffix}`);assert((await envelope.textContent()).replace(/\s+/g,' ').includes(` · ${lang.toUpperCase()} · `));
    const emailRow=live.locator('.live-dl-row').filter({has:manual.locator('dt').getByText(lang==='en'?'Email':'Correo',{exact:true})});await waitForText(emailRow,email+suffix);assert.equal(await emailRow.locator('dd').textContent(),email+suffix);
    assert((await live.locator('.eyebrow').textContent()).includes(legalName));assert(await contact.getByRole('img',{name:brand,exact:true}).count()>0);
    for(const page of consumers)assert(!(await page.locator('body').innerText()).includes('⟨'),'no missing translation keys');
    if(shots&&target===targets[0]&&process.env.QA_CAPTURE!=='0'){
     await capture(contact,contactCard,`${lang}-${state}-contact`);await capture(contact,footerLink,`${lang}-${state}-site-footer`);
     await capture(more,moreLink,`${lang}-${state}-more`);await capture(emails,envelope,`${lang}-${state}-email-envelope`);await capture(manual,live,`${lang}-${state}-live-contact`);
    }
   };
   const cases=[{state:'changed-pending',email:`demo.contact.${lang}@example.invalid`,confirmed:false},{state:'changed-confirmed',email:`updated.${lang}@example.invalid`,confirmed:true},{state:'blank-fallback-pending',email:'',confirmed:false}];
   for(const fixture of cases){
    // All consumers are already mounted. These assertions precede any reload; real browser storage events drive updates.
    await persistProfile(settings,lang,fixture.email,fixture.confirmed);const shown=fixture.email||fallback;
    await checkAll(shown,fixture.confirmed,fixture.state,true);
    for(const page of consumers)await page.reload();await previewLang(emails,lang);await checkAll(shown,fixture.confirmed,fixture.state,false);
    await settings.reload();const reread=await profileCard(settings);assert.equal(await reread.getByLabel('Email',{exact:true}).inputValue(),fixture.email);
    assert.equal(await reread.getByRole('switch',{name:lang==='en'?'Email confirmed':'Correo confirmado',exact:true}).isChecked(),fixture.confirmed);
    // Separate native customer session verifies the persisted contact snapshot without mixed-role localStorage races.
    const storage=await ctx.storageState();
    for(const origin of storage.origins)for(const item of origin.localStorage)if(item.name==='hoyos.session')item.value=JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null});
    const customerCtx=await browser.newContext({storageState:storage,viewport:{width:390,height:900}});
    await customerCtx.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/,route=>route.abort());
    const customer=await customerCtx.newPage();await customer.clock.install({time:new Date('2026-10-23T17:00:00Z')});customer.on('pageerror',e=>errors.push({target:target.label,lang,message:e.message}));
    await customer.goto(`${target.base}/#/app/more`);
    const customerLink=customer.locator('a[href^="mailto:"]');await waitForText(customerLink,shown+(fixture.confirmed?'':lang==='en'?' (pending)':' (pendiente)'));assert.equal(await customerLink.getAttribute('href'),`mailto:${shown}`);
    await customer.reload();await waitForText(customerLink,shown+(fixture.confirmed?'':lang==='en'?' (pending)':' (pendiente)'));await customerCtx.close();
    checks.push({target:target.label,lang,state:fixture.state,nativeCustomerSnapshotReload:true,liveMountedConsumers:['ContactPage','SiteShell','MorePage (same-role live observers)','EmailsPage preview','LiveBlock contact'],reloadReadback:true,confirmationLabels:true});
   }
   // Existing stored compatibility: the legacy all-confirmed flag overrides per-field false.
   await settings.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1')),p=s.db.tenants.find(t=>t.id==='ten_hoy').settings.profile;p.email='legacy.demo@example.invalid';p.confirmed=true;p.confirmedFields.email=false;localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
   await checkAll('legacy.demo@example.invalid',true,'legacy-confirmed',false);
   // An old snapshot missing profile entirely uses existing tenant defaults; no invented configuration.
   await settings.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));delete s.db.tenants.find(t=>t.id==='ten_hoy').settings.profile;localStorage.setItem('hoyos.db.v1',JSON.stringify(s));});
   await checkAll(fallback,true,'missing-profile-defaults',false);for(const page of consumers)await page.reload();await previewLang(emails,lang);await checkAll(fallback,true,'missing-profile-defaults',false);
   const after=await settings.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hoyos.db.v1'));return {messageLog:JSON.stringify(s.db.message_log),templates:JSON.stringify(s.db.email_templates),comms:JSON.stringify(s.db.tenants.find(t=>t.id==='ten_hoy').settings.comms??null)};});assert.deepEqual(after,initial,'no messages, template edits or sender/reply-to configuration effects');
   checks.push({target:target.label,lang,state:'legacy-confirmed-and-missing-profile',passed:true,noMessageOrEmailConfigurationEffects:true});await ctx.close();
  }
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({artifacts,checks},null,2));
}catch(error){testFailure=String(error);if(active)await active.screenshot({path:'/tmp/hoy-contact-propagation-failure.jpg',quality:65}).catch(()=>{});throw error;}
finally{await writeFile(`${output}/results.json`,JSON.stringify({status:testFailure?'failed':'passed',testFailure,sourceRows:[{id:'SW-05',criterion:'Website, app, emails and manual use the same brand name and contact email.',phase:'MVP Oct 30',decision:'PC-08'},{id:'AD-05',criterion:'Contact, front-desk hours, holidays, Bancolombia account, QR image and Bre-B key are edited in Settings and show on the website, app and emails.',phase:'MVP Oct 30',decision:'Q-15'}],artifacts,checks,errors,limits:['Only fictional contact-email changes and existing confirmation/fallback flags. No final brand/email decision.','Preview envelope only; no real email dispatch or configuration. Sender/reply-to settings, templates and message_log must remain unchanged.','Same-origin local MockProvider storage events and reload only; no backend/cross-device persistence claim.','No publication, WhatsApp, pricing, Q14/Q15 policy or Sheet changes.']},null,2));await browser.close();}
