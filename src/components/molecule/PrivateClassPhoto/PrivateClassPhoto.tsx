import { useI18n } from '../../../i18n/I18nProvider';
import { editorialPhotoSlots } from '../../../data/studioPhotography';
import { studioPhoto } from '../../../modules/website/photography';
import './PrivateClassPhoto.css';

/** The supplied acroyoga composition stays complete; a published CMS photo still wins. */
export function PrivateClassPhoto({ src, alt, sizes = '(max-width: 700px) 50vw, 25vw' }: { src?: string; alt?: string; sizes?: string }) {
  const { bi } = useI18n();
  return <img className="private-class-photo" src={src || studioPhoto('private-acroyoga')}
    srcSet={src ? undefined : `${studioPhoto('private-acroyoga', 480)} 480w, ${studioPhoto('private-acroyoga')} 820w`}
    sizes={sizes} width={820} height={1318}
    alt={alt || bi(editorialPhotoSlots.find(slot => slot.key === 'site.plans.private')!.alt)}
    loading="lazy" decoding="async" />;
}
