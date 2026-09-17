import { canvasSpecs } from '../../specs/canvasSpecs';
import { defineSpec } from '../../specs/define';

/** S-01 role home — live numbers and the two counter actions. */
export const S01 = defineSpec({
  ...canvasSpecs['S-01'],
  layout: ['RoleBadge + KPIRow', 'NextClassCard', 'TodayList', 'QuickActions', 'AuditNotice (recent activity)'],
  data: ['class_sessions', 'bookings', 'waitlist', 'payments', 'audit_log', 'teachers'],
  notes: [...(canvasSpecs['S-01'].notes ?? []), 'Live: subscribes to bookings and class_sessions through useTable.'],
});

/** S-02 door / check-in — sections are the layout-editor keys. */
export const S02 = defineSpec({
  ...canvasSpecs['S-02'],
  // Canvas audit #26: no scanner — the door is a person with a search box, so the scan API and face templates are dropped.
  api: (canvasSpecs['S-02'].api ?? []).filter((a) => !/scan|face/i.test(a)),
  logic: (canvasSpecs['S-02'].logic ?? []).filter((l) => !/face.template/i.test(l)),
  layout: ['TodayStrip (now / next / later)', 'MemberSearch + CapacityMeter', 'RosterList (expected / checked in / waitlist)', 'TeachersInToday', 'QuickSell (walk-in)'],
  data: ['class_sessions', 'bookings', 'waitlist', 'users', 'profiles', 'memberships', 'plans', 'teachers', 'modalities', 'audit_log', 'tenants'],
  states: [...(canvasSpecs['S-02'].states ?? []).filter((s) => !/scan/i.test(s)), 'No classes today: empty strip', 'Loading roster', 'No permission: roster read-only'],
  notes: [...(canvasSpecs['S-02'].notes ?? []), 'Late = checked in after starts_at + policies.lateGraceMin (M-08).', 'Keyboard: / focuses search, Enter checks in the first expected match, Esc clears.', 'Capacity comes from the session row (seeded from tenant.studio.mats).'],
});

/** S-04 register & take payment. */
export const S04 = defineSpec({
  ...canvasSpecs['S-04'],
  layout: ['Step1 · Who (new / existing)', 'Step2 · What (pricing.ts)', 'Step3 · How they pay', 'SummaryRail (IVA + total)', 'Receipt'],
  data: ['users', 'profiles', 'user_roles', 'consents', 'payments', 'invoices', 'memberships', 'credits', 'bookings', 'class_sessions', 'message_log', 'audit_log', 'tenants'],
  states: [...(canvasSpecs['S-04'].states ?? []), 'No permission: form read-only', 'Sale complete: receipt view'],
  notes: [...(canvasSpecs['S-04'].notes ?? []), 'Prices only from src/tenant/pricing.ts; IVA from M-08 tax settings.', 'Wompi link is a placeholder: payment stays pending until the gateway confirms.'],
});
