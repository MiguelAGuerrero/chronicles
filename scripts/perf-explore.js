// Explore's pan and neighborhood-switch harness (Baltimore-dense, the owner's iPhone, Nov 12). Test harness only: GPS is
// mocked and the tiles are a fake dense downtown served through the e2e harness. Run after `npm run export:web`.
//
// The world is the harness's denseWorld: a 3 km downtown around the start (a named street every 60 m cut into blocks, alleys,
// about 2,000 places thickest in the middle), a city point and neighborhoods on a ring. The Busy layer is switched on, as
// in the owner's screenshot.
//
// What it measures, with the CPU throttled (PERF_RATE, default 4) to stand in for a phone:
// - switch: the arrow key steps to the next neighborhood (a swipe), PERF_SWITCHES times (default 6), 3 s apart.
// - drag: Move map on, PERF_DRAGS one-finger drags (default 6), each 45 moves 16 ms apart.
// For each: frame intervals (p50, p95, max, frames over 50 ms), long tasks (count, total, longest), and the map's DOM
// markers. PERF_JSON=<file> writes the numbers; PERF_SHOT=<file> saves the screen after the switches.
const fs = require('fs');
const { createHarness } = require('./e2e/harness');

const RATE = Number(process.env.PERF_RATE ?? 4);
const SWITCHES = Number(process.env.PERF_SWITCHES ?? 6);
const DRAGS = Number(process.env.PERF_DRAGS ?? 6);

const sampler = () => {
  const pf = { frames: [], longs: [] };
  window.__pf = pf;
  const loop = (t) => {
    pf.frames.push(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) pf.longs.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
  } catch { /* no long tasks API */ }
};

const quantile = (xs, q) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))] : 0);
const round = (x) => Math.round(x * 10) / 10;

const METRICS = ['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount'];
async function metricsNow(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.filter((m) => METRICS.includes(m.name)).map((m) => [m.name, m.value]));
}
const metricDelta = (a, b) => Object.fromEntries(METRICS.map((k) => [k, /Count/.test(k) ? b[k] - a[k] : Math.round((b[k] - a[k]) * 1000)]));

async function windowStats(pg, t0, t1) {
  const { frames, longs } = await pg.evaluate(([a, b]) => ({
    frames: window.__pf.frames.filter((t) => t >= a && t <= b),
    longs: window.__pf.longs.filter(([s]) => s >= a && s <= b),
  }), [t0, t1]);
  const iv = frames.slice(1).map((t, i) => t - frames[i]);
  return {
    ms: Math.round(t1 - t0),
    frames: frames.length,
    p50: round(quantile(iv, 0.5)),
    p95: round(quantile(iv, 0.95)),
    max: round(Math.max(0, ...iv)),
    over50: iv.filter((d) => d > 50).length,
    longTasks: longs.length,
    longTotal: Math.round(longs.reduce((s, [, d]) => s + d, 0)),
    longMax: Math.round(Math.max(0, ...longs.map(([, d]) => d))),
  };
}

const markers = (pg) => pg.evaluate(() => {
  const all = [...document.querySelectorAll('.maplibregl-marker')];
  const by = {};
  for (const m of all) {
    const k = m.dataset.testid ?? (m.querySelector('[data-testid]')?.dataset.testid ?? 'other');
    by[k] = (by[k] ?? 0) + 1;
  }
  return { total: all.length, by };
});

const now = (pg) => pg.evaluate(() => performance.now());

function summarize(rows) {
  const keys = ['ms', 'p50', 'p95', 'max', 'over50', 'longTasks', 'longTotal', 'longMax', ...METRICS];
  const out = {};
  for (const k of keys) out[k] = k === 'max' || k === 'longMax' ? Math.max(...rows.map((r) => r[k])) : round(rows.reduce((s, r) => s + r[k], 0) / rows.length);
  return out;
}

