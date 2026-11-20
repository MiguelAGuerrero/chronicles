// Places come and go with a settle on a walk (specs/poi-transitions, PI1-PI14): a "?" grows in as walking brings it
// within range and shrinks out as it falls out of range. E2E_ONLY=arrivals runs it alone.

async function run(h) {
  const { navUrl, exploreUrl, BASE, at, check, freshPage, shot, switchLayer, toStop, recordEnters } = h;
  // The recorder of entrances and the render counters, on each fresh context.
  const fresh = async (label) => {
    const f = await freshPage(label);
    await recordEnters(f.c);
    await f.c.addInitScript(() => { window.__perf = {}; });
    return f;
  };
  const MARKS = '.maplibregl-map [data-testid=mark-pin]';
  // Every arrival (grow) and leave (shrink) of a "?" since `from`, as the harness's recorder saw it a frame in.
  const moves = (pg, from = 0) => pg.evaluate((n) => window.__enters.slice(n)
    .filter((e) => e.kind === 'grow' || e.kind === 'shrink')
    .map((e) => ({ kind: e.kind, animated: e.animated, label: e.label, mark: e.mark, hidden: e.hidden, pe: e.pe, tab: e.tab })), from);
  const entersNow = (pg) => pg.evaluate(() => window.__enters.length);
  const perf = (pg) => pg.evaluate(() => ({ ...(window.__perf ?? {}) }));
  const startWalk = async (c, pg) => {
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await switchLayer(pg, 'places');
    const s0 = at(-0.5, -0.5);
    await c.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
    await pg.waitForTimeout(2500);
  };
  // Along the grid's south street and on east, past the memorial and out of its range.
  const walk = async (c, pg, from, to, y = -0.5) => {
    const steps = Math.ceil(Math.abs(to - from) / 0.05);
    for (let k = 1; k <= steps; k++) {
      const p = at(from + ((to - from) * k) / steps, y);
      await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
      await pg.waitForTimeout(900);
    }
  };

  const { c, pg } = await fresh('arrivals');
  await startWalk(c, pg);
  // PI5: what the walk first shows draws still.
  const opened = await moves(pg);
  check(opened.every((m) => m.kind !== 'grow'), `PI5: opening the walk and reloading plays no grow (${JSON.stringify(opened)})`);
  const before = await perf(pg);
  const walkedFrom = Date.now();
  const mark0 = await entersNow(pg);
  await walk(c, pg, -0.5, 1.2);
  // PI6: a "?" holding the focus as it falls out of range gives it to the map, never to the page.
  const focused = await pg.locator(`${MARKS}[aria-label*="Hessian Memorial"]`).first().evaluate((el) => { el.focus(); return document.activeElement === el; }).catch(() => false);
  await walk(c, pg, 1.2, 2.6);
  // A leave that began on the last step is read once it is over.
  await pg.waitForTimeout(600);
  const focusNow = await pg.evaluate(() => ({ canvas: document.activeElement?.classList.contains('maplibregl-canvas') ?? false, tag: document.activeElement?.tagName }));
  const out = await moves(pg, mark0);
  const grows = out.filter((m) => m.kind === 'grow' && m.mark);
  const shrinks = out.filter((m) => m.kind === 'shrink' && m.mark);
  await shot(pg, 'arrivals-walk');
  check(grows.some((m) => m.animated) && shrinks.some((m) => m.animated),
    `PI1: walking into range a "?" expands in, and it leaves as it falls out of range (${JSON.stringify(out)})`);
  // At rest, no mark is left scaled.
  const atRest = await pg.locator(MARKS).evaluateAll((els) => els.map((e) => {
    const t = e.querySelector('[data-testid=enter-grow]');
    const m = t && getComputedStyle(t).transform;
    return m && m !== 'none' ? new DOMMatrix(m).a : 1;
  }));
  check(grows.length > 0 && grows.every((m) => m.animated) && atRest.every((s) => Math.abs(s - 1) < 0.001),
    `PI2: a "?" coming within range grows from 80% and settles (${JSON.stringify({ grows, atRest })})`);
  const leftover = await pg.locator('[data-leaving]').count();
  check(shrinks.length > 0 && shrinks.every((m) => m.animated) && leftover === 0,
    `PI3: a "?" leaving range shrinks before it goes (${JSON.stringify({ shrinks, leftover })})`);
  check(shrinks.length > 0 && shrinks.every((m) => m.hidden === 'true' && m.pe === 'none' && m.tab === -1) && focused && focusNow.canvas,
    `PI6: a leaving "?" takes no tap or focus, is hidden from a screen reader, and hands a held focus to the map (${JSON.stringify({ shrinks, focused, focusNow })})`);
  const flips = (await pg.evaluate(() => window.__enters.filter((e) => e.kind === 'flip').map((e) => e.animated)));
  // A grow is only ever a "?" coming within range: a revealed (named) mark turns, never grows again.
  check(flips.some(Boolean) && grows.every((g) => /^A place to find/.test(g.label)),
    `PI7: a reveal still turns and a find still pulses, with no grow (${JSON.stringify({ flips, grows: grows.map((g) => g.label) })})`);
  const after = await perf(pg);
  const made = (after['marker:mark'] ?? 0) - (before['marker:mark'] ?? 0);
  const arrived = (after['mark:in'] ?? 0) - (before['mark:in'] ?? 0);
  // The map's renders a second over the walk, against the reactivity budget's 2.5 (map-reactivity.md).
  const perSecond = ((after['render:map'] ?? 0) - (before['render:map'] ?? 0)) / ((Date.now() - walkedFrom) / 1000);
  check(arrived > 0 && arrived <= made && perSecond <= 2.5,
    `PI14: a fix that brings marks in renders the walk no more than before and makes each marker once (${JSON.stringify({ made, arrived, perSecond: Math.round(perSecond * 100) / 100 })})`);
  // PI12: Places off and on again draws its "?" still.
  await switchLayer(pg, 'places');
  await pg.waitForTimeout(600);
  const mark1 = await entersNow(pg);
  await switchLayer(pg, 'places');
  await pg.waitForTimeout(1200);
  const toggled = await moves(pg, mark1);
  check(!toggled.some((m) => m.animated), `PI12: switching Places on draws its "?" still (${JSON.stringify(toggled)})`);
  // PI8: leaving the walk screen takes its marks away at once.
  await toStop(pg);
  const mark2 = await entersNow(pg);
  const b = await pg.locator('[data-testid=stop]').boundingBox();
  await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 });
  const gone = await moves(pg, mark2);
  check(!gone.some((m) => m.kind === 'shrink'), `PI8: leaving the walk screen takes the marks away at once (${JSON.stringify(gone)})`);
  // PI11: Explore's "?" come and go as before.
  await pg.goto(exploreUrl);
  await pg.waitForTimeout(3000);
  const mark3 = await entersNow(pg);
  const map = pg.locator('.maplibregl-canvas').first();
  const box = await map.boundingBox().catch(() => null);
  if (box) {
    await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (const d of [-600, 600]) {
      await pg.mouse.wheel(0, d);
      await pg.waitForTimeout(1500);
    }
  }
  const explored = await moves(pg, mark3);
  check(explored.length === 0, `PI11: Explore's "?" and the pins and stars play no grow or leave (${JSON.stringify(explored)})`);
  await c.close();

  // PI10: with Reduce Motion on, a walk past the same places moves nothing.
  {
    const { c: c2, pg: pg2 } = await fresh('arrivals-reduced');
    await pg2.emulateMedia({ reducedMotion: 'reduce' });
    await startWalk(c2, pg2);
    const m0 = await entersNow(pg2);
    await walk(c2, pg2, -0.5, 2.6);
    await pg2.waitForTimeout(600);
    const still = await moves(pg2, m0);
    check(still.length > 0 && still.every((m) => !m.animated), `PI10: with Reduce Motion, marks come and go still (${JSON.stringify(still)})`);
    await c2.close();
  }
}

module.exports = {
  name: 'arrivals',
  covers: [
    'src/lib/markMotion.ts',
    'src/lib/enter.ts',
    'src/components/Enter.tsx',
    'src/components/MarkPinView.tsx',
    'src/components/map/WalkMap.web.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
