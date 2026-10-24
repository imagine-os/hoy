import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../components/atom/Button/Button';
import { Drawer } from '../../components/organism/Drawer/Drawer';
import { LaunchNotificationPreview } from '../../components/organism/LaunchNotificationPreview/LaunchNotificationPreview';
import type { DataProvider } from '../../data/types';
import type { DemoSignInNotificationPreviewProps, LaunchNotificationHostProps, LaunchPreviewResult } from './contracts';
import { allowsLaunchTransition, launchNotificationRevision, launchTicket, matchesLaunchTarget, removeLaunchTicket, subscribeLaunchNotifications, type LaunchTicket } from './handoff';
import { buildDemoSignInPreview, buildLaunchNotificationPreview } from './preview';

/** App mounts one host. Session/router identity is supplied by the integration owner. */
export function LaunchNotificationHost({ provider, tenantId, actorId, role, path }: LaunchNotificationHostProps) {
  const t = useT(), revision = useSyncExternalStore(subscribeLaunchNotifications, launchNotificationRevision, () => 0);
  const [active, setActive] = useState<{ provider: DataProvider; ticket: LaunchTicket } | null>(null);
  const [read, setRead] = useState<{ ticketId: string; result: LaunchPreviewResult } | null>(null);
  const [retry, setRetry] = useState(0), [opened, setOpened] = useState<string | null>(null);
  const scope = { tenantId, actorId, role, path }, key = JSON.stringify([tenantId, actorId, role, path]);
  const current = active?.provider === provider && matchesLaunchTarget(active.ticket, scope) ? active.ticket : null;
  const live = useRef({ provider, key, ticketId: current?.id }); live.current = { provider, key, ticketId: current?.id };
  useEffect(() => {
    const queued = launchTicket(provider);
    if (!queued) return;
    if (!allowsLaunchTransition(queued, scope)) { removeLaunchTicket(provider, queued.id); return; }
    if (matchesLaunchTarget(queued, scope)) { removeLaunchTicket(provider, queued.id); setActive({ provider, ticket: queued }); }
  }, [provider, key, revision]); // key includes the complete route query and current actor/role.
  useEffect(() => { if (active && !current) setActive(null); }, [active, current]);
  useEffect(() => () => { removeLaunchTicket(provider); }, [provider]);
  useEffect(() => {
    if (!current) return;
    const ticket = current, capturedKey = key;
    let alive = true;
    const isCurrent = () => alive && live.current.provider === provider && live.current.key === capturedKey && live.current.ticketId === ticket.id;
    setRead({ ticketId: ticket.id, result: { status: 'loading', event: ticket.event.type } });
    void buildLaunchNotificationPreview(provider, ticket.event, ticket.target, { isCurrent }).then(result => { if (isCurrent()) setRead({ ticketId: ticket.id, result }); });
    return () => { alive = false; };
  }, [provider, key, current?.id, retry]);
  if (!current) return null;
  const result: LaunchPreviewResult = read?.ticketId === current.id ? read.result : { status: 'loading', event: current.event.type };
  if (result.status === 'cancelled') return null;
  const dismiss = () => { setOpened(null); setActive(null); };
  return <>
    <aside className="launch-notification-control" data-launch-notification-host data-launch-event={current.event.type} data-launch-preview-status={result.status}>
      {result.status === 'loading' && <p className="small muted" role="status">{t('launchNotifications.loading')}</p>}
      <Button size="sm" variant="secondary" disabled={result.status === 'loading'} data-launch-notification-open data-launch-event={current.event.type} onClick={() => setOpened(current.id)}>{t('launchNotifications.title')}</Button>
      <Button size="sm" variant="ghost" onClick={dismiss}>{t('launchNotifications.dismiss')}</Button>
    </aside>
    <Drawer open={opened === current.id} onClose={() => setOpened(null)} title={t('launchNotifications.title')}>
      <LaunchNotificationPreview result={result} onRetry={() => setRetry(value => value + 1)} />
    </Drawer>
  </>;
}

/** Remains collapsed for every new challenge; expiry/cancel immediately removes the old preview. */
export function DemoSignInNotificationPreview(props: DemoSignInNotificationPreviewProps) {
  const t = useT(), result = buildDemoSignInPreview(props);
  const identity = result ? `${props.code}:${props.expiresAt}` : null;
  const [opened, setOpened] = useState<string | null>(null);
  useEffect(() => { setOpened(null); }, [identity]);
  if (!result || !identity) return null;
  const expanded = opened === identity;
  return <section className="stack-sm" data-launch-inline-signin>
    <Button size="sm" variant="ghost" aria-expanded={expanded} data-launch-signin-preview-open onClick={() => setOpened(expanded ? null : identity)}>{t('launchNotifications.title')}</Button>
    {expanded && <LaunchNotificationPreview result={result} />}
  </section>;
}
