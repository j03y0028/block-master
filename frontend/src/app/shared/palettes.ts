/**
 * Block Master color palettes ("Appearance" setting) and the WCAG contrast helpers that keep every palette and every
 * holiday accent readable. Pure TypeScript (no Angular) so it is unit-tested with `node --test`
 * (frontend/tests/palettes.test.mts).
 *
 * A palette sets the base surfaces, text and brand colors. A holiday theme layers its accent on top: the holiday's accent
 * is nudged lighter (dark palettes) or darker (light palettes) until it reaches 4.5:1 on that palette's surfaces.
 */

export type PaletteId = 'midnight' | 'aurora' | 'sunset' | 'desert' | 'ocean' | 'daylight';

export interface PaletteDef {
  id: PaletteId;
  name: string;
  /** One-line description for the picker. */
  description: string;
  scheme: 'dark' | 'light';
  /** Page background and the soft glow painted behind the page. */
  bg: string;
  glow: string;
  glow2: string;
  /** Header / footer bar. */
  nav: string;
  /** Cards, and the darker inset used for stat boxes and tables. */
  surface: string;
  inset: string;
  border: string;
  /** Body text and secondary ("muted") text; both must be >= 4.5:1 on bg, nav, surface and inset. */
  fg: string;
  muted: string;
  /** Links and highlighted numbers. */
  link: string;
  /** Button background; white button text must be >= 4.5:1 on it. */
  primary: string;
  /** Brand accent pair used when no holiday is active (the "Master" in the wordmark, highlights). */
  accent: string;
  accent2: string;
  /** Mined-block gradient in the block strip (white text sits on it). */
  blockA: string;
  blockB: string;
  /** Isometric faces drawn around each block in the strip. */
  blockTop: string;
  blockSide: string;
  /** Status colors used as text (fiat amounts, up/down arrows, warnings). */
  green: string;
  red: string;
  yellow: string;
  orange: string;
  /** Swatch gradient shown in the picker. */
  swatch: [string, string, string];
}

export const PALETTES: PaletteDef[] = [
  {
    id: 'midnight', name: 'Midnight', description: 'Deep indigo night with bitcoin-orange highlights (default).', scheme: 'dark',
    bg: '#0d0f1e', glow: '#2b2470', glow2: '#3b1f4f', nav: '#0a0c18', surface: '#161a2f', inset: '#10132a', border: '#262b4a',
    fg: '#eef0fb', muted: '#aab0cf', link: '#8fb5ff', primary: '#5146d8', accent: '#f7931a', accent2: '#ffd35c',
    blockA: '#7b3ff2', blockB: '#2f5fd0', blockTop: '#272c47', blockSide: '#1a1e33',
    green: '#7ee787', red: '#ff7b72', yellow: '#f2cc60', orange: '#ffa657',
    swatch: ['#0d0f1e', '#5146d8', '#f7931a'],
  },
  {
    id: 'aurora', name: 'Aurora', description: 'Northern lights: teal and violet over a polar night.', scheme: 'dark',
    bg: '#071417', glow: '#0d4a4a', glow2: '#35226b', nav: '#051012', surface: '#0e2226', inset: '#0a1a1e', border: '#1b3a40',
    fg: '#e7fbf8', muted: '#9ecbc5', link: '#5eead4', primary: '#0f766e', accent: '#2dd4bf', accent2: '#b69cff',
    blockA: '#7c4dde', blockB: '#0b7a72', blockTop: '#173a3f', blockSide: '#0f2a2e',
    green: '#6ee7b7', red: '#fda4af', yellow: '#fde68a', orange: '#fdba74',
    swatch: ['#071417', '#2dd4bf', '#b69cff'],
  },
  {
    id: 'sunset', name: 'Sunset', description: 'Coral and amber over a warm dusk.', scheme: 'dark',
    bg: '#180d14', glow: '#5a1d2e', glow2: '#5a3412', nav: '#130a10', surface: '#24141d', inset: '#1d1018', border: '#3d2230',
    fg: '#fff1ec', muted: '#dcb5aa', link: '#ffb38a', primary: '#b43a1c', accent: '#ff7d8e', accent2: '#fbbf24',
    blockA: '#c03a5b', blockB: '#b4531c', blockTop: '#3a2230', blockSide: '#2a1822',
    green: '#86efac', red: '#fda4af', yellow: '#fcd34d', orange: '#fdba74',
    swatch: ['#180d14', '#ff7d8e', '#fbbf24'],
  },
  {
    id: 'desert', name: 'Desert', description: 'Sonoran evening: warm sand, terracotta and sage.', scheme: 'dark',
    bg: '#1a1511', glow: '#4d2d1a', glow2: '#2f3a2a', nav: '#15110d', surface: '#261f19', inset: '#201a15', border: '#3f3328',
    fg: '#fbf3e6', muted: '#d6c4aa', link: '#f2bb6b', primary: '#9c4a1e', accent: '#e8875a', accent2: '#e9c46a',
    blockA: '#a6522a', blockB: '#5f6e43', blockTop: '#3b3028', blockSide: '#2c241d',
    green: '#b5d99c', red: '#f4a08e', yellow: '#ecd089', orange: '#f2b47e',
    swatch: ['#1a1511', '#e8875a', '#a7c08f'],
  },
  {
    id: 'ocean', name: 'Ocean', description: 'Deep sea blues with seafoam highlights.', scheme: 'dark',
    bg: '#06121d', glow: '#0b3a5e', glow2: '#0b4a46', nav: '#040e17', surface: '#0c1f31', inset: '#091828', border: '#173450',
    fg: '#e6f4ff', muted: '#9ebcd8', link: '#7cc4ff', primary: '#1a68ad', accent: '#38bdf8', accent2: '#34d399',
    blockA: '#1b6db5', blockB: '#0b7566', blockTop: '#16324c', blockSide: '#0f2438',
    green: '#6ee7b7', red: '#fca5a5', yellow: '#fde68a', orange: '#fdba74',
    swatch: ['#06121d', '#38bdf8', '#34d399'],
  },
  {
    id: 'daylight', name: 'Daylight', description: 'Light and airy, for bright rooms.', scheme: 'light',
    bg: '#f4f5fa', glow: '#dfe3ff', glow2: '#ffe7d1', nav: '#ffffff', surface: '#ffffff', inset: '#eef0f7', border: '#dde1ee',
    fg: '#14182b', muted: '#4c5370', link: '#3443c4', primary: '#4338ca', accent: '#c2410c', accent2: '#b45309',
    blockA: '#6d3fe0', blockB: '#2d5bc7', blockTop: '#cfd4e6', blockSide: '#b9bfd6',
    green: '#11733a', red: '#b42318', yellow: '#7a5d00', orange: '#a64700',
    swatch: ['#f4f5fa', '#4338ca', '#c2410c'],
  },
];

