import { Fragment, useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Field } from '../../../components/molecule/Field/Field';
import { Input } from '../../../components/atom/Input/Input';
import { MapSlot } from '../../../components/molecule/MapSlot/MapSlot';
import { PageHead, SiteShell, waHref } from '../SiteShell';
import { siteSpecs } from '../specs';

/** W-06 — contact details from the tenant config, the studio map, and a WhatsApp form with no backend. */
export function ContactPage() {
  const { t, bi } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.contact);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });

  const send = () => {
    const text = t('site.contact.fTemplate', { name: form.name || '—', phone: form.phone || '—', message: form.message });
    window.open(waHref(text), '_blank', 'noreferrer');
  };

  const cards = [
    [t('site.contact.whatsapp'), tenant.contact.whatsapp, waHref(), true],
    [t('site.contact.email'), tenant.contact.email, `mailto:${tenant.contact.email}`, true],
    [t('site.contact.instagram'), tenant.social.instagram, tenant.social.instagramUrl, true],
    [t('site.contact.address'), tenant.contact.address, undefined, true],
    [t('site.contact.hours'), bi(tenant.hours), undefined, false],
  ] as const;

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.contact.title')} body={t('site.contact.body')} />,
    ContactCards: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="grid grid-3">
          {cards.map(([label, value, href, isPending]) => (
            <Card key={label} eyebrow={label}>
              {href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : <span>{value}</span>}
              {isPending && tenant.contact.pending && <p className="xs muted" style={{ marginTop: 6 }}>{t('site.contact.pending')}</p>}
            </Card>
          ))}
        </div>
        <div className="row wrap" style={{ marginTop: 16 }}>
          <a href={waHref(bi({ es: 'Hola HOY, quiero información.', en: 'Hi HOY, I would like some information.' }))} target="_blank" rel="noreferrer">
            <Button size="lg">{t('site.contact.waCta')}</Button>
          </a>
        </div>
      </section>
    ),
    Map: () => (
      <section className="container site-section">
        <div className="site-media-cap">
          <MapSlot heading={t('site.contact.map')} openLabel={t('site.contact.mapOpen')} ratio="4:3" />
        </div>
      </section>
    ),
    Form: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.contact.form')}>
          <p className="small muted" style={{ marginBottom: 16 }}>{t('site.contact.formBody')}</p>
          <div className="site-form">
            <Field label={t('site.contact.fName')}>
              {(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />}
            </Field>
            <Field label={t('site.contact.fPhone')}>
              {(id) => <Input id={id} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="+57 3xx xxx xxxx" />}
            </Field>
            <div className="site-form-full">
              <Field label={t('site.contact.fMessage')}>
                {(id) => <textarea id={id} className="input" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t('site.contact.fMessagePh')} />}
              </Field>
            </div>
            <div className="site-form-full">
              <Button size="lg" onClick={send} disabled={!form.message.trim()}>{t('site.contact.fSend')}</Button>
            </div>
          </div>
        </Card>
      </section>
    ),
  };

  return (
    <SiteShell>
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </SiteShell>
  );
}
