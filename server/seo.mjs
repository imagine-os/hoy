// The public website on real Spanish paths (Hoy 12 Nov programme, lane H-SEO; decision D11). For each public path the
// server answers the built index.html with that page's title, description, canonical, Open Graph and Twitter tags,
// `lang="es-CO"` and the studio as schema.org JSON-LD, so a crawler or a link preview reads the page without running the
// app. Also sitemap.xml, robots.txt, the old /site/<x> addresses (301 to the new path) and www → apex (301).
// The copy is drafted from the site's own (reading R5; Jas may replace the wording). The studio's facts come from the
// public settings record, read with the server's read identity (as the website does signed out), with the tenant
// config's values as the fallback. The path table is the browser's too (src/modules/website/paths.ts; scripts/test-seo.mjs
// checks they match, and that the class list and the fallback match src/tenant/brand.ts and tenant.ts).
import http from 'node:http';
import https from 'node:https';
import { createGzip } from 'node:zlib';

/** The indexed host (D11). The test site points its canonical here too, and says noindex. */
export const CANONICAL_ORIGIN = 'https://hoyhumanclub.com';

/** [the app's route, the public path], most specific first. Same table as src/modules/website/paths.ts. */
export const SITE_PATHS = [
  ['/site/legal/terms', '/legal/terminos'],
  ['/site/legal/privacy', '/legal/privacidad'],
  ['/site/delete-account', '/eliminar-cuenta'],
  ['/site/about', '/nosotros'],
  ['/site/classes', '/clases'],
  ['/site/modalities', '/metodologias'],
  ['/site/schedule', '/horario'],
  ['/site/teachers', '/profesores'],
  ['/site/plans', '/planes'],
  ['/site/faq', '/preguntas'],
  ['/site/contact', '/contacto'],
  ['/site', '/'],
];

/** The seven classes, in the owner's order (src/tenant/brand.ts `classOrder`, `classes[slug]`). */
export const CLASSES = [
  { slug: 'ligereza', name: 'Ligereza', tagline: 'Suelto lo que no me sirve', concept: 'Liberación. Apertura. Fluidez. Movimiento consciente.', method: 'Movilidad + Stretching + Yoga yin' },
  { slug: 'hibrido', name: 'Híbrido', tagline: 'Soy fuerte y flexible', concept: 'Fusión. Completitud. Balance. Lo mejor de ambos mundos.', method: 'Pilates + Yoga dinámico' },
  { slug: 'fuego', name: 'Fuego', tagline: 'Enciende tu energía', concept: 'Encendimiento. Despertar. Energía vital desatada.', method: 'Pilates dinámico + Rumba' },
  { slug: 'solido', name: 'Sólido', tagline: 'Tu base se construye desde adentro', concept: 'Enraizamiento. Construcción. Solidez desde adentro.', method: 'Pilates + pesas y resistencia' },
  { slug: 'centro', name: 'Centro', tagline: 'Estoy aquí, ahora', concept: 'Presencia. Anclaje. Silencio profundo. Vuelta a ti.', method: 'Meditación + Respiración consciente + Sound healing' },
  { slug: 'alineacion', name: 'Alineación', tagline: 'Entiendo cómo funciono', concept: 'Inteligencia. Funcionalidad. Biomecánica clara. Movimiento inteligente.', method: 'Yoga dinámico funcional + Vinyasas' },
  { slug: 'pulso', name: 'Pulso', tagline: 'Siento cada fibra de mi ser', concept: 'Sensibilidad. Micro-movimientos. Inteligencia muscular profunda.', method: 'Barre + isometrías + pulsos' },
];

/** The studio's facts when the settings record can't be read (src/tenant/tenant.ts; all confirmed there). */
export const FALLBACK = {
  legalName: 'Hoy Human Club',
  address: 'Cl. 7B Sur # 29C-100, El Poblado',
  city: 'Medellín',
  country: 'CO',
  whatsapp: '+57 312 776 5000',
  email: 'info@hoyhumanclub.com',
  instagramUrl: 'https://www.instagram.com/hoyhumanclub',
  lat: 6.19281,
  lng: -75.56535,
};

const BRAND = 'HOY Human Club';
const IMAGE = { path: '/social/hoy-website-20261027.png', alt: 'HOY Human Club — Muévete. Respira. Vive el presente. Medellín.' };

