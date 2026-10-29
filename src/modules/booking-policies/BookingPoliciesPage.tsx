import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { Button } from '../../components/atom/Button/Button';
import { Input } from '../../components/atom/Input/Input';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { Field } from '../../components/molecule/Field/Field';
import { Notice } from '../../components/molecule/Notice/Notice';
import { CosError, refusalKey, type CosPort } from '../transfers/launch/cos';
import { useAction, useCos, useLoad } from '../transfers/launch/useCos';
import { fromSettings, settingsPatch, validatePolicies, type BookingPolicies } from './policies';

type SettingsAnswer = { settings: Record<string, unknown> };
const readPolicies = async (cos: CosPort) => fromSettings((await cos.request<SettingsAnswer>('GET', '/modules/bookings/settings')).settings);
type NumberKey = 'hold_minutes_transfer' | 'hold_minutes_desk' | 'reschedule_hours' | 'late_cancel_hours';

/** AD-04: hold minutes, the move window and the late-cancel window, on Company OS (ADR 0038). Reception hours: H-7. */
export function BookingPoliciesPage() {
  const { t } = useI18n();
  const { isSuperAdmin } = useSession();
  const cos = useCos();
  const { state, reload } = useLoad(readPolicies, []);
  const [draft, setDraft] = useState<BookingPolicies | null>(null);
  const [problem, setProblem] = useState<string | null>(null), [saved, setSaved] = useState(false);
  const action = useAction();
  const base = state.status === 'ready' ? state.value : null;
  useEffect(() => { if (base) setDraft(base); }, [base]);

  // Company OS lets only the tenant Super Admin edit module settings (ADR 0038); Hoy's Administration staff hold that role.
  if (!isSuperAdmin) return <Notice tone="warn">{t('bookingPolicies.superAdminOnly')}</Notice>;
  if (state.status === 'loading' || (base && !draft)) return <EmptyState tone="loading" title={t('payLaunch.loading')} />;
  if (state.status === 'error') return <EmptyState tone="error" title={t(refusalKey(state.code), { code: state.code })} action={<Button onClick={reload}>{t('payLaunch.retry')}</Button>} />;
  if (!draft || !base) return null;

  const num = (k: NumberKey) => (id: string) =>
    <Input id={id} name={k} type="number" min={0} step={1} value={draft[k]} disabled={action.busy} onChange={(e) => { setDraft({ ...draft, [k]: Number(e.target.value) }); setSaved(false); setProblem(null); }} />;

  const save = () => action.run(async () => {
    if (!cos) throw new CosError('disconnected');
    const p = validatePolicies(draft);
    if (p) { setProblem(p); return; }
    const patch = settingsPatch(base, draft);
    if (Object.keys(patch).length) await cos.request('PATCH', '/modules/bookings/settings', { settings: patch });
    setSaved(true); reload();
  });

  return <div className="stack">
    <h1>{t('bookingPolicies.title')}</h1>
    <Notice>{t('bookingPolicies.futureOnly')}</Notice>
    {!base.policy_as_of_booking && <Notice tone="warn">{t('bookingPolicies.copiesOff')}</Notice>}
    <form className="stack" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
      <div className="grid grid-2" data-testid="booking-policies">
        <Field label={t('bookingPolicies.transfer')} required>{num('hold_minutes_transfer')}</Field>
        <Field label={t('bookingPolicies.desk')} required>{num('hold_minutes_desk')}</Field>
        <Field label={t('bookingPolicies.reschedule')} required>{num('reschedule_hours')}</Field>
        <Field label={t('bookingPolicies.lateCancel')} required>{num('late_cancel_hours')}</Field>
      </div>
      <p className="small muted">{t('bookingPolicies.hoursElsewhere')}</p>
      {problem && <p role="alert">{t(`bookingPolicies.error.${problem}`)}</p>}
      {action.error && <p role="alert">{t(refusalKey(action.error), { code: action.error })}</p>}
      {saved && <p role="status">{t('bookingPolicies.saved')}</p>}
      <Button type="submit" loading={action.busy}>{t('bookingPolicies.save')}</Button>
    </form>
  </div>;
}
