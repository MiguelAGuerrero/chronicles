// Replay path-beat harness (measurement only; nothing in src/ is changed).
//
//   node perf-replay.js
//
// Seeds the walk of scripts/e2e/journeys/replay.js (two photos, a video, a note, a 20-minute gap, a memo), stops it,
// lets the first replay run to its card unthrottled, then re-watches it (/replay/<id>?ceremony=0) once per CPU
// throttle and records the path beat (the ceremony clock's 33 ms interval from made to cleared).
//
//   PERF_REPO=<dir>       the checkout whose harness is used (default /workspace/chronicles)
//   PERF_DIST=<dir>       the export served (default ./dist-head beside this file)
//   PERF_RATES=1,4,6      CPU throttles (Emulation.setCPUThrottlingRate, main thread; workers too when PERF_WORKER=1)
//   PERF_DSF=3            deviceScaleFactor at 390 x 844
//   PERF_OBSERVE=1        also count style mutations (markers, overlays) and read the trace's lag in px (adds cost)
//   PERF_PROFILE=<file>   CPU profile of the path beat (main thread; <file>.worker.json for the map worker)
//   PERF_WORKER=0         leave the map's worker unthrottled
//   PERF_SHOTS=<dir>      pictures of the beat's first PERF_MAX_S seconds, one every 700 ms (not a measured run)
//   PERF_TRACE=<file>     a browser trace of the measured window (with PERF_MAX_S), for analyze-trace.js
//   PERF_JSON=<file>      the numbers (node show.js <file> prints them)
//   PERF_TAG=<suffix>     added to the raw files' names, so a repeat keeps the first run's
const fs = require('fs');
const path = require('path');

const REPO = process.env.PERF_REPO ?? '/workspace/chronicles';
process.env.E2E_DIST = process.env.PERF_DIST ?? path.join(__dirname, 'dist-head');
const RATES = (process.env.PERF_RATES ?? '1,4,6').split(',').map(Number);
const DSF = Number(process.env.PERF_DSF ?? 3);
const OBSERVE = process.env.PERF_OBSERVE === '1';
const PROFILE = process.env.PERF_PROFILE;
const WORKER = process.env.PERF_WORKER !== '0';
// PERF_ARGS adds browser flags to the harness's own launch; PERF_MAX_S cuts the measured window short (trials).
const pw = require('playwright');
const launch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = (o = {}) => launch({ ...o, args: [...(o.args ?? []), ...(process.env.PERF_ARGS ? process.env.PERF_ARGS.split(' ') : [])] });
const MAX_S = Number(process.env.PERF_MAX_S ?? 0);
const { createHarness } = require(path.join(REPO, 'scripts/e2e/harness.js'));