/** Each public path's title and description (R5: from the site's current copy). */
const PAGES = {
  '/': { title: 'HOY Human Club — Pilates, yoga y movimiento en El Poblado, Medellín', description: 'Muévete. Respira. Vive el presente. Siete clases que combinan Pilates, Yoga, Barre, movilidad, fuerza, cardio y respiración en El Poblado, Medellín.' },
  '/nosotros': { title: `Nosotros · ${BRAND}`, description: 'HOY nace para disfrutar el presente a través del movimiento: un lugar para entrenar, moverte, conectar con otros y hacer una pausa en tu rutina.' },
  '/clases': { title: `Nuestras clases · ${BRAND}`, description: 'Siete clases, siete caminos: Ligereza, Híbrido, Fuego, Sólido, Centro, Alineación y Pulso. Elige la que va con tu energía y tu momento.' },
  '/metodologias': { title: `Metodologías · ${BRAND}`, description: 'Pilates, Yoga, Barre, movilidad, fuerza, cardio, meditación y respiración: las metodologías que combinamos en cada clase de HOY.' },
  '/horario': { title: `Horario de clases · ${BRAND}`, description: 'Consulta el horario de clases de lunes a domingo y reserva tu lugar en HOY Human Club, en El Poblado, Medellín.' },
  '/profesores': { title: `Profesores · ${BRAND}`, description: 'Conoce a los profesores de HOY: personas que enseñan desde la práctica, no desde el guion, en El Poblado, Medellín.' },
  '/planes': { title: `Planes y precios · ${BRAND}`, description: 'Clase de prueba, clases sueltas, paquetes, clases privadas y tarjetas de regalo. Precios en pesos colombianos.' },
  '/preguntas': { title: `Preguntas frecuentes · ${BRAND}`, description: 'Todo lo que quieres saber antes de tu primera clase en HOY: qué llevar, cómo reservar y cómo pagar. Si tu pregunta no está, escríbenos.' },
  '/contacto': { title: `Contacto · ${BRAND}`, description: 'Escríbenos por WhatsApp o ven a conocer la sala: Cl. 7B Sur # 29C-100, El Poblado, Medellín.' },
  '/legal/terminos': { title: `Términos y condiciones · ${BRAND}`, description: 'Los términos y condiciones de HOY Human Club: reservas, pagos, cancelaciones y uso del estudio y de la app.' },
  '/legal/privacidad': { title: `Política de privacidad · ${BRAND}`, description: 'Cómo HOY Human Club trata tus datos personales, para qué los usamos y cómo ejercer tus derechos sobre ellos.' },
  '/eliminar-cuenta': { title: `Eliminar tu cuenta · ${BRAND}`, description: 'Pide que eliminemos tu cuenta de HOY Human Club sin iniciar sesión. Te explicamos qué se conserva por ley y qué se elimina.' },
};
for (const c of CLASSES) {
  PAGES[`/clases/${c.slug}`] = { title: `${c.name}: ${c.tagline} · ${BRAND}`, description: `${c.name}, una clase de HOY en Medellín. ${c.concept} Método: ${c.method}.` };
}

/** Every public path, for the sitemap. */
export const PUBLIC_PATHS = Object.keys(PAGES);

/** The page for a request path (as received, undecoded), or null. Only exact, plain paths. */
export function pageFor(rawPath) {
  return Object.hasOwn(PAGES, rawPath) ? { path: rawPath, ...PAGES[rawPath] } : null;
}

/**
 * An old `/site/<x>` address → its public path (with a plain query string), or null. Plain segments only, undecoded, so
 * the Location is always this site's; `/site/classes/<slug>` keeps its slug (an unknown one then answers 404 there).
 */
export function legacyLocation(rawPath, rawQuery) {
  if (!/^\/site(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*\/?$/.test(rawPath)) return null;
  const path = rawPath.length > 1 ? rawPath.replace(/\/$/, '') : rawPath;
  let clean = null;
  for (const [from, to] of SITE_PATHS) {
    if (path === from) { clean = to; break; }
    if (from === '/site/classes' && path.startsWith('/site/classes/') && !path.slice(14).includes('/')) { clean = `/clases/${path.slice(14)}`; break; }
  }
  if (!clean) return null;
  return `${clean}${/^\?[A-Za-z0-9._~=&+-]{1,512}$/.test(rawQuery) ? rawQuery : ''}`;
}

// ---------------------------------------------------------------------------------------------
// The studio as JSON-LD, from the public settings record
// ---------------------------------------------------------------------------------------------

const str = (v, max = 300) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);
const num = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** schema.org day names, Monday first (src/tenant/hours.ts WEEK_ORDER); the settings key is the weekday, 0 = Sunday. */
const WEEK = [['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday'], ['6', 'Saturday'], ['0', 'Sunday']];

