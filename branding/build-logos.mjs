#!/usr/bin/env node
// Block Master logo generator. Writes the default logo and one variant per U.S. holiday as SVG into
// frontend/src/resources/block-master/. Original artwork (an isometric block wearing a crown), released with the
// rest of this repository under AGPL-3.0. Run: node branding/build-logos.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'frontend/src/resources/block-master');
const INK = '#16182a';

const f = (n) => Number(n.toFixed(2));
function star(cx, cy, r, points = 5, inner = 0.42, rot = -90) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = ((rot + (i * 180) / points) * Math.PI) / 180;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${f(cx + rr * Math.cos(rad))},${f(cy + rr * Math.sin(rad))}`);
  }
  return pts.join(' ');
}
const sparkle = (cx, cy, r, fill) =>
  `<path d="M${cx},${cy - r} Q${cx + r * 0.18},${cy - r * 0.18} ${cx + r},${cy} Q${cx + r * 0.18},${cy + r * 0.18} ${cx},${cy + r} Q${cx - r * 0.18},${cy + r * 0.18} ${cx - r},${cy} Q${cx - r * 0.18},${cy - r * 0.18} ${cx},${cy - r} Z" fill="${fill}"/>`;
const burst = (cx, cy, r, color, n = 10) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    s += `<line x1="${f(cx + r * 0.35 * Math.cos(a))}" y1="${f(cy + r * 0.35 * Math.sin(a))}" x2="${f(cx + r * Math.cos(a))}" y2="${f(cy + r * Math.sin(a))}" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return s + `<circle cx="${cx}" cy="${cy}" r="1.8" fill="${color}"/>`;
};
const snowflake = (cx, cy, r, color = '#e0f2fe') => {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    s += `<line x1="${f(cx - r * Math.cos(a))}" y1="${f(cy - r * Math.sin(a))}" x2="${f(cx + r * Math.cos(a))}" y2="${f(cy + r * Math.sin(a))}" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  return s;
};
const leaf = (cx, cy, s, rot, color) =>
  `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s})"><path d="M0,-10 C6,-6 7,2 0,10 C-7,2 -6,-6 0,-10 Z" fill="${color}" stroke="${INK}" stroke-width="1"/><line x1="0" y1="-7" x2="0" y2="13" stroke="${INK}" stroke-width="1.1"/></g>`;
const gear = (cx, cy, r, color) => {
  let teeth = '';
  for (let i = 0; i < 8; i++) {
    teeth += `<rect x="${f(cx - 2.2)}" y="${f(cy - r - 3)}" width="4.4" height="6" rx="1" fill="${color}" transform="rotate(${i * 45} ${cx} ${cy})"/>`;
  }
  return `${teeth}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="${f(r * 0.42)}" fill="${INK}" opacity="0.75"/>`;
};

// Geometry (128 x 128): isometric block, crown resting on its top face.
const TOP = 'M64,50 L98,67 L64,84 L30,67 Z';
const LEFT = 'M30,67 L64,84 L64,122 L30,105 Z';
const RIGHT = 'M64,84 L98,67 L98,105 L64,122 Z';
const GRID = `<g stroke="${INK}" stroke-opacity="0.22" stroke-width="1.4" fill="none">
    <path d="M47,58.5 L81,75.5 M81,58.5 L47,75.5"/>
    <path d="M47,75.5 L47,113.5 M30,86 L64,103"/>
    <path d="M81,75.5 L81,113.5 M64,103 L98,86"/>
  </g>`;
const CROWN = (c) => `<g transform="translate(0 6)"><g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round">
    <path d="M43,47 L39,21 L52.5,33 L64,11 L75.5,33 L89,21 L85,47 Z" fill="${c.crown}"/>
    <rect x="42" y="41" width="44" height="8" rx="2.5" fill="${c.band || c.crown}"/>
    <circle cx="39" cy="21" r="3.6" fill="${c.jewel}"/>
    <circle cx="64" cy="11" r="3.8" fill="${c.jewel}"/>
    <circle cx="89" cy="21" r="3.6" fill="${c.jewel}"/>
  </g>
  <circle cx="64" cy="45" r="2.3" fill="${c.jewel}" stroke="${INK}" stroke-width="1.4"/></g>`;

