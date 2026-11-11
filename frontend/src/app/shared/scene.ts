// Block Master 3.0: pure math and art-direction data for the live chain sculpture (no Angular, no DOM),
// so it can be unit tested with node --test.
import type { HolidayId } from './holidays';

export type AmbientKind = 'dust' | 'stars' | 'snow' | 'embers' | 'sparks' | 'leaves' | 'petals' | 'confetti' | 'bats';

/** How a holiday dresses the scene: ambient particles, sky tint and set pieces. Colors are decorative (no text on them). */
export interface SceneAccent {
  ambient: AmbientKind;
  /** ambient particles per 1000 px of scene width */
  density: number;
  colors: string[];
  /** rgba tint washed over the top and bottom of the sky */
  sky: [string, string];
  fireworks?: boolean;
  beams?: boolean;
  moon?: boolean;
  sunrise?: boolean;
  /** string lights hung along the chain links */
  lights?: string[];
  /** a short line for the figure caption */
  caption: string;
}

export const SCENE_DEFAULT: SceneAccent = {
  ambient: 'dust', density: 34, colors: ['#ffffff'], sky: ['rgba(255,255,255,0)', 'rgba(255,255,255,0)'],
  caption: 'Sealed blocks recede into the past; the glass vial fills with fees still waiting.',
};

export const SCENE_ACCENTS: Record<HolidayId, SceneAccent> = {
  'new-years': {
    ambient: 'confetti', density: 46, colors: ['#f5c955', '#c9d2f2', '#ff8fb1', '#7ee0ff'], sky: ['rgba(60,50,140,0.25)', 'rgba(245,201,85,0.06)'],
    fireworks: true, caption: 'Fireworks over the chain: a new year of blocks begins.',
  },
  mlk: {
    ambient: 'dust', density: 30, colors: ['#ffe2a1', '#f0b94a'], sky: ['rgba(124,92,224,0.18)', 'rgba(240,185,74,0.18)'],
    sunrise: true, caption: 'A sunrise behind the chain, for Martin Luther King Jr. Day.',
  },
  presidents: {
    ambient: 'stars', density: 30, colors: ['#ffffff', '#c7d4ff', '#ff9aa0'], sky: ['rgba(39,71,168,0.22)', 'rgba(192,38,45,0.08)'],
    caption: 'Stars over the chain for Presidents\u2019 Day.',
  },
  memorial: {
    ambient: 'petals', density: 18, colors: ['#e0342b', '#ff5a4e', '#b81d1d'], sky: ['rgba(43,58,103,0.25)', 'rgba(0,0,0,0)'],
    beams: true, caption: 'Poppy petals drift past the chain on Memorial Day.',
  },
  juneteenth: {
    ambient: 'stars', density: 34, colors: ['#ffffff', '#ff6b6b', '#7f9cf0'], sky: ['rgba(44,90,214,0.22)', 'rgba(215,50,50,0.12)'],
    fireworks: true, caption: 'Burst stars light the chain for Juneteenth.',
  },
  independence: {
    ambient: 'stars', density: 26, colors: ['#ffffff', '#ff6b6b', '#7aa2ff'], sky: ['rgba(36,69,168,0.25)', 'rgba(212,42,42,0.08)'],
    fireworks: true, caption: 'Fireworks over the chain for Independence Day.',
  },
  labor: {
    ambient: 'sparks', density: 30, colors: ['#ffd36b', '#f0b414', '#ff9b3d'], sky: ['rgba(31,127,192,0.18)', 'rgba(240,180,20,0.10)'],
    caption: 'Sparks rise from the workshop floor on Labor Day.',
  },
  halloween: {
    ambient: 'bats', density: 6, colors: ['#1b1029', '#b28cff'], sky: ['rgba(109,63,214,0.22)', 'rgba(244,122,31,0.16)'],
    moon: true, caption: 'A harvest moon and a few bats over the chain.',
  },
  veterans: {
    ambient: 'stars', density: 28, colors: ['#ffffff', '#f5d27a', '#8fa3dc'], sky: ['rgba(36,55,110,0.28)', 'rgba(95,107,60,0.12)'],
    beams: true, caption: 'Searchlights and stars over the chain, in honor of all who served.',
  },
  thanksgiving: {
    ambient: 'leaves', density: 22, colors: ['#f59e0b', '#c2410c', '#d9b44a', '#9b2c1b'], sky: ['rgba(196,97,42,0.18)', 'rgba(246,196,110,0.08)'],
    caption: 'Autumn leaves drift across the chain at Thanksgiving.',
  },
  christmas: {
    ambient: 'snow', density: 60, colors: ['#ffffff', '#dff1ff'], sky: ['rgba(22,119,74,0.18)', 'rgba(226,59,59,0.08)'],
    lights: ['#ff5a5a', '#ffd35c', '#5ee38c', '#7cc0e8'], caption: 'Snow falls on the chain, strung with lights.',
  },
};

