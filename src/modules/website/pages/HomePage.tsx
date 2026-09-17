import { Fragment, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { TeacherRow, ModalityRow } from '../../../data/schema';
import { tenant } from '../../../tenant/tenant';
import { pricing } from '../../../tenant/pricing';
import { movements, type Movement } from '../../../design/tokens';
import { Button } from '../../../components/atom/Button/Button';
import { Card } from '../../../components/molecule/Card/Card';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { TeacherCard } from '../../../components/organism/TeacherCard/TeacherCard';
import { SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';
import { useTodaySessions } from '../hooks';

export function HomePage() {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const { sections, isVisible } = useLayout(siteSpecs.home);
  const today = useTodaySessions();
  const { rows: teachers } = useTable<TeacherRow>('teachers', { where: { active: true }, limit: 4 });
  const { rows: modalities } = useTable<ModalityRow>('modalities');
  const modName = (id: string) => { const m = modalities.find((x) => x.id === id); return m ? (lang === 'es' ? m.name_es : m.name_en) : ''; };

  const SECTIONS: Record<string, () => ReactNode> = {
    Hero: () => (
      <section className="container site-hero">
        <div className="site-hero-copy">
          <p className="eyebrow">{t('site.hero.eyebrow', { city: tenant.city })}</p>
          <h1>{t('site.hero.title')}</h1>
          <p className="site-lead muted">{t('site.hero.body', { mats: tenant.studio.mats })}</p>
          <div className="row wrap">
            <Link to="/site/plans"><Button size="lg">{t('site.hero.cta')}</Button></Link>
            <Link to="/site/schedule"><Button size="lg" variant="secondary">{t('site.hero.cta2')}</Button></Link>
          </div>
        </div>
        <div className="site-hero-art" aria-hidden>
          <div className="site-hero-rings"><span /><span /><span /></div>
          <img src={tenant.brand.wordmark.cream} alt="" />
        </div>
      </section>
    ),
    Movements: () => (
      <section className="container site-section">
        <div className="site-section-head"><h2>{t('site.movements.title')}</h2><p className="muted">{t('site.movements.body')}</p></div>
        <div className="grid grid-4">
          {(Object.keys(movements) as Movement[]).map((mv) => (
            <div key={mv} className={`mvcard mvcard-${mv}`}><h3 style={{ color: `var(--mv-${mv}-fg)` }}>{movements[mv].label}</h3><p className="small">{t(`site.mv.${mv}`)}</p></div>
          ))}
        </div>
      </section>
    ),
    TodayClasses: () => (
      <section className="container site-section">
        <div className="site-section-head"><h2>{t('site.today.title')}</h2></div>
        <Card padding="sm">
          {today.length === 0 && <p className="muted" style={{ padding: 16 }}>{t('site.today.empty')}</p>}
          {today.map(({ session: s, modality: m, teacher: te }) => (
            <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} onClick={() => nav('/site/schedule')} />
          ))}
        </Card>
      </section>
    ),
    PlansTeaser: () => (
      <section className="container site-section">
        <div className="site-section-head"><h2>{t('site.plans.title')}</h2><p className="muted">{t('site.plans.body')}</p></div>
        <div className="grid grid-2">
          <Card title={bi({ es: 'Bienvenida', en: 'Welcome' })}>{pricing.filter((p) => p.family === 'bienvenida').map((p) => <PriceRow key={p.id} item={p} />)}</Card>
          <Card title={bi({ es: 'Membresía', en: 'Membership' })} tone="highlight">{pricing.filter((p) => p.family === 'membresia').map((p) => <PriceRow key={p.id} item={p} />)}</Card>
        </div>
        <div style={{ marginTop: 16 }}><Link to="/site/plans">{t('site.plans.all')} →</Link></div>
      </section>
    ),
    TeachersTeaser: () => (
      <section className="container site-section">
        <div className="site-section-head"><h2>{t('site.teachers.title')}</h2><p className="muted">{t('site.teachers.body')}</p></div>
        <div className="grid grid-4">
          {teachers.map((te) => <TeacherCard key={te.id} name={te.display_name} bio={te.bio} rating={te.rating_avg} specialties={te.specialties.map((id) => ({ label: modName(id), movement: modalities.find((m) => m.id === id)?.movement ?? 'fluye' }))} onClick={() => nav('/site/teachers')} />)}
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
