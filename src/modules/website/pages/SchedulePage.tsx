import { requireSessionAdmission, sessionAdmissionAvailable } from '../../../data/sessionAdmission';
import { sessionUnavailableReason } from '../../../data/sessionAvailability';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { useSiteEdition } from '../edition';
import { studioPhoto } from '../photography';
import { SessionEditorial } from '../../../components/molecule/SessionEditorial/SessionEditorial';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useData, useTable } from '../../../data/DataContext';
import type { BookingRow, ModalityRow } from '../../../data/schema';
import { usesMats, occupiesMat } from '../../../data/mats';
import { MatPicker } from '../../../components/organism/MatPicker/MatPicker';
import { SessionCalendar } from '../../../components/organism/SessionCalendar/SessionCalendar';
import { useSession } from '../../../auth/SessionProvider';
import { tenant } from '../../../tenant/tenant';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { Button } from '../../../components/atom/Button/Button';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';
import { useSessionsJoined } from '../hooks';

export function SchedulePage() {
  const { photoEdition } = useSiteEdition();
  const { t, bi } = useI18n();
  const { user, role } = useSession();
  const data = useData();
  const nav = useNavigate(), location = useLocation();
  const navigationRoute = location.pathname + location.search;
  const [params, setParams] = useSearchParams();
  const { sections, isVisible } = useLayout(siteSpecs.schedule);
  const [mat, setMat] = useState<number | null>(null);
  const { rows: bookings } = useTable<BookingRow>('bookings');
  const [picked, setPicked] = useState<string | null>(null);
  const all = useSessionsJoined();
  const { rows: modalitiesAll } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const modalities = modalitiesAll;
  // 0039: the filter is the class (modality slug) in ?modality=; an unknown slug (or an old ?movement= link) shows everything.
  const modFilter = modalities.find((m) => m.slug === params.get('modality'))?.slug ?? null;
  const list = all.filter(({ modality }) => !modFilter || modality?.slug === modFilter);
  const chosen = all.find((x) => x.session.id === picked);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const next = [chosen?.session.starts_at, chosen?.session.ends_at].map(value => Date.parse(value ?? '')).filter(at => at > now).sort((a, b) => a - b)[0];
    const timer = window.setTimeout(refresh, Math.min(60000, next ? Math.max(1, next - Date.now()) : 60000));
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [now, chosen?.session.starts_at, chosen?.session.ends_at]);
  const [navigating, setNavigating] = useState(false), [navigationError, setNavigationError] = useState(false);
  const navigationLock = useRef(false), operation = useRef(0), live = useRef({ data, actor: user.id, role, picked, navigationRoute, mounted: true });
  live.current = { data, actor: user.id, role, picked, navigationRoute, mounted: true };
  useEffect(() => { live.current.mounted = true; return () => { live.current.mounted = false; }; }, []);
  useEffect(() => { operation.current++; navigationLock.current = false; setNavigating(false); setNavigationError(false); }, [data, user.id, role, picked, navigationRoute]);
  const yoga = usesMats(chosen?.modality);
  const taken = new Set(bookings.filter(b => b.session_id === picked && occupiesMat(b)).map(b => b.mat_number));
  const full = !!chosen && chosen.session.booked_count >= chosen.session.capacity;
  const unavailable = !!chosen && !sessionAdmissionAvailable(chosen.session, chosen.modality, chosen.session.template_id ? { id: chosen.session.template_id, active: chosen.templateActive } : undefined, now);
  const unavailableReason = chosen ? sessionUnavailableReason(chosen, now) ?? 'unavailable' : 'unavailable';
  const signInAndBook = async () => {
    if (!chosen || navigationLock.current || !sessionAdmissionAvailable(chosen.session, chosen.modality, chosen.session.template_id ? { id: chosen.session.template_id, active: chosen.templateActive } : undefined)) return;
    const captured = live.current, version = ++operation.current;
    const current = () => operation.current === version && live.current.mounted && live.current.data === captured.data && live.current.actor === captured.actor && live.current.role === captured.role && live.current.navigationRoute === captured.navigationRoute && live.current.picked === captured.picked;
    navigationLock.current = true; setNavigating(true); setNavigationError(false);
    try {
      const fresh = await requireSessionAdmission(data, chosen.session.id, { isCurrent: current });
      if (!current()) return;
      const next = fresh.booked_count >= fresh.capacity ? `/app/waitlist/${fresh.id}` : `/app/checkout/${fresh.id}${mat ? `?mat=${mat}` : ''}`;
      nav(user.role === 'public' ? `/auth/sign-in?next=${encodeURIComponent(next)}` : next);
    } catch { if (current()) setNavigationError(true); }
    finally { if (operation.current === version) { navigationLock.current = false; if (current()) setNavigating(false); } }
  };
  const pickModality = (slug: string) => {
    const next = new URLSearchParams(params);
    next.delete('movement');
    if (modFilter === slug) next.delete('modality'); else next.set('modality', slug);
    setParams(next, { replace: true });
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.schedule.title')} body={t('site.schedule.body', { mats: tenant.studio.mats, classes: tenant.studio.classesPerDay })} />,
    DayTabs: () => null,
    ClassList: () => <section className="container"><SessionCalendar sessions={list} onPick={s => { setPicked(s.id); setMat(null); }} /></section>,
    Legend: () => (
      <section className="container" style={{ paddingBottom: 'var(--sp-4xl)' }}>
        <div className="site-legend">
          <span className="eyebrow">{t('site.schedule.legend')}</span>
          {modalities.map((m) => (
            <Chip key={m.id} tone={m.tone} dot selected={modFilter === m.slug} onClick={() => pickModality(m.slug)}>{bi({ es: m.name_es, en: m.name_en })}</Chip>
          ))}
        </div>
        <p className="xs muted" style={{ marginTop: 'var(--sp-sm)' }}>{t('site.schedule.legendBody', { mats: tenant.studio.mats })}</p>
      </section>
    ),
  };

  return (
    <SiteShell>
      {photoEdition && <div className="container photo-booking-banner"><img src={studioPhoto('pricing-duo')} width={960} height={640} loading="eager" decoding="sync" alt={t('site.photos.duo')} /></div>}
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      <Drawer open={!!chosen} onClose={() => setPicked(null)} title={t('site.schedule.loginTitle')} side="bottom">
        {chosen && (
          <div className="stack">
            <ClassCard title={chosen.session.title} teacher={chosen.teacher?.display_name ?? ''} room={t('site.mat.room')} startsAt={chosen.session.starts_at} endsAt={chosen.session.ends_at} tone={chosen.modality?.tone ?? 'river'} booked={chosen.session.booked_count} capacity={chosen.session.capacity} />
            <SessionEditorial session={chosen.session} />
            {yoga && !full && !unavailable && <MatPicker sessionId={chosen.session.id} capacity={chosen.session.capacity} value={mat} onChange={setMat} />}
            <p className="muted small">{t('site.schedule.loginBody')}</p>
            {navigationError && <Notice tone="warn">{t('core.common.error')}</Notice>}
            <Button block size="lg" onClick={() => void signInAndBook()} loading={navigating} disabled={navigating || unavailable || (!full && yoga && (mat == null || taken.has(mat)))}>{unavailable ? t(`site.calendar.status.${unavailableReason}`) : full ? t('core.common.waitlist') : t('site.mat.continue')}</Button>
          </div>
        )}
      </Drawer>
    </SiteShell>
  );
}
