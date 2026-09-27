import { useTable } from '../../../data/DataContext';
import type { MediaAssetRow, ModalityRow } from '../../../data/schema';
import { classes, classOrder } from '../../../tenant/brand';
import { siteImage } from '../../../modules/website/artwork';
export function ClassThumbnail({ modality, className = '' }: { modality?: ModalityRow; className?: string }) {
  const slug = classOrder.find(s => classes[s].modalitySlugs.includes(modality?.slug ?? ''));
  const { rows } = useTable<MediaAssetRow>('media_assets', { where: { slot_key: `site.classes.${slug}` } });
  const asset = rows.find(a => a.status === 'ready' && a.kind === 'photo' && a.url);
  return <img className={`class-thumbnail ${className}`} src={asset?.url || siteImage(slug ?? 'practice-flow')} alt="" loading="lazy" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = siteImage('practice-flow'); }} />;
}
