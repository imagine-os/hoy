---
title: Invoicing and DIAN
role: finance, admin, owner
part: IV
version: 0.6.0
updated: 2026-09-17
summary: What must exist before electronic invoicing can be switched on, IVA, company invoices and what is still simulated.
---

# Invoicing and DIAN

## 1. Before switching it on
In **M-08c → Tax & invoicing** the NIT, the DIAN resolution and the range must be filled in before
electronic invoicing can be switched on. Without them the switch stays off.

![NIT, resolution and range](../../screenshots/M-08c/en-1280.jpg "M-08c · /admin/settings/payments")

## 2. IVA
The percentage, and whether published prices include it, are M-08 values, and the S-04 rail uses them
to split the total:

{{policy:iva_pct}}

{{policy:prices_include_iva}}

> DECISION NEEDED: the electronic invoicing technology provider, and whether IVA (19 %) is included in the published price.

## 3. Every receipt
1. Every receipt (M-04) carries the electronic invoice reference.
2. If the person wants a company invoice, capture the **NIT and legal name in M-06 before completing
   the sale**. It is not redone afterwards: it is voided and reissued, and that costs time.
3. All money is stored in COP; timestamps in UTC, displayed in the studio's local time.

{{tenant:hours}}

## 4. Invoices for space rentals
A B2B rental almost always needs a company invoice (`12`): the tax details are asked for together with
the quote, not on the day of the event.

## 5. The table
{{table:invoices}}

## 6. What is simulated today
1. The `invoices` rows have the right shape, but **no CUFE is emitted**: the provider and the legal
   issuer are missing.
2. M-09 shows an invoice without a DIAN reference when there isn't one.
3. The email receipt is designed and previewed in M-04, but sending has no provider yet (`26`).

![Invoices and payouts in finance](../../screenshots/M-09/en-1280.jpg "M-09 · /admin/finance")
