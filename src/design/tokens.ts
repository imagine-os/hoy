/**
 * D-01 — the single source of truth for every design value.
 * tokens.css is generated from this file (npm run tokens) and imported once in main.tsx.
 * Nothing invents a value off this file.
 *
 * Values are lifted from the canvas (reference/canvas/Hoy Wellness System.dc.html, v1.5) for the
 * active brand "hoy 2026": its `.canvas[data-brand="hoy"]` colour tokens (--c1…--c26 as `palette`,
 * --m1…--m10 RGB triplets as `rgb`), the brand/theme surface rules (.surf/.surf2/.ink/.dim/.accent/.inverse),
 * the Texture and Depth detail layers, and the D-01 artboard's materials and surface scale.
 * The mapping table canvas var → HoyOS token lives in docs/design-system.md.
 */

/** Brand manual palette (p8-1) + the derived neutrals the canvas uses for the hoy brand. */
export const brand = {
  cream: '#F1E7D2',   // --c14/--c15/--c21/--c24 · neutral base (lane, sidebar)
  yellow: '#F7F3B2',  // light yellow · pricing badge, highlights
  deepBlue: '#35597D', // --c1/--c6 · primary, accent fills
  midBlue: '#5F85B1', // --c4 · accent, focus
  ink: '#1C2E42',     // --c3/--c11 · .ink (headings)
  sand: '#E7DCC6',    // --c22 · page ground behind frames
  white: '#FBF7EF',   // --c18/--c23 · .surf frame paper
} as const;

/** The canvas colour tokens for data-brand="hoy" (light). Kept whole so the mapping is auditable. */
export const palette = {
  c1: '#35597D', c2: '#24384F', c3: '#1C2E42', c4: '#5F85B1', c5: '#24384F', c6: '#35597D', c7: '#D8C24A', c8: '#5E5312',
  c9: '#9BAEC4', c10: '#24384F', c11: '#1C2E42', c12: '#24384F', c13: '#F5EEE1', c14: '#F1E7D2', c15: '#F1E7D2', c16: '#E3DBCB',
  c17: '#EFE7DA', c18: '#FBF7EF', c19: '#F5EEE1', c20: '#EDE4D4', c21: '#F1E7D2', c22: '#E7DCC6', c23: '#FBF7EF', c24: '#F1E7D2',
  c25: '#F5EEE1', c26: '#9BAEC4', dg: '#7E3B2C', cat: '#35597D',
} as const;

/** RGB triplets (canvas --m1…--m10) used inside rgba() for shadows and textures. */
export const rgb = {
  light: {
    'm-primary': '53,89,125',   // --m1 · deep blue
    'm-shade': '36,56,79',      // --m2 · ink shade for shadows and grain
    'm-ink': '36,56,79',        // --m3
    'm-mid': '95,133,177',      // --m4
    'm-sun': '216,194,74',      // --m5
    'm-steel': '155,174,196',   // --m7
    'm-cream': '241,231,210',   // --m8
    'm-light': '255,255,255',   // --m9 · highlight
    'm-paper': '251,247,239',   // --m10
  },
  dark: {
    'm-primary': '155,192,228', // --cat dark
    'm-shade': '0,0,0',         // dark .surf shadows use pure black in the canvas
    'm-ink': '228,218,198',
    'm-mid': '95,133,177',
    'm-sun': '216,194,74',
    'm-steel': '155,174,196',
    'm-cream': '241,231,210',
    'm-light': '255,255,255',
    'm-paper': '27,46,68',
  },
} as const;

