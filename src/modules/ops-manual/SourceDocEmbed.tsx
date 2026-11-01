import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { SourceEmbed } from '../../components/organism/SourceEmbed/SourceEmbed';
import { useSourceView, type SourceDoc } from './sources';

/**
 * A source document's embed (K-05 and `{{source:<id>}}` in a chapter). In production (lane Y6) its PDF comes through the
 * server's gate, so the embed appears once that blob is ready; review builds render at once from public/source/.
 */
export function SourceDocEmbed({ doc, level, open, children }: { doc: SourceDoc; level: 2 | 3 | 4; open?: boolean; children?: ReactNode }) {
  const { t } = useI18n();
  const view = useSourceView(doc);
  if (view === null) return <p className="muted small" data-source-loading={doc.id}>{t('core.common.loading')}</p>;
  if (view === false) return <p className="muted small" data-source-unavailable={doc.id}>{t('manual.source.unavailable')}</p>;
  return <SourceEmbed doc={view} level={level} open={open}>{children}</SourceEmbed>;
}
