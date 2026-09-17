import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { useData, useTable } from '../../data/DataContext';
import type { BaseRow, BookingRow, ClassSessionRow, PaymentRow, PlanRow } from '../../data/schema';
import { formatCOP, formatDate, formatDateTime, formatTime } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { Chip } from '../../components/atom/Chip/Chip';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { StatTile } from '../../components/molecule/StatTile/StatTile';
import { Field } from '../../components/molecule/Field/Field';
import { Timeline, type TimelineItem } from '../../components/organism/Timeline/Timeline';
import { DataTable } from '../../components/organism/DataTable/DataTable';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { PhoneBubble } from '../../components/molecule/PhoneBubble/PhoneBubble';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { useAudit, type AuditRow } from '../staff/audit';
import { maskPhone, usePeople } from '../staff/people';
import { useMemberStats } from './CrmPage';
import './admin.css';

interface MsgRow extends BaseRow { user_id: string | null; channel: 'whatsapp' | 'email' | 'push'; template_key: string | null; status: string; sent_at: string | null; payload: Record<string, unknown> | null }
interface ConsentRow extends BaseRow { user_id: string; legal_document_id: string; accepted_at: string }
type Tab = 'timeline' | 'bookings' | 'payments' | 'notes';

/** M-06 detail — identity header, metric row, merged timeline, bookings, payments, internal notes, WhatsApp / email actions. */
export function MemberPage() {
  const { id } = useParams();
  const { t, lang, bi } = useI18n();
  const data = useData();
  const { can, user } = useSession();
  const audit = useAudit('admin');
  const { byId, loading } = usePeople();
  const person = id ? byId.get(id) : undefined;
  const one = useMemo(() => (person ? [person] : []), [person]);
  const stats = useMemberStats(one).get(id ?? '');
  const { rows: bookings } = useTable<BookingRow>('bookings', { where: { user_id: id ?? '__none__' } });
  const { rows: payments } = useTable<PaymentRow>('payments', { where: { user_id: id ?? '__none__' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const { rows: messages } = useTable<MsgRow>('message_log', { where: { user_id: id ?? '__none__' } });
  const { rows: consents } = useTable<ConsentRow>('consents', { where: { user_id: id ?? '__none__' } });
  const { rows: notes } = useTable<AuditRow>('audit_log', { where: { entity: 'profiles', entity_id: person?.profileId ?? '__none__', action: 'member.note' }, orderBy: { column: 'created_at', dir: 'desc' } });
  const { rows: sessions } = useTable<ClassSessionRow>('class_sessions');
  const { rows: plans } = useTable<PlanRow>('plans');
  const [tab, setTab] = useState<Tab>('timeline');
  const [note, setNote] = useState('');
  const [compose, setCompose] = useState<{ channel: 'whatsapp' | 'email'; text: string } | null>(null);
  const logged = useRef<string | null>(null);
  useEffect(() => { if (person && logged.current !== person.id) { logged.current = person.id; audit('member.view', 'users', person.id, { name: person.name }); } }, [person?.id]);

  if (!person) return <div className="stack"><Link to="/admin/crm" className="small">← {t('admin.crm.title')}</Link><EmptyState tone={loading ? 'loading' : 'error'} title={loading ? t('core.common.loading') : t('admin.member.notFound')} body={loading ? undefined : t('admin.member.notFound.body')} /></div>;

  const sess = new Map(sessions.map((s) => [s.id, s]));
  const plan = new Map(plans.map((p) => [p.id, p]));
  const canPayments = can('payments.read');
  const canNotes = can('members.write');
  const ltv = payments.filter((p) => p.status === 'approved').reduce((a, p) => a + p.amount, 0);
  const active = bookings.filter((b) => b.status !== 'cancelled');

  const timeline: TimelineItem[] = [
    ...messages.map<TimelineItem>((m) => ({ id: m.id, at: m.sent_at ?? m.created_at, kind: m.channel === 'email' ? 'email' : 'whatsapp', title: m.template_key ?? m.channel, body: typeof m.payload?.text === 'string' ? m.payload.text : undefined, meta: `${m.status}${m.automation_id ? ` · ${t('admin.member.automation')}` : m.payload?.by ? ` · ${String(m.payload.by)}` : ''}` })),
    ...(canPayments ? payments.map<TimelineItem>((p) => ({ id: p.id, at: p.paid_at ?? p.created_at, kind: 'payment', title: `${t('admin.member.payment')} · ${plan.get(p.plan_id ?? '')?.name_es ?? ''}`, meta: `${formatCOP(p.amount, lang)} · ${p.method} · ${p.status}` })) : []),
    ...active.map<TimelineItem>((b) => { const s = sess.get(b.session_id); return { id: b.id, at: b.checked_in_at ?? b.created_at, kind: 'booking', title: `${t(`admin.member.booking.${b.status}`)} · ${s?.title ?? ''}`, meta: s ? `${formatDate(s.starts_at, lang)} ${formatTime(s.starts_at, lang)} · ${b.paid_with}` : b.paid_with }; }),
    ...notes.map<TimelineItem>((n) => ({ id: n.id, at: n.created_at, kind: 'note', title: t('admin.member.note'), body: String(n.diff?.note ?? ''), meta: byId.get(n.actor_id ?? '')?.name ?? '—' })),
  ];

  const addNote = async () => {
    if (!note.trim() || !person.profileId) return;
    await audit('member.note', 'profiles', person.profileId, { note: note.trim(), user_id: person.id });
    setNote('');
  };
  const send = async () => {
    if (!compose?.text.trim()) return;
    const m = await data.insert('message_log', { user_id: person.id, channel: compose.channel, template_key: null, automation_id: null, status: 'sent', sent_at: new Date().toISOString(), payload: { text: compose.text.trim(), by: user.name, manual: true } });
    await audit('member.message', 'message_log', m.id, { channel: compose.channel, user_id: person.id });
    setCompose(null);
  };

  const bookingCols = [
    { key: 'when', label: t('admin.member.col.when'), render: (b: BookingRow) => { const s = sess.get(b.session_id); return s ? <span className="small">{formatDate(s.starts_at, lang)} · {formatTime(s.starts_at, lang)}</span> : b.session_id; } },
    { key: 'class', label: t('admin.member.col.class'), render: (b: BookingRow) => sess.get(b.session_id)?.title ?? '—' },
    { key: 'status', label: t('admin.member.col.status'), render: (b: BookingRow) => <Badge tone={toneForStatus(b.status)}>{b.status}</Badge> },
    { key: 'paid_with', label: t('admin.member.col.paidWith') },
  ];
  const paymentCols = [
    { key: 'paid_at', label: t('admin.member.col.when'), render: (p: PaymentRow) => <span className="mono small">{formatDateTime(p.paid_at ?? p.created_at, lang)}</span> },
    { key: 'plan_id', label: t('admin.member.col.product'), render: (p: PaymentRow) => plan.get(p.plan_id ?? '')?.name_es ?? '—' },
    { key: 'amount', label: t('admin.member.col.amount'), align: 'right' as const, render: (p: PaymentRow) => formatCOP(p.amount, lang) },
    { key: 'method', label: t('admin.member.col.method'), render: (p: PaymentRow) => `${p.method} · ${p.provider}` },
    { key: 'status', label: t('admin.member.col.status'), render: (p: PaymentRow) => <Badge tone={toneForStatus(p.status)}>{p.status}</Badge> },
  ];

  return (
    <div className="stack">
      <Link to="/admin/crm" className="small">← {t('admin.crm.title')}</Link>
      <Card className="member-head">
        <Avatar name={person.name} initials={person.initials} size={64} />
        <div className="grow stack-sm">
          <div className="row wrap"><h1 className="member-name">{person.name}</h1>{person.plan ? <Badge tone={toneForStatus(person.membership?.status ?? '')}>{bi({ es: person.plan.name_es, en: person.plan.name_en })}</Badge> : <Badge>{t('admin.crm.noPlan')}</Badge>}</div>
          <div className="small muted">{t('admin.member.since', { date: formatDate(person.createdAt, lang, { month: 'long', year: 'numeric' }) })} · {maskPhone(person.phone)} · {person.email}</div>
          <div className="row wrap">
            <Badge tone={person.whatsappVerified ? 'success' : 'neutral'}>WhatsApp {person.whatsappVerified ? '✓' : '·'}</Badge>
            <Badge tone={person.marketingOptin ? 'success' : 'neutral'}>{t('admin.member.optin')} {person.marketingOptin ? '✓' : '·'}</Badge>
            <Badge tone={consents.length ? 'success' : 'warn'}>{t('admin.member.consent', { n: consents.length })}</Badge>
            {person.birthday && <Badge tone="highlight">🎂 {formatDate(person.birthday, lang, { day: 'numeric', month: 'short' })}</Badge>}
          </div>
        </div>
        <div className="row wrap">
          {can('members.write') && <Button size="sm" variant="secondary" disabled={!person.whatsappVerified && !person.phone} onClick={() => setCompose({ channel: 'whatsapp', text: '' })}>WhatsApp</Button>}
          {can('members.write') && <Button size="sm" variant="secondary" onClick={() => setCompose({ channel: 'email', text: '' })}>Email</Button>}
        </div>
      </Card>
      <div className="grid grid-4">
        <StatTile label={t('admin.member.ltv')} value={canPayments ? formatCOP(ltv, lang) : '—'} />
        <StatTile label={t('admin.member.visits')} value={stats?.visits ?? 0} hint={person.membership ? undefined : t('admin.member.credits', { n: stats?.credits ?? 0 })} />
        <StatTile label={t('admin.member.lastVisit')} value={stats?.lastVisit ? formatDate(stats.lastVisit, lang) : '—'} />
        <StatTile label={t('admin.crm.col.risk')} value={t(`admin.crm.risk.${stats?.risk ?? 'low'}`)} trend={stats?.risk === 'high' ? 'down' : stats?.risk === 'medium' ? 'flat' : 'up'} hint={t('admin.member.risk.hint')} />
      </div>
      <div className="row wrap" role="tablist">
        {(['timeline', 'bookings', 'payments', 'notes'] as Tab[]).filter((x) => x !== 'payments' || canPayments).map((x) => <Chip key={x} selected={tab === x} onClick={() => setTab(x)}>{t(`admin.member.tab.${x}`)}</Chip>)}
      </div>
      {tab === 'timeline' && <Card><Timeline items={timeline} emptyText={t('admin.member.timeline.empty')} /></Card>}
      {tab === 'bookings' && <DataTable columns={bookingCols} rows={[...active].sort((a, b) => (sess.get(b.session_id)?.starts_at ?? '').localeCompare(sess.get(a.session_id)?.starts_at ?? ''))} rowKey={(r) => r.id} dense emptyText={t('admin.member.bookings.empty')} />}
      {tab === 'payments' && canPayments && <DataTable columns={paymentCols} rows={payments} rowKey={(r) => r.id} dense emptyText={t('admin.member.payments.empty')} />}
      {tab === 'notes' && (
        <Card>
          <div className="stack-sm">
            <p className="xs muted">{t('admin.member.notes.rule')}</p>
            {canNotes && <><textarea className="input adm-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('admin.member.notes.ph')} aria-label={t('admin.member.note')} /><div className="row-between"><span className="xs muted">{user.name}</span><Button size="sm" disabled={!note.trim()} onClick={addNote}>{t('admin.member.notes.add')}</Button></div></>}
            <Timeline items={timeline.filter((x) => x.kind === 'note')} emptyText={t('admin.member.notes.empty')} />
          </div>
        </Card>
      )}
      <Drawer open={!!compose} onClose={() => setCompose(null)} title={compose?.channel === 'whatsapp' ? `WhatsApp · ${person.name}` : `Email · ${person.name}`} width={440}>
        {compose && (
          <div className="stack-sm">
            <p className="xs muted">{compose.channel === 'whatsapp' ? t('admin.member.compose.wa', { studio: tenant.name }) : t('admin.member.compose.email')}</p>
            <Field label={t('admin.member.compose.text')}>{(id) => <textarea id={id} className="input adm-textarea" rows={5} value={compose.text} onChange={(e) => setCompose({ ...compose, text: e.target.value })} />}</Field>
            {compose.channel === 'whatsapp' && <PhoneBubble header={`${tenant.name} · WhatsApp`} text={compose.text || '…'} time={formatTime(new Date().toISOString(), lang)} undeliverable={!person.whatsappVerified ? t('admin.member.compose.unverified') : undefined} />}
            <Button disabled={!compose.text.trim()} onClick={send}>{t('admin.member.compose.send')}</Button>
          </div>
        )}
      </Drawer>
      <p className="xs muted">{t('admin.member.viewLogged')}</p>
    </div>
  );
}
