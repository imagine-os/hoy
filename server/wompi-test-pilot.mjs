import {randomUUID} from 'node:crypto';
import {checkoutForQuote,checkSandboxTransaction} from './wompi-sandbox.mjs';

const amountInCents=5500000;
const currency='COP';
export const CHECKOUT_LIFETIME_MS=15*60*1000;
const invalid=Symbol('invalid body');

async function input(req) {
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??'')
    || Number(req.headers['content-length']??0)>256) return invalid;
  const parts=[];let size=0;
  try {
    for await(const part of req) {
      size+=part.length;
      if(size>256)return invalid;
      parts.push(part);
    }
    const data=JSON.parse(Buffer.concat(parts).toString());
    return data&&typeof data==='object'&&!Array.isArray(data)?data:invalid;
  } catch {return invalid;}
}

function reply(res,status,data) {
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'});
  res.end(JSON.stringify(data));
}

// An unmounted, test-only pilot. Parent must enforce the actual HOY test gate
// before invoking any endpoint; identify must return only authorized test-subject IDs.
export function createPilot({environment,testGateOn,db,origin,publicKey,privateKey,integrityKey,
  identify,request,now=Date.now,expiresNoLater=Infinity}) {
  if(environment!=='test'||testGateOn!==true)return null;
  if(!db||typeof identify!=='function'||typeof origin!=='string'||!origin.startsWith('https://')
    ||new URL(origin).origin!==origin)throw Error('sandbox_pilot_not_configured');
  db.exec("CREATE TABLE IF NOT EXISTS sandbox_orders(subject TEXT PRIMARY KEY, reference TEXT UNIQUE NOT NULL, expires TEXT NOT NULL, transaction_id TEXT UNIQUE, state TEXT NOT NULL DEFAULT 'OPEN') STRICT");
  const order=db.prepare('SELECT * FROM sandbox_orders WHERE subject=?');
  const add=db.prepare('INSERT INTO sandbox_orders(subject,reference,expires) VALUES (?,?,?)');
  const save=db.prepare("UPDATE sandbox_orders SET state=?,transaction_id=? WHERE subject=? AND reference=? AND state='OPEN'");
  const inFlight=new Map();
  return async (req,res)=>{
    const path=req.url;
    if(path!=='/api/test/wompi/start' && path!=='/api/test/wompi/result')return reply(res,404,{error:'not_found'});
    if(req.method!=='POST')return reply(res,405,{error:'method_not_allowed'});
    if(req.headers.origin!==origin)return reply(res,403,{error:'wrong_origin'});
    try{
      const subject=await identify(req);
      if(typeof subject!=='string'||!subject||subject.length>160)return reply(res,401,{error:'not_signed_in'});
      const body=await input(req);
      if(body===invalid)return reply(res,400,{error:'invalid_input'});
      if(path.endsWith('/start')){
        if(Object.keys(body).length)return reply(res,400,{error:'invalid_input'});
        let row=order.get(subject);
        if(!row){
          const id='hoy-test-'+randomUUID(),expiresAt=new Date(Math.min(now()+CHECKOUT_LIFETIME_MS,expiresNoLater)).toISOString();
          const checkout=checkoutForQuote({id,amountInCents,currency,expiresAt},{publicKey,integrityKey,now});
          add.run(subject,id,expiresAt);
          return reply(res,201,{checkout});
        }
        if(row.state!=='OPEN')return reply(res,409,{error:'test_order_already_closed'});
        const checkout=checkoutForQuote({id:row.reference,amountInCents,currency,expiresAt:row.expires},{publicKey,integrityKey,now});
        return reply(res,200,{checkout});
      }
      if(Object.keys(body).length!==1||typeof body.id!=='string')return reply(res,400,{error:'invalid_input'});
      const row=order.get(subject);
      if(!row)return reply(res,404,{error:'test_order_not_found'});
      if(row.state!=='OPEN'){
        if(row.transaction_id!==body.id)return reply(res,409,{error:'different_transaction'});
        return reply(res,200,{id:row.transaction_id,status:row.state});
      }
      if(inFlight.has(subject))return reply(res,409,{error:'check_in_progress'});
      inFlight.set(subject,true);
      try {
        const verified=await checkSandboxTransaction(body.id,{id:row.reference,amountInCents,currency},{privateKey,request});
        if(verified.status!=='PENDING'){
          if(save.run(verified.status,verified.id,subject,row.reference).changes!==1)
            return reply(res,409,{error:'test_order_changed'});
        }
        return reply(res,200,verified);
      } finally {inFlight.delete(subject);}
    } catch {
      return reply(res,503,{error:'sandbox_unavailable'});
    }
  };
}