/** The four movements — canvas `movSets.hoy`; class cards, week chips and the intention picker. */
export const movements = {
  enraiza: { label: 'Enraíza', fg: '#3A4C36', dot: '#5A7355', bg: 'rgba(90,115,85,.24)' },
  fluye: { label: 'Fluye', fg: '#2C4A6B', dot: '#5F85B1', bg: 'rgba(95,133,177,.24)' },
  arde: { label: 'Arde', fg: '#7A3F27', dot: '#C4704F', bg: 'rgba(196,112,79,.26)' },
  libera: { label: 'Libera', fg: '#5E5312', dot: '#D8C24A', bg: 'rgba(216,194,74,.32)' },
} as const;
export type Movement = keyof typeof movements;

/**
 * Semantic roles. Light = canvas `.canvas[data-brand="hoy"]:not([data-theme="dark"])`,
 * dark = `.canvas[data-brand="hoy"][data-theme="dark"]`. Dark re-maps surfaces; accents are never inverted.
 */
export const semantic = {
  light: {
    'color-ground': '#E7DCC6',       // canvas page ground behind the frames
    'color-bg': '#FBF7EF',           // .surf frame paper (--c18) · solid fallback for the frame gradient
    'color-lane': '#F1E7D2',         // .lane / .surf2 sidebar (--c21)
    'color-surface': '#F5EEE1',      // .surf2 tiles inside a frame (--c13/--c19/--c25) · D-01 "Soft" is one step down
    'color-surface-elevated': '#FFFCF6', // D-01 "Elevated"
    'color-surface-2': '#EFE7DA',    // --c17 · muted tiles, code blocks
    'color-surface-3': '#EDE4D4',    // D-01 "Pressed" · tracks, segmented ground (--c20)
    'color-surface-4': '#E3DBCB',    // avatar/photo placeholder fill (--c16)
    'color-text': '#24384F',         // .surf body ink (--c2/--c10)
    'color-ink': '#1C2E42',          // .ink · headings (--c3)
    'color-text-muted': '#4C5D70',   // .dim
    'color-text-faint': 'rgba(36,56,79,.72)', // eyebrows and hints · .72 keeps 11px semibold text ≥ 4.5:1 on cream and paper (0020)
    'color-text-on-primary': '#F5EEE1', // --c13 on accent fills
    'color-text-on-inverse': '#F1E7D2', // .inverse ink
    'color-primary': '#35597D',      // --c1 · accent as text/links (dark → --cat)
    'color-primary-hover': '#24384F', // --c2
    'color-accent-fill': '#35597D',  // --c1 · accent as a fill: buttons, active pills (constant across themes, as in the canvas)
    'color-accent-fill-hover': '#24384F',
    'color-accent': '#5F85B1',       // --c4 mid blue
    'color-accent-soft': '#9BAEC4',  // --c9/--c26 steel
    'color-highlight': '#F7F3B2',    // pricing badge ground
    'color-on-highlight': '#4A4212', // pricing badge ink
    'color-border': 'rgba(36,56,79,.12)',     // rgba(var(--m2),.12) hairlines
    'color-border-strong': 'rgba(53,89,125,.28)', // select border
    'color-success': '#4F7D5A',
    'color-warn': '#8A6A1E',
    'color-danger': '#7E3B2C',       // --dg
    'color-focus': '#5F85B1',
    'gradient-frame': 'linear-gradient(170deg,#FBF7EF,#F6EFE2)', // phone / desktop frame fill (.surf paper, warmed toward the bottom)
    'gradient-tile': 'linear-gradient(150deg,#F5EEE1,#EDE4D4)',   // C-01 prompt tile
    'color-scrim': 'rgba(36,56,79,.35)',
  },
  dark: {
    'color-ground': '#101C29',
    'color-bg': '#1B2E44',           // dark .surf frame
    'color-lane': '#16263A',
    'color-surface': '#22384F',      // dark .surf2 tiles
    'color-surface-elevated': '#2A4159',
    'color-surface-2': '#2A4159',
    'color-surface-3': '#31506E',
    'color-surface-4': '#3B5C7C',
    'color-text': '#E4DAC6',
    'color-ink': '#F1E7D2',
    'color-text-muted': '#A3B3C5',
    'color-text-faint': 'rgba(228,218,198,.72)', // ≥ 4.5:1 on the dark tile (0020)
    'color-text-on-primary': '#F5EEE1',
    'color-text-on-inverse': '#EFE6D4',
    'color-primary': '#9BC0E4',      // --cat dark
    'color-primary-hover': '#B4D0EB',
    'color-accent-fill': '#35597D',
    'color-accent-fill-hover': '#4A6E93',
    'color-accent': '#5F85B1',
    'color-accent-soft': '#9BAEC4',
    'color-highlight': '#F7F3B2',
    'color-on-highlight': '#3A3410',
    'color-border': 'rgba(241,231,210,.12)',
    'color-border-strong': '#31506E',
    'color-success': '#7FB08A',
    'color-warn': '#D8C24A',
    'color-danger': '#E0A08F',       // --dg dark
    'color-focus': '#9BC0E4',
    'gradient-frame': 'linear-gradient(170deg,#1D3148,#1B2E44)',
    'gradient-tile': 'linear-gradient(150deg,#22384F,#1B2E44)',
    'color-scrim': 'rgba(0,0,0,.5)',
  },
} as const;

