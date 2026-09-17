# 0017 — Especiales: custom payments, manual teacher payouts and room bookings (2026-09-17)

- **Source**: Justin in the Slack thread (direct request), same day as the expenses ledger (0016)
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0017-especiales.md`

## Prompt (verbatim)

> OK, we need a system for custom payments. I'm not sure what we would call it. But assume that things like private events can be booked and priced manually at front desk. And seperate teacher payouts can also be made manually. For instance, when a teacher is purchased alongside the space rental. we can just manually add the payout to their payroll.
>
> This means we also need to be able to schedule/mark the yoga studio or meditation room accordingly on the calendar for items besides just classes.
>
> On the website or wherever appropriate it can say to please contact us direct for private events or special requests. make the wording proper to our copy style fo course.
>
> Essentially this system im discussing will be helpful so that edge cases have a method of being handled manually.

## Response

The system is called **Especiales** (EN "Specials"). One word the desk already uses for "the thing that is not
on the price list", it reads the same in both languages, and it sits next to the `espacio` family whose
"desde" prices already end in a conversation (manual chapter 12). Four pieces, all real rows:

**1 · Two tables.** `special_charges` — a charge whose concept and price were typed by hand (customer or a
plain contact name, optional teacher with a `teacher_payout`, optional `space_booking_id`, the `payment_id`
that carries the money in) — and `space_bookings` — a room taken by something that is not a class
(`private_event` · `rental` · `private_class` · `maintenance` · `blocked`; status `held` → `confirmed` →
`done`, or `cancelled`). `payroll_lines.kind` gains `manual` with a `special_charge_id` source. 42 → 44 tables.

**2 · S-04 sells it.** "Qué compra" gained the family **Espacio · Especiales**: the five "desde" items from
`pricing.ts` (Sesión Privada, Talleres, Foto & Video, Rodajes, Pop-ups) plus a free **Especial · concepto y
precio manual** row. Picking one opens the Especial card — concept (prefilled from the "desde" item), agreed
amount, teacher + payout, room + date/window with the same conflict check S-05 uses, note — and "Quién"
gained **Solo contacto** for a company or a non-member. Completing the sale writes the payment and invoice
(IVA, "Valor pagado" and "Observación" exactly as in 0014), the `special_charges` row and, with a room, the
confirmed `space_bookings` row, each with its audit entry. `?booking=<id>` from S-05 preloads an existing
booking and confirms it on completion.

**3 · The teacher's payout goes to payroll by itself.** `src/data/payrollCalc.ts` gained `manualLinesFor`
and `draftLinesFor` (class lines + manual lines); M-09a's generator, the seed and S-03 all call it, so the
draft of a period contains one `manual` line per Especial with a teacher and a payout, labelled
**"Especial: <concept>"**, and regenerating replaces it instead of adding it twice. M-09b prints it with the
service date, the CSV carries `special_charge_id`, and the teacher's S-03 statement shows the same line.

**4 · S-05 `/staff/rooms` is the room calendar.** Rooms from the `rooms` table as columns (the seed now has
the main room and a small meditation room), hours as rows, classes tinted by movement and space bookings by
kind, a 14-day strip plus any date, a booking form that **refuses an overlapping window** and lists what is
in the way, and confirm / done / cancel actions with a "Cobrar" that hands the booking to S-04. Linked from
S-01 and the staff nav; the teacher's S-03 home lists their own space bookings with the agreed payout.

**Website copy**, in the brand voice (short, warm, no exclamation marks): a note on P-01 Planes ("Lo que no
cabe en un plan"), a card on the Contact page and one line on C-06, all opening WhatsApp from the tenant
contact. **Manual**: chapter 12 §3 (booking in S-05 with the conflict rule) and a new §7 Especiales,
chapter 10 a pointer to the Especial item, chapter 16 the manual payroll lines — ES and EN.

Jas's question for Lore (ROADMAP §E 34, "a group-session product for birthdays or events") is answered
structurally: those are Especiales priced by hand; whether it becomes a standard product is still Lore's call.

Deviation noted: the brief named the two rooms; the real room list is the owner's — the seed adds a demo
"Sala de meditación" and the changelog says so.
