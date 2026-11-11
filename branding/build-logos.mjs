#!/usr/bin/env node
// Block Master logo system, v4 ("Crowned Prism", Block Master 3.0).
// Writes the default mark and one variant per U.S. holiday as SVG into frontend/src/resources/block-master/, plus the
// wordmark. Original artwork released with the rest of this repository under AGPL-3.0.
//
// Design: a hexagonal prism seen in three-quarter view, the same object the live chain sculpture is built from.
// Three lit side faces (light from the left), a lid with a negative-space inner hexagon, hairline seams, and a
// floating geometric crown (negative-space band and jewels). Each holiday puts one motif on the front face and
// can add a scene accent in the open corners. No outlines, no clip art: planes, gradients and gaps.
// Run: node branding/build-logos.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'frontend/src/resources/block-master');
const f = (n) => Number(n.toFixed(2));

// ---------- geometry (128 x 128) ----------
// Prism: hexagonal lid centered at (CX, CY) with radius R, squashed vertically by SQ (three-quarter view), height H.
const CX = 64;
const CY = 63;
const R = 40;
const SQ = 0.42;
const H = 44;
const HH = f(R * SQ * Math.sin(Math.PI / 3));
const lidPts = (r) => Array.from({ length: 6 }, (_, k) => [f(CX + r * Math.cos((k * Math.PI) / 3)), f(CY + r * SQ * Math.sin((k * Math.PI) / 3))]);
const LID = lidPts(R);
const LID_IN = lidPts(R * 0.58);
const down = ([x, y]) => [x, f(y + H)];
const poly = (pts) => 'M' + pts.map(([x, y]) => `${x},${y}`).join(' L') + ' Z';
const LID_PATH = poly(LID);
// visible side faces: 0 = right (k0 -> k1), 1 = front (k1 -> k2), 2 = left (k2 -> k3)
const side = (k) => poly([LID[k], LID[k + 1], down(LID[k + 1]), down(LID[k])]);
const FRONT = side(1);
const SILHOUETTE = poly([LID[4], LID[5], LID[0], down(LID[0]), down(LID[1]), down(LID[2]), down(LID[3]), LID[3]]);
const SEAMS = `M${LID[0]} L${LID[1]} L${LID[2]} L${LID[3]} M${LID[1]} L${down(LID[1])} M${LID[2]} L${down(LID[2])} ` + poly(LID_IN);
// front-face coordinate system: draw in a 100 x 110 box
const ON_FRONT = `matrix(${f((LID[1][0] - LID[2][0]) / 100)} 0 0 ${f(H / 110)} ${LID[2][0]} ${LID[2][1]})`;
const CROWN = 'M42,46 L37,20 L52,32 L64,8 L76,32 L91,20 L86,46 Z';

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
    art: () => `<g transform="${ON_FRONT}">${sparkle(50, 52, 34, '#f5c955')}${sparkle(80, 18, 9, '#c9d2f2', 0.9)}${sparkle(20, 90, 8, '#c9d2f2', 0.9)}</g>`,
  },
  mlk: {
    name: 'Martin Luther King Jr. Day',
    top: ['#a78bfa', '#7c5ce0'], left: ['#5b3fc4', '#3f2a92'], right: ['#3a2780', '#24185a'],
    crown: ['#fde9a8', '#e8b13a'], jewel: '#fff7dd',
    back: () => [44, 52, 60].map((r, i) => {
      const a0 = (200 * Math.PI) / 180;
      const a1 = (340 * Math.PI) / 180;
      return `<path d="M${f(64 + r * Math.cos(a0))},${f(78 + r * Math.sin(a0))} A${r},${r} 0 0 1 ${f(64 + r * Math.cos(a1))},${f(78 + r * Math.sin(a1))}" fill="none" stroke="#f0b94a" stroke-width="${2.2 - i * 0.5}" stroke-linecap="round" opacity="${0.85 - i * 0.25}"/>`;
    }).join(''),
    art: () => `<g transform="${ON_FRONT}"><circle cx="50" cy="110" r="30" fill="#f0b94a"/>${[-60, -30, 0, 30, 60].map((a) => {
      const r = (a - 90) * Math.PI / 180;
      return `<line x1="${f(50 + 38 * Math.cos(r))}" y1="${f(110 + 38 * Math.sin(r))}" x2="${f(50 + 58 * Math.cos(r))}" y2="${f(110 + 58 * Math.sin(r))}" stroke="#f0b94a" stroke-width="6" stroke-linecap="round"/>`;
    }).join('')}</g>`,
  },
  presidents: {
    name: "Presidents' Day",
    top: ['#f8fafc', '#d5dceb'], left: ['#2747a8', '#1a2f74'], right: ['#c0262d', '#8a161c'],
    crown: ['#fde68a', '#d9a521'], jewel: '#ffffff',
    art: () => `<g transform="${ON_FRONT}">${[[22, 40, 13], [50, 36, 17], [78, 40, 13]].map(([x, y, r]) => `<polygon points="${star(x, y, r)}" fill="#ffffff"/>`).join('')}<rect x="0" y="74" width="100" height="9" fill="#c0262d"/><rect x="0" y="90" width="100" height="9" fill="#c0262d"/></g>`,
  },
  memorial: {
    name: 'Memorial Day',
    top: ['#dbe3ef', '#aab6c9'], left: ['#2b3a67', '#1b2546'], right: ['#3b4558', '#252c3a'],
    crown: ['#f1d98a', '#c79a2e'], jewel: '#f8fafc',
    front: () => `<g transform="translate(107 99)">
      <path d="M-2,9 C0,15 -2,20 -7,24" stroke="#3f7d4e" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-6.4" rx="5.6" ry="7" fill="url(#poppy)" transform="rotate(${a})"/>`).join('')}
      <circle r="3.4" fill="#1a1c22"/></g>`,
    defs: () => `<linearGradient id="poppy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a4e"/><stop offset="1" stop-color="#c81e1e"/></linearGradient>`,
    art: () => `<g transform="${ON_FRONT}"><polygon points="${star(50, 52, 34)}" fill="#ffffff" opacity="0.94"/></g>`,
  },
  juneteenth: {
    name: 'Juneteenth',
    top: ['#4f7ff0', '#2c5ad6'], left: ['#d73232', '#a31d1d'], right: ['#a31d1d', '#701313'],
    crown: ['#fff1c1', '#e7b53b'], jewel: '#ffffff',
    back: () => `<path d="M8,98 Q30,84 22,62" fill="none" stroke="#7f9cf0" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/>` + sparkle(110, 32, 6, '#7f9cf0'),
    art: () => `<g transform="${ON_FRONT}"><rect x="0" y="0" width="100" height="55" fill="#2c5ad6"/><path d="M0,55 Q50,40 100,55" fill="#2c5ad6"/><polygon points="${star(50, 55, 38, 12, 0.62)}" fill="none" stroke="#ffffff" stroke-width="4.5"/><polygon points="${star(50, 55, 18)}" fill="#ffffff"/></g>`,
  },
  independence: {
    name: 'Independence Day',
    top: ['#3f63d8', '#2445a8'], left: ['#ffffff', '#e7ecf5'], right: ['#2445a8', '#172e75'],
    crown: ['#fff1c1', '#e7b53b'], jewel: '#ffffff',
    back: () => burst(17, 30, 13, '#ff6b6b') + burst(112, 30, 11, '#7aa2ff') + burst(110, 96, 8, '#f5c955', 10),
    art: () => `<g transform="${ON_FRONT}">${[0, 2, 4, 6].map((i) => `<rect x="0" y="${f(i * 15.72)}" width="100" height="15.72" fill="#d42a2a"/>`).join('')}
      <rect x="0" y="0" width="52" height="62.9" fill="#2445a8"/>${[[14, 14], [38, 14], [26, 31], [14, 48], [38, 48]].map(([x, y]) => `<polygon points="${star(x, y, 8)}" fill="#ffffff"/>`).join('')}</g>`,
  },
  labor: {
    name: 'Labor Day',
    top: ['#9fd8f7', '#5fb2e3'], left: ['#1f7fc0', '#155b8d'], right: ['#14507a', '#0c3452'],
    crown: ['#ffe48a', '#f0b414'], jewel: '#ffffff',
    back: () => `<path d="${gearPath(104, 96, 14)}" fill="none" stroke="#f0b414" stroke-width="2" stroke-linejoin="round"/><circle cx="104" cy="96" r="5" fill="none" stroke="#f0b414" stroke-width="2"/>`,
    cut: () => `<g transform="${ON_FRONT}"><path d="${gearPath(50, 55, 36, 8)}" fill="black"/></g>`,
    art: () => `<g transform="${ON_FRONT}"><circle cx="50" cy="55" r="11" fill="#f0b414"/></g>`,
  },
  halloween: {
    name: 'Halloween',
    top: ['#ffb066', '#f68a2e'], left: ['#f47a1f', '#c95a0c'], right: ['#b8500b', '#7f3405'],
    crown: ['#b28cff', '#6d3fd6'], jewel: '#c4f06a',
    back: () => `<mask id="moon"><rect width="128" height="128" fill="white"/><circle cx="114" cy="22" r="10" fill="black"/></mask>
      <circle cx="106" cy="26" r="11" fill="#c4a8ff" mask="url(#moon)"/>
      <path d="M12,40 L18,36 L21,39 L24,36 L30,40 L25,40 L21,44 L17,40 Z" fill="#b28cff"/>`,
    cut: () => `<g transform="${ON_FRONT}"><polygon points="16,44 42,44 29,20" fill="black"/><polygon points="58,44 84,44 71,20" fill="black"/>
      <path d="M12,62 L25,74 L38,62 L50,74 L62,62 L75,74 L88,62 L80,90 L20,90 Z" fill="black"/></g>`,
  },
  veterans: {
    name: 'Veterans Day',
    top: ['#5b74b8', '#3a5394'], left: ['#24376e', '#17254d'], right: ['#5f6b3c', '#414a27'],
    crown: ['#fff1c1', '#e2ad35'], jewel: '#ffffff',
    back: () => `<g opacity="0.95">${[[16, 30], [112, 30]].map(([x, y]) => `<polygon points="${star(x, y, 6)}" fill="#8fa3dc"/>`).join('')}</g>`,
    art: () => `<g transform="${ON_FRONT}"><circle cx="50" cy="38" r="27" fill="#ffffff"/><polygon points="${star(50, 39.5, 22)}" fill="#24376e"/>
      <g fill="none" stroke="#f5d27a" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"><path d="M24,74 L50,88 L76,74"/><path d="M24,92 L50,106 L76,92"/></g></g>`,
  },
  thanksgiving: {
    name: 'Thanksgiving',
    top: ['#f6c46e', '#e79a3a'], left: ['#c4612a', '#96441a'], right: ['#8a3a17', '#5e260e'],
    crown: ['#fff0c0', '#e5a92d'], jewel: '#fff7e0',
    defs: () => `<linearGradient id="lf1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#c2410c"/></linearGradient>
      <linearGradient id="lf2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e86a3c"/><stop offset="1" stop-color="#9b2c1b"/></linearGradient>
      <linearGradient id="lf3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9b44a"/><stop offset="1" stop-color="#8a6a17"/></linearGradient>`,
    back: () => leaf(18, 34, 1.05, -30, null, '#7a2e0e', 'lf2') + leaf(110, 30, 0.85, 35, null, '#7a3e0e', 'lf1') + leaf(108, 98, 0.95, 120, null, '#5f4a0f', 'lf3') +
      leaf(20, 96, 0.7, -110, null, '#7a3e0e', 'lf1'),
    art: () => `<g transform="${ON_FRONT}">${leaf(50, 56, 3.6, 20, null, '#7a2e0e', 'lf3')}</g>`,
  },
  christmas: {
    name: 'Christmas',
    top: ['#2fae6a', '#1a8a4e'], left: ['#16774a', '#0e5434'], right: ['#0e5434', '#083a23'],
    crown: ['#fff1c1', '#e2ad35'], jewel: '#ffffff',
    back: () => snowflake(17, 32, 9, '#7cc0e8') + snowflake(111, 36, 7, '#7cc0e8') + snowflake(110, 98, 6, '#7cc0e8') +
      `<circle cx="22" cy="92" r="1.6" fill="#7cc0e8"/><circle cx="102" cy="16" r="1.4" fill="#7cc0e8"/>`,
    lid: () => `<path d="M64,${f(CY + HH)} L64,${f(CY - HH)}" stroke="#c92a2a" stroke-width="9"/><path d="M${CX - R},${CY} L${CX + R},${CY}" stroke="#e23b3b" stroke-width="6"/>`,
    art: () => `<g transform="${ON_FRONT}" fill="#e23b3b"><rect x="38" y="0" width="24" height="110"/><rect x="0" y="44" width="100" height="20"/></g>`,
  },
};
export const VARIANTS = Object.keys(V);

