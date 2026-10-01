import { useTable } from '../../../data/DataContext';
import type { MediaAssetRow, ModalityRow } from '../../../data/schema';
import { classes, classOrder } from '../../../tenant/brand';
import './ClassThumbnail.css';

/**
 * The class's picture: the CMS photo for `site.classes.<slug>` once it is ready, otherwise (0051) a tile in the class's
 * tone with its initial — never a stock photo that shows another practice.
 */
export function ClassThumbnail({ modality, className = '' }: { modality?: ModalityRow; className?: string }) {
  const slug = classOrder.find(s => classes[s].modalitySlugs.includes(modality?.slug ?? ''));
  const { rows } = useTable<MediaAssetRow>('media_assets', { where: { slot_key: `site.classes.${slug}` } });
  const asset = rows.find(a => a.status === 'ready' && a.kind === 'photo' && a.url);
  if (asset?.url) return <img className={`class-thumbnail ${className}`} src={asset.url} alt="" loading="lazy" />;
  const tone = slug ? classes[slug].tone : modality?.tone ?? 'river';
  const cls = slug ? classes[slug].name : modality?.name_es ?? '';
  const name = typeof cls === 'string' ? cls : cls.es;
  return <span className={`class-thumbnail class-thumbnail-tile ${className}`} data-tone={tone} aria-hidden="true">{name.charAt(0)}</span>;
}
