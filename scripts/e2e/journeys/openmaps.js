// Open in Maps beside Walk (specs/open-in-maps-here, OM1-OM14) on Explore: every tile's two buttons, the card's footer, a complex
// row and the long-press card. E2E_ONLY=openmaps runs it.

async function tiles(h) {
  const { exploreUrl, navUrl, at, check, shot, freshPage, snapWorld, openWalk, metaOf, areaTile } = h;
  snapWorld.serve = true;
  try {
    const { c, pg } = await freshPage('openmaps');
    await c.addInitScript(() => {
      window.__opened = [];
      window.open = (u) => { window.__opened.push(String(u)); if (window.__openFail) throw new Error('no app'); return null; };
    });
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.goto(exploreUrl);
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const tileEls = pg.locator('[data-testid=atlas-tile]');
    const n = await tileEls.count();
    const walks = pg.locator('[data-testid=tile-walk]');
    const maps = pg.locator('[data-testid=tile-maps]');
    const box = (loc) => loc.boundingBox().catch(() => null);
    // A finger taps where it is; a locator's click scrolls the button into view first, and the row then selects that tile.
    const tap = async (loc) => {
      const b = await box(loc);
      if (!b) return;
      await pg.mouse.click(Math.min(b.x + b.width / 2, pg.viewportSize().width - 12), b.y + b.height / 2);
    };

    // OM6, OM4: every tile but the one you are in has two half-width 44 px buttons, walk on the left, Open in Maps on the right.
    const w0 = await box(walks.first());
    const m0 = await box(maps.first());
    check(n >= 2 && (await maps.count()) === n - 1 && (await walks.count()) === n - 1 && !!w0 && !!m0 && w0.height >= 44 && m0.height >= 44 && m0.x > w0.x && Math.abs(w0.y - m0.y) < 2 && w0.width > 60 && m0.width > 60,
      `OM6, OM4: every tile but the one you are in has a 44 px walk button and Open in Maps beside it (${n} tiles, ${await maps.count()} buttons)`);
    const hs = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => Math.round(e.getBoundingClientRect().height)));
    check(new Set(hs).size === 1, `OM6: every tile is one height, buttons or not (${hs.join(', ')})`);
    // open-in-maps-here ui 3: a tile's button labels may wrap and are never truncated with an ellipsis (larger text sizes).
    const wrap = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=tile-walk] [dir], [data-testid=tile-walk] div, [data-testid=tile-maps] [dir], [data-testid=tile-maps] div')].filter((e) => e.children.length === 0 && (e.textContent ?? '').trim()).map((e) => getComputedStyle(e).whiteSpace + '/' + getComputedStyle(e).textOverflow));
    check(wrap.length > 0 && wrap.every((v) => !/nowrap/.test(v) && !/ellipsis/.test(v)), `open-in-maps-here ui 3: the tile's button labels may wrap and are never cut off with an ellipsis (${wrap.join(', ')})`);
    await shot(pg, 'openmaps-1-row');

    // OM1, OM3: the words, the glyph and the spoken names.
    const mapsLabel = await maps.first().getAttribute('aria-label').catch(() => '');
    const walkLabel = await walks.first().getAttribute('aria-label').catch(() => '');
    const mapsText = await maps.first().innerText().catch(() => '');
    check(/^Open in Maps, /.test(mapsLabel ?? '') && /Open in Maps/.test(mapsText) && /^Walk there, /.test(walkLabel ?? '') && (await maps.first().locator('svg, [data-testid=maps-glyph]').count()) >= 1,
      `OM1, OM3: "Open in Maps ↗" and "Walk there" are named for the place (${mapsLabel} | ${walkLabel})`);
    check(!(await pg.locator('text=/^Go here$/').count()), 'OM1: no "Go here" on Explore');

    // OM8: Open in Maps is never the accent; at most one control across the row is accent-filled.
    const fills = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=tile-walk], [data-testid=tile-maps]')].map((e) => ({ id: e.dataset.testid, bg: getComputedStyle(e).backgroundColor, sel: e.closest('[data-testid=atlas-tile]')?.dataset.selected ?? e.parentElement?.querySelector('[data-testid=atlas-tile]')?.dataset.selected })));
    const solid = fills.filter((f) => !/rgba\(0, 0, 0, 0\)|transparent|rgb\(255, 255, 255\)|rgb\(2[34]\d, /.test(f.bg));
    check(solid.length <= 1 && solid.every((f) => f.id === 'tile-walk') && !fills.some((f) => f.id === 'tile-maps' && solid.includes(f)),
      `OM8: Open in Maps is never the accent, and at most one tile button is filled across the row (${JSON.stringify(solid)})`);

    // The Cranston tile peeks at the row's edge: select it (it centres), then use its buttons as a finger would.
    const cranston = pg.locator('[data-testid=atlas-tile][data-name="Cranston"]').first();
    await cranston.click().catch(() => {});
    await pg.waitForTimeout(1200);
    // OM8 (selected): the selected tile's Walk there is the one accent-filled control across the row, and Open in Maps is not.
    const accent = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=tile-walk], [data-testid=tile-maps]')].map((e) => ({ id: e.dataset.testid, bg: getComputedStyle(e).backgroundColor })).filter((f) => /rgb\(194, 65, 12\)/.test(f.bg)));
    check(accent.length === 1 && accent[0].id === 'tile-walk', `OM8: with a tile selected, exactly one control across the row is the accent, its Walk there (${JSON.stringify(accent)})`);
    await shot(pg, 'openmaps-1b-selected');
    const selBefore = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.selected).join(''));
    // OM2: Open in Maps opens the maps app straight from the tap: the destination alone, no sheet, nothing saved, no walk.
    await tap(maps.last());
    await pg.waitForTimeout(600);
    const opened = await pg.evaluate(() => window.__opened);
    check(opened.length === 1 && /(daddr|destination)=-?[\d.]+,-?[\d.]+/.test(opened[0]) && !/Cranston|Your spot/i.test(decodeURIComponent(opened[0]))
      && (await pg.locator('[role=dialog], [data-testid*=sheet]').count()) === 0 && !(await metaOf(pg, 'nav')) && !(await openWalk(pg)),
      `OM2, OM10: Open in Maps hands the destination alone to the maps app, with no sheet, nothing saved and no walk (${opened[0]})`);
    // OM2: a maps app that won't open says so once.
    await pg.evaluate(() => { window.__openFail = true; });
    await tap(maps.last());
    await pg.waitForTimeout(700);
    check((await pg.locator('text=Couldn’t open a maps app.').count()) === 1, 'OM2, OM14: a maps app that won\'t open says so once');
    await pg.evaluate(() => { window.__openFail = false; });

    // OM6: a tap on the tile's body still selects it; the buttons did not.
    const sel0 = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.selected).join(''));
    check(/1/.test(sel0) && sel0 === selBefore && (await pg.locator('[data-testid=atlas-card]').count()) === 0, `OM6: the buttons neither moved the selection nor opened a card (${selBefore} -> ${sel0})`);

    // OM7: Cranston is 4 km away: Walk there opens its card with the question, and starts nothing.
    await tap(walks.last());
    await pg.waitForSelector('[data-testid=atlas-walk-now]', { timeout: 8000 }).catch(() => {});
    check((await pg.locator('[data-testid=atlas-walk-now]').count()) === 1 && (await pg.locator('[data-testid=atlas-walk-later]').count()) === 1 && !(await openWalk(pg)),
      'OM7: past 2 km a tile\'s Walk there opens the card with Walk now / When I get there showing, and starts nothing');
    await shot(pg, 'openmaps-2-asks');

    // OM4, OM5, OM8: the open card's footer: the walk primary, then Open in Maps outlined; none while the question is open.
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(600);
    const foot = await pg.evaluate(() => { const g = document.querySelector('[data-testid=atlas-card-maps]'); const w = document.querySelector('[data-testid=atlas-walk]'); if (!g || !w) return null; const a = g.getBoundingClientRect(), b = w.getBoundingClientRect(); return { below: a.top >= b.bottom - 1, h: a.height, bg: getComputedStyle(g).backgroundColor, label: g.getAttribute('aria-label') }; });
    check(!!foot && foot.below && foot.h >= 44 && !/rgb\(194, 65, 12\)/.test(foot.bg) && /^Open in Maps, /.test(foot.label ?? ''), `OM4, OM8: the card's Open in Maps sits under Walk to, 44 px, outlined (${JSON.stringify(foot)})`);
    await shot(pg, 'openmaps-3-card');
    await pg.click('[data-testid=atlas-walk]').catch(() => {});
    await pg.waitForSelector('[data-testid=atlas-walk-now]', { timeout: 5000 }).catch(() => {});
    check((await pg.locator('[data-testid=atlas-card-maps]').count()) === 0, 'OM5: no Open in Maps while the card\'s far question is open');
    await c.close();
  } finally {
    snapWorld.serve = false;
  }
}

