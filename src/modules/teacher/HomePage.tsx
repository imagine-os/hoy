import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useTable } from '../../data/DataContext';
import type { TeacherRow } from '../../data/schema';
import { formatCOP } from '../../i18n/format';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Card } from '../../components/molecule/Card/Card';
import { ClassRow } from '../../components/molecule/ClassRow/ClassRow';
import { useSessionsJoined } from '../website/hooks';

/** S-03 Teacher home (first slice): my classes this week + payroll estimate. */
export function TeacherHomePage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const { user } = useSession();
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { user_id: user.id } });
  const me = teachers[0];
  const now = new Date(); const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
  const mine = useSessionsJoined((s) => !!me && s.teacher_id === me.id && new Date(s.starts_at) >= new Date(now.getTime() - 86400e3 * now.getDay()) && new Date(s.starts_at) <= weekEnd);
  const students = mine.reduce((a, x) => a + x.session.booked_count, 0);
  return (
    <div className="container page stack">
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>{t('teacher.home.title')}</h1>
      {!me && <Card tone="muted"><p className="small muted">{t('teacher.home.notLinked')}</p></Card>}
      <div className="grid grid-3">
        <StatTile label={t('teacher.home.classes')} value={mine.length} />
        <StatTile label={t('teacher.home.payroll')} value={formatCOP(mine.filter((x) => x.session.status !== 'cancelled').length * (me?.rate_per_class ?? 0), lang)} />
        <StatTile label={t('teacher.home.rating')} value={me?.rating_avg ? `★ ${me.rating_avg.toFixed(1)}` : '—'} />
      </div>
      <div className="eyebrow">{t('teacher.home.week')} · {t('teacher.home.students', { n: students })}</div>
      <Card padding="sm">
        {mine.length === 0 && <p className="muted small" style={{ padding: 12 }}>{t('teacher.home.empty')}</p>}
        {mine.map(({ session: s, modality: m }) => <ClassRow key={s.id} title={s.title} teacher={new Date(s.starts_at).toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', { weekday: 'long', day: 'numeric' })} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} status={s.status} onClick={() => nav(`/teach/class/${s.id}`)} />)}
      </Card>
    </div>
  );
}