function grad(id, [a, b], x2 = 0, y2 = 1) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
}

/** The mark only (no text). `prefix` keeps ids unique when several logos are inlined in one page. */
export function markSvgBody(id, prefix = id) {
  const v = V[id];
  const p = (s) => `${prefix}-${s}`;
  const sub = (s) => (s || '').replace(/id="([^"]+)"/g, (_, x) => `id="${p(x)}"`).replace(/url\(#([^)]+)\)/g, (_, x) => `url(#${p(x)})`);
  return `<defs>
    ${grad(p('top'), v.top, 1, 1)}${grad(p('left'), v.left, 0, 1)}${grad(p('right'), v.right, 0, 1)}${grad(p('crown'), v.crown)}
    <linearGradient id="${p('lid')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${v.top[0]}"/><stop offset="1" stop-color="${v.top[1]}"/></linearGradient>
    <linearGradient id="${p('sheen')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <clipPath id="${p('frontc')}"><path d="${FRONT}"/></clipPath>
    <clipPath id="${p('lidc')}"><path d="${LID_PATH}"/></clipPath>
    <mask id="${p('gem')}" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">
      <rect width="128" height="128" fill="white"/>
      <path d="${SEAMS}" stroke="black" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <g clip-path="url(#${p('frontc')})">${v.cut ? v.cut() : ''}</g>
    </mask>
    <mask id="${p('crownm')}" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">
      <rect width="128" height="128" fill="white"/>
      <path d="M38,39 L90,39" stroke="black" stroke-width="2.6"/>
      <circle cx="52" cy="43" r="1.7" fill="black"/><circle cx="64" cy="43" r="1.7" fill="black"/><circle cx="76" cy="43" r="1.7" fill="black"/>
    </mask>
    ${sub(v.defs ? v.defs() : '')}
  </defs>
  ${sub(v.back ? v.back() : '')}
  <ellipse cx="${CX}" cy="${f(CY + H + 2)}" rx="${R + 4}" ry="${f(R * SQ + 2)}" fill="#000000" opacity="0.18"/>
  <g mask="url(#${p('gem')})" stroke-linejoin="round">
    <path d="${side(0)}" fill="url(#${p('right')})" stroke="url(#${p('right')})" stroke-width="1"/>
    <path d="${FRONT}" fill="url(#${p('left')})" stroke="url(#${p('left')})" stroke-width="1"/>
    <path d="${side(2)}" fill="url(#${p('top')})" stroke="url(#${p('top')})" stroke-width="1"/>
    <path d="${side(2)}" fill="#ffffff" opacity="0.08"/>
    <g clip-path="url(#${p('frontc')})">
      ${sub(v.art ? v.art() : '')}
      <path d="${FRONT}" fill="url(#${p('sheen')})" opacity="0.6"/>
    </g>
    <path d="${LID_PATH}" fill="url(#${p('lid')})"/>
    <path d="${LID_PATH}" fill="#ffffff" opacity="0.22"/>
    <g clip-path="url(#${p('lidc')})">${sub(v.lid ? v.lid() : '')}</g>
  </g>
  <g mask="url(#${p('crownm')})" stroke-linejoin="round">
    <path d="${CROWN}" fill="url(#${p('crown')})" stroke="url(#${p('crown')})" stroke-width="2.4"/>
  </g>
  <circle cx="37" cy="15" r="2.9" fill="${v.jewel}"/><circle cx="64" cy="2.8" r="2.8" fill="${v.jewel}"/><circle cx="91" cy="15" r="2.9" fill="${v.jewel}"/>
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
