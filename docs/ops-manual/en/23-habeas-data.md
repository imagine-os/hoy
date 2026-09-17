---
title: Personal data and habeas data
role: everyone
part: VI
version: 0.7.0
updated: 2026-09-17
summary: Law 1581 of 2012 in practice: what we ask for, how health data is stored, who may see what, and how a person sees, takes or deletes their data — from the app, from the website and in the admin queue.
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
| Access | we show them what we hold; in the app they can **download their data** (C-26) | same day if in person |
| Correction | corrected in M-06, or they do it in C-19 | immediate |
| Deletion | the person asks by themselves (C-26 or the public page W-09) or front desk opens the case; admin executes it in **M-11** | 15 business days at most |
| Withdraw marketing consent | the person switches the channel off in C-26 / C-24; the team in M-06 | immediate |

**Financial records are kept by legal obligation**: the invoice and the payment history are not deleted;
they stay linked to an anonymous identifier for the period the privacy policy sets (A-06 §6). The profile
and the login account are anonymised. That is what the app tells the person before they confirm, in two
steps, and what we repeat if they ask.

![What the person can correct themselves](../../screenshots/C-19/en-390.jpg "C-19 · /app/profile")

## 4. Deleting an account: the whole flow
Three entrances, one queue, one table (`deletion_requests`). Nobody deletes anything by hand on the
spot: the request is recorded, admin follows it and the technical run happens server-side.

**a) The person, from the app (C-26 Account & data).** Profile → Account & data → *Delete my account*.
Step one: what is kept and what ends, an optional reason and the "I understand" switch. Step two: the
confirmation. A row is created in **requested** state and the person sees it right there; they can cancel
it while it is still requested. The same screen holds their marketing consents, the privacy-policy version
they accepted, the download of their data and the six legal documents.

![Account & data: consents, a copy of the data and delete the account](../../screenshots/C-26/en-390.jpg "C-26 · /app/account")

**b) Anyone, from the website with no sign-in (W-09).** Google Play requires a public URL to request
deletion. The page explains the same, asks for email or WhatsApp (one is enough) and creates the row with
no user attached. It is linked from the site footer and from point 7 of the privacy policy.

![The public deletion page](../../screenshots/W-09/en-1280.jpg "W-09 · /site/delete-account")

**c) Front desk, when asked in person.** Confirm the identity, open the row in M-03 with channel "front
desk" (or ask admin to open it) and note who asked. Do not promise a date: the deadline is the one in the
table above.

**d) Admin, in the queue (M-11 CRM → Deletions).** Each request shows who, channel, reason, age and
status. Admin moves it to **processing**, ticks the seven steps of the anonymisation checklist (profile,
login account, notifications and preferences, messages, auth user, payments and invoices kept anonymous,
confirmation sent) and only then can mark it **done**. **Cancelled** closes it without deleting. Rows are
never deleted: they are the proof the right was honoured, and every move lands in M-07.

![The admin queue with the anonymisation checklist](../../screenshots/M-11/en-1280.jpg "M-11 · /admin/crm/deletions")

{{table:deletion_requests}}

## 5. When someone asks
"What do you do with my data?" — the short, true answer: "We keep your name, your WhatsApp, your email
and an emergency contact so we can look after you. If you told us something about your health, it stays
here as an internal note. You can see, download, correct or delete all of it from the app, under Profile →
Account & data, or ask us and we do it within fifteen business days at most."

"If I delete the account, do my payments disappear?" — "Invoices are kept because the law obliges us, but
without your name: nobody at the studio can link them back to you."

## 6. What is simulated today
1. Consents are genuinely recorded, with the version and the time; so is the deletion request, with its
   trail in M-07.
2. The **execution** of the anonymisation (profile, account, auth user, notifications) is a server-side
   job that will exist with Supabase (`26`). Until then admin performs the steps in M-03 and ticks them in
   M-11; the M-11 checklist is the specification of that job.
3. Real authentication (Supabase) is not connected: today access is a demo picker.
4. The full list of App Store and Google Play requirements, with their status, is
   `docs/app-store-compliance.md` (readable in the app under Documentation).

> DECISION NEEDED: the final data-protection policy text (drafted by counsel) and who is named as the published data controller.
