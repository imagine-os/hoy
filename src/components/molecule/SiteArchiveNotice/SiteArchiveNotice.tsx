import { useI18n } from '../../../i18n/I18nProvider';
export function SiteArchiveNotice({ onLatest }: { onLatest: () => void }) {
  const { t } = useI18n();
  return <aside className="site-archive-notice" aria-label={t('site.archive.label')}><div className="container"><div><strong>{t('site.archive.label')}</strong><p>{t('site.archive.notice')}</p></div><button className="btn btn-secondary" onClick={onLatest}>{t('site.archive.latest')}</button></div></aside>;
}
