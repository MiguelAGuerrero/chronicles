// Explore in a dense city (DC1-DC16, decision 0151): the Busy layer's names drawn by the map in the harness's dense
// downtown, the read off the page, the read after the settle, and how often Explore renders. E2E_ONLY=dense runs it alone.
// The map's hooks it reads exist only while window.__perf is defined: data-busy-names (the names drawn, written at idle),
// data-busy-given (what the map was given), data-busy-over, window.__zoomTo, __busyNamesIn and __busyNamePoint.

async function run(h) {
  const { exploreUrl, check, freshPage, denseWorld, DENSE_HOODS, shot } = h;
  denseWorld.serve = true;
  const { c, pg } = await freshPage('dense');
  await c.addInitScript(() => {
    window.__perf = {};
    window.__longs = [];
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longs.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
    } catch { /* no long tasks */ }
  });
  const safe = async (fn, fallback = null) => fn().catch(() => fallback);
  const map = () => pg.locator('.maplibregl-map').filter({ visible: true }).first();
  const json = async (attr, fallback) => { const v = await safe(() => map().getAttribute(attr), null); try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
  const drawn = () => json('data-busy-names', []);
  const given = () => json('data-busy-given', []);
  const perf = (k) => pg.evaluate((key) => window.__perf?.[key] ?? 0, k);
  const idle = async () => { await pg.waitForTimeout(400); await safe(() => pg.waitForFunction(() => document.querySelector('.maplibregl-map')?.dataset.idle === '1', null, { timeout: 15000 })); };
  const selected = () => pg.evaluate(() => document.querySelector('[data-testid=atlas-tile][data-selected="1"]')?.dataset.name ?? null);
  const closeCard = async () => {
    await pg.waitForTimeout(800);
    if (await pg.locator('[data-testid=atlas-card-close]').count()) {
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(800);
    }
  };
  try {
    await pg.goto(exploreUrl);
    const first = await h.areaTile(pg, DENSE_HOODS[0], 90000);
    await safe(() => first.click());
    await closeCard();

    // DC7: the first read, timed from the switch on: off the page, and no long task on the page past 250 ms.
    const t0 = await pg.evaluate(() => performance.now());
    await h.switchLayer(pg, 'busy');
    await safe(() => pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-graded') ?? '').length > 0, null, { timeout: 120000 }));
    const t1 = await pg.evaluate(() => performance.now());
    const longest = await pg.evaluate(([a, b]) => Math.max(0, ...window.__longs.filter(([s]) => s >= a && s <= b).map(([, d]) => d)), [t0, t1]);
    check.todo((await perf('busy:worker')) >= 1 && longest <= 250, `DC7: the read ran off the page (${await perf('busy:worker')} worker reads) and no task on the page passed 250 ms (${Math.round(longest)} ms)`);
    // Street zoom around the selected area, where the names draw (EC7: from 13).
    const mid = (await safe(() => map().getAttribute('data-center'), '0,0')).split(',').map(Number);
    await pg.evaluate(([at]) => window.__zoomTo?.(at, 15), [mid]);
    await safe(() => pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-busy-names') ?? '[]') !== '[]', null, { timeout: 30000 }));
    await idle();
    await shot(pg, 'dense-1-names');

    // DC1: the names are the map's own text: drawn, and none of them a page element over the map.
    const names = await drawn();
    const giv = await given();
    const asMarkers = await pg.evaluate((ns) => [...document.querySelectorAll('.maplibregl-marker')].filter((m) => ns.includes((m.textContent ?? '').trim())).length, giv.map((g) => g.name));
    check.todo(names.length > 0 && asMarkers === 0, `DC1: busy names are drawn by the map (${names.length}: ${names.slice(0, 4).join(', ')}), none as page elements (${asMarkers})`);
    // DC2: in the dense downtown there is not room for every name, so some are left out rather than stacked.
    check.todo(giv.length > names.length && new Set(names).size === names.length, `DC2: fewer names drawn (${names.length}) than given (${giv.length}), none twice`);

    // DC14: no busy name under the selected area's name.
    const label = await safe(() => pg.locator('[data-testid=area-point][data-selected="1"]').first().boundingBox(), null);
    const under = label ? await pg.evaluate((b) => window.__busyNamesIn?.(b.x, b.y, b.x + b.width, b.y + b.height) ?? ['(no hook)'], label) : ['(no selected label)'];
    check.todo(under.length === 0, `DC14: no busy name under the selected area's name (${under.join(', ')})`);

    // DC15: a tap on a busy name opens nothing and selects nothing.
    const hit = await pg.evaluate(() => window.__busyNamePoint?.() ?? null);
    const sel0 = await selected();
    if (hit) await pg.mouse.click(hit.x, hit.y);
    await pg.waitForTimeout(900);
    check.todo(!!hit && (await selected()) === sel0 && !(await pg.locator('[data-testid=atlas-card-close]').count()) && !(await pg.locator('[data-testid=atlas-spot]').count()),
      `DC15: a tap on "${hit?.name}" opens no card and keeps ${sel0} selected`);
    await closeCard();

    // DC5: a name left out for room is drawn once zooming in on it gives it room.
    const zoom0 = Number(await safe(() => map().getAttribute('data-zoom'), '15'));
    const left = (await given()).find((g) => !names.includes(g.name) && g.at);
    if (left) {
      await pg.evaluate(([at, z]) => window.__zoomTo?.(at, z), [left.at, zoom0 + 2]);
      await idle();
    }
    check.todo(!!left && (await drawn()).includes(left.name), `DC5: "${left?.name}", left out at ${zoom0.toFixed(1)}, is drawn two levels in`);
    await shot(pg, 'dense-2-zoomed-in');

    // DC6: zoomed out to 12, no busy name (EC7: names from zoom 13).
    const centre = (await safe(() => map().getAttribute('data-center'), '0,0')).split(',').map(Number);
    await pg.evaluate(([at]) => window.__zoomTo?.(at, 12), [centre]);
    await idle();
    check.todo((await drawn()).length === 0 && (await given()).length === 0, `DC6: at zoom 12 the map draws no busy name (${(await drawn()).join(', ')})`);
    await pg.evaluate(([at, z]) => window.__zoomTo?.(at, z), [centre, zoom0]);
    await idle();

    // DC12: a switch between two neighborhoods already read (a swipe: the arrow key on the map) renders Explore at most twice.
    const from = await selected();
    await safe(() => pg.locator('.maplibregl-canvas').first().focus());
    const r0 = await perf('render:explore');
    await pg.keyboard.press('ArrowLeft');
    await pg.waitForTimeout(2500);
    const switchRenders = (await perf('render:explore')) - r0;
    check.todo((await selected()) !== from && switchRenders <= 2, `DC12: a switch from ${from} to ${await selected()} renders Explore ${switchRenders} times (at most 2)`);
    // A card is selected by scrolling the row to it (the carousel selects what stops in the middle), else by a tap.
    const selectCard = async (name) => {
      const tile = pg.locator(`[data-testid=atlas-tile][data-name="${name}"]`).first();
      await safe(() => tile.scrollIntoViewIfNeeded());
      await pg.waitForTimeout(1200);
      if ((await selected()) !== name) await safe(() => tile.click());
      await pg.waitForTimeout(300);
    };

    // DC9: a switch that needs a read (Far Point, 2.2 km west) reads only once the camera has settled.
    const reads0 = await perf('busy:read');
    await selectCard('Far Point');
    await safe(() => pg.waitForFunction((n) => (window.__perf?.['busy:read'] ?? 0) > n, reads0, { timeout: 30000 }));
    const marks = await pg.evaluate(() => ({ read: window.__perf?.['mark:busy-read'] ?? 0, settled: window.__perf?.['mark:settled'] ?? 0, moved: window.__perf?.['mark:moved'] ?? 0 }));
    check.todo((await perf('busy:read')) > reads0 && marks.read >= marks.settled && marks.settled >= marks.moved,
      `DC9: Far Point's read started after the camera settled (moved ${Math.round(marks.moved)}, settled ${Math.round(marks.settled)}, read ${Math.round(marks.read)})`);
    await safe(() => pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-busy-names') ?? '[]') !== '[]', null, { timeout: 60000 }));
    await shot(pg, 'dense-3-far-point');
    await closeCard();

    // DC12: a Move map drag renders Explore once at most, at its end.
    await safe(() => pg.locator('[data-testid=atlas-move-map]').focus());
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(600);
    const { x, y } = await h.bareMapPoint(pg);
    const r1 = await perf('render:explore');
    await pg.mouse.move(x, y);
    await pg.mouse.down();
    for (let k = 1; k <= 20; k++) {
      await pg.mouse.move(x - k * 6, y - k * 2);
      await pg.waitForTimeout(16);
    }
    await pg.mouse.up();
    await pg.waitForTimeout(1500);
    const dragRenders = (await perf('render:explore')) - r1;
    check.todo(dragRenders <= 1, `DC12: a Move map drag renders Explore ${dragRenders} times (at most once)`);
    check.todo((await safe(() => map().getAttribute('data-busy-over'), null)) === '1', 'DC16: on Explore the busy names sit over the base map\'s names');

    // DC16: on Navigate the base map's names keep their room and the trace draws over the busy names.
    await closeCard();
    await h.tabTo(pg, 'navigate');
    await pg.waitForTimeout(3000);
    const over = await pg.evaluate(() => [...document.querySelectorAll('.maplibregl-map')].filter((m) => m.getBoundingClientRect().width > 0).map((m) => m.getAttribute('data-busy-over')));
    check.todo(over.length > 0 && over.every((v) => v === '0'), `DC16: on Navigate the busy names sit under the base map's names and the trace (${over.join(',')})`);
    await shot(pg, 'dense-4-navigate');
  } finally {
    denseWorld.serve = false;
    await c.close();
  }
}

module.exports = {
  name: 'dense',
  // Explore in a dense city (DC1-DC16): the busy names, the read off the page and after the settle, Explore's renders.
  covers: [
    'src/app/(tabs)/explore.tsx',
    'src/components/map/WalkMap.web.tsx',
    'src/components/map/types.ts',
    'src/lib/landing/{names,compute,offPage,offPage.web,compute.worker,read}.ts',
    'src/lib/layers/{useBusyLayer,state}.ts',
    'src/lib/db/index.web.ts',
  ],
  run,
};
