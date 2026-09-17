# Reference material (frozen)

Source material handed over from Claude Design and the studio. Read-only: the code is the source
of truth from now on. Nothing here is imported by the app except `public/brand/*` (copied out).

| Path | What |
| --- | --- |
| `canvas/Hoy Wellness System.dc.html` | The Claude Design canvas (52 items, 12 lanes) with all screen templates. Needs `support.js` to render. |
| `canvas/support.js` | dc-runtime for the canvas. |
| `canvas/inventory.md` | Lane-by-lane inventory of the canvas produced during the handover. |
| `canvas/specs.json` | All 49 spec objects extracted from the canvas script (code, intent, data, roles, layers, rules, api, states, toggles). Ported to `src/specs/canvasSpecs.ts`. |
| `canvas/strings.json` | Every EN/ES string pair from the canvas. |
| `brand/p7-0.png` | Brand manual p.07 "Voz y tono". |
| `brand/p8-0.png` | Deep-blue wordmark (same as `public/brand/hoy-blue.png`). |
| `brand/p8-1.png` | Brand board: lockups + palette swatches + studio photo. |
| `uploads/Manual de marca HOY.pdf` | Brand manual 2026 (12 pages, Spanish). Palette `#F1E7D2 #F7F3B2 #35597D #5F85B1`; Akzidenz-Grotesk (unlicensed → Inter) + DM Sans. |
| `uploads/HOY_Modelo_de_Valor_v3.pptx` | Pricing model v3 (COP). Ported to `src/modules/website/pricing.ts`. |
| `uploads/screens/` | UI reference screenshots, sketches (`draw-*`) and phone mockups (`pasted-*`). |

Wordmarks and lockups used by the app live in `public/brand/` (`hoy-blue`, `hoy-cream`,
`hoy-yellow`, `p8-2`, `p8-3`).

## Skipped on purpose
- `magnific_img1-is-the-style-and-sam_VXhznWmMMU.png` (5.2 MB) and
  `magnific_please-apply-the-physical_Sy3TmMIUb8.png` (15 MB): upscaled renders, too large for the repo.
  Keep them in the shared drive; link from docs if needed.
- `HOY_Modelo_de_Valor_v3-36f69898.pptx`: byte-identical duplicate of the pricing deck.
- `__MACOSX/` folders from the zip archives.
