import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { socialHead, socialSurfaces } from './lib/social-sharing.mjs';

let index = await readFile('index.html', 'utf8');
const block = /    <!-- hoy-social:start -->[\s\S]*?    <!-- hoy-social:end -->/;
if (block.test(index)) index = index.replace(block, socialHead(socialSurfaces.comingSoon));
else {
  index = index.replace(/^    <meta name="description"[^\n]*\n/m, '').replace(/^    <title>[^\n]*\n/m, '');
  index = index.replace('    <meta name="viewport"', socialHead(socialSurfaces.comingSoon) + '\n    <meta name="viewport"');
}
await writeFile('index.html', index);
await mkdir('public/website', { recursive: true });
await writeFile('public/website/index.html', `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
${socialHead(socialSurfaces.website)}
    <link rel="icon" type="image/png" href="../brand/hoy-blue.png" />
    <style>body{margin:0;background:#f1e7d2;color:#35597d;font:18px/1.5 system-ui,sans-serif}main{max-width:40rem;margin:15vh auto;padding:2rem}img{width:240px;max-width:80%;height:auto}a{color:inherit}</style>
    <script src="./open-website.js" defer></script>
  </head>
  <body>
    <main>
      <img src="../brand/hoy-wordmark.svg" alt="HOY" width="240" height="121" />
      <h1>HOY Human Club</h1>
      <p>HOY es movimiento, comunidad y bienestar de una forma simple y cercana.</p>
      <a href="../#/site">Visitar el sitio web</a>
    </main>
  </body>
</html>
`);
console.log('Generated root Coming Soon and /website/ static social metadata.');
