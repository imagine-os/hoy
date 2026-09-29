import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { pendingSuffix, useContact } from '../../admin/settings';
import { useSession } from '../../../auth/SessionProvider';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Avatar } from '../../../components/atom/Avatar/Avatar';
import { Badge } from '../../../components/atom/Badge/Badge';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useEntitlements, useMyProfile } from '../hooks';
import { policy } from '../policy';
import { PageHead } from '../ui';
import { waLink } from '../../../i18n/format';
import { Icon } from '../../../components/atom/Icon/Icon';

/** C-25 More — profile, rules, contact and everything one level down. */
export function MorePage() {
  const { t, bi, lang } = useI18n();
  const contact = useContact();
  const nav = useNavigate();
  const { user, devMode, switchUser } = useSession();
  const { profile } = useMyProfile();
  const ent = useEntitlements();
  const name = profile?.full_name ?? user.name;
  const planLine = ent.plan ? bi({ es: ent.plan.name_es, en: ent.plan.name_en }) : t('customer.profile.noPlan');

  return (
    <div className="container page cust-page">
      <PageHead title={t('core.nav.more')} />
      <div className="stack">
        <Card interactive onClick={() => nav('/app/profile')} className="row" padding="md">
          <Avatar name={name} initials={profile?.initials ?? user.initials} src={profile?.photo_url} size={52} />
          <div className="grow stack-sm">
            <strong>{name}</strong>
            <div className="row wrap small muted">{planLine}{ent.membership?.status !== 'active' && <span>· {t('customer.checkout.credit.sub', { n: ent.creditBalance })}</span>}{!ent.membership && <Badge tone="highlight">{t('customer.more.planPrompt')}</Badge>}</div>
          </div>
          <span className="listrow-chevron" aria-hidden><Icon name="chevron-right" size="sm" /></span>
        </Card>

        <ListGroup>
          <ListRow icon="profile" title={t('core.nav.profile')} subtitle={`${t('customer.profile.edit')} · ${t('customer.membership.title')}`} to="/app/profile" />
          <ListRow icon="flame" title={t('customer.practice.title')} subtitle={t('customer.practice.more.sub')} to="/app/practice" />
          <ListRow icon="ticket" title={t('core.nav.plans')} subtitle={t('customer.more.plans.sub')} to="/app/plans" />
          <ListRow icon="policies" title={t('customer.rules.title')} subtitle={t('customer.more.rules.sub')} to="/app/rules" />
          <ListRow icon="whatsapp" title={t('customer.more.whatsapp')} subtitle={`${contact.whatsapp}${pendingSuffix(contact, 'whatsapp', lang)} · ${bi(policy.replyWindow)}`} href={waLink(contact.whatsapp, t('customer.more.whatsapp.text', { name: name.split(' ')[0] }))} />
          <ListRow icon="mail" title={t('customer.more.email')} subtitle={`${contact.email}${pendingSuffix(contact, 'email', lang)}`} href={`mailto:${contact.email}`} />
          <ListRow icon="map-pin" title={t('customer.more.visit')} subtitle={`${contact.address}, ${contact.city}${pendingSuffix(contact, 'address', lang)}`} href={contact.location.link ?? `https://www.google.com/maps/search/?api=1&query=${contact.location.lat},${contact.location.lng}`} />
        </ListGroup>

        <ListGroup>
          <ListRow icon="invite" title={t('customer.invite.title')} to="/app/invite" />
          <ListRow icon="gift" title={t('customer.gift.title')} to="/app/gift" />
          <ListRow icon="sparkle" title={t('customer.events.title')} to="/app/events" />
          <ListRow icon="users" title={t('customer.teachers.title')} to="/app/teachers" />
          <ListRow icon="help" title={t('customer.faq.title')} to="/app/faq" />
          <ListRow icon="credit-card" title={t('customer.pay.title')} to="/app/payment-methods" />
          <ListRow icon="bell" title={t('customer.notifications.title')} to="/app/notifications" />
          <ListRow icon="user-cog" title={t('customer.account.title')} subtitle={t('customer.account.sub')} to="/app/account" />
        </ListGroup>

        {devMode && (
          <ListGroup title={t('customer.more.states')}>
            <ListRow title="E-01 · " to="/app/state/empty" subtitle={t('customer.empty.title')} />
            <ListRow title="E-02" to="/app/state/declined" subtitle={t('customer.declined.title')} />
            <ListRow title="E-03" to="/app/state/cancelled" subtitle={t('customer.cancelled.title')} />
            <ListRow title="A-01 → A-03 · C-21 · E-04" to="/auth" subtitle={t('customer.more.authFlow')} />
          </ListGroup>
        )}

        <ListGroup>
          <ListRow icon="log-out" title={t('customer.profile.signOut')} onClick={() => { switchUser('public'); nav('/auth/sign-in'); }} />
        </ListGroup>
        <p className="xs muted" style={{ textAlign: 'center' }}>{tenant.legalName} · {tenant.city} · {bi(tenant.hours)}</p>
      </div>
    </div>
  );
}
