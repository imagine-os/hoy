import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {socialHead,socialSurfaces} from './lib/social-sharing.mjs';
for (const [key,surface] of Object.entries(socialSurfaces)) {
 const html=await readFile(key==='comingSoon'?'index.html':'public/website/index.html','utf8');
 assert.ok(html.includes(socialHead(surface)),`${key}: generated metadata drift`);
 assert.equal((html.match(/<title>/g)||[]).length,1);
 assert.equal((html.match(/property="og:image"/g)||[]).length,1);
 assert.ok(!html.includes('HoyOS'));
 const png=await readFile('public'+surface.image);
 assert.equal(png.subarray(1,4).toString(),'PNG');
 assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 assert.ok(png.length>100000);
 assert.ok(!surface.path.includes('#'));
}
assert.notEqual(socialSurfaces.comingSoon.image,socialSurfaces.website.image);
const root=await readFile('index.html','utf8');
assert.ok(root.includes('<div id="root"></div>'));assert.ok(root.includes('src="/src/main.tsx"'));
const redirect=await readFile('public/website/open-website.js','utf8');
for(const [input,expected] of [
 ['https://hoyhumanclub.com/website/','https://hoyhumanclub.com/#/site'],
 ['https://imagine-os.github.io/hoy/website/','https://imagine-os.github.io/hoy/#/site'],
 ['https://hoyhumanclub.com/website/?next=https://example.com#evil','https://hoyhumanclub.com/#/site'],
]) { let actual;runInNewContext(redirect,{URL,window:{location:{href:input,replace:value=>actual=value}}});assert.equal(actual,expected); }
console.log('PASS social metadata: two static surfaces, image dimensions, root preservation and three safe redirects');
