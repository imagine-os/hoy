import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useSession } from './SessionProvider';
import { ROLE_HOME, ROLE_LABEL } from './roles';
import { RegisterForm } from '../modules/identity/pages';
import { Card } from '../components/molecule/Card/Card';
import { Notice } from '../components/molecule/Notice/Notice';

/**
 * Lane Y2 (test-hoy fixes, owner 2026-11-01): a studio login that isn't a customer yet, on a customer page (a purchase,
 * a booking, the customer home). The studio's sign-up form, starting from the login's name; Company OS adds the
 * Customer role and the member facet to the same login and person (`POST /t/:t/signup`, ADR 0038 amendment
 * 2026-11-01). On success the session re-reads `/me` and the page the person was going to opens as a customer.
 * Production only (Clerk session); RequireRole loads it lazily.
 */
export default function JoinAsCustomer() {
  const { t, bi } = useI18n();
  const { user, role } = useSession();
  return (
    <div className="container page identity-narrow stack" data-join-customer>
      <Card padding="lg" className="stack">
        <h1 className="cust-title">{t('identity.join.title')}</h1>
        <Notice tone="info">{t('identity.join.body', { role: bi(ROLE_LABEL[role]) })}</Notice>
      </Card>
      <RegisterForm initialName={user.name && user.name !== user.email ? user.name : ''} cta={t('identity.join.cta')} />
      <p className="small"><Link to={ROLE_HOME[role]}>{t('identity.join.back')}</Link></p>
    </div>
  );
}
