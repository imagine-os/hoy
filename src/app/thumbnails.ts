import { useEffect, useState } from 'react';

/**
 * Preview thumbnails — the real captures the hub (HUB-01) and the canvas (D-05) show before, or
 * instead of, a live frame.
 *
 * The URL map lives in `./thumbnailMap` and is fetched on demand, so the entry chunk does not
 * carry five hundred asset URLs for a page that may never be opened. `useThumbUrl()` returns
 * `undefined` until it lands (and when no capture exists), which is exactly what `PagePreview`
 * needs: it keeps showing its idle tile and never renders a broken image.
 *
 * `assetUrl()` in the docs module answers the same question, but it sits beside the eager
 * `?docmeta` glob over every markdown file under docs/ — not something to pull in for image URLs.
 */
export type ThumbShape = 'desktop' | 'phone';

type Thumbs = ReadonlyMap<string, string>;

let cache: Thumbs | null = null;
let pending: Promise<Thumbs> | null = null;

/** Loads (once) the map of every committed thumbnail. */
export function loadThumbs(): Promise<Thumbs> {
  if (cache) return Promise.resolve(cache);
  pending ??= import('./thumbnailMap').then((m) => { cache = m.thumbs; return m.thumbs; });
  return pending;
}

/** A page code as its screenshot folder name (`C-02/b` → `C-02_b`). */
export const thumbFolder = (code: string) => code.replace(/\//g, '_');

/**
 * The best thumbnail for a page: exact language + theme first, then light, then Spanish, then any
 * capture of that code. `undefined` when the pass has not produced one yet.
 */
export function thumbUrlIn(thumbs: Thumbs, code: string, shape: ThumbShape, lang: 'es' | 'en', theme: 'light' | 'dark'): string | undefined {
  const dir = `docs/screenshots/${thumbFolder(code)}`;
  const dark = theme === 'dark' ? '-dark' : '';
  const candidates = [
    `${dir}/thumb-${lang}-${shape}${dark}.jpg`,
    `${dir}/thumb-${lang}-${shape}.jpg`,
    `${dir}/thumb-es-${shape}${dark}.jpg`,
    `${dir}/thumb-es-${shape}.jpg`,
  ];
  for (const c of candidates) { const hit = thumbs.get(c); if (hit) return hit; }
  for (const [path, url] of thumbs) if (path.startsWith(`${dir}/`)) return url;
  return undefined;
}

/** The thumbnail for a page, once the map has loaded. */
export function useThumbUrl(code: string, shape: ThumbShape, lang: 'es' | 'en', theme: 'light' | 'dark'): string | undefined {
  const [thumbs, setThumbs] = useState<Thumbs | null>(cache);
  useEffect(() => {
    if (thumbs) return;
    let alive = true;
    loadThumbs().then((m) => { if (alive) setThumbs(m); }).catch(() => undefined);
    return () => { alive = false; };
  }, [thumbs]);
  return thumbs ? thumbUrlIn(thumbs, code, shape, lang, theme) : undefined;
}
