import { Fragment, useState, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { useContact, useOpeningHours, useWhatsappLink, type ContactField } from '../../admin/settings';
import { overrideLine, upcomingOverrides } from '../../../tenant/hours';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Field } from '../../../components/molecule/Field/Field';
import { Input } from '../../../components/atom/Input/Input';
import { MapSlot } from '../../../components/molecule/MapSlot/MapSlot';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

/** W-06 — contact details from the tenant config, the studio map, and a WhatsApp form with no backend. */
export function ContactPage() {
  const { t, bi, lang } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.contact);
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const contact = useContact();
  // 0041: M-08a weekly hours + the M-08g exceptions of the next 30 days.
  const hours = useOpeningHours();
  const soon = upcomingOverrides(hours.overrides, hours.todayKey, 30).slice(0, 3);
  // 0047: the card, the CTA and the form are front desk handoffs; the Especiales card is `specials` (M-08a contacts).
  const wa = useWhatsappLink();
  const frontNote = wa.resolve('frontDesk').note;
  const specialsNote = wa.resolve('specials').note;

  const send = () => {
    const text = t('site.contact.fTemplate', { name: form.name || '—', phone: form.phone || '—', message: form.message });
    window.open(wa.link('frontDesk', text), '_blank', 'noreferrer');
  };

  const cards = [
    [t('site.contact.whatsapp'), contact.whatsapp, wa.link('frontDesk'), 'whatsapp'],
    [t('site.contact.email'), contact.email, `mailto:${contact.email}`, 'email'],
    [t('site.contact.instagram'), contact.instagram, contact.instagramUrl, 'instagram'],
    [t('site.contact.address'), `${contact.address} · ${contact.city}`, contact.location.link ?? undefined, 'address'],
    [t('site.contact.hours'), bi(hours.sentence), undefined, null],
  ] as const satisfies readonly (readonly [string, string, string | undefined, ContactField | null])[];

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.contact.title')} body={t('site.contact.body')} />,
    ContactCards: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="grid grid-3">
          {cards.map(([label, value, href, field]) => (
            <Card key={label} eyebrow={label}>
              {href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : <span>{value}</span>}
              {field && contact.pendingFields[field] && <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('site.contact.pending')}</p>}
              {label === t('site.contact.hours') && (
                <div className="stack-sm" style={{ marginTop: 'var(--sp-sm)' }}>
                  <p className="small" data-testid="contact-today">{bi(hours.today)}</p>
                  {soon.length > 0 && <ul className="xs muted" aria-label={t('site.contact.hoursSoon')}>{soon.map((o) => <li key={o.id}>{overrideLine(o, lang)}</li>)}</ul>}
                </div>
              )}
            </Card>
          ))}
        </div>
        <div className="stack-sm" style={{ marginTop: 'var(--sp-lg)' }}>
          <div className="row wrap">
            <a href={wa.link('frontDesk', t('site.contact.wa'))} target="_blank" rel="noreferrer">
              <Button size="lg">{t('site.contact.waCta')}</Button>
            </a>
          </div>
          {frontNote && <p className="xs muted">{bi(frontNote)}</p>}
        </div>
      </section>
    ),
    // Especiales (0017)
    Specials: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <Card eyebrow={t('site.contact.specials')} tone="muted" className="site-specials">
          <p className="small" style={{ maxWidth: '60ch' }}>{t('site.contact.specialsBody')}</p>
          <div className="stack-sm" style={{ marginTop: 'var(--sp-md)' }}>
            <div className="row wrap"><a href={wa.link('specials', t('site.plans.specials.wa'))} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary">{t('site.plans.specials.cta')}</Button></a></div>
            {specialsNote && <p className="xs muted">{bi(specialsNote)}</p>}
          </div>
        </Card>
      </section>
    ),
    Map: () => (
      <section className="container site-section">
        <div className="site-media-cap">
          <MapSlot heading={t('site.contact.map')} openLabel={t('site.contact.mapOpen')} ratio="4:3" slotKey="site.contact.map" />
        </div>
      </section>
    ),
    Form: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.contact.form')}>
          <p className="small muted" style={{ marginBottom: 'var(--sp-lg)' }}>{t('site.contact.formBody')}</p>
          <div className="site-form">
            <Field label={t('site.contact.fName')}>
              {(id) => <Input id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />}
            </Field>
            <Field label={t('site.contact.fPhone')}>
              {(id) => <Input id={id} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder={`${tenant.dialCode} 3xx xxx xxxx`} />}
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
