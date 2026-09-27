import { Fragment, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { useTable } from '../../../data/DataContext';
import type { BookingRow } from '../../../data/schema';
import { usesMats, occupiesMat } from '../../../data/mats';
import { MatPicker } from '../../../components/organism/MatPicker/MatPicker';
import { SessionCalendar } from '../../../components/organism/SessionCalendar/SessionCalendar';
import { useSession } from '../../../auth/SessionProvider';
import { tenant } from '../../../tenant/tenant';
import { movements, type Movement } from '../../../design/tokens';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { Button } from '../../../components/atom/Button/Button';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';
import { useSessionsJoined } from '../hooks';

export function SchedulePage() {
  const { t } = useI18n();
  const { user } = useSession();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { sections, isVisible } = useLayout(siteSpecs.schedule);
  const [mat, setMat] = useState<number | null>(null);
  const { rows: bookings } = useTable<BookingRow>('bookings');
  const [picked, setPicked] = useState<string | null>(null);
  const all = useSessionsJoined();
  const mvFilter = params.get('movement') as Movement | null;
  const list = all.filter(({ modality }) => !mvFilter || modality?.movement === mvFilter);
  const chosen = all.find((x) => x.session.id === picked);
  const yoga = usesMats(chosen?.modality);
  const taken = new Set(bookings.filter(b => b.session_id === picked && occupiesMat(b)).map(b => b.mat_number));
  const full = !!chosen && chosen.session.booked_count >= chosen.session.capacity;
  const unavailable = !!chosen && (chosen.session.status !== 'scheduled' || new Date(chosen.session.starts_at).getTime() <= Date.now());
  const signInAndBook = () => {
    const next = full ? `/app/waitlist/${picked}` : `/app/checkout/${picked}${mat ? `?mat=${mat}` : ''}`;
    nav(user.role === 'public' ? `/auth/sign-in?next=${encodeURIComponent(next)}` : next);
  };
  const pickMovement = (mv: Movement) => {
    const next = new URLSearchParams(params);
    if (mvFilter === mv) next.delete('movement'); else next.set('movement', mv);
    setParams(next, { replace: true });
  };

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead title={t('site.schedule.title')} body={t('site.schedule.body', { mats: tenant.studio.mats, classes: tenant.studio.classesPerDay })} />,
    DayTabs: () => null,
    ClassList: () => <section className="container"><SessionCalendar sessions={list} onPick={s => { setPicked(s.id); setMat(null); }} /></section>,
    Legend: () => (
      <section className="container" style={{ paddingBottom: 64 }}>
        <div className="site-legend">
          <span className="eyebrow">{t('site.schedule.legend')}</span>
          {(Object.keys(movements) as Movement[]).map((mv) => (
            <Chip key={mv} movement={mv} dot selected={mvFilter === mv} onClick={() => pickMovement(mv)}>{movements[mv].label}</Chip>
          ))}
        </div>
        <p className="xs muted" style={{ marginTop: 8 }}>{t('site.schedule.legendBody', { mats: tenant.studio.mats })}</p>
      </section>
    ),
  };

  return (
    <SiteShell>
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
      <Drawer open={!!chosen} onClose={() => setPicked(null)} title={t('site.schedule.loginTitle')} side="bottom">
        {chosen && (
          <div className="stack">
            <ClassCard title={chosen.session.title} teacher={chosen.teacher?.display_name ?? ''} room={t('site.mat.room')} startsAt={chosen.session.starts_at} endsAt={chosen.session.ends_at} movement={chosen.modality?.movement ?? 'fluye'} booked={chosen.session.booked_count} capacity={chosen.session.capacity} />
            {yoga && !full && !unavailable && <MatPicker sessionId={chosen.session.id} capacity={chosen.session.capacity} value={mat} onChange={setMat} />}
            <p className="muted small">{t('site.schedule.loginBody')}</p>
            <Button block size="lg" onClick={signInAndBook} disabled={unavailable || (!full && yoga && (mat == null || taken.has(mat)))}>{unavailable ? t('customer.class.past') : full ? t('core.common.waitlist') : t('site.mat.continue')}</Button>
          </div>
        )}
      </Drawer>
    </SiteShell>
  );
}
