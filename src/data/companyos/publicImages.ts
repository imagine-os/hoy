/**
 * Public images (go-live lane H1): a teacher's photo and the payment QR. One place for what Company OS calls them
 * (ADR 0021 amendment; people 1.10.0, comms 1.9.0): both kinds are published as soon as they are confirmed, PNG, JPEG or
 * WebP up to 10 MB. A visitor gets the bytes from the Hoy server's `GET /media/<id>`; the storage link never reaches a
 * browser. Upload needs update on the owner record, so the API answers `forbidden` to anyone else.
 */
import { PUBLIC_SETTINGS_KEY } from './settingsSplit';

export const COACH_PHOTO = { ownerEntity: 'coach', kind: 'photo' } as const;
export const SETTING_IMAGE = { ownerEntity: 'setting', kind: 'image' } as const;
/** The tenant fields on `coach`: `bio` json `{ es, en }`, `specialties` json array of class type slugs, `photo` text, a bare file id. */
export const COACH_FIELDS = { bio: 'bio', specialties: 'specialties', photo: 'photo' } as const;

export interface ImageOwner { ownerEntity: string; kind: string; ownerId: string }
/** What of the provider these need (`CompanyOSProvider`); the review build's provider has neither. */
export interface ImagePort {
  name?: string;
  uploadFile?(input: { ownerEntity: string; ownerId: string; kind: string; file: File }): Promise<unknown>;
  request?<T>(method: 'POST' | 'DELETE', path: string, body?: unknown): Promise<T>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9_-]{1,64}$/;
const refusal = (code: string) => Object.assign(new Error(code), { code });

export const mediaUrl = (id: string) => `/media/${id.toLowerCase()}`;
/** The stored `photo` is not validated by Company OS, so it is untrusted: a uuid or no photo at all. */
export const coachPhotoUrl = (stored: unknown): string | null => (typeof stored === 'string' && UUID.test(stored) ? mediaUrl(stored) : null);
/** What is stored for a field's value: the bare id of a `/media/<id>` address, anything else nothing. */
export function coachPhotoValue(url: unknown): string | null {
  if (typeof url !== 'string' || !url.startsWith('/media/')) return null;
  const id = url.slice('/media/'.length);
  return UUID.test(id) ? id.toLowerCase() : null;
}

/** A stored bio, whatever it holds: only strings count. */
export function coachBio(stored: unknown): { es: string; en: string } {
  const v = stored && typeof stored === 'object' && !Array.isArray(stored) ? (stored as { es?: unknown; en?: unknown }) : {};
  return { es: typeof v.es === 'string' ? v.es : '', en: typeof v.en === 'string' ? v.en : '' };
}
/** Stored specialties, whatever they hold: slugs only, once each. */
export function coachSpecialties(stored: unknown): string[] {
  if (!Array.isArray(stored)) return [];
  return [...new Set(stored.filter((s): s is string => typeof s === 'string' && SLUG.test(s)))];
}

/**
 * Link, `PUT`, confirm (the provider's `uploadFile`), and the address the app keeps. The owner record is patched with it
 * afterwards, by the form's own save. Refusals keep the API's code, for the code→copy table.
 */
export async function uploadPublicImage(port: ImagePort, owner: ImageOwner, file: File): Promise<string> {
  if (typeof port.uploadFile !== 'function') throw refusal('disconnected');
  const rec = (await port.uploadFile({ ownerEntity: owner.ownerEntity, ownerId: owner.ownerId, kind: owner.kind, file })) as { id?: unknown; status?: unknown };
  if (typeof rec?.id !== 'string' || !UUID.test(rec.id) || rec.status !== 'ready') throw refusal('file_upload_missing');
  return mediaUrl(rec.id);
}

/** The file id in a saved image value: a `/media/<id>` address or a coach's bare `photo`, a uuid or nothing. */
const savedFileId = (saved: unknown): string | null => (typeof saved === 'string' && UUID.test(saved) ? saved.toLowerCase() : coachPhotoValue(saved));

const codeOf = (e: unknown) => String((e as { code?: unknown } | null)?.code ?? 'unknown');
const dataOf = (row: unknown) => ((row as { data?: unknown } | null)?.data ?? {}) as Record<string, unknown>;
/** Does a record still point at this file? Then it isn't ours to delete (a second teacher; a save whose answer was lost). */
async function stillHeld(port: ImagePort, owner: ImageOwner, id: string): Promise<boolean> {
  if (owner.ownerEntity === COACH_PHOTO.ownerEntity) {
    const res = await port.request!<{ data?: unknown[] }>('POST', '/query', { entity: 'coach', filter: { field: COACH_FIELDS.photo, op: 'eq', value: id }, limit: 1 });
    return (res?.data?.length ?? 0) > 0;
  }
  const res = await port.request!<{ data?: unknown[] }>('POST', '/query', { entity: owner.ownerEntity, filter: { field: 'id', op: 'eq', value: owner.ownerId }, limit: 1 });
  return JSON.stringify(dataOf(res?.data?.[0])).toLowerCase().includes(id);
}
/**
 * Deletes a file only if it is the one this form owns: a Super Admin's delete isn't limited by the policy, so a receipt's
 * id in `photo` must not take the receipt with it. Read, check owner and kind, check nothing holds it, delete; one retry.
 * `true`: it's gone or isn't ours to delete. `false`: it may still be public.
 */
