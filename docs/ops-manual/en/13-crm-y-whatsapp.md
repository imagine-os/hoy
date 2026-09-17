---
title: CRM, WhatsApp and email
role: front desk, coordination
part: III
version: 0.6.0
updated: 2026-09-17
summary: The member 360, the channel rules, the automated templates and how a message is written by hand.
---

# CRM, WhatsApp and email

WhatsApp is the main channel. Everything the studio sends, automated or by hand, lands on the member
timeline in **M-06 CRM**.

![The member 360: timeline, payments, notes and consents](../../screenshots/M-06/en-1280.jpg "M-06 · /admin/crm")

## 1. The member 360
1. **M-06** is the file: header with contact and emergency contact, a timeline of bookings and
   messages, payments, notes and consents.
2. Notes are internal and written professionally: the owner can read them, an auditor can read them,
   and if the person asks, so can they.
3. Segments: "Active", "At risk", "New". The "At risk" segment is reviewed on Wednesdays (`05`).
4. Front desk sees the timeline but does not edit payments; finance sees payments but not health notes (`24`).

## 2. Channel rules
| Rule | Detail |
|---|---|
| One number | The studio's WhatsApp Business; never from personal phones |
| Opt-in | Only opt-in numbers receive automations (captured in A-03 or S-04) |
| Opt-out | "Stop" or "no more messages" is honoured immediately and permanently; recorded in M-06 |
| Quiet hours | Nothing non-urgent is sent; automations queue until morning |
| Exceptions | Class cancelled by the studio and a released waitlist spot always go out |
| Response | During desk hours, under 15 min; outside hours, first thing in the morning |
| Email | Confirmations, receipts with the DIAN reference, cancellations; a backup to WhatsApp, not a replacement |

The quiet hours in force:

{{policy:quiet_hours}}

> DECISION NEEDED: official WhatsApp service hours and the legal opt-in wording.

## 3. Automated templates (M-05 / M-04)
| Template | Trigger | Timing |
|---|---|---|
| Booking confirmed | booking created | immediate |
| Class reminder | T−2 h | respects quiet hours |
| Class cancelled | studio cancellation | immediate, always |
| Waitlist released | spot released | immediate, always; the claim window to take it |
| Receipt / invoice | payment settled | immediate |
| Membership expiring / charge notice | per the M-08 charge notice | 8:00 AM |
| Ask for feedback | class attended | same day |
| Happy birthday | date | 8:00 AM |
| Guest invitation | member invites | immediate |
| Payment failed | gateway decline | immediate |

Each template needs Meta approval per language; its status shows in M-05.

**Steps in HoyOS:** M-05 → automation → preview → Meta status → delivery log. M-04 → template → Send a test.

![Trigger, template, delay and Meta status](../../screenshots/M-05/en-1280.jpg "M-05 · /admin/whatsapp")

![The transactional emails, in ES and EN](../../screenshots/M-04/en-1280.jpg "M-04 · /admin/emails")

## 4. Manual messages (front desk)
1. Structure: name + fact on the first line; the action on the second; at most one 🌿.
2. Examples:
   - "Hola, <name>. The 7:00 is full; I've put you on the waitlist and I'll tell you if a spot opens 🌿"
   - "Hola, <name>. We got your transfer, your 3-Class Pack is active. See you soon."
   - "Hola, <name>. Your membership renews on <date>. If you want to pause it, tell me and we'll do it."
3. Never send photos of payment proofs, health data or another person's information (`23`).
4. Every relevant conversation is summarised as a note in M-06.

## 5. Tone
1. Human, close, direct, present. The yes-and-no table is in `20`. Always informal.
2. Complaints get what we can do first; the rule is explained afterwards, without blame.

## 6. What the member controls
The member decides what reaches them and through which channel, in **C-24 Notifications** and **C-19
Profile**. If someone turned a channel off, you don't work around it by writing on another.

![The member's notification preferences](../../screenshots/C-24/en-390.jpg "C-24 · /app/notifications")

{{table:notification_prefs}}
