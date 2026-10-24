// Compiled-app native controls only. Host-side fixture bundling never creates a production QA route.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
import {build} from 'esbuild';
import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {admissionFixture,admissionNow,admissionIds} from './session-admission-fixture.mjs';
import {syntheticTransferReviewImage} from './synthetic-transfer-review-image.mjs';

const base=process.env.QA_BASE??'http://127.0.0.1:5696';
const out=process.env.QA_OUTPUT??'docs/screenshots/transfer-review-evidence-native';
const fixture=await admissionFixture(),uid=admissionIds.user;
const checks=[],errors=[],sourceRequests=[],observedResourceUrls=new Set(),afterRunServerResources=[],values=new Map(),RealDate=Date;
await mkdir(out,{recursive:true});
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
const temp=await mkdtemp(join(tmpdir(),'hoy-native-review-fixture-'));
let services;
try{
 const file=join(temp,'fixture.mjs');
 await build({stdin:{contents:"export{MockProvider}from'./src/data/MockProvider';export{submitTransfer}from'./src/modules/transfers/receipts';export{resolveOperationalQuote,freezeSaleQuote}from'./src/data/operationalQuotes';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});
 services=await import(pathToFileURL(file));
}finally{await rm(temp,{recursive:true,force:true});}

const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
let debug;
try{
 // A valid local JPEG generated without importing application source into the browser.
 const scratch=await browser.newPage();
 const jpeg=await scratch.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=120;canvas.height=60;
  const c=canvas.getContext('2d');c.fillStyle='white';c.fillRect(0,0,120,60);c.fillStyle='black';c.fillText('FICTIONAL',5,30);
  const dataUrl=canvas.toDataURL('image/jpeg');
  return{dataUrl,fileName:'FICTIONAL.JPG',mimeType:'image/jpeg',bytes:atob(dataUrl.split(',')[1]).length};
 });
 await scratch.close();

 async function savedFixture(kind){
  const stored=structuredClone(fixture);
  for(const table of ['payments','transfer_receipts','class_ledger','bookings'])stored.db[table]=stored.db[table].filter(row=>row.user_id!==uid);
  values.set('hoyos.db.v1',JSON.stringify(stored));
  globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[admissionNow]));}static now(){return new RealDate(admissionNow).getTime();}};
  try{
   const{MockProvider,submitTransfer,resolveOperationalQuote,freezeSaleQuote}=services;
   const data=new MockProvider(),quote=freezeSaleQuote(resolveOperationalQuote(stored.db.plans,'pack12'));
   // This deliberately unreadable saved raster is structurally valid in Node. The browser must reject it.
   const image=kind==='jpg'?jpeg:kind==='unloadable'?{dataUrl:'data:image/png;base64,iVBORw0KGgoA',fileName:'FICTIONAL.png',mimeType:'image/png',bytes:9}:syntheticTransferReviewImage();
   const receipt=await submitTransfer(data,{key:'qa_native_review_evidence',userId:uid,sessionId:null,matNumber:null,productId:quote.planId,productName:quote.name,amount:quote.chargedAmount,classes:quote.classes,expiresAt:quote.entitlementExpiresAt,quote,image});
   const result=JSON.parse(values.get('hoyos.db.v1'));
   if(kind==='missing'||kind==='reject')result.db.transfer_receipts.find(row=>row.id===receipt.id).image_data_url=null;
   return{stored:result,receiptId:receipt.id,paymentId:receipt.payment_id,amount:quote.chargedAmount,classes:quote.classes};
  }finally{globalThis.Date=RealDate;}
 }

 const bytes=page=>page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
 const db=async page=>JSON.parse(await bytes(page)).db;
 for(const lang of ['en','es'])for(const width of [390,1280])for(const kind of ['missing','unloadable','png','jpg','reject']){
  const en=lang==='en',saved=await savedFixture(kind),context=await browser.newContext({viewport:{width,height:1050}});
  await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,route=>route.abort());
  await context.addInitScript(({stored,lang,now})=>{
   const D=Date;window.Date=class extends D{constructor(...args){super(...(args.length?args:[now]));}static now(){return new D(now).getTime();}};
   if(!localStorage.getItem('hoyos.db.v1')){
    localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));
    localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_desk',viewAs:null,devMode:false}));
   }
   localStorage.setItem('hoyos.lang',lang);
  },{stored:saved.stored,lang,now:admissionNow});
  const page=await context.newPage();debug=page;page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{const url=response.url();if(url.startsWith(new URL(base).origin+'/')){if(response.status()>=400)errors.push('Observed HTTP failure: '+response.status()+' '+url);if(response.status()===200||response.status()===304)observedResourceUrls.add(url);}});
  page.on('request',request=>{const path=new URL(request.url()).pathname;if(path.startsWith('/src/')||path.startsWith('/scripts/'))sourceRequests.push(request.url());});
  const target=base+'/#/staff/transfers?receipt='+saved.receiptId;
  await page.goto(target);
  const drawer=page.getByRole('dialog');await drawer.waitFor();
  const before=await bytes(page);
  const amount=drawer.getByLabel(en?'Amount received (COP)':'Monto recibido (COP)',{exact:true});
  const reason=drawer.getByLabel(en?'Review reason / note':'Motivo / nota de revisión',{exact:true});
  const approve=drawer.getByRole('button',{name:en?'Confirm demo payment':'Confirmar pago demo',exact:true});
  await amount.fill(String(kind==='reject'?0:saved.amount));
  await reason.fill('FICTIONAL native evidence review');
  await drawer.getByLabel(en?'Compared with fictional bank notification (Bancolombia disconnected)':'Comparé con la notificación bancaria ficticia (sin conexión a Bancolombia)',{exact:true}).check();
  const invalid=kind==='missing'||kind==='unloadable'||kind==='reject';
  if(invalid){
   await drawer.getByText(en?'Receipt unavailable':'Comprobante no disponible',{exact:true}).last().waitFor();
   assert(await approve.isDisabled());
   await amount.press('Enter');
   await approve.scrollIntoViewIfNeeded();
   const box=await approve.boundingBox();assert(box);
   await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
   assert.equal(await bytes(page),before,'Enter and a physical click cannot approve missing/unloadable evidence');
   const unchanged=await db(page);
   assert.equal(unchanged.transfer_receipts.find(row=>row.id===saved.receiptId).status,'pending');
   assert.equal(unchanged.payments.find(row=>row.id===saved.paymentId).status,'pending');
   assert.equal(unchanged.class_ledger.filter(row=>row.payment_id===saved.paymentId).length,0);
   if(kind==='reject'){
    await drawer.getByRole('button',{name:en?'Reject demo payment':'Rechazar pago demo',exact:true}).click();
    await page.waitForFunction(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.transfer_receipts.find(row=>row.id===id)?.status==='rejected',saved.receiptId);
    const rejected=await db(page);
    assert.equal(rejected.payments.find(row=>row.id===saved.paymentId).status,'declined');
    assert.equal(rejected.transfer_receipts.find(row=>row.id===saved.receiptId).review_reason,'FICTIONAL native evidence review');
    assert.equal(rejected.class_ledger.filter(row=>row.payment_id===saved.paymentId).length,0);
    await page.goto(target);await page.getByRole('dialog').waitFor();
    const historical=await bytes(page);await page.reload();await page.getByRole('dialog').waitFor();
    assert.equal(await bytes(page),historical);
    assert.equal(await page.getByRole('button',{name:en?'Confirm demo payment':'Confirmar pago demo',exact:true}).count(),0);
   }
  }else{
   await page.waitForFunction(()=>[...document.querySelectorAll('[role=dialog] button')].some(button=>/Confirm demo payment|Confirmar pago demo/.test(button.textContent)&&!button.disabled));
   await drawer.getByAltText(en?'Fictional receipt preview':'Vista previa del comprobante ficticio',{exact:true}).waitFor();
   await approve.click();
   await page.waitForFunction(id=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.transfer_receipts.find(row=>row.id===id)?.status==='approved',saved.receiptId);
   const approved=await db(page),grants=approved.class_ledger.filter(row=>row.payment_id===saved.paymentId&&row.reason==='purchase');
   assert.equal(approved.payments.find(row=>row.id===saved.paymentId).status,'approved');
   assert.equal(grants.length,1);assert.equal(grants[0].delta,saved.classes);
   // Historical evidence can later disappear without rewriting the committed review or entitlement.
   await page.evaluate(id=>{const stored=JSON.parse(localStorage.getItem('hoyos.db.v1'));stored.db.transfer_receipts.find(row=>row.id===id).image_data_url=null;localStorage.setItem('hoyos.db.v1',JSON.stringify(stored));},saved.receiptId);
   await page.goto(target);await page.reload();
   await page.getByRole('dialog').getByText(en?'Receipt unavailable':'Comprobante no disponible',{exact:true}).waitFor();
   const historical=await bytes(page);await page.reload();await page.getByRole('dialog').waitFor();
   assert.equal(await bytes(page),historical,'completed missing-image review is read-only across reload');
   assert.equal(await page.getByRole('button',{name:en?'Confirm demo payment':'Confirmar pago demo',exact:true}).count(),0);
   assert.equal(await page.getByRole('button',{name:en?'Reject demo payment':'Rechazar pago demo',exact:true}).count(),0);
   const retained=await db(page);
   assert.deepEqual(retained.class_ledger,approved.class_ledger);
   assert.deepEqual(retained.payments,approved.payments);
   assert.deepEqual(retained.audit_log,approved.audit_log);
   assert.deepEqual(retained.bookings,approved.bookings);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`${out}/${lang}-${width}-${kind}.jpg`,fullPage:true});
  checks.push({lang,width,kind,nativeOnly:true,invalidApprovalBlocked:invalid,wholeDbUnchangedOnDeniedAction:invalid,validPngJpgApproval:!invalid,reasonedRejection:kind==='reject',completedMissingImageHistoryReadonly:!invalid||kind==='reject'});
  console.log('PASS compiled native transfer evidence',lang,width,kind);
  await context.close();
 }
 // Separate AFTER-RUN server-byte binding of assets actually observed by the browser.
 // These are not captured browser response.body bytes (CDP bodies can disappear on navigation).
 for(const url of observedResourceUrls){
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,'after-run asset HTTP status: '+url);
  const body=Buffer.from(await response.arrayBuffer());
  const path=decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '')||'index.html';
  const local=await readFile(join(process.cwd(),'dist',path));
  const sha256=createHash('sha256').update(body).digest('hex');
  assert.equal(sha256,createHash('sha256').update(local).digest('hex'),'after-run server/local asset bytes: '+url);
  afterRunServerResources.push({url,sha256,bytes:body.length});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(sourceRequests,[],'compiled-native test must not import source or QA routes');
 console.log('PASS compiled-native transfer review evidence:',checks.length,'groups');
}catch(error){
 errors.push(String(error));
 if(debug&&!debug.isClosed()){
  await writeFile(out+'/failure.txt',await debug.locator('body').innerText().catch(()=>'<document unavailable>'));
  await debug.screenshot({path:out+'/failure.jpg',fullPage:true}).catch(()=>{});
 }
 throw error;
}finally{
 globalThis.Date=RealDate;await browser.close();
 await writeFile(out+'/results.json',JSON.stringify({base,scope:'Compiled application native controls only; host-side actual mock submit fixture. No browser source imports, direct service/context/lost-ack assertions (separate development suite).',checks,errors,sourceRequests,observedResourceUrls:[...observedResourceUrls],afterRunServerResources,assetBindingMethod:'Separate after-run same-origin HTTP200 fetch + exact local dist bytes; NOT captured browser response-body bytes'},null,2));
}