/**
 * Depth — the canvas Detail layer "Depth" (multi-layer physical shadows), verbatim, written against the
 * rgb triplets so dark re-colours them. `card` = .surf2 tiles, `raised` = .surf panels/frames.
 */
export const shadows = {
  'shadow-highlight': 'inset 0 1px 0 rgba(var(--m-light),.85)',
  'shadow-contact': '0 1px 1.5px rgba(var(--m-shade),.10)',
  'shadow-soft': '0 6px 14px -8px rgba(var(--m-shade),.30)',
  'shadow-card': 'inset 0 1px 0 rgba(var(--m-light),.85), 0 1px 1.5px rgba(var(--m-shade),.10), 0 6px 14px -8px rgba(var(--m-shade),.30)',
  'shadow-raised': 'inset 0 1px 0 rgba(var(--m-light),.92), inset 0 -1px 0 rgba(var(--m-shade),.07), 0 1px 1px rgba(var(--m-shade),.10), 0 3px 6px -2px rgba(var(--m-shade),.16), 0 12px 24px -10px rgba(var(--m-shade),.34), 0 34px 58px -30px rgba(var(--m-shade),.44)',
  'shadow-frame': 'inset 0 1px 0 rgba(var(--m-light),.7), 0 2px 3px rgba(var(--m-shade),.1), 0 18px 40px -14px rgba(var(--m-shade),.35)',
  'shadow-accent': 'inset 0 1px 0 rgba(var(--m-light),.28), inset 0 -1px 0 rgba(0,0,0,.15), 0 2px 4px -1px rgba(var(--m-primary),.40), 0 10px 22px -8px rgba(var(--m-primary),.58)',
  'shadow-inverse': 'inset 0 1px 0 rgba(var(--m-light),.24), 0 3px 7px -2px rgba(var(--m-shade),.30), 0 18px 38px -14px rgba(var(--m-shade),.55)',
  'shadow-lane': 'inset 0 1px 0 rgba(var(--m-light),.5), 0 1px 2px rgba(var(--m-shade),.07)',
  'shadow-pressed': 'inset 0 1px 2px rgba(var(--m-shade),.12)',
  'shadow-pressed-deep': 'inset 0 2px 4px rgba(var(--m-shade),.20)',
} as const;

/**
 * Texture — the canvas Detail layer "Texture" (suede grain from the brand manual) as pure CSS: two fine
 * repeating hairline gradients plus one soft light pool. Applied as `background-image`; no image files.
 */
