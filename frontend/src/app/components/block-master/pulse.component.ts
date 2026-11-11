import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Observable, combineLatest, timer } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { StateService } from '@app/services/state.service';

export interface PulseView {
  etaMinutes: number | null;
  fastestFee: number | null;
  nextFill: number | null;
  tip: number | null;
  lastBlockTime: number | null;
  waitingTxs: number | null;
  backlogBlocks: number | null;
}

/** Minutes until the next block is expected, from the last block time and the adjusted average interval. */
export function etaMinutes(lastBlockTimeSec: number, adjustedTimeAvgMs: number, nowMs: number): number {
  const remainingMs = lastBlockTimeSec * 1000 + adjustedTimeAvgMs - nowMs;
  return Math.max(0, Math.round(remainingMs / 60000));
}

/**
 * Block Master 3.0 stage: the editorial hero at the top of the dashboard (display headline, live figures)
 * next to the live chain sculpture (app-bm-chain-scene).
 * Answers the three questions people actually have: when is the next block, what does it cost to get in,
 * and how busy is the network. The big glass hex is the next block, filling up live.
 */
@Component({
  selector: 'app-bm-pulse',
  template: `
    <section class="bm-stage" aria-label="Network pulse" *ngIf="view$ | async as v">
      <div class="bm-stage-copy">
        <div class="bm-kicker"><span class="bm-live-dot" aria-hidden="true"></span>Live <span class="bm-kicker-sep">/</span> {{ today }}</div>
        <h1 class="bm-display">
          <ng-container *ngIf="v.tip !== null; else formingOnly">
            Block <em class="bm-display-num"><span *ngFor="let n of [v.tip + 1]" class="bm-roll">{{ n | number }}</span></em><br>is forming<span class="bm-display-dot">.</span>
          </ng-container>
          <ng-template #formingOnly>The next block<br>is forming<span class="bm-display-dot">.</span></ng-template>
        </h1>
        <p class="bm-lede">
          <ng-container *ngIf="v.etaMinutes !== null; else noEta">
            <ng-container *ngIf="v.etaMinutes > 0; else anyMoment">Expected in about <strong>{{ v.etaMinutes }} min</strong>.</ng-container>
            <ng-template #anyMoment>It could be found <strong>any moment now</strong>.</ng-template>
          </ng-container>
          <ng-template #noEta>Gathering live data from the node.</ng-template>
          <ng-container *ngIf="v.fastestFee !== null"> Pay about <strong>{{ v.fastestFee | number:'1.0-1' }} sat/vB</strong> to get in.</ng-container>
          <span class="bm-info" ngbTooltip="Blocks arrive about every 10 minutes on average, but it is random: sometimes 1 minute, sometimes an hour. The fee is the rate that currently makes it into the next block." placement="bottom">?</span>
        </p>
        <dl class="bm-stage-stats">
          <div class="bm-stat">
            <dt>Last sealed</dt>
            <dd><span *ngFor="let n of [v.tip]" class="bm-roll">{{ n !== null ? (n | number) : '…' }}</span></dd>
          </div>
          <div class="bm-stat">
            <dt>Found</dt>
            <dd><app-time *ngIf="v.lastBlockTime; else dots" kind="since" [time]="v.lastBlockTime" [fastRender]="true"></app-time></dd>
          </div>
          <div class="bm-stat">
            <dt>Waiting</dt>
            <dd><span *ngFor="let n of [v.waitingTxs]" class="bm-roll">{{ n !== null ? (n | number) : '…' }}</span><small> tx</small></dd>
          </div>
          <div class="bm-stat">
            <dt ngbTooltip="How many full blocks it would take to clear everything waiting right now." placement="bottom" class="bm-tip">Backlog</dt>
            <dd>{{ v.backlogBlocks !== null ? (v.backlogBlocks | number:'1.0-1') : '…' }}<small> blocks</small></dd>
          </div>
        </dl>
        <div class="bm-stage-actions">
          <a class="bm-cta" [routerLink]="['/mempool-block/0' | relativeUrl]">See the next block <span aria-hidden="true">&rarr;</span></a>
          <button type="button" class="bm-cta-quiet" (click)="scrollToFees()">What fee should I pay?</button>
        </div>
      </div>
      <app-bm-chain-scene class="bm-stage-scene"></app-bm-chain-scene>
    </section>
    <ng-template #dots>…</ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class BlockMasterPulseComponent implements OnInit {
  view$: Observable<PulseView>;
  today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  scrollToFees(): void {
    const el = document.getElementById('fee-helper');
    if (el) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      (el.querySelector('.card') as HTMLElement | null)?.classList.add('bm-attention');
      setTimeout(() => (el.querySelector('.card') as HTMLElement | null)?.classList.remove('bm-attention'), 1600);
    }
  }

  constructor(private stateService: StateService) {}

  ngOnInit(): void {
    const blockVSize = this.stateService.blockVSize || 1000000;
    this.view$ = combineLatest([
      this.stateService.recommendedFees$.pipe(startWith(null)),
      this.stateService.mempoolInfo$.pipe(startWith(null)),
      this.stateService.mempoolBlocks$.pipe(startWith(null)),
      this.stateService.blocks$.pipe(startWith(null)),
      this.stateService.difficultyAdjustment$.pipe(startWith(null)),
      timer(0, 15000),
    ]).pipe(
      map(([fees, info, mBlocks, blocks, da]) => {
        const last = blocks?.length ? blocks[0] : null;
        return {
          etaMinutes: last && da?.adjustedTimeAvg ? etaMinutes(last.timestamp, da.adjustedTimeAvg, Date.now()) : null,
          fastestFee: fees ? fees.fastestFee : null,
          nextFill: mBlocks?.length ? Math.min(100, (mBlocks[0].blockVSize / blockVSize) * 100) : null,
          tip: last ? last.height : null,
          lastBlockTime: last ? last.timestamp : null,
          waitingTxs: info ? info.size : null,
          backlogBlocks: info ? info.bytes / blockVSize : null,
        };
      }),
    );
  }
}
