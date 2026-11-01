import { useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_LABEL } from '../../auth/roles';
import { useI18n } from '../../i18n/I18nProvider';
import { failureCopy } from '../../data/companyos/refusals';
import { useAction, useCos } from '../transfers/launch/useCos';
import { Button } from '../../components/atom/Button/Button';
import { Input } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Card } from '../../components/molecule/Card/Card';
import { Notice } from '../../components/molecule/Notice/Notice';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { DETAILS_MAX, PROBLEM_REPORT_PATH, problemReportBody, problemReportErrors, SUMMARY_MAX } from './problemReport';

/** The forms module's codes a staff report can meet, in staff words (the code→copy table's lines are customer-facing). */
const REPORT_CODES = ['unknown_form', 'invalid_answers', 'unknown_answer', 'answer_too_long', 'invalid_email', 'server_set_field', 'write_forbidden', 'forbidden', 'view_as_read_only'];

/**
 * Report a problem in the production Hub (lane Y3): the review build's drawer (screen, person, role, summary, details),
 * sent as a `problem_report` form_submission (forms module; Administration and the super admin read it), one
 * Idempotency-Key per report (reused on a retry, renewed when the text changes). A refusal is said in words and the
 * text stays for a retry; nothing is kept in the browser.
 */
export function HubProblemReport() {
  const { user, role, viewAs } = useSession();
  const location = useLocation();
  const { t, bi, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [errors, setErrors] = useState<{ summary: boolean; details: boolean }>({ summary: false, details: false });
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const cos = useCos();
  const action = useAction();
  const summaryRef = useRef<HTMLInputElement>(null), detailsRef = useRef<HTMLTextAreaElement>(null);
  const route = location.pathname;

  const start = () => { setErrors({ summary: false, details: false }); setFailure(null); setSent(false); setOpen(true); };
  const reset = () => { setSummary(''); setDetails(''); action.renew(); start(); };
  const edit = (set: (v: string) => void) => (v: string) => { set(v); action.renew(); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (action.busy) return;
    const next = problemReportErrors(summary, details);
    setErrors(next);
    if (next.summary || next.details) { (next.summary ? summaryRef.current : detailsRef.current)?.focus(); return; }
    setFailure(null);
    if (!cos) { setFailure(t('hub.report.prod.failedBody')); return; }
    const body = problemReportBody({ email: user.email, summary, details, route, viewingAs: viewAs });
    let code: string | null = null;
    const done = await action.run(async (key) => {
      try { return await cos.request('POST', PROBLEM_REPORT_PATH, body, { idempotencyKey: key }); }
      catch (e) { code = (e as { code?: unknown })?.code as string ?? null; throw e; }
    });
    if (done !== undefined) { setSent(true); return; }
    const known = code && REPORT_CODES.includes(code) ? code : null;
    setFailure(known ? t(`hub.report.prod.code.${known}`) : failureCopy({ code }, lang, t('hub.report.prod.failedBody')));
  };

  return <>
    <Button size="sm" variant="ghost" icon="alert" onClick={start}>{t('hub.report')}</Button>
    <Drawer open={open} onClose={() => setOpen(false)} side="bottom" title={t('hub.report')}>
      <div className="stack">
        <Notice tone="info">{t('hub.report.prod.intro')}</Notice>
        <Card padding="sm" tone="muted" className="stack-sm" style={{ overflowWrap: 'anywhere' }}>
          <div className="small"><strong>{t('hub.report.screen')}: </strong><span>{route}</span></div>
          <div className="small"><strong>{t('hub.report.prod.person')}: </strong><span>{user.name} · {user.email}</span></div>
          <div className="small"><strong>{t('hub.report.role')}: </strong><span>{bi(ROLE_LABEL[role])}</span></div>
        </Card>
        {failure && <Notice tone="warn"><strong>{t('hub.report.prod.failed')}</strong> {failure}</Notice>}
        {sent ? <div className="stack">
          <Notice tone="success">{t('hub.report.prod.sent')}</Notice>
          <Button block variant="secondary" onClick={reset}>{t('hub.report.prod.another')}</Button>
          <Button block variant="ghost" onClick={() => setOpen(false)}>{t('hub.report.close')}</Button>
        </div> : <form className="stack" noValidate onSubmit={submit}>
          <Field label={t('hub.report.subject')} required error={errors.summary ? t('hub.report.subjectError') : undefined}>{(id) => <Input id={id} ref={summaryRef} value={summary} maxLength={SUMMARY_MAX} invalid={errors.summary} onChange={(e) => edit(setSummary)(e.target.value)} />}</Field>
          <Field label={t('hub.report.details')} hint={t('hub.report.prod.detailsHint')} error={errors.details ? t('hub.report.prod.detailsError') : undefined}>{(id) => <textarea id={id} ref={detailsRef} className={`input ${errors.details ? 'is-invalid' : ''}`} rows={5} maxLength={DETAILS_MAX} value={details} aria-invalid={errors.details || undefined} onChange={(e) => edit(setDetails)(e.target.value)} />}</Field>
          <Button type="submit" block loading={action.busy} disabled={action.busy}>{t('hub.report.prod.send')}</Button>
          <Button type="button" block variant="ghost" onClick={() => setOpen(false)}>{t('hub.report.cancel')}</Button>
        </form>}
      </div>
    </Drawer>
  </>;
}
