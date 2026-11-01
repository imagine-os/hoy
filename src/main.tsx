import React from 'react';
import ReactDOM from 'react-dom/client';
import './design/tokens.css';
import './styles/global.css';
import { installFrameSession } from './app/frameSession';
import { App } from './app/App';
import { enterCleanHub } from './app/cleanHubEntry';
import { PRODUCTION_BUILD } from './config/launch';
import { wireProduction } from './app/productionWiring';
import { installProductionFrame } from './app/productionFrame';

// Before React renders: a preview iframe runs under the session its hash asks for
// (src/app/frameSession.ts) instead of the tester's own. The providers read those keys in their
// useState initialisers, so this has to happen first. The clean-hub entry is a review tool; the production build has
// no preview frames (PL-03). Since lane Y3 the production Hub has live previews too: a production frame runs read-only
// under its own view-as (src/app/productionFrame.ts), with no demo users.
if (PRODUCTION_BUILD || !enterCleanHub()) {
  if (PRODUCTION_BUILD) { installProductionFrame(); wireProduction(); }
  if (!PRODUCTION_BUILD) installFrameSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
}