const V = {
  default: {
    name: 'Block Master',
    top: '#ffb347', left: '#f7931a', right: '#c96f0c', crown: '#ffd35c', jewel: '#fff3c4',
  },
  'new-years': {
    name: "New Year's Day",
    top: '#4b5170', left: '#2b3050', right: '#1c1f35', crown: '#ffd35c', jewel: '#e5e7eb',
    over: () => sparkle(16, 34, 9, '#ffd35c') + sparkle(112, 40, 7, '#e5e7eb') + sparkle(110, 96, 9, '#ffd35c') +
      sparkle(16, 92, 6, '#e5e7eb') + `<rect x="22" y="56" width="4" height="4" fill="#f472b6" transform="rotate(20 24 58)"/>` +
      `<rect x="102" y="62" width="4" height="4" fill="#60a5fa" transform="rotate(-25 104 64)"/>` +
      `<rect x="100" y="16" width="4" height="4" fill="#4ade80" transform="rotate(35 102 18)"/>`,
  },
  mlk: {
    name: 'Martin Luther King Jr. Day',
    top: '#a598ff', left: '#6d5bd0', right: '#4c3d9e', crown: '#fbbf24', jewel: '#fef3c7',
    under: () => {
      let s = '';
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i * Math.PI) / 8;
        s += `<line x1="${f(64 + 50 * Math.cos(a))}" y1="${f(66 + 50 * Math.sin(a))}" x2="${f(64 + 62 * Math.cos(a))}" y2="${f(66 + 62 * Math.sin(a))}" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" opacity="0.9"/>`;
      }
      return s;
    },
  },
  presidents: {
    name: "Presidents' Day",
    top: '#f1f5f9', left: '#1e3a8a', right: '#b91c1c', crown: '#fcd34d', jewel: '#ffffff',
    over: () => [[40, 86], [53, 93], [40, 99], [53, 106]].map(([x, y]) =>
      `<polygon points="${star(x, y, 4.2)}" fill="#ffffff"/>`).join('') +
      `<g stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity="0.9"><path d="M70,95 L92,84 M70,104 L92,93 M70,113 L92,102"/></g>`,
  },
  memorial: {
    name: 'Memorial Day',
    top: '#cbd5e1', left: '#1e3a8a', right: '#334155', crown: '#d4af37', jewel: '#f8fafc',
    over: () => `<g transform="translate(104 104)">
      <path d="M-3,10 Q-1,18 -6,24" stroke="#166534" stroke-width="2.4" fill="none"/>
      ${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-7" rx="6.5" ry="8" fill="#dc2626" stroke="${INK}" stroke-width="1.2" transform="rotate(${a})"/>`).join('')}
      <circle r="4.2" fill="#111827"/></g>` +
      `<polygon points="${star(47, 96, 7)}" fill="#ffffff" stroke="${INK}" stroke-width="1"/>`,
  },
  juneteenth: {
    name: 'Juneteenth',
    top: '#f8fafc', left: '#1d4ed8', right: '#dc2626', crown: '#fcd34d', jewel: '#ffffff',
    over: () => `<polygon points="${star(47, 95, 12, 12, 0.62)}" fill="none" stroke="#ffffff" stroke-width="1.8"/>
      <polygon points="${star(47, 95, 6.5)}" fill="#ffffff"/>
      <path d="M64,104 Q80,88 98,92" stroke="#ffffff" stroke-width="2.4" fill="none" opacity="0.9"/>`,
  },
  independence: {
    name: 'Independence Day',
    top: '#e2e8f0', left: '#ffffff', right: '#1e3a8a', crown: '#fcd34d', jewel: '#ffffff',
    over: () => {
      let stripes = '';
      for (let i = 0; i < 4; i++) {
        const y0 = 67 + i * 9.5;
        stripes += `<path d="M30,${f(y0)} L64,${f(y0 + 17)} L64,${f(y0 + 21.75)} L30,${f(y0 + 4.75)} Z" fill="#dc2626"/>`;
      }
      const stars = [[74, 88], [86, 82], [74, 101], [86, 95], [80, 108], [92, 102]].map(([x, y]) =>
        `<polygon points="${star(x, y, 3.6)}" fill="#ffffff"/>`).join('');
      return stripes + stars + burst(16, 30, 12, '#f87171') + burst(112, 34, 10, '#60a5fa') + burst(110, 100, 8, '#fcd34d');
    },
  },
  labor: {
    name: 'Labor Day',
    top: '#7dd3fc', left: '#0284c7', right: '#075985', crown: '#facc15', jewel: '#ffffff',
    over: () => gear(81, 94, 8.5, '#facc15') +
      `<g stroke="#facc15" stroke-width="3" stroke-linecap="round"><path d="M38,104 L56,86"/></g><circle cx="57" cy="85" r="5" fill="none" stroke="#facc15" stroke-width="3"/>`,
  },
  halloween: {
    name: 'Halloween',
    top: '#fdba74', left: '#f97316', right: '#c2410c', crown: '#7c3aed', jewel: '#a3e635',
    over: () => `<g fill="#2a1200">
      <polygon points="40,94 52,92 44,82"/>
      <polygon points="76,92 88,94 84,82"/>
      <path d="M40,104 L46,108 L50,103 L56,109 L62,106 L64,112 L66,106 L72,109 L78,103 L82,108 L88,104 L88,110 L64,119 L40,110 Z"/>
    </g>
    <path d="M100,22 q5,-6 8,0 q3,-6 8,0 q-3,1 -4,5 q-2,-2 -4,0 q-2,-2 -4,0 q-1,-4 -4,-5 Z" fill="#c084fc" stroke="${INK}" stroke-width="1"/>
    <path d="M10,40 q5,-6 8,0 q3,-6 8,0 q-3,1 -4,5 q-2,-2 -4,0 q-2,-2 -4,0 q-1,-4 -4,-5 Z" fill="#c084fc" stroke="${INK}" stroke-width="1" transform="scale(0.85) translate(4 8)"/>`,
  },
  veterans: {
    name: 'Veterans Day',
    top: '#b5c39a', left: '#4b5d3a', right: '#1e3a8a', crown: '#fcd34d', jewel: '#ffffff',
    over: () => `<circle cx="47" cy="95" r="10" fill="none" stroke="#ffffff" stroke-width="2"/>
      <polygon points="${star(47, 95.5, 8.2)}" fill="#ffffff"/>
      <g stroke="#fcd34d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M71,94 L81,84 L91,86"/><path d="M71,102 L81,92 L91,94"/><path d="M71,110 L81,100 L91,102"/>
      </g>`,
  },
  thanksgiving: {
    name: 'Thanksgiving',
    top: '#fcd34d', left: '#d97706', right: '#92400e', crown: '#f59e0b', band: '#b45309', jewel: '#fef3c7',
    over: () => leaf(16, 40, 1.1, -30, '#ea580c') + leaf(112, 36, 1, 25, '#dc2626') + leaf(110, 98, 1.2, 60, '#facc15') +
      leaf(18, 96, 0.9, -70, '#b91c1c') + `<g transform="translate(81 96)"><ellipse rx="9" ry="7" fill="#f97316" stroke="${INK}" stroke-width="1.3"/>
      <ellipse rx="3.5" ry="7" fill="none" stroke="${INK}" stroke-width="1"/><path d="M0,-7 q1,-4 4,-5" stroke="#166534" stroke-width="2" fill="none"/></g>`,
  },
  christmas: {
    name: 'Christmas Day',
    top: '#f8fafc', left: '#dc2626', right: '#15803d', crown: '#fcd34d', jewel: '#ef4444',
    over: () => `<path d="M30,67 L64,84 L98,67 L98,71 Q92,76 88,73 Q84,80 78,76 Q72,85 64,88 Q56,85 50,76 Q44,80 40,73 Q36,76 30,71 Z" fill="#f8fafc"/>
      <path d="M47,75.5 L47,113.5" stroke="#fcd34d" stroke-width="5"/>
      <path d="M81,75.5 L81,113.5" stroke="#fcd34d" stroke-width="5"/>
      <path d="M47,58.5 L81,75.5" stroke="#fcd34d" stroke-width="4" opacity="0.95"/>` +
      snowflake(16, 34, 7) + snowflake(112, 40, 6) + snowflake(110, 98, 7) + snowflake(18, 96, 5),
  },
};

export const VARIANTS = Object.keys(V);

export function logoSvg(id) {
  const c = V[id];
  const hideGrid = id === 'christmas' || id === 'independence';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-labelledby="t">
  <title id="t">Block Master${id === 'default' ? '' : ' - ' + c.name}</title>
  ${c.under ? c.under() : ''}
  <g stroke="${INK}" stroke-width="2.6" stroke-linejoin="round">
    <path d="${LEFT}" fill="${c.left}"/>
    <path d="${RIGHT}" fill="${c.right}"/>
    <path d="${TOP}" fill="${c.top}"/>
  </g>
  ${hideGrid ? '' : GRID}
  ${c.over ? c.over() : ''}
  <path d="${TOP} ${LEFT} ${RIGHT}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  ${CROWN(c)}
</svg>
`;
}

export function wordmarkSvg(id = 'default') {
  const icon = logoSvg(id).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title[^<]*<\/title>/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 128" width="520" height="128" role="img" aria-label="Block Master">
  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#ffd35c"/><stop offset="1" stop-color="#f7931a"/></linearGradient></defs>
  <g>${icon}</g>
  <text x="140" y="84" font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="54" font-weight="800" fill="#f1f5f9" stroke="#16182a" stroke-width="1" paint-order="stroke">Block<tspan fill="url(#g)" dx="10">Master</tspan></text>
</svg>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT, { recursive: true });
  for (const id of VARIANTS) writeFileSync(join(OUT, `logo-${id}.svg`), logoSvg(id));
  writeFileSync(join(OUT, 'wordmark.svg'), wordmarkSvg());
  console.log(`wrote ${VARIANTS.length} logos + wordmark to ${OUT}`);
}
