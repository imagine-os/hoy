import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import { formatDate } from '../../../i18n/format';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Avatar } from '../../../components/atom/Avatar/Avatar';
import { Input } from '../../../components/atom/Input/Input';
import { Toggle } from '../../../components/atom/Toggle/Toggle';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { LangToggle } from '../../../components/molecule/LangToggle/LangToggle';
import { Skeleton } from '../../../components/atom/Skeleton/Skeleton';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { canvasSpecs } from '../specs';
import { NOTIF_CHANNELS, useEntitlements, useMyProfile, useNotificationPrefs } from '../hooks';
import { PageHead } from '../ui';

const spec = canvasSpecs['C-19'];

/** C-19 Profile, settings & membership. */
export function ProfilePage() {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { user, switchUser } = useSession();
  const { sections, isVisible } = useLayout(spec);
  const { profile, account } = useMyProfile();
  const ent = useEntitlements();
  const prefs = useNotificationPrefs();
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', birthday: '', ec_name: '', ec_phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Language is per account: persist the real LangToggle's choice on users.locale (C-19 rule).
  useEffect(() => { if (account && account.locale !== lang) data.update('users', account.id, { locale: lang }); }, [lang, account, data]);

  const openEdit = () => { setForm({ full_name: profile?.full_name ?? user.name, phone: account?.phone ?? '+57 ', birthday: profile?.birthday ?? '', ec_name: profile?.emergency_contact?.name ?? '', ec_phone: profile?.emergency_contact?.phone ?? '+57 ' }); setErrors({}); setEdit(true); };
  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(null), 2500); };
  const save = async () => {
    const e: Record<string, string> = {};
    if (form.full_name.trim().length < 3) e.full_name = t('customer.form.required');
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = t('customer.form.phone');
    if (form.ec_name && form.ec_phone.replace(/\D/g, '').length < 10) e.ec_phone = t('customer.form.phone');
    setErrors(e); if (Object.keys(e).length) return;
    if (profile) await data.update('profiles', profile.id, { full_name: form.full_name.trim(), initials: form.full_name.trim().split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase(), birthday: form.birthday || null, emergency_contact: form.ec_name ? { name: form.ec_name.trim(), phone: form.ec_phone.trim() } : null });
    if (account) await data.update('users', account.id, { phone: form.phone.trim() });
    setEdit(false); flash(t('customer.profile.saved'));
  };
  const onPhoto = (file: File | undefined) => {
    if (!file || !profile) return;
    if (file.size > 1_500_000) { flash(t('customer.profile.photoTooBig')); return; }
    const reader = new FileReader();
    reader.onload = async () => { await data.update('profiles', profile.id, { photo_url: String(reader.result) }); flash(t('customer.profile.saved')); };
    reader.readAsDataURL(file);
  };
  const verifyWhatsapp = async () => { if (profile) { await data.update('profiles', profile.id, { whatsapp_verified: true }); flash(t('customer.profile.whatsapp.verified')); } };
  const signOut = () => { switchUser('public'); nav('/auth/sign-in'); };
  const deleteAccount = async () => { if (account) await data.update('users', account.id, { status: 'disabled' }); setDel(false); signOut(); };

  const name = profile?.full_name ?? user.name;

  const SECTIONS: Record<string, () => ReactNode> = {
    'Header (photo, name, membership badge)': () => (
      <Card className="row wrap" padding="lg">
        <label className="cust-photo">
          <Avatar name={name} initials={profile?.initials ?? user.initials} src={profile?.photo_url} size={72} />
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <span className="cust-photo-edit" aria-hidden>✎</span>
          <span className="sr-only">{t('customer.profile.changePhoto')}</span>
        </label>
        <div className="grow stack-sm">
          {profile ? <h1 className="cust-title" style={{ fontSize: 'var(--fs-xl)' }}>{name}</h1> : <Skeleton width={180} height={24} />}
          <div className="row wrap">
            {ent.membership && ent.plan ? <Badge tone={ent.membership.status === 'active' ? 'success' : 'warn'}>{bi({ es: ent.plan.name_es, en: ent.plan.name_en })}</Badge> : <Badge tone="neutral">{t('customer.profile.noPlan')}</Badge>}
            {profile && !profile.whatsapp_verified && <button type="button" className="cust-linkbtn" onClick={verifyWhatsapp}><Badge tone="warn">{t('customer.profile.whatsapp.verify')}</Badge></button>}
          </div>
          <span className="small muted">{account?.email ?? user.email}{account?.phone ? ` · ${account.phone}` : ''}</span>
        </div>
      </Card>
    ),
    EditProfile: () => <Button block variant="secondary" onClick={openEdit}>{t('customer.profile.edit')}</Button>,
    'MembershipRow → plan management': () => (
      <ListGroup title={t('customer.profile.account')}>
        <ListRow icon="◇" title={t('customer.membership.title')} subtitle={ent.membership ? t('customer.home.membership.active', { date: formatDate(ent.membership.renews_at ?? ent.membership.starts_at, lang) }) : t('customer.profile.noPlan')} to="/app/membership" trailing={ent.membership ? <Badge tone={ent.membership.status === 'active' ? 'success' : 'warn'}>{t(`customer.membership.status.${ent.membership.status}`)}</Badge> : undefined} />
        <ListRow icon="●" title={t('customer.credits.title')} subtitle={t('customer.checkout.credit.sub', { n: ent.creditBalance })} to="/app/credits" />
        <ListRow icon="▤" title={t('core.nav.history')} to="/app/history" />
      </ListGroup>
    ),
    PaymentMethods: () => <ListGroup><ListRow icon="▭" title={t('customer.pay.title')} subtitle={t('customer.profile.pay.sub')} to="/app/payment-methods" /></ListGroup>,
    'NotificationPrefs (push / email / WhatsApp)': () => (
      <ListGroup title={t('customer.profile.notifications')}>
        {NOTIF_CHANNELS.map((k) => <ListRow key={k} icon={k === 'whatsapp' ? '◎' : k === 'push' ? '◉' : '✉'} title={t(`customer.profile.notif.${k}`)} subtitle={t(`customer.profile.notif.${k}.sub`)} trailing={<Toggle size="sm" checked={prefs.channelOn(k)} onChange={(v) => { void prefs.setChannel(k, v); }} label="" />} />)}
        <ListRow icon="▣" title={t('customer.notifications.prefs.title')} subtitle={t('customer.notifications.prefs.byCategory')} to="/app/notifications" />
        <ListRow icon="▣" title={t('customer.notifications.title')} to="/app/notifications" />
      </ListGroup>
    ),
    'LanguageToggle (EN / ES)': () => <ListGroup><ListRow icon="◐" title={t('customer.profile.language')} subtitle={t('customer.profile.language.sub')} trailing={<LangToggle size="sm" />} /></ListGroup>,
    'LeaveAReview → Google / Instagram': () => (
      <ListGroup title={t('customer.profile.review')}>
        <ListRow icon="★" title={t('customer.profile.review.google')} href={`https://www.google.com/search?q=${encodeURIComponent(`${tenant.legalName} ${tenant.city}`)}`} />
        <ListRow icon="◌" title={t('customer.profile.review.instagram')} subtitle={tenant.contact.instagram} href={`https://instagram.com/${tenant.contact.instagram.replace('@', '')}`} />
      </ListGroup>
    ),
    'Legal links': () => (
      <ListGroup title={t('customer.profile.legal')}>
        <ListRow title={t('customer.profile.legal.terms')} to="/app/legal/terms" />
        <ListRow title={t('customer.profile.legal.privacy')} subtitle={t('customer.profile.legal.law')} to="/app/legal/privacy" />
        <ListRow title={t('customer.legal.kind.waiver')} subtitle={t('customer.legal.kind.house-rules')} to="/app/legal/waiver" />
        <ListRow title={t('customer.faq.title')} to="/app/faq" />
      </ListGroup>
    ),
    'SignOut / DeleteAccount': () => (
      <ListGroup>
        <ListRow icon="⏻" title={t('customer.profile.signOut')} onClick={signOut} />
        <ListRow icon="×" tone="danger" title={t('customer.profile.delete')} subtitle={t('customer.profile.delete.sub')} onClick={() => setDel(true)} />
      </ListGroup>
    ),
  };

  return (
    <div className="container page cust-page">
      <PageHead title={t('customer.profile.title')} />
      {saved && <Notice tone="success">{saved}</Notice>}
      <div className="stack">
        {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      </div>

      <Drawer open={edit} onClose={() => setEdit(false)} side="bottom" title={t('customer.profile.edit')} footer={<><Button variant="ghost" onClick={() => setEdit(false)}>{t('core.common.cancel')}</Button><Button onClick={save}>{t('core.common.save')}</Button></>}>
        <div className="stack">
          <Field label={t('customer.form.name')} required error={errors.full_name}>{(id) => <Input id={id} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoComplete="name" />}</Field>
          <Field label={t('customer.form.whatsapp')} required hint={t('customer.form.whatsapp.hint')} error={errors.phone}>{(id) => <Input id={id} value={form.phone} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />}</Field>
          <Field label={t('customer.form.birthday')} hint={t('customer.form.birthday.hint')}>{(id) => <Input id={id} type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />}</Field>
          <div className="eyebrow">{t('customer.form.emergency')}</div>
          <Field label={t('customer.form.name')}>{(id) => <Input id={id} value={form.ec_name} onChange={(e) => setForm({ ...form, ec_name: e.target.value })} />}</Field>
          <Field label={t('customer.form.phone')} error={errors.ec_phone}>{(id) => <Input id={id} value={form.ec_phone} inputMode="tel" onChange={(e) => setForm({ ...form, ec_phone: e.target.value })} />}</Field>
        </div>
      </Drawer>
      <Drawer open={del} onClose={() => setDel(false)} side="bottom" title={t('customer.profile.delete')}>
        <div className="stack">
          <Notice tone="warn" title={t('customer.profile.delete.confirm.title')}>{t('customer.profile.delete.confirm.body')}</Notice>
          <Button block variant="danger" onClick={deleteAccount}>{t('customer.profile.delete.cta')}</Button>
          <Button block variant="ghost" onClick={() => setDel(false)}>{t('core.common.cancel')}</Button>
          <p className="xs muted">{t('customer.profile.legal.law')} · <Link to="/site/legal/privacy">{t('customer.profile.legal.privacy')}</Link></p>
        </div>
      </Drawer>
    </div>
  );
}