async function removeFile(port: ImagePort, owner: ImageOwner, id: string): Promise<boolean> {
  let last = 'unknown';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const read = await port.request!<{ data?: unknown[] }>('POST', '/query', { entity: 'file', filter: { field: 'id', op: 'eq', value: id }, limit: 1 });
      const row = read?.data?.[0];
      if (!row) return true;
      const f = dataOf(row);
      if (f.owner_entity !== owner.ownerEntity || f.owner_id !== owner.ownerId || f.kind !== owner.kind) {
        console.warn('image_delete_skipped', 'not_this_owner');
        return true;
      }
      if (await stillHeld(port, owner, id)) {
        console.warn('image_delete_skipped', 'still_held');
        return true;
      }
      await port.request!('DELETE', `/api/file/${id}`);
      return true;
    } catch (e) {
      last = codeOf(e);
      if (last === 'not_found') return true;
    }
  }
  console.warn('image_delete_failed', last);
  return false;
}

/**
 * The uploads of one form session that no saved record holds yet. They are the only `/media` values besides the saved one
 * that a form may save, and they are deleted when they stop being used: replaced before saving, undone, or the form closed.
 * Best effort: a browser that closes without warning leaves its upload behind.
 */
export class ImageDraft {
  private uploaded = new Map<string, ImageOwner>();
  constructor(private port: ImagePort) {}
  add(url: string, owner: ImageOwner) { const id = coachPhotoValue(url); if (id) this.uploaded.set(id, owner); }
  holds(value: unknown) { const id = savedFileId(value); return !!id && this.uploaded.has(id); }
  /** The record now holds it: no longer this form's to clean up. */
  forget(value: unknown) { const id = savedFileId(value); if (id) this.uploaded.delete(id); }
  /** Deletes every unsaved upload but `keep`. Never throws: nothing here is the person's problem. */
  async discard(keep?: unknown) {
    const kept = savedFileId(keep);
    const gone = [...this.uploaded].filter(([id]) => id !== kept);
    for (const [id] of gone) this.uploaded.delete(id);
    if (typeof this.port.request !== 'function') return;
    await Promise.all(gone.map(([id, owner]) => removeFile(this.port, owner, id).catch(() => false)));
  }
}

export interface ImageSave { saved: unknown; next: unknown; owner?: ImageOwner; draft?: ImageDraft }
/** `notice`, for the person: `image_not_current` nothing was saved; `old_image_remains` saved, but the old file is still public. */
export type ImageSaveNotice = 'image_not_current' | 'old_image_remains' | null;

/**
 * Saving a form that holds an image (owner, 2026-11-04). First a value that is neither the saved one nor uploaded in this
 * form is refused: an undo can't bring back a file already deleted. Then `patch` saves the owner record (falsy or a throw:
 * not saved), and only after that the old file goes, replaced or removed alike, so the record never points at nothing. If
 * it can't be deleted the new image still stands; the person is told, since an old bank QR would stay public.
 */
export async function saveThenRemoveOld<T>(port: ImagePort, { saved, next, owner, draft }: ImageSave, patch: () => Promise<T>): Promise<{ result: T | null; notice: ImageSaveNotice }> {
  const live = typeof port.request === 'function';
  const oldId = savedFileId(saved), newId = savedFileId(next);
  if (live && newId && newId !== oldId && !draft?.holds(newId)) return { result: null, notice: 'image_not_current' };
  const result = await patch();
  if (!result || !live) return { result, notice: null };
  draft?.forget(newId);
  await draft?.discard();
  if (!oldId || oldId === newId) return { result, notice: null };
  if (!owner) { console.warn('image_delete_failed', 'no_owner'); return { result, notice: 'old_image_remains' }; }
  return { result, notice: (await removeFile(port, owner, oldId)) ? null : 'old_image_remains' };
}

/** A teacher's photo is re-encoded (smaller, no metadata). The QR goes as it is: nothing may stop it scanning. */
export async function prepareForUpload(owner: { ownerEntity: string; kind: string }, file: File, encodePhoto: (file: File) => Promise<File>): Promise<File> {
  return owner.ownerEntity === COACH_PHOTO.ownerEntity && owner.kind === COACH_PHOTO.kind ? encodePhoto(file) : file;
}

/** The record that owns the QR: the public settings row. No row yet (nothing saved): null. A failed read throws. */
export async function studioSettingsOwnerId(port: ImagePort): Promise<string | null> {
  if (typeof port.request !== 'function') return null;
  const res = await port.request<{ data?: { id?: unknown }[] }>('POST', '/query', { entity: 'setting', filter: { field: 'key', op: 'eq', value: PUBLIC_SETTINGS_KEY }, limit: 1 });
  const id = res?.data?.[0]?.id;
  return typeof id === 'string' && id ? id : null;
}

/**
 * Which upload an image field offers. `local`: the review build's private copy in the browser, as it always was.
 * `shared`: production with an owner record: the real upload. `none`: production without one: the picker as it was.
 */
export function imageFieldMode(port: ImagePort, owner: ImageOwner | undefined): 'local' | 'shared' | 'none' {
  if (port.name === 'mock') return 'local';
  return owner && typeof port.uploadFile === 'function' ? 'shared' : 'none';
}
