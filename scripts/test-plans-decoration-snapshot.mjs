import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {plansDecorationSnapshot} from './lib/plans-decoration-snapshot.mjs';
function fixture() {
 const node=(mask='radial-gradient(closest-side, black, transparent)',connected=true)=>({isConnected:connected,mask,pointer:'none',visibility:'visible',getClientRects(){return this.isConnected?[{}]:[];},closest:()=>({dataset:{siteVersion:'latest'}})});
 const state={head:node()};
 globalThis.document={querySelector:()=>state.head,documentElement:{scrollWidth:390}};
 globalThis.innerWidth=390;globalThis.location={pathname:'/planes'};
 globalThis.getComputedStyle=(el,pseudo)=>pseudo?{maskImage:el.isConnected?el.mask:'',pointerEvents:el.isConnected?el.pointer:''}:{visibility:el.visibility};
 return {state,node};
}
test('a detached retained handle has empty styles; fresh document query samples the attached replacement',()=>{const {state,node}=fixture(),old=state.head;old.isConnected=false;assert.equal(getComputedStyle(old,'::after').maskImage,'');state.head=node();const sample=plansDecorationSnapshot();assert.equal(sample.connected,true);assert.match(sample.mask,/radial-gradient/);assert.equal(sample.path,'/planes');assert.equal(sample.width,390);assert.equal(sample.edition,'latest');});
test('only missing, detached or invisible required DOM requests readiness waiting',()=>{const {state,node}=fixture();state.head=null;assert.equal(plansDecorationSnapshot(),false);state.head=node(undefined,false);assert.equal(plansDecorationSnapshot(),false);state.head=node();state.head.visibility='hidden';assert.equal(plansDecorationSnapshot(),false);});
test('wrong mask, pointer capture and overflow return immediately and fail the unchanged strict checks',()=>{const {state}=fixture();state.head.mask='none';state.head.pointer='auto';document.documentElement.scrollWidth=420;const sample=plansDecorationSnapshot();assert.notEqual(sample,false);assert.equal(sample.mask,'none');assert.equal(sample.pointer,'auto');assert.equal(sample.fits,false);assert.throws(()=>assert(sample.mask.includes('radial-gradient')));assert.throws(()=>assert.equal(sample.pointer,'none'));assert.throws(()=>assert.equal(sample.fits,true));});
test('live verifier uses atomic evidence, preserves all eight variants and stores failed sample before assertions',()=>{const s=readFileSync(new URL('./test-website-live.mjs',import.meta.url),'utf8');assert(s.includes('page.waitForFunction(plansDecorationSnapshot'));assert(!s.includes("page.locator('.site-pagehead').evaluate"));for(const check of ["assert.equal(decoration.connected,true)","assert(decoration.mask.includes('radial-gradient'))","assert.equal(decoration.pointer,'none')","assert.equal(decoration.fits,true)"])assert(s.includes(check));assert(s.indexOf('plansProbe={suffix,...decoration}')<s.indexOf('assert.equal(decoration.connected,true)'));assert(s.includes('proof,checks,plansProbe,message:'));assert(s.includes("for(const lang of ['es','en'])for(const dark of [false,true])for(const width of [390,1280])"));});
