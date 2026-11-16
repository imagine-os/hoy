import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localReviewBase,verifyReviewProof,publishedSite,verifyReleaseProof,verifyMeta,verifyReviewBundle,verifyFinale} from './lib/release-verifier-contracts.mjs';
const sha='a'.repeat(40);
test('review probes refuse external origins, credentials, paths, redirect destinations and production proof',()=>{
 assert.equal(localReviewBase('http://127.0.0.1:5493/').origin,'http://127.0.0.1:5493');
 for(const url of ['https://hoyhumanclub.com/','https://imagine-os.github.io/hoy/','http://127.0.0.1.evil.test/','http://u:p@127.0.0.1:5493/','http://127.0.0.1:5493/path','http://127.0.0.1:5493/?x=1'])assert.throws(()=>localReviewBase(url));
 verifyReviewProof({kind:'review',project:'hoy',sourceCommit:sha},{version:'1.3.1',sourceCommit:sha},sha,'hoy');
 for(const patch of [{kind:'production'},{project:'other'},{sourceCommit:'b'.repeat(40)}])assert.throws(()=>verifyReviewProof({kind:'review',project:'hoy',sourceCommit:sha,...patch},{sourceCommit:sha},sha,'hoy'));
});
test('production proof and active launch are explicit; mismatched/missing commits or launch fail',()=>{
 verifyReleaseProof({ok:true,commit:sha,version:'1.3.1'},{sourceCommit:sha,version:'1.3.1'},sha);
 for(const health of [{ok:true,commit:'b'.repeat(40),version:'1.3.1'},{ok:true,commit:sha,version:'old'},{}])assert.throws(()=>verifyReleaseProof(health,{sourceCommit:sha,version:'1.3.1'},sha));
 assert(publishedSite({environment:'production',launch:{siteLive:true}}));assert(publishedSite({environment:'production',launch:{siteLiveAt:'2000-01-01T00:00:00Z'}}));
 for(const c of [{environment:'test',launch:{siteLive:true}},{environment:'production',launch:{siteLive:false}},{environment:'production',launch:{siteLiveAt:'2999-01-01T00:00:00Z'}}])assert.throws(()=>publishedSite(c));
});
test('semantic SEO assertions retain exact title/description/canonical/social image across real paths',()=>{
 const expected={title:'Planes',description:'Prices',canonical:'https://hoyhumanclub.com/planes',image:'https://hoyhumanclub.com/social/hoy.png',imageAlt:'HOY'};
 const actual={...expected,ogTitle:'Planes',ogDescription:'Prices',ogUrl:expected.canonical,ogType:'website',ogLocale:'es_CO',ogSiteName:'HOY Human Club',twitterCard:'summary_large_image',twitterTitle:'Planes',twitterDescription:'Prices',twitterImage:expected.image,ogWidth:'1200',ogHeight:'630',lang:'es-CO',jsonLdType:'HealthClub'};
 verifyMeta(actual,expected);
 for(const patch of [{title:'Coming soon'},{canonical:'https://wrong.test/'},{ogDescription:'Wrong'},{image:'https://wrong.test/a.png'},{jsonLdType:'Other'}])assert.throws(()=>verifyMeta({...actual,...patch},expected));
});
test('workflow gates production verification after Railway and release after verification; Pages checks local exact artifact',async()=>{
 const prod=await readFile(new URL('../.github/workflows/deploy-prod.yml',import.meta.url),'utf8'),pages=await readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
 assert(/verify-website:\n\s+needs: \[guard, deploy\]/.test(prod));assert(/release:\n\s+needs: \[deploy, verify-website\]/.test(prod));
 assert(!pages.includes('WEBSITE_BASE_URL: https://hoyhumanclub.com/'));assert(pages.includes('review-bundle-${{ github.sha }}'));assert(pages.includes('QA_REVIEW_DIST:'));
 assert(prod.includes('scripts/test-website-live.mjs')&&prod.includes('scripts/test-website-native-cursor.mjs'));
});

test('review proof requires actual demo bundle markers; finale keeps current full artwork and no-occlusion checks',()=>{
 verifyReviewBundle('hoyos.session usr_super','hoy');assert.throws(()=>verifyReviewBundle('production clerk runtime','hoy'));assert.throws(()=>verifyReviewBundle('hoyos.session usr_super','other'));
 const g={natural:1374/1145,ratio:1374/1145,gutter:0,clear:true,overlay:'0.2',overlayColor:'rgb(53, 89, 125)',sectionColor:'rgb(53, 89, 125)',overlayPointer:'none',href:'/horario',fits:true};verifyFinale(g);
 for(const patch of [{natural:2/3},{ratio:1},{gutter:3},{clear:false},{overlay:'0.6'},{overlayColor:'rgb(255, 0, 0)'},{overlayPointer:'auto'},{href:'#/site/schedule'},{fits:false}])assert.throws(()=>verifyFinale({...g,...patch}));
});
test('native cursor retains review edition coverage and production canonical paths; retired arch contract is replaced by current ring composition',async()=>{
 const cursor=await readFile(new URL('./test-website-native-cursor.mjs',import.meta.url),'utf8'),website=await readFile(new URL('./test-website-live.mjs',import.meta.url),'utf8'),subscriptions=await readFile(new URL('./test-subscriptions-live.mjs',import.meta.url),'utf8');
 assert(cursor.includes("['latest','photos','classic','archive']"));assert(cursor.includes("production?'latest':version"));assert(cursor.includes('SITE_PATHS'));assert(cursor.includes('if(!production)localReviewBase'));
 assert(website.includes('finale-rings-reconstructed.png'));assert(!website.includes('option1-finale-arch'));assert(website.includes('verifyFinale(geometry)'));assert(subscriptions.includes('verifyReviewProof(proof,artifactRelease,expected,project)'));assert(subscriptions.includes("route.abort()"));
});

test('Pages verifies artifact before publishing and both automatic workflows execute local four-edition cursor coverage',async()=>{
 const pages=await readFile(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8'),qa=await readFile(new URL('../.github/workflows/release-verifiers-qa.yml',import.meta.url),'utf8'),cursor=await readFile(new URL('./test-website-native-cursor.mjs',import.meta.url),'utf8');
 assert(/deploy:\n\s+needs: \[build, verify-subscriptions\]/.test(pages));assert(/verify-subscriptions:\n\s+needs: build/.test(pages));
 for(const source of [pages,qa]){assert(source.includes('Verify exact review artifact native cursor'));assert(source.includes('node scripts/test-website-native-cursor.mjs'));assert(source.includes('QA_REVIEW_DIST:'));}
 assert(cursor.includes('verifyReviewProof('));assert(cursor.includes('route.abort()'));assert(cursor.includes('await localServer?.close()'));
});
