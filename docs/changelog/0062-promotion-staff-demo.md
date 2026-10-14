version: 0.25.0
date: 2026-10-14
prompt: docs/prompts/0062-promotion-staff-demo.md
intent: Make promotion training easy to discover and connect teacher invitations to safe reception confirmation.
decision: Add an isolated public guide plus role-guarded browser-local promotion and voucher flows.
rejected: QR complexity, automatic role escalation, treating copied text as delivered, sharing one customer's balance through a reusable code.
files: src/modules/promotions*; src/modules/vouchers; src/data/promotions.ts; src/data/vouchers.ts; src/data/MockProvider.ts; src/data/schema.ts; src/hub; docs; scripts/test-promotion*.mjs

# 0062 · Promotions, invitations and reception

- Version: 0.25.0
- Pages: HUB-01 / P-02 / S-07 / C-29 / S-08 / M-14 / M-13 / C-28 / C-16
- Hub: prominent direct entry; everyone can learn with a resettable in-page simulation that cannot write bookings or change identity. Workspace links still use registered roles.
- Teacher: approved fictional campaign → unique invitation code/link → optional private recipient/context → reviewed message → native share or copy. Private notes do not enter links or recipient previews.
- Recipient: explicit claim creates an individual voucher; repeat claims across links for the same campaign return the first entitlement and preserve attribution.
- Reception: code or full URL lookup; verify the holder; confirm existing bookings; create a capacity/balance-checked walk-up booking; confirm and record attendance separately. Check-in never debits the benefit again. Cancellation is limited to before class start and attendance, following the voucher's restoration policy.
- Admin: campaign/promoter results count claims, active bookings and attended participants. Only previously approved demo offers can be paused/resumed; draft publication is unchanged.
- Existing Invite copy now says prepared/unverified rather than sent.
- Review fixes: promotion/voucher codes share a collision-safe tenant namespace; voucher commands reject nonexistent or foreign actors; promotion attendance requires prior reception confirmation. Desk choices omit full, expired and already-booked sessions and honor remaining participant limits. Unpublished/draft previews render the unavailable state safely.
- No dependency added. Shared design components and a documented PromotionPractice organism keep D-02 current. New CSS uses existing D-01 spacing tokens.
- Validation: pure transaction and UI lifecycle suites; screenshots are produced by GitHub-hosted Chromium, since the cloud shell runtime prevents Chromium's required local socket. Full build remains a pre-merge gate.
- Screenshot targets: ES/EN at 390 and 1280, plus key dark states. Initial draft CI must capture the real screens before this change can pass the full build or merge.
- Pages and capture references: [guide](../pages/P-02.md), [teacher](../pages/S-07.md), [recipient](../pages/C-29.md), [reception](../pages/S-08.md), [results](../pages/M-14.md).
- Build recovery: the seeded full waitlist example now falls forward to the next eligible class after closing and on Sundays. UTC/Bogotá regressions cover both boundaries.
- Boundary: all data are fictional and browser-local. No live invitations, payments, appointments or production authorization. No QR generation/scanning. A copied link is not cross-device fulfillment until the backend is connected.
