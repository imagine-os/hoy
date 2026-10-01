# Practice analytics — research, proposal and what HoyOS implements

Written for the owner, 2026-09-29 (0040, v0.16.0; research and direction Fable 5.1, build Opus 5.5). This is the
answer to "do some deeper research into best practices for gym / yoga / wellness analytics specific to on-location
businesses and what the customers track vs what the teachers and club track", and the record of what was built from
it. Code: `src/data/analytics.ts` (the rules, no React), `src/data/useAnalytics.ts` (the hooks); proof:
`npm run test:analytics`. Screens: C-01 (home block), C-27 Tu práctica, M-06 Práctica tab, M-12 Analítica de práctica,
S-03 Mis números.

## 1. Why the old card confused

The home showed three tiles under one eyebrow: **"Clases este mes"**, **"Racha"** and **"Créditos"**.

- **"Clases este mes"** did not say what it counted. A member holds three different numbers at once — classes
  *attended* (checked in), classes *booked* for later, and classes *left* on a plan — and the tile counted
  check-ins by the **booking's creation date**, so a class booked in September and taken in October counted for
  September. C-22 counted "booked and attended" together under the same label, so the two screens disagreed.
- **"Racha"** was not a streak at all: `min(8, ceil(classes / 2) + 1)` weeks — a formula over the month count, with no
  goal, no week boundary and no memory. It read as gaming ("racha" alone) and meant nothing.
- **"Créditos"** showed `∞` for a membership and a raw balance for a pack, with no expiry and no name for what
  the number was.

