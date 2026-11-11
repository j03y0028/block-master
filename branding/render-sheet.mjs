#!/usr/bin/env node
// Renders the Block Master logo contact sheet (all variants on dark and light grounds, plus favicon-size checks).
//   CHROME=/usr/bin/google-chrome node branding/render-sheet.mjs out.png      (needs puppeteer-core)
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
import { VARIANTS, NAMES, logoSvg, wordmarkSvg } from './build-logos.mjs';
import { PALETTES, contrast, layeredAccents } from '../frontend/src/app/shared/palettes.ts';

const out = process.argv[2] || 'logo-sheet.png';
const uri = (svg) => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
const tile = (id, dark) => `<figure class="tile ${dark ? 'dark' : 'light'}">
  <img src="${uri(logoSvg(id))}" width="148" height="148">
  <div class="sizes"><img src="${uri(logoSvg(id))}" width="32"><img src="${uri(logoSvg(id))}" width="16"></div>
  <figcaption>${NAMES[id]}</figcaption></figure>`;
const pal = (p) => {
  const a = layeredAccents(p);
  const chips = [p.bg, p.surface, p.primary, a.accent, a.accent2, p.link].map((c) => `<i style="background:${c}"></i>`).join('');
  return `<div class="pal" style="background:linear-gradient(160deg, ${p.surface}, ${p.bg});color:${p.fg};border:1px solid ${p.border}">
    <div class="pal-top"><b>${p.name}</b><span style="color:${p.muted}">${p.scheme}</span></div>
    <div class="chips">${chips}</div>
    <div class="pal-sample"><span style="color:${a.accent};font-weight:700">0.5 sat/vB</span> <span style="color:${p.muted}">≈ 70 sats</span></div>
    <div class="aa" style="color:${p.muted}">text ${contrast(p.fg, p.surface).toFixed(1)}:1 · muted ${contrast(p.muted, p.surface).toFixed(1)}:1 · accent ${contrast(a.accent, p.surface).toFixed(1)}:1</div>
  </div>`;
};
const html = `<!doctype html><html><head><style>
  body { margin:0; font-family: Inter, system-ui, sans-serif; background:#0b0d19; color:#eef0fb; }
  .wrap { padding:56px 64px 64px; background: radial-gradient(1200px 600px at 20% -10%, #2a2470 0%, transparent 60%), radial-gradient(900px 500px at 100% 0%, #3b1f4f 0%, transparent 55%), #0b0d19; }
  header { display:flex; align-items:center; justify-content:space-between; margin-bottom:36px; }
  header .sub { color:#aab0cf; font-size:18px; letter-spacing:.02em; }
  h2 { font-size:14px; letter-spacing:.18em; text-transform:uppercase; color:#aab0cf; font-weight:600; margin:36px 0 16px; }
  .grid { display:grid; grid-template-columns: repeat(6, 1fr); gap:18px; }
  .tile { margin:0; border-radius:20px; padding:22px 12px 16px; display:flex; flex-direction:column; align-items:center; gap:10px; position:relative; }
  .tile.dark { background: linear-gradient(160deg, #1a1e36, #11142a); box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 18px 40px -20px rgba(0,0,0,.8); }
  .tile.light { background: linear-gradient(160deg, #ffffff, #eef0f7); color:#14182b; box-shadow: 0 18px 40px -24px rgba(0,0,0,.6); }
  .sizes { position:absolute; top:12px; right:12px; display:flex; flex-direction:column; align-items:center; gap:6px; opacity:.9; }
  figcaption { font-size:14px; font-weight:600; letter-spacing:-.01em; }
  .pals { display:grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap:18px; }
  .pal { border-radius:20px; padding:18px; display:flex; flex-direction:column; gap:12px; box-shadow: 0 18px 40px -24px rgba(0,0,0,.8); }
  .pal-top { display:flex; justify-content:space-between; align-items:baseline; font-size:16px; } .pal-top span { font-size:12px; text-transform:uppercase; letter-spacing:.12em; }
  .chips { display:flex; gap:5px; } .chips i { width:20px; height:20px; border-radius:50%; border:1px solid rgba(128,128,128,.4); }
  .pal-sample { font-size:15px; } .aa { font-size:11px; font-variant-numeric: tabular-nums; }
</style></head><body><div class="wrap">
  <header><img src="${uri(wordmarkSvg())}" height="96"><div class="sub">Block Master 3.0 · 12 crowned prisms · 6 palettes · AGPL-3.0</div></header>
  <h2>On dark</h2><div class="grid">${VARIANTS.map((id) => tile(id, true)).join('')}</div>
  <h2>On light</h2><div class="grid">${VARIANTS.map((id) => tile(id, false)).join('')}</div>
  <h2>Color palettes · WCAG AA</h2><div class="pals">${PALETTES.map(pal).join('')}</div>
</div></body></html>`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
const el = await page.$('.wrap');
writeFileSync(out, await el.screenshot({ type: 'png' }));
await browser.close();
console.log('wrote', out);
