import type { DataProvider } from '../../data/types';
import type { Bi } from '../../specs/types';

export type LaunchEventId = 'welcome' | 'sign-in-code' | 'booking-pending-payment' | 'payment-confirmed' | 'payment-rejected' | 'booking-released' | 'rescheduled' | 'class-cancelled' | 'voucher-received' | 'receipt';
export interface LaunchEventDefinition {
  id: LaunchEventId;
  name: Bi;
  // Wiring inventory only: bound coverage does not assert runtime verification or sending readiness.
  coverage: 'bound-canonical-preview' | 'policy-pending' | 'existing-bounded';
  producerScopes?: readonly string[];
  template: { kind: 'saved'; key: string; trigger: string } | { kind: 'builtin-mock'; key: string; contractRevision: 1 } | { kind: 'preserved-existing' | 'unresolved' };
}
export const LAUNCH_NOTIFICATION_EVENTS: readonly LaunchEventDefinition[] = [
  { id: 'welcome', name: { es: 'Bienvenida', en: 'Welcome' }, coverage: 'bound-canonical-preview', producerScopes: ['A-03 SignUpPage: committed mock registration proof; one-shot handoff to exact new customer owner only'], template: { kind: 'saved', key: 'welcome', trigger: 'user.created' } },
  { id: 'sign-in-code', name: { es: 'Código de acceso demo', en: 'Demo sign-in code' }, coverage: 'bound-canonical-preview', producerScopes: ['A-02 DemoSignInPanel: current active fictional challenge only; inline read-only code preview'], template: { kind: 'builtin-mock', key: 'nt02.demo-sign-in-code', contractRevision: 1 } },
  { id: 'booking-pending-payment', name: { es: 'Reserva pendiente de pago', en: 'Booking pending payment' }, coverage: 'policy-pending', template: { kind: 'unresolved' } },
  { id: 'payment-confirmed', name: { es: 'Pago confirmado', en: 'Payment confirmed' }, coverage: 'bound-canonical-preview', producerScopes: ['C-04 CheckoutPage: exact committed electronic approved payment only; direct preview inside existing DoneDrawer; no queue'], template: { kind: 'builtin-mock', key: 'nt02.payment-confirmed', contractRevision: 1 } },
  { id: 'payment-rejected', name: { es: 'Pago rechazado', en: 'Payment rejected' }, coverage: 'bound-canonical-preview', producerScopes: ['C-04 CheckoutPage: exact committed electronic declined payment only; direct preview beside DeclinedBlock; no queue'], template: { kind: 'saved', key: 'payment_failed', trigger: 'payment.declined' } },
  { id: 'booking-released', name: { es: 'Reserva liberada', en: 'Booking released' }, coverage: 'policy-pending', template: { kind: 'unresolved' } },
  { id: 'rescheduled', name: { es: 'Reserva reprogramada', en: 'Rescheduled' }, coverage: 'bound-canonical-preview', producerScopes: ['C-08 BookedPage ChangeSheet: successful atomic replacement only; one-shot old-to-new booking handoff with preserved payment and ledger lineage'], template: { kind: 'saved', key: 'booking_changed', trigger: 'booking.moved' } },
  { id: 'class-cancelled', name: { es: 'Clase cancelada', en: 'Class cancelled' }, coverage: 'existing-bounded', template: { kind: 'preserved-existing' } },
  { id: 'voucher-received', name: { es: 'Bono recibido', en: 'Voucher received' }, coverage: 'policy-pending', template: { kind: 'unresolved' } },
  { id: 'receipt', name: { es: 'Recibo', en: 'Receipt' }, coverage: 'existing-bounded', template: { kind: 'preserved-existing' } },
];
export type LaunchNotificationEvent =
  | { type: 'welcome'; ownerId: string; requestId: string }
  | { type: 'payment-confirmed' | 'payment-rejected'; ownerId: string; paymentId: string }
  | { type: 'rescheduled'; ownerId: string; oldBookingId: string; newBookingId: string };
export interface LaunchPublicationScope {
  tenantId: string;
  actorId: string;
  role: string;
  sourcePath: string;
  targetPath: string;
  isCurrent: () => boolean;
}
export interface LaunchTargetScope { tenantId: string; actorId: string; role: string; path: string }
export type LaunchUnavailableReason = 'source-unavailable' | 'source-unverified' | 'recipient-unavailable' | 'template-unavailable' | 'unsupported-provider' | 'policy-pending';
export interface LaunchPreviewPayload {
  event: LaunchEventId;
  status: 'unsent-preview';
  sourceId: string;
  ownerId: string | null;
  recipient: { kind: 'account' | 'demo-only'; name: string | null; email: string | null; locale: 'es' | 'en' | null };
  template: { kind: 'saved'; key: string; id: string; version: number; active: boolean } | { kind: 'builtin-mock'; key: string; contractRevision: 1 };
  subject: Bi;
  body: Bi;
  summary?: Bi;
  cta?: { label: Bi; href: Bi };
}
export type LaunchPreviewResult =
  | { status: 'loading'; event: LaunchEventId }
  | { status: 'ready'; payload: LaunchPreviewPayload }
  | { status: 'unavailable'; event: LaunchEventId; reason: LaunchUnavailableReason }
  | { status: 'error'; event: LaunchEventId }
  | { status: 'cancelled'; event: LaunchEventId };
export interface LaunchNotificationHostProps extends LaunchTargetScope { provider: DataProvider }
export interface DemoSignInNotificationPreviewProps { active: boolean; code: string | null; expiresAt: number | null; now: number }
export const launchSourceUnavailable = (event: LaunchEventId, reason: LaunchUnavailableReason = 'source-unavailable'): LaunchPreviewResult => ({ status: 'unavailable', event, reason });
export const launchEventName = (id: LaunchEventId) => LAUNCH_NOTIFICATION_EVENTS.find(event => event.id === id)!.name;
