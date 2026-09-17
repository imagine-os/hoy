---
title: Integrations and what is simulated
role: admin, owner, finance
part: VII
version: 0.6.0
updated: 2026-09-17
summary: Which external systems HOY uses, the state of each one, and what can honestly be promised today.
---

# Integrations and what is simulated

This chapter exists so nobody promises something the system does not do yet. The design is in place for
every integration; the vendor is not always connected.

![Integration status](../../screenshots/M-08a/en-1280.jpg "M-08a · /admin/settings")

## 1. State
| Integration | What for | State today | What is missing |
|---|---|---|---|
| Supabase (auth + data) | real sign-in and the database | **simulated**: data lives in the browser and access is a demo picker | credentials, schema migration and RLS rules |
| Wompi payments | payment link, card terminal, saved card | **simulated**: writes real payments and invoices, shows the declined path, but no money moves | merchant credentials, a sandbox and server-side webhooks |
| Wompi payroll | paying teachers | **simulated**: the run computes and stops (`16`) | payout rails and a statement per teacher |
| WhatsApp Business | automations, CRM, OTP | **simulated**: everything lands in the message log | a Meta-approved sender and templates per language |
| Email | receipts, reports, notices | **simulated**: designed and previewed, not sent | a sending provider |
| DIAN invoicing | electronic invoice | **simulated**: the row has the shape, there is no CUFE (`15`) | a technology provider and the legal issuer |
| Maps | the map on contact | **pending** | a provider and the final address |

## 2. What can be said today
1. "I'll send you the payment link" → **yes**, the link exists; the charge does not confirm itself,
   finance reviews it (`14`).
2. "The receipt will reach you on WhatsApp" → **not yet**: it is handed over on screen and in writing.
3. "You'll get the electronic invoice" → **not yet**: say it will arrive once invoicing is switched on.
4. "I'll let you know if a spot opens" → **yes**, but today a person writes it, not an automation.
5. "Your payment method is saved" → the method is stored as a reference; the card number never passes
   through HoyOS.

## 3. The order they get connected in
Supabase first, because everything else needs a genuinely authenticated user: payments, payroll,
WhatsApp and multi-tenant all depend on it. Then Wompi payments, then DIAN and payroll, and WhatsApp in
parallel (its approval takes time, so the application is started early).

## 4. Where they are configured
| Setting | Screen |
|---|---|
| Payout account, NIT, IVA, Wompi environment | M-08c Payments |
| WhatsApp and email sender | M-08d Communications |
| Integration status | M-08a General |
| Turning a flow on or off | M-08b Features |

![Communications: senders](../../screenshots/M-08d/en-1280.jpg "M-08d · /admin/settings/communications")

## 5. What a simulated send records
{{table:message_log}}
