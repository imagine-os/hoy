import {useI18n} from '../../../i18n/I18nProvider';
import {formatCOP} from '../../../i18n/format';
import {Notice} from '../../molecule/Notice/Notice';
import {Button} from '../../atom/Button/Button';
import {EmailPreview} from '../EmailPreview/EmailPreview';
import type {PendingRequestPreviewState} from '../../../modules/customer/usePendingRequestPreview';

/** Plain React text preserves saved product/account facts without interpreting template variables. */
export function PendingRequestPreview({result,onRetry}:{result:PendingRequestPreviewState;onRetry?:()=>void}){
  const {t,bi,lang}=useI18n();
  if(result.status==='cancelled')return null;
  const preview=result.status==='ready'?result.preview:null;
  return <section className="stack-sm" style={{overflowWrap:'anywhere',minWidth:0}} data-pending-request-preview data-status={result.status}
    data-payment-id={preview?.paymentId} data-kind={preview?.kind} data-receipt-id={preview?.receiptId} data-audit-id={preview?.auditId}
    data-template-kind={preview?.contract.kind} data-template-key={preview?.contract.key} data-template-revision={preview?.contract.revision}>
    <Notice title={t('pendingPreview.title')}>{t('pendingPreview.boundary')}</Notice>
    {result.status==='loading'?<p role="status">{t('pendingPreview.loading')}</p>:preview?<>
      <p className="small"><strong>{t('pendingPreview.to')}</strong>{' '}<span data-pending-request-email>{preview.recipient.email}</span>{' · '}<span data-pending-request-name>{preview.recipient.name}</span></p>
      <p className="xs muted">{t('pendingPreview.contract')}</p>
      <EmailPreview subject={t('pendingPreview.subject')} body="" footer={t('pendingPreview.boundary')} previewContent={<div className="stack-sm">
        <p><span data-pending-request-product>{bi(preview.product)}</span>{' · '}<span data-pending-request-amount>{formatCOP(preview.amount,lang)}</span></p>
        <div data-pending-request-body className="stack-sm">
          <p>{t('pendingPreview.record',{product:bi(preview.product),amount:formatCOP(preview.amount,lang)})}</p>
          <p>{t(preview.method==='cash'?'pendingPreview.cash':'pendingPreview.transfer')}</p>
          <p>{t('pendingPreview.noHold')}</p><p>{t('pendingPreview.noGrant')}</p>
        </div>
        <a className="emailpreview-cta" data-pending-request-link href={'#'+preview.route} onClick={event=>event.preventDefault()}>{t('pendingPreview.history')}</a>
        <p className="xs muted">{t('pendingPreview.link')}</p>
      </div>}/>
    </>:<Notice tone={result.status==='error'?'danger':'warn'} action={onRetry?<Button variant="secondary" data-pending-request-retry onClick={onRetry}>{t('pendingPreview.retry')}</Button>:undefined}>{t(result.status==='error'?'pendingPreview.error':'pendingPreview.unavailable')}</Notice>}
  </section>;
}
