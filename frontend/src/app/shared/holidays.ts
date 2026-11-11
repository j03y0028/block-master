/**
 * Block Master holiday calendar (U.S. federal holidays + Halloween).
 *
 * Pure date logic with no Angular dependencies so it can be unit-tested with `node --test`
 * (see frontend/tests/holidays.test.mts). All dates are LOCAL calendar dates: a holiday starts and ends at the
 * viewer's local midnight. Floating holidays (e.g. Thanksgiving = 4th Thursday of November) are computed per year.
 */

export type HolidayId =
  | 'new-years'
  | 'mlk'
  | 'presidents'
  | 'memorial'
  | 'juneteenth'
  | 'independence'
  | 'labor'
  | 'halloween'
  | 'veterans'
  | 'thanksgiving'
  | 'christmas';

/** 'auto' follows the calendar, 'off' disables holiday themes, a HolidayId forces that theme. */
export type HolidayPreference = 'auto' | 'off' | HolidayId;

export interface HolidayPalette {
  /** Main accent, readable on dark backgrounds (contrast >= 4.5:1 against #1d1f31). */
  accent: string;
  /** Secondary accent for gradients. */
  accent2: string;
}

export interface HolidayDef {
  id: HolidayId;
  name: string;
  /** Short, plain greeting for the dashboard banner. */
  greeting: string;
  palette: HolidayPalette;
  /** Days before the holiday the theme starts showing. */
  before: number;
  /** Days after the holiday the theme keeps showing. */
  after: number;
  /** Holiday date (local) in the given year. */
  date: (year: number) => Date;
}

export interface ActiveHoliday {
  holiday: HolidayDef;
  /** The holiday's own date for the occurrence that is active. */
  date: Date;
}

export const DEFAULT_PALETTE: HolidayPalette = { accent: '#f7931a', accent2: '#ffd35c' };

/** n-th (1-based) given weekday (0 = Sunday) of a month (0 = January). */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

/** Last given weekday (0 = Sunday) of a month (0 = January). */
export function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const last = new Date(year, month + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month, last.getDate() - offset);
}

const MON = 1;
const THU = 4;

export const HOLIDAYS: HolidayDef[] = [
  {
    id: 'new-years', name: "New Year's Day", before: 1, after: 1,
    greeting: 'Happy New Year! Here is to another year of blocks.',
    palette: { accent: '#ffd35c', accent2: '#cbd5e1' },
    date: (y) => new Date(y, 0, 1),
  },
  {
    id: 'mlk', name: 'Martin Luther King Jr. Day', before: 2, after: 0,
    greeting: 'Honoring Dr. Martin Luther King Jr. "The time is always right to do what is right."',
    palette: { accent: '#b4a7ff', accent2: '#fbbf24' },
    date: (y) => nthWeekdayOfMonth(y, 0, MON, 3),
  },
  {
    id: 'presidents', name: "Presidents' Day", before: 2, after: 0,
    greeting: "Happy Presidents' Day (Washington's Birthday).",
    palette: { accent: '#7ab8ff', accent2: '#f87171' },
    date: (y) => nthWeekdayOfMonth(y, 1, MON, 3),
  },
  {
    id: 'memorial', name: 'Memorial Day', before: 2, after: 0,
    greeting: 'Memorial Day: remembering those who gave their lives in service.',
    palette: { accent: '#f87171', accent2: '#93c5fd' },
    date: (y) => lastWeekdayOfMonth(y, 4, MON),
  },
  {
    id: 'juneteenth', name: 'Juneteenth', before: 1, after: 1,
    greeting: 'Happy Juneteenth, celebrating freedom.',
    palette: { accent: '#f87171', accent2: '#7ab8ff' },
    date: (y) => new Date(y, 5, 19),
  },
  {
    id: 'independence', name: 'Independence Day', before: 3, after: 1,
    greeting: 'Happy Independence Day! Fireworks optional, blocks guaranteed.',
    palette: { accent: '#f87171', accent2: '#7ab8ff' },
    date: (y) => new Date(y, 6, 4),
  },
  {
    id: 'labor', name: 'Labor Day', before: 2, after: 0,
    greeting: 'Happy Labor Day. Thanks to everyone who keeps things running, miners included.',
    palette: { accent: '#38bdf8', accent2: '#facc15' },
    date: (y) => nthWeekdayOfMonth(y, 8, MON, 1),
  },
  {
    id: 'halloween', name: 'Halloween', before: 6, after: 0,
    greeting: 'Happy Halloween! The only scary thing here should be the fee rates.',
    palette: { accent: '#fb923c', accent2: '#c084fc' },
    date: (y) => new Date(y, 9, 31),
  },
  {
    id: 'veterans', name: 'Veterans Day', before: 2, after: 0,
    greeting: 'Veterans Day: thank you to everyone who has served.',
    palette: { accent: '#7ab8ff', accent2: '#b5c39a' },
    date: (y) => new Date(y, 10, 11),
  },
  {
    id: 'thanksgiving', name: 'Thanksgiving', before: 3, after: 1,
    greeting: 'Happy Thanksgiving! Grateful for every block.',
    palette: { accent: '#fbbf24', accent2: '#fb923c' },
    date: (y) => nthWeekdayOfMonth(y, 10, THU, 4),
  },
  {
    id: 'christmas', name: 'Christmas Day', before: 10, after: 1,
    greeting: 'Merry Christmas and happy holidays!',
    palette: { accent: '#f87171', accent2: '#4ade80' },
    date: (y) => new Date(y, 11, 25),
  },
];

export const HOLIDAY_IDS: HolidayId[] = HOLIDAYS.map((h) => h.id);

export function getHoliday(id: string | null | undefined): HolidayDef | null {
  return HOLIDAYS.find((h) => h.id === id) || null;
}

export function isHolidayPreference(value: unknown): value is HolidayPreference {
  return value === 'auto' || value === 'off' || (typeof value === 'string' && HOLIDAY_IDS.includes(value as HolidayId));
}

/** Whole local days since the epoch (DST-safe: uses the local calendar date, not elapsed milliseconds). */
function dayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/** The holiday whose window contains the given local date, if any. Windows may cross a year boundary. */
export function holidayForDate(now: Date): ActiveHoliday | null {
  const today = dayNumber(now);
  for (const year of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    for (const holiday of HOLIDAYS) {
      const date = holiday.date(year);
      const day = dayNumber(date);
      if (today >= day - holiday.before && today <= day + holiday.after) {
        return { holiday, date };
      }
    }
  }
  return null;
}

/** Applies the user's preference: 'auto' follows the calendar, 'off' disables, an id forces that theme. */
export function resolveHoliday(preference: HolidayPreference, now: Date = new Date()): ActiveHoliday | null {
  if (preference === 'off') {
    return null;
  }
  if (preference === 'auto') {
    return holidayForDate(now);
  }
  const holiday = getHoliday(preference);
  if (!holiday) {
    return holidayForDate(now);
  }
  // Forced theme: point at this holiday's nearest occurrence (this year's, or next year's once it has passed).
  let date = holiday.date(now.getFullYear());
  if (dayNumber(date) + holiday.after < dayNumber(now)) {
    date = holiday.date(now.getFullYear() + 1);
  }
  return { holiday, date };
}

export function logoUrlFor(active: ActiveHoliday | null): string {
  return `/resources/block-master/logo-${active ? active.holiday.id : 'default'}.svg`;
}
