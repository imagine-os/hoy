// Retained C-37 presentation checks, adapted to the persisted mock purchase route.
// Actual purchase/approval/activation/booking is covered by test-gift-purchase-flow-ui.mjs.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.HOY_TEST_URL??process.env.QA_BASE??'http://127.0.0.1:5174';
const out=process.env.QA_OUTPUT??'docs/frontend-completion/evidence/voucher-gifts-library';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const results=[],errors=[];
try {
  const context=await browser.newContext({viewport:{width:390,height:1000}});
  await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/,route=>route.abort());
  await context.addInitScript(()=>{localStorage.setItem('hoyos.lang','en');if(!localStorage.getItem('hoyos.session'))localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_cust',devMode:false,viewAs:null}));});
  const page=await context.newPage();await page.clock.setFixedTime(new Date('2026-10-23T15:00:00Z'));page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/#/app/voucher-gifts');
  const submit=page.getByRole('button',{name:'Save test transfer request',exact:true});
  await submit.waitFor();await page.waitForFunction(()=>!!localStorage.getItem('hoyos.db.v1'));
  const snapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')));
  for(const theme of ['light','dark']) {
    await page.evaluate(theme=>localStorage.setItem('hoyos.theme',JSON.stringify({theme,skin:'styled'})),theme);await page.reload();await submit.waitFor();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.evaluate(()=>localStorage.getItem('hoyos.db.v1')),JSON.stringify(snapshot),'presentation-only empty state does not create a purchase');
    await page.screenshot({path:`${out}/en-390-${theme}-empty.jpg`,fullPage:true,quality:72});
    results.push({theme,empty:true,noOverflow:true,noMutation:true});
  }
  await page.evaluate(()=>{const fixture=JSON.parse(localStorage.getItem('hoyos.db.v1'));fixture.db.plans.filter(plan=>plan.id.startsWith('plan_gift')).forEach(plan=>{plan.active=false;if(plan.frontend_publication)plan.frontend_publication.withdrawnAt='2026-10-23T15:00:00Z';});localStorage.setItem('hoyos.db.v1',JSON.stringify(fixture));});
  await page.reload();await submit.waitFor();
  const unavailable=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
  await page.getByLabel('Fictional recipient email (.test)').fill('friend@demo.test');
  await page.getByRole('button',{name:'Use fictional test image',exact:true}).click();
  await page.locator('figcaption').getByText('fictional-demo-receipt.png',{exact:true}).waitFor();
  assert(await submit.isDisabled(),'unavailable quotation blocks submission even with recipient and image');
  assert.equal(await page.evaluate(()=>localStorage.getItem('hoyos.db.v1')),unavailable);
  results.push({quoteUnavailable:true,submitDisabled:true,noPurchase:true});
  await page.evaluate(snapshot=>{localStorage.setItem('hoyos.db.v1',JSON.stringify(snapshot));localStorage.setItem('hoyos.session',JSON.stringify({userId:'usr_super',devMode:true,viewAs:null}));},snapshot);
  await page.goto(base+'/?library=1#/dev/components');await page.reload();
  const library=page.locator('#cmp-VoucherGiftDemo');await library.waitFor();
  assert.equal(await library.locator('.lib-usage').count(),7);
  await library.getByRole('heading',{name:'This voucher has expired and cannot be redeemed.',exact:true}).waitFor();
  assert.equal(await library.getByRole('button',{name:'Redeem once in rehearsal',exact:true}).count(),0);
  results.push({libraryUsages:7,expiredPreview:true});assert.deepEqual(errors,[]);
  await context.close();
} finally {await browser.close();await writeFile(out+'/results.json',JSON.stringify({base,results,errors},null,2));}
console.log('PASS retained gift presentation: light/dark empty, unavailable quote, seven D02 usages and expired fixture');
