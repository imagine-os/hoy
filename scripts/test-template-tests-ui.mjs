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
const ACCOUNTS = { user_staff: { emails: [{ id: 'ea_staff', email: 'staff@example.test', verified: true }], primary: 'ea_staff' }, user_admin: { emails: [{ id: 'ea_admin', email: 'admin@example.test', verified: true }], primary: 'ea_admin' } };
const MEMBERS = { user_staff: { name: 'Sara Staff', email: 'staff@example.test', roleKeys: ['administrator'] }, user_admin: { name: 'Olga Admin', email: 'admin@example.test', roleKeys: ['super_admin'] } };
/** One fictional comms_log row, served if the build reads delivery status from Company OS (`POST /query`). */
const LOG_ROW = { id: 'log_1', created_at: '2026-11-01T13:00:00Z', data: { channel: 'email', message_key: 'booking_released', address: 'ana@example.test', status: 'bounced', error: null } };
const queries = [];
let refuse = null, postDelay = 0, gets = 0;
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
      if (route === '/me') return m ? json(res, 200, { tenant: { slug: TENANT }, user: { id: user, name: m.name, email: m.email }, roleKeys: m.roleKeys, isSuperAdmin: m.roleKeys.includes('super_admin'), caps: [], entities: [] }) : json(res, 403, { error: 'no access to this tenant' });
      if (route.startsWith('/comms/template-tests')) {
        if (req.method === 'GET') { gets++; return json(res,200,{data:{enabled:testEnabled,from:'hello@example.test',replyTo:'reply@example.test',history:history.map(r=>({...r,status:deliveryStatus}))}}); }
        let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw),key=req.headers['idempotency-key'];posted.push({body,key});
        if(!key)return json(res,400,{error:'idempotency_key_required'});
        if(postDelay)await new Promise(r=>setTimeout(r,postDelay));
        if(refuse){const r=refuse;refuse=null;return json(res,r.status,{error:r.code});}
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
  posted=[];history=[];keyed.clear();refuse=null;postDelay=0;gets=0;testEnabled=true;deliveryStatus='queued';loseResponse=true;
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
  const status=panel.locator('[data-email-test-status]');
  await status.filter({hasText:/not be confirmed|No se confirmó/}).waitFor();await send.click();
  await status.filter({hasText:lang==='en'?'Test queued.':'Prueba en cola.'}).waitFor();
  check(`${lang}/${width}: lost response retry uses the same key and only one log`,posted.length===2&&posted[0].key===posted[1].key&&history.length===1);
  check(`${lang}/${width}: draft send carries draft and current source without publishing`,posted[1].body.mode==='draft'&&posted[1].body.draft.subject==='Sample draft {{person.name}}'&&posted[1].body.source.subject===original&&templateRows.find(r=>r.data.key==='welcome').data.subject===original);
  deliveryStatus='delivered';await panel.getByRole('button',{name:lang==='en'?'Refresh status':'Actualizar estado'}).click();
  await panel.getByText(/reviewer@example.test.*(Delivered|Entregado)/).waitFor();
  check(`${lang}/${width}: refreshed status comes from server`,(await panel.innerText()).includes(lang==='en'?'Delivered':'Entregado'));
  const until=async(fn)=>{for(let i=0;i<100&&!(await fn());i++)await page.waitForTimeout(50);};
  const refreshBtn=panel.getByRole('button',{name:lang==='en'?'Refresh status':'Actualizar estado'});
  // A new key after success: the same inputs again are a new action.
  await send.click();await until(()=>posted.length===3);
  check(`${lang}/${width}: a new key after success`,posted.length===3&&posted[2].key!==posted[1].key);
  // Live mode sends the current live copy, never the open draft.
  await panel.locator('select').selectOption('live');await send.click();await until(()=>posted.length===4);
  check(`${lang}/${width}: live mode sends live copy while a draft is open`,posted[3].body.mode==='live'&&!posted[3].body.draft&&posted[3].body.source.subject===original);
  // A double click sends once.
  postDelay=300;const before=posted.length;await send.dblclick();await until(()=>posted.length>before);await status.filter({hasText:lang==='en'?'Test queued.':'Prueba en cola.'}).waitFor();postDelay=0;
  check(`${lang}/${width}: double click sends once`,posted.length===before+1);
  // Definitive refusals show their copy and drop the key (the next send is a new action); 5xx would keep it (checked above).
  const refusals=[[429,'test_rate_limit',/Limit: 10|Límite: 10/],[422,'test_sample_missing',/safe sample value|dato ficticio seguro/],[409,'test_link_base_missing',/link address|dirección de enlaces/],[404,undefined,/no longer active|ya no está activa/]];
  for(const [st,code,re] of refusals){refuse={status:st,code};const n=posted.length;await send.click();await status.filter({hasText:re}).waitFor();await send.click();await until(()=>posted.length===n+2);
    check(`${lang}/${width}: ${code??'404 without code'} is mapped and its key is dropped`,posted[n].key!==posted[n+1].key);}
  // template_changed: message, the live template is reloaded, Send stays off until refreshed.
  const q0=queries.filter(q=>q.entity==='message_template').length;refuse={status:409,code:'template_changed'};await send.click();
  await status.filter({hasText:/live version changed|Cambió la versión/}).waitFor();await until(()=>queries.filter(q=>q.entity==='message_template').length>q0);
  check(`${lang}/${width}: template_changed reloads the live template`,queries.filter(q=>q.entity==='message_template').length>q0);
  const g0=gets;await refreshBtn.click();await until(()=>gets>g0);
  // template_tests_disabled: refreshes the config and disables Send.
  testEnabled=false;refuse={status:403,code:'template_tests_disabled'};await until(async()=>!(await send.isDisabled()),0).catch(()=>{});
  const g1=gets;if(!(await send.isDisabled()))await send.click();await until(()=>gets>g1);
  await status.filter({hasText:/switched off|desactivados/}).waitFor();
  check(`${lang}/${width}: template_tests_disabled refreshes config`,gets>g1&&await send.isDisabled());
  testEnabled=true;await refreshBtn.click();await until(async()=>!(await send.isDisabled()));
  testEnabled=false;await refreshBtn.click();await until(()=>send.isDisabled());
  check(`${lang}/${width}: opt-out disables send`,await send.isDisabled());
  check(`${lang}/${width}: no missing translations or page errors`,!/[⟨⟩]/.test(await panel.innerText())&&errors.length===0,errors.join(' | '));
  check(`${lang}/${width}: no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  if(lang==='en'&&width===1280){
   gets=0;const staff=await productionContext(browser,lang);await staff.setDefaultTimeout(10000);const sp=await staff.newPage();
   await signIn(sp,server.base,'staff@example.test');await sp.goto(server.base+'/#/admin/emails');
   await sp.locator('[data-launch-email="welcome"]').waitFor();await sp.waitForTimeout(500);
   check('non-super-admin: no panel and no template-tests request',(await sp.locator('[data-email-test-panel]').count())===0&&gets===0);
   await staff.close();
  }
  await ctx.close();await browser.close();
 }
} finally {await server.close();if(browser?.isConnected())await browser.close()}
done();
