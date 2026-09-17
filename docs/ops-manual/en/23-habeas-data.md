---
title: Personal data and habeas data
role: everyone
part: VI
version: 0.6.0
updated: 2026-09-17
summary: Law 1581 of 2012 in practice: what we ask for, how health data is stored, who may see what, and how it is deleted.
---

# Personal data and habeas data

Law 1581 of 2012 (Colombia). This is not a chapter for lawyers: it is what every person on the team has
to do, and not do, every day.

## 1. The day-to-day rules
1. At registration (A-03 / S-04) the person accepts the data-processing policy (A-06); it is stored
   with the time, the version and who recorded it (`22`).
2. We only ask for what is needed: name, WhatsApp, email, emergency contact, birthday, consent.
3. **Health data is sensitive**: it is stored as a marker and an internal note; never read aloud, never
   sent over WhatsApp, never discussed between shifts.
4. Every view of a member record is logged in **M-07**; access is auditable.
5. We never share a HoyOS session and never export lists out of the system without the owner's
   authorisation.
6. A photo is personal data: without written permission a face is not published (`19`).

**Steps in HoyOS:** A-06 Legal (current version) · M-06 → consents · M-07 → filter "record read".

![The log of accesses and actions](../../screenshots/M-07/en-1280.jpg "M-07 · /admin/activity")

## 2. Who may see what
The system does not rely on goodwill: every table carries an access contract. Front desk sees the
member timeline but does not edit payments; finance sees payments but not health notes.

{{roles}}

{{table:profiles}}

## 3. The person's rights
| Right | What we do | Deadline |
|---|---|---|
| Access | we show them what we hold | same day if in person |
| Correction | corrected in M-06, or they do it in C-19 | immediate |
| Deletion | front desk opens the case, admin executes it | 15 business days at most |
| Withdraw marketing consent | the channel is switched off in C-24 / M-06 | immediate |

If someone asks to delete their data: front desk opens the case, admin executes it and replies within
15 business days at most. **Financial records are kept by legal obligation** (soft delete): the invoice
is not deleted, the personal data attached to it is anonymised.

![What the person can correct themselves](../../screenshots/C-19/en-390.jpg "C-19 · /app/profile")

## 4. When someone asks
"What do you do with my data?" — the short, true answer: "We keep your name, your WhatsApp, your email
and an emergency contact so we can look after you. If you told us something about your health, it stays
here as an internal note. You can ask us to show you, correct or delete all of it whenever you like."

## 5. What is simulated today
1. Consents are genuinely recorded, with the version and the time.
2. Soft delete exists as a concept in the data model, but executing it is still manual (admin, in M-03).
3. Real authentication (Supabase) is not connected: today access is a demo picker (`26`).

> DECISION NEEDED: the final data-protection policy text (drafted by counsel) and who is named as the published data controller.
