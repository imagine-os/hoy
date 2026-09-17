import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow, TeacherRow } from '../../../data/schema';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Avatar } from '../../../components/atom/Avatar/Avatar';
import { TeacherCard } from '../../../components/organism/TeacherCard/TeacherCard';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { useAllSessionsJoined } from '../hooks';
import { MediaPlaceholder, PageHead } from '../ui';

/** C-18 Teacher gallery. */
export function TeachersPage() {
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const spec = (te: TeacherRow) => te.specialties.map((id) => modalities.find((m) => m.id === id)).filter(Boolean).map((m) => ({ label: bi({ es: m!.name_es, en: m!.name_en }), movement: m!.movement }));
  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.teachers.title')} sub={t('customer.teachers.sub')} />
      <div className="grid grid-2">
        {teachers.map((te) => <TeacherCard key={te.id} name={te.display_name} bio={te.bio} photo={te.photo_url} specialties={spec(te)} onClick={() => nav(`/app/teachers/${te.id}`)} />)}
      </div>
    </div>
  );
}

/** C-18 Teacher profile (deep-linkable). */
export function TeacherProfilePage() {
  const { id } = useParams();
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const { rows } = useTable<TeacherRow>('teachers', { where: { id } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const all = useAllSessionsJoined();
  const te = rows[0];
  const upcoming = useMemo(() => all.filter((x) => x.session.teacher_id === id && x.session.status === 'scheduled' && new Date(x.session.starts_at).getTime() > Date.now()).slice(0, 6), [all, id]);
  if (!te) {
    return <div className="container page cust-page"><PageHead back="/app/teachers" title={t('customer.teachers.notFound')} /><EmptyState title={t('customer.teachers.notFound')} action={<Link to="/app/teachers"><Button>{t('customer.teachers.title')}</Button></Link>} /></div>;
  }
  const mods = te.specialties.map((mid) => modalities.find((m) => m.id === mid)).filter(Boolean) as ModalityRow[];
  return (
    <div className="container page cust-page">
      <PageHead back="/app/teachers" title={<span className="sr-only">{te.display_name}</span>} />
      <div className="stack">
        <MediaPlaceholder slotKey="teacher.portrait" label={t('customer.teachers.portrait')} ratio="4 / 3"><div className="cust-portrait"><Avatar name={te.display_name} src={te.photo_url} size={96} /></div></MediaPlaceholder>
        <div className="stack-sm"><h1 className="cust-title">{te.display_name}</h1><p className="small">{bi(te.bio)}</p></div>
        <section className="stack-sm">
          <h2 className="cust-h2">{t('customer.teachers.teaches')}</h2>
          <div className="row wrap">{mods.map((m) => <Chip key={m.id} movement={m.movement} dot>{bi({ es: m.name_es, en: m.name_en })}</Chip>)}</div>
        </section>
        <section className="stack-sm">
          <h2 className="cust-h2">{t('customer.teachers.upcoming')}</h2>
          <Card padding="sm">
            {upcoming.length === 0 && <p className="small muted" style={{ padding: 12 }}>{t('customer.teachers.upcoming.empty')}</p>}
            {upcoming.map((x) => <ClassRow key={x.session.id} title={x.session.title} teacher={x.room?.name ?? ''} startsAt={x.session.starts_at} durationMin={x.modality?.duration_min ?? 60} movement={x.modality?.movement ?? 'fluye'} booked={x.session.booked_count} capacity={x.session.capacity} onClick={() => nav(`/app/class/${x.session.id}`)} />)}
          </Card>
        </section>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.teachers.ratingsNote')}</p>
      </div>
    </div>
  );
}
