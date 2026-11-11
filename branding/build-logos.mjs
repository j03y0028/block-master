#!/usr/bin/env node
// Block Master logo system, v3 ("Crowned Hex Gem", Block Master 2.0).
// Writes the default mark and one variant per U.S. holiday as SVG into frontend/src/resources/block-master/, plus the
// wordmark. Original artwork released with the rest of this repository under AGPL-3.0.
//
// Design: the same elongated flat-top hexagon the app uses for its blocks, cut like a gem: six bevel facets shaded
// from a top-left light, hairline negative-space seams, and a flat "table" in the middle that carries one restrained
// holiday motif. A floating geometric crown (negative-space band and jewels) sits above it; open corners can hold a
// second motif. No outlines, no clip art: flat planes, gradients and gaps.
// Run: node branding/build-logos.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'frontend/src/resources/block-master');
const f = (n) => Number(n.toFixed(2));

// ---------- geometry (128 x 128) ----------
// Gem: elongated flat-top hexagon (same proportions as the blocks in the app: top edge spans 12%..88% of the width).
const CX = 64;
const CY = 87;
const HW = 48; // half width (side points)
const HH = 35; // half height
const hexPts = (s) => [
  [CX - HW * 0.76 * s, CY - HH * s], [CX + HW * 0.76 * s, CY - HH * s], [CX + HW * s, CY],
  [CX + HW * 0.76 * s, CY + HH * s], [CX - HW * 0.76 * s, CY + HH * s], [CX - HW * s, CY],
].map(([x, y]) => [f(x), f(y)]);
const OUTER = hexPts(1);
const TABLE_SCALE = 0.58;
const INNER = hexPts(TABLE_SCALE);
const poly = (pts) => 'M' + pts.map(([x, y]) => `${x},${y}`).join(' L') + ' Z';
const GEM = poly(OUTER);
const TABLE = poly(INNER);
// facets between the outer edge i..i+1 and the inner edge: 0 top, 1 upper right, 2 lower right, 3 bottom, 4 lower left, 5 upper left
const facet = (i) => poly([OUTER[i], OUTER[(i + 1) % 6], INNER[(i + 1) % 6], INNER[i]]);
const SEAMS = OUTER.map((o, i) => `M${o[0]},${o[1]} L${INNER[i][0]},${INNER[i][1]}`).join(' ') + ' ' + TABLE;
// table coordinate system: draw in a 100 x 73 box (the table hexagon is (12,0) (88,0) (100,36.5) (88,73) (12,73) (0,36.5))
const TW = INNER[2][0] - INNER[5][0];
const ON_TABLE = `matrix(${f(TW / 100)} 0 0 ${f(TW / 100)} ${INNER[5][0]} ${INNER[0][1]})`;
const CROWN = 'M42,47 L37,21 L52,33 L64,9 L76,33 L91,21 L86,47 Z';

function star(cx, cy, r, points = 5, inner = 0.42, rot = -90) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = ((rot + (i * 180) / points) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`);
  }
  return pts.join(' ');
}
const sparkle = (cx, cy, r, fill, o = 1) =>
  `<path d="M${cx},${f(cy - r)} C${f(cx + r * 0.12)},${f(cy - r * 0.12)} ${f(cx + r * 0.12)},${f(cy - r * 0.12)} ${f(cx + r)},${cy} C${f(cx + r * 0.12)},${f(cy + r * 0.12)} ${f(cx + r * 0.12)},${f(cy + r * 0.12)} ${cx},${f(cy + r)} C${f(cx - r * 0.12)},${f(cy + r * 0.12)} ${f(cx - r * 0.12)},${f(cy + r * 0.12)} ${f(cx - r)},${cy} C${f(cx - r * 0.12)},${f(cy - r * 0.12)} ${f(cx - r * 0.12)},${f(cy - r * 0.12)} ${cx},${f(cy - r)} Z" fill="${fill}" opacity="${o}"/>`;
const burst = (cx, cy, r, color, n = 12) => {
  let s = `<g stroke="${color}" stroke-linecap="round">`;
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    const r0 = i % 2 ? r * 0.45 : r * 0.3;
    const r1 = i % 2 ? r * 0.8 : r;
    s += `<line x1="${f(cx + r0 * Math.cos(a))}" y1="${f(cy + r0 * Math.sin(a))}" x2="${f(cx + r1 * Math.cos(a))}" y2="${f(cy + r1 * Math.sin(a))}" stroke-width="${i % 2 ? 1.2 : 1.8}"/>`;
  }
  return s + `</g><circle cx="${cx}" cy="${cy}" r="1.6" fill="${color}"/>`;
};
const snowflake = (cx, cy, r, color) => {
  let s = `<g stroke="${color}" stroke-width="1.3" stroke-linecap="round" fill="none">`;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = (t) => f(cx + t * Math.cos(a));
    const y = (t) => f(cy + t * Math.sin(a));
    const tick = (t, side) => {
      const b = a + side * 0.7;
      return `M${x(t)},${y(t)} L${f(cx + t * Math.cos(a) + r * 0.28 * Math.cos(b))},${f(cy + t * Math.sin(a) + r * 0.28 * Math.sin(b))}`;
    };
    s += `<path d="M${cx},${cy} L${x(r)},${y(r)} ${tick(r * 0.55, 1)} ${tick(r * 0.55, -1)}"/>`;
  }
  return s + '</g>';
};
const leaf = (cx, cy, s, rot, c1, c2, id) =>
  `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})"><path d="M0,-11 C7,-6 8,3 0,11 C-8,3 -7,-6 0,-11 Z" fill="url(#${id})"/><path d="M0,-7 L0,13" stroke="${c2}" stroke-width="1.1" stroke-linecap="round" opacity="0.9"/></g>`;
const gearPath = (cx, cy, r, teeth = 10) => {
  const pts = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i * Math.PI * 2) / (teeth * 4) - Math.PI / 2;
    const rr = i % 4 < 2 ? r : r * 0.78;
    pts.push(`${f(cx + rr * Math.cos(a))},${f(cy + rr * Math.sin(a))}`);
  }
  return `M${pts.join(' L')} Z`;
};

