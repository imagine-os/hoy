/**
 * What a class's thumbnail shows (Hoy 12 Nov, D2), in order: the class's own image (uploaded by Administration, served at
 * `/media/<id>`), then the method's Home photo, then the letter tile. An image that is not a `/media/<uuid>` address is not
 * trusted and is skipped; one that fails to load falls through to the next, never a broken picture.
 */
const MEDIA = /^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ClassThumbnailSource = { kind: 'class' | 'cms' | 'method'; src: string } | { kind: 'tile' };

export function classThumbnailSource({ imageUrl, cmsUrl, methodPhoto, classFailed = false, cmsFailed = false, methodFailed = false }: {
  imageUrl?: string | null; cmsUrl?: string | null; methodPhoto?: string | null; classFailed?: boolean; cmsFailed?: boolean; methodFailed?: boolean;
}): ClassThumbnailSource {
  if (imageUrl && MEDIA.test(imageUrl) && !classFailed) return { kind: 'class', src: imageUrl };
  if (cmsUrl && !cmsFailed) return { kind: 'cms', src: cmsUrl };
  if (methodPhoto && !methodFailed) return { kind: 'method', src: methodPhoto };
  return { kind: 'tile' };
}

/** A fresh upload may answer `file_not_ready` for a moment: a /media image is asked once more (`?r=1`, as the image field's preview does). */
export const maxMediaRetries = 1;
export const retrySrc = (src: string, tries: number): string => (tries > 0 && MEDIA.test(src) ? `${src}?r=${tries}` : src);
