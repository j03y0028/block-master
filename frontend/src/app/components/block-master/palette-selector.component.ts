import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { PALETTES, PaletteDef, PaletteId } from '@app/shared/palettes';
import { HolidayThemeService, HolidayThemeState } from '@app/services/holiday-theme.service';

/** Settings control: the color palette. Holiday accents (if any) layer on top of the chosen palette. */
@Component({
  selector: 'app-palette-selector',
  template: `
    <div class="bm-palettes" *ngIf="state$ | async as state" role="radiogroup" aria-label="Color palette">
      <span class="bm-palettes-label">{{ state.palette.name }}</span>
      <button type="button" *ngFor="let p of palettes" class="bm-swatch" role="radio"
        [attr.aria-checked]="p.id === state.palette.id" [class.active]="p.id === state.palette.id"
        [attr.title]="p.name + ': ' + p.description" [attr.aria-label]="p.name"
        [style.background]="gradient(p)" (click)="choose(p.id)"></button>
    </div>
  `,
  styles: [`
    .bm-palettes { display: inline-flex; align-items: center; gap: 7px; padding: 5px 10px; border-radius: 999px;
      background: var(--bm-inset); border: 1px solid var(--bm-border); }
    .bm-palettes-label { font-size: 12px; font-weight: 600; color: var(--bm-muted); min-width: 58px; text-align: right; margin-right: 2px; }
    .bm-swatch { width: 20px; height: 20px; border-radius: 50%; padding: 0; cursor: pointer;
      border: 1px solid rgba(127, 127, 127, 0.45); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .bm-swatch:hover { transform: translateY(-1px) scale(1.08); }
    .bm-swatch:focus-visible { outline: 2px solid var(--bm-accent); outline-offset: 2px; }
    .bm-swatch.active { box-shadow: 0 0 0 2px var(--bm-inset), 0 0 0 4px var(--bm-accent); }
  `],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaletteSelectorComponent {
  palettes = PALETTES;
  state$: Observable<HolidayThemeState>;

  constructor(private holidayTheme: HolidayThemeService) {
    this.state$ = holidayTheme.state$;
  }

  gradient(p: PaletteDef): string {
    return `linear-gradient(135deg, ${p.swatch[0]} 0 38%, ${p.swatch[1]} 38% 70%, ${p.swatch[2]} 70%)`;
  }

  choose(id: PaletteId): void {
    this.holidayTheme.setPalette(id);
  }
}
