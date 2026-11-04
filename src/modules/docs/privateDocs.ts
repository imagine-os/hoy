// The production build's docs, manual, kanban, changelog and source documents (Hoy test-fixes lane Y6; owner
// 2026-11-01: "Gate on the server first"). None of it is in the public bundle: the build writes it to a private pack
// (vite.config.ts `privateDocsPack`) and the Hoy server serves it at /private-docs/* only to a signed-in super admin
// (server/docsGate.mjs). This module fetches it with the session token (src/auth/sessionToken.ts, the only token path)
// and keeps it in memory for the tab. The review build never calls it: its docs are bundled as before.
import { getSessionToken, onUnauthorized } from '../../auth/sessionToken';
import { reloadIfTestGate } from '../../auth/testGateReload';
import type { DocMeta } from './docsIndex';

export const PRIVATE_DOCS_BASE = '/private-docs';

/** What `<dist>-private/docs.json` holds (written by vite.config.ts). Paths are repo paths: `docs/…`. */
export interface PrivateDocsPack {
  version: 1;
  docs: { path: string; info: DocMeta; body: string }[];
  /** Every image under docs/ (never the in-app screenshots), as a data URL. */
  images: Record<string, string>;
  /** docs/source/index.json, each cover as a data URL; `file` is fetched through the gate (`privateFileUrl`). */
  sources: { id: string; title: { es: string; en: string }; file: string; cover?: string; pages: number; date: string; kind: string; summary: { es: string; en: string }; chapters: string[] }[];
}

export type PrivateDocsState = 'ok' | 'signed-out' | 'refused' | 'failed';

let pack: PrivateDocsPack | null = null;
let pending: Promise<PrivateDocsState> | null = null;
/** Bumped by every drop: a load started before it is thrown away when it lands (review round 2, L6). */
let generation = 0;

/** The pack once loaded (docsIndex.ts and sources.ts read it when their chunk first evaluates), else null. */
export const privateDocs = (): PrivateDocsPack | null => pack;

async function authorised(path: string): Promise<Response | PrivateDocsState> {
  const ask = async (refresh: boolean) => {
    const token = await getSessionToken(refresh ? { refresh: true } : undefined);
    return token ? fetch(`${PRIVATE_DOCS_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', credentials: 'same-origin' }) : null;
  };
  // A token that expired on the way (or clock skew) gets one fresh try; a second 401 re-checks the session (as every 401).
  let res = await ask(false);
  if (res?.status === 401) res = await ask(true);
  if (!res) return 'signed-out';
  if (res.status === 401) {
    if (!reloadIfTestGate(res.status, await res.clone().json().catch(() => null))) onUnauthorized();
    return 'signed-out';
  }
  if (res.status === 403) return 'refused';
  if (!res.ok) return 'failed';
  return res;
}

/**
 * Loads the pack once per tab. A refusal or a failure is not remembered, so signing in as the super admin (or a retry
 * after a network error) loads it on the next call.
 */
export function loadPrivateDocs(): Promise<PrivateDocsState> {
  if (pack) return Promise.resolve('ok');
  if (pending) return pending;
  const started = generation;
  const load: Promise<PrivateDocsState> = (async (): Promise<PrivateDocsState> => {
    try {
      const res = await authorised('/docs.json');
      if (typeof res === 'string') return res;
      const body = await res.json() as PrivateDocsPack;
      // Dropped meanwhile (sign-out while docs.json was downloading): the answer is not kept.
      if (started !== generation) return 'signed-out';
      if (!body || body.version !== 1 || !Array.isArray(body.docs)) return 'failed';
      pack = body;
      return 'ok';
    } catch {
      return 'failed';
    }
  })().finally(() => { if (pending === load) pending = null; });
  pending = load;
  return load;
}

const fileUrls = new Map<string, Promise<string | null>>();
/** A gated file (`source/<name>.pdf`) as a blob: URL for the tab, or null when it can't be had. */
export function privateFileUrl(file: string): Promise<string | null> {
  if (!/^source\/[a-z0-9][a-z0-9-]*\.(pdf|jpe?g|png|webp)$/.test(file)) return Promise.resolve(null);
  let hit = fileUrls.get(file);
  if (!hit) {
    const started = generation;
    hit = authorised(`/${file}`).then(async (res) => {
      if (typeof res === 'string') return null;
      const blob = await res.blob();
      return started === generation ? URL.createObjectURL(blob) : null; // dropped meanwhile (L6)
    }).catch(() => null);
    const mine = hit;
    mine.then((url) => { if (!url && fileUrls.get(file) === mine) fileUrls.delete(file); });
    fileUrls.set(file, mine);
  }
  return hit;
}


/** The pack has been loaded into this tab. */
export const privateDocsLoaded = (): boolean => pack !== null;

/** Forgets the pack (and any load still on its way) and revokes the PDF links (PrivateDocsWatch, before it reloads the tab). */
export function dropPrivateDocs() {
  generation++;
  pending = null;
  pack = null;
  for (const p of fileUrls.values()) p.then((url) => { if (url) URL.revokeObjectURL(url); });
  fileUrls.clear();
}
