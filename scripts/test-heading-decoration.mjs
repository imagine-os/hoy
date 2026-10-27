import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const css=await readFile('src/modules/website/sanctuary.css','utf8');
const rule=css.match(/\.site\[data-edition="sanctuary"\] \.site-pagehead::after \{[^}]+\}/)?.[0];
assert.ok(rule);assert.ok(rule.includes('mask-image: radial-gradient'));
const image=(await readFile('public/images/sanctuary/texture-blue.webp')).toString('base64');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage','--disk-cache-size=0']});
await mkdir('evidence',{recursive:true});let groups=0;
try {
 for(const width of [390,1280]) for(const dark of [false,true]) {
  const page=await browser.newPage({viewport:{width,height:500}});
  const background=dark?'#142d43':'#f1e7d2';
  await page.setContent(`<style>body{margin:0;background:${background};color:${dark?'#f1e7d2':'#35597d'}}.site{--sp-2xl:32px}.site-pagehead{position:relative;height:280px;padding:40px;box-sizing:border-box}h1{position:relative;font:48px Georgia;z-index:1}${rule.replace("../../../public/images/sanctuary/texture-blue.webp",`data:image/webp;base64,${image}`)}</style><div class="site" data-edition="sanctuary"><header class="site-pagehead"><h1>Planes y paquetes</h1></header></div>`);
  const result=await page.locator('.site-pagehead').evaluate(el=>{const s=getComputedStyle(el,'::after');return {mask:s.maskImage,pointer:s.pointerEvents,width:s.width,overflow:document.documentElement.scrollWidth>innerWidth}});
  assert.ok(result.mask.includes('radial-gradient'));assert.equal(result.pointer,'none');assert.equal(result.width,'200px');assert.equal(result.overflow,false);
  await page.screenshot({path:`evidence/heading-${dark?'dark':'light'}-${width}.png`});groups++;await page.close();
 }
 console.log(`PASS ${groups} shared heading decoration render groups; source mask, dimensions, pointer safety and overflow`);
}finally{await browser.close()}
