// QA only: actual pages in a fictional provider; never imported by application routes.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import {ThemeProvider} from '../src/design/ThemeProvider';
import {I18nProvider} from '../src/i18n/I18nProvider';
import {getStrings} from '../src/app/registry';
import {DataProviderRoot} from '../src/data/DataContext';
import {MockProvider} from '../src/data/MockProvider';
import {SessionProvider} from '../src/auth/SessionProvider';
import {SchedulePage} from '../src/modules/website/pages/SchedulePage';
import {ClassDetailPage} from '../src/modules/customer/pages/ClassDetailPage';
export function mountRS05CTA(surface:string){
 const provider=new MockProvider(),state={provider,silent:false,path:''};
 (window as unknown as {qaRS05:typeof state}).qaRS05=state;
 const subscribe=provider.subscribe.bind(provider);provider.subscribe=(table,cb)=>subscribe(table,event=>{if(!state.silent)cb(event);});
 function Location(){const where=useLocation();state.path=where.pathname+where.search;return null;}
 document.getElementById('root')!.style.display='none';const node=document.createElement('div');node.id='qa-rs05';document.body.append(node);
 createRoot(node).render(<ThemeProvider><I18nProvider tables={getStrings()}><DataProviderRoot provider={provider}><SessionProvider><MemoryRouter initialEntries={[surface==='site'?'/site/schedule':'/app/class/qa_admission_ui_session']}><Location/><Routes><Route path="/site/schedule" element={<SchedulePage/>}/><Route path="/app/class/:id" element={<ClassDetailPage/>}/><Route path="*" element={<p>FICTIONAL NAVIGATION DESTINATION</p>}/></Routes></MemoryRouter></SessionProvider></DataProviderRoot></I18nProvider></ThemeProvider>);
}
