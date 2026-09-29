import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useVisibleModalities } from '../../admin/settings';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow } from '../../../data/schema';
import { classes, classOrder, type ClassSlug } from '../../../tenant/brand';
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
  // 0039: grouped by the five brand classes (classOrder); a modality no class essay covers (Morning Flow) closes the list.
  const groups: { key: string; slug?: ClassSlug; list: ModalityRow[] }[] = [
    ...classOrder.map((slug) => ({ key: slug, slug, list: classes[slug].modalitySlugs.map((s) => rows.find((m) => m.slug === s)).filter((m): m is ModalityRow => !!m) })),
    { key: 'other', list: rows.filter((m) => !classForModality(m.slug)) },
  ];

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.modalities.title')} body={t('site.modalities.body')} />,
    ModalityGrid: () => (
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="stack">
          {groups.map((g) => {
            if (!g.list.length) return null;
            return (
              <div key={g.key} className="stack-sm">
                {g.slug ? <Chip tone={classes[g.slug].tone} dot>{bi(classes[g.slug].name)}</Chip> : <Chip>{t('site.modalities.other')}</Chip>}
                <div className="grid grid-3">
                  {g.list.map((m) => {
                    const slug = classForModality(m.slug);
                    return (
                      <Card key={m.id} title={lang === 'es' ? m.name_es : m.name_en} actions={m.heated ? <Badge tone="warn">{t('site.modalities.heated')}</Badge> : undefined}>
                        <p className="small muted">{bi(m.description)}</p>
                        <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('site.modalities.intensity')} {'●'.repeat(m.intensity)}{'○'.repeat(5 - m.intensity)} · {t('core.common.min', { n: m.duration_min })}</p>
                        {slug && <p className="small" style={{ marginTop: 'var(--sp-md)' }}><Link to={`/site/classes/${slug}`}>{t('site.modalities.classLink', { name: bi(classes[slug].name) })} →</Link></p>}
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
          <p className="small muted" style={{ marginBottom: 'var(--sp-md)' }}>{t('site.modalities.essays')}</p>
          <div className="row wrap">
            {classOrder.map((s) => (
              <Link key={s} to={`/site/classes/${s}`}><Chip tone={classes[s].tone} dot>{bi(classes[s].name)}</Chip></Link>
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
