import { useSiteHref } from '../links';
import { Fragment, type ReactNode } from 'react';
import { Link, useParams } from '../links';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow, TeacherRow } from '../../../data/schema';
import { formatCOP } from '../../../i18n/format';
import { priceItem } from '../../../tenant/pricing';
import { brandClass, classes, classOrder, taglines, type ClassSlug } from '../../../tenant/brand';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Card } from '../../../components/molecule/Card/Card';
import { ClassArch } from '../../../components/molecule/ClassArch/ClassArch';
import { PageHead, SiteShell, useBrandHeading } from '../SiteShell';
import { siteSpecs } from '../specs';
import { useClassPhotos } from '../hooks';

/** W-08 — one of the seven classes (0051), joined to its schedule row through brand.classes[slug].modalitySlugs. */
export function ClassDetailPage() {
  const href = useSiteHref();
  const { slug = '' } = useParams();
  const { t, bi, lang } = useI18n();
  const brand = useBrandHeading();
  const { sections, isVisible } = useLayout(siteSpecs.classDetail);
  const { rows: modalities } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true } });
  const photos = useClassPhotos();
  const c = brandClass(slug);
  const trial = priceItem('trial');
  const trialPrice = trial?.price != null ? formatCOP(trial.price, lang) : '';

  if (!c) {
    return (
      <SiteShell>
        <PageHead title={bi({ es: 'Clase no encontrada', en: 'Class not found' })} body={t('site.classes.notFound')} />
        <section className="container site-section" style={{ paddingTop: 0 }}>
          <div className="row wrap">
            {classOrder.map((s) => <Link key={s} to={`/site/classes/${s}`}><Chip tone={classes[s].tone} dot>{bi(classes[s].name)}</Chip></Link>)}
          </div>
        </section>
      </SiteShell>
    );
  }

  const mods = modalities.filter((m) => c.modalitySlugs.includes(m.slug));
  const primary = mods[0];
  const guides = teachers.filter((te) => te.specialties.some((id) => mods.some((m) => m.id === id))).map((te) => te.display_name);
  const index = classOrder.indexOf(slug as ClassSlug);

  const SECTIONS: Record<string, () => ReactNode> = {
    Hero: () => (
      <>
        <PageHead eyebrow={`${String(index + 1).padStart(2, '0')} · ${t(`site.classes.level.${c.intensity}`)}`} title={bi(c.name)} body={bi(c.tagline)} back={{ to: '/site/classes', label: t('site.classes.back') }} />
        <section className="container site-section site-classhero" style={{ paddingTop: 0 }}>
          <ClassArch slug={slug as ClassSlug} index={index + 1} size="lg" photoUrl={photos.get(slug)} tagline={false} />
          <div className="site-classhero-copy">
            <p className="eyebrow">{t('site.classes.concept')}</p>
            <p className="site-lead">{bi(c.concept)}</p>
            <p className="eyebrow">{t('site.classes.intention')}</p>
            <blockquote className="site-classrow-intention" data-tone={c.tone}>“{bi(c.intention)}”</blockquote>
            {guides.length > 0 && <p className="small muted">{t('site.classes.teacher', { name: guides.join(' · ') })}</p>}
          </div>
        </section>
      </>
    ),
    Essay: () => (
      <section className="container site-section">
        <div className="site-classdetail-grid">
          <Card eyebrow={t('site.classes.keys')}>
            <div className="row wrap">{c.keys.map((k) => <Chip key={k.es} tone={c.tone} dot>{bi(k)}</Chip>)}</div>
          </Card>
          <Card eyebrow={t('site.classes.messages')}>
            <ul className="site-bring">{c.messages.map((m) => <li key={m.es}>{bi(m)}</li>)}</ul>
          </Card>
          <Card eyebrow={t('site.classes.method')}>
            <p className="site-classdetail-method">{bi(c.method)}</p>
            <p className="small muted">{bi(c.methodNote)}</p>
          </Card>
        </div>
      </section>
    ),
    Facts: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.classes.facts')}>
          {primary ? (
            <div className="site-facts">
              <div className="site-fact"><span className="eyebrow">{t('site.classes.duration')}</span><strong>{t('core.common.min', { n: primary.duration_min })}</strong></div>
              <div className="site-fact"><span className="eyebrow">{t('site.classes.intensity')}</span><strong>{'●'.repeat(primary.intensity)}{'○'.repeat(5 - primary.intensity)}</strong></div>
              <div className="site-fact"><span className="eyebrow">{t('site.classes.room')}</span><strong>{primary.heated ? t('site.classes.roomHot') : t('site.classes.roomTemperate')}</strong></div>
            </div>
          ) : (
            <p className="small muted">{t('site.classes.factsPending')}</p>
          )}
          {mods.length > 0 && (
            <div className="row wrap" style={{ marginTop: 'var(--sp-lg)' }}>
              {mods.map((m) => <Chip key={m.id} tone={m.tone} dot>{lang === 'es' ? m.name_es : m.name_en}</Chip>)}
            </div>
          )}
        </Card>
      </section>
    ),
    Bring: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.classes.bring')}>
          <ul className="site-bring small">
            {c.bring.map((k) => <li key={k}>{t(`site.classes.bring.${k}`)}</li>)}
          </ul>
        </Card>
      </section>
    ),
    Other: () => (
      <section className="container site-section">
        <p className="eyebrow">{t('site.classes.other')}</p>
        <div className="site-otherarches">
          {classOrder.filter((s) => s !== slug).map((s) => <ClassArch key={s} slug={s} index={classOrder.indexOf(s) + 1} to={href(`/site/classes/${s}`)} photoUrl={photos.get(s)} />)}
        </div>
      </section>
    ),
    CTA: () => (
      <section className="container site-section">
        <div className="site-panel site-cta">
          <div className="site-cta-copy">
            <p className="eyebrow">{t('site.first.eyebrow')}</p>
            <h2>{brand(bi(taglines.life), 'current')}</h2>
            <p>{t('site.first.body', { price: trialPrice })}</p>
          </div>
          <div className="row wrap">
            <Link to="/site/plans"><Button size="lg">{t('site.first.cta')}</Button></Link>
            <Link to={c.modalitySlugs[0] ? `/site/schedule?modality=${c.modalitySlugs[0]}` : '/site/schedule'}><Button size="lg" variant="secondary">{t('site.classes.schedule')}</Button></Link>
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