export const DEFAULT_PALETTE_ID: PaletteId = 'midnight';

export function getPalette(id: string | null | undefined): PaletteDef {
  return PALETTES.find((p) => p.id === id) || PALETTES[0];
}

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && PALETTES.some((p) => p.id === value);
}

// ---------- color math (sRGB, WCAG 2.x) ----------

export type RGB = [number, number, number];

export function parseHex(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
}

export function toHex(rgb: RGB): string {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
}

/**
 * Returns `color` unchanged if it already reaches `ratio` against every background, otherwise the smallest step
 * toward white (dark scheme) or black (light scheme) that does. Keeps the hue recognizable.
 */
export function ensureContrast(color: string, backgrounds: string[], scheme: 'dark' | 'light', ratio = 4.5): string {
  const target = scheme === 'dark' ? '#ffffff' : '#000000';
  for (let step = 0; step <= 40; step++) {
    const candidate = mix(color, target, step / 40);
    if (backgrounds.every((bg) => contrast(candidate, bg) >= ratio)) {
      return candidate;
    }
  }
  return target;
}

/**
 * Fee-level colors (hex without '#', as mempool stores them) darkened just enough that white text on them is >= 4.5:1.
 * Used for the projected blocks and fee bars, which carry white labels.
 */
export function readableFeeColors(colors: string[]): string[] {
  return colors.map((c) => ensureContrast('#' + c, ['#ffffff'], 'light', 4.5).slice(1));
}

/** Backgrounds that accent / text colors are drawn on (incl. the page glows, worst case). */
export function textBackgrounds(p: PaletteDef): string[] {
  return [p.bg, p.nav, p.surface, p.inset, p.glow, p.glow2];
}

/** The accent pair actually used: the holiday's (if any) or the palette's own, made readable on this palette. */
export function layeredAccents(p: PaletteDef, holiday?: { accent: string; accent2: string } | null): { accent: string; accent2: string } {
  const base = holiday || { accent: p.accent, accent2: p.accent2 };
  const bgs = textBackgrounds(p);
  return {
    accent: ensureContrast(base.accent, bgs, p.scheme, 4.5),
    accent2: ensureContrast(base.accent2, bgs, p.scheme, 4.5),
  };
}

