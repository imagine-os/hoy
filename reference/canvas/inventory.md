# Canvas inventory — `Hoy Wellness System.dc.html`

**Structure.** Single-document Claude Design canvas (`<x-dc>` template + one `<script type="text/x-dc" data-dc-script>` holding a `Component extends DCLogic` class, ~184 KB of JS). No iframes/srcdoc; every screen is an inline `<div id="X-NN">` template fragment inside a `.lane` div, with `{{ t.* }}` string bindings (EN/ES pairs in `d = {...}`), `<sc-for>`/`<sc-if>` loops and a `specs = {...}` object (49 entries) that powers the per-screen 'spec' side panel. Canvas-level props: lang (en/es), skin (styled/wireframe), theme (light/dark), role (student/teacher/frontdesk/coordinator/finance/super). Also a `brand` toggle (hoy 2026 vs archive sand/olive), `plans` (Modelo de Valor v3 prices, single source), `studio = {mats:15, classesPerDay:4, perPersonPerDay:1}`, `movSets` (four movements Enraíza/Fluye/Arde/Libera).

Per-item template fragments were extracted to `canvas-items/<id>.html` (plus `MAP.html` and `K-01.html` = whole lane 7). They are fragments, not standalone pages: they need support.js + the script data to render. Full spec objects (data, roles, layer tree, rules, toggles) are in `canvas-specs.json` (name/intent) and `canvas-script.js` lines 58–475.

## Lanes (source line → ids)

- **MAP** · Flow map · line 304 · (routing cards only)
- **LANE 1** · Onboarding & authentication · line 393 · A-01, A-02, A-03, A-06, A-05
- **LANE 2** · Customer core · line 568 · C-01, C-02, C-02b, C-03, C-04, C-05, C-06, C-07, C-07b(inside C-07)
- **(planes lane, id=planes)** · P-01 Plans & prices — Modelo de Valor v3 · line 1428 · P-01 (no id attr)
- **LANE 3** · Customer depth · line 934 · C-08, C-08b, C-10, C-11, C-13, C-14, C-15, C-16, C-17, C-18, C-19
- **LANE 3B** · Customer flows — phase 6 · line 1544 · C-20, C-21, C-22, C-23, C-24, C-25
- **LANE 3C** · States and edges — phase 7 · line 1789 · E-01, E-02, E-03, E-04
- **LANE 4** · Staff & front desk · line 1935 · S-01, S-02, S-03, S-04
- **LANE 5** · Admin CMS — desktop first · line 2156 · M-01, M-02, M-03, M-04, M-05
- **LANE 5B** · Admin — operations · line 2405 · M-06, M-07, M-08
- **LANE 6** · Design system · line 2552 · D-01, D-02
- **LANE 7** · Knowledgebase · line 2759 · K-01 (no id attr)

## Items (ID · name · intent)

