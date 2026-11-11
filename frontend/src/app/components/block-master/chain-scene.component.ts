import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild,
} from '@angular/core';
import { Subscription, combineLatest } from 'rxjs';
import { StateService } from '@app/services/state.service';
import { ThemeService } from '@app/services/theme.service';
import { HolidayThemeService } from '@app/services/holiday-theme.service';
import { BlockExtended } from '@interfaces/node-api.interface';
import { feeLevels } from '@app/app.constants';
import { mix } from '@app/shared/palettes';
import {
  SceneAccent, SCENE_DEFAULT, Slot, easeInOutSine, easeOutCubic, feeLevelIndex, formatHeight, isNewTip, mulberry32,
  particleBudget, sceneAccentFor, slotAt, spawnRate, STAGE,
} from '@app/shared/scene';

interface Drop { x: number; y: number; vy: number; color: string; r: number; }
interface Ripple { x: number; t: number; color: string; }
interface Mote { x: number; y: number; v: number; s: number; a: number; p: number; rot: number; color: string; life: number; }
interface Spark { x: number; y: number; vx: number; vy: number; t: number; life: number; color: string; }
interface Found { height: number; pool: string; txs: number; replay: boolean; }

interface SceneColors {
  bg: string; glow: string; glow2: string; surface: string; fg: string; muted: string;
  blockA: string; blockB: string; accent: string; accent2: string; glass: string; dark: boolean;
}

const TAU = Math.PI * 2;
const HEX_Y = 0.42; // vertical squash of the hexagonal top face (3/4 view)

/**
 * Block Master 3.0 "living sculpture": the chain drawn on a canvas as lit hex prisms receding into depth,
 * linked by a glowing hash-link, with a glass vial in front that fills with live fee drops.
 * A new block flashes, crystallizes and slides into the chain. Holidays add their own scene layer.
 * Runs outside Angular, pauses when off screen or in a background tab, caps the pixel ratio, and draws a single
 * still frame when the user prefers reduced motion.
 */
