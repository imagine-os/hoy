import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatDate, isSameDay } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { movements, type Movement } from '../../../design/tokens';
import { Card } from '../../../components/molecule/Card/Card';
import { ClassRow } from '../../../components/molecule/ClassRow/ClassRow';
import { Chip } from '../../../components/atom/Chip/Chip';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { Button } from '../../../components/atom/Button/Button';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { PageHead, SiteShell } from '../SiteShell';
import { dayList, useSessionsJoined } from '../hooks';

export function SchedulePage() {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const days = dayList(7);
  const [day, setDay] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const all = useSessionsJoined();
  const list = all.filter(({ session }) => isSameDay(session.starts_at, days[day]) && session.status !== 'completed');
  const chosen = all.find((x) => x.session.id === picked);
  const signInAndBook = () => nav(`/auth/sign-in?next=${encodeURIComponent(`/app/schedule?session=${picked}`)}`);

  return (
    <SiteShell>
      <PageHead title={t('site.schedule.title')} body={t('site.schedule.body', { mats: tenant.studio.mats })} />
      <section className="container" style={{ paddingBottom: 64 }}>
        <div className="site-days" role="tablist">
          {days.map((d, i) => (
            <button key={i} type="button" role="tab" aria-selected={day === i} className={`site-daybtn ${day === i ? 'is-active' : ''}`} onClick={() => setDay(i)}>
              <span>{i === 0 ? t('core.common.today') : formatDate(d.toISOString(), lang, { weekday: 'short' })}</span><strong>{d.getDate()}</strong>
            </button>
          ))}
        </div>
        <Card padding="sm">
          {list.length === 0 && <p className="muted" style={{ padding: 16 }}>{t('site.today.empty')}</p>}
          {list.map(({ session: s, modality: m, teacher: te }) => (
            <ClassRow key={s.id} title={s.title} teacher={te?.display_name ?? ''} startsAt={s.starts_at} durationMin={m?.duration_min ?? 60} movement={m?.movement ?? 'fluye'} booked={s.booked_count} capacity={s.capacity} status={s.status} onClick={() => setPicked(s.id)} />
          ))}
        </Card>
        <div className="site-legend">
          <span className="eyebrow" style={{ alignSelf: 'center' }}>{t('site.schedule.legend')}</span>
          {(Object.keys(movements) as Movement[]).map((mv) => <Chip key={mv} movement={mv} dot>{movements[mv].label}</Chip>)}
        </div>
      </section>
      <Drawer open={!!chosen} onClose={() => setPicked(null)} title={t('site.schedule.loginTitle')} side="bottom">
        {chosen && (
          <div className="stack">
            <ClassCard title={chosen.session.title} teacher={chosen.teacher?.display_name ?? ''} room="Sala principal" startsAt={chosen.session.starts_at} endsAt={chosen.session.ends_at} movement={chosen.modality?.movement ?? 'fluye'} booked={chosen.session.booked_count} capacity={chosen.session.capacity} />
            <p className="muted small">{t('site.schedule.loginBody')}</p>
            <Button block size="lg" onClick={signInAndBook}>{t('site.schedule.loginCta')}</Button>
          </div>
        )}
      </Drawer>
    </SiteShell>
  );
}
