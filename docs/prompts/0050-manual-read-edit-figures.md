# Manual: mark unread, admin edits in place, phone figures at phone width

Source: Slack thread (#hoy) · 2026-09-30 · Justin Massion

## Prompt

need mark unread in roles in operations manual. maybe it should be top and bottom for marking something as read? or ?

Also where does the request a chagne go for user manual? Can a super admin edit right on the page itself without submitting a change request?

The mobile images are to big, on the page

_(Screen: K-03 Manual de operaciones, `/#/manual/:chapter`. The chapter head had a one-way "Marcar como leído" that became a
green "Leído" badge with no way back; the body ended in "Pedir un cambio"; only sections marked `{{editable:…}}` had an
Editar button, so an admin could not fix any other paragraph in place; phone captures rendered at the full column width.)_

## Brief (decided before the build)

1. **Read state toggle, top and bottom.** Unread → primary "Marcar como leído"; read → "Leído el {date}" with a check and an
   outline "Marcar como no leído". `useMarkUnread()` removes the person's `manual_progress` rows for the chapter; audit
   `manual.unread`; action `manual.markUnread` (docs.read). The toggle stays in the chapter head and also sits in a new
   `ChapterFoot` at the end of every chapter body, before the request box: "¿Terminaste este capítulo?", the toggle and
   "Siguiente: {next chapter}" (next in the reader's role list). Team roles only. The cover ("Lo que te toca leer") must
   reflect unread at once.
2. **Admin / super admin edit any section in place.** `canEditSection(role, section)`: admin and super_admin every `##`
   section; coordinator only `{{editable:coordinator}}`; others none. `canEditLevel` stays for policies. Unmarked sections
   show Editar to admins with the quieter of "no tag" / "Solo admin". Override mechanics unchanged. `manual.editSection`
   drops the "not marked editable" error for admin / super_admin only. The level hint explains the three tiers; the chapter
   badge reads "{n} secciones editables por ti" for the person who can edit. `manual.suggestEdit` and the request flow
   unchanged.
3. **Phone figures at phone width.** A `-390` capture (or a portrait image once loaded) renders at `max-width: 22.5rem`,
   centred, caption below, hairline border and `--r-lg`; two consecutive phone figures pair side by side from 768 px
   (`FigurePair`, `--grid-gap`), stacked below. Desktop captures keep the column. Tokens only.
4. Library (ChapterFoot, FigurePair, the toggle's states), K-03 spec, page doc, surfaces, kanban, README, STYLE.md;
   screenshots K-03 ES / EN × 390 / 1280; a before / after strip.

## Response

Shipped as **v0.21.3** on branch `fix/manual-read-edit-figures` (numbered 0050).

- **Mark unread, top and foot.** The chapter head and a new foot card at the end of every chapter (team roles) carry the
  same `ReadToggle`: unread shows the primary "Marcar como leído"; read shows "✓ Leído el 30 sept" and an outline
  "Marcar como no leído" (both 44 px, one height); a chapter read in an older version shows "Hay una versión nueva" with
  both buttons. Unmarking deletes the person's read rows for that chapter (`manual.unread` in the audit log), so the
  cover's ring, the "Obligatorio / Recomendado" lists, the sidebar ✓ and the Equipo view drop it immediately (checked:
  front desk 4 → 3 of 17 required). The foot also links "Siguiente →" to the next chapter in the reader's list (the lens
  role, else the signed-in role). New action `manual.markUnread` (60 actions).
- **Where a change request goes.** "Pedir un cambio" writes a `manual_requests` row; coordination and admins answer it in
  **K-04 Decisiones y solicitudes** (`/#/manual/decisions`), and the requester sees the answer under the chapter's box.
  The box now says so with a "Ver todas las solicitudes (K-04) →" link for leads.
- **A super admin edits right on the page.** Yes, now for any section: admin and super admin see **Editar** on every `##`
  section, marked or not, and save in place (history, "Ver original", "Restaurar original" as before) — no request
  needed; the request box tells admins that. Coordination keeps only the sections marked for it; everyone else requests or
  suggests. Unmarked sections carry no tag (the quieter option); the chapter badge reads "10 secciones editables por ti".
- **Phone images.** The cause was a bug: phone captures were meant to be narrow, but the test looked for `-390.jpg` at the
  end of the URL and Vite's build renames files to `es-390-<hash>.jpg`, so on the live site every phone capture rendered
  at desktop width. Now the manual passes the device from the markdown path, the file-name test accepts the hash, and a
  portrait image is treated as a phone once it loads. Phone captures are 360 px wide, centred, in a hairline `--r-lg`
  frame; two in a row (chapters 10, 17, 19, 20) sit side by side from 768 px.
- Before / after: `docs/screenshots/_brand/manual-read-edit-figures-2026-09-30.jpg`.

Model: Opus 5.5 (build).
