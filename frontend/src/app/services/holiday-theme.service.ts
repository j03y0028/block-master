import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import {
  ActiveHoliday, HolidayPalette, HolidayPreference, isHolidayPreference, logoUrlFor, resolveHoliday,
} from '@app/shared/holidays';
import { DEFAULT_PALETTE_ID, PaletteDef, PaletteId, getPalette, isPaletteId, layeredAccents, paletteVars } from '@app/shared/palettes';

export interface HolidayThemeState {
  preference: HolidayPreference;
  active: ActiveHoliday | null;
  /** The color palette (Appearance setting). */
  palette: PaletteDef;
  /** Accent pair in use: the holiday's (if one is active) or the palette's own, adjusted to be readable on the palette. */
  accents: HolidayPalette;
  logoUrl: string;
}

const STORAGE_KEY = 'block-master-holiday';
const PALETTE_KEY = 'block-master-palette';
const DISMISS_KEY = 'block-master-holiday-banner-dismissed';

/**
 * Block Master appearance: the color palette (Midnight, Aurora, Sunset, Desert, Ocean, Daylight) plus the holiday layer,
 * which picks the logo variant and accent colors from the local date (or the user's override).
 * Applies everything to the page as CSS custom properties on <html> (so they win over any stylesheet), the classes
 * `bm-palette-<id>`, `bm-scheme-<dark|light>` and `bm-holiday-<id|none>`, the favicon and the browser theme color.
 * Preview without saving: ?palette=<id> and/or ?holiday=<id>.
 */
@Injectable({ providedIn: 'root' })
export class HolidayThemeService {
  readonly state$: BehaviorSubject<HolidayThemeState>;
  private readonly isBrowser: boolean;
  private sessionOverride: HolidayPreference | null = null;
  private paletteOverride: PaletteId | null = null;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      try {
        const params = new URLSearchParams(window.location.search);
        const holiday = params.get('holiday');
        if (isHolidayPreference(holiday)) {
          this.sessionOverride = holiday;
        }
        const palette = params.get('palette');
        if (isPaletteId(palette)) {
          this.paletteOverride = palette;
        }
      } catch { /* ignore */ }
    }
    this.state$ = new BehaviorSubject<HolidayThemeState>(this.compute());
    this.apply(this.state$.value);
    if (this.isBrowser) {
      // re-check hourly so an open tab rolls into (and out of) a holiday at local midnight
      setInterval(() => this.refresh(), 60 * 60 * 1000);
    }
  }

  get preference(): HolidayPreference {
    if (this.sessionOverride) {
      return this.sessionOverride;
    }
    const saved = this.read(STORAGE_KEY);
    return isHolidayPreference(saved) ? saved : 'auto';
  }

  get paletteId(): PaletteId {
    if (this.paletteOverride) {
      return this.paletteOverride;
    }
    const saved = this.read(PALETTE_KEY);
    return isPaletteId(saved) ? saved : DEFAULT_PALETTE_ID;
  }

  setPreference(preference: HolidayPreference): void {
    this.sessionOverride = null;
    if (!this.write(STORAGE_KEY, preference)) {
      this.sessionOverride = preference;
    }
    this.refresh();
  }

  setPalette(id: PaletteId): void {
    this.paletteOverride = null;
    if (!this.write(PALETTE_KEY, id)) {
      this.paletteOverride = id;
    }
    this.refresh();
  }

  refresh(): void {
    const next = this.compute();
    this.state$.next(next);
    this.apply(next);
  }

  /** Banner dismissal is remembered per holiday occurrence, so it comes back next holiday. */
  bannerKey(state: HolidayThemeState): string {
    return state.active ? `${state.active.holiday.id}-${state.active.date.getFullYear()}` : '';
  }

  isBannerDismissed(state: HolidayThemeState): boolean {
    return !!state.active && this.read(DISMISS_KEY) === this.bannerKey(state);
  }

  dismissBanner(state: HolidayThemeState): void {
    this.write(DISMISS_KEY, this.bannerKey(state));
  }

  private read(key: string): string | null {
    try {
      return this.isBrowser ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch { /* private mode: keep in memory only */
      return false;
    }
  }

  private compute(): HolidayThemeState {
    const preference = this.preference;
    const active = resolveHoliday(preference, new Date());
    const palette = getPalette(this.paletteId);
    return {
      preference,
      active,
      palette,
      accents: layeredAccents(palette, active ? active.holiday.palette : null),
      logoUrl: logoUrlFor(active),
    };
  }

  private apply(state: HolidayThemeState): void {
    if (!this.isBrowser || !this.document?.documentElement) {
      return;
    }
    const root = this.document.documentElement;
    const vars = paletteVars(state.palette, state.active ? state.active.holiday.palette : null);
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }
    const swap = (el: Element, prefix: string, cls: string): void => {
      Array.from(el.classList).forEach((c) => { if (c.startsWith(prefix)) { el.classList.remove(c); } });
      el.classList.add(cls);
    };
    swap(root, 'bm-palette-', 'bm-palette-' + state.palette.id);
    swap(root, 'bm-scheme-', 'bm-scheme-' + state.palette.scheme);
    root.style.colorScheme = state.palette.scheme;
    if (this.document.body) {
      swap(this.document.body, 'bm-holiday-', 'bm-holiday-' + (state.active ? state.active.holiday.id : 'none'));
    }
    let icon = this.document.getElementById('bm-svg-favicon') as HTMLLinkElement;
    if (!icon) {
      icon = this.document.createElement('link');
      icon.id = 'bm-svg-favicon';
      icon.rel = 'icon';
      icon.type = 'image/svg+xml';
      this.document.head.appendChild(icon);
    }
    icon.href = state.logoUrl;
    const themeColor = this.document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute('content', state.palette.nav);
    }
  }
}
