import { Fragment, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useData } from '../../../data/DataContext';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { useSettings } from '../../admin/settings';
import type { DeletionRequestRow } from '../../../data/schema';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Field } from '../../../components/molecule/Field/Field';
import { Input } from '../../../components/atom/Input/Input';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';
import { isPhone } from '../../../i18n/format';

/**
 * W-09 `/site/delete-account` — the public account-deletion request Google Play asks every app to
 * publish at a URL that needs no sign-in (Apple accepts the in-app path, C-26). No session: the row
 * lands in `deletion_requests` with `user_id` null; admin matches the email or WhatsApp in M-11.
 */
export function DeleteAccountPage() {
  const { t } = useI18n();
  const data = useData();
  const { settings } = useSettings();
  const { sections, isVisible } = useLayout(siteSpecs.deleteAccount);
  const [form, setForm] = useState({ email: '', phone: '', reason: '' });
  const [understood, setUnderstood] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<DeletionRequestRow | null>(null);

  const controller = settings.branding.displayName || tenant.legalName;
  const email = settings.profile.email || tenant.contact.email;

  const submit = async () => {
    const e: Record<string, string> = {};
    const hasEmail = /\S+@\S+\.\S+/.test(form.email.trim());
    const hasPhone = isPhone(form.phone);
    if (!hasEmail && !hasPhone) e.contact = t('site.delete.err.contact');
    if (form.email.trim() && !hasEmail) e.email = t('customer.form.email.err');
    if (form.phone.trim() && !hasPhone) e.phone = t('customer.form.phone');
    setErrors(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const row = await data.insert<DeletionRequestRow>('deletion_requests', { user_id: null, email: form.email.trim() || null, phone: form.phone.trim() || null, channel: 'website', status: 'requested', reason: form.reason.trim() || null, requested_at: new Date().toISOString(), resolved_at: null, resolved_by: null, checklist: null, note: null });
      // No signed-in actor: the audit row says so (actor null, role public) so M-07 lists it as the system.
      await data.insert('audit_log', { actor_id: null, action: 'account.deletion_request', entity: 'deletion_requests', entity_id: row.id, diff: { role: 'public', source: 'app', channel: 'website', after: 'requested' }, ip: null });
      setSent(row);
    } finally { setBusy(false); }
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.delete.title')} body={t('site.delete.body', { name: controller })} />,
    WhatHappens: () => (
      <section className="container site-section legal-body" style={{ paddingTop: 0 }}>
        <div className="grid grid-2">
          <Card eyebrow={t('site.delete.kept')} tone="muted">
            <ul className="small" style={{ margin: 0, paddingLeft: '1.2em' }}>
              <li>{t('site.delete.kept.invoices')}</li>
              <li>{t('site.delete.kept.waiver')}</li>
            </ul>
          </Card>
          <Card eyebrow={t('site.delete.removed')} tone="muted">
            <ul className="small" style={{ margin: 0, paddingLeft: '1.2em' }}>
              <li>{t('site.delete.removed.profile')}</li>
              <li>{t('site.delete.removed.access')}</li>
            </ul>
          </Card>
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>{t('site.delete.time', { email })} · <Link to="/site/legal/privacy">{t('site.legal.privacy')}</Link></p>
      </section>
    ),
    Form: () => (
      <section className="container site-section legal-body" style={{ paddingTop: 0 }}>
        {sent ? (
          <Notice tone="success" title={t('site.delete.sent.title')}>
            {t('site.delete.sent.body', { ref: sent.id.slice(-6).toUpperCase() })}
          </Notice>
        ) : (
          <Card eyebrow={t('site.delete.form')}>
            <p className="small muted" style={{ marginBottom: 16 }}>{t('site.delete.form.body')}</p>
            <div className="site-form">
              <Field label={t('customer.form.email')} error={errors.email}>
                {(id) => <Input id={id} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />}
              </Field>
              <Field label={t('customer.form.whatsapp')} error={errors.phone} hint={t('site.delete.oneOf')}>
                {(id) => <Input id={id} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder={`${tenant.dialCode} 3xx xxx xxxx`} />}
              </Field>
              <div className="site-form-full">
                <Field label={t('customer.account.delete.reason')}>
                  {(id) => <textarea id={id} className="input" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={t('customer.account.delete.reason.ph')} />}
                </Field>
              </div>
              <div className="site-form-full">
                <Toggle size="sm" checked={understood} onChange={setUnderstood} label={t('customer.account.delete.understood')} />
              </div>
              {errors.contact && <p className="field-msg field-error site-form-full" role="alert">{errors.contact}</p>}
              <div className="site-form-full row wrap">
                <Button variant="danger" disabled={!understood} loading={busy} onClick={submit}>{t('customer.account.delete.cta')}</Button>
                <Link to="/auth/sign-in" className="small">{t('site.delete.inApp')}</Link>
              </div>
            </div>
          </Card>
        )}
      </section>
    ),
  };

  return (
    <SiteShell>
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </SiteShell>
  );
}
