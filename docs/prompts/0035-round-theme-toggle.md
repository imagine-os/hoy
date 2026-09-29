# Round theme toggle (regression)

Source: Slack thread (#hoy) · 2026-09-29 13:00 (America/Bogota) · requester: Justin Massion

## Prompt

i'm not sure why the light/dark toggle came out oval? it should be circle like it was before. it was perfect before

## Response

Branch `fix/round-theme-toggle` from `main` at `b265ac7`, version **0.13.2** (main was 0.13.1 after 0031 and 0036 merged first). Full record in
`docs/changelog/0035-round-theme-toggle.md`.

**Root cause.** Not the icons pass (0030): the pre-0030 build (`f4b9197`) already drew the same oval. It came from
0025's 44 px control floor (`ce62a61`, `src/styles/global.css`: `button { min-height: var(--h-ctl) }`). The
DesktopShell theme toggle was a fixed `28 × 28` circle and the notification bell a `32 × 32` one; the floor raised their
height to 44 px but not their width, so `border-radius: 50%` drew 28 × 44 and 32 × 44 ovals in every staff, admin, dev,
docs and manual top bar (S-*, M-*, D-*, K-*). The website, auth and hub toggles were already `44 × 44` and stayed round.

1. **Shared fix** — one class in `global.css` next to the floor: `.ctl-round` (width = height = `--h-ctl`,
   `aspect-ratio: 1`, no padding, `border-radius: 50%`, icon centred on a grid). Every theme toggle (DesktopShell,
   website V1 + V2 and its motion button, AuthShell, the hub brand band) and `NotificationBell` wear it; the module
   classes keep only their skin (border, background, shadow, colour). The toggle and bell are now 44 × 44 circles —
   the same size as the language pill's height and as the site/auth/hub toggles.
2. **The site hero's motion button** on phones (`.sanctuary-motion`, 34 × 44) had the same oval; it is now 44 × 44.
3. **Phone top bar in dev mode** (super admin, DesktopShell below 480 px): the two bigger circles no longer leave room
   for the wordmark (it was already clipped to 21 px at 390 and gone at 360), so the spec chip stands in for it and,
   below 380 px, the dev switch leaves the bar (the chip already says dev mode is on) so ☰ is never overlapped.
4. **Checked** in Playwright at 390 and 1280, light and dark, on W-01 (V2 and V1), S-02, HUB-01, K-03 and A-02: every
   theme toggle and bell measures 44 × 44. C-01 (AppShell) has no theme toggle in its top bar at either width, so
   nothing changed there. Before/after strip: `docs/screenshots/_brand/theme-toggle-round-2026-09-29.jpg`.
