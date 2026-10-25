// Dev-only actual public FAQ/provider harness. Never imported by application routes.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter,Routes,Route,useNavigate } from 'react-router-dom';
import { DataProviderRoot } from '../src/data/DataContext';
import { MockProvider } from '../src/data/MockProvider';
import { SessionProvider } from '../src/auth/SessionProvider';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { ThemeProvider } from '../src/design/ThemeProvider';
import { getStrings } from '../src/app/registry';
import { FaqPage } from '../src/modules/website/pages/FaqPage';
import { saveLocalProduct } from '../src/data/catalogRevision';
import { changeLocalPublication } from '../src/data/catalogPublication';
import type { CatalogPlan, ProductDefinition } from '../src/data/productCatalog';
export function mountFaqPricing(mode = 'normal') {
  const provider = new MockProvider(),second=new MockProvider();
  const state = { provider,second,mode,pending: [] as (() => void)[],reads:0,successes:0,failures:0,otherReads:0,otherSuccesses:0,otherFailures:0,otherMode:'normal',otherPending:[] as (()=>void)[],index:0,swap:()=>{},navigate:(_path:string)=>{},unmount:()=>{},edit: async (_amount: number, _dated = false,_which=0) => {}, publish: async (_which=0) => {}, withdraw: async (_which=0) => {} };
  (window as unknown as { qaFaqPrices: typeof state }).qaFaqPrices = state;
  const list = provider.list.bind(provider);
  provider.list = async (table, query) => {
    const rows = await list(table, query);
    if(table==='plans'){state.reads++;if(query?.where?.tenant_id!=='ten_hoy')throw Error('fictional_unscoped_faq_plans');}
    if (table === 'plans' && state.mode === 'error') {state.failures++;throw Error('fictional_faq_price_read');}
    if (table === 'plans' && state.mode === 'loading') await new Promise<void>(resolve => state.pending.push(resolve));
    if(table==='plans')state.successes++;return rows as never;
  };
  const otherList=second.list.bind(second);second.list=async(table,query)=>{const rows=await otherList(table,query);if(table==='plans'){state.otherReads++;if(query?.where?.tenant_id!=='ten_hoy')throw Error('fictional_unscoped_faq_plans');if(state.otherMode==='error'){state.otherFailures++;throw Error('fictional_second_faq_price_read');}if(state.otherMode==='loading')await new Promise<void>(resolve=>state.otherPending.push(resolve));state.otherSuccesses++;}return rows as never;};
  state.edit = async (amount, dated = false,which=0) => {
    const selected=which?second:provider,plan = (await selected.get<CatalogPlan>('plans', 'plan_pack12'))!;
    const definition: ProductDefinition = { code: 'QA_FAQ_PRODUCT', name: { es: 'PAQUETE FICTICIO PUBLICADO', en: 'FICTIONAL PUBLISHED PACKAGE' }, type: 'paquetes', classes: 8, validityDays: 45, active: true,
      prices: dated ? [{ id: 'old', amount, startsOn: '2026-10-01', endsOn: '2026-10-23' }, { id: 'new', amount: 345678, startsOn: '2026-10-24', endsOn: null }] : [{ id: 'price', amount, startsOn: '2026-10-01', endsOn: null }] };
    await saveLocalProduct(selected, { id: plan.id, before: plan.frontend_catalog ?? null, definition, actorId: 'usr_admin', role: 'admin' });
  };
  state.publish = async (which=0) => { const selected=which?second:provider,p = (await selected.get<CatalogPlan>('plans', 'plan_pack12'))!; await changeLocalPublication(selected, { planId: p.id, action: 'publish', expectedRevision: p.frontend_catalog!.history.length, actorId: 'usr_admin', expectedTenant: 'ten_hoy' }); };
  state.withdraw = async (which=0) => { const selected=which?second:provider,p = (await selected.get<CatalogPlan>('plans', 'plan_pack12'))!; await changeLocalPublication(selected, { planId: p.id, action: 'withdraw', expectedRevision: p.frontend_publication!.revision, actorId: 'usr_admin', expectedTenant: 'ten_hoy' }); };
  document.getElementById('root')!.style.display = 'none'; const element = document.createElement('div'); element.id = 'qa-faq-prices'; document.body.append(element);
  const root=createRoot(element);state.unmount=()=>root.unmount();
  function Controls(){state.navigate=useNavigate();return null;}
  function Harness(){const[index,setIndex]=React.useState(0);state.index=index;state.swap=()=>setIndex(value=>1-value);return <DataProviderRoot provider={index?second:provider}><SessionProvider><MemoryRouter initialEntries={['/site/faq']}><Controls/><Routes><Route path="/site/faq" element={<FaqPage/>}/><Route path="*" element={<p>FICTIONAL OTHER FAQ DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot>;}
  root.render(<I18nProvider tables={getStrings()}><ThemeProvider><Harness/></ThemeProvider></I18nProvider>);
}