@Component({
  selector: 'app-bm-chain-scene',
  template: `
    <figure class="bm-scene" [class.bm-scene-static]="reduced">
      <div class="bm-scene-canvas">
        <canvas #canvas role="img" [attr.aria-label]="ariaLabel"></canvas>
        <div class="bm-found" *ngIf="found" role="status" aria-live="polite">
          <span class="bm-found-kicker">{{ found.replay ? 'Latest block' : 'New block found' }}</span>
          <strong class="bm-found-height"><span class="bm-hash">#</span>{{ found.height | number }}</strong>
          <span class="bm-found-meta">{{ found.pool }} &middot; {{ found.txs | number }} transactions</span>
          <button type="button" class="bm-found-close" (click)="dismissFound()" aria-label="Dismiss">&times;</button>
        </div>
      </div>
      <figcaption class="bm-scene-caption"><span class="bm-fig">Fig. 1</span> The chain, live. {{ caption }}</figcaption>
    </figure>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ChainSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef: ElementRef<HTMLCanvasElement>;

  caption = SCENE_DEFAULT.caption;
  ariaLabel = 'Live picture of the blockchain: recent blocks receding into the distance and the next block filling with fees.';
  found: Found | null = null;
  reduced = false;

  private ctx: CanvasRenderingContext2D | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private raf = 0;
  private visible = true;
  private lastFrame = 0;
  private time = 0;
  private colors: SceneColors;
  private accent: SceneAccent = SCENE_DEFAULT;
  private feeColors: string[] = ['#5e8cff'];
  private blocks: BlockExtended[] = [];
  private fillTarget = 0;
  private fill = 0;
  private rate = 6;
  private spawnAcc = 0;
  private drops: Drop[] = [];
  private ripples: Ripple[] = [];
  private motes: Mote[] = [];
  private sparks: Spark[] = [];
  private fireworkIn = 2;
  private celebrateT = -1;
  private lastTip: number | null = null;
  private foundTimer: ReturnType<typeof setTimeout> | null = null;
  private rand = mulberry32(21);
  private subs: Subscription[] = [];
  private ro: ResizeObserver | null = null;
  private io: IntersectionObserver | null = null;
  private mq: MediaQueryList | null = null;
  private onVisibility = (): void => this.updateLoop();
  private onMotion = (): void => { this.reduced = !!this.mq?.matches; this.cd.markForCheck(); this.updateLoop(); };

  constructor(
    private zone: NgZone,
    private cd: ChangeDetectorRef,
    private host: ElementRef<HTMLElement>,
    private stateService: StateService,
    private themeService: ThemeService,
    private holidayTheme: HolidayThemeService,
  ) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!this.ctx) {
      this.host.nativeElement.classList.add('bm-scene-fallback');
      return;
    }
    this.mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.reduced = !!this.mq?.matches;
    this.mq?.addEventListener?.('change', this.onMotion);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.readColors();

    this.zone.runOutsideAngular(() => {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas.parentElement as HTMLElement);
      this.io = new IntersectionObserver((entries) => { this.visible = entries.some((e) => e.isIntersecting); this.updateLoop(); });
      this.io.observe(canvas);
      this.resize();

      this.subs.push(this.holidayTheme.state$.subscribe((state) => {
        this.accent = sceneAccentFor(state.active?.holiday.id);
        this.zone.run(() => { this.caption = this.accent.caption; this.cd.markForCheck(); });
        // the service writes the CSS variables synchronously; read them on the next tick to be safe
        setTimeout(() => { this.readColors(); this.seedMotes(); this.drawStill(); }, 0);
      }));
      this.subs.push(combineLatest([this.stateService.mempoolBlocks$]).subscribe(([mBlocks]) => {
        const next = mBlocks?.[0];
        if (next) {
          this.fillTarget = Math.min(1, next.blockVSize / (this.stateService.blockVSize || 1000000));
          const colors = this.themeService.mempoolFeeColors;
          const range = next.feeRange?.length ? next.feeRange : [next.medianFee || 1];
          this.feeColors = range.map((r) => '#' + colors[Math.min(feeLevelIndex(r, feeLevels), colors.length - 1)]);
        }
        this.drawStill();
      }));
      this.subs.push(this.stateService.vbytesPerSecond$.subscribe((v) => { this.rate = spawnRate(v); }));
      this.subs.push(this.stateService.blocks$.subscribe((blocks) => {
        const tip = blocks?.[0]?.height ?? null;
        const fresh = isNewTip(this.lastTip, tip);
        this.blocks = (blocks || []).slice(0, 10);
        if (fresh) {
          this.celebrate(false);
        }
        this.lastTip = tip;
        this.updateAria();
        this.drawStill();
      }));

      if (typeof document.fonts?.load === 'function') {
        document.fonts.load("italic 600 16px 'Fraunces Variable'").then(() => this.drawStill()).catch(() => undefined);
      }
      // ?celebrate=1 replays the latest block's arrival (for demos and screenshots)
      try {
        if (new URLSearchParams(window.location.search).get('celebrate') === '1') {
          setTimeout(() => this.celebrate(true), 2600);
        }
      } catch { /* ignore */ }
      this.updateLoop();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.raf);
    this.subs.forEach((s) => s.unsubscribe());
    this.ro?.disconnect();
    this.io?.disconnect();
    this.mq?.removeEventListener?.('change', this.onMotion);
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.foundTimer) {
      clearTimeout(this.foundTimer);
    }
  }

  dismissFound(): void {
    this.found = null;
    this.cd.markForCheck();
  }

  // ---------- lifecycle helpers ----------

  private updateLoop(): void {
    const shouldRun = !!this.ctx && this.visible && !document.hidden && !this.reduced;
    if (shouldRun && !this.raf) {
      this.lastFrame = performance.now();
      const tick = (now: number): void => {
        const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
        this.lastFrame = now;
        this.step(dt);
        this.draw();
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    } else if (!shouldRun && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    if (!shouldRun) {
      this.drawStill();
    }
  }

  private resize(): void {
    const canvas = this.canvasRef.nativeElement;
    const box = canvas.parentElement as HTMLElement;
    const w = Math.max(240, box.clientWidth);
    const h = Math.max(200, box.clientHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(w * this.dpr);
    canvas.height = Math.round(h * this.dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    this.w = w;
    this.h = h;
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.seedMotes();
    this.drawStill();
  }

  private drawStill(): void {
    if (!this.ctx || this.raf) {
      return;
    }
    if (this.reduced || !this.visible || document.hidden) {
      // a composed still: liquid at its level, a few frozen drops
      this.fill = this.fillTarget;
      if (!this.drops.length && this.w) {
        const r = mulberry32(7);
        const v = this.vialSlot();
        for (let i = 0; i < 9; i++) {
          this.drops.push({ x: v.x + (r() - 0.5) * this.radius(1) * 1.2, y: this.h * (0.08 + r() * 0.42), vy: 0, color: this.pickFee(r), r: 2 });
        }
      }
    }
    this.draw();
  }

  private readColors(): void {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string): string => {
      const s = cs.getPropertyValue(name).trim();
      return /^#[0-9a-f]{6}$/i.test(s) ? s : fallback;
    };
    this.colors = {
      bg: v('--bm-bg', '#0d0f1e'), glow: v('--bm-glow', '#2b2470'), glow2: v('--bm-glow-2', '#3b1f4f'),
      surface: v('--bm-surface', '#161a2f'), fg: v('--fg', '#eef0fb'), muted: v('--bm-muted', '#aab0cf'),
      blockA: v('--mainnet-alt', '#7b3ff2'), blockB: v('--primary', '#2f5fd0'), accent: v('--bm-accent', '#f7931a'),
      accent2: v('--bm-accent-2', '#ffd35c'), glass: v('--bm-glass', '#283062'),
      dark: (cs.getPropertyValue('--bm-scheme').trim() || 'dark') !== 'light',
    };
  }

  private updateAria(): void {
    const tip = this.blocks[0]?.height;
    const label = tip ? `Live picture of the blockchain. The newest sealed block is ${formatHeight(tip)}; the next block is ` +
      `${Math.round(this.fillTarget * 100)} percent full.` : this.ariaLabel;
    if (label !== this.ariaLabel) {
      this.zone.run(() => { this.ariaLabel = label; this.cd.markForCheck(); });
    }
  }

  private celebrate(replay: boolean): void {
    const b = this.blocks[0];
    if (!b) {
      return;
    }
    this.celebrateT = this.reduced ? -1 : 0;
    if (!this.reduced) {
      const v = this.vialSlot();
      const top = v.y - this.prismHeight(1, 1);
      for (let i = 0; i < 90; i++) {
        const a = this.rand() * TAU;
        const sp = 80 + this.rand() * 260;
        this.sparks.push({ x: v.x, y: top, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0, life: 0.9 + this.rand() * 0.9,
          color: [this.colors.accent, this.colors.accent2, '#ffffff', ...this.accent.colors][i % (3 + this.accent.colors.length)] });
      }
    }
    this.zone.run(() => {
      this.found = { height: b.height, pool: b.extras?.pool?.name || 'Unknown miner', txs: b.tx_count, replay };
      this.cd.markForCheck();
    });
    if (this.foundTimer) {
      clearTimeout(this.foundTimer);
    }
    this.foundTimer = setTimeout(() => this.zone.run(() => this.dismissFound()), 9000);
  }

  // ---------- simulation ----------

  private compact(): boolean {
    return this.w < 640;
  }

  private radius(scale: number): number {
    const base = Math.min(this.w * (this.compact() ? 0.095 : 0.062), this.h * 0.15);
    return base * scale;
  }

  private prismHeight(scale: number, fullness: number): number {
    return this.radius(scale) * (0.85 + 0.55 * Math.max(0.35, Math.min(1, fullness)));
  }

  private vialSlot(): Slot {
    return { x: (this.compact() ? 0.84 : STAGE.vial) * this.w, y: STAGE.y0 * this.h, scale: 1.12, alpha: 1 };
  }

  private liquidY(): number {
    const v = this.vialSlot();
    const H = this.prismHeight(v.scale, 1);
    return v.y - H * Math.max(0.04, this.fill);
  }

  private pickFee(r: () => number = Math.random): string {
    return this.feeColors[Math.floor(r() * this.feeColors.length)] || '#5e8cff';
  }

  private seedMotes(): void {
    if (!this.w) {
      return;
    }
    const r = mulberry32(99);
    const n = Math.round((this.accent.density * this.w) / 1000);
    this.motes = Array.from({ length: n }, () => this.newMote(r, true));
  }

  private newMote(r: () => number, anywhere: boolean): Mote {
    const k = this.accent.ambient;
    const rising = k === 'embers' || k === 'sparks';
    return {
      x: r() * this.w,
      y: anywhere ? r() * this.h : (rising ? this.h + 10 : -10),
      v: k === 'snow' ? 14 + r() * 26 : k === 'bats' ? 40 + r() * 40 : rising ? 20 + r() * 40 : k === 'confetti' || k === 'leaves' || k === 'petals' ? 24 + r() * 30 : 0,
      s: k === 'bats' ? 7 + r() * 6 : k === 'leaves' ? 4 + r() * 3 : k === 'petals' || k === 'confetti' ? 2.5 + r() * 2.5 : 0.6 + r() * 1.6,
      a: 0.35 + r() * 0.6,
      p: r() * TAU,
      rot: r() * TAU,
      color: this.accent.colors[Math.floor(r() * this.accent.colors.length)],
      life: r(),
    };
  }

  private step(dt: number): void {
    this.time += dt;
    this.fill += (this.fillTarget - this.fill) * Math.min(1, dt * 1.5);

    // fee drops
    const budget = particleBudget(this.w, false);
    this.spawnAcc += this.rate * dt;
    const v = this.vialSlot();
    const R = this.radius(v.scale);
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.drops.length < budget) {
        this.drops.push({ x: v.x + (Math.random() - 0.5) * R * 1.3, y: -8, vy: (200 + Math.random() * 140) * (this.h / 460),
          color: this.pickFee(), r: 1.4 + Math.random() * 1.5 });
      }
    }
    const surface = this.liquidY();
    this.drops = this.drops.filter((d) => {
      d.vy += 120 * dt;
      d.y += d.vy * dt;
      if (d.y >= surface) {
        if (this.ripples.length < 24) {
          this.ripples.push({ x: d.x, t: 0, color: d.color });
        }
        return false;
      }
      return true;
    });
    this.ripples = this.ripples.filter((r) => (r.t += dt) < 0.9);

    // ambient
    const k = this.accent.ambient;
    for (const m of this.motes) {
      m.p += dt;
      if (k === 'snow') {
        m.y += m.v * dt; m.x += Math.sin(m.p * 0.9) * 12 * dt;
      } else if (k === 'leaves' || k === 'petals' || k === 'confetti') {
        m.y += m.v * dt; m.x += Math.sin(m.p * 1.3) * 22 * dt; m.rot += dt * (k === 'confetti' ? 4 : 1.4);
      } else if (k === 'embers' || k === 'sparks') {
        m.y -= m.v * dt; m.x += Math.sin(m.p * 2) * 8 * dt; m.life -= dt * 0.25;
      } else if (k === 'bats') {
        m.x += m.v * dt; m.y += Math.sin(m.p * 1.7) * 10 * dt;
      }
      if (m.y > this.h + 12 || m.y < -14 || m.x > this.w + 20 || m.life < 0) {
        Object.assign(m, this.newMote(Math.random, false));
        if (k === 'bats') { m.x = -20; m.y = this.h * (0.08 + Math.random() * 0.3); }
      }
    }

    // fireworks
    if (this.accent.fireworks) {
      this.fireworkIn -= dt;
      if (this.fireworkIn <= 0) {
        this.fireworkIn = 2.2 + Math.random() * 2.4;
        const fx = this.w * (0.12 + Math.random() * 0.5);
        const fy = this.h * (0.1 + Math.random() * 0.25);
        const color = this.accent.colors[Math.floor(Math.random() * this.accent.colors.length)];
        for (let i = 0; i < 46; i++) {
          const a = (i / 46) * TAU;
          const sp = 60 + Math.random() * 70;
          this.sparks.push({ x: fx, y: fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 1.1 + Math.random() * 0.6, color });
        }
      }
    }
    this.sparks = this.sparks.filter((s) => {
      s.t += dt; s.vy += 70 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 1 - dt * 0.8;
      return s.t < s.life;
    });

    if (this.celebrateT >= 0) {
      this.celebrateT += dt;
      if (this.celebrateT > 2.8) {
        this.celebrateT = -1;
      }
    }
  }

  // ---------- drawing ----------

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx || !this.w || !this.colors) {
      return;
    }
    const { w, h } = this;
    const c = this.colors;
    ctx.clearRect(0, 0, w, h);

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, mix(c.bg, c.glow, c.dark ? 0.55 : 0.6));
    sky.addColorStop(0.55, c.bg);
    sky.addColorStop(1, mix(c.bg, c.glow2, 0.35));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const tint = ctx.createLinearGradient(0, 0, 0, h);
    tint.addColorStop(0, this.accent.sky[0]);
    tint.addColorStop(1, this.accent.sky[1]);
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);

    this.drawSetPieces(ctx);
    this.drawMotes(ctx, true);
    this.drawFloor(ctx);
    this.drawChain(ctx);
    this.drawVial(ctx);
    this.drawSparks(ctx);
    this.drawMotes(ctx, false);
    this.drawCelebration(ctx);
  }

  private drawSetPieces(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this;
    const t = this.time;
    if (this.accent.sunrise) {
      const g = ctx.createRadialGradient(w * 0.35, h * STAGE.vy + h * 0.1, 0, w * 0.35, h * STAGE.vy + h * 0.1, h * 0.75);
      g.addColorStop(0, 'rgba(255,214,130,0.55)');
      g.addColorStop(0.35, 'rgba(240,160,80,0.18)');
      g.addColorStop(1, 'rgba(240,160,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#ffd38a';
      ctx.lineWidth = 2;
      for (let i = -5; i <= 5; i++) {
        const a = -Math.PI / 2 + i * 0.22 + Math.sin(t * 0.2) * 0.02;
        ctx.beginPath();
        ctx.moveTo(w * 0.35 + Math.cos(a) * h * 0.18, h * 0.4 + Math.sin(a) * h * 0.18);
        ctx.lineTo(w * 0.35 + Math.cos(a) * h * 0.6, h * 0.4 + Math.sin(a) * h * 0.6);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (this.accent.moon) {
      const mx = w * 0.18;
      const my = h * 0.2;
      const r = Math.min(w, h) * 0.08;
      const halo = ctx.createRadialGradient(mx, my, r * 0.6, mx, my, r * 3);
      halo.addColorStop(0, 'rgba(255,214,150,0.35)');
      halo.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(mx - r * 3, my - r * 3, r * 6, r * 6);
      ctx.fillStyle = '#ffd98f';
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,130,60,0.25)';
      ctx.beginPath(); ctx.arc(mx - r * 0.3, my - r * 0.2, r * 0.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + r * 0.35, my + r * 0.3, r * 0.14, 0, TAU); ctx.fill();
    }
    if (this.accent.beams) {
      ctx.save();
      ctx.globalCompositeOperation = this.colors.dark ? 'lighter' : 'source-over';
      for (const [bx, phase, color] of [[0.22, 0, 'rgba(200,215,255,0.09)'], [0.7, 2.1, 'rgba(255,230,170,0.08)']] as [number, number, string][]) {
        const a = -Math.PI / 2 + Math.sin(t * 0.25 + phase) * 0.45;
        const ox = w * bx;
        const oy = h * 1.02;
        const len = h * 1.4;
        const spread = 0.07;
        const g = ctx.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(a - spread) * len, oy + Math.sin(a - spread) * len);
        ctx.lineTo(ox + Math.cos(a + spread) * len, oy + Math.sin(a + spread) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawMotes(ctx: CanvasRenderingContext2D, back: boolean): void {
    const k = this.accent.ambient;
    ctx.save();
    for (let i = back ? 0 : 1; i < this.motes.length; i += 2) {
      const m = this.motes[i];
      const tw = k === 'dust' || k === 'stars' ? 0.45 + 0.55 * Math.sin(m.p * 1.6 + m.rot) : 1;
      ctx.globalAlpha = Math.max(0, m.a * tw * (k === 'embers' || k === 'sparks' ? Math.max(0, m.life) : 1)) * (this.colors.dark ? 1 : 0.75);
      ctx.fillStyle = k === 'dust' ? (this.colors.dark ? '#ffffff' : this.colors.muted) : m.color;
      if (k === 'leaves' || k === 'petals') {
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, m.s * (k === 'leaves' ? 1.6 : 1.1), m.s * 0.7, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (k === 'confetti') {
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
        ctx.fillRect(-m.s, -m.s * 0.4, m.s * 2, m.s * 0.8 * Math.abs(Math.cos(m.p * 3)) + 0.4);
        ctx.restore();
      } else if (k === 'bats') {
        const flap = Math.sin(m.p * 12) * 0.6;
        ctx.save(); ctx.translate(m.x, m.y); ctx.scale(m.s / 10, m.s / 10);
        ctx.fillStyle = this.colors.dark ? '#0b0712' : '#2a1d3d';
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.quadraticCurveTo(-5, -6 * flap - 2, -11, -2 * flap); ctx.quadraticCurveTo(-6, 1, -3, 3);
        ctx.lineTo(0, 1.5); ctx.lineTo(3, 3); ctx.quadraticCurveTo(6, 1, 11, -2 * flap); ctx.quadraticCurveTo(5, -6 * flap - 2, 0, 0);
        ctx.fill();
        ctx.restore();
      } else if (k === 'stars' && m.s > 1.6) {
        this.sparkle(ctx, m.x, m.y, m.s * 2.4);
      } else {
        ctx.beginPath(); ctx.arc(m.x, m.y, m.s, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  private sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  private drawFloor(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this;
    const c = this.colors;
    const vx = Math.max(STAGE.vx, -0.1) * w;
    const vy = STAGE.vy * h;
    ctx.save();
    const floor = ctx.createLinearGradient(0, vy, 0, h);
    floor.addColorStop(0, 'rgba(0,0,0,0)');
    floor.addColorStop(1, c.dark ? 'rgba(0,0,0,0.35)' : 'rgba(20,24,43,0.08)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, vy, w, h - vy);
    // perspective grid converging on the vanishing point
    ctx.strokeStyle = c.dark ? 'rgba(255,255,255,0.05)' : 'rgba(20,24,43,0.06)';
    ctx.lineWidth = 1;
    for (let i = -6; i <= 14; i++) {
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + i * w * 0.12, h);
      ctx.stroke();
    }
    for (let i = 1; i < 9; i++) {
      const y = vy + (h - vy) * Math.pow(i / 9, 1.8);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();
  }

  /** Hex top vertices (k = 0..5) of a prism standing at (x, baseY). */
  private hex(x: number, topY: number, R: number): [number, number][] {
    return Array.from({ length: 6 }, (_, k) => [x + R * Math.cos((k * Math.PI) / 3), topY + R * HEX_Y * Math.sin((k * Math.PI) / 3)] as [number, number]);
  }

  private poly(ctx: CanvasRenderingContext2D, pts: [number, number][]): void {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  }

  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, alpha: number): void {
    const g = ctx.createRadialGradient(x, y, 0, x, y, R * 1.7);
    g.addColorStop(0, `rgba(0,0,0,${0.45 * alpha * (this.colors.dark ? 1 : 0.4)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y + R * 0.1, R * 1.7, R * 0.5, 0, 0, TAU);
    ctx.fill();
  }

  private drawGem(ctx: CanvasRenderingContext2D, s: Slot, block: BlockExtended, newest: boolean, glow = 0, label = true): { x: number; y: number } {
    const c = this.colors;
    const R = this.radius(s.scale);
    const fullness = block.weight ? block.weight / 4000000 : 1;
    const H = this.prismHeight(s.scale, fullness);
    const top = s.y - H;
    const v = this.hex(s.x, top, R);
    const b = v.map(([x, y]) => [x, y + H] as [number, number]);
    ctx.save();
    ctx.globalAlpha = s.alpha;
    this.drawShadow(ctx, s.x, s.y, R, s.alpha);
    // side faces: right-front (k 0..1), front (1..2), left-front (2..3)
    const faces: [number, string, string][] = [
      [0, mix(c.blockB, '#000000', 0.32), mix(c.blockB, '#000000', 0.5)],
      [1, mix(c.blockA, c.blockB, 0.35), mix(c.blockB, '#000000', 0.2)],
      [2, mix(c.blockA, '#ffffff', 0.18), mix(c.blockA, '#000000', 0.12)],
    ];
    for (const [k, c1, c2] of faces) {
      const g = ctx.createLinearGradient(0, top, 0, s.y);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      this.poly(ctx, [v[k], v[k + 1], b[k + 1], b[k]]);
      ctx.fill();
    }
    const tg = ctx.createLinearGradient(s.x - R, top - R * HEX_Y, s.x + R, top + R * HEX_Y);
    tg.addColorStop(0, mix(c.blockA, '#ffffff', 0.5));
    tg.addColorStop(1, mix(c.blockA, c.blockB, 0.5));
    ctx.fillStyle = tg;
    this.poly(ctx, v);
    ctx.fill();
    // inner "table" line on the lid and crisp edges
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(0.6, 1 * s.scale);
    this.poly(ctx, this.hex(s.x, top, R * 0.62));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    for (const k of [1, 2]) {
      ctx.beginPath(); ctx.moveTo(v[k][0], v[k][1]); ctx.lineTo(b[k][0], b[k][1]); ctx.stroke();
    }
    if (glow > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = glow * 0.8;
      ctx.fillStyle = c.accent;
      this.poly(ctx, v);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (!label) {
      ctx.restore();
      return { x: s.x, y: top };
    }
    ctx.globalAlpha = s.alpha * (newest ? 1 : 0.85);
    const size = Math.max(9, (newest ? 17 : 14) * s.scale);
    ctx.font = `italic 600 ${size}px 'Fraunces Variable', Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = newest ? c.fg : c.muted;
    ctx.fillText(formatHeight(block.height), s.x, top - R * HEX_Y - 8 * s.scale);
    ctx.restore();
    return { x: s.x, y: top };
  }

  private drawChain(ctx: CanvasRenderingContext2D): void {
    if (!this.blocks.length) {
      return;
    }
    const compact = this.compact();
    const count = Math.min(this.blocks.length, compact ? 5 : 9);
    const e = this.celebrateT >= 0 ? easeOutCubic(this.celebrateT / 1.3) : 1;
    const vial = this.vialSlot();
    const tops: { x: number; y: number }[] = [];
    const slots: Slot[] = [];
    for (let i = 0; i < count; i++) {
      if (i === 0 && e < 1) {
        const s0 = slotAt(0, this.w, this.h, compact);
        slots[i] = { x: vial.x + (s0.x - vial.x) * e, y: vial.y + (s0.y - vial.y) * e, scale: vial.scale + (s0.scale - vial.scale) * e, alpha: 0.4 + 0.6 * e };
      } else {
        slots[i] = slotAt(i - 1 + e, this.w, this.h, compact);
      }
    }
    // label newest first; skip any label that would collide with the previous one (far blocks bunch up)
    const labels: boolean[] = [];
    let lastX = Infinity;
    for (let i = 0; i < count; i++) {
      const size = Math.max(9, (i === 0 ? 17 : 14) * slots[i].scale);
      const width = formatHeight(this.blocks[i].height).length * size * 0.56 + 10;
      labels[i] = Math.abs(lastX - slots[i].x) >= width;
      if (labels[i]) {
        lastX = slots[i].x;
      }
    }
    for (let i = count - 1; i >= 0; i--) {
      tops[i] = this.drawGem(ctx, slots[i], this.blocks[i], i === 0, i === 0 && this.celebrateT >= 0 ? Math.max(0, 1 - this.celebrateT / 1.6) : 0, labels[i]);
    }
    // the hash-link: a glowing thread from the oldest block to the newest, with pulses travelling forward
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = count - 1; i > 0; i--) {
      const a = tops[i];
      const b = tops[i - 1];
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, `rgba(255,255,255,0)`);
      g.addColorStop(1, this.colors.accent);
      ctx.strokeStyle = g;
      ctx.globalAlpha = 0.25 + 0.6 * (1 - i / count);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const mx = (a.x + b.x) / 2;
      const my = Math.min(a.y, b.y) - 14 * (1 - i / count);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
      // pulse
      const p = (this.time * 0.45 + i * 0.17) % 1;
      const px = (1 - p) * (1 - p) * a.x + 2 * (1 - p) * p * mx + p * p * b.x;
      const py = (1 - p) * (1 - p) * a.y + 2 * (1 - p) * p * my + p * p * b.y;
      ctx.fillStyle = this.colors.accent2;
      ctx.globalAlpha = 0.9 * (1 - i / count);
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, TAU); ctx.fill();
      // holiday string lights
      if (this.accent.lights) {
        for (let j = 1; j < 4; j++) {
          const q = j / 4;
          const lx = (1 - q) * (1 - q) * a.x + 2 * (1 - q) * q * mx + q * q * b.x;
          const ly = (1 - q) * (1 - q) * a.y + 2 * (1 - q) * q * (my + 8) + q * q * b.y + 4;
          const on = Math.sin(this.time * 2.4 + i * 1.7 + j * 2.1) > -0.2;
          ctx.globalAlpha = on ? 0.95 : 0.3;
          ctx.fillStyle = this.accent.lights[(i + j) % this.accent.lights.length];
          ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, TAU); ctx.fill();
          if (on) {
            ctx.globalAlpha = 0.25;
            ctx.beginPath(); ctx.arc(lx, ly, 10, 0, TAU); ctx.fill();
          }
        }
      }
    }
    ctx.restore();
    // a spotlight from above on the newest block
    const s0 = tops[0];
    if (s0) {
      ctx.save();
      ctx.globalCompositeOperation = this.colors.dark ? 'lighter' : 'source-over';
      const g = ctx.createLinearGradient(s0.x, 0, s0.x, s0.y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, this.colors.dark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.3)');
      ctx.fillStyle = g;
      const R = this.radius(1);
      ctx.beginPath();
      ctx.moveTo(s0.x - R * 0.3, 0); ctx.lineTo(s0.x + R * 0.3, 0); ctx.lineTo(s0.x + R * 1.4, s0.y); ctx.lineTo(s0.x - R * 1.4, s0.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawVial(ctx: CanvasRenderingContext2D): void {
    const c = this.colors;
    const s = this.vialSlot();
    const R = this.radius(s.scale);
    const H = this.prismHeight(s.scale, 1);
    const top = s.y - H;
    const v = this.hex(s.x, top, R);
    const b = v.map(([x, y]) => [x, y + H] as [number, number]);
    const ly = this.liquidY();
    const lv = this.hex(s.x, ly, R);
    ctx.save();
    this.drawShadow(ctx, s.x, s.y, R, 1);
    // falling fee drops (behind the glass front)
    for (const d of this.drops) {
      ctx.strokeStyle = d.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = d.r * 0.9;
      ctx.beginPath(); ctx.moveTo(d.x, d.y - Math.min(16, d.vy * 0.04 + 4)); ctx.lineTo(d.x, d.y); ctx.stroke();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // back of the glass
    ctx.fillStyle = mix(c.glass, c.bg, 0.25);
    ctx.globalAlpha = 0.55;
    this.poly(ctx, [v[0], v[1], v[2], v[3], b[3], b[2], b[1], b[0]]);
    ctx.fill();
    this.poly(ctx, v);
    ctx.fill();
    ctx.globalAlpha = 1;
    // liquid
    const fees = this.feeColors.length ? this.feeColors : ['#5e8cff'];
    for (const [k, shade] of [[0, 0.32], [1, 0.08], [2, 0]] as [number, number][]) {
      const g = ctx.createLinearGradient(0, ly, 0, s.y);
      fees.forEach((col, i) => g.addColorStop(fees.length === 1 ? 0 : i / (fees.length - 1), mix(col, '#000000', shade)));
      ctx.fillStyle = g;
      this.poly(ctx, [lv[k], lv[k + 1], b[k + 1], b[k]]);
      ctx.fill();
    }
    ctx.fillStyle = mix(fees[0], '#ffffff', 0.3);
    ctx.globalAlpha = 0.9;
    this.poly(ctx, lv);
    ctx.fill();
    // ripples on the surface
    ctx.save();
    this.poly(ctx, lv);
    ctx.clip();
    for (const r of this.ripples) {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.35 * (1 - r.t / 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(r.x, ly + (r.x - s.x) * 0, 3 + r.t * 16, (3 + r.t * 16) * HEX_Y, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    // glass sheen and accent rim
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    this.poly(ctx, [v[2], [v[2][0] + R * 0.28, v[2][1] + R * 0.05], [b[2][0] + R * 0.28, b[2][1] + R * 0.05], b[2]]);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1.6;
    this.poly(ctx, v);
    ctx.stroke();
    ctx.beginPath();
    for (const k of [0, 1, 2, 3]) {
      ctx.moveTo(v[k][0], v[k][1]); ctx.lineTo(b[k][0], b[k][1]);
    }
    ctx.moveTo(b[0][0], b[0][1]); ctx.lineTo(b[1][0], b[1][1]); ctx.lineTo(b[2][0], b[2][1]); ctx.lineTo(b[3][0], b[3][1]);
    ctx.stroke();
    // label
    ctx.globalAlpha = 1;
    ctx.font = `italic 600 ${Math.max(11, 15 * (this.compact() ? 0.85 : 1))}px 'Fraunces Variable', Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = c.fg;
    ctx.fillText(`Forming \u00b7 ${Math.round(this.fill * 100)}%`, s.x, top - R * HEX_Y - 10);
    ctx.restore();
  }

  private drawSparks(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const s of this.sparks) {
      ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  private drawCelebration(ctx: CanvasRenderingContext2D): void {
    if (this.celebrateT < 0) {
      return;
    }
    const t = this.celebrateT;
    const v = this.vialSlot();
    ctx.save();
    // flash
    if (t < 0.5) {
      ctx.globalAlpha = (1 - t / 0.5) * (this.colors.dark ? 0.35 : 0.25);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.w, this.h);
    }
    // shockwave rings
    for (const delay of [0, 0.25]) {
      const k = (t - delay) / 1.4;
      if (k > 0 && k < 1) {
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = delay ? this.colors.accent2 : this.colors.accent;
        ctx.lineWidth = 2.5 * (1 - k) + 0.5;
        const r = easeInOutSine(k) * Math.max(this.w, this.h) * 0.45;
        ctx.beginPath(); ctx.ellipse(v.x, v.y, r, r * 0.38, 0, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }
}
