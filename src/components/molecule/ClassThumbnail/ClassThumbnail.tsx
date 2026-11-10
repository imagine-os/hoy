import { useEffect, useState } from 'react';
import { useTable } from '../../../data/DataContext';
import type { MediaAssetRow, ModalityRow } from '../../../data/schema';
import { practiceStudioPhoto } from '../../../modules/website/photography';
import { classes, classOrder } from '../../../tenant/brand';
import { classThumbnailSource } from './thumbnailSource';
import './ClassThumbnail.css';

/**
 * The class's picture, in order (Hoy 12 Nov, D2): the class's own image (`imageUrl`, uploaded by Administration on its
 * timetable row; an occurrence uses its schedule's), the CMS photo for `site.classes.<slug>` once it is ready, the method's
 * Home photo, and otherwise (0051) a tile in the class's tone with its initial — never a stock photo that shows another
 * practice. A picture that fails to load falls through to the next one.
 */
export function ClassThumbnail({ modality, imageUrl, className = '' }: { modality?: ModalityRow; imageUrl?: string | null; className?: string }) {
  const slug = classOrder.find(s => classes[s].modalitySlugs.includes(modality?.slug ?? ''));
  const { rows } = useTable<MediaAssetRow>('media_assets', { where: { slot_key: `site.classes.${slug}` } });
  const asset = rows.find(a => a.status === 'ready' && a.kind === 'photo' && a.url);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  useEffect(() => setFailed({}), [imageUrl]);
  const pic = classThumbnailSource({
    imageUrl, cmsUrl: asset?.url, methodPhoto: slug ? practiceStudioPhoto(slug, 'latest') : undefined,
    classFailed: failed.class, cmsFailed: failed.cms, methodFailed: failed.method,
  });
  if (pic.kind !== 'tile') return <img className={`class-thumbnail ${className}`} src={pic.src} alt="" loading="lazy" onError={() => setFailed(f => ({ ...f, [pic.kind]: true }))} />;
  const tone = slug ? classes[slug].tone : modality?.tone ?? 'river';
  const cls = slug ? classes[slug].name : modality?.name_es ?? '';
  const name = typeof cls === 'string' ? cls : cls.es;
  return <span className={`class-thumbnail class-thumbnail-tile ${className}`} data-tone={tone} aria-hidden="true">{name.charAt(0)}</span>;
}
