import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { FAMILY_LABEL, FAMILY_RATIONALE, DISCIPLINE, pricing, type PlanFamily } from '../../../tenant/pricing';
import { tenant } from '../../../tenant/tenant';
import { usePolicy } from '../../admin/settings';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { PageHead, SiteShell, useWaHref } from '../SiteShell';
import { siteSpecs } from '../specs';

const ORDER: PlanFamily[] = ['bienvenida', 'membresia', 'pausas', 'regalos', 'espacio'];

/**
 * P-01 — prices, names and the "Por qué existe" rationale all come from src/tenant/pricing.ts.
 * The IVA note reads the M-08 tax policy through usePolicy() (read-only).
 */
export function PlansPage() {
  const { t, bi } = useI18n();
  const waHref = useWaHref();
  const nav = useNavigate();
  const { sections, isVisible } = useLayout(siteSpecs.plans);
  const { tax } = usePolicy();
  const buy = (id: string) => nav(`/auth/sign-in?next=${encodeURIComponent(`/app/plans?plan=${id}`)}`);

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.plans.title')} body={t('site.plans.body', { mats: tenant.studio.mats, classes: tenant.studio.classesPerDay })} />,
    Families: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="grid grid-2">
          {ORDER.map((fam) => {
            const r = FAMILY_RATIONALE[fam];
            return (
              <Card key={fam} eyebrow={bi(r.role)} title={bi(FAMILY_LABEL[fam])} tone={fam === 'membresia' ? 'highlight' : 'surface'} className={fam === 'espacio' ? 'site-span2' : ''}>
                <p className="small" style={{ marginBottom: 12 }}>{bi(r.subtitle)}</p>
                {pricing.filter((p) => p.family === fam).map((p) => <PriceRow key={p.id} item={p} onSelect={fam === 'espacio' ? undefined : () => buy(p.id)} />)}
                <p className="eyebrow" style={{ marginTop: 16 }}>{t('site.plans.why')}</p>
                <p className="small muted" style={{ marginTop: 4 }}>{bi(r.why)}</p>
                {r.note && <p className="xs muted" style={{ marginTop: 8 }}>{bi(r.note)}</p>}
              </Card>
            );
          })}
        </div>
      </section>
    ),
    // Especiales (0017): what a plan cannot hold is arranged directly with the studio — no checkout, a conversation.
    Specials: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <Card eyebrow={t('site.plans.specials.eyebrow')} title={t('site.plans.specials.title')} tone="muted" className="site-specials">
          <p className="small" style={{ maxWidth: '60ch' }}>{t('site.plans.specials.body')}</p>
          <div className="row wrap" style={{ marginTop: 16 }}>
            <a href={waHref(t('site.plans.specials.wa'))} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary">{t('site.plans.specials.cta')}</Button></a>
          </div>
        </Card>
      </section>
    ),
    Discipline: () => (
      <section className="container site-section">
        <div className="site-panel">
          <p className="eyebrow">{t('site.plans.discipline')}</p>
          <div className="site-numbers">
            {DISCIPLINE.numbers.map((n, i) => (
              <div key={i} className="site-number"><strong>{n.value}</strong><span>{bi(n.label)}</span></div>
            ))}
          </div>
          <hr className="site-panel-rule" />
          <p>{bi(DISCIPLINE.paragraph)}</p>
          <p className="site-quote">{bi(DISCIPLINE.tagline)}</p>
        </div>
      </section>
    ),
    TaxNote: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.plans.taxTitle')}>
          <p className="small">{tax.pricesIncludeIva ? t('site.plans.taxIncluded', { pct: tax.ivaPct }) : t('site.plans.taxExcluded', { pct: tax.ivaPct })}</p>
          <p className="xs muted" style={{ marginTop: 6 }}>{t('site.plans.taxSource')}</p>
        </Card>
      </section>
    ),
  };

  return (
    <SiteShell>
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </SiteShell>
  );
}
