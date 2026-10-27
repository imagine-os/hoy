import { existsSync } from 'node:fs';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

// Render existing approved studio artwork and wordmark; no generated faces, new claims or private inputs.
const studio = (await readFile('public/images/studio-2026/facility-red-studio-1600.webp')).toString('base64');
const sourceMark = await readFile('public/brand/hoy-wordmark.svg', 'utf8');
// Render the original symbol paths once; nesting its viewBox inside another use clips the tall h.
const paths = sourceMark.match(/<symbol[^>]*>([\s\S]*?)<\/symbol>/)?.[1];
if (!paths) throw Error('Verified HOY wordmark symbol is missing');
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="556 44 4501 2267" style="color:#F1E7D2">${paths}</svg>`;
await mkdir('public/social', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disk-cache-size=0'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [kind, label, headline] of [
    ['coming-soon', 'PRÓXIMAMENTE', 'Un espacio para moverte,<br>conectar y hacer una pausa.'],
    ['website', 'MOVIMIENTO · COMUNIDAD · BIENESTAR', 'Muévete. Respira.<br>Vive el presente.'],
  ]) {
    await page.setContent(`<!doctype html><html lang="es"><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#19344d;color:#f1e7d2}
      body{position:relative;font-family:Arial,sans-serif}.studio{position:absolute;right:0;top:0;width:790px;height:630px;object-fit:cover;object-position:55% center}
      .veil{position:absolute;inset:0;background:linear-gradient(90deg,#19344d 0%,rgba(25,52,77,.96) 34%,rgba(25,52,77,.4) 70%,rgba(25,52,77,.18))}
      .copy{position:absolute;inset:48px 58px;display:flex;flex-direction:column;align-items:flex-start}.brand{width:260px;height:132px}.brand svg{width:100%;height:100%}
      .human{font-size:15px;letter-spacing:6px;margin:2px 0 0 54px}.label{margin:62px 0 0;font-size:17px;letter-spacing:3px;font-weight:600}
      h1{font-family:Georgia,serif;font-size:53px;line-height:1.13;font-weight:400;letter-spacing:-.8px;margin:22px 0 0;max-width:850px}
      footer{margin-top:auto;display:flex;gap:22px;font-size:18px;letter-spacing:1px}footer span+span{border-left:1px solid rgba(241,231,210,.5);padding-left:22px}
    </style><img class="studio" src="data:image/webp;base64,${studio}" alt=""><div class="veil"></div><main class="copy"><div class="brand">${mark}</div><p class="human">HUMAN CLUB</p><p class="label">${label}</p><h1>${headline}</h1><footer><span>Medellín</span><span>hoyhumanclub.com</span></footer></main></html>`);
    await page.locator('.studio').evaluate(img => img.decode());
    await page.screenshot({ path: `public/social/hoy-${kind}-20261027.png` });
  }
} finally { await browser.close(); }
