---
title: Policies in force
role: owner, admin, front desk, finance
part: VI
version: 0.6.0
updated: 2026-09-17
summary: The values that govern today, who changes them, and what happens to existing bookings when they change.
---

# Policies in force

A HOY policy is a number on a screen, not a paragraph in a document. The block below is the truth: if
someone changes it in **M-08a Settings & policies**, this chapter changes with it.

{{policy}}

![Settings and policies](../../screenshots/M-08a/en-1280.jpg "M-08a · /admin/settings")

## 1. What each value controls
| Value | Controls | Shows up in |
|---|---|---|
| Cancellation window | until when the credit comes back in full | C-08b, S-02, `04` |
| Waitlist claim | how long the next person has to take the spot | C-20, `04` |
| Late-arrival grace | until when someone may enter a class that started | S-02, `06` |
| No-show fee | whether a no-show costs money on top of the credit | S-02, `04` |
| Pause days per year | how long a membership may be frozen | C-22, `11` |
| Pauses per year | how many times it may be frozen | C-22, `11` |
| Booking held during payment | how long the spot is held while they pay | C-04 |
| Notice before each charge | how many days before a renewal we warn | M-05, C-22 |
| Lockout attempts and duration | account protection at sign-in | A-02, E-04 |
| Quiet hours | when nothing non-urgent is sent | M-05, `13` |
| IVA and whether it is included | how the total is split on the receipt | S-04, `15` |

## 2. Who approves a change
| Decision | Proposes | Approves | Recorded in |
|---|---|---|---|
| Policy change (cancellation, claim, grace, fee) | Coordination | Owner | M-08a + M-07 |
| Price or plan change | Admin / finance | Owner | the value model + M-07 |
| Turning a feature on or off | Admin | Owner | M-08b + M-07 |
| Tax details and the payout account | Finance | Owner | M-08c + M-07 |
| WhatsApp and email sender | Coordination | Admin | M-08d + M-07 |

Every M-08 save is audited with the actor, the previous value and the time.

## 3. The rule about changes
1. **A policy change does not affect what is already booked.** If someone booked under a 2-hour window,
   that booking runs on 2 hours even if today it is 4.
2. A change that tightens something (less grace, more notice) is announced before it is applied.
3. A change that loosens something can be applied immediately.
4. Front desk does not negotiate a policy at the desk. If a case deserves it, give a courtesy in credit
   and record it (`14`).

## 4. What cannot be switched off
The legal pages (A-06) and the emergency flow have no switch: they always exist, in both languages.

## 5. Decisions still missing
Several of these fields sit at zero or at a provisional value because the studio has not settled them.
The full list lives on **Decisions pending** (K-04) and is fed by the `DECISION NEEDED` blocks
throughout this manual.
