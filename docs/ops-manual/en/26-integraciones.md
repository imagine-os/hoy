---
title: Integrations and what is simulated
role: admin, owner, finance
part: VII
version: 0.7.0
updated: 2026-09-17
summary: Which external systems HOY uses, the state of each one, what the owner can already fill in on M-10, and what the dev finishes.
---

# Integrations and what is simulated

This chapter exists so nobody promises something the system does not do yet. The design is in place for
every integration; the vendor is not always connected. Since version 0.7.0 all of that lives on one screen:
**M-10 · Integrations** (`/admin/integrations`).

![Integrations: one card per system](../../screenshots/M-10/en-1280.jpg "M-10 · /admin/integrations")

## 1. How to read M-10
Every external system is **one card** with five parts:

1. **What it does and what is simulated today** — the sentence the desk can say without lying.
2. **The fields that are not secret**, ready to fill before the dev arrives: Wompi's merchant id and public
   key, WhatsApp's sender number and template namespace, the email provider and domain, the DIAN technology
   provider and legal issuer, the map link, the Supabase project URL.
3. **A status** that a person moves, not the system: **simulated** (the seam exists, nothing is called)
   → **configured** (the ids are in, the dev has not wired it) → **connected** (live).
4. **The checklist of what the dev must finish**, in order, and **the secrets that exist** — named, never
   typed: Wompi's private key, Meta's token, the email API key and Supabase's service role live in server
   environment variables. The table has no column for them on purpose.
5. **Notes** for the dev (which account already exists, who holds access) and a link to this chapter.

Every save lands in the activity log (`integration.update`, M-07) with before and after.

## 2. State
| Integration | What for | State today | What is missing |
|---|---|---|---|
| Supabase (auth + data) | real sign-in and the database | **simulated**: data lives in the browser and access is a demo picker | create the project, apply `supabase/schema.sql` and the RLS rules, `SupabaseProvider` |
| Wompi payments | payment link, card terminal, saved card | **simulated**: writes real payments and invoices, shows the declined path, but no money moves | merchant credentials, a sandbox and server-side webhooks |
| Wompi payroll | paying teachers | **simulated**: the run computes, is approved and marked paid; the dispersion resolves with a fake reference (`16`) | dispersion credentials and the confirming webhook |
| WhatsApp Business | automations, CRM, OTP | **simulated**: everything lands in the message log | a Meta-approved sender and templates per language — **approval has a lead time: apply before Supabase is done** |
| Email | receipts, reports, notices | **simulated**: designed and previewed, not sent | a sending provider and a verified domain |
| DIAN invoicing | electronic invoice | **simulated**: the row has the shape, there is no CUFE (`15`) | a technology provider and the legal issuer |
| Maps | the map on contact | **to be chosen**: the provider is a setting in M-08f, the coordinates in M-08a | the decision (key-less OSM or Google) |

{{table:integrations}}

## 3. What can be said today
1. "I'll send you the payment link" → **yes**, the link exists; the charge does not confirm itself,
   finance reviews it (`14`).
2. "The receipt will reach you on WhatsApp" → **not yet**: it is handed over on screen and in writing.
3. "You'll get the electronic invoice" → **not yet**: say it will arrive once invoicing is switched on.
4. "I'll let you know if a spot opens" → **yes**, but today a person writes it, not an automation.
5. "Your payment method is saved" → the method is stored as a reference; the card number never passes
   through HoyOS.

The rule: if the M-10 card says **simulated**, the sentence is said in the future tense.

## 4. The order they get connected in
Supabase first, because everything else needs a genuinely authenticated user: payments, payroll,
WhatsApp and multi-tenant all depend on it. Then Wompi payments, then DIAN and payroll, and WhatsApp in
parallel (its approval takes time, so the Meta application is started early). Email and maps once a
provider is picked. M-10 repeats this order at the foot of the page.

## 5. Where the things that can already be filled in live
| Setting | Screen |
|---|---|
| Public ids, status and notes of each integration | **M-10 Integrations** |
| Address, city, WhatsApp, email, Instagram, map coordinates and the "details confirmed" switch | M-08a General (`01`) |
| Payout account, NIT, IVA included or not, DIAN resolution, Wompi environment, **payroll cadence and rate card** | M-08c Payments (`16`) |
| WhatsApp and email sender, quiet hours | M-08d Communications |
| Map provider, public class naming, Respiración as its own class, published legal versions | M-08f Content (`02`, `22`) |
| Turning a flow on or off | M-08b Features |

![Settings · General: contact with its pending state](../../screenshots/M-08a/en-1280.jpg "M-08a · /admin/settings")

![Settings · Payments: cadence and rate card](../../screenshots/M-08c/en-1280.jpg "M-08c · /admin/settings/payments")

## 6. What a simulated send records
{{table:message_log}}
