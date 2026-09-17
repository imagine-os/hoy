import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow, TeacherRow } from '../../../data/schema';
import { TeacherCard } from '../../../components/organism/TeacherCard/TeacherCard';
import { PageHead, SiteShell } from '../SiteShell';

export function TeachersPage() {
  const { t, lang } = useI18n();
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  return (
    <SiteShell>
      <PageHead title={t('site.teachers.title')} body={t('site.teachers.body')} />
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="grid grid-3">
          {teachers.map((te) => (
            <TeacherCard key={te.id} name={te.display_name} bio={te.bio} rating={te.rating_avg} photo={te.photo_url}
              specialties={te.specialties.map((id) => { const m = modalities.find((x) => x.id === id); return { label: m ? (lang === 'es' ? m.name_es : m.name_en) : id, movement: m?.movement ?? 'fluye' }; })} />
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
