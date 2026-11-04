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

/**
 * Replacing an image (owner, 2026-11-04): the new file is already uploaded and confirmed; `patch` saves the owner record
 * (falsy or a throw: not saved), and only after that the old file is deleted, so the record never points at nothing. A
 * failed delete changes nothing for the person, since the new image stands: it is logged, and the old file stays.
 */
export async function saveThenRemoveOld<T>(port: ImagePort, saved: unknown, next: unknown, patch: () => Promise<T>): Promise<T> {
  const result = await patch();
  const oldId = savedFileId(saved), newId = savedFileId(next);
  if (!result || !oldId || !newId || oldId === newId || typeof port.request !== 'function') return result;
  try {
    await port.request('DELETE', `/api/file/${oldId}`);
  } catch (e) {
    console.warn('image_delete_failed', String((e as { code?: unknown })?.code ?? 'unknown'));
  }
  return result;
}

/** The record that owns the QR: the public settings row. No row yet (nothing saved): null. */
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
