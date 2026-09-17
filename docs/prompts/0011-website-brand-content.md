version: 0.6.0
date: 2026-09-17
slug: website-brand-content
codes: W-01 W-02 W-03 W-04 W-05 W-06 W-07 W-08 P-01 A-06 M-02 M-02a M-02b M-02c M-02d M-09 M-09a M-09b S-03 K-03 K-04 D-02

# Prompt

_From Justin Massion, Slack, 2026-09-17. Two attachments: `HOY_Modelo_de_Valor_v3.pdf` and
`HOY-Contenido-Completo-Sobre-Nosotros-Filosofia-Clases.pdf`._

```
please make sure to update anything within the app operations manual, website, etc using htis information please. with english and spanish translation where papropraite of course.

1. Thin screens to deepen: content CMS, finance payouts, teacher payroll, legal copy, and photo and map slots.
Deepen those as needed.

Also, make the web page better as the best site ever! You can suggest whatever to make it better and better. as a note, later i will start providing art work since claude doesnt do that by default without 3rd part image and video generator. but we will do some very fancy stuff on the site soon enough :slightly_smiling_face:

Also, you can make the operations manual more visual, maybe pull in screenshots from the app and anything else you need to do to make it feel more like a beautiful experience for whoever is reading it. Think if there's anything missing or can be categorized any better as needed or whatever. Also it can dynamically pull key data from the backend system itself too, such as price models, and more.
```

## Response

This one prompt shipped as **v0.6.0** across three parallel tracks — `0011` the website and brand
content, `0012` the depth pass on the thin screens, `0013` the operations manual — merged and
reconciled in one integration pass. What landed:

- **The brand copy is now typed tenant data.** `src/tenant/brand.ts` holds the manifesto, the "Sobre
  HOY" and philosophy paragraphs, the five class essays and the taglines, every field `{es,en}`;
  `src/tenant/pricing.ts` gained `FAMILY_ROLE`, `FAMILY_RATIONALE` and `DISCIPLINE` from the value
  model. Nothing is written twice: the site, the plans page and the manual all read these files.
- **The public site was rebuilt around it** — a hero and five-section home, a full About/Philosophy
  page, two new codes **W-07** `/site/classes` and **W-08** `/site/classes/:slug`, a Plans page that
  explains why each family exists, and a Contact page with a real map slot and a WhatsApp form. Every
  site page renders through `useLayout(spec)`, so the layout editor works on all of them. The studio
  is **Medellín**, per the brand PDF.
- **The five thin screens have depth.** M-02 became a family (M-02a articles, M-02b FAQ, M-02c
  events, M-02d the media library); M-09 gained M-09a payroll runs and M-09b the per-teacher
  statement with a run that closes itself once the last teacher is settled; S-03 `/teach/payroll`
  reads the run instead of guessing; A-06 is a versioned bilingual legal library whose numbers are
  `{{policy.*}}` tokens resolved from M-08, so it cannot go stale.
- **The artwork the owner will supply has a place to land.** `media_assets.slot_key` is one contract:
  `MediaPlaceholder` in the app and `MediaSlot` / `MapSlot` on the site all read it. Twelve slots are
  seeded `pending` with a ratio and a photographer's brief each — paste a URL in M-02d, flip the row
  to `ready`, and the asset appears everywhere with no deploy.
- **The operations manual is a book**: 28 ES + 28 EN chapters in seven parts, a cover with reading
  paths by role, a table of contents per chapter, **64 real figures per language** (no placeholders
  left), and `{{pricing:…}}` / `{{tenant:…}}` / `{{policy:…}}` / `{{table:…}}` blocks that read the
  app's own sources — exactly the "dynamically pull key data from the backend" the prompt asked for.
- **What it asks back**: 27 decisions only the owner can make are auto-extracted to
  `/#/manual/decisions` and deduplicated in `ROADMAP.md` §E — the real address and contact details,
  the teacher rate card and payroll cadence, which legal versions to publish, the map provider, IVA
  on published prices, and how the five classes are named against the four movements.
