import assert from 'node:assert/strict';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler } from '../../server/app.mjs';
import { loadConfig } from '../../server/config.mjs';
import { PILOT_FRAME_PATH, PILOT_UNLOCK_PATH } from '../../server/metaHomePilot.mjs';

const distDir = await mkdtemp(join(tmpdir(),'hoy-meta-test-'));
await writeFile(join(distDir,'index.html'),'<!doctype html><title>HOY fixture</title>');
const env = { HOY_ENV:'production',APP_URL:'https://hoyhumanclub.com',COMPANY_OS_TENANT:'hoy',
  COMPANY_OS_URL:'http://127.0.0.1:1',CLERK_SECRET_KEY:'sk_test_fixture',DIST_DIR:distDir };
const key='a'.repeat(43), digest=createHash('sha256').update(key).digest('hex');
try {
  for(const [value,on] of [[undefined,false],['ON',false],[digest,true]]) {
    const config=loadConfig({...env,HOY_META_HOME_PILOT_DIGEST:value});
    const listener=await createHandler(config,{verifySession:async()=>{throw new Error('Unexpected session verification')},log:()=>{}});
    const s=http.createServer(listener).listen(0,'127.0.0.1');
    await once(s,'listening');
    const request = (path,headers={},method='GET',body) => new Promise((resolve,reject)=>{
      const req=http.request({hostname:'127.0.0.1',port:s.address().port,path,method,
        headers:{host:'hoyhumanclub.com',...headers}},res=>{
          let body='';res.setEncoding('utf8').on('data',x=>{body+=x}).on('end',()=>resolve({statusCode:res.statusCode,headers:res.headers,body}));
        }); req.on('error',reject).end(body);
    });
    try {
      const c=await request('/app-config.json');
      assert.equal(c.statusCode,200); assert.equal(JSON.parse(c.body).metaHomePilot,on?true:undefined);assert.ok(!c.body.includes(digest));
      const host=await request('/app-config.json',{host:'other.invalid'});
      assert.equal(JSON.parse(host.body).metaHomePilot,undefined);
      const context={'sec-fetch-site':'same-origin','sec-fetch-dest':'empty',origin:'https://hoyhumanclub.com','content-type':'text/plain;charset=UTF-8'};
      const hints={'sec-fetch-site':'same-origin','sec-fetch-dest':'iframe'};
      assert.equal((await request(PILOT_FRAME_PATH,hints)).statusCode,404);
      for(const [path,h,m,body] of [[PILOT_UNLOCK_PATH,{}],[PILOT_UNLOCK_PATH,{...context,host:'other.invalid'},'POST',key],
        [PILOT_UNLOCK_PATH+'?private=data',context,'POST',key],[PILOT_UNLOCK_PATH,{...context,'sec-fetch-site':'cross-site'},'POST',key],
        [PILOT_UNLOCK_PATH,context,'POST','b'.repeat(43)],[PILOT_UNLOCK_PATH,context,'POST','b'.repeat(500)]]) assert.equal((await request(path,h,m,body)).statusCode,404);
      const unlocked=await request(PILOT_UNLOCK_PATH,context,'POST',key); assert.equal(unlocked.statusCode,on?204:404);
      if(on) {
        const cookie=unlocked.headers['set-cookie'][0].split(';',1)[0];
        assert.equal((await request(PILOT_FRAME_PATH,{...hints,cookie,referer:'https://hoyhumanclub.com/'})).statusCode,404);
        const f=await request(PILOT_FRAME_PATH,{...hints,cookie}); assert.equal(f.statusCode,200);
        assert.equal(f.headers['referrer-policy'],'no-referrer');assert.equal(f.headers['cache-control'],'no-store');
        assert.match(f.body,/963759066544104/);assert.ok(!f.body.includes(key));
        assert.equal((await request(PILOT_FRAME_PATH,{...hints,cookie})).statusCode,404);
      }
      assert.equal((await request(PILOT_UNLOCK_PATH,context,'POST',key)).statusCode,404);
      assert.equal(JSON.parse((await request('/app-config.json')).body).metaHomePilot,undefined);
      assert.equal((await request('/health')).statusCode,200);
    } finally { await new Promise(resolve=>s.close(resolve)); }
  }
} finally { await rm(distDir,{recursive:true,force:true}); }
console.log('HOY server HTTP: flag off/strict/default, origin and iframe guards, policy headers and health passed. No vendor requests.');
