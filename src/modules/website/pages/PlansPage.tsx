import { Fragment, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { COMING_SOON_FAMILIES, FAMILY_LABEL, FAMILY_RATIONALE, FAMILY_ROLE, pricing, priceItem } from '../../../tenant/pricing';
import { tenant } from '../../../tenant/tenant';
import { usePolicy, useWhatsappLink } from '../../admin/settings';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { MembershipCard } from '../../../components/molecule/MembershipCard/MembershipCard';
import { formatCOP } from '../../../i18n/format';
import { Link } from 'react-router-dom';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';



/**
 * P-01 — prices, names and the "Por qué existe" rationale all come from src/tenant/pricing.ts.
 * The IVA note reads the M-08 tax policy through usePolicy() (read-only).
 */
export function PlansPage() {
  const { t, bi, lang } = useI18n();
  // 0047: Especiales and the space rental are a `specials` handoff (M-08a contacts; front desk by default).
  const wa = useWhatsappLink();
  const specialsNote = wa.resolve('specials').note;
  const nav = useNavigate();
  const { sections, isVisible } = useLayout(siteSpecs.plans);
  const { tax } = usePolicy();
  const buy = (id: string) => nav(`/auth/sign-in?next=${encodeURIComponent(`/app/plans?plan=${id}`)}`);

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.plans.title')} body={t('site.plans.body', { mats: tenant.studio.mats, classes: tenant.studio.classesPerDay })} />,
    Families: () => <>
      <section className="container site-section" style={{ paddingTop: 0 }}><div className="plans-heading"><p className="eyebrow">{t('site.plans.club')}</p><h2>{t('site.plans.membershipTitle')}</h2><p className="muted">{t('site.plans.membershipBody')}</p></div><div className="plans-memberships">{pricing.filter(p => p.family === 'membresia').map(p => <MembershipCard key={p.id} item={p} saving={(priceItem('monthly')?.price ?? 0) * 12 - (priceItem('annual')?.price ?? 0)} onSelect={() => buy(p.id)}/>)}</div></section>
      <section className="container site-section"><div className="site-section-top"><div><p className="eyebrow">{bi(FAMILY_LABEL.bienvenida)}</p><h2>{t('site.plans.passesTitle')}</h2><p className="muted">{t('site.plans.passesBody')}</p></div></div><div className="plans-pass-grid">{pricing.filter(p => p.family === 'bienvenida').map(p => <article className="plans-pass" key={p.id} data-tone="sun"><span className="eyebrow">{t('site.plans.classCount', { n: p.credits ?? 1 })}</span><h3>{bi(p.name)}</h3><p className="small muted">{bi(p.description)}</p><strong className="plans-pass-price">{formatCOP(p.price ?? 0, lang)}</strong><span className="xs muted">{t('site.plans.validity', { n: p.validityDays ?? 30 })}</span><Button variant="secondary" onClick={() => buy(p.id)}>{t('site.plans.select')}</Button></article>)}</div>
      <div className="plans-secondary">{(['pausas','regalos'] as const).map(fam => <Card key={fam} title={bi(FAMILY_LABEL[fam])}><p className="small muted">{t(`site.plans.${fam}Body`)}</p>{pricing.filter(p => p.family === fam).map(p => <PriceRow key={p.id} item={p} onSelect={() => p.id === 'guest' ? nav('/auth/sign-in?next=%2Fapp%2Finvite') : p.id === 'bono' ? nav('/auth/sign-in?next=%2Fapp%2Fgift') : buy(p.id)}/>)}</Card>)}</div></section>
      <section className="container site-section"><Card title={t('site.plans.spaceTitle')}><p className="small muted">{t('site.plans.spaceBody')}</p>{pricing.filter(p => p.family === 'espacio').map(p => <PriceRow key={p.id} item={p}/>)}<a className="btn btn-secondary" href={wa.link('specials', t('site.plans.specials.wa'))} target="_blank" rel="noreferrer">{t('site.plans.specials.cta')} ↗</a>{specialsNote && <p className="xs muted">{bi(specialsNote)}</p>}</Card></section>
      {/* 0038: announced families (no price, no checkout, no link) — read from src/tenant/pricing.ts */}
      {COMING_SOON_FAMILIES.map((fam) => <section className="container site-section" style={{ paddingTop: 0 }} key={fam} data-coming-soon={fam}><Card eyebrow={bi(FAMILY_ROLE[fam])} title={bi(FAMILY_LABEL[fam])} tone="muted"><p className="small muted" style={{ maxWidth: '60ch' }}>{bi(FAMILY_RATIONALE[fam].subtitle)}</p></Card></section>)}
    </>,
    // Especiales (0017): what a plan cannot hold is arranged directly with the studio — no checkout, a conversation.
    Specials: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <Card eyebrow={t('site.plans.specials.eyebrow')} title={t('site.plans.specials.title')} tone="muted" className="site-specials">
          <p className="small" style={{ maxWidth: '60ch' }}>{t('site.plans.specials.body')}</p>
          <div className="stack-sm" style={{ marginTop: 'var(--sp-lg)' }}>
            <div className="row wrap"><a href={wa.link('specials', t('site.plans.specials.wa'))} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary">{t('site.plans.specials.cta')}</Button></a></div>
            {specialsNote && <p className="xs muted">{bi(specialsNote)}</p>}
          </div>
        </Card>
      </section>
    ),
    Discipline: () => <section className="container site-section"><div className="plans-visit"><div><p className="eyebrow">{t('site.plans.visitLabel')}</p><h2>{t('site.plans.visitTitle')}</h2><p className="muted">{t('site.plans.visitBody', { n: tenant.studio.mats })}</p></div><Link to="/site/schedule" className="btn btn-secondary">{t('site.nav.schedule')} ↗</Link></div></section>,
    TaxNote: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.plans.taxTitle')}>
          <p className="small">{tax.pricesIncludeIva ? t('site.plans.taxIncluded', { pct: tax.ivaPct }) : t('site.plans.taxExcluded', { pct: tax.ivaPct })}</p>
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
