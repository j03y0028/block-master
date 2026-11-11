import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StateService } from '@app/services/state.service';
import { Recommendedfees } from '@interfaces/websocket.interface';

export interface FeeChoice {
  key: string;
  label: string;
  wait: string;
  rate: number;
  sats: number;
  recommended?: boolean;
}

/** Typical native SegWit payment (1 input, 2 outputs), in virtual bytes. */
export const TYPICAL_TX_VBYTES = 140;

export function feeChoices(fees: Recommendedfees, vbytes = TYPICAL_TX_VBYTES): FeeChoice[] {
  const choice = (key: string, label: string, wait: string, rate: number, recommended = false): FeeChoice =>
    ({ key, label, wait, rate, sats: Math.ceil(rate * vbytes), recommended });
  return [
    choice('fast', 'In a hurry', 'next block, about 10 minutes', fees.fastestFee),
    choice('normal', 'Normal', 'usually within 30 minutes', fees.halfHourFee, true),
    choice('patient', 'Patient', 'usually within an hour', fees.hourFee),
    choice('cheap', 'No rush', 'could take hours or days', fees.economyFee),
  ];
}

/** "What fee should I pay?" — the recommended fee levels in plain language with a typical total cost. */
@Component({
  selector: 'app-fee-helper',
  template: `
    <div class="main-title">What fee should I pay?
      <span class="info" ngbTooltip="Bitcoin fees are not a percentage of what you send. You pay per unit of transaction size (sats per virtual byte, sat/vB). Sending $10 or $10,000 costs the same if the transaction is the same size." placement="bottom">?</span>
    </div>
    <div class="card fee-helper">
      <div class="card-body">
        <ng-container *ngIf="choices$ | async as choices; else loading">
          <div class="choice" *ngFor="let c of choices" [class.recommended]="c.recommended">
            <div class="label">
              <strong>{{ c.label }}</strong>
              <span class="badge badge-pill" *ngIf="c.recommended">most people pick this</span>
              <small>{{ c.wait }}</small>
            </div>
            <div class="value">
              <span class="rate" ngbTooltip="Fee rate to enter in your wallet: satoshis per virtual byte" placement="left">{{ c.rate | number:'1.0-1' }} <small>sat/vB</small></span>
              <span class="total" ngbTooltip="Estimated total for a typical payment of {{ vbytes }} vB (1 input, 2 outputs). Bigger transactions cost more." placement="left">
                ≈ {{ c.sats | number }} sats<ng-container *ngIf="showFiat"> · <app-fiat [value]="c.sats" digitsInfo="1.2-2"></app-fiat></ng-container>
              </span>
            </div>
          </div>
          <p class="hint">Tip: if you are not in a hurry, a lower fee saves money. Most wallets let you bump the fee later (RBF) if it gets stuck.</p>
        </ng-container>
        <ng-template #loading><div class="skeleton-loader" *ngFor="let i of [1,2,3,4]" style="margin: 14px 0"></div></ng-template>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .card { background-color: var(--bg); height: calc(100% - 14px); color: var(--fg); text-align: left; }
    .main-title { position: relative; color: var(--bm-muted); margin-top: -13px; font-size: 11px; letter-spacing: 0.12em;
      text-transform: uppercase; font-weight: 600; text-align: center; padding-bottom: 6px; }
    .main-title .info, .info {
      display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; margin-left: 4px;
      border-radius: 50%; border: 1px solid currentColor; font-size: 11px; cursor: help; vertical-align: middle;
    }
    .fee-helper .card-body { padding: 0.75rem 1rem; }
    .choice { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 12px; }
    .choice + .choice { border-top: 1px solid var(--bm-border); }
    .choice.recommended { background: color-mix(in srgb, var(--bm-accent, #f7931a) 12%, var(--bm-surface)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bm-accent) 35%, transparent); border-top-color: transparent; }
    .choice.recommended + .choice { border-top-color: transparent; }
    .label { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; }
    .label small { width: 100%; color: var(--bm-muted); }
    .badge { background: var(--bm-accent, #f7931a); color: var(--bm-on-accent, #111); font-size: 10px; font-weight: 700; letter-spacing: 0.02em; }
    .value { text-align: right; display: flex; flex-direction: column; }
    .rate { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--bm-accent, #f7931a); cursor: help; }
    .rate small { font-weight: 500; font-size: 12px; letter-spacing: 0; color: var(--bm-muted); }
    .total { font-size: 12px; color: var(--bm-muted); font-variant-numeric: tabular-nums; cursor: help; }
    .hint { margin: 10px 0 0; font-size: 12px; color: var(--bm-muted); }
  `],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeHelperComponent implements OnInit {
  choices$: Observable<FeeChoice[]>;
  vbytes = TYPICAL_TX_VBYTES;
  showFiat = false;

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    this.showFiat = this.stateService.network === '' || this.stateService.network === 'mainnet';
    this.choices$ = this.stateService.recommendedFees$.pipe(map((fees) => feeChoices(fees)));
  }
}