export const textures = {
  'tex-lane': 'repeating-linear-gradient(103deg,rgba(var(--m-shade),.030) 0 1px,transparent 1px 3px), repeating-linear-gradient(17deg,rgba(var(--m-shade),.024) 0 1px,transparent 1px 4px), radial-gradient(120% 80% at 22% 12%,rgba(var(--m-light),.28),transparent 60%)',
  'tex-surf': 'repeating-linear-gradient(97deg,rgba(var(--m-shade),.034) 0 1px,transparent 1px 3px), repeating-linear-gradient(7deg,rgba(var(--m-shade),.024) 0 1px,transparent 1px 5px), radial-gradient(130% 90% at 18% 8%,rgba(var(--m-light),.34),transparent 62%)',
  'tex-accent': 'repeating-linear-gradient(101deg,rgba(0,0,0,.06) 0 1px,transparent 1px 3px), repeating-linear-gradient(13deg,rgba(0,0,0,.045) 0 1px,transparent 1px 5px), radial-gradient(120% 90% at 25% 10%,rgba(var(--m-light),.15),transparent 58%)',
  'tex-paper': 'radial-gradient(rgba(var(--m-shade),.16) 1.1px,transparent 1.3px) 0 0/13px 13px',
  'tex-ph': 'repeating-linear-gradient(45deg,var(--color-surface-3),var(--color-surface-3) 5px,var(--color-surface-4) 5px,var(--color-surface-4) 10px)',
} as const;

/** D-01 materials (canvas `tokens.textures` for the hoy brand) — decorative fills for hero art, gift cards, empty art. */
export const materials = {
  sand: { label: 'Sand', fill: 'linear-gradient(150deg,#F5EEE1,#E7DCC6)' },
  light: { label: 'Light', fill: 'linear-gradient(150deg,#FBF9DC,#F7F3B2)' },
  sky: { label: 'Sky', fill: 'linear-gradient(150deg,#A7BFDA,#5F85B1)' },
  deep: { label: 'Deep', fill: 'linear-gradient(150deg,#4A6E93,#35597D)' },
  linen: { label: 'Linen', fill: 'repeating-linear-gradient(90deg,#F7F1E5,#F7F1E5 3px,#EDE4D4 3px,#EDE4D4 6px)' },
} as const;

/** D-01 surface scale (canvas `tokens.surfaces`). */
export const surfaces = {
  card: { label: 'Card', fill: 'var(--color-surface)', shadow: 'var(--shadow-card)' },
  elevated: { label: 'Elevated', fill: 'var(--color-surface-elevated)', shadow: 'var(--shadow-raised)' },
  pressed: { label: 'Pressed', fill: 'var(--color-surface-3)', shadow: 'var(--shadow-pressed-deep)' },
  soft: { label: 'Soft', fill: 'var(--color-surface-2)', shadow: 'none' },
  inverse: { label: 'Inverse', fill: 'var(--color-accent-fill)', shadow: 'var(--shadow-inverse)' },
} as const;

/** Brand manual: Inter for headings, DM Sans for body. Fallbacks are metric-adjusted (see @font-face in global.css). */
export const type = {
  'font-heading': "'Inter', 'Inter Fallback', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  'font-body': "'DM Sans', 'DM Sans Fallback', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  'font-mono': "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  'fs-2xs': '0.6875rem', // 11px · eyebrows, code tags
  'fs-xs': '0.75rem',
  'fs-sm': '0.875rem',
  'fs-md': '1rem',
  'fs-lg': '1.125rem',
  'fs-xl': '1.375rem',
  'fs-2xl': '1.75rem',
  'fs-3xl': '2.25rem',
  'fs-4xl': '3rem',
  'lh-tight': '1.15',
  'lh-base': '1.5',
  'ls-tight': '-0.02em',  // canvas hoy headings
  'ls-eyebrow': '0.14em', // canvas eyebrows
  'fw-light': '300',
  'fw-regular': '400',
  'fw-medium': '500',
  'fw-semibold': '600',
  'fw-bold': '700',
} as const;

