import type { PaymentRow } from '../../../data/schema';
import { readLaunchReceipt } from '../../../data/launchReceipts';
import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../molecule/Card/Card';
import { Notice } from '../../molecule/Notice/Notice';
import { Receipt } from '../Receipt/Receipt';
import { EmailPreview } from '../EmailPreview/EmailPreview';
import { PRODUCTION_BUILD } from '../../../config/launch';

/** Saved local payment facts and unsent email copy; never queries live contact or sends anything. */
export function LaunchPaymentReceipt({ payment, customer, historicalReference }: { payment: PaymentRow; customer: string; historicalReference?: string }) {
  const { t, bi } = useI18n();
  const receipt = readLaunchReceipt(payment);
  if (!receipt) return <Card className="stack-sm"><Notice>{t(payment.status === 'approved' ? 'launchReceipt.unknown' : 'launchReceipt.pending')}</Notice>{historicalReference && <p className="small" style={{ overflowWrap: 'anywhere' }}>{t('launchReceipt.legacy')}: {historicalReference}</p>}</Card>;
  const facts = receipt.facts, tax = receipt.recordedTax, preview = receipt.emailPreview;
  const methodKey = `customer.pay.method.${facts.method}`;
  const recorder = receipt.recordedBySnapshot;
  const takenBy = typeof facts.recordedBy !== 'string' || !facts.recordedBy.trim() ? undefined
    : recorder?.name?.trim() ? t('launchReceipt.recorder.named', { name: recorder.name })
    : t(recorder === undefined ? 'launchReceipt.recorder.legacy' : 'launchReceipt.recorder.unknown');
  return <section className="stack-sm" data-launch-receipt={receipt.reference} style={{ overflowWrap: 'anywhere', minWidth: 0 }}>
    <Receipt documentMode="payment-preview" studio={tenant.legalName} number={receipt.reference} issuedAt={facts.confirmedAt!} customer={preview?.recipient.name?.trim() ? preview.recipient.name : customer}
      lines={[{ label: receipt.item ? bi(receipt.item) : t('launchReceipt.item'), amount: facts.amountCharged }]}
      subtotal={tax?.subtotal ?? facts.amountCharged} tax={tax?.tax ?? 0} taxLabel={t('launchReceipt.tax')} showTaxBreakdown={!!tax}
      total={facts.amountCharged} amountReceived={facts.amountReceived!} method={t(methodKey)} status={t('launchReceipt.approved')} takenBy={takenBy} note={t('launchReceipt.mock')} printLabel={t('launchReceipt.print')} />
    {/* The unsent demo email preview is review-build only: production sends the real receipt email through comms (H-9). */}
    {!PRODUCTION_BUILD && <section className="stack-sm" data-receipt-email={preview?.recipient.availability ?? 'not-recorded'} aria-label={t('launchReceipt.email')}>
      {preview ? <>
        <Notice title={t('launchReceipt.email.unsent')}>{t('launchReceipt.email.boundary')}</Notice>
        {preview.recipient.availability === 'available'
          ? <p className="small" data-receipt-email-recipient><strong>{t('launchReceipt.email.recipient')}</strong>{' '}{preview.recipient.email}</p>
          : <Notice tone="warn" title={t('launchReceipt.email.unavailable')}>{t(`launchReceipt.email.reason.${preview.recipient.reason}`)}</Notice>}
        <EmailPreview subject={t('launchReceipt.email.header')} body="" footer={t('launchReceipt.email.unsent')}
          previewContent={<div className="stack-sm"><p className="small" data-receipt-email-subject><strong>{t('launchReceipt.email.savedSubject')}</strong>{' '}{bi(preview.subject)}</p>
            <div data-receipt-email-body>{bi(preview.body).split(/\n\s*\n/).filter(paragraph => paragraph.trim()).map((paragraph, index) => <p key={index} className="emailpreview-p">{paragraph}</p>)}</div></div>} />
      </> : <Notice>{t('launchReceipt.email.legacy')}</Notice>}
    </section>}
  </section>;
}
