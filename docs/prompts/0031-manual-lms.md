# The operations manual as a staff LMS — per-role lens, training sign-off, editing beside the markdown, source documents

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (owner) · three PDFs attached

## Prompt

I gave you 2 files with updated knowledge for you  on how to write and content. We need to reshape and modify the Operations Manual Product for Hoy.  Focus on doing it in the hoys own repo hub , hopefully the others are in sync to that? The operations manual is too techinical right now. Also, identify things like policies that are ready for the business owner or operations manager to edit. Because this is a tool that they will still need to adjust and adapt. Also, the Screenshots may be out of date.  Later we can add some images or even video that is more simple on guidance. Also, consider the idea that this is almost like an LMS for staff, so depending on the staff member, they will see their own filtered veresion of the operations manual. Considering we've updatated the website. and the app. and knowledge.  the decisions pending may already have answers. Note we dont yet have a role for marketing dept admin or specialist so thats something new. Can put a coming soon item for marketing kit in the hub,   The operations manual can identify what applies to them also.  Same with Developer as a role, Consider the editing experience for the operations manual should be awesome for whoever is editing manually or by prompting. These 3 documents should be available in the hub and embeded in the operations manual in the right place. Keep in mind, the syncing between the 3 different versions of the hub is not too important. Its nice to have but not necessary right now. It's the Hoy repo/hub that matters most

Attachments: `HOY_Modelo_de_Valor_sin_precios.pdf` (8 pages), `HOY-Contenido-Completo-Sobre-Nosotros-Filosofia-Clases.pdf` (5 pages), `Manual.pdf` (brand manual, 12 pages).

## Response

The work was split: this entry (0031) is the **product** — how the manual is read, filtered, trained on and edited;
**0032** (parallel) rewrites the chapters in plainer language with the new source material and answers the decisions
the website, app and documents already settle. Branch `feat/manual-lms`, version **0.13.0**. Full record in
`docs/changelog/0031-manual-lms.md`.

1. **Two new roles.** `marketing` (Marketing · Camila Herrera, home `/admin/content`: content and comms write, CRM
   read) and `developer` (Desarrollo · Julián Mesa, home `/dev`: dev tools, docs, specs, read-only tables, dev mode —
   no settings or finance). Roles, permissions, demo users, `user_roles`, route guards, the hub role switcher and the
   hub map all know them.
2. **Hub.** A **"Kit de marketing — próximamente"** card (not wired: Placeholder button, `comingSoon` in the hub map)
   and a **"Documentos fuente"** card (K-05).
3. **Per-role manual (LMS).** "Ver el manual como…" (your role by default, `?as=<role>`); "Tu manual" with the required
   and recommended chapters in order, a progress ring, the start-here path and training progress; everything else
   dimmed but open; "Marcar como leído" on every chapter; an "Equipo" view for coordination and the owner.
4. **Training as a live sign-off.** `{{training:<role>}}` turns chapter 09's Día 1 / Semana 1 / Mes 1 into checkboxes
   per person, with "Firmar etapa" by the trainer.
5. **Editing that the owner can use.** Sections marked `{{editable:owner}}` / `{{editable:coordinator}}` are tagged
   "Ajustable por…" and edit in place with a live preview; the edit is stored beside the markdown with history,
   "Ver original" and "Restaurar original". Text policies are `{{studio:<key>}}` values edited inline; M-08 numbers
   link to Settings. Every chapter has "Pedir un cambio"; K-04 is now "Decisiones y solicitudes". Prompt-based editing
   works through the actions registry (`manual.suggestEdit`, `manual.listRequests`, `manual.answerRequest`…) — the
   visible "Reescribir con IA" button is a Placeholder.
6. **The three documents** are served from `public/source/`, listed on **K-05** `/#/docs/source` with an inline viewer,
   and embeddable in a chapter with `{{source:<id>}}`.
7. **Screenshots that may be stale** now say so: every manual figure shows its capture date and "puede estar
   desactualizada" when the page changed after it.
8. **Plainer rendering hooks** for the rewrite: `> EN HOYOS:` screen boxes and `{{for:…}}` role-scoped passages.

## Prompt (follow-up, same thread)

Justin (Slack #hoy, 2026-09-29 12:29 local):

add  really clear icons to the operations manual navigation and dashboard .

## Response (follow-up)

One icon per part (I–VII) and per chapter, as data in `src/modules/ops-manual/chapterIcons.ts` (keyed by chapter
number, so the rewritten chapters need no front-matter change), drawn through the `Icon` atom (lucide since 0030; eight
glyphs the set lacked were added: `book-a`, `siren`, `mic`, `database`, `key-round`, `layout-template`,
`graduation-cap`, `files`). They appear in the sidebar (part eyebrows and every chapter row), the chapter cards, the
start-here paths, the "Tu manual" dashboard tiles (progress, required, recommended, training, decisions, requests,
sources), the chapter heads, prev/next, and on K-04 and K-05. The mobile chapter `<select>` keeps the number as its
prefix (an `<option>` cannot draw an icon). Icons never replace labels.