/**
 * The studio as schema.org `HealthClub` (a `LocalBusiness`), the same facts the website prints (src/modules/website/
 * jsonLd.ts): only confirmed contact fields (0036), the weekly hours only once Administration has confirmed them (0041).
 * `value` is the public settings record's value, or null for the tenant config's defaults.
 */
export function studioJsonLd(value) {
  const settings = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  const p = settings && settings.profile && typeof settings.profile === 'object' && !Array.isArray(settings.profile) ? settings.profile : {};
  const confirmed = settings ? (p.confirmedFields && typeof p.confirmedFields === 'object' ? p.confirmedFields : {}) : { whatsapp: true, address: true, email: true, instagram: true };
  const address = str(p.address) ?? FALLBACK.address;
  const city = str(p.city, 80) ?? FALLBACK.city;
  const whatsapp = str(p.whatsapp, 40) && /^\+?[0-9 ()-]{7,20}$/.test(p.whatsapp.trim()) ? p.whatsapp.trim() : FALLBACK.whatsapp;
  const email = str(p.email, 200) && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(p.email.trim()) ? p.email.trim() : FALLBACK.email;
  const instagram = settings ? (str(p.instagramUrl, 300) && /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._/-]+$/.test(p.instagramUrl.trim()) ? p.instagramUrl.trim() : null) : FALLBACK.instagramUrl;
  const lat = settings ? num(p.mapLat, -90, 90) : FALLBACK.lat;
  const lng = settings ? num(p.mapLng, -180, 180) : FALLBACK.lng;

  const out = {
    '@context': 'https://schema.org',
    '@type': 'HealthClub',
    '@id': `${CANONICAL_ORIGIN}/#studio`,
    name: FALLBACK.legalName,
    alternateName: 'HOY',
    url: `${CANONICAL_ORIGIN}/`,
    image: `${CANONICAL_ORIGIN}${IMAGE.path}`,
  };
  if (confirmed.address) out.address = { '@type': 'PostalAddress', streetAddress: address, addressLocality: city, addressRegion: 'Antioquia', addressCountry: FALLBACK.country };
  if (confirmed.whatsapp) out.telephone = whatsapp;
  if (confirmed.email) out.email = email;
  if (confirmed.instagram && instagram) out.sameAs = [instagram];
  if (lat !== null && lng !== null) out.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };

  if (settings?.openingHoursConfirmed === true && settings.openingHours && typeof settings.openingHours === 'object') {
    const groups = new Map();
    for (const [key, day] of WEEK) {
      const h = settings.openingHours[key];
      if (!h || typeof h !== 'object' || !TIME.test(h.open ?? '') || !TIME.test(h.close ?? '')) continue;
      const k = `${h.open}|${h.close}`;
      groups.set(k, [...(groups.get(k) ?? []), day]);
    }
    if (groups.size) {
      out.openingHoursSpecification = [...groups].map(([k, days]) => {
        const [opens, closes] = k.split('|');
        return { '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens, closes };
      });
    }
  }
  return out;
}

