import { Fragment, type ReactNode } from 'react';
import { Link } from '../links';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow, TeacherRow } from '../../../data/schema';
import { formatCOP } from '../../../i18n/format';
import { priceItem } from '../../../tenant/pricing';
import { classesIntro, classes, classOrder, taglines } from '../../../tenant/brand';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { ClassArch } from '../../../components/molecule/ClassArch/ClassArch';
import { PageHead, SiteShell, useBrandHeading } from '../SiteShell';
import { siteSpecs } from '../specs';
import { useClassPhotos } from '../hooks';

/**
 * W-07 — "Nuestras clases" (0051): the verified introduction and one row for each of the seven classes, all from
 * src/tenant/brand.ts. Each row carries the class's concept, intention, keys and method, who guides it and its arch.
 */
export function ClassesPage() {
  const { t, bi, lang } = useI18n();
  const brand = useBrandHeading();
  const { sections, isVisible } = useLayout(siteSpecs.classes);
  const { rows: modalities } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const photos = useClassPhotos();
  const trial = priceItem('trial');
  const trialPrice = trial?.price != null ? formatCOP(trial.price, lang) : '';
  /** The teachers who guide a class: anyone whose specialties hold one of its modalities. */
  const guides = (modalitySlugs: string[]) => {
    const ids = modalities.filter((m) => modalitySlugs.includes(m.slug)).map((m) => m.id);
    return teachers.filter((te) => te.specialties.some((id) => ids.includes(id))).map((te) => te.display_name);
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead eyebrow={bi(classesIntro.eyebrow)} title={bi(classesIntro.title)} body={bi(classesIntro.lead)} />,
    Intro: () => (
      <section className="container site-section site-classes-intro" style={{ paddingTop: 0 }}>
        <p className="site-classes-statement">{bi(classesIntro.statement)}</p>
        <div className="site-prose">
          {classesIntro.paragraphs.map((p, i) => <p key={i}>{bi(p)}</p>)}
          <p className="site-classes-question">{bi(classesIntro.question)}</p>
          <p className="site-classes-close">{bi(classesIntro.close)}</p>
        </div>
      </section>
    ),
    ClassList: () => (
      <section className="container site-section">
        <div className="site-classlist">
          {classOrder.map((slug, i) => {
            const c = classes[slug];
            const names = guides(c.modalitySlugs);
            return (
              <article key={slug} className="site-classrow" id={slug}>
                <div className="site-classrow-copy">
                  <p className="eyebrow">{String(i + 1).padStart(2, '0')} · {t(`site.classes.level.${c.intensity}`)}</p>
                  <h2>{bi(c.name)}</h2>
                  <p className="site-classrow-tagline">{bi(c.tagline)}</p>
                  <p>{bi(c.concept)}</p>
                  <blockquote className="site-classrow-intention" data-tone={c.tone}>“{bi(c.intention)}”</blockquote>
                  <div className="row wrap">{c.keys.map((k) => <Chip key={k.es} tone={c.tone} dot>{bi(k)}</Chip>)}</div>
                  <p className="small"><strong>{t('site.classes.method')}:</strong> {bi(c.method)}. {bi(c.methodNote)}</p>
                  {names.length > 0 && <p className="small muted">{t('site.classes.teacher', { name: names.join(' · ') })}</p>}
                  <div className="row wrap">
                    <Link to={`/site/classes/${slug}`}><Button>{t('site.classes.read')}</Button></Link>
                    <Link to={c.modalitySlugs[0] ? `/site/schedule?modality=${c.modalitySlugs[0]}` : '/site/schedule'}><Button variant="secondary">{t('site.classes.schedule')}</Button></Link>
                  </div>
                </div>
                <div className="site-classrow-media">
                  <ClassArch slug={slug} index={i + 1} size="lg" photoUrl={photos.get(slug)} />
                </div>
              </article>
            );
          })}
        </div>
      </section>
    ),
    CTA: () => (
      <section className="container site-section">
        <div className="site-panel site-cta">
          <div className="site-cta-copy">
            <p className="eyebrow">{t('site.first.eyebrow')}</p>
            <h2>{brand(bi(taglines.start), 'current')}</h2>
            <p>{t('site.first.body', { price: trialPrice })}</p>
          </div>
          <div className="row wrap">
            <Link to="/site/plans"><Button size="lg">{t('site.first.cta')}</Button></Link>
            <Link to="/site/schedule"><Button size="lg" variant="secondary">{t('site.hero.cta2')}</Button></Link>
          </div>
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
