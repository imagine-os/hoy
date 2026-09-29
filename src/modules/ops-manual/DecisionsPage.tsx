import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useActions } from '../../actions';
import { Badge } from '../../components/atom/Badge/Badge';
import { Icon } from '../../components/atom/Icon/Icon';
import { ManualSidebar } from './ManualPage';
import { chaptersFor, decisionsIn, partOf } from './manualIndex';
import { chapterIcon, partIcon, MANUAL_ICON } from './chapterIcons';
import { RequestsPanel } from './editing';
import { isLead, useRequests } from './manualData';
import { useRequestHandlers, useSourceHandlers } from './manualActions';
import { decisionsSpec } from './specs';
import { useLens } from './lens';
import './manual.css';

/** A decision line is one markdown paragraph; the list shows it as plain text (emphasis and code marks stripped). */
const plain = (md: string) => md.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

/** K-04 — the team's change requests (for coordination and up) and every `DECISIÓN PENDIENTE`, grouped by chapter. */
export function DecisionsPage() {
  const { t, lang, bi } = useI18n();
  const { role } = useSession();
  const { link } = useLens();
  const groups = chaptersFor(lang).map((c) => ({ chapter: c, items: decisionsIn(c) })).filter((g) => g.items.length);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const open = useRequests().filter((r) => r.status === 'open').length;
  const requestHandlers = useRequestHandlers();
  const sourceHandlers = useSourceHandlers();
  useActions(decisionsSpec, useMemo(() => ({ ...requestHandlers, ...sourceHandlers }), [requestHandlers, sourceHandlers]));
  let running = 0;
  return (
    <div className="manual">
      <ManualSidebar active="decisions" />
      <article className="manual-main">
        <div className="page-head">
          <div className="manual-page-title">
            <span className="manual-chapter-icon" aria-hidden><Icon name={MANUAL_ICON.decisions} size={28} /></span>
            <div><h1>{t('manual.decisions.title')}</h1><p className="muted small">{t('manual.decisions.lead')}</p></div>
          </div>
          <div className="row wrap">
            <Badge tone="warn">{t('manual.decisions.count', { n: total })}</Badge>
            {isLead(role) && <Badge tone="primary">{t('manual.req.openCount', { n: open })}</Badge>}
          </div>
        </div>

        <section className="manual-block" aria-labelledby="k04-req">
          <h2 id="k04-req" className="manual-h2 manual-h2-icon"><span className="manual-part-icon" aria-hidden><Icon name={MANUAL_ICON.requests} size={20} /></span>{t('manual.req.panel')}</h2>
          <p className="muted small">{t('manual.req.panelLead')}</p>
          <RequestsPanel />
        </section>

        <section className="manual-block" aria-labelledby="k04-dec">
          <h2 id="k04-dec" className="manual-h2 manual-h2-icon"><span className="manual-part-icon" aria-hidden><Icon name={MANUAL_ICON.decisions} size={20} /></span>{t('manual.decisions')}</h2>
          <p className="muted small">{t('manual.decisions.intro')}</p>
          {total === 0 && <p className="muted">{t('manual.decisions.none')}</p>}
          <div className="manual-decisions">
            {groups.map(({ chapter, items }) => {
              const part = partOf(chapter.part);
              return (
                <section key={chapter.slug} className="manual-decision-group">
                  {part && <div className="eyebrow manual-nav-part"><Icon name={partIcon(chapter.part)} size={14} />{t('manual.part')} {chapter.part} · {bi(part.label)}</div>}
                  <h3 className="row wrap manual-h3"><Icon name={chapterIcon(chapter.number)} size={18} /><span className="manual-num">{chapter.number}</span>{chapter.title} <Link className="small" to={link(`/manual/${chapter.slug}`)}>{t('manual.openChapter')} →</Link></h3>
                  {items.map((d) => { running += 1; return (
                    <div key={d.index} className="manual-decision">
                      <span className="manual-decision-n">{String(running).padStart(2, '0')}</span>
                      <div><div>{plain(d.text)}</div>{d.section && <div className="manual-decision-section">{t('manual.decisions.inChapter')} {chapter.number} · {d.section}</div>}</div>
                    </div>
                  ); })}
                </section>
              );
            })}
          </div>
        </section>
      </article>
    </div>
  );
}
