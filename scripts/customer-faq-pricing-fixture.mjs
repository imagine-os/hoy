// Test-only extension of the verified PR107 fixture. Authored production FAQ rows stay intact.
import {faqPricingFixture,faqPricingNow} from './faq-pricing-fixture.mjs';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export {faqPricingNow as customerFaqNow};
export const customerFaqQuestion=(page,lang)=>lang==='es'?`QA precios cliente página ${page}`:`QA customer prices page ${page}`;
export const customerFaqDirectiveQuestion=(page,lang)=>lang==='es'?`QA solo directiva página ${page}`:`QA directive only page ${page}`;
export async function customerFaqFixture(source=process.cwd()){
 const fixture=await faqPricingFixture(source),first=fixture.db.faq_entries.find(row=>row.id==='qa_published_faq');
 Object.assign(first,{page:1,question:{es:customerFaqQuestion(1,'es'),en:customerFaqQuestion(1,'en')},answer:{es:'Texto cliente redactado sin cambios.\n\n{{pricing:bienvenida,paquetes,privadas}}',en:'Customer authored copy stays unchanged.\n\n{{pricing:bienvenida,paquetes,privadas}}'}});
 fixture.db.faq_entries.push({...structuredClone(first),id:'qa_customer_faq_page2',page:2,group_key:'qa_customer_prices_2',group_title:{es:'QA · Precios cliente 2',en:'QA · Customer prices 2'},question:{es:customerFaqQuestion(2,'es'),en:customerFaqQuestion(2,'en')}});
 for(const page of [1,2])fixture.db.faq_entries.push({...structuredClone(first),id:`qa_customer_directive_only_${page}`,page,group_key:`qa_customer_pure_${page}`,sort:-99,question:{es:customerFaqDirectiveQuestion(page,'es'),en:customerFaqDirectiveQuestion(page,'en')},answer:{es:'{{pricing:paquetes}}',en:'{{pricing:paquetes}}'}});
 return fixture;
}
export async function customerFaqSnapshots(source=process.cwd()){
 const fixture=await customerFaqFixture(source),temp=await mkdtemp('/tmp/hoy-customer-faq-snapshots-'),D=Date,prior=globalThis.localStorage,store=new Map([['hoyos.db.v1',JSON.stringify(fixture)]]);
 try{globalThis.Date=class extends D{constructor(...args){super(...(args.length?args:[faqPricingNow]));}static now(){return new D(faqPricingNow).getTime();}};globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};const file=temp+'/commands.mjs';await build({stdin:{contents:"export {MockProvider} from './src/data/MockProvider';export {saveLocalProduct} from './src/data/catalogRevision';export {changeLocalPublication} from './src/data/catalogPublication';",resolveDir:source},bundle:true,platform:'node',format:'esm',outfile:file,logLevel:'silent'});const {MockProvider,saveLocalProduct,changeLocalPublication}=await import(pathToFileURL(file)),provider=new MockProvider(),plan=await provider.get('plans','plan_pack12');await saveLocalProduct(provider,{id:plan.id,before:plan.frontend_catalog??null,actorId:'usr_admin',role:'admin',definition:{code:'QA_CUSTOMER_FAQ',name:{es:'PAQUETE CLIENTE FICTICIO',en:'FICTIONAL CUSTOMER PACKAGE'},type:'paquetes',classes:8,validityDays:45,active:true,prices:[{id:'old',amount:123456,startsOn:'2026-10-01',endsOn:'2026-10-23'},{id:'new',amount:345678,startsOn:'2026-10-24',endsOn:null}]}});let current=await provider.get('plans',plan.id);await changeLocalPublication(provider,{planId:plan.id,action:'publish',expectedRevision:current.frontend_catalog.history.length,actorId:'usr_admin',expectedTenant:'ten_hoy'});const published=JSON.parse(store.get('hoyos.db.v1'));current=await provider.get('plans',plan.id);await changeLocalPublication(provider,{planId:plan.id,action:'withdraw',expectedRevision:current.frontend_publication.revision,actorId:'usr_admin',expectedTenant:'ten_hoy'});const withdrawn=JSON.parse(store.get('hoyos.db.v1'));await provider.remove('plans',plan.id);const missing=JSON.parse(store.get('hoyos.db.v1'));return{fixture,published,withdrawn,missing};
 }finally{globalThis.Date=D;if(prior===undefined)delete globalThis.localStorage;else globalThis.localStorage=prior;await rm(temp,{recursive:true,force:true});}
}
