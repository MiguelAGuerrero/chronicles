// Explore in a dense city (DC1-DC19, decision 0156): the Busy layer's names drawn by the map in the harness's dense
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
  // audit 4 (the owner's call: once per 300 m): the names given twice within 300 m of each other.
  const metres = (a, b) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 111320);
  const twiceNear = (list) => [...new Set(list.filter((g, i) => list.some((o, j) => j !== i && o.name === g.name && metres(o.at, g.at) < 300)).map((g) => g.name))];
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

    // The first read: the Busy layer on. Its window here also holds tasks of about 800 ms that perf-explore's same read
    // at normal speed doesn't show (its longest is about 130 ms); not yet explained (spec record), so DC7 times a later
    // read, Far Point's, below.
    const first0 = await pg.evaluate(() => performance.now());
    await h.switchLayer(pg, 'busy');
    await safe(() => pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-graded') ?? '').length > 0, null, { timeout: 120000 }));
    await pg.waitForTimeout(1500);
    const firstLongs = await pg.evaluate((a) => window.__longs.filter(([s]) => s >= a).map(([s, d]) => [Math.round(s - a), Math.round(d)]).sort((x, y) => y[1] - x[1]), first0);
    check((firstLongs[0]?.[1] ?? 0) <= 250, `explore-dense-city audit 2: the first Busy switch-on holds no task on the page past 250 ms (longest ${firstLongs.slice(0, 3).map(([at, d]) => `${d} ms at +${at}`).join(', ') || 'none'})`);
    // DC17 at street zoom (15): in this downtown the "?" pins cover the screen, and no name is drawn under any of them.
    const mid = (await safe(() => map().getAttribute('data-center'), '0,0')).split(',').map(Number);
    await pg.evaluate(([at]) => window.__zoomTo?.(at, 15), [mid]);
    await safe(() => pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-busy-given') ?? '[]') !== '[]', null, { timeout: 30000 }));
    // The selected area's "?" pins come with its ring's read, computed off the page (audit 2): wait for them.
    await safe(() => pg.waitForFunction(() => document.querySelectorAll('[data-testid=mark-pin]').length > 0, null, { timeout: 30000 }));
    await idle();
    await shot(pg, 'dense-1-names');
    const underPinsAt = async () => {
      const boxes = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=mark-pin]')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => [r.x, r.y, r.right, r.bottom]));
      const under = await pg.evaluate((bs) => bs.flatMap(([x0, y0, x1, y1]) => window.__busyNamesIn?.(x0 + 4, y0 + 4, x1 - 4, y1 - 4) ?? ['(no hook)']), boxes);
      return { pins: boxes.length, under: [...new Set(under)] };
    };
    const at15 = await underPinsAt();
    check(at15.pins > 0 && at15.under.length === 0, `DC17: at zoom 15 no busy name under any of ${at15.pins} "?" pins (${at15.under.join(', ')})`);
    // Close in (16) on a busy street's own label point, where the pins spread apart and leave room for names.
    const firstGiven = (await given())[0];
    await pg.evaluate(([at]) => window.__zoomTo?.(at, 16), [firstGiven?.at ?? mid]);
    await safe(() => pg.waitForFunction(() => (document.querySelector('.maplibregl-map')?.getAttribute('data-busy-names') ?? '[]') !== '[]', null, { timeout: 30000 }));
    await idle();
    await shot(pg, 'dense-1b-names-close');

    // DC1: the names are the map's own text: drawn, and none of them a page element over the map.
    const names = await drawn();
    const giv = await given();
    const asMarkers = await pg.evaluate((ns) => [...document.querySelectorAll('.maplibregl-marker')].filter((m) => ns.includes((m.textContent ?? '').trim())).length, giv.map((g) => g.name));
    const twice = twiceNear(giv);
    check(twice.length === 0, `explore-dense-city audit 4: on Explore no street is named twice within 300 m (${twice.join(', ')})`);
    check(names.length > 0 && asMarkers === 0, `DC1: busy names are drawn by the map (${names.length}: ${names.slice(0, 4).join(', ')}), none as page elements (${asMarkers})`);
    // DC2: in the dense downtown there is not room for every name, so some are left out rather than stacked.
    check(giv.length > names.length && new Set(names).size === names.length, `DC2: fewer names drawn (${names.length}) than given (${giv.length}), none twice`);

    // DC14: no busy name under the selected area's name.
    const label = await safe(() => pg.locator('[data-testid=area-point][data-selected="1"]').first().boundingBox(), null);
    const under = label ? await pg.evaluate((b) => window.__busyNamesIn?.(b.x, b.y, b.x + b.width, b.y + b.height) ?? ['(no hook)'], label) : ['(no selected label)'];
    check(under.length === 0, `DC14: no busy name under the selected area's name (${under.join(', ')})`);

    // audit 11: no busy name under one of Explore's controls, and none cut by the map's edge.
    const clearOfControls = async () => {
      const ids = ['atlas-title-card', 'layers', 'atlas-move-map', 'atlas-show-here', 'compass', 'locate', 'atlas-back-pill'];
      const rects = await pg.evaluate((list) => list.flatMap((id) => [...document.querySelectorAll(`[data-testid="${id}"]`)].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0).map((r) => [id, r.x, r.y, r.right, r.bottom])), ids);
      const under = await pg.evaluate((rs) => rs.flatMap(([id, x0, y0, x1, y1]) => (window.__busyNamesIn?.(x0, y0, x1, y1) ?? []).map((n) => `${n} under ${id}`)), rects);
      const cut = await pg.evaluate(() => {
        const r = document.querySelector('.maplibregl-canvas').getBoundingClientRect();
        const band = (x0, y0, x1, y1) => window.__busyNamesIn?.(x0, y0, x1, y1) ?? [];
        return [...band(r.left, r.top, r.left + 2, r.bottom), ...band(r.right - 2, r.top, r.right, r.bottom), ...band(r.left, r.top, r.right, r.top + 2), ...band(r.left, r.bottom - 2, r.right, r.bottom)].map((n) => `${n} cut by the edge`);
      });
      return [...under, ...cut];
    };
    const crowded16 = await clearOfControls();
    check(crowded16.length === 0, `explore-dense-city audit 11: at zoom 16 no busy name under a control or cut by the edge (${crowded16.join(', ')})`);

    // DC17 close in: no busy name under any "?" pin either.
    const at17 = await underPinsAt();
    check(at17.pins > 0 && at17.under.length === 0, `DC17: at zoom 16 no busy name under any of ${at17.pins} "?" pins (${at17.under.join(', ')})`);

    // DC15: a tap on a busy name opens nothing and selects nothing.
    const hit = await pg.evaluate(() => window.__busyNamePoint?.() ?? null);
    const sel0 = await selected();
    if (hit) await pg.mouse.click(hit.x, hit.y);
    await pg.waitForTimeout(900);
    check(!!hit && (await selected()) === sel0 && !(await pg.locator('[data-testid=atlas-card-close]').count()) && !(await pg.locator('[data-testid=atlas-spot]').count()),
      `DC15: a tap on "${hit?.name}" opens no card and keeps ${sel0} selected`);
    await closeCard();

    // DC5: a name left out for room is drawn once zooming in on it gives it room.
    const zoom0 = Number(await safe(() => map().getAttribute('data-zoom'), '15'));
    const left = (await given()).find((g) => !names.includes(g.name) && g.at);
    if (left) {
      await pg.evaluate(([at, z]) => window.__zoomTo?.(at, z), [left.at, zoom0 + 2]);
      await idle();
    }
    check(!!left && (await drawn()).includes(left.name), `DC5: "${left?.name}", left out at ${zoom0.toFixed(1)}, is drawn two levels in`);
    await shot(pg, 'dense-2-zoomed-in');
    const crowded18 = await clearOfControls();
    check(crowded18.length === 0, `explore-dense-city audit 11: zoomed in two more, no busy name under a control or cut by the edge (${crowded18.join(', ')})`);
    // explore-dense-city ui 3: turned past a quarter turn, every name still reads upright (a picture for the review).
    await pg.evaluate(() => window.__turn?.(150));
    await idle();
    await shot(pg, 'dense-2b-turned');
    await pg.evaluate(() => window.__turn?.(0));
    await idle();

    // DC6: zoomed out to 12, no busy name (EC7: names from zoom 13).
    const centre = (await safe(() => map().getAttribute('data-center'), '0,0')).split(',').map(Number);
    await pg.evaluate(([at]) => window.__zoomTo?.(at, 12), [centre]);
    await idle();
    check((await drawn()).length === 0 && (await given()).length === 0, `DC6: at zoom 12 the map draws no busy name (${(await drawn()).join(', ')})`);
    await pg.evaluate(([at, z]) => window.__zoomTo?.(at, z), [centre, zoom0]);
    await idle();

    // DC12: a switch between two neighborhoods already read (a swipe: the arrow key on the map) renders Explore at most twice.
    const from = await selected();
    await safe(() => pg.locator('.maplibregl-canvas').first().focus());
    const r0 = await perf('render:explore');
    await pg.keyboard.press('ArrowLeft');
    await pg.waitForTimeout(2500);
    const switchRenders = (await perf('render:explore')) - r0;
    check((await selected()) !== from && switchRenders <= 2, `DC12: a switch from ${from} to ${await selected()} renders Explore ${switchRenders} times (at most 2)`);
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
    const workers0 = await perf('busy:worker');
    await selectCard('Far Point');
    await safe(() => pg.waitForFunction((n) => (window.__perf?.['busy:read'] ?? 0) > n, reads0, { timeout: 30000 }));
    // DC7: from the read's start until its compute is back: off the page, and no task on the page past 250 ms.
    await safe(() => pg.waitForFunction((n) => (window.__perf?.['busy:worker'] ?? 0) > n, workers0, { timeout: 60000 }));
    await pg.waitForTimeout(1500);
    const longs = await pg.evaluate(() => {
      const a = window.__perf?.['mark:busy-read'] ?? 0;
      return window.__longs.filter(([s]) => s >= a).map(([s, d]) => [Math.round(s - a), Math.round(d)]).sort((x, y) => y[1] - x[1]);
    });
    const longest = longs[0]?.[1] ?? 0;
    check((await perf('busy:worker')) > workers0 && longest <= 250,
      `DC7: Far Point's read ran off the page (${(await perf('busy:worker')) - workers0} worker reads) and no task on the page passed 250 ms (longest ${longs.slice(0, 3).map(([at, d]) => `${d} ms at +${at}`).join(', ') || 'none'})`);
    const marks = await pg.evaluate(() => ({ read: window.__perf?.['mark:busy-read'] ?? 0, settled: window.__perf?.['mark:settled'] ?? 0, moved: window.__perf?.['mark:moved'] ?? 0 }));
    check((await perf('busy:read')) > reads0 && marks.read >= marks.settled && marks.settled >= marks.moved,
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
    check(dragRenders <= 1, `DC12: a Move map drag renders Explore ${dragRenders} times (at most once)`);
    check((await safe(() => map().getAttribute('data-busy-over'), null)) === '1', 'DC16: on Explore the busy names sit over the base map\'s names');

    // DC16: on Navigate the base map's names keep their room and the trace draws over the busy names.
    await closeCard();
    await h.tabTo(pg, 'navigate');
    await pg.waitForTimeout(3000);
    const over = await pg.evaluate(() => [...document.querySelectorAll('.maplibregl-map')].filter((m) => m.getBoundingClientRect().width > 0).map((m) => m.getAttribute('data-busy-over')));
    const navGiven = await pg.evaluate(() => [...document.querySelectorAll('.maplibregl-map')].filter((m) => m.getBoundingClientRect().width > 0).flatMap((m) => JSON.parse(m.dataset.busyGiven ?? '[]')));
    const navTwice = twiceNear(navGiven);
    check(navGiven.length > 0 && navTwice.length === 0, `explore-dense-city audit 4: on Navigate no street is named twice within 300 m (${navTwice.join(', ')})`);
    check(over.length > 0 && over.every((v) => v === '0'), `DC16: on Navigate the busy names sit under the base map's names and the trace (${over.join(',')})`);
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