/** OM7: a tile in reach starts the walk in one tap; one past 10 km saves it as the destination; the town's heading card has the buttons too (OM14). */
async function reach(h) {
  const { exploreUrl, at, check, freshPage, snapWorld, openWalk, metaOf, areaTile } = h;
  snapWorld.serve = true;
  try {
    {
      const { c, pg } = await freshPage('openmaps-near');
      await pg.goto(exploreUrl);
      const wick = await areaTile(pg, 'Wickenden');
      await wick.scrollIntoViewIfNeeded().catch(() => {});
      // areaTile may have selected it already; a second tap on a selected tile opens its card.
      if ((await wick.getAttribute('data-selected').catch(() => '0')) !== '1') await wick.click().catch(() => {});
      await pg.waitForTimeout(1500);
      // On a town's page a tap on a neighborhood tile selects it and opens its card; close the card, so the tile's own buttons are what is tapped.
      if (await pg.locator('[data-testid=atlas-card]').count()) { await pg.keyboard.press('Escape'); await pg.waitForTimeout(900); }
      // The row has settled on that tile: measure its button now and tap it, as a finger would.
      const wb = pg.locator('[data-testid=tile-walk][aria-label^="Walk there, Wickenden"]').first();
      const r = await wb.boundingBox().catch(() => null);
      const b = [{ n: await wb.getAttribute('aria-label').catch(() => null) }];
      if (r) await pg.mouse.click(Math.min(r.x + r.width / 2, 380), r.y + r.height / 2);
      await pg.waitForSelector('[data-testid=cap-photo]', { timeout: 30000 }).catch(() => {});
      check(!!(await openWalk(pg)) && (await pg.locator('[data-testid=atlas-walk-now]').count()) === 0,
        `OM7: a tile 1 km away starts the walk in one tap, with no question (button ${JSON.stringify(b[0]?.n)}, asks ${await pg.locator('[data-testid=atlas-walk-now]').count()}, card ${await pg.locator('[data-testid=atlas-card]').count()}, url ${pg.url().replace(/^.*\//, '/')})`);
      await c.close();
    }
    {
      const { c, pg } = await freshPage('openmaps-far');
      const east = at(75, 0);
      await c.setGeolocation({ longitude: east[0], latitude: east[1], accuracy: 6 });
      await pg.goto(exploreUrl);
      await pg.waitForSelector('[data-testid=atlas-tile][data-name="Cranston"]', { timeout: 60000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const far = pg.locator('[data-testid=tile-walk]').filter({ hasText: 'Set as destination' }).first();
      // The hint ("Saves it in Navigate; starts nothing") is spoken on a phone; the web draws no hint, so the unit test holds it (OM7).
      check((await far.count()) === 1 && /^Set as destination, /.test((await far.getAttribute('aria-label').catch(() => '')) ?? ''),
        'OM7, OM14: a tile past 10 km says "Set as destination", named for the place');
      const fb = await far.boundingBox().catch(() => null);
      if (fb) await pg.mouse.click(Math.min(fb.x + fb.width / 2, 380), fb.y + fb.height / 2);
      await pg.waitForSelector('[data-testid=ready-dest]', { timeout: 15000 }).catch(() => {});
      check(/^To /.test(await pg.locator('[data-testid=ready-dest]').innerText().catch(() => '')) && !(await openWalk(pg)) && !!(await metaOf(pg, 'nav')),
        'OM7: Set as destination saves the place and opens Navigate, ready; no walk starts');
      await c.close();
    }
    {
      const { c, pg } = await freshPage('openmaps-town');
      await pg.goto(exploreUrl);
      await pg.waitForSelector('[data-testid=atlas-tile][data-name="Cranston"]', { timeout: 60000 }).catch(() => {});
      const t = pg.locator('[data-testid=atlas-tile][data-name="Cranston"]').first();
      await t.click().catch(() => {});
      await pg.waitForTimeout(700);
      await t.click().catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-town-head]', { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(800);
      check((await pg.locator('[data-testid=atlas-town-head] ~ * [data-testid=tile-maps], [data-testid=tile-maps]').count()) >= 1, 'OM14: a town\'s heading card has the two buttons like any tile');
      await c.close();
    }
  } finally {
    snapWorld.serve = false;
  }
}

/** OM4, OM9: a complex row with the longest name has Open in Maps under its name, whole at 320 px; OM4, OM5: the long-press card. */
async function rows(h) {
  const { exploreUrl, at, check, shot, freshPage, areaTile, complexWorld } = h;
  complexWorld.serve = true;
  try {
    const { c, pg } = await freshPage('openmaps-complex');
    await c.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
    const here = at(0, 0);
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    await pg.goto(exploreUrl);
    const tile = await areaTile(pg, 'Fox Point');
    await pg.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"][data-read="1"]', { timeout: 60000 }).catch(() => {});
    await tile.click().catch(() => {});
    if (!(await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 3000 }).then(() => true, () => false))) await tile.click().catch(() => {});
    await pg.waitForSelector('[data-testid=atlas-complexes]', { timeout: 60000 }).catch(() => {});
    await pg.setViewportSize({ width: 320, height: 640 });
    await pg.waitForTimeout(800);
    await pg.locator('[data-testid=atlas-complexes]').scrollIntoViewIfNeeded().catch(() => {});
    const m = pg.locator('[data-testid=atlas-complex-maps]');
    const mb = await m.first().boundingBox().catch(() => null);
    const stack = await pg.evaluate(() => {
      const go = document.querySelector('[data-testid=atlas-complex-maps]')?.getBoundingClientRect();
      const walk = document.querySelector('[data-testid=atlas-complex-walk]')?.getBoundingClientRect();
      return { right: go?.right, w: window.innerWidth, goLeft: go?.left, walkLeft: walk?.left };
    });
    check((await m.count()) === 1 && /^Open in Maps, The Wickenden Street Arcade/.test((await m.first().getAttribute('aria-label')) ?? '') && !!mb && mb.height >= 44 && stack.right <= stack.w,
      `OM4, OM9: the complex row with the longest name has Open in Maps under its name, whole at 320 px (${JSON.stringify(stack)})`);
    // open-in-maps-here ui 2: on a row, Walk to and Open in Maps sit together under the name, Walk to first, on one line.
    const pairRow = await pg.evaluate(() => {
      const row = document.querySelector('[data-testid=atlas-complex]');
      const w = row?.querySelector('[data-testid=atlas-complex-walk]')?.getBoundingClientRect();
      const m = row?.querySelector('[data-testid=atlas-complex-maps]')?.getBoundingClientRect();
      const kind = [...(row?.querySelectorAll('div') ?? [])].find((d) => /^Shopping$/.test(d.textContent ?? ''))?.getBoundingClientRect();
      return w && m ? { walkFirst: w.left < m.left, sameLine: Math.abs(w.top - m.top) < 4, underName: !!kind && w.top >= kind.bottom - 2, right: m.right, w: window.innerWidth } : null;
    });
    check(!!pairRow && pairRow.walkFirst && pairRow.sameLine && pairRow.underName && pairRow.right <= pairRow.w, `open-in-maps-here ui 2: a row's Walk to and Open in Maps sit together under its name, Walk to first (${JSON.stringify(pairRow)})`);
    await shot(pg, 'openmaps-4-complex-320');
    await pg.click('[data-testid=atlas-complex-maps]').catch(() => {});
    await pg.waitForTimeout(500);
    const o = await pg.evaluate(() => window.__opened);
    check(o.length === 1 && /(daddr|destination)=-?[\d.]+,-?[\d.]+/.test(o[0]), `OM2, OM10: the complex's Open in Maps hands its own point over (${o[0]})`);
    await c.close();
  } finally {
    complexWorld.serve = false;
  }
  // The long-press card: Open in Maps exactly where Walk here is, an outlined button under its row.
  const { c, pg } = await freshPage('openmaps-spot');
  await c.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.goto(exploreUrl);
  await pg.waitForSelector('[data-testid=atlas-carousel]', { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(2000);
  const box = await pg.locator('canvas.maplibregl-canvas').first().boundingBox();
  await pg.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 - 40);
  await pg.mouse.down();
  await pg.waitForTimeout(700);
  await pg.mouse.up();
  await pg.waitForSelector('[data-testid=atlas-spot]', { timeout: 8000 }).catch(() => {});
  const wh = await pg.locator('[data-testid=walk-here]').count();
  const sm = await pg.locator('[data-testid=spot-maps]').count();
  check((await pg.locator('[data-testid=atlas-spot]').count()) === 1 && sm === wh, `OM4, OM5: the long-press card has Open in Maps exactly when it has Walk here (${sm} / ${wh})`);
  if (sm) {
    await pg.click('[data-testid=spot-maps]').catch(() => {});
    await pg.waitForTimeout(500);
    const o2 = await pg.evaluate(() => window.__opened);
    check(o2.length === 1 && !/Your|spot/i.test(decodeURIComponent(o2[0])), `OM10: a pressed spot goes as coordinates alone (${o2[0]})`);
  }
  await c.close();
}

module.exports = {
  name: 'openmaps',
  // Open in Maps beside Walk on Explore (OM1-OM14).
  covers: [
    'src/app/(tabs)/explore.tsx',
    'src/lib/atlas/mapsButton.ts',
    'src/lib/nav/handoff.ts',
    'src/lib/nav/openInMaps.ts',
    'src/components/OpenInMapsButton.tsx',
    'src/components/atlas/AtlasTile.tsx',
    'src/components/atlas/AtlasCard.tsx',
  ],
  run: async (h) => {
    await tiles(h);
    await reach(h);
    await rows(h);
  },
};