/** JSON inside a <script>: nothing can close the element or start a comment, and no line separators. */
const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const escapeAttr = (v) => String(v).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** The head block for a page: replaces the build's social block (index.html `hoy-social`), or its title. */
export function renderPage(template, page, studio) {
  const url = `${CANONICAL_ORIGIN}${page.path}`;
  const image = `${CANONICAL_ORIGIN}${IMAGE.path}`;
  const meta = (attribute, key, value) => `    <meta ${attribute}="${key}" content="${escapeAttr(value)}" />`;
  const block = [
    '    <!-- hoy-seo:start -->',
    // The build's assets are relative (vite base './'): on /clases/fuego they must still resolve from the root.
    ...(page.path === '/' ? [] : ['    <base href="/" />']),
    `    <title>${escapeAttr(page.title)}</title>`,
    meta('name', 'description', page.description),
    `    <link rel="canonical" href="${url}" />`,
    meta('property', 'og:type', 'website'),
    meta('property', 'og:locale', 'es_CO'),
    meta('property', 'og:site_name', BRAND),
    meta('property', 'og:title', page.title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:image:secure_url', image),
    meta('property', 'og:image:type', 'image/png'),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', IMAGE.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', page.title),
    meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', image),
    meta('name', 'twitter:image:alt', IMAGE.alt),
    // Same id as the website's own (src/modules/website/jsonLd.ts), so the app replaces it instead of adding a second.
    `    <script type="application/ld+json" id="hoyos-localbusiness">${scriptJson(studio)}</script>`,
    '    <!-- hoy-seo:end -->',
  ].join('\n');
  let html = template;
  const social = /[ \t]*<!-- hoy-social:start -->[\s\S]*?<!-- hoy-social:end -->/;
  if (social.test(html)) html = html.replace(social, () => block);
  else if (/<title>[\s\S]*?<\/title>/.test(html)) html = html.replace(/<title>[\s\S]*?<\/title>/, () => block);
  else if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${block}`);
  else html = html.replace(/^(<!doctype html>)?/i, (m) => `${m}\n${block}\n`);
  if (/<html\b[^>]*\blang="[^"]*"/i.test(html)) html = html.replace(/(<html\b[^>]*\blang=")[^"]*"/i, '$1es-CO"');
  else html = html.replace(/<html\b/i, '<html lang="es-CO"');
  return html;
}

export function sitemapXml() {
  const urls = PUBLIC_PATHS.map((p) => `  <url>\n    <loc>${CANONICAL_ORIGIN}${p}</loc>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Production: the site open, the app (hash routes, so these only cover typed addresses), Hub and API closed. */
export function robotsTxt(production) {
  if (!production) return 'User-agent: *\nDisallow: /\n';
  return [
    'User-agent: *',
    'Disallow: /app',
    'Disallow: /hub',
    'Disallow: /api/',
    'Disallow: /files/',
    'Disallow: /private-docs/',
    'Disallow: /test-gate',
    'Allow: /',
    '',
    `Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * A request on `www.<host>` → 301 to `https://<host>` with the same path (D11: the apex is indexed). The host must be a
 * plain host name; a path that isn't plain (or would start with `//`) becomes `/`. Null when there's nothing to do.
 */
export function wwwLocation(hostHeader, rawUrl) {
  const host = typeof hostHeader === 'string' ? hostHeader.trim().toLowerCase() : '';
  const m = /^www\.((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})(?::\d{1,5})?$/.exec(host);
  if (!m) return null;
  const path = /^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@%/?]*$/.test(rawUrl ?? '') && (rawUrl ?? '').length <= 2048 ? rawUrl : '/';
  return `https://${m[1]}${path}`;
}

// ---------------------------------------------------------------------------------------------
// The handler's part
// ---------------------------------------------------------------------------------------------

const SETTINGS_TTL_MS = 5 * 60_000;
const SETTINGS_FAILED_TTL_MS = 30_000;
const SETTINGS_TIMEOUT_MS = 2_000;
const SETTINGS_LIMIT = 256 * 1024;

/**
 * @param {import('./config.mjs').ServerConfig} config
 * @param {{ readTemplate: () => Promise<string|null>, now?: () => number, headers: (ext: string) => Record<string,string>, log?: (e: object) => void }} deps
 * @returns {(req, res, rawPath: string, rawQuery: string) => Promise<boolean>} true when it answered
 */
export function createSeo(config, deps) {
  const now = deps.now ?? Date.now;
  const production = config.environment === 'production';
  const cacheScope = config.testGate?.on ? 'private' : 'public';
  let cached = { at: -Infinity, ttl: 0, value: null };
  let inflight = null;

  /** The public settings record's value, cached; null (the fallback) without a read identity or on any failure. */
  async function settingsValue() {
    if (!config.companyOsReadToken) return null;
    const t = now();
    if (t - cached.at < cached.ttl) return cached.value;
    inflight ??= readSettings(config).then(
      (value) => { cached = { at: now(), ttl: value === undefined ? SETTINGS_FAILED_TTL_MS : SETTINGS_TTL_MS, value: value ?? null }; },
      () => { cached = { at: now(), ttl: SETTINGS_FAILED_TTL_MS, value: null }; },
    ).finally(() => { inflight = null; });
    await inflight;
    return cached.value;
  }

  const live = () => {
    const { siteLive, siteLiveAt } = config.launch ?? {};
    return !!siteLive || (!!siteLiveAt && Date.parse(siteLiveAt) <= now());
  };

  return async function seo(req, res, rawPath, rawQuery) {
    const get = req.method === 'GET' || req.method === 'HEAD';
    if (rawPath === '/robots.txt' || rawPath === '/sitemap.xml') {
      if (!get) return refuse(req, res);
      const xml = rawPath === '/sitemap.xml';
      return send(req, res, 200, xml ? 'application/xml; charset=utf-8' : 'text/plain; charset=utf-8', xml ? sitemapXml() : robotsTxt(production), `${cacheScope}, max-age=3600`);
    }
    const legacy = legacyLocation(rawPath, rawQuery);
    if (legacy) {
      if (!get) return false;
      res.writeHead(301, { Location: legacy, 'Cache-Control': `${cacheScope}, max-age=3600` });
      res.end();
      return true;
    }
    // A public path with a trailing slash → without it (one canonical address per page).
    if (rawPath.length > 1 && rawPath.endsWith('/') && pageFor(rawPath.slice(0, -1)) && rawPath.slice(0, -1) !== '/') {
      if (!get) return refuse(req, res);
      res.writeHead(301, { Location: `${rawPath.slice(0, -1)}${/^\?[A-Za-z0-9._~=&+-]{1,512}$/.test(rawQuery) ? rawQuery : ''}`, 'Cache-Control': `${cacheScope}, max-age=3600` });
      res.end();
      return true;
    }
    const page = pageFor(rawPath);
    if (!page) return false;
    // The root is Coming Soon until go-live: the file as built (its own pre-launch tags), served as before.
    if (page.path === '/' && !live()) return false;
    if (!get) return refuse(req, res);
    const template = await deps.readTemplate();
    if (template === null) return false;
    const html = renderPage(template, page, studioJsonLd(await settingsValue()));
    return send(req, res, 200, 'text/html; charset=utf-8', html, 'no-cache', deps.headers('.html'));
  };
}

function refuse(req, res) {
  res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error: 'method_not_allowed' }));
  return true;
}

