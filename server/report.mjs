// Fixture-only proof of contract. No Company OS connection, environment loader or production registration.
import { createHash, timingSafeEqual } from 'node:crypto';
const PATH='/v1/reports/activity', DAY=86_400_000, LIMIT=10_000;
const zone='America/Bogota';
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
const localDay=iso=>formatter.format(new Date(iso));
const dayDate=s=>typeof s==='string' && /^20\d\d-\d\d-\d\d$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s ? Date.parse(s) : NaN;
const isInstant=x=>typeof x==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(x) && Number.isFinite(Date.parse(x));
const digest=s=>createHash('sha256').update(s).digest();
const send=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(status===405?{Allow:'GET'}:{})});res.end(JSON.stringify(payload));};
function project(result,{tenant,catalog,low,high}) {
 const {payments,registrations,bookings,registrationCounts}=result??{};
 if(![payments,bookings].every(v=>Array.isArray(v)&&v.length<=LIMIT)||(!(registrationCounts instanceof Map)&&(!Array.isArray(registrations)||registrations.length>LIMIT)))throw Error('incomplete');
 const daily=new Map(), purchases=[];
 for(let t=low;t<=high;t+=DAY){const date=new Date(t).toISOString().slice(0,10);daily.set(date,{date,sign_ups:0,bookings:0,attended:0});}
 for(const p of payments) {
  if(p?.tenant!==tenant||p.status!=='approved'||!isInstant(p.approved_at)||!Number.isSafeInteger(p.amount)||p.amount<0)continue;
  const date=localDay(p.approved_at);
  if(daily.has(date))purchases.push({date,amount_cop:p.amount,product:catalog.get(p.product)??null});
 }
 if(registrationCounts instanceof Map)for(const [date,count] of registrationCounts){
  if(!daily.has(date)||!Number.isSafeInteger(count)||count<0)throw Error('incomplete');
  daily.get(date).sign_ups=count;
 }
 for(const r of registrations??[]) {
  if(r?.tenant!==tenant||!isInstant(r.completed_at))continue;
  const day=daily.get(localDay(r.completed_at));if(day)day.sign_ups++;
 }
 for(const b of bookings) {
  if(b?.tenant!==tenant||!isInstant(b.starts_at)||!['booked','checked_in','no_show'].includes(b.status))continue;
  const day=daily.get(localDay(b.starts_at));if(!day)continue;
  day.bookings++;if(b.status==='checked_in'&&isInstant(b.checked_in_at))day.attended++;
 }
 purchases.sort((a,b)=>a.date.localeCompare(b.date)||a.amount_cop-b.amount_cop||Number(a.product===null)-Number(b.product===null)||(a.product??'').localeCompare(b.product??''));
 return {timezone:zone,currency:'COP',purchases,daily:[...daily.values()]};
}
export function createPartnerHandler({tenant,token,read,catalog}) {
 if(typeof tenant!=='string'||!tenant||typeof token!=='string'||!/^[A-Za-z0-9_-]{32,128}$/.test(token)||typeof read!=='function'||!(catalog instanceof Map)||[...catalog.values()].some(v=>typeof v!=='string'||!/^[a-z0-9_-]{1,64}$/.test(v)))throw Error('invalid report configuration');
 const expected=digest(token);
 return async (req,res)=>{
  if(!req.url||req.url.length>1024||!req.url.startsWith('/'))return send(res,400,{error:'invalid_request'});
  let url;try{url=new URL(req.url,'http://report.invalid');}catch{return send(res,400,{error:'invalid_request'});}
  if(url.origin!=='http://report.invalid'||url.pathname!==PATH)return send(res,404,{error:'not_found'});
  if(req.method!=='GET')return send(res,405,{error:'method_not_allowed'});
  const auth=/^Bearer ([A-Za-z0-9_-]{1,128})$/.exec(req.headers.authorization??'');
  if(!auth||!timingSafeEqual(digest(auth[1]),expected))return send(res,401,{error:'unauthorized'});
  const entries=[...url.searchParams.keys()];
  const low=dayDate(url.searchParams.get('from')),high=dayDate(url.searchParams.get('to'));
  if(entries.length!==2||!entries.includes('from')||!entries.includes('to')||!Number.isFinite(low)||!Number.isFinite(high)||high<low||high-low>=31*DAY)return send(res,400,{error:'invalid_date_range'});
  try {
   // Modern Bogotá boundaries (UTC-05:00); the contract accepts only 2000–2099.
   const start=new Date(low+5*3_600_000).toISOString(),end=new Date(high+DAY+5*3_600_000).toISOString();
   const result=await read({tenant,start,end,limit:LIMIT});
   return send(res,200,project(result,{tenant,catalog,low,high}));
  }catch{return send(res,503,{error:'report_unavailable'});}
 };
}
