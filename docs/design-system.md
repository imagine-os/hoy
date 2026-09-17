# Design system (D-01, D-02)

## Tokens (`src/design/tokens.ts`)
Single source of truth; `tokens.css` is generated from it (`npm run tokens`, also part of `npm run build`) and
imported once in `main.tsx`. Every value is lifted from the canvas (`reference/canvas/Hoy Wellness System.dc.html`,
v1.5) for the active brand **hoy 2026**, from the brand board (`reference/brand/p8-1.png`) and from the canvas D-01
artboard. Nothing invents a value off this file.

- **Brand palette** (`--brand-*`): cream `#F1E7D2` (neutral base), light yellow `#F7F3B2`, deep blue `#35597D`,
  mid blue `#5F85B1`, ink `#1C2E42`, sand `#E7DCC6`, paper `#FBF7EF`.
- **Canvas palette** (`--hoy-c1 … --hoy-c26`, `--hoy-dg`, `--hoy-cat`): the canvas colour tokens for
  `data-brand="hoy"`, kept whole so the mapping below is auditable.
- **RGB triplets** (`--m-*`): the canvas `--m1 … --m10`, used inside `rgba()` by every shadow and texture so dark can
  recolour them.
- **Semantic roles** (`--color-*`): ground, bg (frame), lane, surface, surface-elevated/2/3/4, text, ink, text-muted,
  text-faint, text-on-primary, text-on-inverse, primary (accent as text), accent-fill (accent as a fill),
  accent, accent-soft, highlight/on-highlight (pricing badge), border, border-strong, success/warn/danger, focus,
  scrim; `--gradient-frame`, `--gradient-tile`.
- **Movements** (`--mv-*`): Enraíza / Fluye / Arde / Libera from the canvas `movSets.hoy`.
- **Shadows** (`--shadow-*`): the canvas Depth layer verbatim — `card` (`.surf2` tiles: inset highlight + contact +
  soft), `raised` (`.surf` panels, six layers), `frame` (phone/desktop frame), `accent` (buttons, active pills),
  `inverse` (deep-blue cards), `lane`, `pressed`, `pressed-deep`. Aliases `highlight`, `contact`, `soft` are the three
  layers of `card`.
- **Textures** (`--tex-*`): the canvas Texture layer as pure CSS — `lane`, `surf`, `accent` (two 1 px repeating
  gradients + a radial light pool), `paper` (graph paper behind component demos), `ph` (image placeholder stripes).
  `--tex-lane-on / --tex-surf-on / --tex-accent-on` are what components apply; dark and wireframe set them to `none`.
- **Materials** (`--mat-*`): Sand, Light, Sky, Deep, Linen — decorative fills for hero art, gift cards, empty art.
- **Type**: Inter (headings, `--ls-tight: -0.02em`, colour `--color-ink`) + DM Sans (body) from Google Fonts with
  metric-adjusted `Inter Fallback` / `DM Sans Fallback` `@font-face` (see `global.css`). Scale `--fs-2xs … --fs-4xl`;
  eyebrows are `--fs-2xs` uppercase `--ls-eyebrow .14em` in `--color-text-faint`.
- **Spacing**: 4-pt grid `--sp-1 … --sp-20`.
- **Radii**: `--r-xs 4` (code tags) · `--r-sm 8` · `--r-ctl 11` (controls, date cells) · `--r-md 16` (cards) ·
  `--r-frame 18` (desktop frame) · `--r-lg 24` · `--r-xl 32` · `--r-phone 34` (phone frame) · `--r-full`.
- **Motion**: `--dur-fast/base/slow`, `--dur-spin 1.1s`, `--dur-breath 7s`; the breathe keyframes are the canvas's
  (`scale .82 → 1.08`, `opacity .5 → .95`).

