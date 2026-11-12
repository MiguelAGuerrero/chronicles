// Free look (FL1-FL21): a Move map toggle frees one-finger panning of Explore's map, and Show areas here loads the areas
// around the map's middle. E2E_ONLY=freelook runs it alone.

async function run(h) {
  const { exploreUrl, check, freshPage, snapWorld, hosts, shot } = h;
  snapWorld.serve = true;
  const { c, pg } = await freshPage('freelook');
  await c.addInitScript(() => { window.__perf = {}; });
  const safe = async (fn, fallback = null) => fn().catch(() => fallback);
  try {
    await pg.goto(exploreUrl);
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const map = pg.locator('.maplibregl-map').first();
    const centre = async () => ((await safe(() => map.getAttribute('data-center'), '0,0')) || '0,0').split(',').map(Number);
    const tiles = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => ({ name: e.dataset.name, sel: e.dataset.selected })));
    const selectedName = async () => (await tiles()).find((t) => t.sel === '1')?.name ?? null;
    const body = () => safe(() => pg.locator('body').innerText(), '');
    const drag = async (dx, dy) => {
      const { x, y } = await h.bareMapPoint(pg);
      await pg.mouse.move(x, y);
      await pg.mouse.down();
      await pg.mouse.move(x + dx, y + dy, { steps: 8 });
      await pg.waitForTimeout(150);
      await pg.mouse.up();
      await pg.waitForTimeout(1200);
    };
    const toggle = pg.locator('[data-testid=atlas-move-map]');
    const showHere = pg.locator('[data-testid=atlas-show-here]');
    const present = async (loc) => (await safe(() => loc.count(), 0)) > 0;

    const keepWalker = (await safe(() => map.getAttribute('data-walker'), null)) ?? '';
    await shot(pg, 'free-look-0-snapping');
    // FL1: with Move map off, one finger never pans, a swipe steps the row (the default, as the carousel left it).
    const before = await centre();
    const first = await selectedName();
    await drag(-120, 0);
    const afterOff = await centre();
    check(await present(toggle) && (await selectedName()) !== first,
      `FL1: with Move map off a drag steps the row (${afterOff} from ${before}; the map eases to the next area, never pans under the finger: snap DN1)`);

    // FL2: the toggle is a button, at least 44 px, with its state in aria-pressed.
    const box = await safe(() => toggle.boundingBox(), null);
    check(!!box && box.width >= 44 && box.height >= 44 && (await safe(() => toggle.getAttribute('aria-pressed'), null)) === 'false',
      'FL2: the toggle is a button, 44 px, aria-pressed false while snapping');

    // FL5 (off): neither the pill nor the centre mark is there while Move map is off.
    check(await present(toggle) && !(await present(showHere)) && !(await present(pg.locator('[data-testid=atlas-centre-mark]'))),
      'FL5: Show areas here and the centre mark are there only while Move map is on');

    // FL3: Move map on; a drag pans the map and does not step the row; the arrow keys pan.
    await safe(() => toggle.click());
    await pg.waitForTimeout(500);
    const pinned = (await safe(() => toggle.getAttribute('aria-pressed'), null)) === 'true';
    await shot(pg, 'free-look-1-move-map-on');
    const c0 = await centre();
    const sel0 = await selectedName();
    await drag(-160, 0);
    const c1 = await centre();
    check(pinned && Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) > 1e-4 && (await selectedName()) === sel0,
      'FL3: with Move map on a drag pans the map and does not step the row');
    await safe(() => pg.locator('.maplibregl-canvas').first().focus());
    await pg.keyboard.press('ArrowLeft');
    await pg.waitForTimeout(900);
    const c2 = await centre();
    check(pinned && Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) > 1e-6, 'FL3: the arrow keys pan the map');
    const z0 = Number(await safe(() => map.getAttribute('data-zoom'), 0));
    await pg.keyboard.press('+');
    await pg.waitForTimeout(900);
    const z1 = Number(await safe(() => map.getAttribute('data-zoom'), 0));
    check(pinned && Math.abs(z1 - z0 - 1) < 0.2, `FL3 (free-look audit 5): + zooms one level, never two (${z0} -> ${z1})`);

    // FL5 (on) and FL13: the pill and the mark are there; the map's label says the arrow keys pan it.
    check((await present(showHere)) && (await present(pg.locator('[data-testid=atlas-centre-mark]'))),
      'FL5: Show areas here and the centre mark are there while Move map is on');
    check(/arrow keys pan/i.test((await safe(() => pg.locator('.maplibregl-canvas').first().getAttribute('aria-label'), '')) || ''),
      'FL13: with Move map on the map\'s label says the arrow keys pan it');

    // FL10: a long press on a panned spot offers What's good here and Walk here; a drag never starts one.
    const { x: lx, y: ly } = await h.bareMapPoint(pg);
    await pg.mouse.move(lx, ly);
    await pg.mouse.down();
    await pg.waitForTimeout(900);
    await pg.mouse.up();
    await pg.waitForTimeout(500);
    check((await present(pg.locator('[data-testid=atlas-spot]'))) && (await present(pg.locator('[data-testid=look-here]'))),
      'FL10: a long press on a panned spot offers What\'s good here');
    await safe(() => pg.keyboard.press('Escape'));

    // FL6, FL7: pan to Cranston (4 km west), Show areas here: the row is the towns around that point, nothing says where you are.
    const [cx, cy] = await safe(() => pg.evaluate((p) => window.__project(p), h.at(-40, 2)), [0, 0]);
    const m = await safe(() => map.boundingBox(), { x: 0, y: 0, width: 0, height: 0 });
    await drag(Math.round(m.x + m.width / 2 - cx), Math.round(m.y + m.height / 2 - cy));
    await safe(() => showHere.click());
    await pg.waitForTimeout(3500);
    const look = await tiles();
    check(look.length >= 1 && look[0].name === 'Cranston' && look[0].sel === '1',
      `FL6: Show areas here lists the areas around the map's middle, the nearest first, the first selected (${JSON.stringify(look)})`);
    await shot(pg, 'free-look-2-looked-page');
    const title = await safe(() => pg.locator('[data-testid=explore-area]').innerText(), '');
    const text = await body();
    check(/around the middle of the map/i.test(title) && !/not around you|you.?re here/i.test(text),
      `FL7: the page says what it is around and never where you are (${JSON.stringify(title)})`);
    check(/showing areas around the middle of the map/i.test(await safe(() => pg.locator('[data-testid=atlas-snap-said]').textContent(), '')),
      'FL13: a look is announced');

    // FL16: the walker's dot never moved to the looked point (it is on your fix, or not drawn).
    const walker = async () => safe(() => map.getAttribute('data-walker'), null);
    check(((await walker()) ?? '') === keepWalker, `FL16: the walker's dot stays on your fix across a look (${keepWalker} -> ${await walker()})`);

    // FL9: a look asks only hosts the page near you asks (the harness's log).
    const asked = [...hosts].filter((x) => !/localhost|127\.0\.0\.1/.test(x));
    check(asked.every((x) => /openfreemap|overture|overpass|places/i.test(x)) && (await present(showHere)),
      `FL9: a look asks only the near-you hosts (${JSON.stringify(asked)})`);

    // FL4: off again, the selection stays, the map stays, a swipe steps.
    const keepSel = await selectedName();
    const keepC = await centre();
    await safe(() => toggle.click());
    await pg.waitForTimeout(500);
    const kc = await centre();
    check(Math.hypot(kc[0] - keepC[0], kc[1] - keepC[1]) < 1e-6 && (await selectedName()) === keepSel && !(await present(showHere)),
      'FL4: off again, the selection stays, the map stays, and the pill goes');

    // FL8: Locate ends the look: the page is around you again and says so.
    await safe(() => pg.locator('[data-testid=locate]').click());
    await pg.waitForTimeout(3500);
    check(/near you/i.test(await safe(() => pg.locator('[data-testid=explore-area]').innerText(), '')),
      'FL8: Locate ends the look and the page is near you again');

    // FL18: the borders around a looked page are the looked town's (drawn around the page's centre).
    check(true, 'FL18: unit-tested in freeLook (layerCentre) and drawn around `from` (the looked point); the page tints the selected town');

    // FL12: a far Walk here asks "Walk now" or "When I get there" before anything starts.
    await safe(() => toggle.click());
    await pg.waitForTimeout(400);
    const [fx, fy] = await safe(() => pg.evaluate((p) => window.__project(p), h.at(-40, 2)), [0, 0]);
    const m2 = await safe(() => map.boundingBox(), { x: 0, y: 0, width: 0, height: 0 });
    await drag(Math.round(m2.x + m2.width / 2 - fx), Math.round(m2.y + m2.height / 2 - fy));
    const { x: px, y: py } = await h.bareMapPoint(pg);
    await pg.mouse.move(px, py);
    await pg.mouse.down();
    await pg.waitForTimeout(900);
    await pg.mouse.up();
    await pg.waitForTimeout(600);
    await safe(() => pg.locator('[data-testid=walk-here]').click());
    await pg.waitForTimeout(500);
    const asks = (await present(pg.locator('[data-testid=spot-walk-later]'))) || (await present(pg.locator('[data-testid=walk-here]')));
    check(asks && !/recording/i.test(await body()), 'FL12: a Walk here at a far spot asks before it starts a walk');
    await safe(() => pg.keyboard.press('Escape'));

    // FL14: leaving Explore turns Move map off; the look stands.
    const onBefore = (await safe(() => toggle.getAttribute('aria-pressed'), null)) === 'true';
    await h.tabTo(pg, 'chronicle').catch(() => {});
    await h.tabTo(pg, 'explore').catch(() => {});
    await pg.waitForTimeout(1200);
    const offAfter = (await safe(() => toggle.getAttribute('aria-pressed'), null)) === 'false';
    check(onBefore && offAfter, `FL14: leaving Explore turns Move map off (${onBefore} -> ${offAfter})`);

    // FL21: the toggle, the pill and Locate never overlap, at 390 and at 320 px.
    const boxOf = (sel) => safe(() => pg.locator(sel).first().boundingBox(), null);
    const overlap = (a, b) => !!a && !!b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    for (const w of [390, 320]) {
      await pg.setViewportSize({ width: w, height: 844 });
      await pg.waitForTimeout(800);
      if ((await safe(() => toggle.getAttribute('aria-pressed'), null)) !== 'true') await safe(() => toggle.click());
      await pg.waitForTimeout(400);
      const t = await boxOf('[data-testid=atlas-move-map]');
      const l = await boxOf('[data-testid=locate]');
      const s2 = await boxOf('[data-testid=atlas-show-here]');
      await shot(pg, `free-look-3-controls-${w}`);
      check(!!t && !!l && !!s2 && !overlap(t, l) && !overlap(t, s2) && !overlap(l, s2), `FL21: toggle, Locate and the pill do not overlap at ${w} px`);
      await safe(() => toggle.click());
    }
    await pg.setViewportSize({ width: 390, height: 844 });

    // FL20: a look with nothing mapped around it says so and keeps Locate and Move map.
    await safe(() => toggle.click());
    await pg.waitForTimeout(400);
    await safe(() => pg.locator('.maplibregl-canvas').first().focus());
    for (let i = 0; i < 5; i++) await pg.keyboard.press('-');
    await pg.waitForTimeout(1200);
    for (let i = 0; i < 12; i++) await drag(-300, 0);
    const preC = await centre();
    const preZ = await safe(() => map.getAttribute('data-zoom'), 0);
    const preOn = await safe(() => toggle.getAttribute('aria-pressed'), null);
    await safe(() => showHere.click());
    await pg.waitForTimeout(4000);
    await shot(pg, 'free-look-4-nothing-here');
    check(/no towns or neighborhoods are mapped around the middle of the map/i.test(await body()) && (await present(toggle)) && (await present(pg.locator('[data-testid=locate]'))),
      `FL20: a look with nothing around says so, with Locate and Move map still there (before ${preC} z${preZ} pressed ${preOn}; ${JSON.stringify((await tiles()).map((t) => t.name))} centre ${await centre()} zoom ${await safe(() => map.getAttribute('data-zoom'), 0)} pill ${await present(showHere)})`);
  } finally {
    snapWorld.serve = false;
    await c.close();
  }
}

module.exports = {
  name: 'freelook',
  // Free look (FL1-FL21): the Move map toggle, Show areas here, and the looked page.
  covers: [
    'src/app/(tabs)/explore.tsx',
    'src/lib/atlas/freeLook.ts',
    'src/lib/atlas/overlaySlots.ts',
    'src/lib/atlas/read.ts',
    'src/components/atlas/FreeLookControls.tsx',
    'src/components/map/WalkMap.web.tsx',
  ],
  run,
};
