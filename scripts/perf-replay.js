// The replay's path beat, measured (specs/replay-ceremony, RC1-RC7; docs/research/replay-frame-pipeline.md).
//
//   npm run export:web && node scripts/perf-replay.js
//
// A measurement harness, not a pass/fail test. It seeds the `replay` journey's walk (scripts/e2e/replayWalk.js: two
// photos, a video, a note, a 20-minute gap, a memo), lets the first replay run to its card unthrottled, then watches it
// again (/replay/<id>?ceremony=0) once per CPU throttle and reads the path beat: from the clock showing to the card.
// Test harness only: GPS is mocked and the tiles are the e2e's fake street grid.
//
//   PERF_RATES=1,4,6      CPU throttles (CDP Emulation.setCPUThrottlingRate; the map's worker too unless PERF_WORKER=0)
//   PERF_DSF=1            deviceScaleFactor at 390 x 844. Headless Chromium draws WebGL in software, so the default is a
//                         small canvas: at a phone's 3x every build is bound by software GL and the numbers say nothing
//   PERF_FPS=<n>          the engine's ceiling on frames a second for the measured watches (the route's `fps`, RC6)
//   PERF_JSON=<file>      the numbers, as JSON
//   PERF_PROFILE=<file>   a CPU profile of each beat's main thread (<file>.<rate>x.json; export with --no-minify)
//   E2E_DIST=<dir>        another export to serve (the e2e harness reads it)
//
// What it prints, per throttle, over the beat and over its stretches (nothing arriving or leaving, the walker moving):
// frames a second, how often the walker's place changed, React commits, renders of the screen and of the map component,
// map data sent (`setData`) and messages to the map's worker, camera moves, the share of the main thread in script, and
// how far the line's end was from the dot and the map's centre from where its frame put the camera, in px (a build
// whose camera rides the walker: how far the line's end and the dot were from the map's centre). A build that sends the line as data is read
// from the worker's messages (the end of the last `trace` its worker had answered); one that reveals it says where it
// ends (`data-reveal-end`). **Not an iPhone**: no WebKit, no real GPU, one fixture. The numbers say where the cost is.
const fs = require('fs');
const { createHarness } = require('./e2e/harness');
const { seedReplayWalk } = require('./e2e/replayWalk');

const RATES = (process.env.PERF_RATES ?? '1,4,6').split(',').map(Number);
const DSF = Number(process.env.PERF_DSF ?? 1);
const FPS = process.env.PERF_FPS ? Number(process.env.PERF_FPS) : null;
const WORKER = process.env.PERF_WORKER !== '0';
const PROFILE = process.env.PERF_PROFILE;

