import { ChangeDetectionStrategy, Component } from '@angular/core';

const KEY = 'block-master-explainer-collapsed';

/** "New to this?" — a three-point plain-language guide to the dashboard. Collapsible; remembers the choice. */
@Component({
  selector: 'app-bm-explainer',
  template: `
    <div class="main-title">What am I looking at?
      <button type="button" class="btn btn-link btn-sm toggle" (click)="toggle()">{{ collapsed ? 'show' : 'hide' }}</button>
    </div>
    <div class="card explainer">
      <div class="card-body" *ngIf="!collapsed; else small">
        <div class="point">
          <span class="dot waiting"></span>
          <div><strong>The mempool is a waiting room.</strong> When someone sends bitcoin, the transaction waits here until a miner puts it in a block. The blocks on the <em>left</em> of the strip above are predictions of what gets mined next.</div>
        </div>
        <div class="point">
          <span class="dot mined"></span>
          <div><strong>Blocks are pages in the ledger.</strong> About every 10 minutes a miner adds a new block. The blocks on the <em>right</em> of the strip are already mined and permanent.</div>
        </div>
        <div class="point">
          <span class="dot fee"></span>
          <div><strong>Fees are a bid for space.</strong> Blocks are limited in size, so miners pick the transactions paying the highest fee rate first. When the waiting room is busy, fees go up.</div>
        </div>
        <p class="more"><a [routerLink]="['/docs/faq']" fragment="what-is-a-mempool">Learn more in the FAQ</a> · Hover over anything with a dotted underline or a <span class="q">?</span> for a quick explanation.</p>
      </div>
      <ng-template #small><div class="card-body small-body">Mempool = waiting room · Blocks = pages of the ledger, about every 10 min · Fees = your bid for space.</div></ng-template>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .card { background-color: var(--bg); height: calc(100% - 14px); color: var(--fg); text-align: left; }
    .main-title { position: relative; color: var(--fg); opacity: var(--opacity); margin-top: -13px; font-size: 10px;
      text-transform: uppercase; font-weight: 500; text-align: center; padding-bottom: 3px; }
    .toggle { font-size: 12px; padding: 0 4px; vertical-align: baseline; color: var(--bm-accent, #f7931a); }
    .explainer .card-body { padding: 0.75rem 1rem; font-size: 14px; }
    .point { display: flex; gap: 10px; margin-bottom: 10px; line-height: 1.4; }
    .dot { flex: 0 0 12px; height: 12px; margin-top: 4px; border-radius: 3px; }
    .dot.waiting { background: linear-gradient(#5ecf68, #d6a32a); }
    .dot.mined { background: linear-gradient(#9339f4, #105fb0); }
    .dot.fee { background: var(--bm-accent, #f7931a); border-radius: 50%; }
    .more { margin: 0; font-size: 12px; color: var(--transparent-fg, #ffffff99); }
    .q { display: inline-flex; width: 14px; height: 14px; border: 1px solid currentColor; border-radius: 50%; font-size: 10px; align-items: center; justify-content: center; }
    .small-body { font-size: 13px; color: var(--transparent-fg, #ffffffaa); }
  `],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockMasterExplainerComponent {
  collapsed = false;

  constructor() {
    try { this.collapsed = window.localStorage.getItem(KEY) === '1'; } catch (e) { /* ignore */ }
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
    try { window.localStorage.setItem(KEY, this.collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
  }
}
