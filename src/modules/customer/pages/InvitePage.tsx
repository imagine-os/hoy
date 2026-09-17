import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { formatDate, formatTime, waLink } from '../../../i18n/format';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { Button } from '../../../components/atom/Button/Button';
import { Badge, toneForStatus } from '../../../components/atom/Badge/Badge';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { Wordmark } from '../../../components/atom/Wordmark/Wordmark';
import { ClassCard } from '../../../components/organism/ClassCard/ClassCard';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { useMyInvites, useSessionJoined } from '../hooks';
import { policy } from '../policy';
import { PageHead, movementOf, roomName, shareText, teacherName } from '../ui';

/** C-16 Invite a guest — make word of mouth mechanical. Every send is a row in `invites`. */
export function InvitePage() {
  const { t, lang } = useI18n();
  const { user } = useSession();
  const [params] = useSearchParams();
  const sessionId = params.get('session') ?? undefined;
  const { joined } = useSessionJoined(sessionId);
  const { rows: invites, code, send } = useMyInvites();
  const [to, setTo] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const link = `${window.location.origin}${window.location.pathname}#/auth/sign-up?invite=${code}`;
  const context = joined ? t('customer.invite.text.class', { name: user.name.split(' ')[0], title: joined.session.title, when: `${formatDate(joined.session.starts_at, lang)} ${formatTime(joined.session.starts_at, lang)}`, studio: tenant.name }) : t('customer.invite.text.general', { name: user.name.split(' ')[0], studio: tenant.name });

  const record = async (channel: 'whatsapp' | 'email' | 'link', target: string) => {
    await send({ channel, target, sessionId });
    setFlash(t('customer.invite.sent')); setTimeout(() => setFlash(null), 2500);
  };
  const viaWhatsapp = () => { window.open(waLink(to || null, `${context} ${link}`), '_blank', 'noreferrer'); void record('whatsapp', to); };
  const viaEmail = () => { window.location.href = `mailto:${to.includes('@') ? to : ''}?subject=${encodeURIComponent(t('customer.invite.subject', { studio: tenant.name }))}&body=${encodeURIComponent(`${context}\n\n${link}`)}`; void record('email', to); };
  const viaLink = async () => { const r = await shareText(context, link); if (r !== 'failed') void record('link', ''); };

  return (
    <div className="container page cust-page">
      <PageHead back={joined ? `/app/class/${joined.session.id}` : '/app/more'} title={t('customer.invite.title')} sub={t('customer.invite.sub')} />
      <div className="stack">
        {joined && <ClassCard title={joined.session.title} teacher={teacherName(joined)} room={roomName(joined)} startsAt={joined.session.starts_at} endsAt={joined.session.ends_at} movement={movementOf(joined)} booked={joined.session.booked_count} capacity={joined.session.capacity} />}
        <Card tone="primary" className="cust-pass-preview" padding="lg">
          <div className="row-between"><span className="eyebrow">{t('customer.invite.pass')}</span><Wordmark variant="cream" height={22} /></div>
          <strong className="cust-h2">{t('customer.invite.pass.title')}</strong>
          <span className="small">{t('customer.invite.pass.valid', { days: policy.inviteValidityDays })}</span>
          <code className="cust-code">{code}</code>
        </Card>
        <Field label={t('customer.invite.to')} hint={t('customer.invite.to.hint')}>{(id) => <Input id={id} value={to} onChange={(e) => setTo(e.target.value)} placeholder={`${tenant.dialCode} 300 000 0000 · ana@correo.com`} />}</Field>
        <div className="grid grid-3 cust-channels">
          <Button variant="secondary" size="lg" onClick={viaWhatsapp} icon="◎">WhatsApp</Button>
          <Button variant="secondary" size="lg" onClick={viaEmail} icon="✉">Email</Button>
          <Button variant="secondary" size="lg" onClick={viaLink} icon="⇪">{t('customer.invite.link')}</Button>
        </div>
        {flash && <Notice tone="success">{flash}</Notice>}
        <ListGroup title={t('customer.invite.sentList')}>
          {invites.length === 0 && <p className="small muted" style={{ padding: 16 }}>{t('customer.invite.sentList.empty')}</p>}
          {invites.map((i) => <ListRow key={i.id} icon={i.channel === 'whatsapp' ? '◎' : i.channel === 'email' ? '✉' : '⇪'} title={i.invitee_phone ?? i.invitee_email ?? t(`customer.invite.channel.${i.channel}`)} subtitle={`${formatDate(i.created_at, lang)} · ${i.code}`} trailing={<Badge tone={toneForStatus(i.status)}>{t(`customer.invite.status.${i.status}`)}</Badge>} />)}
        </ListGroup>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.invite.reward')}</p>
      </div>
    </div>
  );
}
