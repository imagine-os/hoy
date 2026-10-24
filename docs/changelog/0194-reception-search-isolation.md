version: 0.25.0
date: 2026-10-24
codes: S-02, S-04
prompt: docs/prompts/0194-reception-search-isolation.md
intent: Find roster and walk-in customers reliably through scoped reception search.

# 0194 — Confirmed reception search

Reuse the saved reception-only reader and matcher on the current frontend base. Names match without accents; WhatsApp numbers tolerate punctuation and country-code formatting; emails remain case-insensitive. Every side of the people join is scoped to the current tenant. Missing tenant/role fails closed, stale responses cannot replace current context, and failed reads clear unconfirmed results with bilingual Retry. Search never rewrites customer or historical financial records.

Independent review reproduced an inherited queued subscription callback starting five old-context reads after cleanup. One alive check now prevents work before any loading update or read; regression coverage exercises queued callbacks after missing scope, role change and unmount. Existing attendance, admission, cancellation and receipt commands are preserved. A screenshot-confirmed mobile hint no longer points to a panel “on the right”; both languages use position-independent guidance.

Alternative rejected: rebuilding the existing repair, replacing whole older page files over newer command guards, sharing a global matcher change with unrelated CRM pages, or treating frontend filtering as backend authorization. Scoped fixtures, page contracts and drift tests are updated together. Real authentication, payment, email and server authorization are unchanged.

Files: reception Checkin/Register/search reader/matcher/strings; existing and expanded synthetic search/keyboard regressions; CMS contracts/fixtures/checker/contributor guidance and workflows.
