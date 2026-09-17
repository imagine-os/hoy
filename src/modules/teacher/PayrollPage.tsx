import { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassSessionRow } from '../../data/schema';
import { formatCOP, formatDate, formatTime } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Badge } from '../../components/atom/Badge/Badge';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useSessionsJoined } from '../website/hooks';
import { useTeacherSelf } from './useTeacherSelf';
import './teacher.css';

interface TemplateRow extends BaseRow { teacher_id: string }

/** /teach/payroll — classes taught × rate per class for one month. Read-only placeholder until Wompi payroll runs. */
export function TeacherPayrollPage() {
  const { t, lang } = useI18n();
  const { me } = useTeacherSelf();
  const [offset, setOffset] = useState(0);
  const month = useMemo(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + offset); return d; }, [offset]);
  const monthEnd = useMemo(() => { const d = new Date(month); d.setMonth(d.getMonth() + 1); return d; }, [month]);
  const meId = me?.id;
  const mine = useSessionsJoined(useCallback((s: ClassSessionRow) => !!meId && s.teacher_id === meId && s.status === 'completed' && new Date(s.starts_at) >= month && new Date(s.starts_at) < monthEnd, [meId, month, monthEnd]));
  const ids = useMemo(() => mine.map((x) => x.session.id), [mine]);
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { session_id: ids, status: 'checked_in' } });
  const { rows: templates } = useTable<TemplateRow>('class_templates');
  const tpl = new Map(templates.map((x) => [x.id, x]));
  const rate = me?.rate_per_class ?? 0;
  const lines = mine.map((x) => ({ ...x, students: bookings.filter((b) => b.session_id === x.session.id).length, sub: !!x.session.template_id && tpl.get(x.session.template_id)?.teacher_id !== x.session.teacher_id }));
  const total = lines.length * rate;
  const closes = new Date(monthEnd); closes.setDate(15);
  const label = month.toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="container page stack teach">
      <div className="row-between wrap">
        <h1 className="teach-h1">{t('teacher.payroll.title')}</h1>
        <div className="row"><Button size="sm" variant="ghost" onClick={() => setOffset(offset - 1)} aria-label="‹">‹</Button><span className="small teach-month">{label}</span><Button size="sm" variant="ghost" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} aria-label="›">›</Button></div>
      </div>
      <Card tone="highlight" padding="sm" className="row wrap"><Badge tone="warn">{t('teacher.payroll.placeholder')}</Badge><span className="small">{t('teacher.payroll.placeholder.body')}</span></Card>
      {!me ? <EmptyState title={t('teacher.home.notLinked')} /> : (
        <>
          <div className="grid grid-3">
            <StatTile label={t('teacher.payroll.classes')} value={lines.length} hint={lines.some((l) => l.sub) ? t('teacher.payroll.subs', { n: lines.filter((l) => l.sub).length }) : undefined} />
            <StatTile label={t('teacher.payroll.rate')} value={formatCOP(rate, lang)} />
            <StatTile label={t('teacher.payroll.total')} value={formatCOP(total, lang)} hint={offset === 0 ? t('teacher.payroll.closes', { date: formatDate(closes.toISOString(), lang) }) : undefined} />
          </div>
          <Card padding="none">
            {lines.length === 0 && <EmptyState compact title={t('teacher.payroll.empty')} body={t('teacher.payroll.empty.body')} />}
            {lines.map(({ session: s, modality: m, students, sub }) => (
              <div key={s.id} className="teach-payline">
                <span className={`classrow-dot mv-${m?.movement ?? 'fluye'}`} aria-hidden />
                <div className="grow"><div className="row wrap"><strong className="small">{s.title}</strong>{sub && <Badge tone="primary">{t('teacher.payroll.sub')}</Badge>}</div><div className="xs muted">{formatDate(s.starts_at, lang)} · {formatTime(s.starts_at, lang)} · {t('teacher.payroll.students', { n: students })}</div></div>
                <span className="small mono">{formatCOP(rate, lang)}</span>
              </div>
            ))}
          </Card>
          <p className="xs muted">{t('teacher.payroll.readonly')}</p>
        </>
      )}
    </div>
  );
}
