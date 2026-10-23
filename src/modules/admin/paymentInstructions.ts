import type {DataProvider} from '../../data/types';
import type {BaseRow,UserRow} from '../../data/schema';
import type {Role} from '../../auth/roles';
import {roleCan} from '../../auth/permissions';
import {safeMediaUrl} from '../../data/mediaLibrary';
import {tenant} from '../../tenant/tenant';
import {mergeSettings,type StudioSettings,type TenantRow} from './settings';
export type PaymentSettings=StudioSettings['payments'];
export const PAYMENT_FIELDS=['bankName','accountType','accountNumber','accountHolder','qrImageUrl','breBKey'] as const;
export type PaymentField=typeof PAYMENT_FIELDS[number];
export type PaymentInstructionsView={values:Record<PaymentField,string|null>;missing:PaymentField[];status:'empty'|'partial'|'configured'};
const text=(value:unknown)=>typeof value==='string'&&value.length<=256&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim():'';
export function validPaymentImage(value:unknown):value is string{if(typeof value!=='string'||value.length>1_400_000||!safeMediaUrl(value)||/[\u0000-\u001f\u007f]/.test(value))return false;if(/^https?:/.test(value)){try{const url=new URL(value);return !!url.hostname&&['http:','https:'].includes(url.protocol);}catch{return false;}}return true;}
/** A display projection only. An image/key never proves a bank account or starts a transfer. */
export function projectPaymentInstructions(settings:Partial<PaymentSettings>|null|undefined):PaymentInstructionsView{
 const values:PaymentInstructionsView['values']={bankName:text(settings?.bankName)||null,accountType:['savings','checking'].includes(String(settings?.accountType))?String(settings?.accountType):null,accountNumber:text(settings?.accountNumber)||null,accountHolder:text(settings?.accountHolder)||null,qrImageUrl:validPaymentImage(settings?.qrImageUrl)?settings.qrImageUrl:null,breBKey:text(settings?.breBKey)||null};
 const missing=PAYMENT_FIELDS.filter(field=>!values[field]);
 return{values,missing,status:missing.length===PAYMENT_FIELDS.length?'empty':missing.length?'partial':'configured'};
}
export function validPaymentSettings(settings:PaymentSettings):boolean{
 if(!settings||!['savings','checking'].includes(settings.accountType)||!['sandbox','production'].includes(settings.wompiEnv))return false;
 for(const key of ['bankName','accountNumber','accountHolder','breBKey']as const)if(typeof settings[key]!=='string'||settings[key].length>256||/[\u0000-\u001f\u007f]/.test(settings[key]))return false;
 return settings.qrImageUrl===null||validPaymentImage(settings.qrImageUrl);
}
export async function readPaymentInstructions(data:DataProvider,tenantId:string|null|undefined=tenant.id):Promise<PaymentInstructionsView>{
 if(!tenantId||tenantId!==tenant.id)throw Error('payment_settings_scope');
 const rows=(await data.list<TenantRow>('tenants',{where:{id:tenantId,tenant_id:tenantId}})).filter(row=>row.id===tenantId&&row.tenant_id===tenantId);
 if(rows.length!==1)throw Error('payment_settings_missing');
 // Do not invent a configured payment destination from defaults when legacy fields are absent.
 return projectPaymentInstructions(rows[0].settings?.payments);
}
export interface PaymentSettingsCommand{actorId:string;role:Role;requestId:string;before:PaymentSettings;after:PaymentSettings}
export interface PaymentSettingsControl{isCurrent:()=>boolean;failAfterWrites?:number}
const digest=async(value:unknown)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))),n=>n.toString(16).padStart(2,'0')).join('');
/** Payment settings only: one mock transaction retains draft/audit together. No real bank or credentials. */
export async function savePaymentSettings(data:DataProvider,input:PaymentSettingsCommand,control:PaymentSettingsControl):Promise<PaymentSettings>{
 const command=structuredClone(input),check=()=>{if(!control.isCurrent())throw Error('payment_settings_context');};check();
 if(data.name!=='mock'||!data.atomic)throw Error('payment_settings_disconnected');
 if(!roleCan(command.role,'settings.write')||!command.actorId||!/^[-\w]{1,120}$/.test(command.requestId))throw Error('payment_settings_denied');
 if(!validPaymentSettings(command.after)||!validPaymentSettings(command.before))throw Error('payment_settings_invalid');
 const fingerprint=await digest(command),id=`payment_settings_${command.requestId}`;check();
 return data.atomic(async tx=>{
  const authorize=async()=>{check();const actor=await tx.get<UserRow>('users',command.actorId);check();if(!actor||actor.tenant_id!==tenant.id||actor.status!=='active')throw Error('payment_settings_denied');
   const roles=(await tx.list<BaseRow>('user_roles',{where:{tenant_id:tenant.id,user_id:command.actorId}})).filter(row=>row.tenant_id===tenant.id&&row.user_id===command.actorId);check();
   if(!roles.some(row=>row.role===command.role||row.role==='super_admin'))throw Error('payment_settings_denied');};
  await authorize();
  const row=await tx.get<TenantRow>('tenants',tenant.id);check();if(!row||row.tenant_id!==tenant.id)throw Error('payment_settings_scope');
  const current=mergeSettings(row.settings).payments,prior=await tx.get<BaseRow>('audit_log',id);check();
  if(prior){const d=prior.diff as Record<string,unknown>|null;if(prior.tenant_id!==tenant.id||prior.actor_id!==command.actorId||prior.action!=='settings.update'||prior.entity!=='tenants'||prior.entity_id!==tenant.id||d?.fingerprint!==fingerprint||d.role!==command.role||d.section!=='payments'||JSON.stringify(current)!==JSON.stringify(command.after))throw Error('payment_settings_unconfirmed');await authorize();return current;}
  if(JSON.stringify(current)!==JSON.stringify(command.before))throw Error('payment_settings_stale');
  await tx.update<TenantRow>('tenants',row.id,{settings:{...(row.settings??{}),payments:command.after}});check();
  await tx.insert('audit_log',{id,actor_id:command.actorId,action:'settings.update',entity:'tenants',entity_id:tenant.id,ip:null,diff:{role:command.role,source:'admin',section:'payments',before:command.before,after:command.after,fingerprint}});check();
  const saved=await tx.get<TenantRow>('tenants',row.id);check();if(!saved||JSON.stringify(mergeSettings(saved.settings).payments)!==JSON.stringify(command.after))throw Error('payment_settings_unconfirmed');await authorize();return command.after;
 },{failAfterWrites:control.failAfterWrites});
}
