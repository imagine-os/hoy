import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { PageHead, SiteShell } from '../SiteShell';

export function ContactPage() {
  const { t, bi } = useI18n();
  const items = [
    [t('site.contact.whatsapp'), tenant.contact.whatsapp, `https://wa.me/${tenant.contact.whatsapp.replace(/\D/g, '')}`],
    [t('site.contact.email'), tenant.contact.email, `mailto:${tenant.contact.email}`],
    [t('site.contact.address'), tenant.contact.address, undefined],
    [t('site.contact.hours'), bi(tenant.hours), undefined],
  ] as const;
  return (
    <SiteShell>
      <PageHead title={t('site.contact.title')} body={t('site.contact.body')} />
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="grid grid-2">
          {items.map(([label, value, href]) => <Card key={label} eyebrow={label}>{href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : <span>{value}</span>}</Card>)}
        </div>
        <div className="mvcard mvcard-fluye" style={{ marginTop: 24, minHeight: 240, alignItems: 'center', justifyContent: 'center' }}><span className="muted small">{tenant.city} · {bi({ es: 'mapa pendiente', en: 'map pending' })}</span></div>
      </section>
    </SiteShell>
  );
}
