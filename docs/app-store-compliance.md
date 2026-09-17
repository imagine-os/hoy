---
title: App-store compliance checklist
updated: 2026-09-17
version: 0.7.0
---

# App-store compliance checklist

**Resumen (ES).** Lo que Apple (App Store Review Guidelines) y Google (Play policies) exigen a una app
como HoyOS antes de publicarla, fila por fila, con su estado: **hecho** (existe en el código),
**pendiente** (decisión o texto del owner / abogado) o **falta desarrollo** (necesita backend o build
nativa). Lo estructural — eliminar la cuenta desde la app (C-26) y desde una URL pública (W-09), la cola
de admin (M-11), qué se conserva y por qué, exportar los datos, los consentimientos — ya está. Lo que
falta es sobre todo el backend real (Supabase Auth), la envoltura nativa y las decisiones legales que
ya están en `ROADMAP.md` §E. Este archivo se lee en la app en `/#/docs/app-store-compliance`.

This checklist is written for the day HoyOS is wrapped as a native or hybrid app and submitted. It is
maintained with the code: when a row changes status, the change is logged in `docs/changelog/`.
Legend: **done** = exists in this repo · **pending** = an owner or counsel decision, no code needed ·
**needs dev** = code that does not exist yet (usually the real backend or the native shell).

## 1 · Apple App Store

| Guideline | What it asks | Status | Where / what remains |
| --- | --- | --- | --- |
| 5.1.1(v) Account deletion | An app that lets people create an account must let them **start deleting it in the app**, easy to find, and the deletion must be real (not just deactivation). | **done** (structure) / **needs dev** (execution) | C-26 `/app/account` → *Eliminar la cuenta* (two taps, explains what is kept). Writes `deletion_requests`; M-11 tracks it. The anonymisation job (profiles, users, auth user) is server-side and does not exist until Supabase lands (`ROADMAP.md` §F 1). |
| 5.1.1(v) Retention explanation | It is acceptable to keep data the law requires; the app must **say so clearly**. | **done** | C-26 step 1 lists what is kept (invoices, payment history — anonymised — for the legal retention period) and what ends; the privacy policy §6–§7 (A-06) carries the same rule. |
| 5.1.1(i)–(ii) Privacy policy | A privacy policy link in the App Store Connect metadata and inside the app, explaining what is collected, how, retention, and how to revoke consent. | **done** (structure) / **pending** (final text) | A-06 `/site/legal/privacy` and `/app/legal/privacy`, versioned. Final text and the named data controller are counsel's (`ROADMAP.md` §E 3, 14, 30). |
| 5.1.1(iii) Data minimisation, consent | Ask only what the service needs; consent for anything else, revocable. | **done** | Sign-up asks name, email, WhatsApp, password, birthday, emergency contact. Marketing consent is per channel in C-26 / C-24; transactional messages are separate. |
| 5.1.1(iv) Access | People must be able to access their data. | **done** | C-26 *Descargar mis datos* (JSON of every own row); C-11 history. |
| 5.1.2 Data use and sharing | No sharing without consent; third parties named. | **pending** | Privacy policy §5 names Wompi, WhatsApp / Meta, the email provider and Supabase generically; the exact list is fixed when the vendors are contracted. |
| Privacy nutrition labels (App Store Connect) | Declare every data type collected, linked to identity, used for tracking. | **pending** | Draft from `docs/data-model.md`: contact info (name, email, phone), health & fitness (waiver health declaration, attendance), purchases (payments), user content (reviews, notes), identifiers (user id), usage data (audit of own actions). No tracking, no ads → "Data Not Used to Track You". |
| 4.8 Sign in with Apple | If the app offers a third-party or social login (Google, Facebook…), it must also offer Sign in with Apple, or an equivalent privacy-preserving option. | **pending** / **needs dev** | A-02 shows disabled Apple / Google buttons. Decide: email + WhatsApp OTP only (no obligation), or add Google → then Apple is mandatory. Supabase Auth supports both. |
| 5.1.1 Login not required for non-account features | Do not force an account to browse. | **done** | The site (W-01…W-09, P-01, A-06) and the public schedule need no session; booking does. |
| 3.1.1 vs 3.1.3(e) In-app purchase | Digital goods must use IAP; **services consumed outside the app** (a yoga class, a membership to a physical studio) may use a third-party gateway. | **done** | Everything sold is a physical service (classes, passes, memberships, room rentals, events in the room). Wompi (C-04, C-06, C-17, C-23) is allowed. Do not sell a digital-only product (recorded classes) through Wompi without revisiting this row. |
| 3.1.2 Subscriptions | Recurring memberships: clear price, period, cancel path, notice before charge. | **done** | C-06 / C-22 show price, period, pause and cancel; notice before charge is `policy.chargeNoticeDays` (M-08). Terms §4. |
| 1.1 / 1.2 Content, UGC | Reviews (C-10) are user-generated: need a way to report and to block, and moderation. | **needs dev** | Reviews are anonymous by default and only the studio sees who wrote them; a "report this review" action and a moderation queue do not exist. Low risk (reviews are not public between members), but add before submission if reviews are shown publicly on W-01. |
| 2.1 App completeness, demo data | No placeholder content, no demo accounts in the store build. | **needs dev** | The demo user picker (A-02) and `MockProvider` are dev-only by design; the store build must ship `SupabaseProvider` and real auth. |
| 2.3 Accurate metadata, screenshots | Screenshots match the app. | **done** | `docs/screenshots/` is regenerated every pass (`npm run screenshots`). |
| 5.1.5 Location | Only if used. | **done** | No location permission is requested. `MapSlot` is a static embed. |
| Push notifications (4.5.4) | Opt-in, not required, no marketing without consent. | **done** (prefs) / **needs dev** (delivery) | C-24 / C-19 per channel × category; push delivery needs the native shell. |
| Legal: EULA, terms | Terms of service reachable. | **done** (structure) / **pending** (text) | A-06 terms, versioned; counsel review pending. |

