/**
 * The launch routes (H-2, PL-03, FLAGS decision 2026-10-28): the production build (`VITE_HOY_BUILD=production`)
 * registers only these, so every other page and its menu entry (nav is built from the routes) does not exist there.
 * The review build keeps every route. An allowlist, so a route a lane adds stays out of production until it is listed
 * here (fail closed).
 *
 * A pattern is a route path (`/app/class/:id`) or a prefix ending in `/*` that also matches the prefix itself.
 * Left out on purpose:
 * - review tools: `/hub*`, `/dev*`, `/docs*`, `/manual*` (internal text, H-8 SW-06), demo states `/app/state/*`;
 * - Clerk replaces them: `/auth/recover` (no passwords), `/auth/locked` (Clerk's attack protection locks);
 * - not launch scope (gap analysis §2 (H), 30 Nov or later): teacher app, payroll and class pay, waitlist, events,
 *   reviews, practice, invites, the review build's gift demo (`/app/gift`, Wompi), promotions, marketing, maintenance,
 *   subscriptions, integrations, WhatsApp, the content editor (static at launch) and the table manager.
 * A production page a lane adds must be listed with its exact path pattern (`/app/vouchers/:code`, not `:id`):
 * `scripts/test-launch-routes.mjs` fails on a production route that isn't.
 */
import { PRODUCTION_BUILD } from './launch';

/** Where "buy a gift" goes: H-6's gift voucher by transfer in production, the review build's demo otherwise. */
export const GIFT_PURCHASE_PATH = PRODUCTION_BUILD ? '/app/gift-voucher' : '/app/gift';

export const LAUNCH_ROUTES: readonly string[] = [
  // Website, Coming Soon (SW-08) and sign-in
  '/', '/coming-soon', '/site/*',
  '/auth', '/auth/sign-in', '/auth/sign-up', '/auth/callback', '/no-access',
  // Customer app (CU, RS, PA, BO rows)
  '/app', '/app/schedule', '/app/schedule/week', '/app/class/:id', '/app/checkout/:id', '/app/plans', '/app/passes', '/app/classes',
  '/app/booking/:id', '/app/booking/:id/change', '/app/history', '/app/rules', '/app/faq', '/app/faq/2', '/app/teachers', '/app/teachers/:id',
  '/app/profile', '/app/notifications', '/app/more', '/app/account', '/app/access', '/app/legal/:kind', '/app/vouchers', '/app/vouchers/:code',
  // Payment by transfer, the "Nota de compra" and a gift voucher (PG, BO-01)
  '/app/pay/:what/:id', '/app/receipts', '/app/receipts/:paymentId', '/app/gift-voucher',
  // Front desk (Role Matrix: home, check-in, pending payments, register and charge, inbox; S-11 expense entry).
  // `/staff/rooms` (S-05) is out for launch (owner decision, final review round 2): `space_bookings` has no Company OS adapter.
  '/staff', '/staff/checkin', '/staff/register', '/staff/expense', '/staff/inbox/*', '/staff/transfers/*', '/staff/vouchers/*', '/staff/receipts/:paymentId',
  // Administration
  '/admin', '/admin/analytics', '/admin/crm', '/admin/crm/:id', '/admin/class-schedule/*', '/admin/vouchers/*', '/admin/products/*', '/admin/settings/*',
  '/admin/activity', '/admin/emails/*', '/admin/finance', '/admin/finance/expenses', '/admin/payments/report',
];

export function isLaunchRoute(path: string, list: readonly string[] = LAUNCH_ROUTES): boolean {
  return list.some((p) => p.endsWith('/*') ? path === p.slice(0, -2) || path.startsWith(p.slice(0, -1)) : path === p);
}
