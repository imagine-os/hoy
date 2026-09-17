import { createElement as h } from 'react';
import type { RouteDef } from '../../specs/types';
import type { Role } from '../../auth/roles';
import { EVERYONE } from '../../auth/roles';
// The customer view of the canvas specs (real layout section names + real table names). Same keys as src/specs/canvasSpecs.
import { canvasSpecs } from './specs';
import { CustomerHomePage } from './HomePage';
import { SchedulePage } from './pages/SchedulePage';
import { ClassDetailPage } from './pages/ClassDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentMethodsPage } from './pages/PaymentMethodsPage';
import { PlansPage } from './pages/PlansPage';
import { CreditsPage, PassesPage } from './pages/PassesPage';
import { BookedPage } from './pages/BookedPage';
import { RatePage } from './pages/RatePage';
import { HistoryPage } from './pages/HistoryPage';
import { RulesPage } from './pages/RulesPage';
import { FaqPage } from './pages/FaqPage';
import { InvitePage } from './pages/InvitePage';
import { GiftPage } from './pages/GiftPage';
import { TeacherProfilePage, TeachersPage } from './pages/TeachersPage';
import { ProfilePage } from './pages/ProfilePage';
import { WaitlistPage } from './pages/WaitlistPage';
import { MembershipPage } from './pages/MembershipPage';
import { EventPage, EventsListPage } from './pages/EventPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { MorePage } from './pages/MorePage';
import { IntentionPage } from './pages/IntentionPage';
import { CancelledDemoPage, DeclinedDemoPage, EmptyHomePage } from './pages/StatePages';
import { SplashPage } from './auth/SplashPage';
import { SignInPage } from './auth/SignInPage';
import { SignUpPage } from './auth/SignUpPage';
import { PasswordResetPage } from './auth/PasswordResetPage';
import { LockedPage } from './auth/LockedPage';
export { strings } from './strings';

const roles: Role[] = ['customer', 'teacher'];
const base = { roles, surface: 'customer' as const, layout: 'mobile' as const };
const pub = { roles: EVERYONE, surface: 'public' as const, layout: 'mobile' as const };

/** Bottom dock (C-25 rule): four destinations — Home, Schedule, History, More. Everything else is one tap away from More. */
export const routes: RouteDef[] = [
  { ...base, path: '/app', element: h(CustomerHomePage), spec: canvasSpecs['C-01'], nav: { labelKey: 'core.nav.home', icon: '⌂', order: 1 } },
  { ...base, path: '/app/schedule', element: h(SchedulePage), spec: canvasSpecs['C-02'], nav: { labelKey: 'core.nav.schedule', icon: '▦', order: 2 } },
  { ...base, path: '/app/schedule/week', element: h(SchedulePage, { view: 'week' }), spec: canvasSpecs['C-02b'] },
  { ...base, path: '/app/class/:id', element: h(ClassDetailPage), spec: canvasSpecs['C-03'] },
  { ...base, path: '/app/checkout/:id', element: h(CheckoutPage), spec: canvasSpecs['C-04'] },
  { ...base, path: '/app/payment-methods', element: h(PaymentMethodsPage), spec: canvasSpecs['C-05'] },
  { ...base, path: '/app/plans', element: h(PlansPage), spec: canvasSpecs['C-06'] },
  { ...base, path: '/app/passes', element: h(PassesPage), spec: canvasSpecs['C-07'] },
  { ...base, path: '/app/credits', element: h(CreditsPage), spec: canvasSpecs['C-07b'] },
  { ...base, path: '/app/booking/:id', element: h(BookedPage), spec: canvasSpecs['C-08'] },
  { ...base, path: '/app/booking/:id/change', element: h(BookedPage, { change: true }), spec: canvasSpecs['C-08b'] },
  { ...base, path: '/app/rate/:id', element: h(RatePage), spec: canvasSpecs['C-10'] },
  { ...base, path: '/app/history', element: h(HistoryPage), spec: canvasSpecs['C-11'], nav: { labelKey: 'core.nav.history', icon: '▤', order: 3 } },
  { ...base, path: '/app/rules', element: h(RulesPage), spec: canvasSpecs['C-13'] },
  { ...base, path: '/app/faq', element: h(FaqPage, { page: 1 }), spec: canvasSpecs['C-14'] },
  { ...base, path: '/app/faq/2', element: h(FaqPage, { page: 2 }), spec: canvasSpecs['C-15'] },
  { ...base, path: '/app/invite', element: h(InvitePage), spec: canvasSpecs['C-16'] },
  { ...base, path: '/app/gift', element: h(GiftPage), spec: canvasSpecs['C-17'] },
  { ...base, path: '/app/teachers', element: h(TeachersPage), spec: canvasSpecs['C-18'] },
  { ...base, path: '/app/teachers/:id', element: h(TeacherProfilePage), spec: canvasSpecs['C-18'] },
  { ...base, path: '/app/profile', element: h(ProfilePage), spec: canvasSpecs['C-19'] },
  { ...base, path: '/app/waitlist/:id', element: h(WaitlistPage), spec: canvasSpecs['C-20'] },
  { ...base, path: '/app/membership', element: h(MembershipPage), spec: canvasSpecs['C-22'] },
  { ...base, path: '/app/events', element: h(EventsListPage), spec: canvasSpecs['C-23'] },
  { ...base, path: '/app/events/:id', element: h(EventPage), spec: canvasSpecs['C-23'] },
  { ...base, path: '/app/notifications', element: h(NotificationsPage), spec: canvasSpecs['C-24'] },
  { ...base, path: '/app/more', element: h(MorePage), spec: canvasSpecs['C-25'], nav: { labelKey: 'core.nav.more', icon: '⋯', order: 4 } },
  { ...base, path: '/app/intention', element: h(IntentionPage), spec: canvasSpecs['A-05'] },
  // Edge states, reachable as demo routes (and rendered inline by C-01, C-04 and C-08 when the state is real).
  { ...base, path: '/app/state/empty', element: h(EmptyHomePage), spec: canvasSpecs['E-01'] },
  { ...base, path: '/app/state/declined', element: h(DeclinedDemoPage), spec: canvasSpecs['E-02'] },
  { ...base, path: '/app/state/cancelled', element: h(CancelledDemoPage), spec: canvasSpecs['E-03'] },
  // Auth flow — public surface, minimal shell (AuthShell). Real Supabase Auth replaces the demo picker later.
  { ...pub, path: '/auth', element: h(SplashPage), spec: canvasSpecs['A-01'] },
  { ...pub, path: '/auth/sign-in', element: h(SignInPage), spec: canvasSpecs['A-02'] },
  { ...pub, path: '/auth/sign-up', element: h(SignUpPage), spec: canvasSpecs['A-03'] },
  { ...pub, path: '/auth/recover', element: h(PasswordResetPage), spec: canvasSpecs['C-21'] },
  { ...pub, path: '/auth/locked', element: h(LockedPage), spec: canvasSpecs['E-04'] },
];
