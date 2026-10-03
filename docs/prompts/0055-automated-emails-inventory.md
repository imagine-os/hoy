# Automated emails: the website, customer app and teacher app inventories

Source: Claude Code session · 2026-10-03 · requester Justin (owner) · attachments: `WEBSITE_hoy_automated_emails.pdf`,
`CUSTOMER_APP_hoy_automated_emails.pdf`, `TEACHER_APP_hoy_automated_emails.pdf` (Lore, 2026-10-02)

## Prompt

heres instructions for needing to add the following transactional emails and automated type eamils and stuff to hoy. Please tell me if anything important was missed. go ahead and update the hoy system where the emails are

## Response

Shipped as **v0.23.0**. M-04 (`/#/admin/emails`) now holds every email in the three inventories: **72 templates**
in ES and EN, each with its trigger, deep link, recipient and priority.

- **One catalog.** `src/data/emailCatalog.ts` lists the 72 emails: 38 to customers (the website and the app share one
  account, so their lists are merged), 33 to teachers and 1 to the team (the substitute request to coordination).
  Each entry records when it sends, its priority (before launch 34 · first 60 days 23 · later 15), what the
  inventory said (sending, designed, WhatsApp only, missing), whether a screen already promises it, and the
  inventory rows it answers.
- **Data.** `email_templates` gains `audience` and `priority` (schema.ts, schema.sql, data-model.md). The seed writes
  every catalog entry as a draft; only the receipt is on, matching "only the payment receipt is sending today".
- **M-04.** Tabs by recipient (Clientes · Profesores · Equipo), a priority filter with counts, and the list grouped
  by priority. Each email shows "Se envía cuando…", its priority, "Prometido en pantalla", "Marketing: requiere
  permiso", "Email o WhatsApp por decidir" (teachers), and the inventory state with its rows. The editor sets the
  recipient and the priority. Teacher previews read as the teacher (Andrés), team previews as the coordinator.
- **What was missed.** See `docs/reference/automated-emails.md`: four open decisions (membership vs package,
  teacher channel, the coordinator contact, late cancellation), the missing team emails (leads, payroll flags,
  profile reviews, deletion requests, reports), eight customer and three teacher emails no list names, and the
  rules for the whole set (marketing consent and unsubscribe, no health data in email, the DIAN invoice attachment,
  trigger emission, SPF / DKIM / DMARC).

Changelog: `docs/changelog/0055-automated-emails-inventory.md`.
