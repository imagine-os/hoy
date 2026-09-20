import React from 'react';
import ReactDOM from 'react-dom/client';
import './design/tokens.css';
import './styles/global.css';
import { installFrameSession } from './app/frameSession';
import { App } from './app/App';

// Before React renders: a preview iframe runs under the session its hash asks for
// (src/app/frameSession.ts) instead of the tester's own. The providers read those keys in their
// useState initialisers, so this has to happen first.
installFrameSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
