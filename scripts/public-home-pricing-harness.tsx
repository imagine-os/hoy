// DEV-only probe of the actual production hook, with real provider subscription delegation.
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {MockProvider} from '../src/data/MockProvider';
import {DataProviderRoot} from '../src/data/DataContext';
import {usePublicHomePricing} from '../src/modules/website/usePublicHomePricing';
export function mountPublicHomePricingHarness(){
 const provider=new MockProvider(),second=new MockProvider();
 const controls=()=>({reads:0,successes:0,failures:0,holdNext:false,fault:false,pending:[] as Array<()=>void>,active:0,on:0,off:0,duplicateOff:0});
 const q={provider,second,first:controls(),other:controls(),index:0,focusActive:0,focusOn:0,focusOff:0,swap:()=>{},release:(_index:number,_provider=0)=>{},unmount:()=>{},ready:false};
 (window as unknown as {qaPublicPricing:typeof q}).qaPublicPricing=q;
 for(const [data,state]of [[provider,q.first],[second,q.other]] as const){const list=data.list.bind(data),subscribe=data.subscribe.bind(data);data.list=async(table,query)=>{if(table!=='plans')return list(table,query);state.reads++;if(query?.where?.tenant_id!=='ten_hoy')throw Error('FICTIONAL missing tenant scope');const captured=await list(table,query);if(state.holdNext){state.holdNext=false;await new Promise<void>(resolve=>state.pending.push(resolve));}if(state.fault){state.failures++;throw Error('FICTIONAL public plans read failure');}state.successes++;return captured;};data.subscribe=(table,callback)=>{const off=subscribe(table,callback);if(table!=='plans')return off;state.on++;state.active++;let stopped=false;return()=>{if(stopped)state.duplicateOff++;else{stopped=true;state.off++;state.active--;}off();};};}
 q.release=(index,which=0)=>{const callback=(which?q.other:q.first).pending[index];if(!callback)throw Error('FICTIONAL no held plans read');callback();};
 const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window),listeners=new Set<EventListenerOrEventListenerObject>();
 window.addEventListener=((type:string,listener:EventListenerOrEventListenerObject,options?:boolean|AddEventListenerOptions)=>{if(type==='focus'){q.focusOn++;listeners.add(listener);q.focusActive=listeners.size;}add(type,listener,options);}) as typeof window.addEventListener;
 window.removeEventListener=((type:string,listener:EventListenerOrEventListenerObject,options?:boolean|EventListenerOptions)=>{if(type==='focus'&&listeners.delete(listener)){q.focusOff++;q.focusActive=listeners.size;}remove(type,listener,options);}) as typeof window.removeEventListener;
 const element=document.createElement('div');element.id='qa-public-pricing-root';document.getElementById('root')!.style.display='none';document.body.append(element);const root=createRoot(element);q.unmount=()=>{root.unmount();window.addEventListener=add;window.removeEventListener=remove;};
 function Probe(){const offers=usePublicHomePricing();return <>{(['trial','pack','private'] as const).map(key=><output key={key} data-public-home-offer={key} data-price={offers[key].price??''} data-available={String(offers[key].available)} data-published={String(offers[key].published)}>{offers[key].price??'UNAVAILABLE'}</output>)}</>;}
 function Harness(){const[index,setIndex]=React.useState(0);q.index=index;q.swap=()=>setIndex(value=>1-value);q.ready=true;return <DataProviderRoot provider={index?second:provider}><Probe/></DataProviderRoot>;}
 root.render(<Harness/>);
}