Every studio system in the research splits these (first visits, total visits, no-shows, credits remaining as
*separate* reports — [Mindbody](https://www.mindbodyonline.com/business/education/templates/first-visit-report-workbook-fitness-businesses),
[Glofox](https://support.glofox.com/hc/en-us/articles/46458687893908-No-Shows-Report),
[Mariana Tek](https://www.marianatek.com/?p=9520)). Rule adopted: **one label per number, and the label says what is
counted.**

## 2. What members track vs what teachers track vs what the club tracks

### 2a. Members — private, motivating, plainly worded

| Metric | Definition | Why it motivates | Pitfall avoided |
| --- | --- | --- | --- |
| Clases tomadas este mes | `checked_in` bookings whose **session** starts this calendar month | Concrete, matches memory | Never mixed with bookings; counted by session date |
| Reservadas próximas | `booked` bookings with the session in the future | A commitment device | Shown as the hint under the month count, never added to it |
| Clases restantes en tu plan / Membresía | Live credit balance + next expiry; or "Ilimitada · renueva {date}" | Loss aversion on paid value | Unlimited plans show the renewal, not a balance |
| Esta semana: N de M | Visits this week (Mon–Sun) against the member's own goal | Self-set, achievable, resets every Monday | Goal is asked, never inferred silently |
| Semanas seguidas cumpliendo tu meta | Consecutive weeks the goal was met, one rest week per four | Weekly cadence tolerates rest days | A broken run shows the best run, never a red zero |
| Logros | Lifetime visits 1 · 5 · 10 · 25 · 50 · 100 · 250 | Visit 5 is the retention cliff; celebrate it | Not gated on plan type |
| Minutos de práctica | Sum of session durations attended this month | Tangible for yoga | Secondary tile, never the headline |
| Lo que más practicas | Most-attended modality and teacher, distinct types tried (90 days) | Encourages exploration | A suggestion, not a score |

Evidence: Peloton's weekly streak resets only after a whole week without activity, week starting Monday
([Peloton](https://www.onepeloton.com/blog/secret-to-workout-streaks)); Fitbod counts consecutive weeks meeting a
self-set weekly goal ([Fitbod](https://help.fitbod.me/hc/en-us/articles/360013245993)); Ergatta lets the member set
"days per week" ([Ergatta](https://ergatta.com/blogs/feature-releases/new-weekly-goals-and-streaks)); Apple Fitness's
daily ring with no rest days is the widely criticised counter-example
([iMore](https://www.imore.com/hey-apple-watch-can-you-give-it-rest)). Broken streaks demotivate — 66 % continued a
behaviour when an intact streak was highlighted vs 58 % after a break, and repair mechanics help
([INSEAD on Barasch & Silverman](https://knowledge.insead.edu/marketing/consumer-streaks-are-motivating-key-keeping-them-alive));
Duolingo's Streak Freeze lifted daily actives ([Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit)).
Milestones: Peloton badges 1 / 10 / 25 / 50 / 75 / 100 ([Peloton](https://www.onepeloton.com/en-AU/blog/milestones));
Gymflow flags the 1st class and every 25th to staff at check-in so the team can celebrate in person
([Gymflow](https://support.gymflow.io/articles/9790679-class-milestone-tracking)). Two visits a week in the first
weeks is the habit that predicts staying ([Clubworx](https://www.clubworx.com/blog/how-to-retain-new-gym-members-the-90-day-retention-strategy-that-works),
[Gymdesk](https://gymdesk.com/blog/5th-class-cliff-gym-member-retention), [arXiv 2501.01779](https://arxiv.org/abs/2501.01779)).

### 2b. Teachers — their own numbers against the studio average, never a list of colleagues

| Metric | Formula (30 days, S-03 "Mis números") | Note |
| --- | --- | --- |
| Ocupación | seats taken / capacity of the teacher's completed classes | Next to the studio's fill |
| Asistencia media | check-ins / classes taught | Next to the studio's average per class |
| No-shows | no-shows / seats taken | Next to the studio's rate |
| Caras nuevas | members whose first class *with this teacher* fell in the range | Shown so the teacher can greet them |
| Regulares | members with ≥ 3 classes with this teacher in the range | Community signal |
| Primerizos que volvieron | people whose **first ever** class was with this teacher, who attended any class within 30 days | Walla's "client retention" |
| Valoración | mean of the teacher's reviews in range, hidden under 5 reviews | Private to the teacher and the coordinator |

Walla's instructor stats (fill, client retention, popularity, reliability) are the clearest published set
([Walla](https://hellowalla.com/blog/clear-expectations-with-instructor-stats)); the per-teacher **table** is staff-only
(M-12), and S-03 shows one teacher's own numbers with the studio figure as the hint.

### 2c. Club — attendance and retention (no money on this page, see §7)

| Metric | Formula (M-12, range 7 / 30 / 90 days) | Threshold used |
| --- | --- | --- |
| Ocupación | seats taken (booked + checked in + no-show) / capacity of completed classes | 70–85 % healthy; > 90 % add a class; < 60 % for 4 weeks review the slot |
| Asistencia | check-ins / seats taken | — |
| No-shows · cancelaciones tardías | no-shows / seats taken · late cancels / (seats taken + late cancels) | > 20 % no-shows: review the policy |
| Miembros activos · nuevos · visitas/semana | distinct users with a check-in · first ever check-in in range · check-ins / active / (range ÷ 7) | ≥ 2 visits a week |
| Horarios populares | mean per-class fill by weekday × start hour (heatmap) | same 70–85 % guide |
| Segunda visita | first-timers of 30–60 days ago who attended again within 30 days | goal > 60 % (industry < 50 %) |
| Sin venir (at risk) | a live package (or a dormant active membership; credits until 0051) AND last check-in ≥ 14 days ago | ladder 14 / 30 / 60 / 90 days; a list of who to call, not a ranking |
| Por modalidad · por profesor | fill and attendance per completed class | — |
| Logros recientes | milestones reached in range, newest first | to congratulate in person |
| Paquetes por vencer (Créditos por vencer until 0051) | people with package classes left whose expiry falls within 14 / 7 days | nudge at 14 and 7 days |
| Metas | members with a goal · on track this week · average goal | adoption of the picker |

Benchmarks: annual retention 66.4 % across the industry, 75–80 % for well-run boutiques
([HFA 2025](https://www.healthandfitness.org/hfa-releases-2025-fitness-industry-benchmarking-report/),
[Uptivo](https://uptivo.fit/blog/gym-member-retention-statistics)); more than half of first-timers never return and
retention holds above 90 % after visit 5 ([Mindbody](https://www.mindbodyonline.com/business/education/templates/first-visit-report-workbook-fitness-businesses),
[Gymdesk](https://gymdesk.com/blog/5th-class-cliff-gym-member-retention)); fill 70–85 %
([fitDEGREE](https://fitdegree.com/post/how-to-build-a-class-schedule-that-maximizes-revenue-per-square-foot),
[Walla utilisation](https://hellowalla.com/blog/determine-class-and-schedule-efficiency-and-earn-more-with-wallas-class-utilization-report));
no-shows 10–20 % typical ([Zenamu](https://zenamu.com/glossary/no-show-rate/)); 14 days of inactivity as the common
trigger with 30 / 60 / 90 re-engagement ladders ([MyFitHive](https://myfithive.com/blog/view/gym-member-retention-at-risk-members),
[PushPress](https://help.pushpress.com/en/articles/13515587-grow-how-the-at-risk-member-workflow-works),
[FitGrid](https://athletechnews.com/how-fitgrid-helps-gyms-halt-churn-and-benchmark-performance/)); the weekly operator
set ([Rezerv](https://www.rezerv.co/blogs/10-weekly-metrics-every-studio-owner-should-track--rezerv)); 90-day pack
expiry and breakage ([Arketa](https://help.arketa.com/pricing/types/class-package)).

## 3. The streak HoyOS implements ("semanas seguidas cumpliendo tu meta")

The eight rules, exactly as `src/data/analytics.ts` states and `npm run test:analytics` proves:

1. **Weeks run Monday–Sunday in local time** (America/Bogota). Day keys come from local date parts (`dateKey()`),
   never from UTC slicing.
2. **A week is met when visits ≥ the goal.** A visit is a `checked_in` booking counted by the **session's** start
   date. With goal 0 ("sin meta") no streak is computed — state `none`, count 0 — but every week still carries its
   count and the month, history and milestones stay.
3. **The current week is in progress**: it never breaks the run and counts once met. **At risk** = current week not
   met, on Saturday or Sunday (≤ 2 days left), with a run alive.
4. **One rest week per rolling four**: a missed week is forgiven ("saved") when the run is alive, the member attended
   at least once in the four weeks before it and no week was saved in the previous three. A saved week keeps the
   run but does not add to it. `graceAvailable` tells the member whether a rest week is still available in the
   current window (the "Descanso disponible" chip on C-27).
5. **A paused-membership week is skipped**: a `memberships` row with status `paused` whose `paused_until` covers the
   whole week and whose pause began (`updated_at`) before it neither counts nor breaks.
6. **Two missed weeks in a row, or a miss with no rest week left, reset the run.** State `broken` when the break was
   within the last four weeks and the run before it was ≥ 2; `building` when the count is 0 but this week already
   has a visit; `alive` when the count ≥ 1.
7. **`best` is the longest run ever** under the same rules and is kept permanently; a broken run shows "Tu mejor
   racha: N semanas", never a red zero.
8. **Changing the goal never rewrites the past** (D-0015). Each past week is graded against the goal **in force when
   that week closed**: the latest `practice_goals` row (by `starts_on`, then `created_at`; ended rows included) whose
   `starts_on` ≤ that week's Sunday. Weeks before the earliest goal use the earliest goal's target; with no goal rows at
   all every week has target 0. A goal set mid-week governs the week it was set in and every later one, and the weeks
   already lived keep the target they were lived under (`PracticeWeek.target`, shown as "meta {n}" in the C-27 history).
   A past week whose target was 0 ("sin meta") restarts the run quietly, without counting as a break. `target`,
   `hasGoal` and `thisWeek` are the current active goal.

**Goal history (D-0015).** `practice_goals` keeps one **active** row per person; changing the goal ends the old row
(`active = false`) and inserts a new one starting today, so the history survives. `usePracticeStats` passes every row
of the person — active and ended — and `practiceStats()` resolves each week's target with rule 8, so **raising a goal
never rewrites past weeks** and a run met under the old goal stays met. `npm run test:analytics` covers the raise, the
lower, two changes on the same day and clearing the goal; the seed's demo member starts on 1 / week and moves to 2 / week
six weeks ago, so her first week is graded at 1 and the rest at 2.

Two deliberate differences from the research draft (§5 there): the rest week is **one per rolling four weeks**
rather than one per calendar month (no month boundary effects, and "the first miss in any four weeks" is what the
C-27 copy says); and a member-declared "pausa" is **not** built yet — a paused membership is what the code recognises
(§8, question 3).

## 4. The goal picker and the label glossary

**Asked, not inferred.** The first time a member with no goal row opens the home, the practice block asks
"¿Cuántas veces por semana quieres practicar?" inline (GoalPicker: 1 · 2 · 3 · 4+ por semana on the SegmentedControl
track, plus "Sin meta por ahora" as a chip). The picker is one roving tab stop with **manual activation**: arrow keys and
Home / End only move focus, and Enter, Space, a click or a tap saves — once — so browsing the options never writes a goal
row. The option the member's own history suggests is marked **Sugerido** —
the median of the last eight full weeks clamped 1–4, or 2 with less than two weeks of history (`DEFAULT_TARGET`,
the evidence-based habit). The goal is changed any time on C-27 (GoalSection) or through `app.setGoal`. "Sin meta"
hides the ring and the streak; counts, history and milestones stay. Every change writes a `practice_goals` row and a
`goal.set` event; `source` records whether the member picked by hand or accepted the suggestion.

**Bilingual labels** (every number has a name that says what it counts; "racha" never stands alone as a headline):

| es-419 | English | Where |
| --- | --- | --- |
| Tu práctica | Your practice | C-01 block title, C-27 title |
| Clases tomadas este mes | Classes attended this month | C-01, C-22, C-27, M-06 |
| Reservadas próximas / {n} reservadas próximas | Upcoming booked | C-01 hint, C-27 tile |
| Clases restantes en tu plan · Vence {date} | Classes left on your plan · Expires {date} | C-01 |
| Membresía · Ilimitada · Renueva {date} / En pausa · Hasta {date} | Membership · Unlimited · Renews / Paused · Until | C-01 |
| Semanas seguidas / Semanas seguidas cumpliendo tu meta | Weeks in a row / Weeks in a row on your goal | C-01 tile, C-27 card |
| {attended} de {target} esta semana | {attended} of {target} this week | C-01, C-27, M-06 |
| Meta: {target} por semana · Te faltan {n} esta semana · Tu mejor racha: {n} semanas · Empieza una racha esta semana | Goal · to go · best run · start a streak | streak hints |
| Descanso disponible · Semana de descanso usada: {date} | Rest week available · Rest week used | C-27 |
| ¿Cuántas veces por semana quieres practicar? · Sin meta por ahora · Sugerido | How many times a week…? · No goal for now · Suggested | GoalPicker |
| Logros · Próximo · Faltan {n} · ¡Clase número {n}! | Milestones · Next · {n} to go · Class number {n}! | C-27, M-06, toast |
| Minutos de práctica · Reservas sin asistir · Cancelaciones tardías | Minutes practised · Booked, not attended · Late cancellations | C-27 month |
| Lo que más practicas · Últimos 90 días | What you practise most · Last 90 days | C-27 |

Avoided on purpose: "clases" alone, "visitas" (clinical in Colombia), "créditos" unless the plan is literally credit-based.

## 5. Deliberately excluded, and why

- **Mood / intention prompts** — the "¿Cómo quieres sentirte hoy?" question was removed in 0030 / 0034 at the owner's
  request; the goal picker is a tracking question, not a feelings question, and says so in its hint.
- **Leaderboards, rankings, "top X %"** — upward comparison lowers well-being for low-self-control users
  ([Frontiers in Public Health](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2025.1632598/epub));
  Peloton's real-name leaderboard drew a privacy backlash ([The Clip Out](https://theclipout.com/peloton-leaderboard-real-names-are-now-public/)).
  C-27 says "nunca se compara con otras personas"; the M-12 at-risk list is who to call, not a ranking; the
  per-teacher table is staff-only and S-03 shows one teacher against the average.
- **Consistency percentages / scores** — opaque; a member cannot act on "73 %". Weeks met against a goal they chose
  is the same information, legible.
- **A daily streak** — studio attendance is 2–4 events a week, not a daily behaviour; a daily counter punishes rest.
- **Public shout-outs** — milestones are shown to the member and to staff (to congratulate in person), never to other
  members ([Apple Fitness+ shows no names](https://www.nbcboston.com/news/business/money-report/apples-new-peloton-competitor-is-cheaper-and-just-as-good/2256625/?amp=1)).

## 6. Data model — derived from the raw tables, events only record moments (D-0014)

**Principle.** No metric is stored. Streak, month counts, fill, at-risk, milestones are computed from `bookings` ×
`class_sessions` (a visit = `checked_in`, dated by the session), `memberships` (pauses, who is entitled), `credits`
(live balances) and `practice_goals` (the target). The same pure function answers C-01, C-27, C-22, M-06, M-12 and S-03,
so the desk and the member never read different numbers, and a bug fix or a rule change applies to the whole history
at once. `activity_events` is written, never read, by the metrics.

**Two tables** (group *Práctica y analítica* in M-03; 52 → 54 tables):

| `practice_goals` | |
| --- | --- |
| `user_id` | → users |
| `cadence` | `week` — the enum reserves a later `month`; it would extend, never replace |
| `target` | 1–7 classes a week; 0 = no goal, only tracking |
| `source` | `member` picked by hand · `suggested` accepted the app's suggestion |
| `starts_on`, `active`, `note` | one active row per person; a new goal ends the previous one; the note is the member's own words |

| `activity_events` | |
| --- | --- |
| `user_id` | → users, null = studio-level |
| `kind` | `goal.set` · `milestone` · `streak.saved` · `streak.broken` · `first.visit` · `plan.purchased` · `plan.renewed` · `credit.expiring` |
| `occurred_at` | when it happened (may be earlier than `created_at`, when the app noticed) |
| `ref_table`, `ref_id`, `payload` | the row it points at; `{ target, source }` for goal.set, `{ count }` for milestone, `{ week }` for streak.saved |

**Recorded today**: `goal.set` on every goal change (`usePracticeGoal`); `milestone` (once per milestone, dated at the
visit that reached it) and `streak.saved` (once per rest week in the current run), written idempotently by
`useMilestoneRecorder` on C-01. The other kinds are reserved for the plan and credit flows. Append-only: a correction
is a new row. The home shows a one-time "¡Clase número N!" toast when a milestone event is newly recorded (≤ 14 days
old, so an old history is not celebrated on a first visit).

**Supabase later.** The same rules run server-side as SQL views or a nightly / on-check-in materialisation
(`member_week`, `class_stats`, `teacher_week`, `slot_fill`) when the tables grow past what the browser computes
comfortably; `SupabaseProvider` keeps the interface and the pure module keeps the rules, so the materialised view is a
cache of `practiceStats()` / `studioStats()`, never a second definition. `activity_events` gets RLS "customer reads
own rows, staff read all, nobody updates" and can feed WhatsApp automations (M-05) without touching the metrics.

## 7. Thresholds M-12 uses

| Figure | Threshold | Source |
| --- | --- | --- |
| Fill | 70–85 % healthy · > 90 % add a class · < 60 % for 4 weeks review the slot | fitDEGREE, Walla |
| No-shows | > 20 % → "revisar la política" and the tile trends down | SmartHealthClubs, Zenamu |
| At risk | 14 / 30 / 60 / 90 days since the last visit, with a live plan or credits (`AT_RISK_BANDS`) | MyFitHive, PushPress, FitGrid |
| Second visit | > 60 % of first-timers (30–60 days ago) back within 30 days | Mindbody, Gymdesk |
| Visits per active member | ≥ 2 a week | Clubworx, Kaushal & Rhodes 2015 |
| Rating | hidden under 5 reviews in range | research §3 |
| Credits expiring | nudge at 14 and 7 days | Arketa |

## 8. Open questions for the owner (also ROADMAP §E 40–43)

1. **Revenue on the analytics page.** M-12 shows no money because §E 32 (does the Coordinator see the monthly
   revenue KPI?) is still open; M-12 opens for the same roles as M-01. Once Sergio answers, revenue per class hour and
   plan mix can join M-12 or stay in Finance.
2. **One at-risk rule.** The CRM segment rail (M-06) still flags "en riesgo" at **21 days** without a check-in; M-12
   uses the **14 / 30 / 60 / 90** ladder. Unify on the ladder (recommended: 14 days is the industry trigger) or keep
   the CRM's own rule?
3. **A pause the member declares.** Today a week only skips the streak when the *membership* is paused. Should a member
   be able to declare "pausa" (travel, injury) of up to four weeks, in the app, independent of the plan? It would be a
   `practice_pauses` table or a column on `practice_goals`.
4. **Milestones by WhatsApp.** Milestone events exist; should reaching 5 / 25 / 50 classes trigger an automated
   WhatsApp (M-05 template) as well as the in-app toast and the front-desk flag, or stay an in-person congratulation?

---
**Resumen (ES).** La tarjeta vieja mezclaba tres números bajo una etiqueta ("Clases este mes" contaba por fecha de
reserva, la "racha" era una fórmula sin meta). Ahora cada número dice qué cuenta: clases **tomadas** este mes,
reservadas próximas, clases restantes en tu plan; y la racha son **semanas seguidas cumpliendo tu meta** (lunes a
domingo, hora de Bogotá): la persona elige su meta (1 · 2 · 3 · 4+ por semana o sin meta), una semana de descanso por
cada cuatro no rompe la racha, las semanas con la membresía en pausa no suman ni rompen, la mejor racha se conserva y
nunca aparece un cero en rojo. Logros en 1 · 5 · 10 · 25 · 50 · 100 · 250 clases. Todo se deriva de reservas y
sesiones; dos tablas nuevas guardan la meta (`practice_goals`) y los momentos (`activity_events`). El equipo ve lo
mismo que el miembro (M-06), el estudio ve asistencia y retención (M-12, sin ingresos hasta resolver §E 32) y cada
profesor ve sus propios números frente al promedio (S-03), nunca una lista de colegas. Sin preguntas de ánimo, sin
rankings. Preguntas para el owner: ingresos en M-12, unificar la regla de riesgo (21 días vs 14 / 30 / 60 / 90), pausa
declarada por el miembro, felicitar logros por WhatsApp.