// ---------- variants ----------
// faces: [light, dark] gradient stops for top / left / right; crown: [light, dark]; jewel; motif hooks:
//   back(): behind the mark, face(): drawn over the faces, cut(): black shapes added to the faces' mask (negative space),
//   front(): over everything.
const V = {
  default: {
    name: 'Block Master',
    top: ['#ffcf70', '#ffa43a'], left: ['#f7931a', '#d9700a'], right: ['#c25f06', '#8f3f02'],
    crown: ['#fff0b8', '#f5b829'], jewel: '#fff6d6',
  },
  'new-years': {
    name: "New Year's Day",
    top: ['#5a5f86', '#3a3e63'], left: ['#2a2e52', '#1b1e3a'], right: ['#1c1f3b', '#111327'],
    crown: ['#fff3c2', '#e9b949'], jewel: '#f8fafc',
    back: () => sparkle(17, 30, 10, '#f5c955') + sparkle(111, 38, 7, '#9aa8d6') + sparkle(110, 98, 8, '#f5c955', 0.9) +
      sparkle(18, 94, 5, '#9aa8d6', 0.9) + `<circle cx="104" cy="16" r="1.8" fill="#f5c955"/><circle cx="26" cy="56" r="1.5" fill="#9aa8d6"/>`,
    table: () => `<g transform="${ON_TABLE}">${sparkle(50, 36.5, 24, '#f5c955')}${sparkle(80, 16, 7, '#c9d2f2', 0.9)}${sparkle(20, 58, 6, '#c9d2f2', 0.9)}</g>`,
  },
  mlk: {
    name: 'Martin Luther King Jr. Day',
    top: ['#a78bfa', '#7c5ce0'], left: ['#5b3fc4', '#3f2a92'], right: ['#3a2780', '#24185a'],
    crown: ['#fde9a8', '#e8b13a'], jewel: '#fff7dd',
    table: () => `<g transform="${ON_TABLE}"><circle cx="50" cy="73" r="21" fill="#f0b94a"/>${[-60, -30, 0, 30, 60].map((a) => {
      const r = (a - 90) * Math.PI / 180;
      return `<line x1="${f(50 + 27 * Math.cos(r))}" y1="${f(73 + 27 * Math.sin(r))}" x2="${f(50 + 40 * Math.cos(r))}" y2="${f(73 + 40 * Math.sin(r))}" stroke="#f0b94a" stroke-width="4.5" stroke-linecap="round"/>`;
    }).join('')}</g>`,
    back: () => [44, 52, 60].map((r, i) => {
      const a0 = (200 * Math.PI) / 180;
      const a1 = (340 * Math.PI) / 180;
      return `<path d="M${f(64 + r * Math.cos(a0))},${f(78 + r * Math.sin(a0))} A${r},${r} 0 0 1 ${f(64 + r * Math.cos(a1))},${f(78 + r * Math.sin(a1))}" fill="none" stroke="#f0b94a" stroke-width="${2.2 - i * 0.5}" stroke-linecap="round" opacity="${0.85 - i * 0.25}"/>`;
    }).join(''),
  },
  presidents: {
    name: "Presidents' Day",
    top: ['#f8fafc', '#d5dceb'], left: ['#2747a8', '#1a2f74'], right: ['#c0262d', '#8a161c'],
    crown: ['#fde68a', '#d9a521'], jewel: '#ffffff',
    table: () => `<g transform="${ON_TABLE}">${[[28, 36.5, 13], [50, 34, 16], [72, 36.5, 13]].map(([x, y, r]) => `<polygon points="${star(x, y, r)}" fill="#ffffff"/>`).join('')}<rect x="0" y="58" width="100" height="5" fill="#c0262d"/></g>`,
  },
  memorial: {
    name: 'Memorial Day',
    top: ['#dbe3ef', '#aab6c9'], left: ['#2b3a67', '#1b2546'], right: ['#3b4558', '#252c3a'],
    crown: ['#f1d98a', '#c79a2e'], jewel: '#f8fafc',
    front: () => `<g transform="translate(107 99)">
      <path d="M-2,9 C0,15 -2,20 -7,24" stroke="#3f7d4e" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-6.4" rx="5.6" ry="7" fill="url(#poppy)" transform="rotate(${a})"/>`).join('')}
      <circle r="3.4" fill="#1a1c22"/></g>`,
    table: () => `<g transform="${ON_TABLE}"><polygon points="${star(50, 38, 26)}" fill="#ffffff" opacity="0.94"/></g>`,
    defs: () => `<linearGradient id="poppy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a4e"/><stop offset="1" stop-color="#c81e1e"/></linearGradient>`,
  },
  juneteenth: {
    name: 'Juneteenth',
    top: ['#4f7ff0', '#2c5ad6'], left: ['#d73232', '#a31d1d'], right: ['#a31d1d', '#701313'],
    crown: ['#fff1c1', '#e7b53b'], jewel: '#ffffff',
    table: () => `<g transform="${ON_TABLE}"><rect x="0" y="0" width="100" height="36.5" fill="#2c5ad6"/><path d="M0,36.5 Q50,26 100,36.5" fill="#2c5ad6"/><polygon points="${star(50, 36.5, 30, 12, 0.62)}" fill="none" stroke="#ffffff" stroke-width="3.4"/><polygon points="${star(50, 36.5, 15)}" fill="#ffffff"/></g>`,
    back: () => `<path d="M8,98 Q30,84 22,62" fill="none" stroke="#7f9cf0" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>` + sparkle(110, 32, 6, '#7f9cf0'),
  },
  independence: {
    name: 'Independence Day',
    top: ['#3f63d8', '#2445a8'], left: ['#ffffff', '#e7ecf5'], right: ['#2445a8', '#172e75'],
    crown: ['#fff1c1', '#e7b53b'], jewel: '#ffffff',
    table: () => `<g transform="${ON_TABLE}">${[0, 2, 4, 6].map((i) => `<rect x="0" y="${f(i * 10.43)}" width="100" height="10.43" fill="#d42a2a"/>`).join('')}
      <rect x="0" y="0" width="46" height="41.7" fill="#2445a8"/>${[[14, 11], [32, 11], [23, 21], [14, 31], [32, 31]].map(([x, y]) => `<polygon points="${star(x, y, 6)}" fill="#ffffff"/>`).join('')}</g>`,
    back: () => burst(17, 30, 13, '#ff6b6b') + burst(112, 30, 11, '#7aa2ff') + burst(110, 96, 8, '#f5c955', 10),
  },
  labor: {
    name: 'Labor Day',
    top: ['#9fd8f7', '#5fb2e3'], left: ['#1f7fc0', '#155b8d'], right: ['#14507a', '#0c3452'],
    crown: ['#ffe48a', '#f0b414'], jewel: '#ffffff',
    back: () => `<path d="${gearPath(104, 96, 14)}" fill="none" stroke="#f0b414" stroke-width="2" stroke-linejoin="round"/><circle cx="104" cy="96" r="5" fill="none" stroke="#f0b414" stroke-width="2"/>`,
    cut: () => `<g transform="${ON_TABLE}"><path d="${gearPath(50, 36.5, 27, 8)}" fill="black"/></g>`,
    table: () => `<g transform="${ON_TABLE}"><circle cx="50" cy="36.5" r="8.5" fill="#f0b414"/></g>`,
  },
  halloween: {
    name: 'Halloween',
    top: ['#ffb066', '#f68a2e'], left: ['#f47a1f', '#c95a0c'], right: ['#b8500b', '#7f3405'],
    crown: ['#b28cff', '#6d3fd6'], jewel: '#c4f06a',
    cut: () => `<g transform="${ON_TABLE}"><polygon points="22,30 42,30 32,10" fill="black"/><polygon points="58,30 78,30 68,10" fill="black"/>
      <path d="M16,42 L28,51 L39,42 L50,51 L61,42 L72,51 L84,42 L78,62 L22,62 Z" fill="black"/></g>`,
    back: () => `<mask id="moon"><rect width="128" height="128" fill="white"/><circle cx="114" cy="22" r="10" fill="black"/></mask>
      <circle cx="106" cy="26" r="11" fill="#c4a8ff" mask="url(#moon)"/>
      <path d="M12,40 L18,36 L21,39 L24,36 L30,40 L25,40 L21,44 L17,40 Z" fill="#b28cff"/>`,
  },
  veterans: {
    name: 'Veterans Day',
    top: ['#5b74b8', '#3a5394'], left: ['#24376e', '#17254d'], right: ['#5f6b3c', '#414a27'],
    crown: ['#fff1c1', '#e2ad35'], jewel: '#ffffff',
    table: () => `<g transform="${ON_TABLE}"><circle cx="34" cy="36.5" r="23" fill="#ffffff"/><polygon points="${star(34, 37.5, 19)}" fill="#24376e"/>
      <g fill="none" stroke="#f5d27a" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"><path d="M64,22 L76,32 L88,22"/><path d="M64,38 L76,48 L88,38"/></g></g>`,
    back: () => `<g opacity="0.95">${[[16, 30], [112, 30]].map(([x, y]) => `<polygon points="${star(x, y, 6)}" fill="#8fa3dc"/>`).join('')}</g>`,
  },
  thanksgiving: {
    name: 'Thanksgiving',
    top: ['#f6c46e', '#e79a3a'], left: ['#c4612a', '#96441a'], right: ['#8a3a17', '#5e260e'],
    crown: ['#fff0c0', '#e5a92d'], jewel: '#fff7e0',
    defs: () => `<linearGradient id="lf1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#c2410c"/></linearGradient>
      <linearGradient id="lf2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e86a3c"/><stop offset="1" stop-color="#9b2c1b"/></linearGradient>
      <linearGradient id="lf3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9b44a"/><stop offset="1" stop-color="#8a6a17"/></linearGradient>`,
    table: () => `<g transform="${ON_TABLE}">${leaf(50, 38, 2.6, 20, null, '#7a2e0e', 'lf3')}</g>`,
    back: () => leaf(18, 34, 1.05, -30, null, '#7a2e0e', 'lf2') + leaf(110, 30, 0.85, 35, null, '#7a3e0e', 'lf1') + leaf(108, 98, 0.95, 120, null, '#5f4a0f', 'lf3') +
      leaf(20, 96, 0.7, -110, null, '#7a3e0e', 'lf1'),
  },
  christmas: {
    name: 'Christmas',
    top: ['#2fae6a', '#1a8a4e'], left: ['#16774a', '#0e5434'], right: ['#0e5434', '#083a23'],
    crown: ['#fff1c1', '#e2ad35'], jewel: '#ffffff',
    facets: () => `<rect x="57" y="40" width="14" height="90" fill="#c92a2a"/>`,
    table: () => `<g transform="${ON_TABLE}" fill="#e23b3b"><rect x="40" y="0" width="20" height="73"/><rect x="0" y="27.5" width="100" height="18"/></g>`,
    back: () => snowflake(17, 32, 9, '#7cc0e8') + snowflake(111, 36, 7, '#7cc0e8') + snowflake(110, 98, 6, '#7cc0e8') +
      `<circle cx="22" cy="92" r="1.6" fill="#7cc0e8"/><circle cx="102" cy="16" r="1.4" fill="#7cc0e8"/>`,
  },
};
export const VARIANTS = Object.keys(V);

