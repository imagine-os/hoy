import { Fragment, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow } from '../../../data/schema';
import { formatCOP } from '../../../i18n/format';
import { priceItem } from '../../../tenant/pricing';
import { brandClass, classes, classOrder, taglines } from '../../../tenant/brand';
import { movements } from '../../../design/tokens';
import { Button } from '../../../components/atom/Button/Button';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Card } from '../../../components/molecule/Card/Card';
import { MediaSlot } from '../../../components/molecule/MediaSlot/MediaSlot';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

/** W-08 — one class essay, joined to its modality rows through brand.classes[slug].modalitySlugs. */
export function ClassDetailPage() {
  const { slug = '' } = useParams();
  const { t, bi, lang } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.classDetail);
  const { rows: modalities } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const c = brandClass(slug);
  const trial = priceItem('trial');
  const trialPrice = trial?.price != null ? formatCOP(trial.price, lang) : '';

  if (!c) {
    return (
      <SiteShell>
        <PageHead title={bi({ es: 'Clase no encontrada', en: 'Class not found' })} body={t('site.classes.notFound')} />
        <section className="container site-section" style={{ paddingTop: 0 }}>
          <div className="row wrap">
            {classOrder.map((s) => <Link key={s} to={`/site/classes/${s}`}><Chip movement={classes[s].movement} dot>{bi(classes[s].name)}</Chip></Link>)}
          </div>
        </section>
      </SiteShell>
    );
  }

  const mods = modalities.filter((m) => c.modalitySlugs.includes(m.slug));
  const primary = mods[0];
  const bring = [...new Set(c.heated ? ['towel', 'water', ...c.bring] : c.bring)];

  const SECTIONS: Record<string, () => ReactNode> = {
    Hero: () => (
      <>
        <PageHead eyebrow={bi(c.eyebrow)} title={bi(c.name)} body={bi(c.summary)} back={{ to: '/site/classes', label: t('site.classes.back') }} />
        <section className="container site-section" style={{ paddingTop: 0 }}>
          <MediaSlot ratio="16:9" kind="photo" movement={c.movement} label={t('site.classes.media', { name: bi(c.name) })} brief={c.brief} />
        </section>
      </>
    ),
    Essay: () => (
      <section className="container site-section">
        <div className="site-prose">{c.paragraphs.map((p, i) => <p key={i}>{bi(p)}</p>)}</div>
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
              <div className="site-fact"><span className="eyebrow">{t('site.classes.movement')}</span><strong>{movements[c.movement].label}</strong></div>
            </div>
          ) : (
            <p className="small muted">{t('site.classes.factsPending')}</p>
          )}
          {mods.length > 0 && (
            <div className="row wrap" style={{ marginTop: 16 }}>
              {mods.map((m) => <Chip key={m.id} movement={m.movement} dot>{lang === 'es' ? m.name_es : m.name_en}</Chip>)}
              {c.heated && <Badge tone="warn">{t('site.modalities.heated')}</Badge>}
            </div>
          )}
        </Card>
      </section>
    ),
    Bring: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.classes.bring')}>
          <ul className="site-bring small">
            {bring.map((k) => <li key={k}>{t(`site.classes.bring.${k}`)}</li>)}
          </ul>
        </Card>
      </section>
    ),
    Other: () => (
      <section className="container site-section">
        <p className="eyebrow">{t('site.classes.other')}</p>
        <div className="site-classgrid" style={{ marginTop: 12 }}>
          {classOrder.filter((s) => s !== slug).map((s) => (
            <Link key={s} to={`/site/classes/${s}`} className={`site-classcard mvcard-${classes[s].movement}`}>
              <p className="eyebrow">{bi(classes[s].eyebrow)}</p>
              <h3>{bi(classes[s].name)}</h3>
              <span className="site-classcard-more">{t('site.classes.read')} →</span>
            </Link>
          ))}
        </div>
      </section>
    ),
    CTA: () => (
      <section className="container site-section">
        <div className="site-panel site-cta">
          <div className="site-cta-copy">
            <p className="eyebrow">{t('site.first.eyebrow')}</p>
            <h2>{bi(taglines.life)}</h2>
            <p>{t('site.first.body', { price: trialPrice })}</p>
          </div>
          <div className="row wrap">
            <Link to="/site/plans"><Button size="lg">{t('site.first.cta')}</Button></Link>
            <Link to={`/site/schedule?movement=${c.movement}`}><Button size="lg" variant="secondary">{t('site.classes.schedule')}</Button></Link>
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
