import { Fragment, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow, TeacherRow } from '../../../data/schema';
import { Card } from '../../../components/molecule/Card/Card';
import { Chip } from '../../../components/atom/Chip/Chip';
import { MediaSlot } from '../../../components/molecule/MediaSlot/MediaSlot';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

export function TeachersPage() {
  const { t, lang, bi } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.teachers);
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const spec = (id: string) => {
    const m = modalities.find((x) => x.id === id);
    return { label: m ? (lang === 'es' ? m.name_es : m.name_en) : id, movement: m?.movement ?? ('fluye' as const) };
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.teachers.title')} body={t('site.teachers.body')} />,
    TeacherGrid: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <p className="xs muted" style={{ marginBottom: 16 }}>{t('site.teachers.legend')}</p>
        <div className="site-teachergrid">
          {teachers.map((te) => {
            const first = te.specialties.map(spec)[0];
            return (
              <Card key={te.id} padding="sm" className="site-teacher">
                <MediaSlot
                  ratio="4:3" kind="photo" movement={first?.movement}
                  src={te.photo_url ?? undefined}
                  label={t('site.teachers.portrait', { name: te.display_name })}
                  brief={`portrait of ${te.display_name}, studio light, cream backdrop`}
                />
                <div className="row-between">
                  <h3>{te.display_name}</h3>
                  {te.rating_avg != null && <span className="small muted">★ {te.rating_avg.toFixed(1)}</span>}
                </div>
                <p className="small">{bi(te.bio)}</p>
                <div className="row wrap">{te.specialties.map(spec).map((s) => <Chip key={s.label} movement={s.movement} dot>{s.label}</Chip>)}</div>
              </Card>
            );
          })}
        </div>
      </section>
    ),
  };

  return (
    <SiteShell>
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </SiteShell>
  );
}