/** 4-pt grid */
export const spacing = {
  'sp-0': '0', 'sp-1': '4px', 'sp-2': '8px', 'sp-3': '12px', 'sp-4': '16px', 'sp-5': '20px',
  'sp-6': '24px', 'sp-8': '32px', 'sp-10': '40px', 'sp-12': '48px', 'sp-16': '64px', 'sp-20': '80px',
} as const;

/** Canvas radii: 4 (code tags) · 8 · 11 (controls, date cells) · 16 (cards) · 18 (desktop frame) · 24 · 32 · 34 (phone) · pill. */
export const radii = {
  'r-2xs': '2px',    // hairline tracks (bar lists, token bars)
  'r-xs': '4px', 'r-sm': '8px', 'r-ctl': '11px', 'r-md': '16px', 'r-frame': '18px', 'r-lg': '24px', 'r-xl': '32px', 'r-phone': '34px', 'r-full': '999px',
} as const;

export const motion = {
  'dur-fast': '120ms', 'dur-base': '200ms', 'dur-slow': '360ms', 'dur-spin': '1.1s', 'dur-breath': '7s',
  'ease-out': 'cubic-bezier(.2,.7,.2,1)', 'ease-in-out': 'cubic-bezier(.65,0,.35,1)',
} as const;

const layoutTokens = {
  'w-phone': '430px', 'w-content': '1120px', 'h-topbar': '56px', 'h-bottomnav': '64px', 'w-sidebar': '240px', 'w-rail': '56px',
} as const;

export const tokens = { brand, palette, rgb, movements, semantic, shadows, textures, materials, surfaces, type, spacing, radii, motion, layout: layoutTokens };

function vars(obj: Record<string, string>): string {
  return Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join('\n');
}

