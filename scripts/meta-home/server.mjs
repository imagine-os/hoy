import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler } from '../../server/app.mjs';
import { loadConfig } from '../../server/config.mjs';
import { PILOT_FRAME_PATH } from '../../server/metaHomePilot.mjs';

const distDir = await mkdtemp(join(tmpdir(),'hoy-meta-test-'));
await writeFile(join(distDir,'index.html'),'<!doctype html><title>HOY fixture</title>');
const env = { HOY_ENV:'production',APP_URL:'https://hoyhumanclub.com',COMPANY_OS_TENANT:'hoy',
  COMPANY_OS_URL:'http://127.0.0.1:1',CLERK_SECRET_KEY:'sk_test_fixture',DIST_DIR:distDir };
try {
  for(const [value,on] of [[undefined,false],['ON',false],['on',true]]) {
    const config=loadConfig({...env,HOY_META_HOME_PILOT:value});
    const listener=await createHandler(config,{verifySession:async()=>{throw new Error('Unexpected session verification')},log:()=>{}});
    const s=http.createServer(listener).listen(0,'127.0.0.1');
    await once(s,'listening');
    const request = (path,headers={},method='GET') => new Promise((resolve,reject)=>{
      const req=http.request({hostname:'127.0.0.1',port:s.address().port,path,method,
        headers:{host:'hoyhumanclub.com',...headers}},res=>{
          let body='';res.setEncoding('utf8').on('data',x=>{body+=x}).on('end',()=>resolve({statusCode:res.statusCode,headers:res.headers,body}));
        }); req.on('error',reject).end();
    });
    try {
      const c=await request('/app-config.json');
      assert.equal(c.statusCode,200); assert.equal(JSON.parse(c.body).metaHomePilot,on?true:undefined);
      const host=await request('/app-config.json',{host:'other.invalid'});
      assert.equal(JSON.parse(host.body).metaHomePilot,undefined);
      const context={'sec-fetch-site':'same-origin','sec-fetch-dest':'iframe'};
      const f=await request(PILOT_FRAME_PATH,context); assert.equal(f.statusCode,on?200:404);
      if(on) {
        assert.equal(f.headers['referrer-policy'],'no-referrer');assert.equal(f.headers['cache-control'],'no-store');
        assert.match(f.body,/963759066544104/);
      }
      for(const [path,h,m] of [[PILOT_FRAME_PATH,{}],[PILOT_FRAME_PATH,{...context,host:'other.invalid'}],
        [PILOT_FRAME_PATH+'?private=data',context],[PILOT_FRAME_PATH,{...context,'sec-fetch-site':'cross-site'}],
        [PILOT_FRAME_PATH,context,'POST']]) assert.equal((await request(path,h,m)).statusCode,404);
      assert.equal((await request('/health')).statusCode,200);
    } finally { await new Promise(resolve=>s.close(resolve)); }
  }
} finally { await rm(distDir,{recursive:true,force:true}); }
console.log('HOY server HTTP: flag off/strict/default, origin and iframe guards, policy headers and health passed. No vendor requests.');
