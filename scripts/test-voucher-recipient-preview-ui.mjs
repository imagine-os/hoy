// Native production S-09 regression. Synthetic purchases; actual reviewer approval; no delivery.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {build} from 'esbuild';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {admissionFixture,admissionNow} from './session-admission-fixture.mjs';

export const previewSelector='section[data-voucher-recipient-preview]';
export const readDb=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db);
export async function recipientFixture(product='gift_single'){
 const fixture=await admissionFixture(),temp=await mkdtemp(join(tmpdir(),'hoy-recipient-fixture-'));
 try{
  const file=join(temp,'purchase.mjs');await build({stdin:{contents:"export{executeGiftPurchaseCommand}from'./src/modules/voucher-gifts/purchaseCommand';export{resolveOperationalQuote,freezeSaleQuote}from'./src/data/operationalQuotes';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:file,logLevel:'silent'});
  const {executeGiftPurchaseCommand:gift,resolveOperationalQuote,freezeSaleQuote}=await import(pathToFileURL(file));
  const quote=freezeSaleQuote(resolveOperationalQuote(fixture.db.plans,product));let n=0;
  const recipient=product==='gift_single'?'fictional-unregistered@protected.test':fixture.db.users.find(u=>u.id==='usr_cust').email;
  const result=gift(fixture.db,{type:'purchase',actorId:'usr_c01',role:'customer',requestId:'recipient-fixture-'+product,quote,recipientEmail:recipient,image:{dataUrl:'data:image/png;base64,iVBORw0KGgoAAAAA',fileName:'fictional.png',mimeType:'image/png',bytes:12}},{tenantId:'ten_hoy',now:admissionNow,id:()=>`qa_recipient_${product}_${++n}`,currentQuote:quote});
  fixture.db=result.db;return {fixture,paymentId:result.result.payment.id,purchaseId:result.result.purchaseId,recipient,quote};
 }finally{await rm(temp,{recursive:true,force:true});}
}
export async function initContext(browser,fixture,lang,width,actorId='usr_admin'){
 const ctx=await browser.newContext({viewport:{width,height:1050},timezoneId:'Asia/Tokyo'});
 await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,r=>r.abort());
 await ctx.addInitScript(({fixture,lang,now,actorId})=>{const D=Date;window.Date=class extends D{constructor(...a){super(...(a.length?a:[now]));}static now(){return new D(now).getTime();}};if(!localStorage.getItem('hoyos.db.v1')){localStorage.setItem('hoyos.db.v1',JSON.stringify(fixture));localStorage.setItem('hoyos.session',JSON.stringify({userId:actorId,viewAs:null,devMode:false}));}localStorage.setItem('hoyos.lang',lang);},{fixture,lang,now:admissionNow,actorId});return ctx;
}
export async function fillReview(p,en,amount){
 const d=p.getByRole('dialog');await d.getByRole('group',{name:en?'Voucher terms · explicit review':'Condiciones del bono · revisión explícita'}).waitFor();
 await d.getByLabel(en?'Fictional recipient name':'Nombre del destinatario de prueba').fill('FICTIONAL PROTECTED RECIPIENT');
 await d.getByLabel(en?'Approved expiry for this demo':'Vigencia aprobada para esta demo').selectOption('none');
 await d.getByLabel(en?'Participant limit':'Máximo de participantes').fill('1');
 await d.getByLabel(en?'Apply limit':'Aplicar límite').selectOption('per_booking');
 await d.getByLabel(en?'Each credit covers':'Cada crédito cubre').selectOption('per_person');
 await d.getByLabel(en?'When a booking is cancelled':'Al cancelar una reserva').selectOption('restore');
 await d.getByLabel(en?'I reviewed these explicit test voucher terms.':'Revisé estas condiciones explícitas del bono de prueba.').check();
 await d.getByLabel(en?'Amount received (COP)':'Monto recibido (COP)').fill(String(amount));
 await d.getByLabel(en?'Review reason / note':'Motivo / nota de revisión').fill('FICTIONAL explicit recipient preview review');
 await d.getByLabel(en?'Compared with fictional bank notification (Bancolombia disconnected)':'Comparé con la notificación bancaria ficticia (sin conexión a Bancolombia)').check();return d;
}
export async function approve(p,en){await p.getByRole('dialog').getByRole('button',{name:en?'Confirm demo payment':'Confirmar pago demo',exact:true}).click();}
export function assertApproval(before,after,paymentId){
 const intent=after.gift_purchase_intents.find(i=>i.paymentId===paymentId),payment=after.payments.find(p=>p.id===paymentId);
 assert.equal(payment.status,'approved');assert(payment.frontend_receipt);assert.equal(after.payments.length,before.payments.length);assert.equal(after.vouchers.length,before.vouchers.length+1);
 for(const table of ['class_ledger','invoices','message_log','transfer_receipts','voucher_bookings','bookings','users','profiles','user_roles'])assert.deepEqual(after[table],before[table],table+' must not change on gift approval');
 assert.equal(after.gift_purchase_requests.filter(r=>r.type==='approve'&&r.result.purchaseId===intent.id).length,1);
 assert.equal(after.audit_log.filter(r=>r.action==='gift.mock.approve'&&r.entity_id===paymentId).length,1);
 assert.equal(after.voucher_events.filter(r=>r.voucherId===intent.voucherId&&r.kind==='issue').length,1);return intent;
}
export async function assertReady(p,en,setup){
 const preview=p.locator(previewSelector+'[data-status=ready]');await preview.waitFor();await p.getByRole('dialog').waitFor({state:'hidden'});
 const db=await readDb(p),intent=db.gift_purchase_intents.find(i=>i.id===setup.purchaseId);
 for(const [key,value]of Object.entries({'payment-id':setup.paymentId,'purchase-id':setup.purchaseId,'voucher-id':intent.voucherId,'approval-request-id':intent.approvalRequestId,'template-kind':'builtin-mock','template-key':'class-voucher-recipient-ready','template-revision':'1'}))assert.equal(await preview.getAttribute('data-'+key),String(value));
 await preview.getByText(en?'Recipient email preview · UNSENT':'Vista de email para el destinatario · SIN ENVIAR',{exact:true}).waitFor();
 assert((await preview.locator('[data-voucher-recipient-email]').innerText()).includes(setup.recipient));
 assert((await preview.locator('[data-voucher-recipient-name]').innerText()).includes('FICTIONAL PROTECTED RECIPIENT'));
 const subject=await preview.locator('[data-voucher-recipient-subject]').innerText(),body=await preview.locator('[data-voucher-recipient-body]').innerText();assert(subject.includes(en?'UNSENT':'SIN ENVIAR'));assert(body.includes(String(setup.quote.classes)));assert(body.includes('FICTIONAL PROTECTED RECIPIENT'));
 const link=preview.locator('[data-voucher-recipient-link]');assert.equal(await link.getAttribute('href'),'#/app/voucher-gifts?gift='+encodeURIComponent(setup.paymentId));
 const before=await readDb(p),url=p.url();await link.click();assert.equal(p.url(),url);assert.deepEqual(await readDb(p),before);
 assert.equal(await preview.locator('[data-recipient-user-id],[data-recipient-locale]').count(),0);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));return preview;
}
async function main(){
 const base=process.env.QA_BASE??'http://127.0.0.1:5690',out=process.env.QA_OUTPUT??'/tmp/hoy-recipient-preview-ui',checks=[],errors=[];await mkdir(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});let debug;
 try{for(const lang of ['en','es'])for(const width of [390,1280])for(const product of ['gift_single','gift_pack12']){
  const setup=await recipientFixture(product),actorId=product==='gift_pack12'?'usr_super':'usr_admin',ctx=await initContext(browser,setup.fixture,lang,width,actorId),p=await ctx.newPage();debug=p;p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));const en=lang==='en';
  await p.goto(base+'/#/staff/transfers?payment='+setup.paymentId);await fillReview(p,en,setup.quote.chargedAmount);assert.equal(await p.locator(previewSelector).count(),0);const before=await readDb(p);
  if(product==='gift_single')assert.equal(before.users.some(u=>u.email===setup.recipient),false);
  await approve(p,en);await assertReady(p,en,setup);const after=await readDb(p);assertApproval(before,after,setup.paymentId);
  await p.screenshot({path:`${out}/${lang}-${width}-${product}.jpg`,fullPage:true});await p.evaluate(()=>document.documentElement.dataset.theme='dark');await p.screenshot({path:`${out}/${lang}-${width}-${product}-dark.jpg`,fullPage:true});
  await p.reload();await p.getByRole('heading',{level:1}).waitFor();assert.equal(await p.locator(previewSelector).count(),0);assert.deepEqual(await readDb(p),after);
  await p.goto(base+'/#/staff/transfers?payment='+setup.paymentId);await p.getByRole('dialog').waitFor();assert.equal(await p.locator(previewSelector).count(),0);assert.deepEqual(await readDb(p),after);
  await p.goBack();assert.equal(await p.locator(previewSelector).count(),0);assert.deepEqual(await readDb(p),after);
  checks.push({lang,width,product,actorId,actualS09Approval:true,recipientAccountRequired:false,exactProtectedSource:true,inertCTA:true,readOnlyPreview:true,reloadBackNoEvent:true});await ctx.close();
 }assert.deepEqual(errors,[]);console.log(`PASS recipient native preview: ${checks.length} groups`);
 }catch(e){errors.push(String(e));if(debug&&!debug.isClosed()){await writeFile(out+'/failure.txt',await debug.locator('body').innerText());await debug.screenshot({path:out+'/failure.jpg',fullPage:true});}throw e;}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,checks,errors},null,2));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
