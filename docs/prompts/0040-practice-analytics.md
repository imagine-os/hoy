# Practice analytics — the streak and "clases este mes" made clear, for members, teachers and the club

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (owner)

## Prompt

For the Classes this month and streak its confusing, on the customer app,   The streak can be cooler, and maybe we figure out smartly or by asking them what their goal is for tracking.   Classes this month is not clear if thats how many they've taken or what.  And somewehre we can store those types of analytics for both admin and customer usefulness.   So maybe do some deeper research into best prcatices for gym/yoga/welnnes analytics specific to on location businesses and what the customers tracks v what the teachers and club tracks.

## Response

Branch `feat/practice-analytics`, version **0.14.0**. Full record in `docs/changelog/0040-practice-analytics.md`; the research and the proposal as a document Justin can read: `docs/reference/analytics.md`; the two engineering decisions: D-0014 and D-0015 in `docs/decisions.md`.

**Research → proposal → build**, in that order:

1. **Research** (Fable 5.1): what on-location yoga / pilates / wellness studios and the fitness apps members already know track for the *member*, the *teacher* and the *club* — Mindbody, Mariana Tek, Glofox, Walla, Peloton, Fitbod, Duolingo's streak repair, the HFA retention benchmarks, the second-visit cliff. Findings and sources in `docs/reference/analytics.md` §2–§3. The short version: count labels must say what they count; a *weekly* goal-based streak with slack beats a daily one; milestones are cheap and effective; comparing members with each other is risky; teachers see their own numbers against the studio average, never a list of colleagues.
2. **Proposal** (Fable 5.1): three number families — the member's practice (private, motivating), the teacher's own numbers, the club's attendance and retention — all *derived* from the raw tables (`bookings` × `class_sessions`, `memberships`, `credits`), plus two small tables: `practice_goals` (the weekly goal the member picks) and `activity_events` (the moments worth remembering: a goal set, a milestone, a rest week that saved the streak). The streak is weekly (Monday–Sunday, America/Bogota), met when visits ≥ the goal, with one rest week per four, paused weeks skipped, the best run kept forever, and never a red zero.
3. **Build** — `src/data/analytics.ts` + `useAnalytics.ts` (Fable 5.1, proven by `npm run test:analytics`); five components (Opus 5.5: `WeekDots`, `StreakBadge`, `GoalPicker`, `Heatmap`, `MilestoneList`, all with metas in D-02); the customer side (Opus 5.5): **C-01** home practice block — "Clases tomadas este mes" + upcoming booked, "Semanas seguidas" as a stamp, the plan balance named by what it is, the week as dots, the goal question asked inline once — and the new **C-27 Tu práctica** (`/app/practice`); the team side (Opus 5.5): **M-12 Analítica de práctica** (`/admin/analytics`: fill, attendance, no-shows, popular slots heatmap, second visit, at-risk ladder 14 / 30 / 60 / 90, by modality and teacher, milestones to congratulate, credits expiring), the read-only **Práctica** tab in **M-06**, and **S-03** "Mis números" for teachers. Four new WebMCP actions (`app.openPractice`, `app.setGoal`, `analytics.setRange`, `analytics.openMember`). Screenshots and the QA matrix are the Sonnet 5.5 pass that follows this entry.

**Deferred or open** (also ROADMAP §E 40–43 and the kanban): revenue on M-12 waits for §E 32; the M-06 21-day risk rule and the 14 / 30 / 60 / 90 ladder are not unified yet; a pause declared by the member (vs inferred from the membership) and milestone congratulations by WhatsApp are proposals for Justin. Applying the *historical* goal per week (so raising a goal never rewrites past weeks — D-0015) is recorded as the rule; at the time of writing `analytics.ts` still applies the active goal to the whole history, see the kanban card.

Page docs: `docs/pages/C-27.md` (new), `docs/pages/M-12.md` (new), `docs/pages/C-01.md`, `docs/pages/C-22.md`, `docs/pages/M-06.md`, `docs/pages/S-03.md`, `docs/pages/M-01.md`. Machine surface: `docs/reference/surfaces.md` (0040 delta).
