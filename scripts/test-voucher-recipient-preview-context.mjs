// DEV-only actual S-09 lifecycle proof. Run against a Vite server with preoptimized React deps.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {recipientFixture,initContext,fillReview,approve,assertReady,assertApproval,readDb,previewSelector} from './test-voucher-recipient-preview-ui.mjs';
const base=process.env.QA_BASE??'http://127.0.0.1:5691',out=process.env.QA_OUTPUT??'/tmp/hoy-recipient-preview-context',checks=[],errors=[];
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});let debug;
async function setupCase(lang='en',actorId='usr_admin',viewAs=null){
 const setup=await recipientFixture(),ctx=await initContext(browser,setup.fixture,lang,390,actorId),p=await ctx.newPage();debug=p;p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/#/coming-soon');await p.evaluate(async id=>(await import('/scripts/voucher-recipient-preview-harness.tsx')).mountVoucherRecipientPreviewHarness(id),setup.paymentId);await p.waitForFunction(()=>window.qaRecipient?.ready);
 if(viewAs){await p.evaluate(role=>window.qaRecipient.setViewAs(role),viewAs);await p.waitForFunction(role=>window.qaRecipient.role===role,viewAs);}
 await fillReview(p,lang==='en',setup.quote.chargedAmount);return {setup,ctx,p};
}
async function waitApproved(p,id){await p.waitForFunction(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.payments.find(r=>r.id===id)?.status==='approved',id);}
try{
 for(const lang of ['en','es']){
  const {setup,ctx,p}=await setupCase(lang),en=lang==='en',before=await readDb(p);await p.evaluate(()=>window.qaRecipient.fault=true);await approve(p,en);
  await p.locator(previewSelector+'[data-status=error]').waitFor();await waitApproved(p,setup.paymentId);const after=await readDb(p);assertApproval(before,after,setup.paymentId);assert.equal(await p.evaluate(()=>window.qaRecipient.approvalCalls),1);
  await p.evaluate(()=>window.qaRecipient.fault=false);await p.getByRole('button',{name:en?'Retry recipient preview':'Reintentar vista del destinatario',exact:true}).click();await assertReady(p,en,setup);assert.equal(await p.evaluate(()=>window.qaRecipient.approvalCalls),1);assert.deepEqual(await readDb(p),after);checks.push({lang,failureAndRetryReadOnly:true,oneApproval:true});await ctx.close();
 }
 for(const change of ['actor','role','provider','disconnected','query','route','unmount']){
  const {setup,ctx,p}=await setupCase('en',['actor','role'].includes(change)?'usr_super':'usr_admin',change==='actor'?'admin':null),before=await readDb(p);await p.evaluate(()=>window.qaRecipient.hold=true);await approve(p,true);await p.waitForFunction(()=>window.qaRecipient.held);await waitApproved(p,setup.paymentId);const after=await readDb(p);assertApproval(before,after,setup.paymentId);
  const identityBefore=await p.evaluate(()=>({actorId:window.qaRecipient.actorId,role:window.qaRecipient.role}));
  if(change==='actor')assert.deepEqual(identityBefore,{actorId:'usr_super',role:'admin'});
  if(change==='role')assert.deepEqual(identityBefore,{actorId:'usr_super',role:'super_admin'});
  assert.equal(await p.locator(previewSelector+'[data-status=ready]').count(),0);
  await p.evaluate(change=>{const q=window.qaRecipient;if(change==='actor')q.switchUser('usr_admin');else if(change==='role')q.setViewAs('teacher');else if(change==='provider')q.swap();else if(change==='disconnected')q.disconnect();else if(change==='query')q.navigate('/staff/transfers?payment=fictional-other');else if(change==='route')q.navigate('/fictional-other');else q.unmount();},change);
  if(change==='actor'){await p.waitForFunction(()=>window.qaRecipient.actorId==='usr_admin'&&window.qaRecipient.role==='admin');const identityAfter=await p.evaluate(()=>({actorId:window.qaRecipient.actorId,role:window.qaRecipient.role}));assert.notEqual(identityAfter.actorId,identityBefore.actorId);assert.equal(identityAfter.role,identityBefore.role);}
  if(change==='role'){await p.waitForFunction(()=>window.qaRecipient.actorId==='usr_super'&&window.qaRecipient.role==='teacher');const identityAfter=await p.evaluate(()=>({actorId:window.qaRecipient.actorId,role:window.qaRecipient.role}));assert.equal(identityAfter.actorId,identityBefore.actorId);assert.notEqual(identityAfter.role,identityBefore.role);}
  // Flush the changed React context before releasing the old pending proof.
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.evaluate(()=>window.qaRecipient.release());
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await p.locator(previewSelector+'[data-status=ready]').count(),0);assert.deepEqual(await readDb(p),after);assert.equal(await p.evaluate(()=>window.qaRecipient.approvalCalls),1);
  checks.push({change,heldProofDiscarded:true,actualApprovalRetained:true,noPreviewWrites:true,...(change==='actor'?{actorChangedRoleRetained:true}:change==='role'?{roleChangedActorRetained:true}:{})});await ctx.close();
 }
 // Strict review inputs must keep the real command pending; rejection issues nothing.
 for(const mode of ['amount','terms','rejected','rollback']){
  const {setup,ctx,p}=await setupCase(),d=p.getByRole('dialog'),before=await readDb(p);
  if(mode==='amount'){await d.getByLabel('Amount received (COP)').fill(String(setup.quote.chargedAmount+1));assert(await d.getByRole('button',{name:'Confirm demo payment',exact:true}).isDisabled());}
  else if(mode==='terms'){await d.getByLabel('I reviewed these explicit test voucher terms.').uncheck();assert(await d.getByRole('button',{name:'Confirm demo payment',exact:true}).isDisabled());}
  else if(mode==='rejected'){await d.getByRole('button',{name:'Reject demo payment',exact:true}).click();await p.waitForFunction(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.payments.find(r=>r.id===id)?.status==='declined',setup.paymentId);}
  else{
   // Invalid explicit class terms reach the unchanged provider transaction and roll back.
   await d.getByLabel('Participant limit').fill('0');await d.getByLabel('I reviewed these explicit test voucher terms.').check();await approve(p,true);await d.getByText('The action did not complete or could not be confirmed. Check the saved state before retrying. Verify the recipient, quote and terms.',{exact:true}).waitFor();
  }
  assert.equal(await p.locator(previewSelector).count(),0);const after=await readDb(p);if(mode!=='rejected')assert.deepEqual(after,before);else{for(const table of ['vouchers','voucher_events','class_ledger','message_log','invoices','bookings','voucher_bookings'])assert.deepEqual(after[table],before[table],table);assert.equal(after.payments.find(r=>r.id===setup.paymentId).frontend_receipt,before.payments.find(r=>r.id===setup.paymentId).frontend_receipt);}
  assert.equal(await p.evaluate(()=>window.qaRecipient.approvalCalls),0);checks.push({mode,noPreview:true,noIssuanceOrDelivery:true});await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(`PASS recipient preview context: ${checks.length} groups`);
}catch(e){errors.push(String(e));if(debug&&!debug.isClosed()){await writeFile(out+'/failure.txt',await debug.locator('body').innerText());await debug.screenshot({path:out+'/failure.jpg',fullPage:true});}throw e;}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,checks,errors},null,2));}
