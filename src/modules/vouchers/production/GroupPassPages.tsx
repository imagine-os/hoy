import { publicBookingClosed } from '../../../data/publicBookingCutoff';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { dateKey, formatDate, formatTime, fromDateKey } from '../../../i18n/format';
import { useSession } from '../../../auth/SessionProvider';
import { useData } from '../../../data/DataContext';
import type { ClassSessionRow } from '../../../data/schema';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { Card } from '../../../components/molecule/Card/Card';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { ShareLink } from '../../../components/molecule/ShareLink/ShareLink';
import { PageHead } from '../../customer/ui';
import { useNow } from '../../customer/hooks';
import { useSessionsJoined } from '../../website/hooks';
import { queryAll, type CosPort } from '../../transfers/launch/cos';
import { useAction, useLoad } from '../../transfers/launch/useCos';
import { normalizeCode } from './model';
import { joinFailure, joinMessage, joinPass, joinView, myGroupPasses, passCard, passLink, safeOccurrence, type GroupVoucher, type JoinFailure, type PassBookingRow } from './groupPass';

type T = (k: string, v?: Record<string, string | number>) => string;
const longDay = (value: string, lang: 'es' | 'en') => formatDate(/^\d{4}-\d{2}-\d{2}$/.test(value) ? fromDateKey(value) : value, lang, { day: 'numeric', month: 'long', year: 'numeric' });
const shareLabels = (t: T) => ({ link: t('vouchers.group.link'), copy: t('vouchers.group.copy'), copied: t('vouchers.group.copied'), failed: t('vouchers.group.copyFailed') });
interface ClassInfo { id: string; title: string; starts_at: string | null }

/** The classes the member's used passes booked (the timetable is public; a member reads classes of kind `class`). */
async function readMyPasses(cos: CosPort): Promise<{ passes: GroupVoucher[]; classes: Map<string, ClassInfo> }> {
  const passes = await myGroupPasses(cos);
  const ids = [...new Set(passes.flatMap((p) => (p.occurrence ? [p.occurrence] : [])))];
  const recs = ids.length ? await queryAll<{ title?: string; starts_at?: string }>(cos, { entity: 'occurrence', filter: { field: 'id', op: 'in', value: ids } }).catch(() => []) : [];
  return { passes, classes: new Map(recs.map((r) => [r.id, { id: r.id, title: r.data.title ?? '', starts_at: r.data.starts_at ?? null }])) };
}

// ── C-43 · my group passes ───────────────────────────────────────────────────────────────────────────────────────
export function GroupPassesPage() {
  const { t, lang } = useI18n();
  const { state, reload } = useLoad(readMyPasses, []);
  const today = dateKey();
  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('vouchers.group.title')} sub={t('vouchers.group.sub')} />
      {state.status === 'loading' && <EmptyState tone="loading" title={t('core.common.loading')} />}
      {state.status === 'error' && <EmptyState tone="error" title={t('vouchers.group.readError')} action={<Button onClick={reload}>{t('core.common.retry')}</Button>} />}
      {state.status === 'ready' && (state.value.passes.length === 0
        ? <EmptyState title={t('vouchers.group.empty')} body={t('vouchers.group.empty.body')} action={<Link to="/app/plans"><Button variant="secondary">{t('vouchers.group.empty.cta')}</Button></Link>} />
        : <div className="stack" data-testid="group-passes">{state.value.passes.map((p) => {
          const cls = p.occurrence ? state.value.classes.get(p.occurrence) ?? null : null;
          const card = passCard(p, { today, now: Date.now(), cls }), s = card.state;
          return (
            <Card key={p.id} data-group-pass={p.code}>
              <div className="stack-sm">
                <div className="row-between wrap"><code className="mono">{p.code}</code><Badge tone={s === 'unused' ? 'success' : s === 'used' ? 'primary' : 'neutral'}>{t(`vouchers.group.state.${s}`)}</Badge></div>
                <span className="small">{t('vouchers.group.places', { n: card.places })}{card.named ? ` · ${t('vouchers.group.named', card.named)}` : ''}</span>
                {p.occurrence && <span className="small">{t('vouchers.group.class', { cls: cls?.title || t('vouchers.group.classUnknown'), when: cls?.starts_at ? `${formatDate(cls.starts_at, lang)} ${formatTime(cls.starts_at, lang)}` : '' })}</span>}
                {s === 'unused' && <span className="xs muted">{p.valid_until ? t('vouchers.group.until', { date: longDay(p.valid_until, lang) }) : t('vouchers.group.noEnd')}</span>}
                {(s === 'spent' || s === 'closed') && <p className="xs muted">{t(`vouchers.group.state.${s}.body`)}</p>}
                {card.shareUrl && <>
                  <p className="xs muted">{t(s === 'unused' ? 'vouchers.group.share.first' : 'vouchers.group.share.friends')}</p>
                  <ShareLink url={card.shareUrl} labels={shareLabels(t)} />
                </>}
                {card.cta && <div className="row wrap"><Link to={card.cta.path}><Button size="sm" variant={s === 'unused' ? 'primary' : 'secondary'}>{t(card.cta.key)}</Button></Link></div>}
              </div>
            </Card>
          );
        })}</div>)}
    </div>
  );
}