function send(req, res, status, type, body, cacheControl, extra = {}) {
  const buffer = Buffer.from(body, 'utf8');
  const headers = { ...extra, 'Content-Type': type, 'Cache-Control': cacheControl, Vary: 'Accept-Encoding' };
  const accept = req.headers['accept-encoding'];
  if (buffer.length > 1024 && /\bgzip\b/.test(Array.isArray(accept) ? accept[0] : accept ?? '')) {
    res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip' });
    if (req.method === 'HEAD') { res.end(); return true; }
    const gz = createGzip();
    gz.pipe(res);
    gz.end(buffer);
    return true;
  }
  res.writeHead(status, { ...headers, 'Content-Length': buffer.length });
  res.end(req.method === 'HEAD' ? undefined : buffer);
  return true;
}

/**
 * `POST /t/<tenant>/query` for the public settings record (src/data/companyos/settingsSplit.ts `studio_settings`), with
 * the server's read identity. The record's value; null when there is none yet; undefined when the read failed.
 */
function readSettings(config) {
  return new Promise((done) => {
    let target;
    try { target = new URL(`${config.companyOsUrl.replace(/\/+$/, '')}/t/${config.tenant}/query`); } catch { return done(undefined); }
    const body = JSON.stringify({ entity: 'setting', filter: { field: 'key', op: 'eq', value: 'studio_settings' }, limit: 1 });
    const client = target.protocol === 'https:' ? https : http;
    const req = client.request(target, {
      method: 'POST',
      timeout: SETTINGS_TIMEOUT_MS,
      headers: { authorization: `Bearer ${config.companyOsReadToken}`, 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), accept: 'application/json' },
    }, (answer) => {
      const chunks = [];
      let size = 0;
      answer.on('data', (c) => { size += c.length; if (size > SETTINGS_LIMIT) answer.destroy(); else chunks.push(c); });
      answer.on('error', () => done(undefined));
      answer.on('close', () => {
        if (answer.statusCode !== 200 || size > SETTINGS_LIMIT) return done(undefined);
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const row = Array.isArray(parsed?.data) ? parsed.data.find((r) => r?.data?.key === 'studio_settings') : null;
          done(row ? row.data.value ?? null : null);
        } catch {
          done(undefined);
        }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => done(undefined));
    req.end(body);
  });
}
