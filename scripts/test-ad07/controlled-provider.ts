import {applyQuery,type DataProvider,type Query} from '@app/data/types';
const stamp='2026-10-24T12:00:00Z';
export const row=(id:string,extra:Record<string,unknown>={})=>({id,tenant_id:'ten_hoy',created_at:stamp,updated_at:stamp,...extra});
export const longName='FICTIONAL '+('Readable customer name without clipping '.repeat(10))+'END';
export function dataset(tag:string,long=false){const id='fictional_'+tag;return {
 alpha:[row(tag+'_alpha',{label:tag+' initial',group:'one'})],beta:[row(tag+'_beta',{label:tag+' beta',group:'two'})],
 users:[row(id,{email:tag.toLowerCase()+'@example.test',phone:'+573000000099',status:'active',locale:'en'})],
 profiles:[row(id+'_profile',{user_id:id,full_name:long?longName:'FICTIONAL '+tag,initials:'QA',birthday:null,notes:null,marketing_optin:false,whatsapp_verified:false})],
 user_roles:[row(id+'_role',{user_id:id,role:'customer'})],memberships:[],
 plans:[row('fictional_plan',{name_es:'Paquete FICTICIO',name_en:'FICTIONAL package',classes:12,price:10000,active:true})],
 bookings:[row(id+'_visit',{user_id:id,status:'checked_in',checked_in_at:stamp})],
 class_ledger:[row(id+'_purchase',{user_id:id,plan_id:'fictional_plan',payment_id:null,delta:12,reason:'purchase',expires_at:'2099-01-01',frozen_from:null,frozen_until:null}),row(id+'_debit',{user_id:id,purchase_ledger_id:id+'_purchase',delta:-3,reason:'booking',expires_at:null})],
 payments:[row(id+'_old_payment',{user_id:id,status:'approved',amount:10000,currency:'COP'})],
 vouchers:[row(id+'_voucher',{claimedBy:id,status:'claimed',title:'FICTIONAL voucher'}),row(id+'_unclaimed',{claimedBy:null,status:'issued',title:'Unclaimed namesake'})],
 };}
export class ControlledProvider {
 name:string;db:Record<string,any[]>;initialFinance:string;pending:any[]=[];modes:Record<string,string>={};listeners=new Map();reads:any[]=[];writes:any[]=[];unsubscribes=0;peek:any;
 constructor(tag:string,peek:boolean,long=false){this.name='controlled-'+tag;this.db=dataset(tag,long);this.initialFinance=this.financial();if(peek)this.peek=this.rows.bind(this);}
 rows(table:string,query?:Query){return structuredClone(applyQuery(this.db[table]??[],query));}
 list(table:string,query?:Query):Promise<any[]>{this.reads.push({table,query});const rows=this.rows(table,query);if(query?.where?.id==='__none__'||query?.where?.user_id==='__none__')return Promise.resolve(rows);if(this.modes[table]==='reject')return Promise.reject(Error('FICTIONAL private '+table+' read failure'));if(this.modes[table]==='hold')return new Promise((resolve,reject)=>this.pending.push({table,query,rows,resolve,reject,settled:false}));return Promise.resolve(rows);}
 get(table:string,id:string){return Promise.resolve(this.rows(table,{where:{id}})[0]??null);}
 subscribe(table:string,callback:any){const id=Symbol();this.listeners.set(id,{table,callback});return()=>{this.unsubscribes++;this.listeners.delete(id);};}
 emit(table:string){for(const x of [...this.listeners.values()])if(x.table===table||x.table==='*')x.callback({table,type:'reset'});}
 settle(index:number,rows?:any[],error?:string){const p=this.pending[index];if(!p||p.settled)throw Error('Invalid pending read '+index);p.settled=true;if(error)p.reject(Error(error));else p.resolve(structuredClone(rows??p.rows));}
 financial(){return JSON.stringify(Object.fromEntries(['payments','class_ledger','bookings','vouchers'].map(t=>[t,this.db[t]])));}
 async insert(...args:any[]){this.writes.push({method:'insert',args});throw Error('Read-only regression provider');}async update(...args:any[]){this.writes.push({method:'update',args});throw Error('Read-only regression provider');}async remove(...args:any[]){this.writes.push({method:'remove',args});throw Error('Read-only regression provider');}
 snapshot(){return {name:this.name,reads:this.reads,pending:this.pending.map((p,i)=>({index:i,table:p.table,query:p.query,settled:p.settled})),listeners:this.listeners.size,unsubscribes:this.unsubscribes,writes:this.writes,financeBefore:this.initialFinance,financeAfter:this.financial()};}
}
