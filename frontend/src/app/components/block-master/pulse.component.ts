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
 * Block Master 2.0 "pulse": the hero band at the top of the dashboard.
 * Answers the three questions people actually have: when is the next block, what does it cost to get in,
 * and how busy is the network. The big glass hex is the next block, filling up live.
 */
@Component({
  selector: 'app-bm-pulse',
  template: `
    <div class="main-title">Right now</div>
    <section class="bm-pulse card" aria-label="Network pulse" *ngIf="view$ | async as v">
      <div class="bm-pulse-copy">
        <div class="bm-pulse-kicker"><span class="bm-live-dot" aria-hidden="true"></span>Live</div>
        <h1 class="bm-pulse-title">
          <ng-container *ngIf="v.etaMinutes !== null; else etaLoading">
            <ng-container *ngIf="v.etaMinutes > 0; else anyMoment">Next block in <span class="bm-pulse-accent">~{{ v.etaMinutes }} min</span></ng-container>
            <ng-template #anyMoment>Next block <span class="bm-pulse-accent">any moment now</span></ng-template>
          </ng-container>
          <ng-template #etaLoading>Next block <span class="bm-pulse-accent">forming&hellip;</span></ng-template>
        </h1>
        <p class="bm-pulse-sub" *ngIf="v.fastestFee !== null">
          To get into it, pay about <strong>{{ v.fastestFee | number:'1.0-1' }} sat/vB</strong>.
          <span class="bm-info" ngbTooltip="Blocks arrive about every 10 minutes on average, but it is random: sometimes 1 minute, sometimes an hour. The fee is the rate that currently makes it into the next block." placement="bottom">?</span>
        </p>
        <dl class="bm-pulse-stats">
          <div class="bm-stat">
            <dt>Height</dt>
            <dd>{{ v.tip !== null ? (v.tip | number) : '…' }}</dd>
          </div>
          <div class="bm-stat">
            <dt>Last block</dt>
            <dd><app-time *ngIf="v.lastBlockTime; else dots" kind="since" [time]="v.lastBlockTime" [fastRender]="true"></app-time></dd>
          </div>
          <div class="bm-stat">
            <dt>Waiting</dt>
            <dd>{{ v.waitingTxs !== null ? (v.waitingTxs | number) + ' tx' : '…' }}</dd>
          </div>
          <div class="bm-stat">
            <dt ngbTooltip="How many full blocks it would take to clear everything waiting right now." placement="bottom" class="bm-tip">Backlog</dt>
            <dd>{{ v.backlogBlocks !== null ? (v.backlogBlocks | number:'1.0-1') + ' blocks' : '…' }}</dd>
          </div>
        </dl>
      </div>
      <a class="bm-pulse-vial" [routerLink]="['/mempool-block/0' | relativeUrl]" [style.--bm-level]="(v.nextFill ?? 0) + '%'"
         [attr.aria-label]="'Next block is ' + ((v.nextFill ?? 0) | number:'1.0-0') + ' percent full. Open the next block preview.'">
        <span class="bm-vial-hex" aria-hidden="true"><span class="bm-liquid-shimmer"></span></span>
        <span class="bm-vial-label">
          <strong>{{ v.nextFill !== null ? (v.nextFill | number:'1.0-0') + '%' : '…' }}</strong>
          <span>next block full</span>
        </span>
      </a>
    </section>
    <ng-template #dots>…</ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class BlockMasterPulseComponent implements OnInit {
  view$: Observable<PulseView>;

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
