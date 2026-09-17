import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useVisibleModalities } from '../../admin/settings';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow } from '../../../data/schema';
import { classes, classOrder, type ClassSlug } from '../../../tenant/brand';
import { movements, type Movement } from '../../../design/tokens';
import { Card } from '../../../components/molecule/Card/Card';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Badge } from '../../../components/atom/Badge/Badge';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';

/** Which class essay covers a modality slug (brand.classes[*].modalitySlugs is the join). */
const classForModality = (slug: string): ClassSlug | undefined =>
  classOrder.find((c) => classes[c].modalitySlugs.includes(slug));

export function ModalitiesPage() {
  const { t, lang, bi } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.modalities);
  const { rows: rowsAll } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const rows = useVisibleModalities(rowsAll); // 0018: M-08f decides whether Respiración has its own row

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.modalities.title')} body={t('site.modalities.body')} />,
    ModalityGrid: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="stack">
          {(Object.keys(movements) as Movement[]).map((mv) => {
            const list = rows.filter((m) => m.movement === mv);
            if (!list.length) return null;
            return (
              <div key={mv} className="stack-sm">
                <Chip movement={mv} dot>{movements[mv].label}</Chip>
                <div className="grid grid-3">
                  {list.map((m) => {
                    const slug = classForModality(m.slug);
                    return (
                      <Card key={m.id} title={lang === 'es' ? m.name_es : m.name_en} actions={m.heated ? <Badge tone="warn">{t('site.modalities.heated')}</Badge> : undefined}>
                        <p className="small muted">{bi(m.description)}</p>
                        <p className="xs muted" style={{ marginTop: 8 }}>{t('site.modalities.intensity')} {'●'.repeat(m.intensity)}{'○'.repeat(5 - m.intensity)} · {t('core.common.min', { n: m.duration_min })}</p>
                        {slug && <p className="small" style={{ marginTop: 10 }}><Link to={`/site/classes/${slug}`}>{t('site.modalities.classLink', { name: bi(classes[slug].name) })} →</Link></p>}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    ),
    ClassLinks: () => (
      <section className="container site-section">
        <Card eyebrow={t('site.classes.title')}>
          <p className="small muted" style={{ marginBottom: 12 }}>{t('site.modalities.essays')}</p>
          <div className="row wrap">
            {classOrder.map((s) => (
              <Link key={s} to={`/site/classes/${s}`}><Chip movement={classes[s].movement} dot>{bi(classes[s].name)}</Chip></Link>
            ))}
          </div>
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
