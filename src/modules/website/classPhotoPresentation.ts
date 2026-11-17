import type { ClassSlug } from '../../tenant/brand';
import type { SiteVersion } from './edition';
import { practiceStudioPhoto } from './photography';

/** One source for home, catalog, detail and related arches. Published CMS photos always win. */
export function classPhotoPresentation(slug: ClassSlug, photos: ReadonlyMap<string, string>, version: SiteVersion) {
  const override = photos.get(slug);
  const fallback = practiceStudioPhoto(slug, version);
  return { photoUrl: override || fallback, naturalPhoto: !override && Boolean(fallback) };
}
