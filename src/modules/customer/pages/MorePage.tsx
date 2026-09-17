import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useContact } from '../../admin/settings';
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

/** C-25 More — profile, rules, contact and everything one level down. */
export function MorePage() {
  const { t, bi } = useI18n();
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
          <span className="listrow-chevron" aria-hidden>›</span>
        </Card>

        <ListGroup>
          <ListRow icon="◯" title={t('core.nav.profile')} subtitle={`${t('customer.profile.edit')} · ${t('customer.membership.title')}`} to="/app/profile" />
          <ListRow icon="◇" title={t('core.nav.plans')} subtitle={t('customer.more.plans.sub')} to="/app/plans" />
          <ListRow icon="▧" title={t('customer.rules.title')} subtitle={t('customer.more.rules.sub')} to="/app/rules" />
          <ListRow icon="◎" title={t('customer.more.whatsapp')} subtitle={`${contact.whatsapp} · ${bi(policy.replyWindow)}`} href={waLink(contact.whatsapp, t('customer.more.whatsapp.text', { name: name.split(' ')[0] }))} />
          <ListRow icon="✉" title={t('customer.more.email')} subtitle={contact.email} href={`mailto:${contact.email}`} />
        </ListGroup>

        <ListGroup>
          <ListRow icon="✉" title={t('customer.invite.title')} to="/app/invite" />
          <ListRow icon="▣" title={t('customer.gift.title')} to="/app/gift" />
          <ListRow icon="✦" title={t('customer.events.title')} to="/app/events" />
          <ListRow icon="☺" title={t('customer.teachers.title')} to="/app/teachers" />
          <ListRow icon="?" title={t('customer.faq.title')} to="/app/faq" />
          <ListRow icon="▭" title={t('customer.pay.title')} to="/app/payment-methods" />
          <ListRow icon="◉" title={t('customer.notifications.title')} to="/app/notifications" />
          <ListRow icon="▣" title={t('customer.account.title')} subtitle={t('customer.account.sub')} to="/app/account" />
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
          <ListRow icon="⏻" title={t('customer.profile.signOut')} onClick={() => { switchUser('public'); nav('/auth/sign-in'); }} />
        </ListGroup>
        <p className="xs muted" style={{ textAlign: 'center' }}>{tenant.legalName} · {tenant.city} · {bi(tenant.hours)}</p>
      </div>
    </div>
  );
}
