import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../atom/Button/Button';
import { createActionKeys, errorCode, type CosRequest } from '../../../modules/staff/desk/wire';
import { deliveryErrorKey, testPayload, testRefusal, validTestRecipient, type TestConfig, type TestCopy, type TestSource } from '../../../notifications/templateTests';

/** Preview never sends; test sends use only the opt-in, authenticated backend. Mount it with a key of template id + version. */
export function EmailTestPanel({ request, source, draft, version, defaultRecipient = '', invalidDraft = false, onStale }: {
  request: CosRequest | null; source: TestSource; draft: TestCopy | null; version: number; defaultRecipient?: string;
  /** The editor's placeholder check on the draft: an invalid draft cannot be tested. */
  invalidDraft?: boolean;
  /** Called when the backend says the live template changed, so the parent reloads it. */
  onStale?: () => void;
}) {
  const { t, lang } = useI18n();
  const [recipient,setRecipient]=useState(defaultRecipient);
  const [mode,setMode]=useState<'live'|'draft'>('live');
  const [config,setConfig]=useState<TestConfig|null>(null);
  const [loadError,setLoadError]=useState(false);
  const [sendError,setSendError]=useState('');
  const [queued,setQueued]=useState(false);
  const [busy,setBusy]=useState(false);
  const [stale,setStale]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [keys]=useState(createActionKeys);
  const locked=useRef(false);
  const draftOk=!!draft && !invalidDraft && !!draft.subject.trim() && !!draft.body.trim() && !(draft.subject===source.subject && draft.body===source.body);
  const activeMode=mode==='draft' && draft ? 'draft':'live';
  const addressInvalid=recipient.trim()!=='' && !validTestRecipient(recipient.trim());
  useEffect(()=>{
    let current=true;setLoadError(false);
    if(!request){setLoadError(true);return;}
    request<{data:TestConfig}>('GET',`/comms/template-tests?templateId=${encodeURIComponent(source.id)}`)
      .then(r=>{if(current)setConfig(r.data)},()=>{if(current){setConfig(null);setLoadError(true)}});
    return()=>{current=false};
  },[request,source.id,refresh]);
  useEffect(()=>{if(!draft)setMode('live')},[draft]);
  useEffect(()=>{setQueued(false);setSendError('')},[activeMode,draft?.subject,draft?.body]);
  useEffect(()=>{setStale(false)},[source.subject,source.body,source.body_html]);
  const send=async()=>{
    if(!request || !config?.enabled || stale || locked.current || !validTestRecipient(recipient.trim()) || (activeMode==='draft' && !draftOk))return;
    const body=testPayload(source,recipient,activeMode,draft),intent=[body];
    locked.current=true;setBusy(true);setQueued(false);setSendError('');
    try {
      await request('POST','/comms/template-tests',body,{idempotencyKey:keys.keyFor(intent)});
      keys.done(intent);setQueued(true);setRefresh(n=>n+1);
    } catch(e) {
      const code=errorCode(e),{key,definitive}=testRefusal(code,(e as {status?:number})?.status);
      // A definitive refusal ends this intent; network errors, 5xx and unknown codes keep the key so a retry replays.
      if(definitive)keys.done(intent);
      if(code==='template_tests_disabled')setRefresh(n=>n+1);
      if(code==='template_changed'){setRefresh(n=>n+1);setStale(true);onStale?.();}
      setSendError(key);
    } finally {locked.current=false;setBusy(false)}
  };
  const reload=()=>{setRefresh(n=>n+1);if(stale){setStale(false);onStale?.()}};
  const message=loadError?t('emailTest.unavailable'):!config?t('core.common.loading'):queued?t('emailTest.queued'):sendError?t('emailTest.'+sendError):!config.enabled?t('emailTest.disabled'):'';
  const hintId=`email-test-hint-${source.id}`;
  return <details data-email-test-panel><summary>{t('emailTest.title')}</summary><div className="stack-sm">
    <p className="small muted">{t('emailTest.note')}</p>
    <p role="status" aria-live="polite" data-email-test-status>{message}</p>
    {config && <>
      <p className="small">{t('emailTest.from')}: {config.from || '—'} · {t('emailTest.replyTo')}: {config.replyTo || '—'}</p>
      <label>{t('emailTest.recipient')}<input type="email" className="input" value={recipient} readOnly={busy} disabled={!config.enabled} aria-invalid={addressInvalid} aria-describedby={addressInvalid?hintId:undefined} onChange={e=>{setRecipient(e.target.value);setQueued(false)}} autoComplete="email" /></label>
      {addressInvalid && <p id={hintId} className="small">{t('emailTest.recipientHint')}</p>}
      <label>{t('emailTest.version')}<select className="input" value={activeMode} disabled={busy || !config.enabled} onChange={e=>{setMode(e.target.value as 'live'|'draft');setQueued(false)}}>
        <option value="live">{t('emailEdit.live')} · v{version}</option>
        {draft && <option value="draft" disabled={!draftOk}>{t('emailEdit.draft')} · {t('emailTest.basedOn')} v{version}</option>}
      </select></label>
      {draft && !draftOk && <p className="small">{t('emailTest.draftUnusable')}</p>}
      <Button disabled={busy || stale || !config.enabled || addressInvalid || !recipient.trim() || (activeMode==='draft' && !draftOk)} onClick={send}>{t(busy?'emailTest.sending':'emailTest.send')}</Button>
      <strong>{t('emailTest.history')}</strong>
      {config.history.length===0 && <p className="small">{t('emailTest.empty')}</p>}
      {config.history.map(row=><div key={row.id} className="small">
        <p>{new Date(row.at).toLocaleString(lang)} · {row.recipient} · {t(row.mode==='draft'?'emailEdit.draft':'emailEdit.live')} · {t('notifications.status.'+row.status)}</p>
        <p>{t('emailTest.snapshot')}: <code>{row.sourceHash}</code> · {t('emailTest.actor')}: {row.actor || t('emailTest.operator')}</p>
        {row.error && <p>{t('emailTest.'+deliveryErrorKey(row.error))}{deliveryErrorKey(row.error)==='errOther' && <> <span className="small muted">({row.error})</span></>}</p>}
      </div>)}
      <Button variant="ghost" disabled={busy} onClick={reload}>{t('emailTest.refresh')}</Button>
    </>}
  </div></details>;
}