(async () => {
  const h = await createHarness();
  // The dense downtown lives in the harness (denseWorld), shared with the dense journey.
  h.denseWorld.serve = true;
  const hoods = h.DENSE_HOODS;
  const { c, pg } = await h.freshPage('perf-explore');
  await c.addInitScript(sampler);
  await c.addInitScript(() => { window.__perf = {}; });
  const cdp = await c.newCDPSession(pg);
  await cdp.send('Performance.enable');
  const result = { rate: RATE, switch: [], drag: [] };
  try {
    await pg.goto(h.exploreUrl);
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 1, null, { timeout: 90000 });
    // PERF_READ=1: the Busy layer goes on only once throttled, so its first read is timed (the read phase).
    const READ = process.env.PERF_READ === '1';
    if (process.env.PERF_BUSY !== '0' && !READ) await h.switchLayer(pg, 'busy');
    // The town's page: its neighborhoods are the row.
    const first = await h.areaTile(pg, hoods[0], 90000);
    if (!(await first.count())) throw new Error(`no card for ${hoods[0]}: ${await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.name).join(', '))}`);
    await first.click();
    // A tap on the selected card opens it: close it, so the map and its controls are bare.
    await pg.waitForTimeout(800);
    if (await pg.locator('[data-testid=atlas-card-close]').count()) {
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(800);
    }
    // Busy streets read and drawn around it, before anything is timed.
    if (!READ) await pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-graded') ?? '').length > 0, null, { timeout: 120000 }).catch(() => {});
    await pg.waitForFunction(() => document.querySelectorAll('.maplibregl-marker').length > (window.__busyOff ? 20 : 30), null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(3000);
    result.markersAtStart = await markers(pg);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    await pg.waitForTimeout(1500);

    const PHASE = process.env.PERF_PROFILE_PHASE ?? 'drag';
    const startProfile = async () => {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
      await cdp.send('Profiler.start');
    };
    const stopProfile = async () => {
      const { profile } = await cdp.send('Profiler.stop');
      fs.writeFileSync(process.env.PERF_PROFILE, JSON.stringify(profile));
      const self = new Map();
      const tot = new Map();
      const dt = profile.timeDeltas;
      const byId = new Map(profile.nodes.map((n) => [n.id, n]));
      const parent = new Map();
      for (const n of profile.nodes) for (const ch of n.children ?? []) parent.set(ch, n.id);
      const key = (n) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`;
      profile.samples.forEach((id, i) => {
        const d = (dt[i] ?? 0) / 1000;
        self.set(key(byId.get(id)), (self.get(key(byId.get(id))) ?? 0) + d);
        const seen = new Set();
        for (let cur = id; cur != null; cur = parent.get(cur)) {
          const k = key(byId.get(cur));
          if (seen.has(k)) continue;
          seen.add(k);
          tot.set(k, (tot.get(k) ?? 0) + d);
        }
      });
      console.log(`${PHASE} profile, self time (ms):`);
      for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`  ${Math.round(v)}\t${k}`);
      console.log(`${PHASE} profile, total time (ms):`);
      for (const [k, v] of [...tot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60)) console.log(`  ${Math.round(v)}\t${k}`);
    };
    if (READ) {
      if (process.env.PERF_PROFILE && PHASE === 'read') await startProfile();
      const m0 = await metricsNow(cdp);
      const t0 = await now(pg);
      await h.switchLayer(pg, 'busy');
      await pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-graded') ?? '').length > 0, null, { timeout: 180000, polling: 250 });
      await pg.waitForTimeout(1000);
      const t1 = await now(pg);
      const md = metricDelta(m0, await metricsNow(cdp));
      if (process.env.PERF_PROFILE && PHASE === 'read') await stopProfile();
      result.read = { ...(await windowStats(pg, t0, t1)), ...md };
      console.log('read', JSON.stringify(result.read));
    }
    if (process.env.PERF_PROFILE && PHASE === 'switch') await startProfile();
    // Switches: a tap on the next neighborhood's card, as a swipe of the row ends (the map eases there and its layers follow).
    for (let i = 0; i < SWITCHES; i++) {
      const sel0 = await pg.evaluate(() => document.querySelector('[data-testid=atlas-tile][data-selected="1"]')?.dataset.name ?? null);
      const next = hoods[(hoods.indexOf(sel0) + 1) % hoods.length];
      const tile = pg.locator(`[data-testid=atlas-tile][data-name="${next}"]`).first();
      await tile.scrollIntoViewIfNeeded().catch(() => {});
      await pg.waitForTimeout(600);
      const m0 = await metricsNow(cdp);
      const c0 = await pg.evaluate(() => ({ ...window.__perf }));
      const t0 = await now(pg);
      await tile.click();
      await pg.waitForTimeout(3000);
      const t1 = await now(pg);
      const md = metricDelta(m0, await metricsNow(cdp));
      const c1 = await pg.evaluate(() => ({ ...window.__perf }));
      const counts = Object.fromEntries(Object.keys(c1).filter((k) => c1[k] !== (c0[k] ?? 0)).map((k) => [k, c1[k] - (c0[k] ?? 0)]));
      const sel1 = await pg.evaluate(() => document.querySelector('[data-testid=atlas-tile][data-selected="1"]')?.dataset.name ?? null);
      const row = { from: sel0, to: sel1, ...(await windowStats(pg, t0, t1)), ...md, markers: (await markers(pg)).total, counts };
      result.switch.push(row);
      console.log('switch', JSON.stringify(row));
    }
    if (process.env.PERF_PROFILE && PHASE === 'switch') await stopProfile();
    if (process.env.PERF_SHOT) await pg.screenshot({ path: process.env.PERF_SHOT });

    // Drags with Move map on: the map follows the finger.
    // From the keyboard: a tapped card's overlay can sit over the button.
    await pg.locator('[data-testid=atlas-move-map]').focus();
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(300);
    if ((await pg.locator('[data-testid=atlas-move-map]').getAttribute('aria-pressed')) !== 'true') throw new Error('Move map did not turn on');
    await pg.waitForTimeout(800);
    if (process.env.PERF_PROFILE && PHASE === 'drag') await startProfile();
    for (let i = 0; i < DRAGS; i++) {
      const { x, y } = await h.bareMapPoint(pg);
      const dir = i % 2 ? -1 : 1;
      await pg.mouse.move(x, y);
      await pg.mouse.down();
      const m0 = await metricsNow(cdp);
      const t0 = await now(pg);
      for (let k = 1; k <= 45; k++) {
        await pg.mouse.move(x + dir * k * 5, y + dir * k * 2);
        await pg.waitForTimeout(16);
      }
      const t1 = await now(pg);
      const md = metricDelta(m0, await metricsNow(cdp));
      await pg.mouse.up();
      const row = { ...(await windowStats(pg, t0, t1)), ...md, markers: (await markers(pg)).total };
      result.drag.push(row);
      console.log('drag', JSON.stringify(row));
      await pg.waitForTimeout(1500);
    }
    if (process.env.PERF_PROFILE && PHASE === 'drag') await stopProfile();
    result.summary = { switch: summarize(result.switch), drag: summarize(result.drag) };
    console.log('markers at start', JSON.stringify(result.markersAtStart));
    console.log('summary', JSON.stringify(result.summary, null, 1));
    if (process.env.PERF_JSON) fs.writeFileSync(process.env.PERF_JSON, JSON.stringify(result, null, 1));
    if (h.errors.length) console.log('page errors', h.errors.slice(0, 5));
  } finally {
    await h.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
