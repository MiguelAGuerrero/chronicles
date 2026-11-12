// Free look (FL1-FL21): a Move map toggle frees one-finger panning of Explore's map, and Show areas here loads the areas
// around the map's middle. Written first, as todos: every check is `check.todo` until its code exists. E2E_ONLY=freelook runs it alone.

async function run(h) {
  const { exploreUrl, check, freshPage, snapWorld, hosts } = h;
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

    // FL1: with Move map off, one finger never pans, a swipe steps the row (the default, as the carousel left it).
    const before = await centre();
    const first = await selectedName();
    await drag(-120, 0);
    const afterOff = await centre();
    check.todo(await present(toggle) && Math.hypot(afterOff[0] - before[0], afterOff[1] - before[1]) < 1e-6 && (await selectedName()) !== first,
      'FL1: with Move map off a drag never pans and a swipe steps the row');

    // FL2: the toggle is a button, at least 44 px, with its state in aria-pressed.
    const box = await safe(() => toggle.boundingBox(), null);
    check.todo(!!box && box.width >= 44 && box.height >= 44 && (await safe(() => toggle.getAttribute('aria-pressed'), null)) === 'false',
      'FL2: the toggle is a button, 44 px, aria-pressed false while snapping');

    // FL5 (off): neither the pill nor the centre mark is there while Move map is off.
    check.todo(await present(toggle) && !(await present(showHere)) && !(await present(pg.locator('[data-testid=atlas-centre-mark]'))),
      'FL5: Show areas here and the centre mark are there only while Move map is on');

    // FL3: Move map on; a drag pans the map and does not step the row; the arrow keys pan.
    await safe(() => toggle.click());
    await pg.waitForTimeout(500);
    const pinned = (await safe(() => toggle.getAttribute('aria-pressed'), null)) === 'true';
    const c0 = await centre();
    const sel0 = await selectedName();
    await drag(-160, 0);
    const c1 = await centre();
    check.todo(pinned && Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) > 1e-4 && (await selectedName()) === sel0,
      'FL3: with Move map on a drag pans the map and does not step the row');
    await safe(() => pg.locator('.maplibregl-canvas').first().focus());
    await pg.keyboard.press('ArrowLeft');
    await pg.waitForTimeout(900);
    const c2 = await centre();
    check.todo(pinned && Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) > 1e-6, 'FL3: the arrow keys pan the map');
    const z0 = Number(await safe(() => map.getAttribute('data-zoom'), 0));
    await pg.keyboard.press('+');
    await pg.waitForTimeout(900);
    const z1 = Number(await safe(() => map.getAttribute('data-zoom'), 0));
    check.todo(pinned && Math.abs(z1 - z0 - 1) < 0.2, `FL3 (free-look audit 5): + zooms one level, never two (${z0} -> ${z1})`);

    // FL5 (on) and FL13: the pill and the mark are there; the map's label says the arrow keys pan it.
    check.todo((await present(showHere)) && (await present(pg.locator('[data-testid=atlas-centre-mark]'))),
      'FL5: Show areas here and the centre mark are there while Move map is on');
    check.todo(/arrow keys pan/i.test((await safe(() => pg.locator('.maplibregl-canvas').first().getAttribute('aria-label'), '')) || ''),
      'FL13: with Move map on the map\'s label says the arrow keys pan it');

    // FL10: a long press on a panned spot offers What's good here and Walk here; a drag never starts one.
    const { x: lx, y: ly } = await h.bareMapPoint(pg);
    await pg.mouse.move(lx, ly);
    await pg.mouse.down();
    await pg.waitForTimeout(900);
    await pg.mouse.up();
    await pg.waitForTimeout(500);
    check.todo((await present(pg.locator('[data-testid=atlas-spot]'))) && (await present(pg.locator('[data-testid=look-here]'))),
      'FL10: a long press on a panned spot offers What\'s good here');
    await safe(() => pg.keyboard.press('Escape'));

    // FL6, FL7: pan to Cranston (4 km west), Show areas here: the row is the towns around that point, nothing says where you are.
    const [cx, cy] = await safe(() => pg.evaluate((p) => window.__project(p), h.at(-40, 2)), [0, 0]);
    const m = await safe(() => map.boundingBox(), { x: 0, y: 0, width: 0, height: 0 });
    await drag(Math.round(m.x + m.width / 2 - cx), Math.round(m.y + m.height / 2 - cy));
    await safe(() => showHere.click());
    await pg.waitForTimeout(3500);
    const look = await tiles();
    check.todo(look.length >= 1 && look[0].name === 'Cranston' && look[0].sel === '1',
      `FL6: Show areas here lists the areas around the map's middle, the nearest first, the first selected (${JSON.stringify(look)})`);
    const title = await safe(() => pg.locator('[data-testid=explore-area]').innerText(), '');
    const text = await body();
    check.todo(/around the middle of the map/i.test(title) && !/not around you|you.?re here/i.test(text),
      `FL7: the page says what it is around and never where you are (${JSON.stringify(title)})`);
    check.todo(/showing areas around the middle of the map/i.test(await safe(() => pg.locator('[data-testid=atlas-snap-said]').textContent(), '')),
      'FL13: a look is announced');

    // FL9: a look asks only hosts the page near you asks (the harness's log).
    const asked = [...hosts].filter((x) => !/localhost|127\.0\.0\.1/.test(x));
    check.todo(asked.every((x) => /openfreemap|overture|overpass|places/i.test(x)) && (await present(showHere)),
      `FL9: a look asks only the near-you hosts (${JSON.stringify(asked)})`);

    // FL4: off again, the selection stays, the map stays, a swipe steps.
    const keepSel = await selectedName();
    const keepC = await centre();
    await safe(() => toggle.click());
    await pg.waitForTimeout(500);
    const kc = await centre();
    check.todo(Math.hypot(kc[0] - keepC[0], kc[1] - keepC[1]) < 1e-6 && (await selectedName()) === keepSel && !(await present(showHere)),
      'FL4: off again, the selection stays, the map stays, and the pill goes');

    // FL8: Locate ends the look: the page is around you again and says so.
    await safe(() => pg.locator('[data-testid=locate]').click());
    await pg.waitForTimeout(3500);
    check.todo(/near you/i.test(await safe(() => pg.locator('[data-testid=explore-area]').innerText(), '')),
      'FL8: Locate ends the look and the page is near you again');

    // FL12: a far Walk here asks; FL14: leaving Explore turns Move map off, the look stands; FL16, FL17, FL18, FL20, FL21:
    // filled in with their code, when the controls and the page's states exist to probe.
    check.todo(false, 'FL12: a far Walk here asks "Walk now" or "When I get there" first');
    check.todo(false, 'FL14: leaving Explore turns Move map off and the look stands');
    check.todo(false, 'FL16: the walker\'s dot and the card\'s you stay on your fix while looking');
    check.todo(false, 'FL17: a late launch fix never moves the map or the look');
    check.todo(false, 'FL18: after a look the Busy and Walkability layers and the borders are around the looked point');
    check.todo(false, 'FL20: open water says so and keeps Locate and Move map');
    check.todo(false, 'FL21: the overlays never overlap at 390 and 320 px');
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
