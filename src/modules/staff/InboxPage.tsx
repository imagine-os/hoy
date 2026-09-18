import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { toSummary, useAuthorOf, useConversations, useMessaging } from '../../data/comms';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Badge, toneForStatus } from '../../components/atom/Badge/Badge';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { ConversationList } from '../../components/organism/ConversationList/ConversationList';
import { MessageThread } from '../../components/organism/MessageThread/MessageThread';
import { MessageComposer } from '../../components/molecule/MessageComposer/MessageComposer';
import { maskPhone, usePeople } from './people';
import './staff.css';

/** S-06 front-desk inbox: every customer conversation on the left, the selected thread and the reply box on the right. */
export function InboxPage() {
  const { id } = useParams();
  const { t, bi } = useI18n();
  const { can, user } = useSession();
  const { conversations, loading } = useConversations();
  const { sendComposed, markConversationRead, quietUntil } = useMessaging('front_desk');
  const authorOf = useAuthorOf();
  const { byId } = usePeople();
  const summaries = useMemo(() => conversations.map(toSummary), [conversations]);
  const unread = conversations.reduce((a, c) => a + c.unread, 0);
  const selected = id ? conversations.find((c) => c.userId === id) : undefined;
  // A member with no messages yet (opened from M-06) still gets a pane: an empty thread and the composer to start one.
  const person = selected?.person ?? (id ? byId.get(id) : undefined);
  const canWrite = can('members.write');

  // Opening a thread is the team's read receipt for everything the member sent.
  useEffect(() => { if (id && selected && selected.unread > 0) void markConversationRead(id); }, [id, selected?.unread, markConversationRead]);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{t('staff.inbox.title')}</h1>
          <p className="muted small">{unread > 0 ? t('staff.inbox.subtitle', { n: unread }) : t('staff.inbox.subtitle.allRead')}</p>
        </div>
      </div>
      <div className={`inbox ${id ? 'has-thread' : ''}`}>
        <aside className="inbox-list" aria-label={t('core.msg.list.label')}>
          {loading && conversations.length === 0 ? <EmptyState compact tone="loading" title={t('core.common.loading')} /> : <ConversationList conversations={summaries} selectedKey={id} linkTo={(k) => `/staff/inbox/${k}`} />}
        </aside>
        <section className="inbox-pane" aria-live="polite">
          {!id && <Card className="inbox-empty"><EmptyState icon="✉" title={t('staff.inbox.select')} body={t('staff.inbox.select.body')} /></Card>}
          {id && !person && <Card className="inbox-empty"><EmptyState tone={loading ? 'loading' : 'empty'} title={loading ? t('core.common.loading') : t('staff.inbox.notFound')} body={loading ? undefined : t('staff.inbox.notFound.body')} action={<Link to="/staff/inbox"><Button size="sm" variant="secondary">{t('staff.inbox.back')}</Button></Link>} /></Card>}
          {id && person && (
            <Card padding="none" className="inbox-thread">
              <header className="inbox-head">
                <Link to="/staff/inbox" className="inbox-back small" aria-label={t('staff.inbox.back')}>‹</Link>
                <Avatar name={person.name} initials={person.initials} size={44} />
                <div className="grow stack-sm inbox-who">
                  <div className="row wrap">
                    <strong className="inbox-name">{person.name}</strong>
                    {person.plan ? <Badge tone={toneForStatus(person.membership?.status ?? '')}>{bi({ es: person.plan.name_es, en: person.plan.name_en })}</Badge> : <Badge>{t('staff.checkin.noPlan')}</Badge>}
                    <Badge tone={person.whatsappVerified ? 'success' : 'neutral'}>WhatsApp {person.whatsappVerified ? '✓' : '·'}</Badge>
                  </div>
                  <div className="xs muted">{maskPhone(person.phone)}{person.email && <span className="inbox-email"> · {person.email}</span>}</div>
                </div>
                {can('members.read') && <Link to={`/admin/crm/${id}`}><Button size="sm" variant="secondary">{t('staff.inbox.openCrm')}</Button></Link>}
              </header>
              <MessageThread scroll messages={selected?.messages ?? []} personName={person.name} authorOf={authorOf} />
              <div className="inbox-compose">
                <MessageComposer
                  onSend={(m) => sendComposed(id, m)} readOnly={!canWrite} author={user.name}
                  whatsappBlocked={!person.whatsappVerified ? t('core.msg.compose.unverified') : undefined}
                  quietUntil={quietUntil}
                />
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
