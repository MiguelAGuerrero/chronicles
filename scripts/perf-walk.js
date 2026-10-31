// PERF_SEED=<n> adds n fixes of history to the walk first (a long walk), and
// PERF_PROFILE=<file> records a CPU profile of the walking part and prints the
// functions taking the most time (export with --no-minify for readable names).
//
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
  await ctx.addInitScript(() => { window.__perf = {}; });
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
    const perf = await page.evaluate(() => ({ ...window.__perf }));
    const rates = {};
    if (sample.lastPerf) for (const [k, v] of Object.entries(perf)) rates[k] = +((v - (sample.lastPerf[k] ?? 0)) / 30).toFixed(2);
    sample.lastPerf = perf;
    const dom = await page.evaluate(() => ({
      markers: document.querySelectorAll('.maplibregl-marker').length,
      canvases: document.querySelectorAll('canvas').length,
      imgs: document.querySelectorAll('img').length,
    }));
    const dt = last ? (mm.Timestamp - last.Timestamp) || 1 : 1;
    const pct = (k) => (last ? +(((mm[k] - last[k]) / dt) * 100).toFixed(1) : 0);
    const perS = (k) => (last ? +((mm[k] - last[k]) / dt).toFixed(1) : 0);
    const row = {
      label, heapMB: +(mm.JSHeapUsedSize / 1e6).toFixed(1), nodes: mm.Nodes, listeners: mm.JSEventListeners,
      cpuPct: pct('TaskDuration'), scriptPct: pct('ScriptDuration'), layoutPct: pct('LayoutDuration'), stylePct: pct('RecalcStyleDuration'),
      layoutsPerS: perS('LayoutCount'), stylesPerS: perS('RecalcStyleCount'), ...dom, perSecond: rates,
    };
    last = mm;
    samples.push(row);
    console.log(JSON.stringify(row));
  };
  try {
    await page.goto(url);
    await page.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await page.click('[data-testid=start]');
    await page.waitForSelector('[data-testid=stop]');
    await page.waitForTimeout(3000);
    const SEED = Number(process.env.PERF_SEED ?? 0);
    if (SEED) {
      // A long walk so far: SEED fixes, one a second, along the grid, ending where the walk starts.
      await page.evaluate(({ n, o, dLat, dLon }) => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const d = req.result;
          const tx = d.transaction(['walk', 'trace_point'], 'readwrite');
          const walks = tx.objectStore('walk').getAll();
          walks.onsuccess = () => {
            const w = walks.result.find((x) => x.open);
            const t0 = Date.now() - n * 1000;
            tx.objectStore('walk').put({ ...w, started_at: t0 - 1000 });
            const tp = tx.objectStore('trace_point');
            for (let i = 0; i < n; i++) {
              // Back and forth along 800 m streets, 2.5 m a fix.
              const leg = Math.floor((i * 2.5) / 800);
              const along = (i * 2.5) % 800;
              const x = -400 + (leg % 2 ? 800 - along : along);
              const y = -400 - 80 * ((leg % 10) + 1);
              tp.add({ walk_id: w.id, t: t0 + i * 1000, lat: o[1] + y * dLat, lon: o[0] + x * dLon, accuracy_m: 6, speed: 2.5, course: null });
            }
          };
          tx.oncomplete = () => { d.close(); resolve(); };
        };
      }), { n: SEED, o: O, dLat, dLon });
      await page.reload();
      await page.waitForSelector('[data-testid=stop]', { timeout: 30000 });
      await page.waitForTimeout(4000);
    }
    await sample('start');
    const PROFILE = process.env.PERF_PROFILE;
    if (PROFILE) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
      await cdp.send('Profiler.start');
    }
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
    if (PROFILE) {
      const { profile } = await cdp.send('Profiler.stop');
      fs.writeFileSync(PROFILE, JSON.stringify(profile));
      const byId = new Map(profile.nodes.map((n) => [n.id, n]));
      const self = new Map();
      const total = profile.timeDeltas.reduce((a, b) => a + b, 0);
      profile.samples.forEach((id, i) => {
        const f = byId.get(id).callFrame;
        const k = `${f.functionName || '(anonymous)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
        self.set(k, (self.get(k) ?? 0) + (profile.timeDeltas[i] ?? 0));
      });
      // Inclusive time: each function counted once per sample it is on the stack of.
      const parent = new Map();
      for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
      const incl = new Map();
      profile.samples.forEach((id, i) => {
        const seen = new Set();
        for (let n = id; n != null; n = parent.get(n)) {
          const f = byId.get(n).callFrame;
          if (!f.url.includes('/_expo/')) continue;
          const k = `${f.functionName || '(anonymous)'}:${f.lineNumber + 1}`;
          if (seen.has(k)) continue;
          seen.add(k);
          incl.set(k, (incl.get(k) ?? 0) + (profile.timeDeltas[i] ?? 0));
        }
      });
      const busy = profile.samples.reduce((a, id, i) => (byId.get(id).callFrame.functionName === '(idle)' ? a : a + (profile.timeDeltas[i] ?? 0)), 0);
      console.log(`\nBusy ${((busy / total) * 100).toFixed(1)}% of ${(total / 1e6).toFixed(1)} s. App functions by inclusive time:`);
      for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
      console.log(`\nCPU profile (${(total / 1e6).toFixed(1)} s), top self time:`);
      for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
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
