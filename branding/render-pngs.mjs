#!/usr/bin/env node
// Renders PNG versions of the Block Master logos (favicons, social preview, logo PNGs) with headless Chrome.
//   npm i --no-save puppeteer-core && CHROME=/usr/bin/google-chrome node branding/render-pngs.mjs [extra-out-dir]
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(root, 'frontend/src/resources');
const LOGOS = join(RES, 'block-master');
const extraOut = process.argv[2];
const b64 = (f) => 'data:image/svg+xml;base64,' + readFileSync(f).toString('base64');

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();

async function render(html, w, h, out, transparent = true) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? 'transparent' : '#11131f'}">${html}</body></html>`);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  const buf = await page.screenshot({ omitBackground: transparent, type: 'png' });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buf);
  return buf;
}
const icon = (file, size, pad = 0, bg = '') =>
  `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${bg}"><img src="${b64(file)}" style="width:${size - 2 * pad}px;height:${size - 2 * pad}px"></div>`;

// favicons
const def = join(LOGOS, 'logo-default.svg');
const fav = join(RES, 'favicons');
const pngs = {};
for (const s of [16, 32, 48]) pngs[s] = await render(icon(def, s), s, s, join(fav, `favicon-${s}x${s}.png`));
await render(icon(def, 180, 16, 'background:#1d1f31;'), 180, 180, join(fav, 'apple-touch-icon.png'), false);
await render(icon(def, 192, 12), 192, 192, join(fav, 'android-chrome-192x192.png'));
await render(icon(def, 512, 32), 512, 512, join(fav, 'android-chrome-512x512.png'));
await render(icon(def, 150, 20), 150, 150, join(fav, 'mstile-150x150.png'));
// favicon.ico (PNG-compressed entries 16/32/48)
{
  const sizes = [16, 32, 48];
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(pngs[s].length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += pngs[s].length;
  });
  const ico = Buffer.concat([header, ...sizes.map((s) => pngs[s])]);
  writeFileSync(join(fav, 'favicon.ico'), ico);
  writeFileSync(join(root, 'frontend/src/favicon.ico'), ico);
}

// social preview (1200x630)
await render(`<div style="width:1200px;height:630px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;
  background:radial-gradient(circle at 50% 35%, #2a2d4a, #11131f 70%);font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#f1f5f9">
  <img src="${b64(join(LOGOS, 'wordmark.svg'))}" style="width:860px">
  <div style="font-size:34px;opacity:.85">Your node. Your explorer. Plain-language fees.</div></div>`, 1200, 630, join(RES, 'previews/block-master-preview.png'), false);

// logo PNGs for docs / myNode app tile
if (extraOut) {
  mkdirSync(extraOut, { recursive: true });
  for (const f of readdirSync(LOGOS).filter((x) => x.startsWith('logo-'))) {
    await render(icon(join(LOGOS, f), 512), 512, 512, join(extraOut, f.replace('.svg', '.png')));
  }
  await render(`<img src="${b64(join(LOGOS, 'wordmark.svg'))}" style="width:1040px">`, 1040, 256, join(extraOut, 'wordmark.png'));
}
await browser.close();
console.log('rendered PNGs');
