import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { tenant } from '../../../tenant/tenant';
import { about, philosophy, taglines } from '../../../tenant/brand';
import { Card } from '../../../components/molecule/Card/Card';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Button } from '../../../components/atom/Button/Button';
import { MediaSlot } from '../../../components/molecule/MediaSlot/MediaSlot';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

/** W-02 — the brand's own words, from src/tenant/brand.ts. */
export function AboutPage() {
  const { t, bi } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.about);

  const SECTIONS: Record<string, () => ReactNode> = {
    Head: () => <PageHead eyebrow={bi(about.eyebrow)} title={bi(about.title)} body={bi(taglines.start)} />,
    About: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="site-prose">
          {about.paragraphs.map((p, i) => <p key={i}>{bi(p)}</p>)}
        </div>
        <div className="row wrap" style={{ marginTop: 24 }}>
          <Link to="/site/classes"><Button>{t('site.about.classes')}</Button></Link>
          <Link to="/site/plans"><Button variant="secondary">{t('site.plans.all')}</Button></Link>
        </div>
      </section>
    ),
    Values: () => (
      <section className="container site-section">
        <p className="eyebrow">{t('site.about.values')}</p>
        <div className="row wrap" style={{ marginTop: 8 }}>
          {about.values.map((v, i) => <Chip key={i} dot movement={(['enraiza', 'fluye', 'arde', 'libera'] as const)[i % 4]}>{bi(v)}</Chip>)}
        </div>
      </section>
    ),
    Media: () => (
      <section className="container site-section">
        <div className="site-media-cap">
          <MediaSlot ratio="4:3" kind="photo" slotKey="site.about" label={t('site.about.media')} />
        </div>
      </section>
    ),
    Philosophy: () => (
      <section className="container site-section">
        <div className="site-panel">
          <p className="eyebrow">{bi(philosophy.eyebrow)}</p>
          <h2>{bi(philosophy.title)}</h2>
          <hr className="site-panel-rule" />
          {philosophy.paragraphs.map((p, i) => <p key={i}>{bi(p)}</p>)}
          <p className="site-quote">{bi(taglines.life)}</p>
        </div>
      </section>
    ),
    BrandBoard: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.about.board')} padding="sm">
          <img src={tenant.brand.lockup.sand} alt={`${tenant.name} lockup`} style={{ width: '100%', borderRadius: 'var(--r-sm)' }} />
          <p className="xs muted" style={{ marginTop: 8 }}>{t('site.about.boardNote')}</p>
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
