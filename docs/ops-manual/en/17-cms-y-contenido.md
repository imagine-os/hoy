---
title: Content in the CMS
role: coordination, admin
part: V
version: 0.6.0
updated: 2026-09-17
summary: What is edited in M-02, the draft → review → published flow, and the club rules and FAQ.
---

# Content in the CMS

Nothing is written twice. If a customer reads it, it lives in **M-02 Content** and travels from there
to the site, the app and the desk.

![The CMS](../../screenshots/M-02/en-1280.jpg "M-02 · /admin/content")

## 1. What lives in M-02
| Content | Where it shows |
|---|---|
| Class types and descriptions | C-02, C-03, W-03, W-04 |
| Teacher profiles (bio, photo, specialties) | C-18, W-05, S-03 |
| Modalities and movements | W-03, C-02 |
| Rooms and capacity | M-02, S-02 |
| Club rules | C-13 |
| FAQ | C-14 / C-15 |
| "About HOY" copy | W-02 and chapter `01` of this manual |

Prices do **not** live in the CMS: they live in the value model (`03`).

## 2. The flow
1. Every field is ES/EN. **Spanish is required**; English falls back to Spanish when missing.
2. State: draft → review → published. Whatever a teacher submits from S-03 enters review.
3. Coordination approves or returns with a comment **within the week**. An old review queue is
   out-of-date content on the site.
4. Photos are flagged as placeholders until real assets land (`19`).

## 3. Club rules and FAQ
1. The club rules (C-13) are what the person effectively accepts by walking in: punctuality, mats,
   heat, hygiene, cancellation. Changing them changes the experience, so the owner approves them.
2. The FAQ (C-14 / C-15) is written with the question as people actually ask it, not as a lawyer would.
   If front desk answers the same thing three times on WhatsApp, that is a new FAQ entry.

![The club rules](../../screenshots/C-13/en-390.jpg "C-13 · /app/rules")

![The FAQ](../../screenshots/C-14/en-390.jpg "C-14 · /app/faq")

{{table:content_articles}}

{{table:faq_entries}}

## 4. Price changes
Finance proposes them, the owner approves them, and they are applied in the value model
(`src/tenant/pricing.ts`). They never affect active subscriptions. The desk and the site change at the
same moment because they read the same file.

## 5. What is simulated today
1. M-02 edits class types, teachers, modalities and rooms. Articles and the FAQ are edited for now in
   **M-03 Tables** generically: the dedicated editor is missing.
2. There is no media library yet; `photo_url` is a text field (`19`).
3. There is no scheduled publishing: publishing is immediate.
