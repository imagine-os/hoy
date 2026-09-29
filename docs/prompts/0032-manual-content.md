# Operations manual content — plain language, per-role reading, editable rules

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (owner)

## Prompt

I gave you 2 files with updated knowledge for you  on how to write and content. We need to reshape and modify the Operations Manual Product for Hoy.  Focus on doing it in the hoys own repo hub , hopefully the others are in sync to that? The operations manual is too techinical right now. Also, identify things like policies that are ready for the business owner or operations manager to edit. Because this is a tool that they will still need to adjust and adapt. Also, the Screenshots may be out of date.  Later we can add some images or even video that is more simple on guidance. Also, consider the idea that this is almost like an LMS for staff, so depending on the staff member, they will see their own filtered veresion of the operations manual. Considering we've updatated the website. and the app. and knowledge.  the decisions pending may already have answers. Note we dont yet have a role for marketing dept admin or specialist so thats something new. Can put a coming soon item for marketing kit in the hub,   The operations manual can identify what applies to them also.  Same with Developer as a role, Consider the editing experience for the operations manual should be awesome for whoever is editing manually or by prompting. These 3 documents should be available in the hub and embeded in the operations manual in the right place. Keep in mind, the syncing between the 3 different versions of the hub is not too important. Its nice to have but not necessary right now. It's the Hoy repo/hub that matters most

## Response

This prompt was split in two parallel passes. **0031** (the product pass: roles, the LMS reading, the editing
experience, the directives, the source-document embeds, the hub's marketing-kit card) is recorded in its own prompt
file. **0032** — this file — is the content pass. Version **__VERSION__**. Full record in
`docs/changelog/0032-manual-content.md`.

1. **All 28 chapters rewritten, ES first, then EN (56 files).** Plain language for a staff member on day one: "tú",
   short sentences, one idea per paragraph, every procedure numbered and in the order what to do → what to say → what
   to check, with a "Qué decir" line where the desk or a teacher speaks. Screen codes, routes and table names left
   the prose: each section ends in at most one `> EN HOYOS:` / `> IN HOYOS:` box. Every live block and every figure
   kept (the A-05 figure retired with the screen in 0.12.0; chapter 01 carries the C-01 figure instead). Chapters 25
   and 26 stay more technical and open with "Para qué te sirve esto".
2. **The style guide**, `docs/ops-manual/STYLE.md`, so manual and prompted edits keep the register.
3. **The 0031 directives** written into every chapter: `{{audience}}` (00 §5) and `{{audience:<chapter>}}` under
   every H1 lead; 32 `{{editable:owner|coordinator}}` sections (greeting, opening, lost and found, guests, rental
   terms, social calendar, club rules, training checklists, voice-and-tone examples, cleaning and equipment
   routines…); 18 `{{studio:<key>}}` rule cards (13 keys appended to `src/data/seed/studioPolicies.ts`);
   `{{for:<roles>}}` passages; `{{source:…}}` embeds in 01, 03, 18, 19, 20; `{{training:<role>}}` for eight roles in 09.
4. **Reconciled with the three documents and the product.** Six revenue lines (Experiencias Corporativas "en
   camino": sesión para equipos, programa recurrente, taller a medida — a `corporativo` family in `pricing.ts` with
   no prices); 16 mats everywhere; public class names = the five disciplines, movements internal; Pausas Ilimitadas
   stacks; the guest is included; the brand manual's manifesto, purpose, mission, four keywords and five traits (20)
   and its logo, palette and typography rules (19); chapter 01 diffed against the website copy (Medellín, the full
   closing paragraph). Marketing and developer appear as roles in 00, 09 and 24.
5. **Decisions.** Closed 2 (10-class validity; public naming), narrowed 6 (address, Pausas daily limit, guest count
   and mat, IVA de-duplicated to chapter 10, social publishing, wordmark approver), added 3 (the trial class price,
   the corporate line's scope and prices, "intención del día" still in the privacy text). ROADMAP §E updated with the
   source document and date on every closed item.
