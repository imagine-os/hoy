# Source documents

The owner's own documents the operations manual and the website are written from. The PDFs are served
from `public/source/` (so the app can show them inline); this folder holds their index.

| id | What | Kind | Pages | Received |
| --- | --- | --- | --- | --- |
| `modelo-de-valor` | Value model deck, no prices: the six revenue lines and the capacity discipline | deck | 8 | 2026-09-29 |
| `contenido-completo` | Final website copy: About HOY, philosophy, classes | web-copy | 5 | 2026-09-29 |
| `manual-de-marca` | Brand manual 2026: manifesto, personality, logo, type, palette | brand-manual | 12 | 2026-09-29 |

- **Index:** `docs/source/index.json` — `id`, `title{es,en}`, `file` (relative to the app base), `cover`,
  `pages`, `date`, `kind` (`deck` · `web-copy` · `brand-manual`), `summary{es,en}` and `chapters` (the manual
  chapter numbers that should embed it).
- **In the app:** K-05 `/#/docs/source` lists the three with an inline viewer; a chapter embeds one with
  `{{source:<id>}}` on its own line.
- **Files:** `public/source/<id>.pdf` and `public/source/<id>-cover.jpg` (first page, 640 px). The brand
  manual was 27.8 MB as received (Canva export); it is republished at 2.4 MB with ghostscript
  (`gs -sDEVICE=pdfwrite -dPDFSETTINGS=/printer`, 300 dpi images, logo pages checked sharp). The other two
  are the files as received.
- **Adding one:** copy the PDF to `public/source/<id>.pdf`, render its cover
  (`pdftoppm -f 1 -l 1 -jpeg -scale-to-x 640 -scale-to-y -1`), add an entry to `index.json`. No code change.

Received from Justin in Slack #hoy on 2026-09-29 (prompt `docs/prompts/0031-manual-lms.md`).
