# HOY Wellness System canvas — audit (17 Sep 2026)

Source: `src/canvas/Hoy Wellness System.dc.html` (4 476 lines; template lines 9–3013, script lines 3014–4474).
Corrected copy: `out/Hoy Wellness System.dc.html` (4 486 lines, 35 targeted edits, 92 changed lines, version v1.4 → v1.5).
Method: the `<x-dc>` template was cross-checked against the `d`/`d2` dictionaries, `specs`/`specs2`, `plans`, the Flow Map, K-01 (changelog + kanban) and D-02 by script (`work/analyze.js`, `work/dump.js`), then each finding was verified by hand at the quoted lines. Line numbers below refer to the **source** file.

**Result: 34 findings — 27 fixed in the corrected copy, 7 recommended (left alone to keep the diff minimal).**
Validation of the output: extracted script passes `node --check`; `d`/`d2` contain no duplicate keys; all 850 `t.*` bindings in the template resolve (`fl_1` is injected at render time, line 4405); every `specFns.*` chip has a spec and every spec is bound to a chip; `<div>`/`<span>` counts balance (1919/1919, 896/896).

## Findings

| # | Item | What is stale / inconsistent | Evidence (source lines) | Fix |
|---|------|------------------------------|-------------------------|-----|
| 1 | Flow Map · C-07b | Map node "C-07b · Credits & packs" points at a screen that does not exist: no `id="C-07b"`, no code chip, only a hollowed-out container left after v1.1 replaced credits with Bienvenida passes; the `credits` spec (code C-07b) is bound to no chip. | 336 (map node); 921–928 (empty shell); 3304–3312 (orphan spec); 4116 (`n_credits`) | **Applied**: map node removed, empty container removed, `credits` spec removed, retirement recorded in the new v1.5 changelog entry. `n_credits` string left in place (unused, harmless). |
| 2 | Flow Map · P-01 | Map and `specs2.planes` reference P-01 but no element carries `id="P-01"` (lane has `id="planes"`, which FAQ rules link to as `#planes`). | 352 (map); 1428–1433 (lane); 3136 (spec) | **Applied**: `id="P-01"` added to the lane header row; `id="planes"` kept. |
| 3 | Flow Map · K-01 | Map and `specs2.plan` reference K-01, lane has no id. | 385 (map); 2759 (lane); 3476 (spec) | **Applied**: `id="K-01"` added to the lane div. |
| 4 | Flow Map · C-02b label | Map labels the node `{{ t.v_week }}` ("Week") while the section header uses `n_sched_w` ("Class schedule · week"). | 330 vs 691 | **Applied**: map uses `n_sched_w`. |
| 5 | Flow Map · order | C-24 is listed before C-23. | 350–351 | **Applied**: swapped. |
| 6 | Flow Map · C-14/C-15 | Labelled "Preguntas frecuentes (1/2)/(2/2)" — verified correct: sections 1117/1240 use `faq_1of2`/`faq_2of2`. The K-01 "Modelo de Valor v3" entry calling C-15 the gift card is the stale side (see #12). | 343–344, 1119–1120, 1242–1243 | No change needed. |
| 7 | Spec coverage · C-02b | Section has no spec of its own; chip re-uses `specFns.sched` (C-02). | 692 | **Applied**: new `specs2.schedw` (code C-02b, "Class schedule · week", same shape: intent/story/data/roles/layers/rules/api/states/toggles); chip rebound. |
| 8 | Spec coverage · C-14 / C-15 | One shared spec with `code: "C-14 / C-15"`; both chips bind to it, so the panel header shows a double code and C-15 has no spec of its own. | 1121, 1244, 3118–3126 | **Applied**: `faq` becomes C-14 "Preguntas frecuentes (1/2)"; new `faq2` entry for C-15 (2/2) covering sections 04–06; C-15 chip rebound to `specFns.faq2`. |
| 9 | Removed screens A-04 / C-09 / C-12 | Verified removed: no ids, chips, map nodes or specs. `n_waiver`, `wv_sign`, `toggleable`, `ph_qr`, `door_scan`, `door_manual`, `dr_cam`, `dr_face` remain as unused dictionary keys. | 3038, 3050 | Confirmed. Recommended: prune the eight orphan keys. |
| 10 | K-01 changelog · duplicate keys | `cl3t`/`cl3b` are defined twice in `d2` (Phase 6 entry at 3691–3692, "Waiver as a switchable step" at 4014–4015). The later definition wins, so the v0.3 row rendered the waiver decision and the **Phase 6 entry was invisible**. | 2911–2912 (v0.3 row), 2927–2928 (v0.1 row), 3691–3692, 4014–4015 | **Applied**: Phase 6 entry renamed `clP6t`/`clP6b`; v0.3 row bound to it. Waiver decision keeps `cl3t`/`cl3b` on the v0.1 row. |
| 11 | K-01 changelog · Phase 6 entry codes | "Built C-18 to C-22: waitlist … event detail" — those screens are C-20–C-24 (C-18 = teachers, C-19 = profile). EN and ES. | 3692 | **Applied**: C-20 to C-24 (EN + ES). |
| 12 | K-01 changelog · "Modelo de Valor v3" (v1.1) | Reconciled-surfaces list uses pre-renumber codes: "C-07 credits" (C-07 is Bienvenida passes), "C-15 gift card" (C-17), "C-20 manage membership" (C-22), "C-23 More" (C-25), "event pricing (C-22…" (C-23). EN and ES. | 3514–3515 | **Applied**: all five corrected in both languages. |
| 13 | M-08 policy card | Waitlist rule "30 min" quotes `C-18`; waitlist is C-20. | 2533 | **Applied**: C-20. |
| 14 | K-01 kanban · counts | "Done · 14" but 20 cards rendered; "In progress · 3", "To do · 4", "Blocked · 6" correct. | 2836 vs 2838–2857 | **Applied**: Done · 21 and In progress · 4 after adding the new cards (#20). |
| 15 | K-01 spec (`plan`) | Layer tree says "PlanPhases (1–6)" and "KanbanBoard (To do / In progress / Done)"; the plan has 10 phases and a Blocked column since v0.2. | 3480 vs 2778–2787, 2825, 4011 | **Applied**: 1–10; Blocked column added. |
| 16 | C-01 `home` spec | Intent lists "check-in" among home nudges; customer check-in (C-09) was removed in v1.2. | 3250 vs 4158 | **Applied**: "(membership, feedback)". |
| 17 | A-06 `legal` spec | "reachable from sign-up, the waiver, settings" — waiver (A-04) removed in v1.2. | 3094 vs 4158 | **Applied**: waiver dropped. |
| 18 | A-03 `signup` spec | Layer tree "ProgressDots (1 of 3)"; sign-up is two steps since v1.2 and the artboard draws two dots. | 3083 vs 466–467, 4158 | **Applied**: (1 of 2). Rule "not only once a waiver is signed" (3084) left as historical rationale. |
| 19 | C-02 `sched` spec | Intent says "Four views (today, week, recurring)" while its own rules say "Two views only" (v0.9). | 3259 vs 3264, 4096–4097 | **Applied**: "Two views (today, week)". |
| 20 | K-01 · new entry | Move to a real codebase not yet logged. | — | **Applied**: v1.5 row + `clRepo`/`clRepob` (EN + ES, 17 Sep 2026: intent, decision, alternative rejected, files, version), kanban `eRepo` (Done) and `gRepo` (In progress · phase 10); toolbar stamp v1.4 → v1.5 (line 294). |
| 21 | Lane 3 subtitle `l3s` | "Booked class, check-in, feedback, content, community" — check-in no longer in lane 3. | 4111 region (l3s), 934 | **Applied**: check-in dropped (EN + ES). |
| 22 | Pricing consistency | All quoted figures match `plans` (4218–4247): trial $39.000, pack10 $490.000, single/bono $58.000, monthly $520.000, annual $4.990.000 (≈ $416.000/mo, 3140 & 4065). S-04 IVA $7.410 / total $46.410 are typed but equal 19 % on $39.000. Event $60.000/$85.000, payroll and admin KPIs are outside the model, as v1.1 already flags. | 815 (computed), 2144–2145 (typed), 3514, 3537, 3553, 3556 | Consistent. Recommended: compute S-04 IVA/total from `plans` like C-04 does. |
| 23 | D-02 spot-check (present) | OTP input (C-21), waitlist position + claim countdown (C-20), notification row (C-24), destructive row (C-22), empty state / error banner / skeleton (E-01…E-04), day-column chip (C-02b), pricing card (C-07/P-01), payment marks (C-05), bottom dock 4 icons (C-01…), timeline entry (M-06), log row (M-07), More sheet (C-25). | 2631–2758 | OK — 13 of the components screens use are registered. |
| 24 | D-02 spot-check (missing) | Used on screens but absent from the library: Today/Week segmented switch (C-02, 648–649; key `at_seg` exists but no specimen is rendered), FAQ accordion row (C-14/C-15), five-star rating (C-01/C-10), now/next/later strip and member-search field with recent arrivals (S-02, `fd_now`… `fd_search`), teacher arrived/expected chips (S-02), gift design picker (C-17), intention tile (A-05), breathing rings (A-01), progress dots (A-03). | 648–649, 1130–1136, 1969–2046, 1328–1366 | Recommended (would be a D-02 redesign): register these nine under the living-inventory rule, or delete `at_seg`/`at_fab`/`at_nav`. |
| 25 | D-02 copy | `at_tpl_b` says "Pages: the 30 screens on this canvas" — there are 49 sections; `at_nav` says "Bottom navigation · 5 tabs" (dock is 4 tabs since v1.0; key unused). | at_tpl_b / at_nav in d2 | Recommended: update counts. |
| 26 | S-02 `door` spec | Still lists `face_templates` and `POST /checkins/scan` although v1.4 removed the QR/face scanner panel; `act_1` "Turned off Face check-in" and `am_f4` "Face check-in" remain valid as admin flags. | 3394–3402 vs 4048 | Recommended: drop scanner data/API from the S-02 spec. |
| 27 | Plan phase 3 `p3b` | Lists "check-in" and "front desk" as phase-3 deliverables; both moved (front desk to phase 4/v1.4) or were removed. | 3954 | Recommended: historical plan text, amend or leave with a note. |
| 28 | Changelog version chips | Bottom rows show v0.1 four times and v0.2 twice (v0.2 "Pending" at 2935 plus v0.2 "Revised plan"); decision entries (v0.1 ×3) carry no date. | 2919–2936 | Recommended: date the decision entries; cosmetic, not changed. |
| 29 | Section vs spec names | 20 sections use a shorter header than the spec `name` (e.g. C-19 "Profile & settings" vs spec "Profile, settings & membership"; M-02 "Content: classes & teachers" vs "…schedule, pricing"). Meaning matches in every case. | see `work/analyze.js` output | Not changed; the corrected code→name map below uses the section (header) name as canonical and the spec name as long form. |
| 30 | Orphan dictionary keys | 32 keys defined but never bound: tb_styletb_wire, n_waiver, toggleable, wv_sign, fl_sub, at_seg, at_tog, f2_1d–f2_4d, dr_sell, dr_cam, dr_face, fd_recent, fd_today, fd_a1, at_fab, at_nav, n_credits, n_desk, n_admin_cms, q_desk, v_recur, f_room, read_more, pay_method, ph_qr, door_scan, door_manual, edit. | d 3018–3070, d2 3487–4189 | Recommended: prune in the repo port; harmless in the canvas. |
| 31 | E-04 renumbering | v1.3 says E-05 → E-04; verified: E-04 is "Sign-in locked", no E-05 anywhere. | 1905, 4155 | Confirmed. |
| 32 | C-02c / C-02d | v0.9 says removed; verified: no ids, chips or nodes remain. | 4097 | Confirmed. |
| 33 | Spec C-08b `change` | No `data`/`roles` arrays (only api). | 3111–3117 | Recommended: add `data` (bookings, classes, cancellation_policy, credits) and `roles` (Student, Front desk). |
| 34 | Kanban blocker `b2n` | "blocks C-04, C-06, C-07, phase 9" — codes valid (C-07 now Bienvenida). | 3992 | Confirmed. |

## Corrected code → name map (canonical after the fix)

Lane · code · EN (section header) / ES · spec key.

**Public / pre-login (LANE 1)**
- A-01 · Splash / breathing load / Splash / carga que respira · `splash`
- A-02 · Sign in / Iniciar sesión · `auth`
- A-03 · Create account / Crear cuenta · `signup`
- A-06 · Terms & privacy / Términos y privacidad · `legal`
- A-05 · Intention check / Intención del día · `feel`

**Customer core (LANE 2)**
- C-01 · Home dashboard / Panel de inicio · `home`
- C-02 · Class schedule / Horario de clases · `sched`
- C-02b · Class schedule · week / Horario · semana · `schedw` (new)
- C-03 · Class detail / Detalle de clase · `detail`
- C-04 · Reserve & checkout / Reservar y pagar · `reserve`
- C-05 · Payment methods / Métodos de pago · `pay`
- C-06 · Membership plans / Planes de membresía · `member`
- C-07 · Bienvenida passes / Pases Bienvenida · `bienvenida`
- ~~C-07b · Credits & packs~~ — retired (content lives in C-07 + P-01 since v1.1)

**Plans (lane `planes`)**
- P-01 · Plans & prices — Modelo de Valor v3 / Planes y precios · `planes`

**Customer depth (LANE 3)**
- C-08 · Booked class & countdown / Clase reservada y cuenta atrás · `booked`
- C-08b · Cancel or reschedule / Cancelar o reprogramar · `change`
- C-10 · Rate your class / Califica tu clase · `rate`
- C-11 · History & payments / Historial y pagos · `history`
- C-13 · Club rules & practices / Reglas y buenas prácticas · `rules`
- C-14 · Preguntas frecuentes (1/2) · `faq`
- C-15 · Preguntas frecuentes (2/2) · `faq2` (new)
- C-16 · Invite a guest / Invita a alguien · `invite`
- C-17 · Gift card / Tarjeta regalo · `gift`
- C-18 · Teacher gallery / Galería de profesores · `teachers`
- C-19 · Profile & settings / Perfil y ajustes · `profile`

**Customer flows — phase 6 (LANE 3B)**
- C-20 · Waitlist & claim window / Lista de espera y reclamo · `wait`
- C-21 · Password recovery (WhatsApp OTP) / Recuperar contraseña · `reset`
- C-22 · Manage membership / Gestionar membresía · `mmemb`
- C-23 · Event & RSVP / Evento y RSVP · `event`
- C-24 · Notifications / Notificaciones · `notif`
- C-25 · More · profile, rules, contact / Más · perfil, reglas, contacto · `more`

**States and edges — phase 7 (LANE 3C)**
- E-01 · Home · first-time empty / Inicio · primera vez · `xempty`
- E-02 · Payment declined / Pago rechazado · `xdec`
- E-03 · Class cancelled by studio / Clase cancelada por el estudio · `xcxl`
- E-04 · Sign-in locked / Inicio bloqueado · `xlock`

**Staff & front desk (LANE 4)**
- S-01 · Role home / Inicio por rol · `role`
- S-02 · Front desk check-in / Check-in en recepción · `door`
- S-03 · Teacher app / App del profesor · `teach`
- S-04 · Register & take payment / Registrar y recibir pago · `reg`

**Admin CMS (LANE 5)** — M-01 Admin dashboard & features · `admin`; M-02 Content: classes & teachers (schedule, pricing) · `cms`; M-03 Tables & relations · `tables`; M-04 Transactional emails · `email`; M-05 WhatsApp automations · `wa`
**Admin — operations (LANE 5B)** — M-06 CRM · member 360 · `crm`; M-07 All activity log · `act`; M-08 Studio settings & policies · `set`
**Design system (LANE 6)** — D-01 Materials & tokens · `ds`; D-02 Component library · `atoms`
**Knowledgebase (LANE 7)** — K-01 Plan, kanban & changelog · `plan`

Removed and verified absent: A-04 waiver (v1.2), C-09 customer check-in (v1.2), C-12 in-app chat (v1.2), C-02c month / C-02d recurring (v0.9), E-04 offline check-in → renumbered (v1.3), C-07b credits (retired now, v1.5).
