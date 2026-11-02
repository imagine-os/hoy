import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { retryConsent, useConsentDeferred } from '../../auth/signupStatus';
import { Notice } from '../../components/molecule/Notice/Notice';
import { Button } from '../../components/atom/Button/Button';

/**
 * Decision C-01d (owner 2026-11-02): after "Continue for now" on the consent step, the person keeps their bookings,
 * balance and account, but new bookings and purchases wait until the consent is recorded. True while that is so for the
 * signed-in login (this tab's session). Display only: Company OS does not refuse them yet (tech-debt #74).
 */
export function useConsentHeld(): boolean {
  const { user, signedIn } = useSession();
  const deferred = useConsentDeferred(user.id);
  return signedIn && deferred;
}

/**
 * The notice every new booking or purchase entry shows while the consent is held (checkout, the website's Book button,
 * gift purchase, Plans): "record your consent to book", with Retry. Retry forgets the deferral, so the page's guard runs
 * the consent step again (`RequireRole`); on a page outside the customer area (the website) `target` is where Retry goes,
 * whose guard does the same. Nothing while the consent isn't held.
 */
export function ConsentHoldNotice({ target }: { target?: string }) {
  const { t } = useI18n();
  const { user } = useSession();
  const nav = useNavigate();
  const held = useConsentHeld();
  if (!held) return null;
  const retry = () => { retryConsent(user.id); if (target) nav(target); };
  return (
    <div data-consent-hold>
      <Notice tone="warn" title={t('identity.hold.title')}
        action={<Button size="sm" variant="secondary" data-consent-retry onClick={retry}>{t('identity.hold.retry')}</Button>}>
        {t('identity.hold.body')}
      </Notice>
    </div>
  );
}
