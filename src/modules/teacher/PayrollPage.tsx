import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassSessionRow, PaymentMethodRow, PayrollLineRow, PayrollRunRow, TeacherRow } from '../../data/schema';
import { classLinesFor, monthPeriod, runTotal, type DraftLine, type Period } from '../../data/payrollCalc';
import { formatCOP, formatDate, formatDateTime, formatTime } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useSettings } from '../admin/settings';
import { waLink } from '../customer/ui';
import { useTeacherSelf } from './useTeacherSelf';
import './teacher.css';

interface TemplateRow extends BaseRow { teacher_id: string }

const STATUS_TONE = { draft: 'warn', approved: 'primary', paid: 'success' } as const;

/**
 * S-03 `/teach/payroll` — the teacher's own statement.
 *
 * Before finance generates the run, the month is computed live from the classes actually taught
 * (completed sessions × the teacher's rate) and labelled as an estimate. Once the run exists, the
 * page reads `payroll_lines` instead, so what the teacher sees is exactly what finance will pay —
 * bonuses and adjustments included.
 */
export function TeacherPayrollPage() {
  const { t, lang } = useI18n();
  const { me } = useTeacherSelf();
  const { settings } = useSettings();
  const [offset, setOffset] = useState(0);

  const period: Period = useMemo(() => monthPeriod(new Date(new Date().getFullYear(), new Date().getMonth() + offset, 15)), [offset]);
  const meId = me?.id;

  const { rows: runs } = useTable<PayrollRunRow>('payroll_runs', { orderBy: { column: 'period_start', dir: 'desc' } });
  const { rows: allLines } = useTable<PayrollLineRow>('payroll_lines');
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const { rows: bookings } = useTable<BookingRow>('bookings');
  const { rows: templates } = useTable<TemplateRow>('class_templates');
  const { rows: methods } = useTable<PaymentMethodRow>('payment_methods', me?.user_id ? { where: { user_id: me.user_id } } : { limit: 0 });

  const run = runs.find((r) => r.period_start === period.start && r.period_end === period.end);
  const tpl = useMemo(() => new Map(templates.map((x) => [x.id, x])), [templates]);
  const sessionById = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);

  /** Lines of the month: the run's own when it exists, otherwise the live estimate. */
  const lines: DraftLine[] = useMemo(() => {
    if (!meId) return [];
    if (run) return allLines.filter((l) => l.run_id === run.id && l.teacher_id === meId);
    return classLinesFor(period, sessions, bookings, me ? [me as TeacherRow] : []);
  }, [run, allLines, meId, me, period, sessions, bookings]);

  const classLines = lines.filter((l) => l.kind === 'class');
  const extras = lines.filter((l) => l.kind !== 'class');
  const total = runTotal(lines);
  const rate = me?.rate_per_class ?? 0;
  const myRuns = useMemo(() => runs.filter((r) => allLines.some((l) => l.run_id === r.id && l.teacher_id === meId)), [runs, allLines, meId]);
  const label = new Date(`${period.start}T12:00:00`).toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', { month: 'long', year: 'numeric' });
  const isSub = useCallback((sessionId: string | null) => {
    const s = sessionId ? sessionById.get(sessionId) : undefined;
    return !!s?.template_id && tpl.get(s.template_id)?.teacher_id !== s.teacher_id;
  }, [sessionById, tpl]);
  const subs = classLines.filter((l) => isSub(l.class_session_id)).length;
  const method = methods.find((m) => m.is_default) ?? methods[0];

  const ask = waLink(settings.profile.whatsapp || tenant.contact.whatsapp, t('teacher.payroll.ask.text', { period: label, total: formatCOP(total, lang) }));

  return (
    <div className="container page stack teach">
      <div className="row-between wrap">
        <h1 className="teach-h1">{t('teacher.payroll.title')}</h1>
        <div className="row">
          <Button size="sm" variant="ghost" onClick={() => setOffset(offset - 1)} aria-label="‹">‹</Button>
          <span className="small teach-month">{label}</span>
          <Button size="sm" variant="ghost" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} aria-label="›">›</Button>
        </div>
      </div>

      {!me ? <EmptyState title={t('teacher.home.notLinked')} /> : (
        <>
          <Card padding="sm" className="row wrap" tone={run ? 'surface' : 'highlight'}>
            <Badge tone={run ? STATUS_TONE[run.status] : 'neutral'}>{run ? t(`teacher.payroll.state.${run.status}`) : t('teacher.payroll.state.estimate')}</Badge>
            <span className="small grow">{run ? t(`teacher.payroll.state.${run.status}.body`) : t('teacher.payroll.state.estimate.body')}</span>
          </Card>

          <div className="grid grid-3">
            <StatTile label={t('teacher.payroll.classes')} value={classLines.length} hint={subs ? t('teacher.payroll.subs', { n: subs }) : undefined} />
            <StatTile label={t('teacher.payroll.rate')} value={formatCOP(rate, lang)} hint={t('teacher.payroll.rate.hint')} />
            <StatTile label={t('teacher.payroll.total')} value={formatCOP(total, lang)} hint={run?.paid_at ? t('teacher.payroll.paidOn', { date: formatDate(run.paid_at, lang) }) : t('teacher.payroll.closes', { date: formatDate(`${period.end}T12:00:00`, lang) })} />
          </div>

          <section className="stack-sm">
            <div className="eyebrow">{t('teacher.payroll.breakdown')}</div>
            <Card padding="none">
              {classLines.length === 0 && <EmptyState compact title={t('teacher.payroll.empty')} body={t('teacher.payroll.empty.body')} />}
              {classLines.map((l, i) => {
                const s = l.class_session_id ? sessionById.get(l.class_session_id) : undefined;
                return (
                  <div key={`${l.class_session_id ?? 'x'}-${i}`} className="teach-payline">
                    <span className="grow">
                      <span className="row wrap">
                        <strong className="small">{s?.title ?? t('teacher.payroll.fromTimetable')}</strong>
                        {isSub(l.class_session_id) && <Badge tone="primary">{t('teacher.payroll.sub')}</Badge>}
                      </span>
                      <span className="xs muted">
                        {s ? `${formatDate(s.starts_at, lang)} · ${formatTime(s.starts_at, lang)}` : (l.note ?? '').slice(0, 10)}
                        {l.attendees != null ? ` · ${t('teacher.payroll.students', { n: l.attendees })}` : ''}
                      </span>
                    </span>
                    <span className="small mono">{formatCOP(l.amount, lang)}</span>
                  </div>
                );
              })}
              {extras.map((l, i) => (
                <div key={`x-${i}`} className="teach-payline">
                  <span className="grow">
                    <span className="row wrap"><strong className="small">{t(`teacher.payroll.kind.${l.kind}`)}</strong></span>
                    <span className="xs muted">{l.note}</span>
                  </span>
                  <span className={`small mono ${l.amount < 0 ? 'teach-neg' : ''}`}>{formatCOP(l.amount, lang)}</span>
                </div>
              ))}
            </Card>
          </section>

          <Card title={t('teacher.payroll.method')} padding="sm">
            <p className="small">
              {method
                ? t('teacher.payroll.method.on', { brand: method.brand, last4: method.last4 ? `··${method.last4}` : t(`teacher.payroll.methodKind.${method.kind}`) })
                : t('teacher.payroll.method.none')}
            </p>
            <p className="xs muted">{run ? t('teacher.payroll.method.run', { method: t(`teacher.payroll.methodKind.${run.method}`) }) : t('teacher.payroll.method.hint')}</p>
          </Card>

          {myRuns.length > 0 && (
            <section className="stack-sm">
              <div className="eyebrow">{t('teacher.payroll.history')}</div>
              <Card padding="none">
                {myRuns.map((r) => {
                  const mine = allLines.filter((l) => l.run_id === r.id && l.teacher_id === meId);
                  return (
                    <div key={r.id} className="teach-payline">
                      <span className="grow">
                        <span className="row wrap">
                          <strong className="small">{formatDate(`${r.period_start}T12:00:00`, lang, { month: 'long', year: 'numeric' })}</strong>
                          <Badge tone={STATUS_TONE[r.status]}>{t(`teacher.payroll.state.${r.status}`)}</Badge>
                        </span>
                        <span className="xs muted">{t('teacher.payroll.historyLine', { n: mine.filter((l) => l.kind === 'class').length })}{r.paid_at ? ` · ${formatDateTime(r.paid_at, lang)}` : ''}</span>
                      </span>
                      <span className="small mono">{formatCOP(runTotal(mine), lang)}</span>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}

          <div className="row wrap">
            <Button size="sm" variant="ghost" onClick={() => window.print()}>{t('teacher.payroll.download')}</Button>
            <a href={ask} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost">{t('teacher.payroll.ask')}</Button></a>
            <Chip>{t('teacher.payroll.runBy')}</Chip>
          </div>
        </>
      )}
    </div>
  );
}
