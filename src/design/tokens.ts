/**
 * D-01 — the single source of truth for every design value.
 * tokens.css is generated from this file (npm run tokens) and also injected at runtime by
 * ThemeProvider so the two can never drift. Nothing invents a value off this file.
 */

export const brand = {
  cream: '#F1E7D2',
  yellow: '#F7F3B2',
  deepBlue: '#35597D',
  midBlue: '#5F85B1',
  ink: '#1E2A38',
  sand: '#E6DAC0',
  white: '#FFFCF5',
} as const;

/** The four movements — used by class cards, week chips and the intention picker. */
export const movements = {
  enraiza: { label: 'Enraíza', fg: '#3A4C36', dot: '#5A7355', bg: 'rgba(90,115,85,.22)' },
  fluye: { label: 'Fluye', fg: '#2C4A6B', dot: '#5F85B1', bg: 'rgba(95,133,177,.22)' },
  arde: { label: 'Arde', fg: '#7A3F27', dot: '#C4704F', bg: 'rgba(196,112,79,.24)' },
  libera: { label: 'Libera', fg: '#5E5312', dot: '#D8C24A', bg: 'rgba(216,194,74,.30)' },
} as const;
export type Movement = keyof typeof movements;

export const semantic = {
  light: {
    'color-bg': brand.cream,
    'color-surface': brand.white,
    'color-surface-2': '#F8F2E4',
    'color-surface-3': brand.sand,
    'color-text': brand.ink,
    'color-text-muted': '#5C6675',
    'color-text-on-primary': brand.white,
    'color-primary': brand.deepBlue,
    'color-primary-hover': '#2B4A69',
    'color-accent': brand.midBlue,
    'color-highlight': brand.yellow,
    'color-border': 'rgba(53,89,125,.16)',
    'color-border-strong': 'rgba(53,89,125,.32)',
    'color-success': '#4F7D5A',
    'color-warn': '#B7842C',
    'color-danger': '#B24A3A',
    'color-focus': brand.midBlue,
    'shadow-highlight': 'inset 0 1px 0 rgba(255,255,255,.65)',
    'shadow-contact': '0 1px 2px rgba(30,42,56,.10)',
    'shadow-soft': '0 8px 24px rgba(53,89,125,.10)',
  },
  dark: {
    'color-bg': '#151B24',
    'color-surface': '#1E2733',
    'color-surface-2': '#26313F',
    'color-surface-3': '#2E3B4B',
    'color-text': '#F1E7D2',
    'color-text-muted': '#A9B4C2',
    'color-text-on-primary': '#0F1620',
    'color-primary': '#8FB0D6',
    'color-primary-hover': '#A7C3E3',
    'color-accent': brand.midBlue,
    'color-highlight': '#D8C24A',
    'color-border': 'rgba(241,231,210,.12)',
    'color-border-strong': 'rgba(241,231,210,.28)',
    'color-success': '#7FB08A',
    'color-warn': '#D8A94A',
    'color-danger': '#D97A6A',
    'color-focus': '#8FB0D6',
    'shadow-highlight': 'inset 0 1px 0 rgba(255,255,255,.06)',
    'shadow-contact': '0 1px 2px rgba(0,0,0,.35)',
    'shadow-soft': '0 8px 24px rgba(0,0,0,.35)',
  },
} as const;

export const type = {
  'font-heading': "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  'font-body': "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  'font-mono': "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
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

export const radii = { 'r-sm': '8px', 'r-md': '16px', 'r-lg': '24px', 'r-xl': '32px', 'r-full': '999px' } as const;

export const motion = {
  'dur-fast': '120ms', 'dur-base': '200ms', 'dur-slow': '360ms', 'dur-breath': '7s',
  'ease-out': 'cubic-bezier(.2,.7,.2,1)', 'ease-in-out': 'cubic-bezier(.65,0,.35,1)',
} as const;

export const layoutTokens = {
  'w-phone': '430px', 'w-content': '1120px', 'h-topbar': '56px', 'h-bottomnav': '64px', 'w-sidebar': '240px',
} as const;

export const tokens = { brand, movements, semantic, type, spacing, radii, motion, layout: layoutTokens };

function vars(obj: Record<string, string>): string {
  return Object.entries(obj).map(([k, v]) => `  --${k}: ${v};`).join('\n');
}

/** Builds the full tokens stylesheet. Themes via [data-theme], skins via [data-skin]. */
export function buildTokensCss(): string {
  const brandVars = vars(Object.fromEntries(Object.entries(brand).map(([k, v]) => [`brand-${k}`, v])));
  const mv = Object.entries(movements).flatMap(([k, m]) => [[`mv-${k}-fg`, m.fg], [`mv-${k}-dot`, m.dot], [`mv-${k}-bg`, m.bg]]);
  const shadowComposite = `  --shadow-card: var(--shadow-highlight), var(--shadow-contact), var(--shadow-soft);\n  --shadow-raised: var(--shadow-highlight), 0 2px 4px rgba(30,42,56,.12), 0 16px 40px rgba(53,89,125,.16);`;
  return `/* GENERATED from src/design/tokens.ts — do not edit by hand */
:root {
${brandVars}
${vars(Object.fromEntries(mv))}
${vars(type)}
${vars(spacing)}
${vars(radii)}
${vars(motion)}
${vars(layoutTokens)}
${vars(semantic.light)}
${shadowComposite}
  color-scheme: light;
}
:root[data-theme="dark"] {
${vars(semantic.dark)}
  color-scheme: dark;
}
:root[data-skin="wireframe"] {
  --color-bg: #FFFFFF;
  --color-surface: #FFFFFF;
  --color-surface-2: #F4F4F4;
  --color-surface-3: #E9E9E9;
  --color-text: #111111;
  --color-text-muted: #666666;
  --color-primary: #222222;
  --color-primary-hover: #000000;
  --color-accent: #444444;
  --color-highlight: #DDDDDD;
  --color-border: #BBBBBB;
  --color-border-strong: #888888;
  --color-text-on-primary: #FFFFFF;
  --shadow-highlight: none;
  --shadow-contact: none;
  --shadow-soft: none;
  --shadow-card: none;
  --shadow-raised: none;
  --font-heading: ui-monospace, Menlo, monospace;
  --font-body: ui-monospace, Menlo, monospace;
}
:root[data-skin="wireframe"] img { filter: grayscale(1) contrast(.6); }
`;
}
