#!/usr/bin/env node
// Preview the built frontend without a local backend: serves frontend/dist (English build) and proxies /api
// (REST + WebSocket) to a public mempool-compatible API (default https://mempool.space, read-only public data).
// Used to take the README screenshots.   node scripts/preview-server.js [port]   (after `npm run build` in frontend/)
// Override the API with PREVIEW_API=https://your-node:4090
const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require(path.join(__dirname, '../frontend/node_modules/http-proxy'));

const PORT = Number(process.argv[2] || 4200);
const API = process.env.PREVIEW_API || 'https://mempool.space';
const DIST = path.join(__dirname, '../frontend/dist/mempool/browser');
const APP = path.join(DIST, 'en-US');
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg' };

const proxy = httpProxy.createProxyServer({ target: API, changeOrigin: true, secure: true, ws: true });
proxy.on('error', (e, req, res) => { if (res && res.writeHead) { res.writeHead(502); res.end(String(e)); } });

function send(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url.startsWith('/api/')) { return proxy.web(req, res); }
  if (url.startsWith('/resources/')) { return send(res, path.join(DIST, path.normalize(url).replace(/^(\.\.[/\\])+/, ''))); }
  const file = path.join(APP, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (url !== '/' && fs.existsSync(file) && fs.statSync(file).isFile()) { return send(res, file); }
  return send(res, path.join(APP, 'index.html'));
});
server.on('upgrade', (req, socket, head) => proxy.ws(req, socket, head));
server.listen(PORT, () => console.log(`Block Master preview on http://localhost:${PORT} (API: ${API})`));