/** Builds the full tokens stylesheet. Themes via [data-theme], skins via [data-skin]. */
export function buildTokensCss(): string {
  const brandVars = vars(Object.fromEntries(Object.entries(brand).map(([k, v]) => [`brand-${k}`, v])));
  const paletteVars = vars(Object.fromEntries(Object.entries(palette).map(([k, v]) => [`hoy-${k}`, v])));
  const mv = Object.entries(movements).flatMap(([k, m]) => [[`mv-${k}-fg`, m.fg], [`mv-${k}-dot`, m.dot], [`mv-${k}-bg`, m.bg]]);
  const mat = Object.fromEntries(Object.entries(materials).map(([k, m]) => [`mat-${k}`, m.fill]));
  return `/* GENERATED from src/design/tokens.ts — do not edit by hand */
:root {
${brandVars}
${paletteVars}
${vars(Object.fromEntries(mv))}
${vars(mat)}
${vars(type)}
${vars(spacing)}
${vars(radii)}
${vars(motion)}
${vars(layoutTokens)}
${vars(rgb.light)}
${vars(semantic.light)}
${vars(shadows)}
${vars(textures)}
  --tex-lane-on: var(--tex-lane);
  --tex-surf-on: var(--tex-surf);
  --tex-accent-on: var(--tex-accent);
  --color-card-border: transparent;
  color-scheme: light;
}
:root[data-theme="dark"] {
${vars(rgb.dark)}
${vars(semantic.dark)}
  --shadow-highlight: inset 0 1px 0 rgba(255,255,255,.06);
  --shadow-card: inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.55), 0 10px 30px rgba(0,0,0,.4);
  --shadow-raised: inset 0 1px 0 rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.55), 0 24px 60px -20px rgba(0,0,0,.7);
  --shadow-frame: inset 0 1px 0 rgba(255,255,255,.08), 0 2px 3px rgba(0,0,0,.5), 0 18px 40px -14px rgba(0,0,0,.7);
  --shadow-accent: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(0,0,0,.25), 0 2px 4px -1px rgba(0,0,0,.4), 0 10px 22px -8px rgba(0,0,0,.6);
  --shadow-inverse: inset 0 1px 0 rgba(255,255,255,.1), 0 3px 7px -2px rgba(0,0,0,.4), 0 18px 38px -14px rgba(0,0,0,.7);
  --tex-lane-on: none;
  --tex-surf-on: none;
  --color-card-border: rgba(241,231,210,.06);
  color-scheme: dark;
}
:root[data-skin="wireframe"] {
  --color-ground: #F6F5F2;
  --color-bg: #FFFFFF;
  --color-lane: #FBFBFA;
  --color-surface: #FFFFFF;
  --color-surface-elevated: #FFFFFF;
  --color-surface-2: #F2F1ED;
  --color-surface-3: #E4E2DB;
  --color-surface-4: #D6D3CA;
  --color-text: #3A3A3A;
  --color-ink: #232323;
  --color-text-muted: #6B6B6B;
  --color-text-faint: #8A8A8A;
  --color-primary: #3A3A3A;
  --color-primary-hover: #232323;
  --color-accent-fill: #3A3A3A;
  --color-accent-fill-hover: #232323;
  --color-accent: #6B6B6B;
  --color-accent-soft: #C9C4B8;
  --color-highlight: #EDEBE5;
  --color-on-highlight: #3A3A3A;
  --color-border: #D6D3CA;
  --color-border-strong: #C9C4B8;
  --color-card-border: #C9C4B8;
  --color-text-on-primary: #FFFFFF;
  --color-text-on-inverse: #FFFFFF;
  --color-success: #5E5E5E;
  --color-warn: #5E5E5E;
  --color-danger: #5E5E5E;
  --gradient-frame: linear-gradient(#FFFFFF,#FFFFFF);
  --gradient-tile: linear-gradient(#FFFFFF,#FFFFFF);
  --shadow-highlight: none; --shadow-contact: none; --shadow-soft: none; --shadow-card: none; --shadow-raised: none;
  --shadow-frame: none; --shadow-accent: none; --shadow-inverse: none; --shadow-lane: none; --shadow-pressed: none; --shadow-pressed-deep: none;
  --tex-lane-on: none; --tex-surf-on: none; --tex-accent-on: none;
  --tex-ph: repeating-linear-gradient(45deg,#F2F1ED,#F2F1ED 5px,#E4E2DB 5px,#E4E2DB 10px);
  --mat-sand: #EDEBE5; --mat-light: #EDEBE5; --mat-sky: #D6D3CA; --mat-deep: #C9C4B8; --mat-linen: #EDEBE5;
  --font-heading: 'Jost', system-ui, sans-serif;
  --font-body: 'Jost', system-ui, sans-serif;
  --ls-tight: 0;
}
:root[data-skin="wireframe"][data-theme="dark"] {
  --color-ground: #0E0D0B; --color-bg: #161511; --color-lane: #12110E;
  --color-surface: #1C1A15; --color-surface-elevated: #1C1A15; --color-surface-2: #272419; --color-surface-3: #2A2720; --color-surface-4: #3A362C;
  --color-text: #DCD3C0; --color-ink: #F4EEE0; --color-text-muted: #B2A794; --color-text-faint: #8F8677;
  --color-primary: #DCD3C0; --color-primary-hover: #F4EEE0; --color-accent-fill: #DCD3C0; --color-accent-fill-hover: #F4EEE0; --color-accent: #B2A794; --color-highlight: #272419; --color-on-highlight: #EDE5D2;
  --color-border: #3A362C; --color-border-strong: #4A4536; --color-card-border: #3A362C; --color-text-on-primary: #161511; --color-text-on-inverse: #EDE5D2;
  --gradient-frame: linear-gradient(#161511,#161511); --gradient-tile: linear-gradient(#1C1A15,#1C1A15);
  --tex-ph: repeating-linear-gradient(45deg,#1F1D17,#1F1D17 5px,#2A2720 5px,#2A2720 10px);
}
:root[data-skin="wireframe"] img { filter: grayscale(1) contrast(.6); }
`;
}
