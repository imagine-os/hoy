// UI contract tests: production build with fictional auth/API fixtures. No external delivery.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { launchBrowser, reporter } from './lib/launch-qa.mjs';
const {check,done}=reporter('template tests UI');
const TENANT = 'hoy-test', HOST = 'fake.clerk.accounts.dev';
const PK = `pk_test_${Buffer.from(`${HOST}$`).toString('base64')}`;
const FAKE_CLERK = readFileSync(new URL('./fixtures/fake-clerk.js', import.meta.url), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const ACCOUNTS = { user_admin: { emails: [{ id: 'ea_admin', email: 'admin@example.test', verified: true }], primary: 'ea_admin' } };
const MEMBERS = { user_admin: { name: 'Olga Admin', email: 'admin@example.test', roleKeys: ['super_admin'] } };
/** One fictional comms_log row, served if the build reads delivery status from Company OS (`POST /query`). */
const LOG_ROW = { id: 'log_1', created_at: '2026-11-01T13:00:00Z', data: { channel: 'email', message_key: 'booking_released', address: 'ana@example.test', status: 'bounced', error: null } };
const queries = [];
let posted = [], history = [], testEnabled = true, deliveryStatus = 'queued', loseResponse = true;
const keyed = new Map();
const templateRows = JSON.parse(readFileSync('deploy/comms/hoy-templates.json', 'utf8')).records.find(r=>r.entity==='message_template').rows.map((data,i) => ({id: 'template_'+i, data}));

async function serveProduction(port, dir) {
  const DIST = resolve(dir);
  const entry = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(DIST, 'assets', f), 'utf8')).join('\n');
  if (!entry.includes('clerk-js')) throw new Error(`${DIST} is not a production build (no Clerk)`);
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    if (path === '/app-config.json') return json(res, 200, { tenant: TENANT, apiBase: '/api/cos', clerkPublishableKey: PK, environment: 'test' });
    if (path.startsWith(`/api/cos/t/${TENANT}/`)) {
      const user = /^Bearer fake\.([^.]+)\.[^.]+$/.exec(req.headers.authorization ?? '')?.[1] ?? null;
      if (!user) return json(res, 401, { error: 'unauthorized' });
      const route = path.slice(`/api/cos/t/${TENANT}`.length), m = MEMBERS[user];
      if (route === '/me') return m ? json(res, 200, { tenant: { slug: TENANT }, user: { id: user, name: m.name, email: m.email }, roleKeys: m.roleKeys, isSuperAdmin: true, caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
      if (route.startsWith('/comms/template-tests')) {
        if (req.method === 'GET') return json(res,200,{data:{enabled:testEnabled,from:'hello@example.test',replyTo:'reply@example.test',history:history.map(r=>({...r,status:deliveryStatus}))}});
        let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw),key=req.headers['idempotency-key'];posted.push({body,key});
        if(!key)return json(res,400,{error:'idempotency_key_required'});
        if(!keyed.has(key)){const row={id:'test-'+key,at:'2026-11-13T06:00:00Z',actor:'sample-admin',recipient:body.recipient,mode:body.mode,sourceHash:'a'.repeat(64),status:'queued',error:null};keyed.set(key,row);history.unshift(row);}
        if(loseResponse){loseResponse=false;return json(res,503,{error:'response_lost'});}
        return json(res,202,{data:keyed.get(key)});
      }
      if (route === '/batch' && req.method === 'POST') {
        let input = '';
        for await (const chunk of req) input += chunk;
        const { ops } = JSON.parse(input);
        const next = structuredClone(templateRows);
        for (const op of ops) {
          if (op.entity !== 'message_template') return json(res, 400, { error: 'wrong_entity' });
          if (op.op === 'create') next.push({ id: 'archive_' + next.length, data: op.data });
          else {
            const row = next.find(r => r.id === op.id);
            if (!row || row.data[op.ifMatch.field] !== op.ifMatch.value) return json(res, 409, { error: 'conflict' });
            Object.assign(row.data, op.data);
          }
        }
        templateRows.splice(0, templateRows.length, ...next);
        return json(res, 200, { ids: ops.map(op => op.id || 'archive') });
      }
      if (route === '/query' && req.method === 'POST') {
        const body = JSON.parse(await new Promise((r) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => r(s)); }));
        queries.push(body);
        return json(res, 200, { data: body.entity === 'comms_log' ? [LOG_ROW] : body.entity === 'message_template' ? templateRows : [] });
      }
      return json(res, 404, { error: 'not_found' });
    }
    try {
      let file = resolve(DIST, '.' + decodeURIComponent(path));
      if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403); return res.end(); }
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }); res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) };
}

