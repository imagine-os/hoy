import type { DataProvider } from '../../data/types';
import { ROLES } from '../../auth/roles';
import { customerReturn } from '../customer/auth/customerReturn';
import type { LaunchNotificationEvent, LaunchPublicationScope, LaunchTargetScope } from './contracts';

export interface LaunchTicket {
  id: string;
  event: LaunchNotificationEvent;
  source: { tenantId: string; actorId: string; role: string; path: string };
  target: LaunchTargetScope;
  paths: readonly string[];
}
interface Queue { ticket: LaunchTicket | null; seen: Set<string> }
const queues = new WeakMap<DataProvider, Queue>();
const listeners = new Set<() => void>();
let revision = 0, sequence = 0;
const announce = () => { revision++; for (const listener of listeners) listener(); };
export const subscribeLaunchNotifications = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const launchNotificationRevision = () => revision;
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
const path = (value: unknown): value is string => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\\#\s\u0000-\u001f]/.test(value);
function eventCopy(event: LaunchNotificationEvent): LaunchNotificationEvent | null {
  if (!id(event.ownerId)) return null;
  switch (event.type) {
    case 'welcome': return /^[A-Za-z0-9_-]{16,80}$/.test(event.requestId) ? Object.freeze({ type: event.type, ownerId: event.ownerId, requestId: event.requestId }) : null;
    case 'payment-confirmed': case 'payment-rejected': return id(event.paymentId) ? Object.freeze({ type: event.type, ownerId: event.ownerId, paymentId: event.paymentId }) : null;
    case 'rescheduled': return id(event.oldBookingId) && id(event.newBookingId) && event.oldBookingId !== event.newBookingId ? Object.freeze({ type: event.type, ownerId: event.ownerId, oldBookingId: event.oldBookingId, newBookingId: event.newBookingId }) : null;
    default: return null;
  }
}
/** Called only after an explicit successful source action. Stores IDs/scope, never copy, contacts or callbacks. */
export function publishLaunchNotification(provider: DataProvider, supplied: LaunchNotificationEvent, scope: LaunchPublicationScope): string | null {
  try {
    if (provider.name !== 'mock' || !scope.isCurrent() || !id(scope.tenantId) || !id(scope.actorId) || !(ROLES as readonly string[]).includes(scope.role) || !path(scope.sourcePath) || !path(scope.targetPath)) return null;
    const event = eventCopy(supplied);
    if (!event || event.type !== 'welcome' && (event.ownerId !== scope.actorId || scope.role === 'public')) return null;
    if (event.type === 'welcome' && scope.targetPath !== '/app' && customerReturn(scope.targetPath) !== scope.targetPath) return null;
    if ((event.type === 'payment-confirmed' || event.type === 'payment-rejected') && scope.targetPath !== scope.sourcePath) return null;
    if (event.type === 'rescheduled' && scope.targetPath !== `/app/booking/${event.newBookingId}`) return null;
    const key = JSON.stringify([scope.tenantId, event]);
    let queue = queues.get(provider);
    if (!queue) { queue = { ticket: null, seen: new Set() }; queues.set(provider, queue); }
    if (queue.seen.has(key)) return null;
    const target = Object.freeze({ tenantId: scope.tenantId, actorId: event.ownerId, role: event.type === 'welcome' ? 'customer' : scope.role, path: scope.targetPath });
    const paths = [scope.sourcePath, scope.targetPath];
    if (event.type === 'rescheduled') paths.push(`/app/booking/${event.oldBookingId}`);
    const ticket: LaunchTicket = Object.freeze({ id: `launch-preview-${++sequence}`, event,
      source: Object.freeze({ tenantId: scope.tenantId, actorId: scope.actorId, role: scope.role, path: scope.sourcePath }), target,
      paths: Object.freeze([...new Set(paths)]) });
    queue.seen.add(key); queue.ticket = ticket; announce(); return ticket.id;
  } catch { return null; }
}
export const launchTicket = (provider: DataProvider) => queues.get(provider)?.ticket ?? null;
export function removeLaunchTicket(provider: DataProvider, ticketId?: string) {
  const queue = queues.get(provider);
  if (queue?.ticket && (!ticketId || queue.ticket.id === ticketId)) { queue.ticket = null; announce(); }
}
export function matchesLaunchTarget(ticket: LaunchTicket, scope: LaunchTargetScope): boolean {
  return ticket.target.tenantId === scope.tenantId && ticket.target.actorId === scope.actorId && ticket.target.role === scope.role && ticket.target.path === scope.path;
}
/** Expected actor and path updates may be batched separately; no third identity/path is accepted. */
export function allowsLaunchTransition(ticket: LaunchTicket, scope: LaunchTargetScope): boolean {
  if (scope.tenantId !== ticket.source.tenantId || !ticket.paths.includes(scope.path)) return false;
  return scope.actorId === ticket.source.actorId && scope.role === ticket.source.role || scope.actorId === ticket.target.actorId && scope.role === ticket.target.role;
}
