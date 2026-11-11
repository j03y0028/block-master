import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { HolidayThemeService, HolidayThemeState } from '@app/services/holiday-theme.service';

/** Block Master logo: the current (holiday) block icon plus the wordmark. */
@Component({
  selector: 'app-block-master-logo',
  template: `
    <span class="bm-logo" *ngIf="state$ | async as state" [class.bm-logo-large]="size === 'large'"
      [attr.title]="state.active ? 'Block Master - ' + state.active.holiday.name : 'Block Master'">
      <img class="bm-logo-icon" [src]="state.logoUrl" [alt]="state.active ? state.active.holiday.name + ' Block Master logo' : 'Block Master logo'"
        [style.height.px]="iconSize" [style.width.px]="iconSize">
      <span class="bm-wordmark" *ngIf="wordmark"><span class="bm-word-block">Block</span><span class="bm-word-master">Master</span></span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; }
    .bm-logo { display: inline-flex; align-items: center; gap: 8px; line-height: 1; white-space: nowrap; }
    .bm-logo-icon { display: block; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.35)); }
    .bm-wordmark { font-weight: 800; font-size: 24px; letter-spacing: -0.5px; color: #f1f5f9; }
    .bm-logo-large .bm-wordmark { font-size: 40px; }
    .bm-word-master {
      margin-left: 6px;
      background: linear-gradient(90deg, var(--bm-accent-2, #ffd35c), var(--bm-accent, #f7931a));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
  `],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockMasterLogoComponent {
  @Input() iconSize = 40;
  @Input() wordmark = true;
  @Input() size: 'normal' | 'large' = 'normal';
  state$: Observable<HolidayThemeState>;

  constructor(holidayTheme: HolidayThemeService) {
    this.state$ = holidayTheme.state$;
  }
}
