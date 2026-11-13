import { useState } from 'react';
import { useSession } from '../auth/SessionProvider';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../components/atom/Button/Button';
import { EmailPreview } from '../components/organism/EmailPreview/EmailPreview';
import { useCosQueries, flatRows, type CosRow } from '../modules/staff/desk/useCos';
import { batch, createActionKeys, type BatchOp } from '../modules/staff/desk/wire';
import { LAUNCH_SAMPLE, renderSample } from './launchEmails';
import { EmailTestPanel } from '../components/organism/EmailTestPanel/EmailTestPanel';

type Copy = { subject: string; body: string };
const copy = (r: CosRow): Copy => ({ subject: String(r.subject ?? ''), body: String(r.body ?? '') });
const tokens = (value: string) => value.match(/\{\{[^{}]+\}\}/g) ?? [];

export function TemplateEditor({ template }: { template: string }) {
  const { t, lang } = useI18n();
  const { role, user } = useSession();
  const archiveKey = 'hoy_revision_' + template;
  const query = useCosQueries({ templates: { entity: 'message_template', filter: { and: [
    { field: 'channel', op: 'eq', value: 'email' }, { field: 'key', op: 'in', value: [template, archiveKey] },
  ] } } });
  const [draft, setDraft] = useState<Copy | null>(null);
  const [base, setBase] = useState<CosRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [keys] = useState(createActionKeys);
  const rows = flatRows(query.rows?.templates ?? []).filter(r => !r.locale);
  const active = rows.filter(r => r.key === template && r.active !== false);
  const history = rows.filter(r => r.key === archiveKey && r.active === false).sort((a,b) =>
    String(a.created_at).localeCompare(String(b.created_at)) || a.id.localeCompare(b.id));
  if (query.error || !query.request || (!query.loading && active.length !== 1))
    return <p role="alert">{t('emailEdit.unavailable')} <Button onClick={query.reload}>{t('notifications.delivery.retry')}</Button></p>;
  if (query.loading || !active[0]) return <p role="status">{t('core.common.loading')}</p>;
  const live = active[0], current = copy(live), version = history.length + 1;
  const canEdit = role === 'super_admin' && !live.body_html;
  const start = (value: Copy) => { setBase(live); setDraft(value); setFailed(false); };
  const allowed = new Set([current, ...history.map(copy)].flatMap(value => tokens(value.subject + '\n' + value.body)));
  const input = draft ? draft.subject + '\n' + draft.body : '';
  const invalidToken = tokens(input).some(k => !allowed.has(k)) || /\{\{|\}\}/.test(input.replace(/\{\{[^{}]+\}\}/g, ''));
  const publish = async () => {
    if (!canEdit || !draft || !base || !query.request || busy || invalidToken || !draft.subject.trim() || !draft.body.trim()) return;
    const previous = copy(base);
    const ops: BatchOp[] = [
      { op: 'update', entity: 'message_template', id: base.id, ifMatch: { field: 'subject', value: base.subject }, data: { subject: draft.subject } },
      { op: 'update', entity: 'message_template', id: base.id, ifMatch: { field: 'body', value: base.body }, data: { body: draft.body } },
      { op: 'create', entity: 'message_template', data: { key: archiveKey, channel: 'email', locale: '', active: false, ...previous } },
    ];
    const intent = [base.id, previous, draft, user.id];
    setBusy(true);
    try {
      await batch(query.request, ops, keys.keyFor(intent));
      keys.done(intent); setDraft(null); setBase(null); setFailed(false); query.reload();
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  return <div className="stack-sm">
    <strong>{t('emailEdit.live')} · v{version}</strong>
    <EmailPreview envelope={t('notifications.launch.preview')} subject={renderSample(current.subject, LAUNCH_SAMPLE)} body={renderSample(current.body, LAUNCH_SAMPLE)} />
    {canEdit && !draft && <Button variant="outline" onClick={() => start(current)}>{t('emailEdit.edit')}</Button>}
    {draft && canEdit && <div className="stack-sm">
      <strong>{t('emailEdit.draft')}</strong>
      <label>{t('emailEdit.subject')}<input className="input" value={draft.subject} disabled={busy} onChange={e => setDraft({ ...draft, subject: e.target.value })} /></label>
      <label>{t('emailEdit.body')}<textarea className="input" rows={9} value={draft.body} disabled={busy} onChange={e => setDraft({ ...draft, body: e.target.value })} /></label>
      {invalidToken && <p role="alert">{t('emailEdit.tokens')}</p>}
      <EmailPreview envelope={t('emailEdit.draft')} subject={renderSample(draft.subject, LAUNCH_SAMPLE)} body={renderSample(draft.body, LAUNCH_SAMPLE)} />
      {failed && <p role="alert">{t('emailEdit.failed')}</p>}
      <div className="row wrap">
        <Button disabled={busy || failed || invalidToken || !draft.subject.trim() || !draft.body.trim() || (draft.subject === current.subject && draft.body === current.body)} onClick={publish}>{t('emailEdit.publish')}</Button>
        <Button variant="ghost" disabled={busy} onClick={() => { setDraft(null); setBase(null); setFailed(false); query.reload(); }}>{t('emailEdit.close')}</Button>
      </div>
    </div>}
    <details><summary>{t('emailEdit.history')} ({history.length})</summary>
      {history.map((r,i) => <details key={r.id}><summary>v{i + 1} · {copy(r).subject} · {r.created_at && new Date(r.created_at).toLocaleString(lang)}</summary>
        <p>{t('emailEdit.archived')}</p><pre style={{whiteSpace:'pre-wrap'}}>{copy(r).body}</pre>
        {canEdit && !draft && <Button variant="outline" onClick={() => start(copy(r))}>{t('emailEdit.reuse')}</Button>}
      </details>)}
    </details>
    {role === 'super_admin' && <EmailTestPanel request={query.request} source={{...copy(draft && base ? base : live),id:live.id,body_html:live.body_html}} draft={draft} version={version} defaultRecipient={user.email} />}
  </div>;
}
