---
title: Media library and artwork
role: coordination, admin
part: V
version: 0.6.0
updated: 2026-09-17
summary: What images the system needs, in what format, who approves them, and the checklist of what is missing.
---

# Media library and artwork

Right now the system has the slots for the photographs, not the photographs. This chapter is the list
of what has to be produced and the rules that get it in cleanly.

## 1. Library rules
1. An image that gets published is **approved**: coordination reviewed it, the owner approved it if it
   is brand, and anyone appearing in it signed permission.
2. Descriptive lowercase file names, no accents and no spaces: `heated-room-morning-01.jpg`.
3. Format: JPG for photography, PNG only for logos and graphics with transparency, SVG for icons.
4. Keep the large original; the system is not the archive of the photo shoot.
5. No recognisable faces of members without written permission (`23`). Backs, hands, a detail of the
   room: always safe.

## 2. The formats the system asks for
| Slot | Ratio | Where it shows |
|---|---|---|
| Home hero | 16:9 | W-01 |
| Class photo | 16:9 | C-03 |
| Teacher portrait | 4:3 | C-18, W-05, S-03 |
| Event photo | 4:5 | C-23 |
| Studio tour (video) | 16:9 | C-13 |
| Map / façade | 16:9 | W-06 |
| Wordmark | PNG with transparency | the whole app |

![Where the teacher portrait goes](../../screenshots/C-18/en-390.jpg "C-18 · /app/teachers")

![Where the event photo goes](../../screenshots/C-23/en-390.jpg "C-23 · /app/events")

## 3. Artwork checklist (what is missing)
| # | Piece | For | Status |
|---|---|---|---|
| 1 | Home hero, the room in morning light | W-01 | pending |
| 2 | One photo per modality (5) | C-03, W-03 | pending |
| 3 | A portrait of every active teacher | C-18, W-05 | pending |
| 4 | Short studio tour video | C-13 | pending |
| 5 | Façade and map | W-06 | pending |
| 6 | Heated-room detail (no people) | `02`, social | pending |
| 7 | A Pausas photo: someone with 20 minutes, in office clothes | `03`, `11` | pending |
| 8 | The empty space, for the rental catalogue | `12` | pending |
| 9 | The wordmark in all three colourways, light and dark | app, site | done |
| 10 | Gift voucher template | C-17 | pending |

## 4. Using the wordmark
1. Three colourways: blue, cream and yellow. The light theme uses blue, the dark theme uses cream.
2. It is never distorted, never recoloured, never placed over a busy photograph.
3. The default colourway is configured in **M-08e Branding**.

![Branding settings](../../screenshots/M-08e/en-1280.jpg "M-08e · /admin/settings/branding")

> DECISION NEEDED: who approves third-party use of the wordmark (shoots, pop-ups, partner brands) and whether material produced in the studio must credit HOY.

> DECISION NEEDED: who owns the rights to photos and video shot in the studio during a rental or a session paid for by a third party.

## 5. What is simulated today
1. There is no media library: `photo_url` is a text field in M-02 and the app draws a marker at the
   right ratio until the image arrives.
2. The studio tour (C-13) is a video placeholder.
3. The contact map (W-06) is a placeholder: the map provider and the final address are missing.
