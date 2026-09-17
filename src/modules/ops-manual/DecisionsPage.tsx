import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { Badge } from '../../components/atom/Badge/Badge';
import { ManualSidebar } from './ManualPage';
import { chaptersFor, decisionsIn } from './manualIndex';
import './manual.css';

/** K-04 — every `DECISIÓN PENDIENTE` across the manual, grouped by chapter. */
export function DecisionsPage() {
  const { t, lang } = useI18n();
  const groups = chaptersFor(lang).map((c) => ({ chapter: c, items: decisionsIn(c) })).filter((g) => g.items.length);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  let running = 0;
  return (
    <div className="manual">
      <ManualSidebar active="decisions" />
      <article className="manual-main">
        <div className="page-head">
          <div><h1>{t('manual.decisions')}</h1><p className="muted small">{t('manual.decisions.intro')}</p></div>
          <Badge tone="warn">{t('manual.decisions.count', { n: total })}</Badge>
        </div>
        {total === 0 && <p className="muted">{t('manual.decisions.none')}</p>}
        <div className="manual-decisions">
          {groups.map(({ chapter, items }) => (
            <section key={chapter.slug} className="manual-decision-group">
              <h2 className="row wrap"><span className="manual-num">{chapter.number}</span>{chapter.title} <Link className="small" to={chapter.slug === '00-index' ? '/manual' : `/manual/${chapter.slug}`}>{t('manual.openChapter')} →</Link></h2>
              {items.map((d) => { running += 1; return (
                <div key={d.index} className="manual-decision">
                  <span className="manual-decision-n">{String(running).padStart(2, '0')}</span>
                  <div><div>{d.text}</div>{d.section && <div className="manual-decision-section">{t('manual.decisions.inChapter')} {chapter.number} · {d.section}</div>}</div>
                </div>
              ); })}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