// ── C-44 · join with the code ────────────────────────────────────────────────────────────────────────────────────
/** `/app/pass/:code` (and `?c=<class>` once booked). Signed out, the route guard sends the visitor to sign in and back. */
export function PassJoinPage() {
  const { code: raw } = useParams();
  const [params] = useSearchParams();
  const c = params.get('c');
  const code = normalizeCode(raw);
  const occurrence = safeOccurrence(c);
  // A new link is a new join: nothing carries over from the previous code or class.
  return <JoinScreen key={`${code}/${occurrence ?? ''}`} code={code} occurrence={occurrence} />;
}

function JoinScreen({ code, occurrence }: { code: string; occurrence: string | null }) {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const data = useData();
  const now = useNow(30_000);
  const action = useAction();
  const [picked, setPicked] = useState<string | null>(occurrence);
  const [done, setDone] = useState<PassBookingRow | null>(null);
  const [failure, setFailure] = useState<JoinFailure | null>(null);
  const [named, setNamed] = useState<string | null>(null);
  const sessions = useSessionsJoined(useMemo(() => (s: ClassSessionRow) => s.status === 'scheduled', []));
  // The buyer reads their own pass (its size, whether it is used); a friend's link reads nothing and the server decides.
  const mine = useLoad((cos) => myGroupPasses(cos).then((all) => all.find((p) => p.code === code) ?? null), [code]);
  const own = mine.state.status === 'ready' ? mine.state.value : null;
  // A link shared before the first use, opened after it: the server names the pass's class (pass_occurrence_mismatch).
  const view = useMemo(() => joinView({ code, occurrence, own, named, sessions, now, uncertain: action.uncertain }), [code, occurrence, own, named, sessions, now, action.uncertain]);
  const { target, offered, locked } = view;
  const chosen = (target ? sessions.find((x) => x.session.id === target) : sessions.find((x) => x.session.id === picked)) ?? null;

  const newGroupClosed = view.lead && !!chosen && publicBookingClosed(chosen.session.starts_at);
  const book = (occurrenceId: string) => action.run(async (key) => {
    if (view.lead && sessions.some((x) => x.session.id === occurrenceId && publicBookingClosed(x.session.starts_at))) return;
    setFailure(null);
    try { setDone(await joinPass(data, { personId: user.id, occurrenceId, code }, key)); }
    catch (e) { const f = joinFailure(e); setFailure(f); if (f.named) setNamed(f.named); throw e; }
  });
  const message = joinMessage(action.error, failure?.details ?? null, named);
  const errorText = message ? t(message.key, message.vars) : null;

  if (view.mode === 'bad') return <Shell><Notice tone="warn">{t('vouchers.group.join.badCode')}</Notice></Shell>;
  if (done) {
    const cls = sessions.find((x) => x.session.id === done.session_id)?.session;
    return <Shell>
      <Notice tone="success" title={t('vouchers.group.join.done')} action={<Link to={`/app/booking/${done.id}`}><Button size="sm" variant="secondary">{t('vouchers.group.join.view')}</Button></Link>}>
        {cls ? `${cls.title} · ${formatDate(cls.starts_at, lang)} ${formatTime(cls.starts_at, lang)}` : null}
      </Notice>
      <Card><div className="stack-sm"><p className="small">{t('vouchers.group.share.friends')}</p><ShareLink url={passLink(code, done.session_id)} labels={shareLabels(t)} /></div></Card>
    </Shell>;
  }
  return <Shell>
    <p className="small muted">{t('vouchers.group.join.intro', { code })}</p>
    {own && <p className="small">{t('vouchers.group.places', { n: own.places })}</p>}
    {view.mode === 'take' && target ? <Card>
      <div className="stack-sm">
        <span className="eyebrow">{t('vouchers.group.join.yourClass')}</span>
        {chosen ? <ClassRow title={chosen.session.title} teacher={chosen.teacher?.display_name ?? ''} startsAt={chosen.session.starts_at} durationMin={chosen.modality?.duration_min ?? 60} tone={chosen.modality?.tone ?? 'river'} booked={chosen.session.booked_count} capacity={chosen.session.capacity} availabilityLabel={newGroupClosed ? t('site.calendar.status.public_booking_closed') : undefined} />
          : <p className="small muted">{t('vouchers.group.join.classHidden')}</p>}
        <Button loading={action.busy} disabled={action.busy || newGroupClosed} onClick={() => void book(target)}>{t('vouchers.group.join.take')}</Button>
      </div>
    </Card> : <Card>
      <div className="stack-sm">
        <span className="eyebrow">{t('vouchers.group.join.pick')}</span>
        <p className="xs muted">{t('vouchers.group.join.pickHint')}</p>
        {offered.length === 0 ? <p className="small muted">{t('vouchers.group.join.noClasses')}</p>
          : <div className="stack-sm">{offered.slice(0, 40).map((x) => <div key={x.session.id} data-picked={picked === x.session.id || undefined}>
            <ClassRow title={x.session.title} teacher={x.teacher?.display_name ?? ''} startsAt={x.session.starts_at} durationMin={x.modality?.duration_min ?? 60} tone={x.modality?.tone ?? 'river'} booked={x.session.booked_count} capacity={x.session.capacity} booked_by_me={picked === x.session.id} availabilityLabel={publicBookingClosed(x.session.starts_at) ? t('site.calendar.status.public_booking_closed') : undefined} disabled={locked || action.busy || publicBookingClosed(x.session.starts_at)} onClick={() => { if (locked || publicBookingClosed(x.session.starts_at)) return; setPicked(x.session.id); action.renew(); }} />
          </div>)}</div>}
        {picked && <p className="xs" role="status">{t('vouchers.group.join.picked', { cls: offered.find((x) => x.session.id === picked)?.session.title ?? '' })}</p>}
        <Button loading={action.busy} disabled={action.busy || !picked || newGroupClosed} onClick={() => picked && void book(picked)}>{t('vouchers.group.join.book')}</Button>
      </div>
    </Card>}
    {view.lead && <Notice tone="info" data-lead-note>{view.places ? t('vouchers.group.join.leadNote', { n: view.places }) : t('vouchers.group.join.leadNoteUnknown')}</Notice>}
    {action.uncertain ? <Notice tone="warn">{t('vouchers.group.join.uncertain')}</Notice> : errorText && <Notice tone="danger">{errorText}</Notice>}
    <p className="xs muted">{t('vouchers.group.join.rules')}</p>
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return <div className="container page cust-page"><PageHead back="/app" title={t('vouchers.group.join.title')} /><div className="stack">{children}</div></div>;
}