// Runs in the page before anything else: every recorder the measurement reads.
function instrument() {
  window.__perf = {};
  const P = (window.__p = { frames: [], long: [], commits: [], samples: [], sent: [], answered: [] });
  const now = () => performance.now();
  let map = null;
  const attr = (name) => (map ? map.getAttribute(name) ?? '' : '');
  // Every display frame: when it ran, and where the dot, the camera, the revealed line's end and the camera its frame
  // asked for (`data-cam`; a build whose camera rides the walker says none) are said to be.
  const frame = (t) => {
    if (!map || !map.isConnected) map = [...document.querySelectorAll('[data-walker]')].pop() ?? null;
    P.frames.push([t, attr('data-walker'), attr('data-center'), attr('data-zoom'), attr('data-reveal-end'), attr('data-cam')]);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) P.long.push([e.startTime, e.duration]); }).observe({ entryTypes: ['longtask'] }); } catch { /* no long tasks here */ }
  // React commits, by root: the app's (#root) or a pin's own.
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, renderers: new Map(), isDisabled: false,
    inject(r) { const id = this.renderers.size + 1; this.renderers.set(id, r); return id; },
    onCommitFiberRoot(id, root) { P.commits.push([now(), root && root.containerInfo && root.containerInfo.id === 'root' ? 0 : 1]); },
    onPostCommitFiberRoot() {}, onCommitFiberUnmount() {}, onScheduleFiberRoot() {}, checkDCE() {}, setStrictMode() {},
  };
  // The map's worker: each GeoJSON source sent to it ('LD', with where its last line or point ends) and each answer.
  const W = window.Worker;
  const endOf = (data) => {
    try {
      const g = typeof data === 'string' ? JSON.parse(data) : data;
      const f = g && g.features && g.features[g.features.length - 1];
      if (!f) return null;
      const c = f.geometry.coordinates;
      return f.geometry.type === 'Point' ? c : c[c.length - 1];
    } catch { return null; }
  };
  window.Worker = class extends W {
    constructor(u, o) {
      super(u, o);
      this.addEventListener('message', (e) => { const d = e.data; if (d && d.type === '<response>') P.answered.push([now(), d.id]); });
    }
    postMessage(m, t) {
      if (m && m.type && m.type !== '<response>') {
        const src = m.data && (m.data.source ?? null);
        P.sent.push([now(), m.type, m.id, src, m.type === 'LD' && (src === 'points' || src === 'trace') ? endOf(m.data.data) : null]);
      }
      return super.postMessage(m, t);
    }
  };
  // What the stage shows and the app's own counters, ten times a second.
  window.setInterval(() => {
    const has = (id) => !!document.querySelector(`[data-testid=${id}]`);
    P.samples.push({
      t: now(), clock: has('replay-clock'), card: has('done') || has('to-name'),
      busy: has('replay-card') || has('replay-note') || has('memo-bubble') || has('replay-whisper') || has('replay-later'),
      walker: map ? map.getAttribute('data-walker') ?? '' : '', perf: { ...window.__perf },
    });
  }, 100);
}

const pct = (xs, q) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))] : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const lngLat = (s) => (s ? s.split(',').map(Number) : null);
/** Metres between two points close together. */
const metres = (a, b) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 111320);
/** Pixels in a metre at a zoom and latitude (512 px tiles, as maplibre counts zoom). */
const pxPerMetre = (zoom, lat) => (512 * 2 ** zoom) / (40075016.686 * Math.cos((lat * Math.PI) / 180));

