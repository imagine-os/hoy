# 0020 — Polish and code-quality pass (2026-09-17)

- **Source**: Justin in the Slack content thread (direct request), after 0018 / 0019 were pushed
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0020-polish-pass.md`

## Prompt (verbatim)

> ok, in that case, please go through and make sure everything is polished and cleanly coded and stuff

## Response

Three read-only audits ran first — code quality (dead code, duplicated helpers, hardcoded strings, raw
tokens, bundle), docs and links, and a visual / UX pass over every route in ES / EN × 390 / 1280 with a
Playwright walk through each role's primary navigation — and their fix plans were applied as one version,
**0.7.1**, with no new feature.

- **Bundle**: route-level code splitting (every module's pages behind `src/app/lazyPage.ts`; the docs
  markdown indexed at build time and fetched per body). Main chunk 2 549 kB → 796 kB.
- **Correctness**: the UTC date-key bug (`toISOString().slice(0, 10)` names tomorrow after 19:00 in Bogotá)
  fixed at the source with `dateKey()` / `fromDateKey()`, proven by `npm run test:dates`.
- **Clean code**: 13 unused exports, 3 barrels, 40 unused string keys and 7 stray `eslint-disable`
  comments removed; one COP formatter, one IVA split, one `waLink`, one `MS` constant; `tsconfig` gained
  `noImplicitReturns` + `noImplicitOverride`; every shared component reads its strings through `useT()`;
  raw CSS values became D-01 tokens; tenant facts moved into `src/tenant/`.
- **What Justin sees**: `$` in both languages so the finance tiles fit, eyebrow contrast ≥ 4.5:1, statuses,
  products, feature switches and activity titles in the page language, one active sidebar item, card
  headers that wrap, the "today's classes are done" states, links hidden from roles that cannot follow
  them, the browser tab named after the page, and screenshots that show the member's experience with
  real ids instead of not-found states.
- **Docs**: the flow map is generated (`npm run flow-map`), the two missing prompt files exist, every count
  in `ROADMAP.md` and the READMEs was re-measured; follow-ups are ROADMAP §F 25–35.

Details, numbers and the alternatives rejected: `docs/changelog/0020-polish-pass.md`.
