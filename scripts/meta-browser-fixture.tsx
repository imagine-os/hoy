import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link } from 'react-router-dom';
import { Measurement, MeasurementRoute, useMeasurement } from '../src/measurement/Measurement';
import { createMetaTransport } from '../src/measurement/metaTransport';
import { classView, checkoutEvent } from '../src/measurement/pixelPolicy';

const transport = createMetaTransport();
function Journey() {
  const emit = useMeasurement();
  return <>
    <MeasurementRoute handoff={false} />
    <Link to="/app/pass/FIXTURE-REDEEM-SECRET">Private pass</Link>
    <Link to="/app/schedule">Public schedule</Link>
    <Link to="/app/receipt/FIXTURE-RECEIPT-SECRET">Private receipt</Link>
    <button onClick={() => emit(classView())}>View class</button>
    <button onClick={() => emit({ name: 'CompleteRegistration' })}>Register</button>
    <button onClick={() => { const e = checkoutEvent(35000, 'Trial class'); if (e) emit(e); }}>Start checkout</button>
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Measurement sink={transport.emit} onStop={transport.stop}><HashRouter><Journey /></HashRouter></Measurement></React.StrictMode>);
