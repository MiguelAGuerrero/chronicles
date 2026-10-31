// Long-walk harness: walks the web build through a dense fake downtown for
// PERF_MIN minutes (default 10), with a scan and a photo every two minutes,
// and samples the page's heap, DOM nodes, listeners, markers and main-thread
// time every 30 s, to find what grows during a walk. Test harness only: GPS
// is mocked, tiles are a fake world. Run after `npm run export:web`.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIST = path.join(__dirname, '..', 'dist');
const MINUTES = Number(process.env.PERF_MIN ?? 10);
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.ttf': 'font/ttf' };

function serve() {
  const server = http.createServer((q, r) => {
    let p = path.join(DIST, decodeURIComponent(q.url.split('?')[0]));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
    r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(r);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

// A downtown: streets every 80 m over 2.4 km, every one named, and 600 places.
const O = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x, y) => [O[0] + x * dLon, O[1] + y * dLat];
const features = [];
for (let x = -1200; x <= 1200; x += 80) features.push({ type: 'Feature', properties: { class: 'minor', name: `Avenue ${x}` }, geometry: { type: 'LineString', coordinates: [m(x, -1200), m(x, 1200)] } });
for (let y = -1200; y <= 1200; y += 80) features.push({ type: 'Feature', properties: { class: 'minor', name: `Street ${y}` }, geometry: { type: 'LineString', coordinates: [m(-1200, y), m(1200, y)] } });
let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const kinds = [['cafe', 'cafe'], ['restaurant', 'restaurant'], ['shop', 'gift'], ['bar', 'bar'], ['museum', 'museum'], ['park', 'park']];
for (let i = 0; i < 600; i++) {
  const [cls, sub] = kinds[i % kinds.length];
  features.push({ type: 'Feature', properties: { class: cls, subclass: sub, name: `Place ${i}` }, geometry: { type: 'Point', coordinates: m((rnd() - 0.5) * 2200, (rnd() - 0.5) * 2200) } });
}
features.push({ type: 'Feature', properties: { class: 'city', name: 'Testville' }, geometry: { type: 'Point', coordinates: m(0, 0) } });
const style = {
  version: 8,
  sources: { openmaptiles: { type: 'geojson', maxzoom: 14, data: { type: 'FeatureCollection', features } } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#eeeae4' } },
    { id: 'roads', type: 'line', source: 'openmaptiles', paint: { 'line-color': '#ffffff', 'line-width': 6 } },
  ],
};

module.exports = { serve, features, style, m };

if (require.main === module) (async () => {
  const { encodeTile } = await import('./mvt-encode.mjs');
  const tileCache = new Map();
  const server = await serve();
  const url = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--enable-precise-memory-info'] });
  const start = m(-400, -400);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, permissions: ['geolocation', 'microphone'], geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 } });
  await ctx.route('https://tiles.openfreemap.org/**', (r) => {
    const t = /\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(r.request().url());
    if (t) {
      if (!tileCache.has(t[0])) tileCache.set(t[0], Buffer.from(encodeTile(features, ...t.slice(1).map(Number))));
      return r.fulfill({ contentType: 'application/x-protobuf', body: tileCache.get(t[0]) });
    }
    return r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(r.request().url().endsWith('/planet') ? { tiles: ['https://tiles.openfreemap.org/planet/20261028_001001_pt/{z}/{x}/{y}.pbf'] } : style),
    });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const samples = [];
  let last = null;
  const sample = async (label) => {
    await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
    const mm = await metrics();
    const dom = await page.evaluate(() => ({
      markers: document.querySelectorAll('.maplibregl-marker').length,
      canvases: document.querySelectorAll('canvas').length,
      imgs: document.querySelectorAll('img').length,
    }));
    const cpu = last ? ((mm.TaskDuration - last.TaskDuration) / ((mm.Timestamp - last.Timestamp) || 1)) * 100 : 0;
    last = mm;
    const row = { label, heapMB: +(mm.JSHeapUsedSize / 1e6).toFixed(1), nodes: mm.Nodes, listeners: mm.JSEventListeners, docs: mm.Documents, cpuPct: +cpu.toFixed(1), ...dom };
    samples.push(row);
    console.log(JSON.stringify(row));
  };
  try {
    await page.goto(url);
    await page.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await page.click('[data-testid=start]');
    await page.waitForSelector('[data-testid=stop]');
    await page.waitForTimeout(3000);
    await sample('start');
    // A lawnmower walk over the grid at 2.5 m/s, one fix a second.
    const legs = [];
    for (let row = 0; row < 12; row++) {
      const y = -400 + row * 80;
      legs.push(row % 2 ? [[400, y], [-400, y]] : [[-400, y], [400, y]]);
    }
    const pts = [];
    let prev = [-400, -400];
    for (const [a, b] of legs)
      for (const [p, q] of [[prev, a], [a, b]]) {
        const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        for (let s = 1; s <= Math.ceil(len / 2.5); s++) pts.push([p[0] + ((q[0] - p[0]) * s) / Math.ceil(len / 2.5), p[1] + ((q[1] - p[1]) * s) / Math.ceil(len / 2.5)]);
        prev = q;
      }
    const total = MINUTES * 60;
    for (let k = 0; k < total; k++) {
      const [x, y] = pts[k % pts.length];
      const [lon, lat] = m(x, y);
      await ctx.setGeolocation({ longitude: lon, latitude: lat, accuracy: 6 });
      await page.waitForTimeout(1000);
      if (k === 20) {
        await page.click('[data-testid=scan]').catch(() => {});
        if (await page.waitForSelector('[data-testid=prefs-done]', { timeout: 3000 }).then(() => true, () => false)) await page.click('[data-testid=prefs-done]');
        await page.waitForSelector('[data-testid=scan-cancel]', { state: 'detached', timeout: 60000 }).catch(() => {});
      }
      if (k > 0 && k % 120 === 60) {
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid=cap-photo]')]).catch(() => [null]);
        if (chooser) await chooser.setFiles(path.join(__dirname, 'fixtures', 'photo.jpg'));
      }
      if (k > 0 && k % 30 === 0) await sample(`${Math.round(k / 60 * 10) / 10} min`);
    }
    const first = samples[1] ?? samples[0];
    const end = samples[samples.length - 1];
    console.log(`\nheap ${first.heapMB} → ${end.heapMB} MB, nodes ${first.nodes} → ${end.nodes}, listeners ${first.listeners} → ${end.listeners}, markers ${first.markers} → ${end.markers}`);
    if (errors.length) console.log('errors', errors.slice(0, 3));
  } finally {
    await browser.close();
    server.close();
  }
})();
