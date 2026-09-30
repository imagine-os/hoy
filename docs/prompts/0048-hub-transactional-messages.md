# Hub card: Transactional messages

Source: Slack thread (#hoy) · 2026-09-30 · requester Justin Massion (owner)

## Prompt

Lets add an item in the hub to get straight to the Transactional Messages, this is where people edit the email reports and transational emails and automated whatsapp automated messages.

## Response

Shipped as **v0.21.1** on branch `feat/hub-transactional-messages` (from `main` at v0.21.0).

- **One new card in the team band of the hub (HUB-01, `/#/`)**, right after CRM: **Mensajes transaccionales / Transactional messages**.
  Its button enters as Valentina (coordinator — the role whose job is "the schedule, the teachers and communications")
  and opens **M-04** (`/admin/emails`): the automatic emails — receipt, welcome, class reminder, waitlist offer, sign-in
  code — with versions, the ES / EN switch and a test send. A second link beside the button, **WhatsApp →**, enters as the same demo user and opens `/admin/whatsapp`: the WhatsApp templates and automations with their
  triggers, delays and quiet hours.
- **Card copy.** "Los correos y WhatsApp que el estudio envía solo: se editan y se prueban aquí." / "The emails and WhatsApp
  messages the studio sends on its own: edit and test them here." Kept to two lines so the card lines up with CRM and Admin.
- **Look.** Mail icon, and the inbox card's hue family (no new token), so the two messaging cards read as a pair. The team
  band now holds eight cards: 3 + 3 + 2 at 1280, 2 × 4 from 768, one column on a phone.
- **Hub map.** `public/hub-map.json` gains the `messages` experience (16 experiences); M-04 and M-05 moved from the `admin`
  experience's "Contenido" group into it, as its own group "Mensajes / Messages". Hosts that draw the hoy hub (aluzina,
  between-gigs) pick the card up on their next fetch.
- **Machine surface.** `hub.enterAs` accepts `surface: messages` (in `actions.json` and `docs/reference/surfaces.md`).

Not there yet: "email reports" as their own templates. Today M-04 holds the five transactional emails; there are no
report emails (daily / weekly summaries for the owner) in the product yet. The card says what exists; the report
emails are a follow-up on the kanban.

Changelog: `docs/changelog/0048-hub-transactional-messages.md`.

Model routing: Opus 5.5 (build), Fable 5.1 (direction).
