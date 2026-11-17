// Public production reads only. Runs after Railway deploy, never after a Pages-only deployment.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {PAGES} from '../server/pageMeta.mjs';
import {socialSurfaces,socialHead} from './lib/social-sharing.mjs';
import {publishedSite,verifyReleaseProof,verifyMeta,verifyFinale} from './lib/release-verifier-contracts.mjs';
const expected=process.argv[2];assert.match(expected||'',/^[0-9a-f]{40}$/,'an exact released source SHA is required');
const base=new URL(process.env.WEBSITE_BASE_URL||'https://hoyhumanclub.com/');
assert.equal(base.href,'https://hoyhumanclub.com/','production verification requires the canonical production origin');
await mkdir('qa/website-release',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[];let proof=null,active=null;
try{
 const crawler=await browser.newContext({javaScriptEnabled:false});
 const configResponse=await crawler.request.get(new URL('app-config.json',base).href);assert.equal(configResponse.status(),200);publishedSite(await configResponse.json());
 for(let attempt=0;attempt<12;attempt++){
  const [healthResponse,releaseResponse]=await Promise.all(['health','release.json'].map(path=>crawler.request.get(new URL(path+'?source='+expected,base).href)));
  if(healthResponse.ok()&&releaseResponse.ok()){
   const [health,release]=await Promise.all([healthResponse.json(),releaseResponse.json()]);proof={health,release};
   if(health.commit===expected&&release.sourceCommit===expected){verifyReleaseProof(health,release,expected);break;}
  }
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
 verifyReleaseProof(proof?.health,proof?.release,expected);checks.push('published production with exact health/manifest SHA and matching version');
 const surfaces=[...['/','/planes','/profesores','/contacto'].map(path=>({path,...PAGES[path],seo:true})),{...socialSurfaces.website,seo:false}];
 for(const surface of surfaces){
  const page=active=await crawler.newPage();const response=await page.goto(new URL(surface.path.slice(1),base).href,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);assert.equal(new URL(page.url()).origin,base.origin);
  assert.equal(await page.title(),surface.title);
  if(surface.seo){
   const actual=await page.evaluate(()=>{const m=(key,property=false)=>document.querySelector(`meta[${property?'property':'name'}="${key}"]`)?.content;const ld=JSON.parse(document.querySelector('#hoyos-localbusiness')?.textContent||'null');return {title:document.title,description:m('description'),canonical:document.querySelector('link[rel="canonical"]')?.href,image:m('og:image',true),imageAlt:m('og:image:alt',true),ogTitle:m('og:title',true),ogDescription:m('og:description',true),ogUrl:m('og:url',true),ogType:m('og:type',true),ogLocale:m('og:locale',true),ogSiteName:m('og:site_name',true),twitterCard:m('twitter:card'),twitterTitle:m('twitter:title'),twitterDescription:m('twitter:description'),twitterImage:m('twitter:image'),ogWidth:m('og:image:width',true),ogHeight:m('og:image:height',true),lang:document.documentElement.lang,jsonLdType:ld?.['@type']};});
   verifyMeta(actual,{title:surface.title,description:surface.description,canonical:base.origin+surface.path,image:base.origin+socialSurfaces.website.image,imageAlt:socialSurfaces.website.imageAlt});
  }else assert((await response.text()).includes(socialHead(surface)),'legacy website preview retains its exact build-time metadata');
  const image=await crawler.request.get(new URL(socialSurfaces.website.image.slice(1),base).href);assert.equal(image.status(),200);assert(image.headers()['content-type'].includes('image/png'));
  const png=await image.body();assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
  checks.push(surface.path+' exact metadata and 1200x630 image');await page.close();active=null;
 }
 await crawler.close();
 for(const lang of ['es','en'])for(const dark of [false,true])for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.addInitScript(({lang,dark})=>{localStorage.setItem('hoyos.lang',lang);localStorage.setItem('hoyos.theme',JSON.stringify({theme:dark?'dark':'light',skin:'styled'}));},{lang,dark});
  const page=active=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('website/',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForURL(url=>url.origin===base.origin&&url.pathname==='/'&&!url.hash);
  await page.locator('.site[data-site-version="latest"]').waitFor();
  const section=page.locator('.option1-finale');await section.scrollIntoViewIfNeeded();
  const portraits=section.locator('.option1-finale-portraits img');
  // This current source-owned composition replaced the retired separate arch/background images.
  assert((await portraits.getAttribute('src')).includes('finale-rings-reconstructed.png'));
  await section.evaluate(async el=>{await Promise.all([...el.querySelectorAll('img')].map(i=>i.decode()));});
  const geometry=await section.evaluate(el=>{const image=el.querySelector('.option1-finale-portraits img'),frame=image.parentElement,card=el.querySelector('.sanctuary-finale-card');const a=frame.getBoundingClientRect(),i=image.getBoundingClientRect(),c=card.getBoundingClientRect(),overlay=getComputedStyle(frame,'::after');return {natural:image.naturalWidth/image.naturalHeight,ratio:i.width/i.height,gutter:Math.abs(a.width-i.width),clear:c.top>=i.top+i.height*(innerWidth<=900?1:.51),overlay:overlay.opacity,overlayColor:overlay.backgroundColor,sectionColor:getComputedStyle(el).backgroundColor,overlayPointer:overlay.pointerEvents,href:card.querySelector('a').getAttribute('href'),fits:[...card.querySelectorAll('p,h2,a')].every(e=>e.scrollWidth<=e.clientWidth+1)};});
  verifyFinale(geometry);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const suffix=lang+'-'+(dark?'dark':'light')+'-'+width;await section.screenshot({path:'qa/website-release/home-option1-'+suffix+'.png'});
  await page.goto(new URL('planes',base).href,{waitUntil:'domcontentloaded'});await page.locator('.site-pagehead').waitFor();await page.evaluate(()=>scrollTo(0,0));
  const decoration=await page.locator('.site-pagehead').evaluate(el=>({mask:getComputedStyle(el,'::after').maskImage,pointer:getComputedStyle(el,'::after').pointerEvents}));assert(decoration.mask.includes('radial-gradient'));assert.equal(decoration.pointer,'none');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'qa/website-release/plans-'+suffix+'.png'});assert.deepEqual(errors,[]);checks.push('Latest redirect, Option1 frame and Plans decoration '+suffix);await context.close();active=null;
 }
 await writeFile('qa/website-release/verified.json',JSON.stringify({base:base.href,expectedSource:expected,...proof,checkedAt:new Date().toISOString(),checks},null,2));console.log('PASS production website: exact SHA, real-path crawler previews, eight responsive/language/theme photo and Plans groups');
}catch(error){await writeFile('qa/website-release/failure.json',JSON.stringify({expectedSource:expected,base:base.href,proof,checks,message:String(error.message),url:active?.url()},null,2));if(active&&!active.isClosed())await active.screenshot({path:'qa/website-release/failure.png'}).catch(()=>{});throw error;
}finally{await browser.close();}
