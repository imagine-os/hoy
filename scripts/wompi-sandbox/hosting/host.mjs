import {createHash,timingSafeEqual} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {createHandler} from '../../../server/app.mjs';
import {gateSettings} from '../../../server/testGate.mjs';
import {createPilot,CHECKOUT_LIFETIME_MS} from '../../../server/wompi-test-pilot.mjs';

const ids = {
  RAILWAY_PROJECT_ID:'47b41e1d-b201-4da2-9b16-df8636fa136c',
  RAILWAY_ENVIRONMENT_ID:'4cadfc14-06a0-4d84-8df5-d075acbb1f2e',
  RAILWAY_SERVICE_ID:'994827c5-6e6d-44bb-afba-c96f6a44a5f2',
  RAILWAY_ENVIRONMENT_NAME:'wompi-sandbox',
};
const secret=/^[A-Za-z0-9_-]{43,128}$/;
const digest = v => createHash('sha256').update(v).digest();
const gateAndCheckout = new Set(['/health','/test-gate','/','/api/test/wompi/start','/api/test/wompi/result']);

export async function build(env,{now=Date.now,request}={}){
  const ends=Date.parse(env.WOMPI_TEST_CLOSE_AT);
  const auth = [env.TEST_GATE_PASSPHRASE,env.COOKIE_SIGNING_SECRET,env.WOMPI_TEST_OPERATOR_APPROVED,env.WOMPI_TEST_OPERATOR_DECLINED];
  if(Object.entries(ids).some(([k,v])=>env[k]!==v)
    || !/^[a-z0-9][a-z0-9-]{0,62}\.up\.railway\.app$/.test(env.RAILWAY_PUBLIC_DOMAIN??'')
    || env.APP_URL!=='https://'+env.RAILWAY_PUBLIC_DOMAIN
    || auth.some(v=>!secret.test(v??'')) || new Set(auth).size!==4
    || !/^pub_test_[A-Za-z0-9_]{8,128}$/.test(env.WOMPI_SANDBOX_PUBLIC_KEY??'')
    || !/^prv_test_[A-Za-z0-9_]{8,128}$/.test(env.WOMPI_SANDBOX_PRIVATE_KEY??'')
    || !/^test_integrity_[A-Za-z0-9_]{8,128}$/.test(env.WOMPI_SANDBOX_INTEGRITY_SECRET??'')
    || !Number.isFinite(ends)||ends<=now()||ends-now()>3600000)throw Error('sandbox configuration rejected');
  const operators = [auth[2],auth[3]].map(digest);
  const db=new DatabaseSync(':memory:');
  const gate=gateSettings(env);
  const origin=env.APP_URL;
  const checkoutPilot=createPilot({
    environment:'test',testGateOn:gate.on,origin,db,now,request,expiresNoLater:ends,
    publicKey:env.WOMPI_SANDBOX_PUBLIC_KEY,privateKey:env.WOMPI_SANDBOX_PRIVATE_KEY,integrityKey:env.WOMPI_SANDBOX_INTEGRITY_SECRET,
    identify: req=>{
      const match=/^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(req.headers.authorization??'');
      if(!match)return null;
      const raw=digest(match[1]);
      const hits=operators.map(d=>timingSafeEqual(raw,d));
      return hits[0]?'fixture-approval':hits[1]?'fixture-decline':null;
    }
  });
  const handler=await createHandler({distDir:resolve(import.meta.dirname,'static'),environment:'test',testGate:gate,authorizedParties:[origin],tenant:'wompi-synthetic-only',launch:{}},{
    now,checkoutPilot,verifySession:async()=>{throw Error('no_hoy_accounts');},log(){},
  });
  const server=createServer({headersTimeout:10000,requestTimeout:15000,maxHeaderSize:8192},(req,res)=>{
    const path=(req.url??'').split('?')[0];
    const at=now();
    if(at>=ends || !gateAndCheckout.has(path) ||
      (path==='/api/test/wompi/start' && at+CHECKOUT_LIFETIME_MS>ends)){
      res.writeHead(404,{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Content-Type':'text/plain'});
      res.end('Not found');
      return;
    }
    return handler(req,res);
  });
  server.keepAliveTimeout=2000;
  return {server,db,ends};
}
