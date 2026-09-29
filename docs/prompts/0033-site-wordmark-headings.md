# Website wordmark in display headings

Source: Slack thread (#hoy) · 2026-09-29 12:08 (America/Bogota) · requester: Justin Massion

## Prompt

not in the paragraph text, but in large headers and stuff the owner asked that we have the logo for where the word says Hoy.  So make sure its a png or svg and of course the right spacing and light mode dark mode states,   Show me the results and point out the places in the website where this makes sense

This is in the website specifically.

## Response

Branch `feat/site-wordmark` from `main` at `f4b9197`, version **0.11.3**. Full record in
`docs/changelog/0033-site-wordmark-headings.md`; before / after contact sheet at
`docs/screenshots/_brand/wordmark-in-headings-2026-09-29.jpg`.

1. **Asset — SVG.** The brand manual's logo is raster in the PDF (a 1676×601 alpha mask on slide 3, no vector), so the
   script was traced with potrace at 4× into `public/brand/hoy-wordmark.svg`: one compound path, `fill="currentColor"`,
   a `<symbol id="hoy">` pages reference with `<use>`, 3.8 KB. Checked at 120 px, 600 px and ~5× zoom: smooth strokes.
   The PNG colourways stay for the `<img>` uses (emails, receipts, apps).
2. **Component.** The `Wordmark` atom gains `vector` (block mark, header / footer) and `inline` (inside a heading),
   plus `tone` (`auto` = #35597D on light / #F1E7D2 on dark, `blue`, `cream`, `yellow`, `current`). `brandHeading(text)`
   splits a heading on the standalone brand word (`HOY`, from `tenant.name`) and sets the mark there; copy in
   `src/tenant/brand.ts` and the `{ es, en }` strings did not change. Tokens in D-01: `--wm-inline-h` 1.2em,
   `--wm-inline-gap` 0.12em, `--wm-min-w` 120px. The mark sits on the text baseline, keeps clear space ≈ the H height,
   never renders under 120 px wide, is `role="img"` + `aria-label="HOY"`, and prints blue.
3. **Where it is (V2 website):** site header brand link and footer brand link (every `#/site` page), W-02 title
   "Sobre HOY / About HOY", W-07 closing panel "Todo empieza HOY.", W-08 closing panel "La vida es HOY.".
   Left as text on purpose: paragraphs, buttons, nav links ("Sobre HOY" in the menu), eyebrows ("LA VIDA ES HOY" on
   W-01), the W-02 lead and pull-quote (20–30 px, under the 120 px minimum), the footer tagline, `<title>`, and the
   Spanish adverb "hoy" ("today", e.g. W-01's "empieza hoy.", "Hoy en el club"). V1 (classic) headings stay text.
