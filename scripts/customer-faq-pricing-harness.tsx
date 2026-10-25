// DEV only: real C14/C15, route guard, customer read hook, shared price reader and commands.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useNavigate} from 'react-router-dom';
import {DataProviderRoot} from '../src/data/DataContext';
import {MockProvider} from '../src/data/MockProvider';
import {SessionProvider,useSession} from '../src/auth/SessionProvider';
import {RequireRole} from '../src/auth/RequireRole';
import type {Role} from '../src/auth/roles';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {getStrings} from '../src/app/registry';
import {FaqPage} from '../src/modules/customer/pages/FaqPage';
import {routes} from '../src/modules/customer';
import {saveLocalProduct} from '../src/data/catalogRevision';
import {changeLocalPublication} from '../src/data/catalogPublication';
import type {CatalogPlan,ProductDefinition} from '../src/data/productCatalog';
export function mountCustomerFaqPricing(page:1|2,mode='normal'){
 const provider=new MockProvider(),second=new MockProvider();
 const state=()=>({priceError:false,faqError:false,priceHoldNext:false,faqHoldNext:false,faqMarker:'',pricePending:[] as (()=>void)[],faqPending:[] as (()=>void)[],priceReads:0,faqReads:0,priceFailures:0,faqFailures:0,priceSuccesses:0,faqSuccesses:0});
 const q={provider,second,a:state(),b:state(),actorId:'',role:'public' as Role,index:0,ready:false,swap:()=>{},navigate:(_path:string)=>{},switchUser:(_id:string)=>{},setViewAs:(_role:Role|null)=>{},unmount:()=>{},emit:(_table:string,_which=0)=>{},release:(_table:'plans'|'faq_entries',_which=0)=>{},edit:async(_amount:number,_dated=false,_which=0)=>{},publish:async(_which=0)=>{},withdraw:async(_which=0)=>{}};
 q.a.priceError=mode==='price-error';q.a.faqError=mode==='faq-error';q.a.priceHoldNext=mode==='price-loading';(window as unknown as {qaCustomerFaq:typeof q}).qaCustomerFaq=q;
 for(const [data,s]of [[provider,q.a],[second,q.b]] as const){const list=data.list.bind(data);data.list=async(table,query)=>{if(!['plans','faq_entries'].includes(table))return list(table,query);if(query?.where?.tenant_id!=='ten_hoy')throw Error('fictional_unscoped_customer_faq');const pricing=table==='plans',hold=pricing?s.priceHoldNext:s.faqHoldNext,marker=s.faqMarker;if(pricing){s.priceReads++;s.priceHoldNext=false;}else{s.faqReads++;s.faqHoldNext=false;}let rows=await list(table,query);if(!pricing&&hold&&marker)rows=rows.map(row=>['qa_published_faq','qa_customer_faq_page2'].includes(row.id)?{...row,question:{es:marker,en:marker}}:row);if(hold)await new Promise<void>(resolve=>(pricing?s.pricePending:s.faqPending).push(resolve));if(pricing?s.priceError:s.faqError){if(pricing)s.priceFailures++;else s.faqFailures++;throw Error('fictional_customer_faq_read');}if(pricing)s.priceSuccesses++;else s.faqSuccesses++;return rows as never;};}
 q.release=(table,which=0)=>{const s=which?q.b:q.a;(table==='plans'?s.pricePending:s.faqPending).splice(0).forEach(resolve=>resolve());};q.emit=(table,which=0)=>{const data=(which?second:provider) as unknown as {emit:(event:{table:string;type:'reset'})=>void};data.emit({table,type:'reset'});};
 q.edit=async(amount,dated=false,which=0)=>{const data=which?second:provider,plan=(await data.get<CatalogPlan>('plans','plan_pack12'))!,definition:ProductDefinition={code:'QA_CUSTOMER_FAQ',name:{es:'PAQUETE CLIENTE FICTICIO',en:'FICTIONAL CUSTOMER PACKAGE'},type:'paquetes',classes:8,validityDays:45,active:true,prices:dated?[{id:'old',amount,startsOn:'2026-10-01',endsOn:'2026-10-23'},{id:'new',amount:345678,startsOn:'2026-10-24',endsOn:null}]:[{id:'price',amount,startsOn:'2026-10-01',endsOn:null}]};await saveLocalProduct(data,{id:plan.id,before:plan.frontend_catalog??null,definition,actorId:'usr_admin',role:'admin'});};
 q.publish=async(which=0)=>{const data=which?second:provider,p=(await data.get<CatalogPlan>('plans','plan_pack12'))!;await changeLocalPublication(data,{planId:p.id,action:'publish',expectedRevision:p.frontend_catalog!.history.length,actorId:'usr_admin',expectedTenant:'ten_hoy'});};q.withdraw=async(which=0)=>{const data=which?second:provider,p=(await data.get<CatalogPlan>('plans','plan_pack12'))!;await changeLocalPublication(data,{planId:p.id,action:'withdraw',expectedRevision:p.frontend_publication!.revision,actorId:'usr_admin',expectedTenant:'ten_hoy'});};
 const element=document.createElement('div');element.id='qa-customer-faq';document.getElementById('root')!.style.display='none';document.body.append(element);const root=createRoot(element);q.unmount=()=>root.unmount();
 function Controls(){const s=useSession();q.actorId=s.user.id;q.role=s.role;q.switchUser=s.switchUser;q.setViewAs=s.setViewAs;q.navigate=useNavigate();q.ready=true;return null;}
 function Harness(){const[index,setIndex]=React.useState(0);q.index=index;q.swap=()=>setIndex(value=>1-value);return <DataProviderRoot provider={index?second:provider}><SessionProvider><MemoryRouter initialEntries={[page===1?'/app/faq':'/app/faq/2']}><Controls/><Routes>{([1,2] as const).map(value=><Route key={value} path={value===1?'/app/faq':'/app/faq/2'} element={<RequireRole roles={routes.find(route=>route.path==='/app/faq')!.roles!}><FaqPage page={value}/></RequireRole>}/>)}<Route path="/no-access" element={<p>FICTIONAL CUSTOMER ROLE DENIED</p>}/><Route path="*" element={<p>FICTIONAL OTHER CUSTOMER DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
 root.render(<I18nProvider tables={getStrings()}><ThemeProvider><Harness/></ThemeProvider></I18nProvider>);
}