/** Text color (near-white or near-black) with the better contrast on the given background. */
export function onColor(bg: string): string {
  return contrast('#ffffff', bg) >= contrast('#0b0d19', bg) ? '#ffffff' : '#0b0d19';
}

const rgbList = (hex: string): string => parseHex(hex).join(', ');

/** CSS custom properties for a palette (mempool's own variables, Bootstrap's, and Block Master's --bm-*). */
export function paletteVars(p: PaletteDef, holiday?: { accent: string; accent2: string } | null): Record<string, string> {
  const { accent, accent2 } = layeredAccents(p, holiday);
  const dark = p.scheme === 'dark';
  const hover = mix(p.surface, p.fg, dark ? 0.06 : 0.04);
  return {
    // mempool variables
    // mempool paints the page with --active-bg and cards with --bg
    '--bg': p.surface,
    '--active-bg': p.bg,
    '--hover-bg': hover,
    '--fg': p.fg,
    '--nav-bg': p.nav,
    '--navbar-bg': p.nav,
    '--title-fg': p.link,
    '--primary': p.blockB,
    '--secondary': p.inset,
    '--tertiary': p.primary,
    '--info': p.link,
    '--link-color': p.link,
    '--link-hover-color': mix(p.link, p.fg, 0.35),
    '--icon': p.fg,
    '--box-bg': p.surface,
    '--stat-box-bg': p.inset,
    '--alert-bg': mix(p.surface, p.primary, 0.35),
    '--transparent-fg': p.muted,
    '--fade-out-box-bg-start': `rgba(${rgbList(p.surface)}, 0)`,
    '--fade-out-box-bg-end': `rgba(${rgbList(p.surface)}, 1)`,
    '--skeleton-bg': mix(p.surface, p.fg, 0.1),
    '--skeleton-bg-light': mix(p.surface, p.fg, 0.25),
    '--mainnet-alt': p.blockA,
    '--green': p.green,
    '--red': p.red,
    '--yellow': p.yellow,
    '--orange': p.orange,
    '--grey': p.muted,
    '--opacity': '1',
    '--tooltip-grey': p.muted,
    '--search-button': p.primary,
    '--search-button-border': p.primary,
    '--search-button-focus': mix(p.primary, p.fg, 0.15),
    '--search-button-shadow': `rgba(${rgbList(p.primary)}, 0.45)`,
    // Bootstrap 5 runtime variables
    // Bootstrap uses body-bg for tables, dropdowns, modals and inputs, which all sit on cards
    '--bs-body-bg': p.surface,
    '--bs-body-bg-rgb': rgbList(p.surface),
    '--bs-body-color': p.fg,
    '--bs-body-color-rgb': rgbList(p.fg),
    '--bs-emphasis-color': p.fg,
    '--bs-heading-color': p.fg,
    '--bs-secondary-color': p.muted,
    '--bs-tertiary-bg': p.inset,
    '--bs-secondary-bg': p.surface,
    '--bs-border-color': p.border,
    '--bs-link-color': p.link,
    '--bs-link-color-rgb': rgbList(p.link),
    '--bs-link-hover-color': mix(p.link, p.fg, 0.35),
    '--bs-primary': p.primary,
    '--bs-primary-rgb': rgbList(p.primary),
    // Block Master design tokens
    '--bm-bg': p.bg,
    '--bm-glow': p.glow,
    '--bm-glow-2': p.glow2,
    '--bm-surface': p.surface,
    '--bm-inset': p.inset,
    '--bm-border': p.border,
    '--bm-fg': p.fg,
    '--bm-muted': p.muted,
    '--bm-link': p.link,
    '--bm-primary': p.primary,
    '--bm-accent': accent,
    '--bm-on-accent': onColor(accent),
    '--bm-accent-2': accent2,
    '--bm-block-top': p.blockTop,
    '--bm-block-side': p.blockSide,
    '--bm-pblock-top': dark ? mix(p.blockTop, '#6b5a4a', 0.45) : '#d9d3c9',
    '--bm-pblock-side': dark ? mix(p.blockSide, '#4a3d33', 0.45) : '#c3bbae',
    '--bm-block-empty': dark ? mix(p.blockTop, '#ffffff', 0.14) : '#5d6380',
    '--bm-shadow': dark ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.65)'
      : '0 1px 2px rgba(20,24,43,0.06), 0 8px 24px -12px rgba(20,24,43,0.18)',
    '--bm-scheme': p.scheme,
  };
}
