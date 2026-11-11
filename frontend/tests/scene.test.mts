// Run: node --test frontend/tests/   (Node >= 22.18 strips TypeScript types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOLIDAYS } from '../src/app/shared/holidays.ts';
import {
  SCENE_ACCENTS, SCENE_DEFAULT, sceneAccentFor, slotAt, chainLayout, particleBudget, spawnRate, feeLevelIndex,
  isNewTip, easeOutCubic, easeInOutSine, mulberry32, formatHeight,
} from '../src/app/shared/scene.ts';

test('every holiday dresses the scene (immersive accents, not just a recolor)', () => {
  for (const h of HOLIDAYS) {
    const a = SCENE_ACCENTS[h.id];
    assert.ok(a, `scene accent for ${h.id}`);
    assert.ok(a.colors.length >= 1 && a.density > 0, h.id);
    assert.ok(a.caption.length > 10, h.id);
    assert.equal(sceneAccentFor(h.id), a);
  }
  assert.equal(sceneAccentFor(null), SCENE_DEFAULT);
  assert.equal(SCENE_ACCENTS.christmas.ambient, 'snow');
  assert.ok(SCENE_ACCENTS.christmas.lights && SCENE_ACCENTS.christmas.lights.length >= 3);
  assert.ok(SCENE_ACCENTS.veterans.beams);
  assert.ok(SCENE_ACCENTS.independence.fireworks);
  assert.ok(SCENE_ACCENTS.halloween.moon);
});

test('scene captions are plain and never mention a real surname', () => {
  for (const a of [SCENE_DEFAULT, ...Object.values(SCENE_ACCENTS)]) assert.ok(!/lara/i.test(a.caption));
});

for (const compact of [false, true]) {
  test(`chain recedes monotonically toward the vanishing point (compact=${compact})`, () => {
    const slots = chainLayout(10, 800, 420, compact);
    for (let i = 1; i < slots.length; i++) {
      assert.ok(slots[i].scale < slots[i - 1].scale, 'shrinks');
      assert.ok(slots[i].x < slots[i - 1].x, 'moves left');
      assert.ok(slots[i].y < slots[i - 1].y, 'moves up');
      assert.ok(slots[i].alpha <= slots[i - 1].alpha && slots[i].alpha >= 0.18, 'fades');
    }
    assert.equal(slots[0].scale, 1);
    assert.ok(slots[0].x > 0 && slots[0].x < 800 && slots[0].y < 420);
  });
}

test('fractional slots interpolate between neighbors (smooth arrival)', () => {
  const a = slotAt(1, 800, 400), b = slotAt(2, 800, 400), m = slotAt(1.5, 800, 400);
  assert.ok(m.x < a.x && m.x > b.x);
  assert.deepEqual(slotAt(-1, 800, 400), slotAt(0, 800, 400));
});

test('particle budget scales with width, is capped, and is small under reduced motion', () => {
  assert.equal(particleBudget(200, false), 40);
  assert.equal(particleBudget(5000, false), 160);
  assert.ok(particleBudget(900, false) > particleBudget(400, false));
  assert.equal(particleBudget(5000, true), 14);
});

test('spawn rate follows the live vB/s and clamps', () => {
  assert.equal(spawnRate(null), 6);
  assert.equal(spawnRate(0), 6);
  assert.equal(spawnRate(1), 3);
  assert.equal(spawnRate(1e9), 48);
  assert.ok(spawnRate(2400) > spawnRate(1200));
});

test('fee level index picks the highest level not above the rate', () => {
  const levels = [1, 2, 3, 4, 5, 6, 8, 10];
  assert.equal(feeLevelIndex(0.5, levels), 0);
  assert.equal(feeLevelIndex(3, levels), 2);
  assert.equal(feeLevelIndex(9, levels), 6);
  assert.equal(feeLevelIndex(999, levels), 7);
});

test('celebration only fires for a strictly newer tip, never on first load', () => {
  assert.equal(isNewTip(null, 975393), false);
  assert.equal(isNewTip(975392, 975392), false);
  assert.equal(isNewTip(975393, 975392), false);
  assert.equal(isNewTip(975392, 975393), true);
});

test('easings are clamped to [0, 1]', () => {
  for (const ease of [easeOutCubic, easeInOutSine]) {
    assert.equal(ease(-1), 0);
    assert.equal(ease(0), 0);
    assert.equal(ease(1), 1);
    assert.equal(ease(5), 1);
  }
});

test('mulberry32 is deterministic (stable reduced-motion still frame)', () => {
  const a = mulberry32(42), b = mulberry32(42), c = mulberry32(7);
  const sa = Array.from({ length: 20 }, a), sb = Array.from({ length: 20 }, b);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, Array.from({ length: 20 }, c));
  for (const x of sa) assert.ok(x >= 0 && x < 1);
});

test('heights are formatted editorially', () => {
  assert.equal(formatHeight(975392), '975,392');
});
