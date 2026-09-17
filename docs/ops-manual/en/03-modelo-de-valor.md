---
title: Value model
role: owner, admin, finance, front desk
part: I
version: 0.6.0
updated: 2026-09-17
summary: The five revenue lines, what each one does for the business, and today's prices read from the system.
---

# Value model

HOY sells five different things and each has a different job in the business. Whoever is at the desk
doesn't need to know the margin, but they do need to know why each family exists — that's how you offer
the right thing without improvising.

> NOTE: no price is written in this manual. Every block below reads from `src/tenant/pricing.ts`, the
> only place in the system where a price exists. Change a price there and it changes here, on the site
> (P-01) and at the desk (S-04) at the same time.

## 1. The discipline
Five revenue lines on a room that does not grow.

{{tenant:capacity}}

That is the whole inventory of the day: 15 mats × 4 classes = 60 spots, and one person may take one
class a day on any plan. The model is not about selling more spots, but about selling the right spot to
the right person — and charging for what doesn't occupy a mat at all (pauses, gifts, space).

## 2. The five lines
| Family | Its job | How we measure it |
|---|---|---|
| Bienvenida | Acquisition: the cheap front door that feeds Membership | % of passes that convert to Membership within 60 days |
| Membresía | Recurring revenue: one access level, monthly or annual | active members and month-to-month retention |
| Pausas | Frequency: 15–30 min micro-sessions, near-zero marginal cost | visits per member per week |
| Regalos | Referral and community: vouchers and member guests | vouchers redeemed and guests who come back |
| Espacio | B2B revenue: studio rental off-peak | hours rented per month |

## 3. Bienvenida — acquisition
The front door. Low price, no commitment, built so the person decides with their body. Nobody lives off
this line: its success is measured in how many of those passes become Membership.

{{pricing:bienvenida}}

At the desk: if someone asks "which one should I take?", the default answer is the Trial Class the
first time and the 3-Class Pack the second. The 10-Class Pack is for someone who already knows they'll
be back but doesn't want a monthly plan yet.

> DECISION NEEDED: 10-Class Pack validity (the brief says 1 month; P-01 Plans & prices says 3 months).

## 4. Membresía — recurring revenue
One access level: there is no "plus plan". It is paid monthly or annually, and the annual is the same
access at the best price per month.

{{pricing:membresia}}

The annual plan works out at about $416,000 per month: that is what you say when someone asks whether
it's worth it. Everything else about membership — pause, charge notice, cancelling without mazes — is
in chapter `11` and in the policies of chapter `21`.

![The plans as the public sees them](../../screenshots/P-01/en-1280.jpg "P-01 · /site/plans")

## 5. Pausas — frequency
Micro-sessions of 15 to 30 minutes: breathwork, meditation, a pause between meetings. They cost us
almost nothing at the margin — no class mat, no full teacher hour — and their job is to make the person
come more often per week, not pay more per visit.

{{pricing:pausas}}

The open rules of this family (whether Unlimited Pauses stacks with Membership, whether a Pause uses up
the one-class-a-day limit) are flagged as a decision in chapter `11`.

## 6. Regalos — referral and community
Our referral channel. A gift voucher brings someone who doesn't know us, carrying the recommendation of
whoever bought it; a Membership guest brings someone who is already accompanied.

{{pricing:regalos}}

A guest is not free for the business: they occupy a mat. That is why how many guests and when is a
policy, not a favour at the desk.

How many guests and whether they occupy a mat is an open decision, flagged in chapter `11`.

## 7. Espacio — B2B revenue
The studio is rented off-peak: workshops, private sessions, photo and video, shoots, pop-ups. These are
"from" prices and they end in a conversation, not a checkout. The operational detail is in chapter `12`.

{{pricing:espacio}}

## 8. All of it together
The full catalogue, exactly as the system reads it:

{{pricing}}

## 9. How to read the month
| Indicator | Where | What to look at |
|---|---|---|
| Revenue this month | M-01 | settled sales, COP, against the same month last year |
| Mix by family | M-09 Finance | how much comes from Membership vs Bienvenida |
| Occupancy | M-01 | attendees over spots offered |
| Bienvenida conversion | M-06 segments | passes that later bought Membership |

{{kpi:occupancy}}