/** One beat's numbers from what the page recorded (pure). */
function summarise(P, rate, main) {
  const first = P.samples.findIndex((s) => s.clock);
  if (first < 0) return { rate, error: 'the path beat never showed its clock' };
  let last = P.samples.findIndex((s, i) => i > first && !s.clock);
  if (last < 0) last = P.samples.length - 1;
  const t0 = P.samples[first].t;
  const t1 = P.samples[last].t;
  const seconds = (t1 - t0) / 1000;
  // Stretches: between two samples a tenth of a second apart with nothing arriving or leaving and the walker moving.
  const spans = [];
  for (let i = first + 1; i <= last; i++) {
    const a = P.samples[i - 1];
    const b = P.samples[i];
    if (!a.busy && !b.busy && a.walker && b.walker && a.walker !== b.walker) spans.push([a, b]);
  }
  const stretchS = spans.reduce((n, [a, b]) => n + (b.t - a.t), 0) / 1000;
  const inBeat = (t) => t >= t0 && t <= t1;
  const inStretch = (t) => spans.some(([a, b]) => t >= a.t && t <= b.t);
  const keys = [...new Set(P.samples.flatMap((s) => Object.keys(s.perf)))].filter((k) => !k.startsWith('mark:'));
  const count = (k, a, b) => (b.perf[k] ?? 0) - (a.perf[k] ?? 0);
  const perSec = (ks) => ({
    beat: r1(ks.reduce((n, k) => n + count(k, P.samples[first], P.samples[last]), 0) / seconds),
    stretch: stretchS ? r1(ks.reduce((n, k) => n + spans.reduce((m, [a, b]) => m + count(k, a, b), 0), 0) / stretchS) : null,
  });
  const frames = P.frames.filter((f) => inBeat(f[0]));
  const gaps = frames.slice(1).map((f, i) => f[0] - frames[i][0]);
  const moved = frames.filter((f, i) => i > 0 && f[1] !== frames[i - 1][1]);
  const rateOf = (events) => ({ beat: r1(events.filter(inBeat).length / seconds), stretch: stretchS ? r1(events.filter(inStretch).length / stretchS) : null });
  // How far the line's end and the dot are from the camera's centre, frame by frame, on the stretches.
  const answeredAt = new Map(P.answered.map(([t, id]) => [id, t]));
  const onMap = (src) => P.sent.filter((m) => m[1] === 'LD' && m[3] === src && m[4] && answeredAt.has(m[2])).map((m) => [answeredAt.get(m[2]), m[4]]).sort((a, b) => a[0] - b[0]);
  const traces = onMap('trace');
  const points = onMap('points');
  const lastBefore = (list, t) => {
    let at = null;
    for (const x of list) { if (x[0] > t) break; at = x[1]; }
    return at;
  };
  const reveals = frames.some((f) => f[4]);
  const lineLag = [];
  const dotLag = [];
  for (const f of frames) {
    if (!inStretch(f[0])) continue;
    const centre = lngLat(f[2]);
    const zoom = Number(f[3]);
    if (!centre || !Number.isFinite(zoom)) continue;
    const k = pxPerMetre(zoom, centre[1]);
    const end = reveals ? lngLat(f[4]) : lastBefore(traces, f[0]);
    const dot = reveals ? lngLat(f[1]) : lastBefore(points, f[0]);
    // The camera its frame asked for, where the build says it (replay ceremony RC12: the camera holds and re-frames, so
    // it is no longer at the dot): the line's end is measured from the dot, and the map's centre from that camera. A
    // build whose camera rides the walker is measured as before, both from the map's centre.
    const cam = lngLat(f[5]);
    if (cam && cam.length === 3) {
      if (end && dot) lineLag.push(metres(end, dot) * k);
      dotLag.push(metres(cam, centre) * pxPerMetre(cam[2], cam[1]));
      continue;
    }
    if (end) lineLag.push(metres(end, centre) * k);
    if (dot) dotLag.push(metres(dot, centre) * k);
  }
  const longs = P.long.filter(([t]) => inBeat(t));
  return {
    rate, seconds: r1(seconds), stretchSeconds: r1(stretchS), line: reveals ? 'revealed' : 'sent as data',
    fps: r1(frames.length / seconds), frameMs: { p50: r1(pct(gaps, 0.5)), p95: r1(pct(gaps, 0.95)), max: r1(Math.max(0, ...gaps)) },
    updates: rateOf(moved.map((f) => f[0])),
    commits: { app: rateOf(P.commits.filter((c) => c[1] === 0).map((c) => c[0])), pins: rateOf(P.commits.filter((c) => c[1] === 1).map((c) => c[0])) },
    renders: { screen: perSec(['render:replay']), map: perSec(['render:map']), stage: perSec(['render:stage']) },
    setData: perSec(keys.filter((k) => k.startsWith('setData:'))),
    setDataBy: Object.fromEntries(keys.filter((k) => k.startsWith('setData:')).map((k) => [k.slice(8), perSec([k]).beat]).filter(([, v]) => v)),
    worker: { sent: rateOf(P.sent.map((m) => m[0])), data: rateOf(P.sent.filter((m) => m[1] === 'LD').map((m) => m[0])) },
    camera: perSec(['camera']), reveal: perSec(['reveal']),
    lagPx: { line: { p50: r1(pct(lineLag, 0.5)), p90: r1(pct(lineLag, 0.9)) }, dot: { p50: r1(pct(dotLag, 0.5)), p90: r1(pct(dotLag, 0.9)) }, frames: lineLag.length },
    longTasks: { n: longs.length, ms: Math.round(longs.reduce((n, [, d]) => n + d, 0)) },
    main,
  };
}

