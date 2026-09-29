# Site cursor: quiet, token-based, light and dark

Source: Slack thread (#hoy) · 2026-09-29 · requester: Justin Massion (via the coordinator)

## Prompt

make the mouse cursor better. its kinda tacky right now. make it feel like it fits with the rest of the app colors and what not. also that it works well in dark and light.

## Response

Branch `feat/site-cursor` from `main` at `8b8faac` (0041, v0.17.0), version **0.17.1**. Full record in
`docs/changelog/0042-site-cursor.md`. Model routing: design direction Fable 5.1, build and verification Opus 5.5.

The website's custom cursor (`ElementCursor`, mounted by `SiteShell` for the Sanctuary edition with motion on) was a
glowing orb: a gradient core with two neon glows in the class-tone colour and a halo that changed shape per tone. It is
now a quiet, precise pointer built only from theme tokens:

- **Dot** — 6 px, `--color-ink` (light `#1C2E42`, dark `#F1E7D2`), sits exactly on the pointer, with a 1 px
  `--color-surface` hairline at 60 % so it stays visible over the blue button, photos and dark bands.
- **Ring** — 28 px, 1.5 px `--color-primary` at 55 % (light `#35597D`, dark `#9BC0E4`), trailing the dot with a
  `requestAnimationFrame` lerp (0.22 per frame, the loop stops when it converges). Over links, buttons, tabs,
  `label[for]`, `summary`, `.is-interactive`, `.is-clickable` it opens to 40 px at 90 % and the dot shrinks to 4 px;
  pressed it closes to 22 px; over reading text (p, li, h1–h6) the ring fades out and only the dot stays. A surface
  hairline on both sides of the stroke keeps it readable blue-on-blue in light mode.
- **Tone** — only a hint: over a class tone the ring colour is 60 % of the tone dot mixed with primary. The per-tone
  shapes, glows and gradients are gone.
- **Gating** unchanged: fine pointer + hover + no reduced motion, mouse only, hidden on Tab / blur / leaving the
  window, native cursor in inputs, textareas, selects, contenteditable, iframes and video.

Before / after sheets (light and dark; 1280 before, 1280 and 2560 after; hero text, primary button, W-07 class photo)
are in `docs/screenshots/_cursor/0042-before-after-{light,dark}.png`.
