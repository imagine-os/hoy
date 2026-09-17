---
title: Web and social
role: coordination, owner
part: V
version: 0.6.0
updated: 2026-09-17
summary: What pages the site has, who changes them, how it hands over to the app, and what we post.
---

# Web and social

The site is the first thing anyone knows about HOY. It has one job: making the person understand what
this is and book a trial class.

## 1. The pages of the site
{{routes:public}}

![The home page](../../screenshots/W-01/en-1280.jpg "W-01 · /site")

![About HOY](../../screenshots/W-02/en-1280.jpg "W-02 · /site/about")

![Contact](../../screenshots/W-06/en-1280.jpg "W-06 · /site/contact")

## 2. Who changes what
| Change | Who | Where |
|---|---|---|
| A class or teacher text | Coordination | M-02 (`17`) |
| "About HOY" and philosophy copy | Owner approves, coordination applies | `01` → M-02 |
| Prices | Owner approves | the value model (`03`) |
| The visible schedule | Coordination | M-02 → Schedule (`05`) |
| Contact details, hours, address | Admin | M-08a |
| Section order on the home page | Admin / design | layout editor, `/#/dev/layout/W-01` |

The facts the footer and the contact page read from the system:

{{tenant:contact}}

## 3. From the site to the app
1. Every path on the site ends in booking: "see the schedule" and "see the plans" lead to sign-in with
   the intent kept, so the person doesn't lose the step they were taking.
2. The site never charges: checkout lives in the app (C-04), with IVA computed and the saved payment method.
3. A link shared on social has to land on a real page of the site, not on a screenshot.

## 4. Social
1. One tone, the one in chapter `20`: human, close, direct, present. What you wouldn't say at the door,
   you don't post.
2. No members' faces without written permission, no health data, no names (`23`).
3. Photos come from the approved library (`19`), not from the camera of whoever is on shift.
4. Whatever a post promises — a price, a promotion, a schedule — has to exist in the system before it
   is posted. If it isn't in M-02 or the value model, it isn't announced.
5. A public complaint gets one line in public and is continued in private; the case is summarised in
   M-06 (`13`).

> DECISION NEEDED: who posts on social (role and person), on what calendar, and who approves a post that mentions prices or promotions.

## 5. Legal on the site
Terms and the privacy policy are versioned pages of the site (A-06) and are what the person accepts on
creating an account. See `22`.

![Terms and privacy](../../screenshots/A-06/en-1280.jpg "A-06 · /site/legal/terms")