// Runs in the page before anything else: every recorder the measurement reads.
function instrument(observe) {
  window.__perf = {};
  const P = (window.__p = { raf: [], intervals: [], long: [], loaf: [], msgs: [], commits: [], samples: [], marks: [], muts: [], lag: [] });
  const now = () => performance.now();
  const loop = (t) => {
    P.raf.push(t);
    if (observe) P.onFrame?.(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  // The 33 ms intervals (the fog's and the ceremony clock's): when each tick ran and how long it took.
  const si = window.setInterval;
  const ci = window.clearInterval;
  window.setInterval = function (fn, ms, ...a) {
    if (ms !== 33) return si.call(window, fn, ms, ...a);
    const rec = { made: now(), cleared: null, t: [], d: [], id: 0 };
    P.intervals.push(rec);
    rec.id = si.call(window, function () {
      const t0 = now();
      try { return fn.apply(this, arguments); } finally { rec.t.push(t0); rec.d.push(now() - t0); }
    }, ms, ...a);
    return rec.id;
  };
  window.clearInterval = function (id) {
    for (const r of P.intervals) if (r.id === id && r.cleared == null) r.cleared = now();
    return ci.call(window, id);
  };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.long.push([e.startTime, e.duration]); }).observe({ entryTypes: ['longtask'] }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.loaf.push([e.startTime, e.duration, e.blockingDuration, e.renderStart, e.styleAndLayoutStart]); }).observe({ type: 'long-animation-frame' }); } catch {}
  // React commits, by root: the app's (#root) or a pin's own root.
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, renderers: new Map(), isDisabled: false,
    inject(r) { const id = this.renderers.size + 1; this.renderers.set(id, r); return id; },
    onCommitFiberRoot(id, root) { P.commits.push([now(), root && root.containerInfo && root.containerInfo.id === 'root' ? 0 : 1]); },
    onPostCommitFiberRoot() {}, onCommitFiberUnmount() {}, onScheduleFiberRoot() {}, checkDCE() {}, setStrictMode() {},
  };
  // The map's worker: every message out (loadData 'LD' per GeoJSON setData that reaches the worker, tile reloads) and
  // every answer back.
  const W = window.Worker;
  const endOf = (data) => {
    try {
      const g = typeof data === 'string' ? JSON.parse(data) : data;
      const f = g && g.features && g.features[g.features.length - 1];
      if (!f) return null;
      const c = f.geometry.coordinates;
      return f.geometry.type === 'Point' ? c : c[c.length - 1];
    } catch { return undefined; }
  };
  P.last = { points: null, trace: null };
  window.Worker = class extends W {
    constructor(u, o) {
      super(u, o);
      P.workerUrl = String(u);
      this.addEventListener('message', (e) => { const d = e.data; if (d && d.type === '<response>') P.msgs.push([now(), 'R', d.id]); });
    }
    postMessage(m, t) {
      if (m && m.type && m.type !== '<response>') {
        const src = m.data && (m.data.source ?? null);
        let end = null;
        if (m.type === 'LD' && (src === 'points' || src === 'trace')) {
          end = endOf(m.data.data);
          if (end) P.last[src] = end;
        }
        P.msgs.push([now(), m.type, m.id, src, end]);
      }
      return super.postMessage(m, t);
    }
  };
  // What the stage shows and the counters, ten times a second.
  si.call(window, () => {
    const card = document.querySelector('[data-testid=replay-card]');
    const maps = document.querySelectorAll('[data-walker]');
    P.samples.push({ t: now(), walker: maps.length ? maps[maps.length - 1].getAttribute('data-walker') : '', card: card ? card.getAttribute('aria-label') || 'card' : null, video: !!(card && card.querySelector('video')), clock: !!document.querySelector('[data-testid=replay-clock]'), notes: document.querySelectorAll('[data-testid=replay-note]').length, markers: document.querySelectorAll('.maplibregl-marker').length, perf: { ...window.__perf } });
  }, 100);
  if (observe) {
    // Style writes, by what they land on: a map marker (a pin) or anything else (the stage's overlays).
    const start = () => new MutationObserver((rs) => {
      let m = 0; let o = 0; let k = 0;
      for (const r of rs) {
        if (r.type === 'childList') k++;
        else if (r.target.classList && r.target.classList.contains('maplibregl-marker')) m++;
        else o++;
      }
      P.muts.push([now(), m, o, k]);
    }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['style'], childList: true });
    if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
    // How far behind the walker the trace's end is, as sent to the map, in screen px (window.__project is the app's own e2e hook).
    P.onFrame = (t) => {
      if (!window.__project) return;
      if (!P.wEl || !P.wEl.isConnected) P.wEl = [...document.querySelectorAll('[data-walker]')].pop();
      const w = P.wEl && P.wEl.getAttribute('data-walker');
      if (!w) return;
      const [lon, lat] = w.split(',').map(Number);
      const a = window.__project([lon, lat]);
      const c = window.__project([lon + 0.001, lat]);
      // The walker the screen was last given (where the camera is put), and the map's px per degree of longitude.
      // A spike that reveals the line on the map says where it ends (data-trace-end); the shipped build sends it as data.
      const e = P.wEl.getAttribute('data-trace-end');
      const end = e ? e.split(',').map(Number) : null;
      P.lag.push([t, lon, lat, Math.abs(c[0] - a[0]) / 0.001, end ? end[0] : null, end ? end[1] : null]);
    };
  }
}

const { summarise } = require('./summarise');

// A non-flattened child session over the page's CDP session: the map's worker, throttled and profiled as the page is.
function workerSessions(cdp) {
  const sessions = new Map();
  let seq = 1;
  const waiting = new Map();
  cdp.on('Target.attachedToTarget', (e) => sessions.set(e.sessionId, e.targetInfo));
  cdp.on('Target.detachedFromTarget', (e) => sessions.delete(e.sessionId));
  cdp.on('Target.receivedMessageFromTarget', (e) => {
    const m = JSON.parse(e.message);
    const w = waiting.get(m.id);
    if (!w) return;
    waiting.delete(m.id);
    if (m.error) w.reject(new Error(m.error.message)); else w.resolve(m.result);
  });
  const send = (sessionId, method, params = {}) => new Promise((resolve, reject) => {
    const id = seq++;
    waiting.set(id, { resolve, reject });
    cdp.send('Target.sendMessageToTarget', { sessionId, message: JSON.stringify({ id, method, params }) }).catch(reject);
    setTimeout(() => waiting.has(id) && (waiting.delete(id), reject(new Error(`${method}: no answer`))), 15000);
  });
  return { sessions, send, map: () => [...sessions].filter(([, t]) => t.type === 'worker' && /maplibre/.test(t.url)).map(([id]) => id) };
}