export function sceneAccentFor(id: HolidayId | null | undefined): SceneAccent {
  return (id && SCENE_ACCENTS[id]) || SCENE_DEFAULT;
}

export interface Slot {
  x: number;
  y: number;
  scale: number;
  alpha: number;
}

/** Vanishing point and the newest block's position, as fractions of the scene size. */
export const STAGE = { vx: -0.32, vy: 0.36, x0: 0.57, y0: 0.76, vial: 0.85, depth: 0.22 };

/**
 * Where block `i` (0 = newest, fractional allowed) sits: blocks recede toward a vanishing point at the upper left,
 * shrinking and fading with age.
 */
export function slotAt(i: number, width: number, height: number, compact = false): Slot {
  const vx = STAGE.vx * width;
  const vy = STAGE.vy * height;
  const x0 = (compact ? 0.5 : STAGE.x0) * width;
  const y0 = STAGE.y0 * height;
  const scale = 1 / (1 + STAGE.depth * Math.max(i, 0));
  return {
    x: vx + (x0 - vx) * scale,
    y: vy + (y0 - vy) * scale,
    scale,
    alpha: Math.max(0.18, Math.min(1, 0.25 + scale * 0.85)),
  };
}

export function chainLayout(count: number, width: number, height: number, compact = false): Slot[] {
  return Array.from({ length: count }, (_, i) => slotAt(i, width, height, compact));
}

/** How many fee drops may be alive at once. */
export function particleBudget(width: number, reducedMotion: boolean): number {
  if (reducedMotion) {
    return 14;
  }
  return Math.round(Math.min(160, Math.max(40, width / 7)));
}

/** Fee drops spawned per second from the live incoming rate (vB/s); upstream's chart line sits near 1,667 vB/s. */
export function spawnRate(vbytesPerSecond: number | null | undefined): number {
  if (!vbytesPerSecond || vbytesPerSecond <= 0) {
    return 6;
  }
  return Math.min(48, Math.max(3, vbytesPerSecond / 120));
}

/** Index into the fee color scale for a fee rate, using upstream's fee levels. */
export function feeLevelIndex(rate: number, levels: number[]): number {
  let idx = 0;
  for (let i = 0; i < levels.length; i++) {
    if (rate >= levels[i]) {
      idx = i;
    }
  }
  return idx;
}

/** A new chain tip worth celebrating: strictly higher than the one we already showed (not the first load). */
export function isNewTip(previous: number | null | undefined, next: number | null | undefined): boolean {
  return previous != null && next != null && next > previous;
}

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
export const easeInOutSine = (t: number): number => (1 - Math.cos(Math.PI * Math.min(Math.max(t, 0), 1))) / 2;

/** Tiny deterministic PRNG, so the static (reduced-motion) frame is the same every time. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Format a block height the editorial way: 975,390. */
export const formatHeight = (h: number): string => h.toLocaleString('en-US');