function grad(id, [a, b], x2 = 0, y2 = 1) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
}

// facet index -> [gradient, overlay color, overlay opacity] (light comes from the top left)
const FACETS = [
  [0, 'top', '#ffffff', 0.16],
  [5, 'top', '#ffffff', 0.04],
  [1, 'left', '#ffffff', 0.1],
  [4, 'left', '#000000', 0.04],
  [2, 'right', '#000000', 0],
  [3, 'right', '#000000', 0.2],
];

/** The mark only (no text). `prefix` keeps ids unique when several logos are inlined in one page. */
export function markSvgBody(id, prefix = id) {
  const v = V[id];
  const p = (s) => `${prefix}-${s}`;
  const sub = (s) => (s || '').replace(/id="([^"]+)"/g, (_, x) => `id="${p(x)}"`).replace(/url\(#([^)]+)\)/g, (_, x) => `url(#${p(x)})`);
  return `<defs>
    ${grad(p('top'), v.top, 1, 1)}${grad(p('left'), v.left, 1, 1)}${grad(p('right'), v.right, 0, 1)}${grad(p('crown'), v.crown)}
    ${grad(p('table'), v.tableFill || [v.left[0], v.left[1]], 1, 1)}
    <linearGradient id="${p('sheen')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <clipPath id="${p('tablec')}"><path d="${TABLE}"/></clipPath>
    <clipPath id="${p('gemc')}"><path d="${GEM}"/></clipPath>
    <mask id="${p('gem')}" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">
      <rect width="128" height="128" fill="white"/>
      <path d="${SEAMS}" stroke="black" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <g clip-path="url(#${p('tablec')})">${v.cut ? v.cut() : ''}</g>
    </mask>
    <mask id="${p('crownm')}" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">
      <rect width="128" height="128" fill="white"/>
      <path d="M38,40 L90,40" stroke="black" stroke-width="2.6"/>
      <circle cx="52" cy="44" r="1.7" fill="black"/><circle cx="64" cy="44" r="1.7" fill="black"/><circle cx="76" cy="44" r="1.7" fill="black"/>
    </mask>
    ${sub(v.defs ? v.defs() : '')}
  </defs>
  ${sub(v.back ? v.back() : '')}
  <g mask="url(#${p('gem')})" stroke-linejoin="round">
    ${FACETS.map(([i, g, c, o]) => `<path d="${facet(i)}" fill="url(#${p(g)})" stroke="url(#${p(g)})" stroke-width="1.2"/>` +
      (o ? `<path d="${facet(i)}" fill="${c}" opacity="${o}"/>` : '')).join('\n    ')}
    <g clip-path="url(#${p('gemc')})">${sub(v.facets ? v.facets() : '')}</g>
    <path d="${TABLE}" fill="url(#${p('table')})"/>
    <g clip-path="url(#${p('tablec')})">
      ${sub(v.table ? v.table() : '')}
      <path d="M${INNER[0][0]},${INNER[0][1]} L${f(INNER[0][0] + 26)},${INNER[0][1]} L${f(INNER[5][0] + 14)},${INNER[3][1]} L${INNER[5][0]},${INNER[3][1]} Z" fill="url(#${p('sheen')})" opacity="0.55"/>
    </g>
  </g>
  <g mask="url(#${p('crownm')})" stroke-linejoin="round">
    <path d="${CROWN}" fill="url(#${p('crown')})" stroke="url(#${p('crown')})" stroke-width="2.4"/>
  </g>
  <circle cx="37" cy="16" r="2.9" fill="${v.jewel}"/><circle cx="64" cy="3.6" r="3.1" fill="${v.jewel}"/><circle cx="91" cy="16" r="2.9" fill="${v.jewel}"/>
  ${sub(v.front ? v.front() : '')}`;
}