(async () => {
  const h = await createHarness();
  const { navUrl, url, BASE, at, metaOf, freshPage, openWalk, errors } = h;
  const out = { repo: REPO, dist: process.env.E2E_DIST, dsf: DSF, observe: OBSERVE, profile: !!PROFILE, tag: process.env.PERF_TAG ?? '', workerThrottled: null, runs: [] };
  try {
    const { c, pg } = await freshPage('perf');
    await c.addInitScript(instrument, OBSERVE);
    const cdp = await c.newCDPSession(pg);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: DSF, mobile: false });
    await cdp.send('Performance.enable');
    const ws = workerSessions(cdp);
    await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: false }).catch((e) => console.log('auto-attach refused:', e.message));
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));

    // The walk of the replay journey (scripts/e2e/journeys/replay.js), seeded the same way.
    const here = at(3.0, -0.5);
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    for (let k = 0; k < 3; k++) {
      await c.setGeolocation({ longitude: here[0], latitude: here[1] + k * 0.000001, accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    for (let k = 0; k < 15 && !(await metaOf(pg, 'tile_url')); k++) await pg.waitForTimeout(1000);
    const walk = await openWalk(pg);
    const now = Date.now();
    const min = 60_000;
    const along = (from, to, t0) => {
      const pts = [];
      const d = Math.hypot((to[0] - from[0]) * 100, (to[1] - from[1]) * 100);
      const n = Math.max(1, Math.round(d / 7));
      for (let k = 0; k <= n; k++) {
        const p = at(from[0] + ((to[0] - from[0]) * k) / n, from[1] + ((to[1] - from[1]) * k) / n);
        pts.push({ walk_id: walk.id, t: t0 + k * 5000, lon: p[0], lat: p[1], accuracy_m: 6, speed: 1.4, course: null });
      }
      return pts;
    };
    const first = along([-6, -0.5], [-1.2, -0.5], now - 50 * min);
    const second = along([2.2, -0.5], [3.0, -0.5], first.at(-1).t + 20 * min);
    const capAt = (p, o) => ({ walk_id: walk.id, t: p.t, lat: p.lat, lon: p.lon, segment_id: null, caption: null, caption_y: null, ...o });
    const captures = [
      capAt(first[8], { id: 'rr-photo', kind: 'photo', file_path: 'rr-photo', body: null, caption: 'Blue door', caption_y: 0.8 }),
      capAt(first[25], { id: 'rr-photo-2', kind: 'photo', file_path: 'rr-photo', body: null, caption: 'Green gate', caption_y: 0.8 }),
      capAt(first[45], { id: 'rr-video', kind: 'video', file_path: 'rr-video', body: '5000' }),
      capAt(first.at(-1), { id: 'rr-note', kind: 'text', file_path: null, body: 'Bought two plums. Ate one before I paid.' }),
      capAt(second[6], { id: 'rr-memo', kind: 'voice', file_path: 'rr-memo', body: '3000' }),
    ];
    await pg.evaluate(([id, startedAt, pts, caps]) => new Promise((resolve) => {
      const cv = document.createElement('canvas');
      cv.width = 160;
      cv.height = 200;
      const g = cv.getContext('2d');
      g.fillStyle = '#2f5f8f';
      g.fillRect(0, 0, 160, 200);
      const rec = new MediaRecorder(cv.captureStream(10), { mimeType: 'video/webm' });
      const parts = [];
      let frame = 0;
      const paint = setInterval(() => {
        g.fillStyle = frame++ % 2 ? '#2f5f8f' : '#c0392b';
        g.fillRect(0, 0, 160, 200);
      }, 100);
      rec.ondataavailable = (e) => parts.push(e.data);
      const recorded = new Promise((r) => { rec.onstop = () => { clearInterval(paint); r(new Blob(parts, { type: 'video/webm' })); }; });
      rec.start();
      setTimeout(() => rec.stop(), 5200);
      recorded.then((video) => cv.toBlob((blob) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const tx = req.result.transaction(['walk', 'trace_point', 'moment', 'media'], 'readwrite');
          const w = tx.objectStore('walk').get(id);
          w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
          for (const p of pts) tx.objectStore('trace_point').add(p);
          for (const cap of caps) tx.objectStore('moment').put(((cc) => ({ id: cc.id, walk_id: cc.walk_id ?? null, t: cc.t, lat: cc.lat ?? null, lon: cc.lon ?? null, segment_id: cc.segment_id ?? null, piece_ids: [cc.id], pieces: [Object.fromEntries(Object.entries({ ...cc, moment_id: cc.id }).filter(([k]) => !['walk_id', 'lat', 'lon', 'segment_id'].includes(k)))] }))(cap));
          tx.objectStore('media').put({ key: 'rr-photo', blob });
          tx.objectStore('media').put({ key: 'rr-video', blob: video });
          tx.oncomplete = () => resolve(true);
        };
      }, 'image/png'));
    }), [walk.id, first[0].t - 1000, [...first, ...second], captures]);
    await pg.reload();
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    await pg.waitForTimeout(2000);
    const b = await pg.locator('[data-testid=stop]').boundingBox();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1100);
    await pg.mouse.up();
    await pg.waitForURL(/replay/, { timeout: 30000 });
    // The first watch, unthrottled and unmeasured: it reads and snaps the streets.
    await pg.waitForSelector('[data-testid=to-name]', { timeout: 300000 });
    console.log(`seeded walk ${walk.id}; first watch reached its card`);

    for (const rate of RATES) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await pg.goto(`${url}replay/${walk.id}?ceremony=0`);
      await pg.waitForSelector('[data-testid=replay-headline], [data-testid=replay-clock]', { timeout: 120000 });
      // Throttled from the fog beat on, so the path beat begins as slow as it will be.
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      let workerOk = false;
      if (WORKER) for (const sid of ws.map()) workerOk = await ws.send(sid, 'Emulation.setCPUThrottlingRate', { rate }).then(() => true, (e) => (console.log('worker throttle refused:', e.message), false));
      out.workerThrottled = WORKER && workerOk;
      await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 120000 });
      const m0 = await metrics();
      let sync = null;
      if (PROFILE) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
        await cdp.send('Profiler.start');
        for (const sid of ws.map()) await ws.send(sid, 'Profiler.enable').then(() => ws.send(sid, 'Profiler.setSamplingInterval', { interval: 250 })).then(() => ws.send(sid, 'Profiler.start')).catch((e) => console.log('worker profile refused:', e.message));
        // A marker both clocks can see: the page's time when a named function spins, found again in the profile.
        sync = await pg.evaluate(() => {
          const t = performance.now();
          (function __perfSyncMarker() { const e = performance.now() + 60; while (performance.now() < e); })();
          return t;
        });
      }
      // PERF_SHOTS=<dir>: a picture every 700 ms of the beat's first PERF_MAX_S seconds (not a measured run).
      if (process.env.PERF_SHOTS) {
        fs.mkdirSync(process.env.PERF_SHOTS, { recursive: true });
        for (let k = 0; k < (MAX_S * 1000) / 700; k++) { await pg.screenshot({ path: path.join(process.env.PERF_SHOTS, `${rate}x-${String(k).padStart(2, '0')}.png`) }); await pg.waitForTimeout(600); }
      } else
      if (process.env.PERF_TRACE) await h.browser.startTracing(pg, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'gpu', 'blink', 'cc', 'v8'] });
      if (MAX_S && !process.env.PERF_SHOTS) await pg.waitForTimeout(MAX_S * 1000);
      else if (MAX_S) await pg.waitForTimeout(100);
      else await pg.waitForSelector('[data-testid=done], [data-testid=to-name]', { timeout: 600000 });
      if (process.env.PERF_TRACE) fs.writeFileSync(`${process.env.PERF_TRACE}.${rate}x.json`, await h.browser.stopTracing());
      const m1 = await metrics();
      if (PROFILE) {
        const { profile } = await cdp.send('Profiler.stop');
        fs.writeFileSync(`${PROFILE}.${rate}x.json`, JSON.stringify({ sync, profile }));
        for (const sid of ws.map()) {
          const res = await ws.send(sid, 'Profiler.stop').catch(() => null);
          if (res) fs.writeFileSync(`${PROFILE}.${rate}x.worker.json`, JSON.stringify({ profile: res.profile }));
        }
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const P = await pg.evaluate(() => {
        const p = window.__p;
        if (!p.gl) { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); p.gl = g ? g.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : g.RENDERER) : 'none'; }
        return { gl: p.gl, now: performance.now(), raf: p.raf, intervals: p.intervals, long: p.long, loaf: p.loaf, msgs: p.msgs, commits: p.commits, samples: p.samples, muts: p.muts, lag: p.lag, workerUrl: p.workerUrl };
      });
      fs.writeFileSync(path.join(__dirname, `raw-${path.basename(process.env.E2E_DIST)}-dsf${DSF}-${rate}x${OBSERVE ? '-observe' : ''}${PROFILE ? '-profile' : ''}${process.env.PERF_TAG ?? ''}.json`), JSON.stringify({ sync, P }));
      const run = summarise(P, rate, Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map((k) => [k, Math.round(((m1[k] - m0[k]) / (m1.Timestamp - m0.Timestamp)) * 1000) / 10])));
      out.runs.push(run);
      console.log(JSON.stringify(run));
    }
    if (errors.length) console.log('errors', errors.slice(0, 5));
  } finally {
    if (process.env.PERF_JSON) fs.writeFileSync(process.env.PERF_JSON, JSON.stringify(out, null, 1));
    await h.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
