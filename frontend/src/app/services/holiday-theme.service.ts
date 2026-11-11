import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import {
  ActiveHoliday, DEFAULT_PALETTE, HolidayPalette, HolidayPreference, isHolidayPreference, logoUrlFor, resolveHoliday,
} from '@app/shared/holidays';

export interface HolidayThemeState {
  preference: HolidayPreference;
  active: ActiveHoliday | null;
  palette: HolidayPalette;
  logoUrl: string;
}

const STORAGE_KEY = 'block-master-holiday';
const DISMISS_KEY = 'block-master-holiday-banner-dismissed';

/**
 * Picks the Block Master logo variant and accent palette from the local date (or the user's override) and applies
 * it to the page: CSS variables --bm-accent / --bm-accent-2, a `bm-holiday-<id>` class on <body>, and the favicon.
 * Preview any theme with ?holiday=<id> (not saved).
 */
@Injectable({ providedIn: 'root' })
export class HolidayThemeService {
  readonly state$: BehaviorSubject<HolidayThemeState>;
  private readonly isBrowser: boolean;
  private sessionOverride: HolidayPreference | null = null;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      try {
        const param = new URLSearchParams(window.location.search).get('holiday');
        if (isHolidayPreference(param)) {
          this.sessionOverride = param;
        }
      } catch (e) { /* ignore */ }
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
    try {
      const saved = this.isBrowser ? window.localStorage.getItem(STORAGE_KEY) : null;
      return isHolidayPreference(saved) ? saved : 'auto';
    } catch (e) {
      return 'auto';
    }
  }

  setPreference(preference: HolidayPreference): void {
    this.sessionOverride = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch (e) { /* private mode: keep in memory only */
      this.sessionOverride = preference;
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
    try {
      return !!state.active && window.localStorage.getItem(DISMISS_KEY) === this.bannerKey(state);
    } catch (e) {
      return false;
    }
  }

  dismissBanner(state: HolidayThemeState): void {
    try {
      window.localStorage.setItem(DISMISS_KEY, this.bannerKey(state));
    } catch (e) { /* ignore */ }
  }

  private compute(): HolidayThemeState {
    const preference = this.preference;
    const active = resolveHoliday(preference, new Date());
    return {
      preference,
      active,
      palette: active ? active.holiday.palette : DEFAULT_PALETTE,
      logoUrl: logoUrlFor(active),
    };
  }

  private apply(state: HolidayThemeState): void {
    if (!this.isBrowser || !this.document?.documentElement) {
      return;
    }
    const root = this.document.documentElement;
    root.style.setProperty('--bm-accent', state.palette.accent);
    root.style.setProperty('--bm-accent-2', state.palette.accent2);
    const body = this.document.body;
    if (body) {
      body.classList.forEach((c) => { if (c.startsWith('bm-holiday-')) { body.classList.remove(c); } });
      body.classList.add('bm-holiday-' + (state.active ? state.active.holiday.id : 'none'));
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
  }
}
