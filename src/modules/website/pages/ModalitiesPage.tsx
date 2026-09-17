import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import type { ModalityRow } from '../../../data/schema';
import { movements, type Movement } from '../../../design/tokens';
import { Card } from '../../../components/molecule/Card/Card';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Badge } from '../../../components/atom/Badge/Badge';
import { PageHead, SiteShell } from '../SiteShell';

export function ModalitiesPage() {
  const { t, lang, bi } = useI18n();
  const { rows } = useTable<ModalityRow>('modalities', { where: { active: true } });
  return (
    <SiteShell>
      <PageHead title={t('site.modalities.title')} body={t('site.modalities.body')} />
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="stack">
          {(Object.keys(movements) as Movement[]).map((mv) => {
            const list = rows.filter((m) => m.movement === mv);
            if (!list.length) return null;
            return (
              <div key={mv} className="stack-sm">
                <Chip movement={mv} dot>{movements[mv].label}</Chip>
                <div className="grid grid-3">
                  {list.map((m) => (
                    <Card key={m.id} title={lang === 'es' ? m.name_es : m.name_en} actions={m.heated ? <Badge tone="warn">{t('site.modalities.heated')}</Badge> : undefined}>
                      <p className="small muted">{bi(m.description)}</p>
                      <p className="xs muted" style={{ marginTop: 8 }}>{t('site.modalities.intensity')} {'●'.repeat(m.intensity)}{'○'.repeat(5 - m.intensity)} · {t('core.common.min', { n: m.duration_min })}</p>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </SiteShell>
  );
}
