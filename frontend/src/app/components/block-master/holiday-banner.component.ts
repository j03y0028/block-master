import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HolidayThemeService, HolidayThemeState } from '@app/services/holiday-theme.service';

/** Slim, dismissible holiday greeting shown at the top of the dashboard while a holiday theme is active. */
@Component({
  selector: 'app-holiday-banner',
  template: `
    <ng-container *ngIf="state$ | async as state">
      <div class="holiday-banner" *ngIf="state.active && !holidayTheme.isBannerDismissed(state)" role="status">
        <img [src]="state.logoUrl" alt="" width="36" height="36">
        <div class="text">
          <strong>{{ state.active.holiday.name }}</strong>
          <span>{{ state.active.holiday.greeting }}</span>
        </div>
        <button type="button" class="btn btn-sm btn-link off" (click)="turnOff()" title="Turn holiday themes off (change it any time at the bottom of the page)">Turn off theme</button>
        <button type="button" class="close" aria-label="Dismiss" (click)="dismiss(state)">&times;</button>
      </div>
    </ng-container>
  `,
  styles: [`
    .holiday-banner {
      display: flex; align-items: center; gap: 12px; margin: 12px 0 4px; padding: 8px 12px; border-radius: 10px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--bm-accent) 18%, var(--bg, #11131f)), color-mix(in srgb, var(--bm-accent-2) 12%, var(--bg, #11131f)));
      border: 1px solid color-mix(in srgb, var(--bm-accent) 45%, transparent);
      color: var(--fg, #fff);
    }
    .text { flex: 1; display: flex; flex-wrap: wrap; gap: 2px 10px; align-items: baseline; }
    strong { color: var(--bm-accent); }
    .off { color: var(--fg, #fff); opacity: 0.75; font-size: 12px; white-space: nowrap; }
    .close { color: var(--fg, #fff); opacity: 0.75; text-shadow: none; font-size: 22px; }
    @media (max-width: 576px) { .off { display: none; } }
  `],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayBannerComponent {
  state$: Observable<HolidayThemeState>;

  constructor(public holidayTheme: HolidayThemeService, private cd: ChangeDetectorRef) {
    this.state$ = holidayTheme.state$;
  }

  dismiss(state: HolidayThemeState): void {
    this.holidayTheme.dismissBanner(state);
    this.cd.markForCheck();
  }

  turnOff(): void {
    this.holidayTheme.setPreference('off');
  }
}
