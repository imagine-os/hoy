import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useActions } from '../../actions';
import { Badge } from '../../components/atom/Badge/Badge';
import { Icon } from '../../components/atom/Icon/Icon';
import { SourceEmbed } from '../../components/organism/SourceEmbed/SourceEmbed';
import { ManualSidebar } from './ManualPage';
import { chaptersFor } from './manualIndex';
import { chapterIcon, MANUAL_ICON } from './chapterIcons';
import { SOURCES, sourceView } from './sources';
import { useSourceHandlers } from './manualActions';
import { sourcesSpec } from './specs';
import './manual.css';

/** K-05 — the owner's source documents with an inline viewer and the chapters that cite each one. */
export function SourcesPage() {
  const { t, lang } = useI18n();
  const [params] = useSearchParams();
  const focus = params.get('doc');
  const byNumber = new Map(chaptersFor(lang).map((c) => [c.number, c]));
  useActions(sourcesSpec, useSourceHandlers());
  useEffect(() => { if (focus) document.getElementById(`src-${focus}`)?.scrollIntoView({ block: 'start' }); }, [focus]);
  return (
    <div className="manual">
      <ManualSidebar active="sources" />
      <article className="manual-main">
        <div className="page-head">
          <div className="manual-page-title">
            <span className="manual-chapter-icon" aria-hidden><Icon name={MANUAL_ICON.sources} size={28} /></span>
            <div><h1>{t('manual.sources.title')}</h1><p className="muted small">{t('manual.sources.lead')}</p></div>
          </div>
          <Badge tone="primary">{t('manual.sources.count', { n: SOURCES.length })}</Badge>
        </div>
        {SOURCES.map((s) => (
          <div key={s.id} id={`src-${s.id}`} className="manual-source">
            <SourceEmbed doc={sourceView(s)} level={2} open={focus === s.id}>
              <span className="eyebrow">{t('manual.sources.cited')}</span>
              {s.chapters.map((n) => byNumber.get(n)).filter((c) => !!c).map((c) => (
                <Link key={c!.slug} className="manual-source-chip" to={`/manual/${c!.slug}`}><Icon name={chapterIcon(c!.number)} size={16} /><span className="manual-num">{c!.number}</span>{c!.title}</Link>
              ))}
            </SourceEmbed>
          </div>
        ))}
        <p className="xs muted">{t('manual.sources.foot')}</p>
      </article>
    </div>
  );
}
