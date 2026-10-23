import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import type { PublicWhatsappTarget } from './whatsappTarget';

/** Public direct handoff, safe reception fallback, or a translated path to contact alternatives. */
export function PublicWhatsappLink({ target, children, className, testId }: {
  target: PublicWhatsappTarget; children?: ReactNode; className?: string; testId?: string;
}) {
  const { t } = useI18n();
  if (!target.href) return <span className="stack-sm" data-testid={testId} data-whatsapp-state="unavailable">
    <span className="small" role="status">{t('site.whatsapp.unavailable')}</span>
    <Link to="/site/contact" className="small">{t('site.whatsapp.contactOptions')}</Link>
  </span>;
  return <span className="stack-sm" data-whatsapp-state={target.fallback ? 'fallback' : 'direct'}>
    <a href={target.href} target="_blank" rel="noreferrer" className={className} data-testid={testId}>{children}</a>
    {target.fallback && <span className="xs muted" role="status">{t('site.whatsapp.fallback')}</span>}
  </span>;
}
