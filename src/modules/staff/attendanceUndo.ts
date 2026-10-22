/** RC02 fictional occupancy-neutral undo only. No admission, money, entitlement or attendance policy. */
import type {DataProvider} from '../../data/types';
import type {BaseRow,BookingRow,ClassSessionRow,UserRow} from '../../data/schema';
import type {Role} from '../../auth/roles';
import {roleCan} from '../../auth/permissions';
import {tenant} from '../../tenant/tenant';
export interface UndoActor {actorId:string;role:Role}
export interface UndoControl {signal?:AbortSignal;currentActor?:()=>UndoActor;failAfterWrites?:number}
export interface UndoCommand extends UndoActor {bookingId:string;sessionId:string;requestId:string;expected:string}
export interface UndoReview {bookingId:string;sessionId:string;expected:string;mat:number|null}
export interface UndoOutcome {bookingId:string;sessionId:string;status:'booked';mat:number|null}
export interface UndoCurrent {bookingId:string;sessionId:string;status:BookingRow['status'];mat:number|null}
interface UndoResult {outcome:UndoOutcome;bookingDigest:string;protectedDigest:string}
interface Receipt extends BaseRow {actor_id:string;action:string;entity:string;entity_id:string;diff:{role:Role;source:'front_desk';before:'checked_in';after:'booked';session_id:string;user_id:string;version:1;fingerprint:string;result:UndoResult}}
const fail=(code:string):never=>{throw Error('attendance_undo_'+code);};
const digestPattern=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const retained=(c:UndoControl):UndoControl=>({signal:c.signal,currentActor:c.currentActor,failAfterWrites:c.failAfterWrites});
export async function undoDigest(value:unknown){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function fence(data:DataProvider,who:UndoActor,c:UndoControl){if(data.name!=='mock'||!data.atomic)fail('disconnected');if(typeof who.actorId!=='string'||!who.actorId||!['super_admin','admin','coordinator','front_desk'].includes(who.role)||!roleCan(who.role,'checkin.write'))fail('denied');const current=c.currentActor?.()??who;if(current.actorId!==who.actorId||current.role!==who.role)fail('context');if(c.signal?.aborted)fail('cancelled');}
async function row<T extends BaseRow>(data:DataProvider,table:string,where:Record<string,unknown>,who:UndoActor,c:UndoControl):Promise<T>{fence(data,who,c);const rows=await data.list<T>(table,{where:{tenant_id:tenant.id,...where}});fence(data,who,c);if(rows.length!==1||rows[0].tenant_id!==tenant.id||typeof rows[0].id!=='string'||Object.entries(where).some(([k,v])=>rows[0][k]!==v))fail('scope');return rows[0];}
async function actor(data:DataProvider,who:UndoActor,c:UndoControl){const account=await row<UserRow>(data,'users',{id:who.actorId},who,c);if(account.status!=='active')fail('context');}
function shapes(booking:BookingRow,session:ClassSessionRow){if(typeof booking.user_id!=='string'||!booking.user_id||booking.session_id!==session.id||!['booked','checked_in','cancelled','late_cancel','no_show'].includes(booking.status)||typeof booking.paid_with!=='string'||booking.ledger_id!==null&&typeof booking.ledger_id!=='string'||booking.mat_number!=null&&(!Number.isSafeInteger(booking.mat_number)||booking.mat_number<1)||!Number.isFinite(Date.parse(session.starts_at))||!Number.isFinite(Date.parse(session.ends_at))||Date.parse(session.ends_at)<=Date.parse(session.starts_at)||!['scheduled','completed','cancelled'].includes(session.status)||!Number.isSafeInteger(session.capacity)||session.capacity<1||!Number.isSafeInteger(session.booked_count)||session.booked_count<0)fail('scope');}
const protectedBooking=(booking:BookingRow)=>Object.fromEntries(Object.entries(booking).filter(([key])=>!['status','checked_in_at','updated_at'].includes(key)));
async function scope(data:DataProvider,who:UndoActor,bookingId:string,sessionId:string,c:UndoControl){await actor(data,who,c);const booking=await row<BookingRow>(data,'bookings',{id:bookingId},who,c),session=await row<ClassSessionRow>(data,'class_sessions',{id:sessionId},who,c);shapes(booking,session);return{booking,session};}
async function fresh(data:DataProvider,who:UndoActor,before:{booking:BookingRow;session:ClassSessionRow},c:UndoControl,exactSession=false){const current=await scope(data,who,before.booking.id,before.session.id,c);if(JSON.stringify(current.booking)!==JSON.stringify(before.booking)||exactSession&&JSON.stringify(current.session)!==JSON.stringify(before.session))fail('stale');await actor(data,who,c);return current;}
export async function readAttendanceUndo(data:DataProvider,identity:UndoActor,bookingId:string,sessionId:string,supplied:UndoControl={}):Promise<UndoReview>{const who={...identity},bid=String(bookingId),sid=String(sessionId),c=retained(supplied);fence(data,who,c);const current=await scope(data,who,bid,sid,c);if(current.booking.status!=='checked_in'||current.session.status==='cancelled')fail('stale');const expected=await undoDigest(current);await fresh(data,who,current,c,true);return{bookingId:bid,sessionId:sid,expected,mat:current.booking.mat_number??null};}
/** Resolves current owned state without asserting whether an earlier acknowledgement succeeded. */
export async function readAttendanceCurrent(data:DataProvider,identity:UndoActor,bookingId:string,sessionId:string,supplied:UndoControl={}):Promise<UndoCurrent>{const who={...identity},bid=String(bookingId),sid=String(sessionId),c=retained(supplied);const current=await scope(data,who,bid,sid,c);await undoDigest(current);await fresh(data,who,current,c,true);return{bookingId:bid,sessionId:sid,status:current.booking.status,mat:current.booking.mat_number??null};}
async function acknowledge(data:DataProvider,who:UndoActor,command:UndoCommand,result:UndoResult,c:UndoControl):Promise<UndoOutcome>{
 const outcome=result?.outcome;if(!outcome||outcome.bookingId!==command.bookingId||outcome.sessionId!==command.sessionId||outcome.status!=='booked'||!digestPattern(result.bookingDigest)||!digestPattern(result.protectedDigest))fail('receipt');
 const current=await scope(data,who,command.bookingId,command.sessionId,c);if(current.booking.status!=='booked'||current.booking.checked_in_at!==null||(current.booking.mat_number??null)!==outcome.mat||await undoDigest(current.booking)!==result.bookingDigest||await undoDigest(protectedBooking(current.booking))!==result.protectedDigest)fail('stale');
 await fresh(data,who,current,c);return{bookingId:outcome.bookingId,sessionId:outcome.sessionId,status:'booked',mat:outcome.mat};
}
export async function undoAttendance(data:DataProvider,command:UndoCommand,supplied:UndoControl={}):Promise<UndoOutcome>{
 const input=structuredClone(command),c=retained(supplied);fence(data,input,c);if([input.actorId,input.bookingId,input.sessionId,input.requestId].some(v=>typeof v!=='string'||!v)||!digestPattern(input.expected))fail('validation');await actor(data,input,c);
 const fingerprint=await undoDigest(input),receiptId='attendance_undo_v1_'+await undoDigest({tenant:tenant.id,actor:input.actorId,role:input.role,nonce:input.requestId});fence(data,input,c);
 const result=await data.atomic!(async tx=>{
  await actor(tx,input,c);const previous=await tx.get<Receipt>('audit_log',receiptId);fence(tx,input,c);
  if(previous){const d=previous.diff;if(previous.id!==receiptId||previous.tenant_id!==tenant.id||previous.actor_id!==input.actorId||previous.action!=='booking.undo'||previous.entity!=='bookings'||previous.entity_id!==input.bookingId||d?.version!==1||d.role!==input.role||d.source!=='front_desk'||d.before!=='checked_in'||d.after!=='booked'||d.session_id!==input.sessionId||d.fingerprint!==fingerprint)fail('receipt');await acknowledge(tx,input,input,d.result,c);const booking=await row<BookingRow>(tx,'bookings',{id:input.bookingId},input,c);if(d.user_id!==booking.user_id)fail('receipt');await actor(tx,input,c);return d.result;}
  const before=await scope(tx,input,input.bookingId,input.sessionId,c);if(before.booking.status!=='checked_in'||before.session.status==='cancelled'||await undoDigest(before)!==input.expected)fail('stale');await fresh(tx,input,before,c,true);
  const booking=await tx.update<BookingRow>('bookings',input.bookingId,{status:'booked',checked_in_at:null});fence(tx,input,c);if(JSON.stringify(protectedBooking(booking))!==JSON.stringify(protectedBooking(before.booking)))fail('stale');
  const afterSession=await row<ClassSessionRow>(tx,'class_sessions',{id:input.sessionId},input,c);if(afterSession.booked_count!==before.session.booked_count)fail('unverifiable');if(JSON.stringify(afterSession)!==JSON.stringify(before.session))fail('stale');
  const result:UndoResult={outcome:{bookingId:input.bookingId,sessionId:input.sessionId,status:'booked',mat:booking.mat_number??null},bookingDigest:await undoDigest(booking),protectedDigest:await undoDigest(protectedBooking(booking))};fence(tx,input,c);
  await tx.insert('audit_log',{id:receiptId,tenant_id:tenant.id,actor_id:input.actorId,action:'booking.undo',entity:'bookings',entity_id:input.bookingId,ip:null,diff:{role:input.role,source:'front_desk',before:'checked_in',after:'booked',session_id:input.sessionId,user_id:booking.user_id,version:1,fingerprint,result}});
  await acknowledge(tx,input,input,result,c);return result;
 },{failAfterWrites:c.failAfterWrites});return acknowledge(data,input,input,result,c);
}
