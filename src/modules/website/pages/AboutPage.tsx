import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { PageHead, SiteShell } from '../SiteShell';

export function AboutPage() {
  const { t } = useI18n();
  return (
    <SiteShell>
      <PageHead title={t('site.about.title')} />
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="grid grid-2">
          <div className="stack prose"><p className="site-lead">{t('site.about.p1')}</p><p>{t('site.about.p2')}</p><p className="eyebrow">{t('site.about.values')}</p></div>
          <Card padding="none" style={{ overflow: 'hidden' }}><img src={tenant.brand.lockup.sand} alt={`${tenant.name} lockup`} style={{ width: '100%' }} /></Card>
        </div>
      </section>
    </SiteShell>
  );
}
