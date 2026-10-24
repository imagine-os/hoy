version: 0.25.0
date: 2026-10-24
codes: C-37
prompt: docs/prompts/0177-buyer-sent-template.md
intent: Make the conditional buyer notification for a voucher send event reviewable without simulating an actual send.
decision: Show an explicitly unsent template beside the existing ready/used previews for the verified approved buyer only. Explain that confirmed sending is a prerequisite and delivery is not confirmed.
rejected: Treating payment approval as a send event, creating a sent flag/outbox, promising delivery or changing gift commands.
files: Voucher gift page, bilingual strings, C-37 metadata, focused synthetic preview harness/tests and documentation.

BO-06 (Feature Log 75 / source 76) gains bounded notification-content preview coverage. Real notification triggers, sending and delivery remain unimplemented backend dependencies. No whole-row production completion is claimed.
