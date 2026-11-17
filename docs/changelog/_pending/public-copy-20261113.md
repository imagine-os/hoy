# Public website copy clarity · 2026-11-13

Intent: fix obvious public-site presentation issues without altering any content Jas entered through admin Content.

Decision: replace the hardcoded universal mat count in the public schedule heading/legend with per-session availability wording; clarify that empty-date visitors can navigate calendar dates; align the hardcoded private-class rationale with the existing WhatsApp quote handoff. Spanish and English are both updated.

Rejected: changing room/session capacity, inventing prices, restoring historical prices, editing Sara's duplicated biography or Jennifer's missing portrait. Those values/content require an approved source or Jas's confirmation. No provider writes, seeds, CMS overrides, customer records or backend changes.

Files: website strings and SchedulePage, tenant pricing rationale, regression script. Version: pending, based on 1.2.0.

Checks: node scripts/test-public-schedule-copy.mjs passes. Typecheck and production build pass (existing large-chunk advisory only). Independent lane review passed. Empty-date guidance is in day/compact views, not a new next-week shortcut. Integrated two-round review and deployment remain pending.
