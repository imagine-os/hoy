import type { BaseRow, MediaAssetRow } from '../schema';
import { editorialPhotoSlots } from '../studioPhotography';
import { mediaAssets } from './media';

const keys = new Set<string>(editorialPhotoSlots.map(slot => slot.key));
const additions = mediaAssets.filter(row => keys.has(row.slot_key));

/** Mock-cache upgrade only: add the five new editorial slots without replacing any stored row. */
export function ensureEditorialPhotoSlots(db: Record<string, BaseRow[]>): boolean {
  const rows = db.media_assets as MediaAssetRow[];
  let changed = false;
  for (const seed of additions) {
    // An existing slot may have a custom ID; an ID collision must never overwrite user data.
    if (rows.some(row => row.id === seed.id || row.tenant_id === seed.tenant_id && row.slot_key === seed.slot_key)) continue;
    rows.push(structuredClone(seed));
    changed = true;
  }
  return changed;
}
