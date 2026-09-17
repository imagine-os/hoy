# Design system (D-01, D-02)

## Tokens (`src/design/tokens.ts`)
Single source of truth; `tokens.css` is generated from it and imported once in `main.tsx`.
- **Brand palette**: cream `#F1E7D2` (neutral base), light yellow `#F7F3B2`, deep blue `#35597D`,
  mid blue `#5F85B1`. Movement palette (Enraíza / Fluye / Arde / Libera) for class categories.
- **Semantic roles**: `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-text`,
  `--color-text-muted`, `--color-primary`, `--color-accent`, `--color-border`, `--color-success/warn/danger`.
- **Type**: Inter (headings; Akzidenz-Grotesk is unlicensed) + DM Sans (body) from Google Fonts.
  Scale `--fs-xs … --fs-3xl`.
- **Spacing**: 4-pt grid `--sp-1 … --sp-12`.
- **Radii**: 8 / 16 / 24 / 32.
- **Shadows**: three-layer physical shadow — inset top highlight + contact shadow + soft ambient.
- **Motion**: `--dur-fast/base/slow`, `--ease-out`.

## Themes and skins
`<html data-theme="light|dark" data-skin="styled|wireframe">`. Wireframe strips colour and shadow to
review structure. `ThemeProvider` exposes toggles; choices persist in localStorage.

## Component library (D-02)
Every component ships a `.meta.ts` (tier, description es/en, props, states, usages, a11y notes).
`/#/dev/components` renders all of them. Rule: no component without a meta, no meta without a usage.
