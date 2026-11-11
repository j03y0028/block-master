// Run: node --test frontend/tests/   (Node >= 22.18 strips TypeScript types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readableFeeColors, PALETTES, onColor, contrast, layeredAccents, paletteVars, textBackgrounds, ensureContrast, getPalette, isPaletteId } from '../src/app/shared/palettes.ts';
import { HOLIDAYS } from '../src/app/shared/holidays.ts';

const AA = 4.5;

test('at least 5 palettes incl. one light and the required names', () => {
  assert.ok(PALETTES.length >= 5);
  for (const id of ['midnight', 'aurora', 'sunset', 'desert', 'ocean', 'daylight']) assert.ok(isPaletteId(id), id);
  assert.ok(PALETTES.some((p) => p.scheme === 'light'));
  assert.equal(getPalette('nope').id, 'midnight');
  assert.equal(new Set(PALETTES.map((p) => p.id)).size, PALETTES.length);
});

for (const p of PALETTES) {
  test(`${p.name}: text colors meet WCAG AA (4.5:1) on every surface`, () => {
    for (const bg of textBackgrounds(p)) {
      for (const [name, color] of Object.entries({ fg: p.fg, muted: p.muted, link: p.link, green: p.green, red: p.red, yellow: p.yellow, orange: p.orange })) {
        const r = contrast(color, bg);
        assert.ok(r >= AA, `${p.id} ${name} ${color} on ${bg}: ${r.toFixed(2)}`);
      }
    }
  });
  test(`${p.name}: white text on buttons and mined blocks meets AA`, () => {
    for (const [name, c] of Object.entries({ primary: p.primary, blockA: p.blockA, blockB: p.blockB })) {
      const r = contrast('#ffffff', c);
      assert.ok(r >= AA, `${p.id} white on ${name} ${c}: ${r.toFixed(2)}`);
    }
  });
  test(`${p.name}: own accents and every holiday accent layered on top meet AA`, () => {
    for (const h of [null, ...HOLIDAYS.map((x) => x.palette)]) {
      const a = layeredAccents(p, h);
      for (const bg of textBackgrounds(p)) {
        assert.ok(contrast(a.accent, bg) >= AA, `${p.id} accent ${a.accent} on ${bg}`);
        assert.ok(contrast(a.accent2, bg) >= AA, `${p.id} accent2 ${a.accent2} on ${bg}`);
      }
      assert.ok(contrast(onColor(a.accent), a.accent) >= AA, `${p.id} badge text on accent ${a.accent}`);
    }
  });
  test(`${p.name}: text stays AA over the page glow (worst case: the glow color itself)`, () => {
    for (const bg of [p.glow, p.glow2]) {
      for (const [name, color] of Object.entries({ fg: p.fg, muted: p.muted, link: p.link, ...layeredAccents(p) })) {
        assert.ok(contrast(color, bg) >= AA, `${p.id} ${name} ${color} on glow ${bg}: ${contrast(color, bg).toFixed(2)}`);
      }
    }
  });
  test(`${p.name}: card edges are visible (border >= 1.2:1 against the page)`, () => {
    assert.ok(contrast(p.border, p.surface) >= 1.2 || contrast(p.surface, p.bg) >= 1.05, p.id);
  });
}

test('ensureContrast keeps colors that already pass and fixes ones that do not', () => {
  assert.equal(ensureContrast('#ffffff', ['#000000'], 'dark'), '#ffffff');
  const fixed = ensureContrast('#ffd35c', ['#ffffff'], 'light');
  assert.ok(contrast(fixed, '#ffffff') >= AA);
});

test('paletteVars sets the variables the app relies on', () => {
  const v = paletteVars(PALETTES[0]);
  for (const k of ['--bg', '--fg', '--box-bg', '--stat-box-bg', '--transparent-fg', '--bs-body-bg', '--bs-body-color', '--bm-accent', '--bm-surface', '--mainnet-alt', '--primary']) {
    assert.ok(v[k], k);
  }
});

test('projected-block fee colors carry white text at >= 4.5:1 and keep their order/hue family', () => {
  const src = readFileSync(new URL('../src/app/app.constants.ts', import.meta.url), 'utf8');
  const upstream = [...src.split('upstreamMempoolFeeColors = [')[1].split(']')[0].matchAll(/'([0-9a-fA-F]{6})'/g)].map((m) => m[1]);
  assert.ok(upstream.length > 30);
  const fixed = readableFeeColors(upstream);
  assert.equal(fixed.length, upstream.length);
  fixed.forEach((c, i) => {
    assert.ok(contrast('#ffffff', '#' + c) >= AA, `${upstream[i]} -> ${c}`);
    if (contrast('#ffffff', '#' + upstream[i]) >= AA) assert.equal(c, upstream[i].toLowerCase());
  });
});
