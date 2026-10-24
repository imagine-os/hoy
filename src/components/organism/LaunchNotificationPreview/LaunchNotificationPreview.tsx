import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../atom/Button/Button';
import { Notice } from '../../molecule/Notice/Notice';
import { EmailPreview } from '../EmailPreview/EmailPreview';
import { launchEventName, type LaunchPreviewResult } from '../../../modules/launch-notifications/contracts';
import './LaunchNotificationPreview.css';

export interface LaunchNotificationPreviewProps { result: LaunchPreviewResult; onRetry?: () => void }
/** Read-only presentation. Existing receipt/cancellation renderers and EmailPreview remain unchanged. */
export function LaunchNotificationPreview({ result, onRetry }: LaunchNotificationPreviewProps) {
  const { t, bi, lang } = useI18n();
  if (result.status === 'cancelled') return null;
  const payload = result.status === 'ready' ? result.payload : null;
  const event = payload?.event ?? (result as Exclude<LaunchPreviewResult, { status: 'ready' }>).event;
  return <section className="stack-sm" lang={lang} dir="ltr" data-launch-preview data-launch-event={event} data-launch-preview-status={result.status}
    data-launch-owner={payload?.ownerId ?? undefined} data-launch-source-id={payload?.sourceId}
    data-launch-template-kind={payload?.template.kind} data-launch-template-id={payload?.template.kind === 'saved' ? payload.template.id : undefined}
    data-launch-template-version={payload?.template.kind === 'saved' ? payload.template.version : undefined}
    data-launch-template-active={payload?.template.kind === 'saved' ? String(payload.template.active) : undefined}>
    <Notice title={bi(launchEventName(event))}>{t('launchNotifications.boundary')}</Notice>
    {result.status === 'loading' && <p role="status" aria-busy="true">{t('launchNotifications.loading')}</p>}
    {result.status === 'error' && <Notice tone="danger" action={onRetry ? <Button onClick={onRetry}>{t('core.common.retry')}</Button> : undefined}>{t('launchNotifications.error')}</Notice>}
    {result.status === 'unavailable' && <Notice tone="warn" title={t('launchNotifications.unavailable')} action={onRetry ? <Button onClick={onRetry}>{t('core.common.retry')}</Button> : undefined}>{t(`launchNotifications.reason.${result.reason}`)}</Notice>}
    {payload && <>
      {payload.recipient.kind === 'demo-only' ? <p className="small">{t('launchNotifications.demoRecipient')}</p> : <p className="small" data-launch-recipient><strong>{t('launchNotifications.recipient')}:</strong> {payload.recipient.email}{payload.recipient.locale && <> · {t('launchNotifications.recipientLocale')}: {payload.recipient.locale.toUpperCase()}</>}</p>}
      {payload.template.kind === 'saved' ? <Notice title={t('launchNotifications.saved', { version: payload.template.version })}>{t(payload.template.active ? 'launchNotifications.active' : 'launchNotifications.inactive')}</Notice> : <Notice>{t('launchNotifications.builtin', { revision: payload.template.contractRevision })}</Notice>}
      {payload.summary && <p className="small" data-launch-event-summary>{bi(payload.summary)}</p>}
      <EmailPreview subject={bi(payload.subject)} body="" footer={t('launchNotifications.boundary')}
        cta={payload.cta ? { label: bi(payload.cta.label), href: bi(payload.cta.href) } : undefined}
        previewContent={<div data-launch-email-content>{bi(payload.body).split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p className="emailpreview-p" key={index}>{paragraph}</p>)}</div>} />
    </>}
  </section>;
}
