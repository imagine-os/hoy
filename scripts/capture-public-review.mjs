import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const routes=['/','/nosotros','/clases','/metodologias','/horario','/profesores','/planes','/preguntas','/contacto','/eliminar-cuenta','/legal/terminos','/legal/privacidad',...['ligereza','hibrido','fuego','solido','centro','alineacion','pulso'].map(x=>'/clases/'+x)];
await mkdir('qa/public-review',{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const records=[];
try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
const release=await (await page.request.get('https://hoyhumanclub.com/release.json')).json();
for(const [index,route] of routes.entries()){
const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
const res=await page.goto('https://hoyhumanclub.com'+route,{waitUntil:'networkidle',timeout:60000});await page.locator('.site').waitFor();await page.evaluate(()=>document.fonts.ready);
for(let pass=0;pass<2;pass++){for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=750){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(180);}await page.waitForTimeout(500);}
await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.querySelectorAll('video').forEach(v=>v.pause());scrollTo(0,0)});await page.waitForTimeout(500);
const file=`${String(index+1).padStart(2,'0')}-${width}.png`;await page.screenshot({path:'qa/public-review/'+file,fullPage:true});
const detail=await page.evaluate(()=>({title:document.title,height:document.body.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.currentSrc||i.src)}));
records.push({route,width,file,time:new Date().toISOString(),status:res.status(),release,...detail,errors});page.off('pageerror',onError);
await writeFile('qa/public-review/manifest.json',JSON.stringify(records,null,2));console.log(route,width,detail.height,detail.images.length);
}await page.close();}}finally{await browser.close()}
