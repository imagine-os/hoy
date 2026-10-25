import {useI18n} from '../../../i18n/I18nProvider';
import {Notice} from '../../molecule/Notice/Notice';
import {Button} from '../../atom/Button/Button';
import {EmailPreview} from '../EmailPreview/EmailPreview';
import type {RecipientPreviewState} from '../../../modules/voucher-gifts/useRecipientPreview';

/** Read-only approval-result copy. The protected recipient need not have an account or known language. */
export function VoucherRecipientPreview({result,onRetry}:{result:RecipientPreviewState;onRetry?:()=>void}){
  const {t,bi}=useI18n();
  if(result.status==='cancelled')return null;
  const preview=result.status==='ready'?result.preview:null;
  return <section className="stack-sm" style={{overflowWrap:'anywhere',minWidth:0}} data-voucher-recipient-preview data-status={result.status}
    data-payment-id={preview?.paymentId} data-purchase-id={preview?.purchaseId} data-voucher-id={preview?.voucherId} data-approval-request-id={preview?.approvalRequestId}
    data-template-kind={preview?.contract.kind} data-template-key={preview?.contract.key} data-template-revision={preview?.contract.revision}>
    <Notice title={t('giftRecipient.title')}>{t('giftRecipient.boundary')}</Notice>
    {result.status==='loading'?<p role="status">{t('giftRecipient.loading')}</p>:preview?<>
      <p className="small"><strong>{t('giftRecipient.to')}</strong>{' '}<span data-voucher-recipient-email>{preview.recipient.email}</span>{' · '}<span data-voucher-recipient-name>{preview.recipient.name}</span></p>
      <p className="xs muted">{t('giftRecipient.contract')}</p>
      <p className="xs muted">{t('giftRecipient.language')}</p>
      <EmailPreview subject={t('giftRecipient.email')} body="" footer={t('giftRecipient.boundary')} previewContent={<div className="stack-sm">
        <p data-voucher-recipient-subject><strong>{bi(preview.copy.subject)}</strong></p>
        <div data-voucher-recipient-body>{bi(preview.copy.body).split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p className="emailpreview-p" key={index}>{paragraph}</p>)}</div>
        <a className="emailpreview-cta" data-voucher-recipient-link href={'#'+preview.route} onClick={event=>event.preventDefault()}>{bi(preview.copy.ctaLabel)}</a>
        <p className="xs muted mono">{'#'+preview.route}</p>
        <p className="xs muted">{t('giftRecipient.link')}</p>
      </div>}/>
    </>:<Notice tone={result.status==='error'?'danger':'warn'} action={onRetry?<Button variant="secondary" onClick={onRetry}>{t('giftRecipient.retry')}</Button>:undefined}>{t(result.status==='error'?'giftRecipient.error':'giftRecipient.unavailable')}</Notice>}
  </section>;
}
