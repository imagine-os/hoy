# 0021 — Conversación CRM y bandeja de mensajes (2026-09-18)

- **Source**: Justin Massion in Slack `#hoy-welness-club`, the content thread (message of 2026-09-18 03:07 UTC), after the 0020 polish pass was pushed
- **Date**: 2026-09-18
- **Requester**: Justin Massion (project lead) via Slack #hoy-welness-club
- **Changelog**: `docs/changelog/0021-crm-conversacion-y-bandeja.md`

## Prompt (verbatim)

> Please make the CRM page for the customers really, really good, in particular:
> • The history of WhatsApp messages to and from the WhatsApp API
> • Any emails that went out to and from email that we integrate later, including newsletters or automated emails or actual communication
> • Notes or any other ways in which our front desk people would be interacting with the customer
> I think those are the main ways, though there might not be any others. How the front desk can send or receive a message. Also the front desk needs a good way from the homepage, or maybe from a notification of some sort from the top bar or whatever, to know who has sent them recent messages, so that they can respond to the messages in the chat with multiple people that they're chatting with through WhatsApp. They also need to be able to, from that module, click into the actual CRM page of that given customer.

## Response

Built as one version, **0.8.0**, with `message_log` as the single record of every conversation and a
front-desk inbox on top of it.

- **One table, one seam.** `message_log` became the unified communications record: `direction`
  (inbound · outbound · internal), `source` (manual · automation · newsletter · system), `subject`, `body`,
  `sent_by`, `read_at` / `read_by`, `external_id` (the provider message id the future webhook fills);
  `channel` gained `note`, `status` gained `received`. Every send and every note goes through
  `src/data/comms.ts` — `useMessaging()` (WhatsApp, email, note, mark read; WhatsApp queues during M-08 quiet
  hours), `useConversations()`, `useUnreadInbound()`, `useAuthorOf()`. The demo db reseeds once
  (`SEED_VERSION = 2`) so an old browser copy never lacks the new columns.
- **M-06 CRM · Conversación** (default tab, then Reservas · Pagos): a WhatsApp-style thread — the member on
  the left, the studio on the right, automations dashed, emails as cards with subject and a Newsletter ·
  Automático · Manual badge, internal notes as yellow cards the member never sees, bookings / payments /
  consents as system lines; filters Todo · WhatsApp · Email · Notas · Sistema; a composer WhatsApp · Email ·
  Nota under the thread (gated by `members.write`); opening the tab marks the member's inbound messages read;
  "Abrir en bandeja" jumps to S-06. Notes moved from `audit_log` rows into the thread.
- **S-06 `/staff/inbox` — Bandeja de mensajes** (new code; desk roles): the conversation list on the left
  (search, Todos · No leídos · WhatsApp · Email, unread first) and the selected thread on the right with the
  person's header (plan, masked phone, WhatsApp verified, **Ver ficha CRM** → M-06), the thread and the same
  composer. The URL is the selection, so the bell, S-01 and M-06 deep-link into it.
- **Knowing who wrote**: the top-bar bell now counts inbound messages nobody on the team has read and opens a
  popover with the five most recent unread conversations (→ their thread) and "Ver bandeja"; S-01 gained a
  "Mensajes sin leer" tile (in N conversations), a "Mensajes recientes" card and the "Abrir bandeja de
  mensajes" quick action.
- **Five components with metas** (D-02): `ChatBubble`, `MessageComposer`, `InboxPopover` (molecules),
  `MessageThread`, `ConversationList` (organisms); `NotificationBell` gained `expanded` / `controls`.
- **Seed**: 57 fixed conversation rows + the 12 automated sends = 69 messages in 17 conversations; six inbound
  messages across five people are unread within the last 48 hours; Juliana (the demo member) has the richest
  thread — WhatsApp both ways, a reminder, a newsletter, a real email exchange, notes.
- **Alternative rejected**: a separate `messages` / `threads` table pair — two sources of truth for the
  timeline and for every existing send site (M-04, M-05, S-04 receipts, the substitution request); extending
  `message_log` keeps `CLAUDE.md`'s "WhatsApp: CRM threads … `message_log`" contract and every log page reads
  the same rows.
- **Simulated vs real**: everything lands in `message_log` in the browser today (delivery is `sent`, or
  `queued` during quiet hours; inbound rows are seed). The WhatsApp Cloud API webhook and the email inbound
  (IMAP / SES) will insert `direction = inbound` rows and update `status` / `external_id` through the same
  table — the pages need no change (manual chapter 26, ROADMAP §F 4–5).
- **Deferred**: a team-only "Equipo" conversation for `user_id`-null rows (the teacher's substitution request
  stays in M-05's log), email sends ignoring quiet hours by design, `TableDef.rls` policies applied server-side.

Docs: changelog `0021`, kanban, ROADMAP §A 0.8.0, `docs/pages/S-06.md` (new), M-06 / S-01 / M-04 / M-05 page
docs, manual chapters 13 / 04 / 24 / 26 (ES + EN), `docs/architecture.md` "Communications seam", full
screenshot pass (98 routes), `docs/flow-map.md` regenerated.
