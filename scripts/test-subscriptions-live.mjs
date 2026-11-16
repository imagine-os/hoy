import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {serveDist} from './lib/launch-qa.mjs';
import {localReviewBase,verifyReviewProof} from './lib/release-verifier-contracts.mjs';
const project=process.argv[2],expected=process.argv[3];
assert(['hoy','petrock'].includes(project),'known_review_project_required');
assert(process.env.QA_REVIEW_DIST,'exact_review_artifact_directory_required');
assert(!process.env.QA_BASE,'external_or_override_base_not_permitted_for_review_probe');
const directory=resolve(process.env.QA_REVIEW_DIST);
const [proof,artifactRelease]=await Promise.all(['qa-review-proof.json','release.json'].map(name=>readFile(join(directory,name),'utf8').then(JSON.parse)));
verifyReviewProof(proof,artifactRelease,expected,project);
const server=await serveDist(5493,directory),base=localReviewBase(server.base+'/');
const route=project==='hoy'?'/admin/finance/subscriptions':'/admin/subscriptions';const prefix=project==='hoy'?'hoyos':'petrock';
let browser;
try {
browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:900}});const errors=[];
await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===base.origin?route.continue():route.abort();});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await context.addInitScript(prefix=>{localStorage.setItem(prefix+'.session',JSON.stringify({userId:'usr_super',devMode:false,viewAs:null}));localStorage.setItem(prefix+'.lang','en');},prefix);
 const url=`${base.href}#${route}`;const response=await page.goto(url,{waitUntil:'networkidle',timeout:60000});assert.equal(response.status(),200);assert.equal(new URL(page.url()).origin,base.origin,'review_navigation_stays_loopback');
 await page.locator('.app-directory').getByRole('heading',{name:'Apps & subscriptions',exact:true}).waitFor({timeout:15000});
 const pkg=JSON.parse(await readFile('package.json','utf8'));
 const releaseUrl=new URL('release.json',url.split('#')[0]);releaseUrl.searchParams.set('source',expected);
 let release;
 for(let attempt=0;attempt<12;attempt++){
  const res=await context.request.get(releaseUrl.href);if(res.ok()){const candidate=await res.json();if(candidate.sourceCommit===expected){release=candidate;break;}}
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
 assert.equal(release?.sourceCommit,expected,'live assets identify the deployed source SHA');assert.equal(release.version,pkg.version);
 const mapResponse=await context.request.get(new URL('hub-map.json',url.split('#')[0]).href);assert(mapResponse.ok());const map=await mapResponse.json();assert.equal(map.product.version,release.version);
 for(const code of ['M-14','M-14a']){const entry=map.pages.find(p=>p.code===code);assert(entry,code+' released');assert.deepEqual(entry.shots,{thumbs:{},full:{}},'protected capture URLs excluded');}

 assert((await page.locator('.app-directory').textContent()).includes('No active subscriptions recorded.'));
 assert((await page.locator('.app-directory').textContent()).includes('DISCONNECTED'));
 assert.equal(await page.locator('.service-card').count(),5);
 assert.equal(await page.locator('.service-card a svg[data-icon="arrow-up"]').count(),5);
 assert(!(await page.locator('.app-directory').textContent()).includes('↗'));
 assert(await page.locator('.service-logo').evaluateAll(imgs=>imgs.every(img=>img.complete && img.naturalWidth>0)));
 assert((await page.locator('.service-catalog').textContent()).includes('USD 8.40'));
 assert.deepEqual(errors,[]);await mkdir(`qa/subscription-release/${project}`,{recursive:true});
 await page.screenshot({path:`qa/subscription-release/${project}/live-1280.png`,fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.locator('.app-directory').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:`qa/subscription-release/${project}/live-390.png`,fullPage:true});
 await page.goto(`${url.split('#')[0]}#/admin/class-schedule`);await page.getByRole('heading',{name:'Class Schedule',exact:true}).waitFor();await page.locator('.session-calendar').waitFor();
 await page.goto(`${url.split('#')[0]}#/site/schedule`);await page.locator('.session-calendar').waitFor();assert.deepEqual(errors,[]);
 if(project==='hoy') {
  assert.equal(map.pages.find(p=>p.code==='M-15')?.route,'/admin/promotions','promotion results have a distinct released code');
  const teacher=await page.evaluate(()=>JSON.parse(localStorage.getItem('hoyos.db.v1')).db.teachers[0].id);
  await page.goto(`${url.split('#')[0]}#/admin/content?entity=teachers&row=${teacher}`);await page.getByRole('dialog').locator('.shared-image-field').waitFor();
  await page.goto(`${url.split('#')[0]}#/hub/promotions`);await page.locator('.promotion-practice').waitFor();
  const before=await page.evaluate(()=>localStorage.getItem('hoyos.db.v1'));
  await page.getByRole('button',{name:'Simulate sharing',exact:true}).click();
  await page.getByRole('button',{name:'Simulate claim and booking',exact:true}).click();
  await page.getByLabel('Enter the practice code',{exact:true}).fill('TRAINING-01');
  await page.getByRole('button',{name:'Verify example',exact:true}).click();
  await page.getByRole('button',{name:'Simulate check-in',exact:true}).click();await page.getByText('Journey complete',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('hoyos.db.v1')),before,'live isolated practice does not write provider data');
  await page.goto(`${url.split('#')[0]}#/staff/vouchers`);await page.getByRole('heading',{name:'Vouchers at reception',exact:true}).waitFor();
  await page.getByLabel('Code or full link',{exact:true}).fill('NOT-A-REAL-CODE');await page.getByRole('button',{name:'Find code',exact:true}).click();
  await page.getByText('This code was not found here. Check the link and browser where it was created; this test is local.',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
 }
 await writeFile(`qa/subscription-release/${project}/verified.json`,JSON.stringify({url,expectedCommit:expected,release,checkedAt:new Date().toISOString(),httpStatus:response.status(),checks:['exact live source SHA/version','scheduling routes in release map','live admin/public schedule renders','protected captures excluded','deployed directory renders','starts empty','disconnected adapters visible','390/1280 captures','no page errors','live Content photo chooser','distinct promotion spec','live isolated promotion journey without provider writes','live reception missing-code state'],errors},null,2));console.log('Verified '+url);
} finally {await browser?.close();await server.close();}