export function logoSvg(id) {
  const v = V[id];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${v.name === 'Block Master' ? 'Block Master' : 'Block Master, ' + v.name}">
  <title>${v.name === 'Block Master' ? 'Block Master' : 'Block Master: ' + v.name}</title>
  ${markSvgBody(id)}
</svg>
`;
}

export function wordmarkSvg(id = 'default', textColor = '#eef0fb') {
  const v = V[id];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 128" width="520" height="128" role="img" aria-label="Block Master">
  <title>Block Master</title>
  <defs><linearGradient id="wm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${v.crown[0]}"/><stop offset="1" stop-color="${v.left[0]}"/></linearGradient></defs>
  <g transform="translate(4 4) scale(0.94)">${markSvgBody(id, 'wm-' + id)}</g>
  <text x="136" y="84" font-family="Inter, 'Inter Tight', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="58" font-weight="800" letter-spacing="-2" fill="${textColor}">Block<tspan dx="12" fill="url(#wm)">Master</tspan></text>
</svg>
`;
}

export const NAMES = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, v.name]));

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true });
  for (const id of VARIANTS) writeFileSync(join(OUT, `logo-${id}.svg`), logoSvg(id));
  writeFileSync(join(OUT, 'wordmark.svg'), wordmarkSvg());
  writeFileSync(join(OUT, 'wordmark-light.svg'), wordmarkSvg('default', '#14182b'));
  console.log(`wrote ${VARIANTS.length} logos + wordmarks to ${OUT}`);
}
