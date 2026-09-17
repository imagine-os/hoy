import { Fragment, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { TeacherRow, ModalityRow, ReviewRow } from '../../../data/schema';
import { formatCOP } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { priceItem, FAMILY_LABEL, FAMILY_RATIONALE, type PlanFamily } from '../../../tenant/pricing';
import { manifesto, philosophy, classesIntro, classes, classOrder, taglines } from '../../../tenant/brand';
import { movements, type Movement } from '../../../design/tokens';
import { Button } from '../../../components/atom/Button/Button';
import { Card } from '../../../components/molecule/Card/Card';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { TeacherCard } from '../../../components/organism/TeacherCard/TeacherCard';
import { MediaSlot } from '../../../components/molecule/MediaSlot/MediaSlot';
import { SectionHead, SiteShell, waHref } from '../SiteShell';
import { siteSpecs } from '../specs';
import { useTodaySessions } from '../hooks';

const FAMILIES: PlanFamily[] = ['bienvenida', 'membresia', 'pausas', 'regalos', 'espacio'];

export function HomePage() {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const { sections, isVisible } = useLayout(siteSpecs.home);
  const today = useTodaySessions();
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true }, limit: 4 });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const { rows: reviews } = useTable<ReviewRow>('reviews', { orderBy: { column: 'created_at', dir: 'desc' } });
  const modName = (id: string) => { const m = modalities.find((x) => x.id === id); return m ? (lang === 'es' ? m.name_es : m.name_en) : ''; };
  const trial = priceItem('trial');
  const trialPrice = trial?.price != null ? formatCOP(trial.price, lang) : '';
  // one card per distinct comment: the seed repeats a handful of phrases across many reviews
  const quotes = [...new Map(reviews.filter((r) => r.comment && r.visibility !== 'private').map((r) => [r.comment, r])).values()].slice(0, 3);

  const SECTIONS: Record<string, () => ReactNode> = {
    Hero: () => (
      <section className="container site-hero">
        <div className="site-hero-copy">
          <p className="eyebrow">{t('site.hero.eyebrow', { city: tenant.city })}</p>
          <h1>{bi(manifesto.lead)} <em>{bi(manifesto.emphasis)}</em></h1>
          <p className="site-lead muted">{t('site.hero.body', { city: tenant.city, mats: tenant.studio.mats, classes: tenant.studio.classesPerDay })}</p>
          <div className="row wrap">
            <Link to="/site/plans"><Button size="lg">{t('site.hero.cta', { price: trialPrice })}</Button></Link>
            <Link to="/site/schedule"><Button size="lg" variant="secondary">{t('site.hero.cta2')}</Button></Link>
          </div>
        </div>
        <MediaSlot
          ratio="21:9" kind="video" movement="arde" slotKey="site.hero"
          label={t('site.hero.media')}
          overlay={<span className="site-hero-chip">{bi(taglines.life)}</span>}
        />
      </section>
    ),
    Movements: () => (
      <section className="container site-section">
        <SectionHead title={t('site.movements.title')} body={t('site.movements.body')} />
        <div className="grid grid-4">
          {(Object.keys(movements) as Movement[]).map((mv) => (
            <div key={mv} className={`mvcard mvcard-${mv}`}><h3>{movements[mv].label}</h3><p className="small">{t(`site.mv.${mv}`)}</p></div>
          ))}
        </div>
      </section>
    ),
    Classes: () => (
      <section className="container site-section">
        <SectionHead eyebrow={bi(classesIntro.eyebrow)} title={t('site.classes.title')} action={<Link to="/site/classes">{t('site.classes.all')} →</Link>} />
        <div className="site-classgrid">
          {classOrder.map((slug) => {
            const c = classes[slug];
            return (
              <Link key={slug} to={`/site/classes/${slug}`} className={`site-classcard mvcard-${c.movement}`}>
                <p className="eyebrow">{bi(c.eyebrow)}</p>
                <h3>{bi(c.name)}</h3>
                <p className="small">{bi(c.summary)}</p>
                <span className="site-classcard-more">{t('site.classes.read')} →</span>
              </Link>
            );
          })}
        </div>
      </section>
    ),
    TodayClasses: () => (
      <section className="container site-section">
        <SectionHead title={t('site.today.title')} action={<Link to="/site/schedule">{t('site.today.all')} →</Link>} />
        <Card padding="sm">
          {today.length === 0 && <p className="muted" style={{ padding: 16 }}>{t('site.today.empty')}</p>}
          {today.map(({ session: s, modality: m, teacher: te }) => (
            <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} onClick={() => nav('/site/schedule')} />
          ))}
        </Card>
      </section>
    ),
    ValueModel: () => (
      <section className="container site-section">
        <SectionHead title={t('site.value.title')} body={t('site.value.body')} action={<Link to="/site/plans">{t('site.value.all')} →</Link>} />
        <div className="site-valuegrid">
          {FAMILIES.map((fam) => (
            <Card key={fam} eyebrow={bi(FAMILY_RATIONALE[fam].role)} title={bi(FAMILY_LABEL[fam])} tone={fam === 'membresia' ? 'highlight' : 'surface'}>
              <p className="small muted">{bi(FAMILY_RATIONALE[fam].subtitle)}</p>
            </Card>
          ))}
        </div>
      </section>
    ),
    Philosophy: () => (
      <section className="container site-section">
        <div className="site-panel">
          <p className="eyebrow">{bi(philosophy.eyebrow)}</p>
          <h2>{bi(philosophy.title)}</h2>
          <hr className="site-panel-rule" />
          <p className="site-quote">{bi(philosophy.pullQuote)}</p>
          <div className="site-panel-cols">
            <p>{bi(philosophy.paragraphs[0])}</p>
            <p>{bi(philosophy.paragraphs[2])}</p>
          </div>
          <p><Link to="/site/about">{t('site.philosophy.more')} →</Link></p>
        </div>
      </section>
    ),
    Teachers: () => (
      <section className="container site-section">
        <SectionHead title={t('site.teachers.title')} body={t('site.teachers.body')} action={<Link to="/site/teachers">{t('site.teachers.title')} →</Link>} />
        <div className="grid grid-4">
          {teachers.map((te) => <TeacherCard key={te.id} name={te.display_name} bio={te.bio} rating={te.rating_avg} specialties={te.specialties.map((id) => ({ label: modName(id), movement: modalities.find((m) => m.id === id)?.movement ?? 'fluye' }))} onClick={() => nav('/site/teachers')} />)}
        </div>
      </section>
    ),
    Testimonials: () => (
      <section className="container site-section">
        <SectionHead title={t('site.testimonials.title')} body={t('site.testimonials.body')} />
        {quotes.length === 0 ? (
          <Card><p className="muted small">{t('site.testimonials.empty')}</p></Card>
        ) : (
          <div className="grid grid-3">
            {quotes.map((r) => (
              <Card key={r.id} className="site-testi">
                <p className="xs" aria-label={`${r.rating}/5`}>{'★'.repeat(r.rating)}<span className="muted">{'★'.repeat(5 - r.rating)}</span></p>
                <p className="site-testi-quote">“{r.comment}”</p>
                <p className="xs muted">{t('site.testimonials.member')}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    ),
    FirstStep: () => (
      <section className="container site-section">
        <div className="site-panel site-cta">
          <div className="site-cta-copy">
            <p className="eyebrow">{t('site.first.eyebrow')}</p>
            <h2>{t('site.first.title')}</h2>
            <p>{t('site.first.body', { price: trialPrice })}</p>
          </div>
          <div className="row wrap">
            <Link to="/site/plans"><Button size="lg">{t('site.first.cta')}</Button></Link>
            <a href={waHref(bi({ es: 'Hola HOY, quiero una clase de prueba.', en: 'Hi HOY, I would like a trial class.' }))} target="_blank" rel="noreferrer">
              <Button size="lg" variant="secondary">{t('site.first.cta2')}</Button>
            </a>
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
