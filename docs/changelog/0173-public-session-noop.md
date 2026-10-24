version: 0.25.0
date: 2026-10-23
codes: A-02, A-03
prompt: docs/prompts/0173-public-session-noop.md
intent: Preserve a signup draft when a legal popup rewrites an already-public demo session.
decision: Treat validated semantic public-to-public session rewrites as no-ops, regardless of JSON property order. Preserve genuine private-to-public, session-key removal and current-persistence stale-event fences.
rejected: Weakening quota rollback, consent rollover, no-write or pending-context assertions; changing legal content or introducing real authentication.
files: SessionProvider semantic public predicate/guard; normal signup legal-popup regression; documentation.

A normal demo customer signout stores public state in one property order; the legal popup reads and serializes it in another. The previous listener treated that harmless rewrite as logout and cleared the signup draft before the quota-save test could reach its transaction. The repair keeps all fields and reviewed consent through a read-only legal popup while retaining the explicit remote-logout boundary.