/** A production context: external requests blocked except Clerk's script, which is the fake. */
async function productionContext(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.route(`https://${HOST}/npm/@clerk/clerk-js@*/dist/clerk.browser.js`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_CLERK }));
  await ctx.addInitScript(({ accounts, pk, lang }) => {
    window.__fakeClerkConfig = { accounts, publishableKey: pk };
    if (!sessionStorage.getItem('qa-init')) { sessionStorage.setItem('qa-init', '1'); localStorage.setItem('hoyos.lang', lang); }
  }, { accounts: ACCOUNTS, pk: PK, lang });
  return ctx;
}

async function signIn(page, base, email) {
  await page.goto(`${base}/#/auth/sign-in`);
  await page.locator('[data-step="email"] input').waitFor({ timeout: 15000 });
  await page.locator('[data-step="email"] input').fill(email);
  await page.locator('[data-step="email"] button[type=submit]').click();
  await page.locator('[data-step="code"]').waitFor({ timeout: 5000 });
  await page.locator('[data-step="code"] input').fill('424242');
  await page.locator('[data-step="code"] button[type=submit]').click();
  await page.waitForTimeout(1200);
}



let browser;
const server=await serveProduction(4393,process.env.QA_PROD_DIST || 'dist');
try {
 for(const lang of ['en','es']) for(const width of [1280,390]) {
  browser=await launchBrowser();
  posted=[];history=[];keyed.clear();testEnabled=true;deliveryStatus='queued';loseResponse=true;
  const ctx=await productionContext(browser,lang);await ctx.setDefaultTimeout(10000);
  const page=await ctx.newPage();await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await signIn(page,server.base,'admin@example.test');await page.goto(server.base+'/#/admin/emails');
  const card=page.locator('[data-launch-email="welcome"]');
  await card.getByRole('button',{name:lang==='en'?'Show the email':'Ver el correo',exact:true}).click();
  await card.getByRole('button',{name:lang==='en'?'Edit email':'Editar correo',exact:true}).click();
  const original=templateRows.find(r=>r.data.key==='welcome').data.subject;
  await card.getByLabel(lang==='en'?'Subject':'Asunto',{exact:true}).fill('Sample draft {{person.name}}');
  const panel=card.locator('[data-email-test-panel]');await panel.locator('summary').click();
  const address=panel.locator('input[type=email]');await address.waitFor();
  check(`${lang}/${width}: opening and drafting never sends`,posted.length===0);
  await address.fill('bad-address');const send=panel.getByRole('button',{name:lang==='en'?'Send this test':'Enviar esta prueba',exact:true});
  check(`${lang}/${width}: invalid address blocks sending`,await send.isDisabled());
  await address.fill('reviewer@example.test');await panel.locator('select').selectOption('draft');await send.click();
  await panel.getByRole('alert').waitFor();await send.click();
  await panel.getByRole('status').filter({hasText:lang==='en'?'Test queued.':'Prueba en cola.'}).waitFor();
  check(`${lang}/${width}: lost response retry uses the same key and only one log`,posted.length===2&&posted[0].key===posted[1].key&&history.length===1);
  check(`${lang}/${width}: draft send carries draft and current source without publishing`,posted[1].body.mode==='draft'&&posted[1].body.draft.subject==='Sample draft {{person.name}}'&&posted[1].body.source.subject===original&&templateRows.find(r=>r.data.key==='welcome').data.subject===original);
  deliveryStatus='delivered';await panel.getByRole('button',{name:lang==='en'?'Refresh status':'Actualizar estado'}).click();
  await panel.getByText(/reviewer@example.test.*(Delivered|Entregado)/).waitFor();
  check(`${lang}/${width}: refreshed status comes from server`,(await panel.innerText()).includes(lang==='en'?'Delivered':'Entregado'));
  testEnabled=false;await panel.getByRole('button',{name:lang==='en'?'Refresh status':'Actualizar estado'}).click();await page.waitForTimeout(150);
  check(`${lang}/${width}: opt-out disables send`,await send.isDisabled());
  check(`${lang}/${width}: no missing translations or page errors`,!/[⟨⟩]/.test(await panel.innerText())&&errors.length===0,errors.join(' | '));
  check(`${lang}/${width}: no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await ctx.close();await browser.close();
 }
} finally {await server.close();if(browser?.isConnected())await browser.close()}
done();
