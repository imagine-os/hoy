// Hoy 12 Nov, lane H-PAY (D7): the customer pay page /app/pay/:what/:id sits in the customer page frame
// (container page cust-page) with a PageHead (back link + title), like the other customer pages; no bare stack root,
// no second h1, and every state (loading, error, notices, the form) is inside the frame.
// Run: node scripts/test-pay-page-frame.mjs
import { readFileSync } from 'node:fs';
let failed = 0;
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) failed++; };
const src = readFileSync(new URL('../src/modules/transfers/launch/TransferPayPage.tsx', import.meta.url), 'utf8');
const screen = src.slice(src.indexOf('function PayScreen'));
check('imports PageHead from the customer ui', /import \{[^}]*PageHead[^}]*\} from '\.\.\/\.\.\/customer\/ui'/.test(src));
check('root is the customer page frame', /<div className="container page cust-page">/.test(screen));
check('renders a PageHead with a back link and the pay title', /<PageHead back=\{[^}]+\} title=\{t\('payLaunch\.pay\.title'\)\}/.test(screen));
check('no bare <h1> left in the page', !/<h1>/.test(screen));
check('no bare stack root', !/return <div className="stack">/.test(screen));
check('no hard-coded colours or px padding in the frame', !/padding:\s*\d|#[0-9a-fA-F]{3,6}\b/.test(screen.replace(/min\(240px/g, '')));
process.exit(failed ? 1 : 0);
