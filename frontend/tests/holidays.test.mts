// Run: node --test frontend/tests/   (Node >= 22.18 / 23.6 strips TypeScript types natively)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOLIDAYS, holidayForDate, resolveHoliday, nthWeekdayOfMonth, lastWeekdayOfMonth, logoUrlFor, isHolidayPreference,
} from '../src/app/shared/holidays.ts';
import { existsSync } from 'node:fs';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);
const date = (id: string, y: number) => ymd(HOLIDAYS.find((h) => h.id === id)!.date(y));

test('floating holidays match the official calendar', () => {
  // 2026
  assert.equal(date('mlk', 2026), '2026-01-19');
  assert.equal(date('presidents', 2026), '2026-02-16');
  assert.equal(date('memorial', 2026), '2026-05-25');
  assert.equal(date('labor', 2026), '2026-09-07');
  assert.equal(date('thanksgiving', 2026), '2026-11-26');
  // 2027
  assert.equal(date('mlk', 2027), '2027-01-18');
  assert.equal(date('presidents', 2027), '2027-02-15');
  assert.equal(date('memorial', 2027), '2027-05-31');
  assert.equal(date('labor', 2027), '2027-09-06');
  assert.equal(date('thanksgiving', 2027), '2027-11-25');
  // a year where Nov 1 is a Thursday (2029): 4th Thursday is the 22nd
  assert.equal(date('thanksgiving', 2029), '2029-11-22');
  // a year where May 31 is a Monday (2027) and one where it is not (2026)
  assert.equal(ymd(lastWeekdayOfMonth(2027, 4, 1)), '2027-05-31');
  assert.equal(ymd(nthWeekdayOfMonth(2024, 1, 1, 3)), '2024-02-19');
});

test('fixed holidays', () => {
  assert.equal(date('juneteenth', 2026), '2026-06-19');
  assert.equal(date('independence', 2026), '2026-07-04');
  assert.equal(date('halloween', 2026), '2026-10-31');
  assert.equal(date('veterans', 2026), '2026-11-11');
  assert.equal(date('christmas', 2026), '2026-12-25');
  assert.equal(date('new-years', 2027), '2027-01-01');
});

test('windows around each holiday', () => {
  assert.equal(holidayForDate(at(2026, 11, 10))?.holiday.id, 'veterans');
  assert.equal(holidayForDate(at(2026, 11, 11, 23))?.holiday.id, 'veterans');
  assert.equal(holidayForDate(at(2026, 11, 12)), null);
  assert.equal(holidayForDate(at(2026, 11, 8)), null);
  assert.equal(holidayForDate(at(2026, 11, 23))?.holiday.id, 'thanksgiving');
  assert.equal(holidayForDate(at(2026, 11, 27))?.holiday.id, 'thanksgiving');
  assert.equal(holidayForDate(at(2026, 11, 28)), null);
  assert.equal(holidayForDate(at(2026, 10, 25))?.holiday.id, 'halloween');
  assert.equal(holidayForDate(at(2026, 10, 24)), null);
  assert.equal(holidayForDate(at(2026, 7, 1))?.holiday.id, 'independence');
  assert.equal(holidayForDate(at(2026, 12, 15))?.holiday.id, 'christmas');
  assert.equal(holidayForDate(at(2026, 12, 26))?.holiday.id, 'christmas');
  assert.equal(holidayForDate(at(2026, 3, 15)), null);
  assert.equal(holidayForDate(at(2026, 1, 19))?.holiday.id, 'mlk');
  assert.equal(holidayForDate(at(2026, 5, 25))?.holiday.id, 'memorial');
  assert.equal(holidayForDate(at(2026, 9, 5))?.holiday.id, 'labor');
});

test("New Year's window crosses the year boundary", () => {
  const eve = holidayForDate(at(2026, 12, 31, 22));
  assert.equal(eve?.holiday.id, 'new-years');
  assert.equal(ymd(eve!.date), '2027-01-01');
  const after = holidayForDate(at(2027, 1, 2, 9));
  assert.equal(after?.holiday.id, 'new-years');
  assert.equal(ymd(after!.date), '2027-01-01');
  assert.equal(holidayForDate(at(2027, 1, 3)), null);
});

test('windows never overlap, so every day maps to at most one holiday', () => {
  for (let y = 2025; y <= 2035; y++) {
    const seen = new Map<string, string>();
    for (const h of HOLIDAYS) {
      for (const yy of [y - 1, y, y + 1]) {
        const d = h.date(yy);
        for (let k = -h.before; k <= h.after; k++) {
          const key = ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + k));
          assert.ok(!seen.has(key) || seen.get(key) === h.id, `${key}: ${seen.get(key)} vs ${h.id}`);
          seen.set(key, h.id);
        }
      }
    }
  }
});

test('preference: auto, off and forced', () => {
  const nov10 = at(2026, 11, 10);
  assert.equal(resolveHoliday('auto', nov10)?.holiday.id, 'veterans');
  assert.equal(resolveHoliday('off', nov10), null);
  assert.equal(resolveHoliday('halloween', nov10)?.holiday.id, 'halloween');
  assert.equal(ymd(resolveHoliday('halloween', nov10)!.date), '2027-10-31');
  assert.equal(ymd(resolveHoliday('christmas', nov10)!.date), '2026-12-25');
  assert.equal(resolveHoliday('auto', at(2026, 3, 3)), null);
  assert.ok(isHolidayPreference('veterans'));
  assert.ok(isHolidayPreference('auto'));
  assert.ok(!isHolidayPreference('easter'));
});

test('every holiday has a logo file and a readable palette', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const bg = lum('#1d1f31');
  for (const h of HOLIDAYS) {
    const url = logoUrlFor({ holiday: h, date: h.date(2026) });
    assert.ok(existsSync(new URL(`../src${url}`, import.meta.url)), url);
    const ratio = (lum(h.palette.accent) + 0.05) / (bg + 0.05);
    assert.ok(ratio >= 4.5, `${h.id} accent contrast ${ratio.toFixed(2)}`);
  }
  assert.ok(existsSync(new URL('../src/resources/block-master/logo-default.svg', import.meta.url)));
});
