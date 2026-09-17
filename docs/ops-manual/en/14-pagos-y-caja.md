---
title: Payments and the till
role: finance, front desk, owner
part: IV
version: 0.6.0
updated: 2026-09-17
summary: Payment methods, cash close, daily reconciliation, Wompi, refunds and the monthly reports.
---

# Payments and the till

Money comes in through four routes and goes out through two. This chapter is the whole circuit, from
the desk to the bank.

## 1. The payment methods
| Method | Settles when | Who confirms |
|---|---|---|
| Cash | immediately | front desk, on receipt |
| Card terminal | when the gateway confirms | finance, against the Wompi panel |
| Wompi link | when the gateway confirms | automatic; finance reviews |
| Transfer / Nequi | when finance sees the deposit | finance, in M-06 → Payments |
| Gift voucher | immediately (deducts balance) | the system |

A pending order **is not a sale**. Until it settles it does not count in the month's revenue.

{{table:payments}}

## 2. Cash close (front desk, every day)
1. After the last class, count the cash; compare with today's "Settled cash payment" entries in
   **M-07** filtered by your name.
2. List pending transfers with their proof and send them to finance.
3. Lock the cash in the safe, sign the sheet, switch off equipment and close with the `07` checklist.

**Steps in HoyOS:** M-07 All activity log → filter today + source front desk → Export CSV.

![Today's log, filtered](../../screenshots/M-07/en-1280.jpg "M-07 · /admin/activity")

## 3. Daily reconciliation (finance)
1. Finance receives the closing sheet and the pending transfers from front desk.
2. Cross three sources: counted cash, **M-07** filtered by "Settled cash payment", and the Wompi panel
   for links and the terminal.
3. Confirm transfers with proof in **M-06 → Payments** (the order moves from pending to settled).
4. Difference over $10,000: note on the exported M-07 and tell the owner the same day.

**Steps in HoyOS:** M-07 → date filter + action "payment" → Export CSV. M-06 → member → Payments → confirm.

## 4. Wompi
1. Payouts arrive per the Wompi contract cycle; book them against sales by transaction date, not payout date.
2. Fees and withholdings are recorded as a separate expense.
3. The destination account and the environment (sandbox / production) live in **M-08c Payments**. Keys
   are never stored there: the screen says so.

![The payout account and the Wompi environment](../../screenshots/M-08c/en-1280.jpg "M-08c · /admin/settings/payments")

> DECISION NEEDED: the payout cycle contracted with Wompi and the destination bank account.

## 5. Refunds
| Case | What happens | Approves |
|---|---|---|
| Class cancelled by the studio | Credit returns automatically (E-03) | nobody, it is automatic |
| Duplicate charge or error | Refund to the same method from Wompi; recorded in M-06 Payments | Finance |
| Courtesy after a complaint | Credit, not money | Coordination |
| Annual membership, leaving | Prorate per terms (A-06) | Owner |

Every refund lands in M-07 with the actor and before/after values.

## 6. Dashboard and KPIs
**M-01 Admin dashboard** opens with the KPIs and the occupancy chart. What we look at every week:

| KPI | How to read it | Alert |
|---|---|---|
| Occupancy | attendees / (mats × classes taught) | under 60 % sustained |
| Revenue this month | settled sales, COP | vs the same month last year |
| Active and at-risk members | M-06 segments | "At risk" grows 2 weeks in a row |
| No-show and late cancellation | per class and slot | over 10 % |

{{kpi:occupancy}}

{{kpi:noshow}}

![KPIs and occupancy](../../screenshots/M-01/en-1280.jpg "M-01 · /admin")

The feature switches (M-08b) store every change with the actor, the previous value and the time. Legal
and emergency pages cannot be switched off.

![Feature switches, audited](../../screenshots/M-08b/en-1280.jpg "M-08b · /admin/settings/features")

## 7. Reports
1. Weekly (Monday): occupancy by class and slot, sales by product, no-shows.
2. Monthly (5th): revenue, payroll, reconciled Wompi payouts, the "At risk" segment, membership
   cancellation reasons.

**Steps in HoyOS:** M-01 KPIs → M-07 export CSV → M-06 segments → M-09 Finance.

{{stats}}
