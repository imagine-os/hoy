# 0006 — Visual fidelity pass (colours, textures, surfaces)

- **Source**: Justin in the Slack thread, relayed by the build coordinator to the design worker
- **Date**: 2026-09-17
- **Requester**: Justin (project lead)
- **Changelog**: `docs/changelog/0006-visual-fidelity.md`

## Prompt (verbatim)

> Build baby build. Make sure to get the look to match the samples we made closer as far as colors and textures also.

Coordinator brief (summarised): the samples are the Claude Design canvas screens (`reference/canvas/Hoy Wellness
System.dc.html`, v1.5, brand **hoy 2026**) and the brand board (`reference/brand/p8-1.png`). Rewrite D-01 so the
generated `tokens.css` reproduces the canvas values exactly (colours, semantic surface roles, the multi-layer shadow
scale, radii 8/16/24/32/34, Inter + DM Sans, spacing, motion), add texture tokens as pure CSS, keep light/dark and
the wireframe skin working, then apply them through the shared components and shells and check C-01, C-02, C-03,
C-04, W-01, P-01, S-02, S-04, M-01, M-03, HUB-01 against the canvas. Verify with `npm run build` and the screenshot
smoke, produce before/after pairs and one comparison image, document (prompt, changelog 0.4.0, kanban, design-system
mapping table, D-01 page shows textures and shadows live), commit and push, report Pages status.

## Response

Built in one commit on `main` (see the changelog for the decisions):

- **D-01 rewritten from the canvas** — `src/design/tokens.ts` now carries the canvas hoy-brand palette
  (`--hoy-c1…c26`, `--m-*` RGB triplets), semantic roles read off the brand/theme rules
  (`.surf` paper `#FBF7EF`, `.surf2` tiles `#F5EEE1`, ink `#1C2E42`, text `#24384F`, dim `#4C5D70`, accent `#35597D`,
  pricing badge `#F7F3B2/#4A4212`, ground `#E7DCC6`), the **Depth** layer's shadow recipes verbatim
  (`--shadow-card/raised/frame/accent/inverse/lane/pressed`), the **Texture** layer as CSS
  (`--tex-lane/surf/accent/paper/ph`), the D-01 materials (`--mat-sand/light/sky/deep/linen`) and surface scale,
  the movement palette from `movSets.hoy`, radii 4/8/11/16/18/24/32/34, breathe 7 s and spin 1.1 s.
- **Shells** — the customer app is the canvas phone frame from 900 px up (430 wide, 34 px radius, frame gradient,
  frame shadow, bottom dock inside the frame, sand ground with the lane grain behind it); the desktop shell has the
  cream sidebar with the inset edge and the accent pill for the active item; top bars are cream at 90 % with the blue
  hairline.
- **Components** — cards, chips, buttons, segmented control, date strip, stat tiles, inputs, toggles, avatars, nav bar,
  badges, notices, list groups and tables use the surface/shadow/texture tokens the way the canvas does (no hairline
  borders in the styled skin; wireframe restores them). Movement chips use the exact hoy colours. Breathing rings use
  the canvas keyframes.
- **Type** — Inter headings with `-0.02em` tracking and ink colour, DM Sans body, 11 px `.14em` eyebrows; metric-adjusted
  `Inter Fallback` / `DM Sans Fallback` `@font-face` so offline renders keep the rhythm.
- **Docs** — `docs/design-system.md` has the canvas var → HoyOS token table; `/#/dev/tokens` renders palette, RGB
  triplets, surfaces, textures, materials and the full shadow scale live; before/after pairs and
  `docs/screenshots/_before/0006/comparison.jpg`; full screenshot pass regenerated.
