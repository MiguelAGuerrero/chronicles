// Smooth neighborhood switches (SS1-SS10): the owner's small-town report (Nov 13), "it feels like it's reloading each and
// every time". On Smallton's page (the harness's smallWorld) with the Busy layer on, the arrow key steps through its
// neighborhoods to the end and back, so every step back is a revisit, with the CPU throttled to stand in for a phone.
// E2E_ONLY=switches runs it alone.
//
// It reads what the app counts when window.__perf is defined (perfCount, perfMark), through a Proxy that stamps each one
// with the page's clock, so a switch's map sends, outline derivations and listings are placed before, during or after its
// camera move ('mark:moved' to 'mark:settled').

const RATE = Number(process.env.E2E_SWITCH_RATE ?? 4);
const WAIT = 3500;

async function run(h) {
  const { exploreUrl, check, freshPage, smallWorld, SMALL_TOWN, SMALL_HOODS, at, shot } = h;
  smallWorld.serve = true;
  const { c, pg } = await freshPage('switches');
  const here = at(SMALL_TOWN[0] + 0.5, SMALL_TOWN[1] + 0.5);
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await c.addInitScript(() => {
    const log = (window.__perfLog = []);
    window.__perf = new Proxy({}, { set(t, k, v) { log.push([String(k), performance.now()]); t[k] = v; return true; } });
    const frames = (window.__frames = []);
    const loop = (t) => { frames.push(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    window.__longs = [];
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longs.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
    } catch { /* no long tasks */ }
  });
  const safe = async (fn, fallback = null) => fn().catch(() => fallback);
  const map = () => pg.locator('.maplibregl-map').filter({ visible: true }).first();
  const selected = () => pg.evaluate(() => document.querySelector('[data-testid=atlas-tile][data-selected="1"]')?.dataset.name ?? null);
  const now = () => pg.evaluate(() => performance.now());
  const events = (a, b) => pg.evaluate(([x, y]) => window.__perfLog.filter(([, t]) => t >= x && t <= y), [a, b]);
  const cdp = await c.newCDPSession(pg);
  try {
    await pg.goto(exploreUrl);
    const first = await h.areaTile(pg, SMALL_HOODS[0][0], 90000);
    check(!!(await safe(() => first.count(), 0)), `switches: Smallton's page lists its neighborhoods (${await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.name).join(', '))})`);
    await h.switchLayer(pg, 'busy');
    await safe(() => pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-graded') ?? '').length > 0, null, { timeout: 120000 }));
    // Every neighborhood selected once at normal speed, so each area is read and its outline's tiles are kept.
    await pg.locator('.maplibregl-canvas').first().focus();
    const row = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.name));
    for (let i = 0; i < row.length; i++) {
      await pg.keyboard.press('ArrowRight');
      await pg.waitForTimeout(4000);
    }
    for (let i = 0; i < row.length; i++) {
      await pg.keyboard.press('ArrowLeft');
      await pg.waitForTimeout(1500);
    }
    await pg.waitForTimeout(6000);
    // SS8: the remembered areas were listed while the layer came on (so the count below is not empty by absence).
    const listedAtStart = await pg.evaluate(() => window.__perfLog.filter(([k]) => k === 'busy:list').length);
    // The town's own card leads the row: one step on to its first neighborhood, where the measured switches start.
    await pg.keyboard.press('ArrowRight');
    await pg.waitForTimeout(4000);
    const startAt = await selected();
    await pg.evaluate(([t, z]) => window.__zoomTo(t, z), [at(...SMALL_TOWN), 14.5]);
    await pg.waitForTimeout(3000);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    await pg.waitForTimeout(1500);

    // Forward to the end of the row, then back: every step back is a revisit.
    const n = row.length - 1;
    const keys = [...Array(n).fill('ArrowRight'), ...Array(n).fill('ArrowLeft')];
    const steps = [];
    for (const [i, key] of keys.entries()) {
      await pg.locator('.maplibregl-canvas').first().focus();
      const busyBefore = await safe(() => map().getAttribute('data-busy'), '');
      const t0 = await now();
      await pg.keyboard.press(key);
      await pg.waitForTimeout(WAIT);
      const t1 = await now();
      const ev = await events(t0, t1);
      const moved = ev.find(([k]) => k === 'mark:moved')?.[1] ?? null;
      const settled = [...ev].reverse().find(([k]) => k === 'mark:settled')?.[1] ?? null;
      const during = (t) => moved != null && settled != null && t > moved && t < settled;
      const count = (k, pred = () => true) => ev.filter(([e, t]) => e === k && pred(t)).length;
      const timing = await pg.evaluate(([a, m, s]) => {
        const iv = window.__frames.filter((t) => t >= m && t <= s).map((t, j, f) => (j ? t - f[j - 1] : 0)).slice(1);
        const longs = window.__longs.filter(([st]) => st >= m && st <= s).map(([, d]) => d);
        return { worst: Math.round(Math.max(0, ...iv)), longs: Math.round(longs.reduce((x, y) => x + y, 0)), frames: iv.length, a };
      }, [t0, moved ?? t0, settled ?? t1]);
      steps.push({
        key, to: await selected(), revisit: i >= n,
        busyBefore, busyAfter: await safe(() => map().getAttribute('data-busy'), ''),
        moved: moved != null, settled: settled != null,
        ground: count('hood:ground'), groundMid: count('hood:ground', during),
        strips: count('setData:strips'), pockets: count('setData:pockets'),
        namesMid: count('setData:busy-names', during), namesAfter: count('setData:busy-names', (t) => settled != null && t >= settled), names: count('setData:busy-names'),
        markers: count('marker:area'), listed: count('busy:list'), ...timing,
      });
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await shot(pg, 'switches-1-after');
    const back = steps.filter((s) => s.revisit);
    const fwd = steps.filter((s) => !s.revisit);
    const say = (list, f) => list.map((s) => `${s.to}:${f(s)}`).join(' ');
    check(startAt === row[0] && steps.every((s) => s.moved && s.settled && s.to), `switches: every switch is between neighborhoods, moved the camera and settled (from ${startAt}: ${say(steps, (s) => `${s.moved ? 'm' : '-'}${s.settled ? 's' : '-'}`)})`);

    const groundsFirst = await pg.evaluate(() => window.__perfLog.filter(([k]) => k === 'hood:ground').length);
    check.todo(groundsFirst > 0 && back.every((s) => s.ground === 0), `SS1: a revisit derives no outline (derived ${groundsFirst} in all; on the way back ${say(back, (s) => s.ground)})`);
    check.todo(groundsFirst > 0 && steps.every((s) => s.groundMid === 0), `SS2: no outline is derived during a switch's camera move (${say(steps, (s) => s.groundMid)})`);
    check.todo(back.every((s) => s.strips + s.pockets === 0), `SS3: a switch with the same lines sends no strips or pockets (on the way back ${say(back, (s) => s.strips + s.pockets)})`);
    check.todo(back.every((s) => s.busyBefore === s.busyAfter && s.busyAfter), `SS4: switching neighborhoods on a town's page keeps the same lines (${say(back, (s) => `${s.busyBefore}>${s.busyAfter}`)})`);
    check.todo(steps.every((s) => s.namesMid === 0 && s.namesAfter === 1), `SS5: no busy names sent mid-move, one send at the settle (mid/after: ${say(steps, (s) => `${s.namesMid}/${s.namesAfter}`)})`);
    check.todo(steps.every((s) => s.markers === 0), `SS6: a switch rebuilds no area marker (${say(steps, (s) => s.markers)})`);
    check.todo(listedAtStart > 0 && steps.every((s) => s.listed === 0), `SS8: a switch lists no remembered areas (at the start ${listedAtStart}; per switch ${say(steps, (s) => s.listed)})`);
    check.todo(steps.every((s) => s.longs < 100 && s.worst < 100), `SS9: at ${RATE}x CPU a switch's long tasks inside the ease total under 100 ms and its worst frame is under 100 ms (long tasks ${say(steps, (s) => s.longs)}; worst frame ${say(steps, (s) => s.worst)}; forward ${fwd.length}, back ${back.length})`);

    // SS10: a zoom, by the wheel and in code, clears no name that is drawn.
    const t0 = await now();
    const box = await map().boundingBox();
    if (box) {
      await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
      await pg.mouse.wheel(0, -200);
    }
    await pg.waitForTimeout(1500);
    const mid = (await safe(() => map().getAttribute('data-center'), '0,0')).split(',').map(Number);
    await pg.evaluate(([p]) => window.__zoomTo(p, 15.2), [mid]);
    await pg.waitForTimeout(2500);
    const ev = await events(t0, await now());
    const cleared = ev.filter(([k]) => k === 'busy-names:clear').length;
    const drawn = JSON.parse((await safe(() => map().getAttribute('data-busy-names'), '[]')) || '[]');
    check.todo(cleared === 0 && drawn.length > 0, `SS10: a zoom clears no busy name (cleared ${cleared}; drawn after: ${drawn.slice(0, 4).join(', ')})`);
  } finally {
    smallWorld.serve = false;
    await c.close();
  }
}

module.exports = {
  name: 'switches',
  // Smooth neighborhood switches (SS1-SS10): what a switch sends the map, derives and lists, and when.
  covers: [
    'src/app/(tabs)/explore.tsx',
    'src/components/map/WalkMap.web.tsx',
    'src/lib/areas/{useHoodGround,hoods}.ts',
    'src/lib/atlas/carousel.ts',
    'src/lib/layers/{useBusyLayer,state,busy}.ts',
  ],
  run,
};