## 2 · Google Play

| Policy | What it asks | Status | Where / what remains |
| --- | --- | --- | --- |
| Account deletion (User Data policy) | Apps with account creation must offer deletion **in the app and at a web URL** that needs no sign-in, declared in the Data safety form, and delete server data (or explain retention). | **done** (structure) / **needs dev** (execution) | In-app: C-26. Public URL: **W-09 `/site/delete-account`** (`https://imagine-os.github.io/hoy/#/site/delete-account` today; the final domain later). Retention explained on both. Execution is the server-side job. |
| Data safety form | Declare collected / shared data, encryption in transit, deletion request path, purpose per type. | **pending** | Same inventory as the Apple labels above. Encryption in transit: yes (HTTPS). Deletion request path: W-09 URL. |
| Privacy policy URL | In the store listing and in the app. | **done** / **pending** text | A-06 privacy. |
| Permissions | Request only what is used; declare sensitive ones. | **done** | No camera, contacts, location or SMS permission in the web app. Photo upload (C-19, M-02d) uses the file picker (no permission). If the native shell adds camera or notifications, declare them. |
| Health apps / sensitive data | Health-related data (the waiver's health declaration) must be handled as sensitive, with consent and a clear purpose. | **done** (policy) | Privacy policy §3 (sensitive data optional, five-year retention from the last visit); manual chapter 23 §1 rule 3; `profiles.notes` is admin-only. |
| Payments policy | Physical services may use a third-party gateway. | **done** | Same reasoning as Apple 3.1.3(e): Wompi is fine for classes, memberships and rentals. |
| Subscriptions | Transparent terms, easy cancel. | **done** | C-22 cancel keeps access to the end of the paid period; terms §4. |
| Families / age | If minors can use it, comply with the Families policy; otherwise age-gate. | **pending** | Terms §2: 18+, or 14–18 with a guardian's written authorisation. Decide whether to state a minimum age in the store listing (recommended: 18+, guardian flow at the desk). |
| Target API level, 64-bit, app bundle | Native packaging. | **needs dev** | Applies to the wrapper (Capacitor / TWA), not to this repo. |
| UGC policy | Reporting and moderation for user content. | **needs dev** | Same as Apple 1.2 — reviews. |

## 3 · Both stores — what the app already provides ("standard settings")

| Setting | Screen | Notes |
| --- | --- | --- |
| Edit profile, photo, emergency contact | C-19 | Real rows (`profiles`, `users`). |
| Notification preferences, channel × category | C-24 / C-19 | `notification_prefs`; no row = enabled; marketing is opt-out per channel. |
| Marketing consent (WhatsApp, email) | C-26 | Writes `notification_prefs` marketing + mirrors `profiles.marketing_optin`; audited. |
| Data-processing consent (privacy version accepted) | C-26 → A-06 | `legal_acceptances`, append-only. |
| Download my data | C-26 | JSON of the member's own rows across 20 tables; audited (`account.export`). |
| Delete my account | C-26 · W-09 · M-11 | `deletion_requests`; fifteen business days (Ley 1581); rows never deleted. |
| Language | C-19 | Per account (`users.locale`). |
| Legal documents, versioned | A-06 | Six kinds; accept the current version in-app. |
| Sign out | C-19 / C-25 | |
| Payment methods | C-05 | Tokenisation is the Wompi seam (`ROADMAP.md` §F 2). |

## 4 · Before submission (in order)

1. Supabase Auth + `SupabaseProvider` (P2) — turns the demo picker into real accounts and makes the
   deletion job possible.
2. The server-side deletion job: anonymise `profiles` + `users`, delete the auth user, purge
   `notifications` / `notification_prefs` / `intentions` / `waitlist`, cancel future `bookings`, blank
   `message_log.payload`, keep `payments` / `invoices` / `legal_acceptances` / `consents` under the
   anonymous id, then flip `deletion_requests.status` to `done` and send the confirmation. M-11's
   checklist is the spec of that job.
3. Counsel signs off the privacy policy and terms; the data controller is named (§E 3, 14, 30).
4. Decide the sign-in set (email + OTP only, or Google → then Sign in with Apple).
5. Fill the privacy labels and the Data safety form from `docs/data-model.md`.
6. Native shell (Capacitor or a TWA), push delivery, store screenshots from `docs/screenshots/`.
