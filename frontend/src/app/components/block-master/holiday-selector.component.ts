import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { HOLIDAYS, HolidayPreference } from '@app/shared/holidays';
import { HolidayThemeService, HolidayThemeState } from '@app/services/holiday-theme.service';

/** Settings control: holiday theme Auto (follow the calendar) / a specific holiday / Off. */
@Component({
  selector: 'app-holiday-selector',
  template: `
    <div class="text-small text-center" *ngIf="state$ | async as state">
      <select class="custom-select custom-select-sm form-control-secondary form-control mx-auto" aria-label="Holiday theme"
        title="Holiday theme: Auto follows the calendar, or pick one, or turn it off"
        [value]="state.preference" (change)="change($any($event.target).value)">
        <option value="auto">Holiday theme: Auto{{ state.preference === 'auto' && state.active ? ' (' + state.active.holiday.name + ')' : '' }}</option>
        <option *ngFor="let h of holidays" [value]="h.id" [selected]="state.preference === h.id">{{ h.name }}</option>
        <option value="off">Holiday theme: Off</option>
      </select>
    </div>
  `,
  styles: [`select { min-width: 190px; }`],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidaySelectorComponent {
  holidays = HOLIDAYS;
  state$: Observable<HolidayThemeState>;

  constructor(private holidayTheme: HolidayThemeService) {
    this.state$ = holidayTheme.state$;
  }

  change(value: HolidayPreference): void {
    this.holidayTheme.setPreference(value);
  }
}