/** The runs as one table, a row per throttle. */
function table(runs) {
  const head = ['slowdown', 'frames/s', 'walker updates/s', 'React commits/s (stretch)', 'screen renders/s (stretch)', 'map renders/s (stretch)', 'setData/s (stretch)', 'worker msgs/s', 'script %', 'line\'s end from the dot / the camera from where its frame put it, px (p50; p90)'];
  const dash = (x) => (x == null ? '-' : String(x));
  const rows = runs.map((r) => (r.error ? [`${r.rate}x`, r.error] : [
    r.rate === 1 ? 'none' : `${r.rate}x`, r.fps, `${dash(r.updates.beat)} (${dash(r.updates.stretch)})`, `${dash(r.commits.app.beat)} (${dash(r.commits.app.stretch)})`,
    `${dash(r.renders.screen.beat)} (${dash(r.renders.screen.stretch)})`, `${dash(r.renders.map.beat)} (${dash(r.renders.map.stretch)})`, `${dash(r.setData.beat)} (${dash(r.setData.stretch)})`,
    dash(r.worker.sent.beat), dash(r.main.ScriptDuration), `${dash(r.lagPx.line.p50)} / ${dash(r.lagPx.dot.p50)}; ${dash(r.lagPx.line.p90)} / ${dash(r.lagPx.dot.p90)}`,
  ]));
  return [head, head.map(() => '---'), ...rows].map((c) => `| ${c.join(' | ')} |`).join('\n');
}

// A child session over the page's CDP session: the map's worker, throttled as the page is.
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
  return { send, map: () => [...sessions].filter(([, t]) => t.type === 'worker' && /maplibre/.test(t.url)).map(([id]) => id) };
}

module.exports = { summarise, table };

if (require.main === module) (async () => {
  const h = await createHarness();
  const { url, freshPage, errors } = h;
  const out = { dist: process.env.E2E_DIST ?? 'dist', dsf: DSF, fps: FPS, workerThrottled: null, gl: null, runs: [] };
  try {
    const { c, pg } = await freshPage('perf');
    await c.addInitScript(instrument);
    const cdp = await c.newCDPSession(pg);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: DSF, mobile: false });
    await cdp.send('Performance.enable');
    const ws = workerSessions(cdp);
    await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: false }).catch((e) => console.log('worker sessions refused:', e.message));
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));

    const { walk } = await seedReplayWalk(h, c, pg);
    // The first watch, unthrottled and unmeasured: it reads and snaps the streets.
    await pg.waitForSelector('[data-testid=to-name]', { timeout: 300000 });
    console.log(`seeded walk ${walk.id}; the first watch reached its card`);

    for (const rate of RATES) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await pg.goto(`${url}replay/${walk.id}?ceremony=0${FPS ? `&fps=${FPS}` : ''}`);
      await pg.waitForSelector('[data-testid=replay-headline], [data-testid=replay-clock]', { timeout: 120000 });
      // Throttled from the fog beat on, so the path beat begins as slow as it will be.
      await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      let workerOk = false;
      if (WORKER) for (const sid of ws.map()) workerOk = await ws.send(sid, 'Emulation.setCPUThrottlingRate', { rate }).then(() => true, (e) => (console.log('worker throttle refused:', e.message), false));
      out.workerThrottled = WORKER && workerOk;
      await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 120000 });
      const m0 = await metrics();
      if (PROFILE) {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 250 });
        await cdp.send('Profiler.start');
      }
      await pg.waitForSelector('[data-testid=done], [data-testid=to-name]', { timeout: 600000 });
      const m1 = await metrics();
      if (PROFILE) fs.writeFileSync(`${PROFILE}.${rate}x.json`, JSON.stringify((await cdp.send('Profiler.stop')).profile));
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      const P = await pg.evaluate(() => {
        const p = window.__p;
        if (!p.gl) { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); p.gl = g ? g.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : g.RENDERER) : 'none'; }
        return p;
      });
      out.gl = P.gl;
      const main = Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map((k) => [k, Math.round(((m1[k] - m0[k]) / (m1.Timestamp - m0.Timestamp)) * 1000) / 10]));
      const run = summarise(P, rate, main);
      out.runs.push(run);
      console.log(JSON.stringify(run));
    }
    if (errors.length) console.log('console errors:', errors.slice(0, 5));
    console.log(`\n390 x 844 at ${DSF}x, ${out.gl}; the map's worker ${out.workerThrottled ? 'throttled too' : 'not throttled'}${FPS ? `; at most ${FPS} frames a second` : ''}\n`);
    console.log(table(out.runs));
  } finally {
    if (process.env.PERF_JSON) fs.writeFileSync(process.env.PERF_JSON, JSON.stringify(out, null, 1));
    await h.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
