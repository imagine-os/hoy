/** Public, build-time share configuration. No provider, customer or authenticated data. */
export const socialOrigin = 'https://hoyhumanclub.com';
export const socialBrand = 'HOY Human Club';
export const socialSurfaces = {
  comingSoon: {
    path: '/',
    title: 'HOY Human Club — Próximamente',
    description: 'Estamos preparando un espacio para moverte, conectar y hacer una pausa. Nos vemos pronto.',
    image: '/social/hoy-coming-soon-20261027.png',
    imageAlt: 'HOY Human Club — Próximamente. El estudio real en Medellín.',
  },
  website: {
    path: '/website/',
    title: 'HOY Human Club — Movimiento, comunidad y bienestar',
    description: 'HOY es movimiento, comunidad y bienestar de una forma simple y cercana.',
    image: '/social/hoy-website-20261027.png',
    imageAlt: 'HOY Human Club — Muévete. Respira. Vive el presente. Medellín.',
  },
};

const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function socialHead(surface) {
  const meta = (attribute, key, value) => `    <meta ${attribute}="${key}" content="${escape(value)}" />`;
  return [
    '    <!-- hoy-social:start -->',
    `    <title>${escape(surface.title)}</title>`,
    meta('name', 'description', surface.description),
    `    <link rel="canonical" href="${socialOrigin}${surface.path}" />`,
    meta('property', 'og:type', 'website'),
    meta('property', 'og:locale', 'es_CO'),
    meta('property', 'og:site_name', socialBrand),
    meta('property', 'og:title', surface.title),
    meta('property', 'og:description', surface.description),
    meta('property', 'og:url', socialOrigin + surface.path),
    meta('property', 'og:image', socialOrigin + surface.image),
    meta('property', 'og:image:secure_url', socialOrigin + surface.image),
    meta('property', 'og:image:type', 'image/png'),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', surface.imageAlt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', surface.title),
    meta('name', 'twitter:description', surface.description),
    meta('name', 'twitter:image', socialOrigin + surface.image),
    meta('name', 'twitter:image:alt', surface.imageAlt),
    '    <!-- hoy-social:end -->',
  ].join('\n');
}
