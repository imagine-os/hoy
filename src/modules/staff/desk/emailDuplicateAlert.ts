/** Advisory only. Requests must come from the current authenticated tenant provider, never a public/operator client. */
export type EmailQuery = (method:'POST',path:string,body:unknown)=>Promise<{data:unknown}>;
export interface EmailMatch {id:string;personId:string;name:string;email:string;phone:string|null}
export type EmailCheck = {kind:'checked';matches:EmailMatch[];limited:boolean;checkedAt:string}|{kind:'skipped';matches:[]}|{kind:'unavailable';matches:[]};
export const emailKey=(value:unknown)=>typeof value==='string'?value.trim().toLowerCase():'';
/** Company OS 1.11 contains uses ILIKE with PostgreSQL's default backslash escape. Exact matching follows below. */
export const escapeLike=(value:string)=>value.replace(/[\\%_]/g,'\\$&');
export function validEmail(value:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)&&value.length<=320;}
export async function checkEmail(request:EmailQuery,email:string,{allowed,maxPages=3,isCurrent=()=>true}:{allowed:boolean;maxPages?:number;isCurrent?:()=>boolean}):Promise<EmailCheck>{
  const key=emailKey(email);if(!allowed||!isCurrent()||!validEmail(key))return {kind:'skipped',matches:[]};
  const matches=new Map<string,EmailMatch>();const pages=Math.max(1,Math.min(3,maxPages)),deadline=Date.now()+8000;
  try{
    for(let page=0;page<pages;page++){
      if(!isCurrent())return {kind:'skipped',matches:[]};
      const remaining=deadline-Date.now();if(remaining<=0)throw Error('lookup_timeout');
      let timer:ReturnType<typeof setTimeout>|undefined;
      const answer=await Promise.race([request('POST','/query',{entity:'person',filter:{and:[{field:'email',op:'contains',value:escapeLike(key)},{exists:'member',via:'person',where:{all:true}}]},sort:[{field:'id',dir:'asc'}],limit:100,offset:page*100}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('lookup_timeout')),remaining);})]).finally(()=>{if(timer)clearTimeout(timer);});
      if(!isCurrent())return {kind:'skipped',matches:[]};
      if(!Array.isArray(answer?.data))throw Error('invalid_lookup');
      for(const row of answer.data){
        if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.data||typeof row.data!=='object')throw Error('invalid_lookup');
        if(emailKey(row.data.email)===key)matches.set(row.id,{id:row.id,personId:row.id,name:typeof row.data.name==='string'?row.data.name:'',email:row.data.email,phone:typeof row.data.phone==='string'?row.data.phone:null});
      }
      if(answer.data.length<100)return {kind:'checked',matches:[...matches.values()],limited:false,checkedAt:new Date().toISOString()};
    }
    return {kind:'checked',matches:[...matches.values()],limited:true,checkedAt:new Date().toISOString()};
  }catch{return {kind:'unavailable',matches:[]};}
}
export function createEmailReader(){let generation=0;return {cancel:()=>{generation++;},read:async(request:EmailQuery,email:string,options:{allowed:boolean;maxPages?:number;isCurrent?:()=>boolean})=>{const own=++generation;const current=()=>own===generation&&(options.isCurrent?.()??true);const result=await checkEmail(request,email,{...options,isCurrent:current});return current()?result:null;}};}

export const emailFingerprint=(check:EmailCheck)=>check.kind==='checked'?JSON.stringify([check.kind,check.limited,check.matches.map(p=>p.id).sort()]):check.kind;
/** Lock only one normal submit intent. No unique constraint: matches/unknowns require explicit separate-record acknowledgement. */
export function createEmailSubmitGuard(){
 let busy=false,uncertain:{request:EmailQuery;intentKey:string;idempotencyKey:string}|null=null;
 // Unknown writes survive edits/account/provider changes. Only a confirmed same-key result clears them.
 const syncContext=(_request:EmailQuery|null,_intentKey:string)=>{};
 return {syncContext,hasPending:()=>!!uncertain,hasUncertain:(request:EmailQuery|null,intentKey:string)=>!!uncertain&&uncertain.request===request&&uncertain.intentKey===intentKey,
 run:async<T>(input:{request:EmailQuery;email:string;allowed:boolean;isCurrent:()=>boolean;intentKey:string;idempotencyKey:string;acknowledged?:string;submit:()=>Promise<T>}):Promise<{kind:'busy'|'obsolete'|'blocked'}|{kind:'review';check:EmailCheck}|{kind:'submitted';value:T}>=>{
  if(busy)return {kind:'busy'};busy=true;
  try{
   if(uncertain&&(uncertain.request!==input.request||uncertain.intentKey!==input.intentKey||uncertain.idempotencyKey!==input.idempotencyKey))return {kind:'blocked'};
   if(!input.allowed||!input.isCurrent())return {kind:'obsolete'};
   const replay=!!uncertain;
   if(!replay&&validEmail(emailKey(input.email))){
    const check=await checkEmail(input.request,input.email,{allowed:input.allowed,isCurrent:input.isCurrent});
    if(!input.isCurrent())return {kind:'obsolete'};
    const review=check.kind==='unavailable'||check.kind==='checked'&&(check.matches.length>0||check.limited);
    if(review&&input.acknowledged!==emailFingerprint(check))return {kind:'review',check};
   }
   if(!input.isCurrent())return {kind:'obsolete'};
   try{
    const value=await input.submit();uncertain=null;
    return input.isCurrent()?{kind:'submitted',value}:{kind:'obsolete'};
   }catch(error){
    // CompanyOSError.ambiguous is the transport's explicit "write may have executed" signal.
    if(!uncertain&&!!error&&typeof error==='object'&&'ambiguous' in error&&error.ambiguous===true)uncertain={request:input.request,intentKey:input.intentKey,idempotencyKey:input.idempotencyKey};
    throw error;
   }
  }finally{busy=false;}
 }};
}
