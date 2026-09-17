import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow } from '../../../data/schema';
import { formatCOP } from '../../../i18n/format';
import { priceItem } from '../../../tenant/pricing';
import { classesIntro, classes, classOrder, taglines } from '../../../tenant/brand';
import { movements } from '../../../design/tokens';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Badge } from '../../../components/atom/Badge/Badge';
import { MediaSlot } from '../../../components/molecule/MediaSlot/MediaSlot';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

/** W-07 — "Nuestras clases": the intro plus one rich card per class, all from src/tenant/brand.ts. */
export function ClassesPage() {
  const { t, bi, lang } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.classes);
  const { rows: modalities } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const trial = priceItem('trial');
  const trialPrice = trial?.price != null ? formatCOP(trial.price, lang) : '';

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead eyebrow={bi(classesIntro.eyebrow)} title={bi(classesIntro.title)} body={bi(classesIntro.paragraphs[0])} />,
    Intro: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="site-prose"><p>{bi(classesIntro.paragraphs[1])}</p></div>
      </section>
    ),
    ClassList: () => (
      <section className="container site-section">
        <div className="stack" style={{ gap: 'var(--sp-16)' }}>
          {classOrder.map((slug) => {
            const c = classes[slug];
            const mods = modalities.filter((m) => c.modalitySlugs.includes(m.slug));
            return (
              <article key={slug} className="site-classrow">
                <div className="stack">
                  <p className="eyebrow">{bi(c.eyebrow)}</p>
                  <h2>{bi(c.name)}</h2>
                  <p className="site-lead muted">{bi(c.summary)}</p>
                  <p className="small">{bi(c.paragraphs[0])}</p>
                  <div className="row wrap">
                    <Chip movement={c.movement} dot>{movements[c.movement].label}</Chip>
                    {c.heated && <Badge tone="warn">{t('site.modalities.heated')}</Badge>}
                    {mods.map((m) => <Chip key={m.id}>{t('core.common.min', { n: m.duration_min })}</Chip>)}
                  </div>
                  <div>
                    <Link to={`/site/classes/${slug}`}><Button>{t('site.classes.read')}</Button></Link>
                  </div>
                </div>
                <div className="site-classrow-media">
                  <MediaSlot ratio="16:9" kind="photo" movement={c.movement} slotKey={`site.classes.${slug}`} label={t('site.classes.media', { name: bi(c.name) })} brief={c.brief} />
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
            <h2>{bi(taglines.start)}</h2>
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