- **A-01** · Splash / breathing load — Set the emotional register before any UI: three concentric circles breathe around the wordmark at 7s, roughly a calm respiratory cycle. `canvas-items/A-01.html`
- **A-02** · Sign in — Get a returning student into the app in one tap where possible: biometric first on a known device, then Apple or Google, then email and password. `canvas-items/A-02.html`
- **A-03** · Create account — Collect the minimum the studio actually needs, with WhatsApp as a first-class channel because that is where reminders and cancellations go. `canvas-items/A-03.html`
- **A-05** · Intention check — ¿Cómo quieres sentirte hoy? — The signature moment of the product. `canvas-items/A-05.html`
- **A-06** · Terms & Conditions / Privacy Policy — Real, linkable, versioned legal pages reachable from sign-up, the waiver, settings and the website — with placeholder body copy until counsel supplies the text. `canvas-items/A-06.html`
- **C-01** · Home dashboard — The daily landing surface: what is happening today, what I have booked, what the studio wants me to know, and the nudges the studio needs (membership, feedback, check-in). `canvas-items/C-01.html`
- **C-02** · Class schedule — Find the right class fast. `canvas-items/C-02.html`
- **C-02b** · Class schedule · week — Week view of C-02 (six-column day grid); template id only, spec shared with C-02. `canvas-items/C-02b.html`
- **C-03** · Class detail — Everything needed to commit: what the class is, who teaches it, what to bring, how full it is, and how to reserve. `canvas-items/C-03.html`
- **C-04** · Reserve & checkout — One screen from intent to confirmed, choosing the cheapest valid entitlement by default and only asking for money when there is none. `canvas-items/C-04.html`
- **C-05** · Payment methods — Colombian payment reality: cards, PSE, Nequi, Daviplata, Bancolombia transfer, Mercado Pago, wallet pay, and cash at the front desk. `canvas-items/C-05.html`
- **C-06** · Membership plans — Sell the plan without blocking the booking. `canvas-items/C-06.html`
- **C-07** · Bienvenida passes — The way in for someone with no membership: four one-time options, stacked cheapest first, each one reservable on the spot. `canvas-items/C-07.html`
- **C-07b** · Credits & class packs — Show the balance and let students top up in the sizes the studio sells: single, 3, 10, plus the trial. `—`
- **C-08** · Booked class, countdown, cancel & reschedule — Everything you can do to a reservation you already hold, including the countdown that makes the class feel imminent. `canvas-items/C-08.html`
- **C-08b** · Cancel or reschedule sheet — One button on the booked class opens one sheet, because a student who cannot make a class is taking a single decision with two outcomes. `canvas-items/C-08b.html`
- **C-10** · Rate your class — Capture feedback while it is warm, in under five seconds, with a skip that costs nothing. `canvas-items/C-10.html`
- **C-11** · History & payments — One ledger for the relationship: classes attended and every peso paid, with receipts you can forward. `canvas-items/C-11.html`
- **C-13** · Club rules & best practices — The content library that keeps the room safe and pleasant: hot-room safety, class preparation, studio etiquette, the tour, emergencies, about HOY. `canvas-items/C-13.html`
- **C-14 / C-15** · Preguntas frecuentes — The public answer sheet, split across two pages so the accordion never becomes a scroll of thirty open questions. `—`
- **C-14** · Preguntas frecuentes (1/2) — FAQ page 1; spec is the combined entry "C-14 / C-15". `canvas-items/C-14.html`
- **C-15** · Preguntas frecuentes (2/2) — FAQ page 2; spec is the combined entry "C-14 / C-15". `canvas-items/C-15.html`
- **C-16** · Invite a guest — Make word of mouth mechanical: send a pass by WhatsApp, email or link, from a class or from its own page. `canvas-items/C-16.html`
- **C-17** · Gift card — Sell wellness as a present: amount, recipient, delivery date, message, design, then pay. `canvas-items/C-17.html`
- **C-18** · Teacher gallery & profile — Let students choose a teacher, not just a time slot. `canvas-items/C-18.html`
- **C-19** · Profile, settings & membership — Everything about me and every switch I own, including where to leave a public review. `canvas-items/C-19.html`
- **C-20** · Waitlist & claim window — Turn a full class into a queue that actually converts: show the position, explain the rule, and make claiming a released spot a single tap inside a 30-minute window. `canvas-items/C-20.html`
- **C-21** · Password recovery (WhatsApp OTP) — Get a locked-out student back in through the channel they actually verified: a six-digit WhatsApp code, with email as the fallback. `canvas-items/C-21.html`
- **C-22** · Manage membership — Give members the three controls they actually need — freeze, change, cancel — without a phone call, while keeping the studio's notice periods intact. `canvas-items/C-22.html`
- **C-23** · Event detail & RSVP — Sell the things that are not regular classes — sound baths, workshops, retreats — with their own pricing, capacity and guest rules. `canvas-items/C-23.html`
- **C-24** · Notifications inbox — One place for everything the studio has sent, so a missed push or a WhatsApp scrolled past is never a lost class. `canvas-items/C-24.html`
- **C-25** · More · profile, rules, contact — A fifth destination was one too many for a 340px bar, so profile, club rules and contacting the studio live one level down. `canvas-items/C-25.html`
- **P-01** · Plans & prices — Modelo de Valor v3 — One value model, written once and read by every surface that quotes a price. `—`
- **E-01** · Home · first-time empty state — The home screen on day one, when there is no booking, no history and no statistics — it has to teach the next step instead of showing empty containers. `canvas-items/E-01.html`
- **E-02** · Payment declined — A refusal is the highest-risk moment in the funnel: say what happened, confirm nothing was charged, keep the class reserved, and offer a way through. `canvas-items/E-02.html`
- **E-03** · Class cancelled by the studio — When the studio breaks the promise, the screen should do the recovery work: refund already done, replacement classes ready, no action required to get the credit back. `canvas-items/E-03.html`
- **E-04** · Sign-in locked — A lockout is a security measure that must not become a dead end: state the pause, count it down, and route to recovery, which is not rate-limited. `canvas-items/E-04.html`
- **S-01** · Role home & demo switcher — One app, six doors. `canvas-items/S-01.html`
- **S-02** · Front desk check-in — The desk view during the ten minutes before class: who is expected, who has arrived, scan or search, and sell a drop-in on the spot. `canvas-items/S-02.html`
- **S-03** · Teacher app — What a teacher needs between classes: schedule, roster and attendance, their own content, reviews, and what they have been paid. `canvas-items/S-03.html`
- **S-04** · Register & take payment — The counter transaction in one screen: who they are, what they are buying, how they are paying. `canvas-items/S-04.html`
- **M-01** · Admin dashboard & feature switches — The control room: the numbers that matter this and the switch panel that turns pages, steps and features on or off across the app, the website and the staff tools. `canvas-items/M-01.html`
- **M-02** · Content: classes, teachers, schedule, pricing — The single source of truth behind everything: class types, the schedule, teacher profiles, pricing and content — feeding the app, the staff tools and the public website. `canvas-items/M-02.html`
- **M-03** · Tables & relations — The data model in one place, so developers and the studio agree on what exists: entities, keys, relations and cardinality. `canvas-items/M-03.html`
- **M-04** · Transactional email designs — Every automated email as a real design, editable and previewable, in both languages, with the trigger and the deep link it carries. `canvas-items/M-04.html`
- **M-05** · WhatsApp automations — The channel the studio actually lives on: approved template messages, their triggers, timing and quiet hours. `canvas-items/M-05.html`
- **M-06** · CRM · member 360 — One record per person that the whole studio trusts: who they are, what they have paid, what they have attended, and every conversation across WhatsApp, email and the front desk — with staff notes on the same timeline. `canvas-items/M-06.html`
- **M-07** · All activity log — An immutable record of everything anyone did, so a disputed refund, a deleted class or a changed price can always be traced to a person and a moment. `canvas-items/M-07.html`
- **M-08** · Studio settings & policies — The operating parameters every other screen reads from: identity, hours, rooms, the cancellation and waitlist rules quoted across the app, tax and invoicing, and the third parties the studio depends on. `canvas-items/M-08.html`
- **D-01** · Materials, tokens & physicality — The material layer of the system: textures, surfaces, elevation and corner radii, with a switch between the styled build and the functional wireframe. `canvas-items/D-01.html`
- **D-02** · Component library — atomic — Every component in the product, organised as atoms, molecules, organisms, templates and pages, so a developer can build a screen without inventing anything. `canvas-items/D-02.html`
- **K-01** · Plan, kanban & changelog — The knowledgebase: the build plan, the board tracking it, and the log of every change with the reasoning behind it. `canvas-items/K-01.html`

