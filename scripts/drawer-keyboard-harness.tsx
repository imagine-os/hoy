import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { Drawer } from '../src/components/organism/Drawer/Drawer';
import '../src/design/tokens.css';
import '../src/styles/global.css';
function Harness() {
  const [mounted, setMounted] = useState(true), [open, setOpen] = useState(false), [inner, setInner] = useState(false);
  const [disabled, setDisabled] = useState(false), [innerDisabled, setInnerDisabled] = useState(false), [version, setVersion] = useState(0);
  const [events, setEvents] = useState<{name:string;version:number}[]>([]);
  const closeOuter = () => { setEvents(v => [...v, {name:'outer',version}]); setOpen(false); };
  const closeInner = () => { flushSync(() => {setEvents(v => [...v, {name:'inner',version}]); setInner(false);}); };
  const start = (nested = false) => {setDisabled(false);setInnerDisabled(false);setMounted(true);setInner(nested);setOpen(true);};
  return <I18nProvider tables={[]}><main className="stack" style={{padding:'var(--sp-lg)'}}>
    <h1>Fictional Drawer keyboard fixture</h1>
    <button id="open" onClick={()=>start()}>Open drawer</button>
    <button id="open-both" onClick={()=>start(true)}>Open nested together</button>
    <button id="outside">Outside focus target</button>
    <output data-events>{JSON.stringify(events)}</output>
    {mounted && <Drawer open={open} onClose={closeOuter} title="Outer drawer" side="bottom" footer={<button id="outer-last" onClick={closeOuter}>Done</button>}>
      <div className="stack">
        <input id="outer-input" aria-label="Fictional value" />
        <button key={disabled ? 'waiting' : 'pay'} id="pay" disabled={disabled} onClick={()=>setDisabled(true)}>Pay then disable focused control</button>
        <button id="callback" onClick={()=>setVersion(v=>v+1)}>Change close callback</button>
        <input id="consumed" aria-label="Consumes Escape" onKeyDown={e=>{if(e.key==='Escape')e.preventDefault();}} />
        <button id="inner-open" onClick={()=>{setInnerDisabled(false);setInner(true);}}>Open inner</button>
        <button id="unmount" onClick={()=>setMounted(false)}>Unmount all drawers</button>
        <Drawer open={inner} onClose={closeInner} title="Inner drawer" side="bottom" footer={<button id="inner-last" onClick={closeInner}>Inner done</button>}>
          <div className="stack"><button key={innerDisabled ? 'waiting' : 'pay'} id="inner-pay" disabled={innerDisabled} onClick={()=>setInnerDisabled(true)}>Inner Pay then disable</button><button id="nested-unmount" onClick={()=>setMounted(false)}>Unmount nested group</button></div>
        </Drawer>
      </div>
    </Drawer>}
  </main></I18nProvider>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Harness/></React.StrictMode>);
