// Standalone adapter contract: transports are injected. No tokens, network destinations, or production registration.
const cmp=(field,op,value)=>({field,op,value});
const range=(field,start,end)=>[cmp(field,'gte',start),cmp(field,'lt',end)];
const within=(value,start,end)=>typeof value==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Date.parse(value)>=Date.parse(start)&&Date.parse(value)<Date.parse(end);
const dayMs=86_400_000;
const statuses=['booked','checked_in','no_show'];
const incomplete=()=>new Error('report_source_incomplete');

export function createCompanyOsRead({tenant,query,readSignups,pageSize=100}) {
 if(typeof tenant!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(tenant)||typeof query!=='function'||typeof readSignups!=='function'||
    !Number.isInteger(pageSize)||pageSize<1||pageSize>500)throw Error('invalid_report_source_config');
 const path='/t/'+tenant+'/query';

 async function readAll(spec,limit,map) {
  const seen=new Set(), records=[];
  for(let offset=0;;){
   const size=Math.min(pageSize,limit+1-offset);
   // One extra record detects truncation. Stable id sort and duplicate check are not snapshot isolation.
   const reply=await query({path,method:'POST',spec:{...spec,sort:[{field:'id',dir:'asc'}],limit:size,offset}});
   if(!Array.isArray(reply?.data)||reply.aggregated||reply.data.length>size)throw incomplete();
   for(const row of reply.data) {
    if(!row||typeof row.id!=='string'||!row.id||seen.has(row.id)||!row.data||typeof row.data!=='object')throw incomplete();
    seen.add(row.id);
    if(seen.size>limit)throw incomplete();
    records.push(map(row.data));
   }
   if(reply.data.length<size)return records;
   offset+=reply.data.length;
  }
 }

 return async (request)=>{
  const {start,end,limit}=request;
  const startMs=Date.parse(start), endMs=Date.parse(end), offsetMs=5*3_600_000;
  if(request.tenant!==tenant||!Number.isSafeInteger(limit)||limit<1||limit>10_000||
      !Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<=startMs||endMs-startMs>31*dayMs||
      (startMs-offsetMs)%dayMs!==0||(endMs-offsetMs)%dayMs!==0)throw incomplete();
  const [payments,bookings,registration]=await Promise.all([
   readAll({entity:'payment',filter:{and:[cmp('status','eq','approved'),...range('approved_at',start,end)]}},limit,p=>{
    if(p.status!=='approved'||!within(p.approved_at,start,end)||!Number.isSafeInteger(p.amount)||p.amount<0||
      !Object.hasOwn(p,'product')||(p.product!=null&&typeof p.product!=='string'))throw incomplete();
    return {tenant,status:p.status,approved_at:p.approved_at,amount:p.amount,product:p.product??null};
   }),
   readAll({entity:'booking',filter:{and:[cmp('status','in',statuses),
     {ref:'occurrence',entity:'occurrence',where:{and:[cmp('kind','eq','class'),...range('starts_at',start,end)]}}]},
      include:[{field:'occurrence',as:'report_occurrence',fields:['starts_at']}]},limit,b=>{
    const starts_at=b.report_occurrence?.starts_at;
    if(!statuses.includes(b.status)||!within(starts_at,start,end)||b.status==='checked_in'&&
      (typeof b.checked_in_at!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(b.checked_in_at)||!Number.isFinite(Date.parse(b.checked_in_at))))throw incomplete();
    return {tenant,status:b.status,starts_at,checked_in_at:b.checked_in_at??null};
   }),
   // Proposed internal aggregate, not an existing Company OS endpoint. Never pull raw audit details.
   readSignups({tenant,start,end})
  ]);
  const counts=new Map();
  if(registration?.complete!==true||!Array.isArray(registration.rows)||registration.rows.length>31)throw incomplete();
  for(const r of registration.rows) {
   if(typeof r?.day!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(r.day)||!within(r.day+'T05:00:00Z',start,end)||
     new Date(r.day).toISOString().slice(0,10)!==r.day||!Number.isSafeInteger(r.count)||r.count<0||counts.has(r.day))throw incomplete();
   counts.set(r.day,r.count);
  }
  return {payments,bookings,registrationCounts:counts};
 };
}
