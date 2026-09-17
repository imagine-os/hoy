---
title: Administration and finance
role: owner, admin, finance
version: 0.1
updated: 2026-09-17
---

# Administration and finance

## 1. Dashboard and KPIs
1. **M-01 Admin dashboard** opens with 4 KPIs and the occupancy chart. What we look at every week:

| KPI | How to read it | Alert |
|---|---|---|
| Occupancy | attendees / (15 × classes taught) | < 60 % sustained |
| Revenue this month | settled sales, COP | vs. same month last year |
| Active and at-risk members | M-06 segments | "At risk" grows 2 weeks in a row |
| No-show and late cancellation | per class and time slot | > 10 % |

2. Feature switches (M-01): every change is stored with actor, previous value and time. Legal and emergency pages cannot be switched off.
**Steps in HoyOS:** M-01 → KPI row → Occupancy; M-01 → Features & pages.
[screenshot: M-01 — KPIs and occupancy chart]

## 2. Daily reconciliation
1. Finance receives the closing sheet and pending transfers from front desk.
2. Cross three sources: counted cash, **M-07** filtered by "Settled cash payment", and the Wompi panel for links and terminal.
3. Confirm transfers with proof in **M-06 → Payments** (the order moves from pending to settled).
4. Difference > $10.000: note on the exported M-07 and tell the owner the same day.
**Steps in HoyOS:** M-07 → date filter + action "payment" → Export CSV. M-06 → member → Payments → confirm.

## 3. Wompi
1. Payouts arrive per the Wompi contract cycle; book them against sales by transaction date, not payout date.
2. Fees and withholdings are recorded as a separate expense.
> DECISION NEEDED: payout cycle contracted with Wompi and destination bank account.

## 4. DIAN electronic invoicing
1. **M-08 → Tax & invoicing** must hold NIT, DIAN resolution and range before electronic invoicing can be switched on. Without them the switch stays off.
2. Every receipt (M-04) carries the electronic invoice reference. If a customer wants a company invoice, capture NIT and legal name in M-06 before completing the sale.
3. All money is stored in COP; timestamps in UTC, displayed in Bogotá time.
> DECISION NEEDED: electronic invoicing technology provider and whether IVA (19 %) is included in the published price.

## 5. Teacher payroll
1. Run closes on the 15th each month. Source: attendance closed in S-03 (classes taught, substitutions, adjustments).
2. Export the detail, check against M-02 Schedule, owner approves, pay and confirm in S-03 (the teacher sees it in Payroll history).
> DECISION NEEDED: pay date, per-class rates and contract type.

## 6. Refunds
| Case | What happens | Approves |
|---|---|---|
| Class cancelled by the studio | Credit returns automatically (E-03) | nobody, it is automatic |
| Duplicate charge or error | Refund to the same method from Wompi; record in M-06 Payments | Finance |
| Courtesy after a complaint | Credit, not money | Coordination |
| Annual membership, leaving | Prorate per terms (A-06) | Owner |
Every refund lands in M-07 with actor and before/after values.

## 7. Reports
1. Weekly (Monday): occupancy by class and slot, sales by product, no-shows.
2. Monthly (5th): revenue, payroll, reconciled Wompi payouts, "At risk" segment, membership cancellation reasons.
**Steps in HoyOS:** M-01 KPIs → M-07 export CSV → M-06 segments.
