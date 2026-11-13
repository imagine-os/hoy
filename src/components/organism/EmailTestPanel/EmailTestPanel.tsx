import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../atom/Button/Button';
import { createActionKeys, type CosRequest } from '../../../modules/staff/desk/wire';
import { testPayload, validTestRecipient, type TestConfig, type TestCopy, type TestSource } from '../../../notifications/templateTests';

/** Preview never sends; test sends use only the opt-in, authenticated backend. */
export function EmailTestPanel({ request, source, draft, version, defaultRecipient = '' }: {
  request: CosRequest | null; source: TestSource; draft: TestCopy | null; version: number; defaultRecipient?: string;
}) {
  const { t, lang } = useI18n();
  const [recipient,setRecipient]=useState(defaultRecipient);
  const [mode,setMode]=useState<'live'|'draft'>('live');
  const [config,setConfig]=useState<TestConfig|null>(null);
  const [loadError,setLoadError]=useState(false);
  const [sendError,setSendError]=useState('');
  const [queued,setQueued]=useState(false);
  const [busy,setBusy]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [keys]=useState(createActionKeys);
  const locked=useRef(false);
  const activeMode=mode==='draft' && draft ? 'draft':'live';
  useEffect(()=>{
    let current=true;setLoadError(false);
    if(!request){setLoadError(true);return;}
    request<{data:TestConfig}>('GET',`/comms/template-tests?templateId=${encodeURIComponent(source.id)}`)
      .then(r=>{if(current)setConfig(r.data)},()=>{if(current){setConfig(null);setLoadError(true)}});
    return()=>{current=false};
  },[request,source.id,refresh]);
  const send=async()=>{
    if(!request || !config?.enabled || locked.current || !validTestRecipient(recipient.trim()))return;
    const body=testPayload(source,recipient,activeMode,draft),intent=[body];
    locked.current=true;setBusy(true);setQueued(false);setSendError('');
    try {
      await request('POST','/comms/template-tests',body,{idempotencyKey:keys.keyFor(intent)});
      keys.done(intent);setQueued(true);setRefresh(n=>n+1);
    } catch(e) {
      const code=(e as {code?:string})?.code;
      setSendError(code==='test_rate_limit'?'rateLimit':code==='template_changed'?'changed':code==='test_sample_missing'?'sampleMissing':code==='template_tests_disabled'?'disabled':'failed');
    } finally {locked.current=false;setBusy(false)}
  };
  return <details data-email-test-panel><summary>{t('emailTest.title')}</summary><div className="stack-sm">
    <p className="small muted">{t('emailTest.note')}</p>
    {loadError && <p role="status">{t('emailTest.unavailable')}</p>}
    {!loadError && !config && <p role="status">{t('core.common.loading')}</p>}
    {config && <>
      <p className="small">{t('emailTest.from')}: {config.from || '—'} · {t('emailTest.replyTo')}: {config.replyTo || '—'}</p>
      {!config.enabled && <p role="status">{t('emailTest.disabled')}</p>}
      <label>{t('emailTest.recipient')}<input type="email" className="input" value={recipient} disabled={busy || !config.enabled} onChange={e=>{setRecipient(e.target.value);setQueued(false)}} autoComplete="email" /></label>
      <label>{t('emailTest.version')}<select className="input" value={activeMode} disabled={busy || !config.enabled} onChange={e=>{setMode(e.target.value as 'live'|'draft');setQueued(false)}}>
        <option value="live">{t('emailEdit.live')} · v{version}</option>
        {draft && <option value="draft">{t('emailEdit.draft')} · {t('emailTest.basedOn')} v{version}</option>}
      </select></label>
      <Button disabled={busy || !config.enabled || !validTestRecipient(recipient.trim()) || (activeMode==='draft' && (!draft?.subject.trim() || !draft.body.trim()))} onClick={send}>{t(busy?'emailTest.sending':'emailTest.send')}</Button>
      {queued && <p role="status">{t('emailTest.queued')}</p>}
      {sendError && <p role="alert">{t('emailTest.'+sendError)}</p>}
      <strong>{t('emailTest.history')}</strong>
      {config.history.length===0 && <p className="small">{t('emailTest.empty')}</p>}
      {config.history.map(row=><div key={row.id} className="small">
        <p>{new Date(row.at).toLocaleString(lang)} · {row.recipient} · {t(row.mode==='draft'?'emailEdit.draft':'emailEdit.live')} · {t('notifications.status.'+row.status)}</p>
        <p>{t('emailTest.snapshot')}: <code>{row.sourceHash}</code> · {t('emailTest.actor')}: {row.actor || t('emailTest.operator')}</p>
        {row.error && <p role="alert">{row.error}</p>}
      </div>)}
    </>}
    <Button variant="ghost" disabled={busy} onClick={()=>setRefresh(n=>n+1)}>{t('emailTest.refresh')}</Button>
  </div></details>;
}