## Knowledgebase (K-01) contents

Build plan v0.2, phases: 1 · Map & foundations; 2 · Customer core; 3 · Customer depth; 4 · Staff baseline; 5 · Admin & CMS; 6 · Missing customer flows; 7 · States & edges; 8 · Finance & coordination; 9 · Public website; 10 · Functional prototype & handoff. Phases 1–7 marked done, 8 next, 9–10 planned.

Changelog entries (EN titles): 8 Sep 2026 · Initial system canvas; 8 Sep 2026 · Revised plan and library rule; 8 Sep 2026 · Phase 6 customer flows; 8 Sep 2026 · Phase 7 states and edges; 9 Sep 2026 · C-02 schedule views; 9 Sep 2026 · HOY 2026 brand applied; 9 Sep 2026 · Navigation restructured; 9 Sep 2026 · Detail layers, payment marks, admin operations; 9 Sep 2026 · Schedule reduced to two views; 10 Sep 2026 · Photography, dock icons, More; 11 Sep 2026 · Modelo de Valor v3 wired in; 11 Sep 2026 · Waiver, check-in and chat removed; 12 Sep 2026 · Front desk suite; 12 Sep 2026 · Offline check-in retired; No online classes; Face check-in off by default; Pending.

Kanban columns: To do / In progress / Done / Blocked. Rules: every change logged with prompt intent, decision, files, version; D-02 kept current in the same turn.

## support.js

`support.js` (69 KB, generated from `dc-runtime/src/*.ts`, bundled with bun) is the Claude Design canvas runtime: it parses the `<x-dc>` template and `data-dc-script` props, compiles the `{{ }}` / `sc-for` / `sc-if` template into React elements (expects `window.React`/`ReactDOM` to be present) and boots a `StandaloneRoot` that renders the component's `renderVals()` state. It also handles postMessage with a parent editor frame, resolves `__resources`, and warns about unresolved bindings — it contains no HOY-specific content.
