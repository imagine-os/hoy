import { useState } from 'react';
import { useSession } from '../../../auth/sessionContext';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { CosError } from './cos';
import { useAction, useCos } from './useCos';
import { canVoidPayment, voidOps, voidPayment, voidRefusalLine } from './voidPayment';

/** Whether this session may void a payment of that status. Shapes the screens only: Company OS's policies decide. */
export function useVoidAccess(): (status: unknown) => boolean {
  const { meSuperAdmin } = useSession();
  const connected = useCos() !== null;
  return (status) => canVoidPayment({ superAdmin: meSuperAdmin === true, connected, status });
}

/**
 * The reason form. Mount it with `key={paymentId}`, outside any list that reloads: each payment is its own action (its
 * own idempotency key), and a reload must not lose what was typed.
 */
export function VoidPaymentDrawer({ paymentId, onClose, onDone }: { paymentId: string; onClose: () => void; onDone?: () => void }) {
  const { t, lang } = useI18n();
  const cos = useCos();
  const action = useAction();
  const [reason, setReason] = useState('');
  const submit = () => action.run(async (key) => {
    if (!cos) throw new CosError('disconnected');
    voidOps(paymentId, reason);
    await voidPayment(cos, paymentId, reason, key);
    onDone?.();
    onClose();
  });
  return <Drawer open onClose={() => { if (!action.busy) onClose(); }} title={t('payLaunch.void.title')} side="right">
    <div className="stack">
      <Notice tone="warn">{t('payLaunch.void.explain')}</Notice>
      <Field label={t('payLaunch.void.reason')} required>{(id) => <Input id={id} name="void-reason" maxLength={500} value={reason} disabled={action.busy || action.uncertain} onChange={(e) => { setReason(e.target.value); action.renew(); }} />}</Field>
      {action.uncertain ? <Notice tone="warn">{t('payLaunch.uncertain')}</Notice> : action.error && <p role="alert">{voidRefusalLine(action.error, lang, t)}</p>}
      <div className="row wrap">
        <Button variant="danger" data-void-confirm disabled={action.busy} loading={action.busy} onClick={() => void submit()}>{t('payLaunch.void.action')}</Button>
        <Button variant="secondary" data-void-back disabled={action.busy} onClick={onClose}>{t('payLaunch.void.back')}</Button>
      </div>
    </div>
  </Drawer>;
}

/** The button that opens the form, for a list row: the row checks `useVoidAccess`. */
export function VoidPaymentButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return <Button size="sm" variant="danger" data-void-payment onClick={onClick}>{t('payLaunch.void.action')}</Button>;
}

/** Button and form together, for a screen about one payment (the staff receipt). */
export function VoidPaymentAction({ paymentId, status, onDone }: { paymentId: string; status: unknown; onDone?: () => void }) {
  const canVoid = useVoidAccess();
  const [open, setOpen] = useState(false);
  if (!canVoid(status)) return null;
  return <>
    <div className="row"><VoidPaymentButton onClick={() => setOpen(true)} /></div>
    {open && <VoidPaymentDrawer key={paymentId} paymentId={paymentId} onClose={() => setOpen(false)} onDone={onDone} />}
  </>;
}