## Canvas var → HoyOS token
| Canvas | Value (hoy, light) | HoyOS token | Used for |
| --- | --- | --- | --- |
| page ground | `#E7DCC6` | `--color-ground` | behind the phone frame on desktop |
| `.surf` (frame) | `#FBF7EF` | `--color-bg`, `--gradient-frame` | app background / phone & desktop frame |
| `.surf2` (tile) | `#F5EEE1` (`--c13/--c19/--c25`) | `--color-surface` | cards, tiles, list groups, tables |
| D-01 Elevated | `#FFFCF6` | `--color-surface-elevated` | raised cards, hover |
| `--c17` | `#EFE7DA` | `--color-surface-2` | muted cards, code blocks |
| `--c20` (pressed) | `#EDE4D4` | `--color-surface-3` | segmented tracks, toggles, meters |
| `--c16` | `#E3DBCB` | `--color-surface-4` | avatar / photo placeholder |
| `.lane`, `--c21` | `#F1E7D2` | `--color-lane` | desktop sidebar, site footer |
| `.ink`, `--c3/--c11` | `#1C2E42` | `--color-ink` | headings |
| `--c2/--c10` | `#24384F` | `--color-text` | body text |
| `.dim` | `#4C5D70` | `--color-text-muted` | secondary text |
| `rgba(var(--m3),.5–.6)` | `rgba(36,56,79,.55)` | `--color-text-faint` | eyebrows, hints |
| `--c1` (`.accent` fill) | `#35597D` | `--color-accent-fill` | buttons, selected chips, active nav, inverse cards |
| `--c1` / `--cat` (text) | `#35597D` / dark `#9BC0E4` | `--color-primary` | links, active labels, deltas |
| `--c13` | `#F5EEE1` | `--color-text-on-primary` | text on accent fills |
| `.inverse` ink | `#F1E7D2` | `--color-text-on-inverse` | text on inverse cards |
| `--c4` | `#5F85B1` | `--color-accent`, `--color-focus` | mid-blue accents, focus ring |
| `--c9/--c26` | `#9BAEC4` | `--color-accent-soft` | steel accents |
| `.pbadge` | `#F7F3B2` / `#4A4212` | `--color-highlight` / `--color-on-highlight` | pricing badge, highlight cards |
| `rgba(var(--m2),.12)` | — | `--color-border` | hairlines |
| select border | `rgba(53,89,125,.28)` | `--color-border-strong` | inputs |
| `--dg` | `#7E3B2C` / dark `#E0A08F` | `--color-danger` | negative deltas, destructive |
| `--m1` | `53,89,125` | `--m-primary` | accent shadows |
| `--m2` / `--m3` | `36,56,79` | `--m-shade` / `--m-ink` | shadows, grain (dark: `0,0,0`) |
| `--m4` | `95,133,177` | `--m-mid` | focus ring |
| `--m5` | `216,194,74` | `--m-sun` | hero glow |
| `--m7` | `155,174,196` | `--m-steel` | — |
| `--m8` | `241,231,210` | `--m-cream` | top bars at 90 % |
| `--m9` | `255,255,255` | `--m-light` | inset highlights |
| `--m10` | `251,247,239` | `--m-paper` | — |
| Depth `.surf2` shadow | — | `--shadow-card` | cards |
| Depth `.surf` shadow | — | `--shadow-raised` | drawers, raised cards |
| frame shadow (inline) | — | `--shadow-frame` | phone frame |
| Depth `.accent` shadow | — | `--shadow-accent` | primary buttons |
| Depth `.inverse` shadow | — | `--shadow-inverse` | inverse cards, gift cards |
| Texture `.lane` | — | `--tex-lane` | body, sidebar, ground |
| Texture `.surf` | — | `--tex-surf` | frame, raised cards |
| Texture `.inverse/.accent` | — | `--tex-accent` | primary buttons, inverse cards |
| `.graphpaper` | — | `--tex-paper` | component library canvas |
| `.ph` | — | `--tex-ph` | media placeholders |
| D-01 textures | Sand · Light · Sky · Deep · Linen | `--mat-*` | hero art, gift cards |
| `movSets.hoy` | — | `--mv-{enraiza,fluye,arde,libera}-{fg,dot,bg}` | chips, week cells, legends |
| radii 4 · 8 · 11 · 16 · 18 · 24 · 32 · 34 | — | `--r-xs … --r-phone` | — |
| `@keyframes breathe` 7 s, `spin` 1.1 s | — | `--dur-breath`, `--dur-spin` | A-01 rings, spinners |

## Themes and skins
`<html data-theme="light|dark" data-skin="styled|wireframe">`. Dark re-maps the surfaces to the canvas's dark hoy
values (frame `#1B2E44`, tiles `#22384F`, lane `#16263A`, ground `#101C29`, ink `#F1E7D2`, dim `#A3B3C5`) and never
inverts accents: fills stay `#35597D`, text accents lighten to `--cat #9BC0E4`. Textures switch off in dark (as in the
canvas). Wireframe strips colour, texture and shadow, restores 1 px `#C9C4B8` borders (`--color-card-border`) and sets
Jost as the face, to review structure. `ThemeProvider` exposes toggles; choices persist in localStorage.

## Component library (D-02)
Every component ships a `.meta.ts` (tier, description es/en, props, states, usages, a11y notes).
`/#/dev/components` renders all of them on the graph-paper canvas. Rule: no component without a meta, no meta
without a usage. Surface vocabulary shared by all of them: `.surf` (frame/panel), `.surf2` (tile), `.inverse`
(deep-blue card), `.ph` (placeholder) in `global.css`, and the `Card` tones `surface | primary | highlight | muted`.
