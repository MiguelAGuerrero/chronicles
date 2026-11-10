// Drive there, walk back (specs/drive-then-walk, DW1-DW14): on Explore's area card a far place asks "Walk now" or
// "When I get there", and too far to walk offers When I get there alone; the walk starts only on Start, never on
// arriving; Walk me back leads to where the last ride ended, or to a spot chosen with "Walk back here".
// Rides are driven with mocked GPS: 15 m/s for 30 s is a ride (RIDE_RULES), 5 m/s is walking. E2E_ONLY=drive runs it.

/** The ids of the area card's footer, as shown. */
const footerIds = (pg) => pg.evaluate(() => ['atlas-walk', 'atlas-walk-now', 'atlas-walk-later', 'atlas-walk-cancel']
  .filter((id) => document.querySelector(`[data-testid=${id}]`)));

async function run(h) {
  const { url, navUrl, at, distanceM, dLat, dLon, check, shot, freshPage, snapWorld, openWalk, routed, hosts, OVERTURE_HOST, metaOf } = h;
  /** Moves the mocked GPS from a to b at v m/s, one fix a second. */
  const go = async (c, pg, a, b, v) => {
    const n = Math.max(1, Math.round(distanceM(a, b) / v));
    for (let k = 1; k <= n; k++) {
      await c.setGeolocation({ longitude: a[0] + ((b[0] - a[0]) * k) / n, latitude: a[1] + ((b[1] - a[1]) * k) / n, accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    return b;
  };
  const tileOf = (pg, name) => pg.locator(`[data-testid=atlas-tile][data-name="${name}"]`);
  const openCard = async (pg, name) => {
    await pg.waitForSelector(`[data-testid=atlas-tile][data-name="${name}"]`, { timeout: 60000 });
    await tileOf(pg, name).click();
    await pg.waitForSelector('[data-testid=atlas-card]');
    await pg.waitForTimeout(700);
  };
  const PROVIDENCE = at(29, 0);

  snapWorld.serve = true;
  try {
    // ---- Getting there first: a far place asks, and When I get there starts nothing (DW2, DW3, DW14, DW4). ----
    {
      const { c, pg } = await freshPage('drive');
      await pg.goto(url);
      await openCard(pg, 'Providence');
      await pg.click('[data-testid=atlas-walk]').catch(() => {});
      await pg.waitForTimeout(800);
      const asked = await footerIds(pg);
      check.todo(asked.includes('atlas-walk-now') && asked.includes('atlas-walk-later') && !(await openWalk(pg)),
        `DW2: Walk to a place 2.9 km away asks Walk now or When I get there, and starts nothing (${asked.join(', ')})`);
      await shot(pg, 'drive-1-asks');
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(600);
      const after = await footerIds(pg);
      check.todo(after.includes('atlas-walk') && !after.includes('atlas-walk-now') && (await pg.locator('[data-testid=atlas-card]').count()) === 1
        && !(await openWalk(pg)) && !(await metaOf(pg, 'nav')),
        `DW2: Escape closes the question, not the card; nothing saved, no walk (${after.join(', ')})`);

      await pg.click('[data-testid=atlas-walk]').catch(() => {});
      await pg.click('[data-testid=atlas-walk-later]').catch(() => {});
      await pg.waitForSelector('[data-testid=ready-dest]', { timeout: 15000 }).catch(() => {});
      const dest = await pg.locator('[data-testid=ready-dest]').innerText().catch(() => '');
      check.todo(/To Providence · .*away/.test(dest) && (await pg.locator('[data-testid=start]').count()) === 1 && !(await openWalk(pg)),
        `DW3: When I get there opens Navigate, ready, "To Providence", and no walk starts (${dest})`);
      await shot(pg, 'drive-2-later');

      // Too far to walk (DW14): from 10.4 km west, Providence's card offers When I get there alone.
      await pg.click('[data-testid=ready-close]').catch(() => {});
      const west = at(-75, 0);
      await c.setGeolocation({ longitude: west[0], latitude: west[1], accuracy: 6 });
      await pg.goto(url);
      await openCard(pg, 'Providence');
      const far = await footerIds(pg);
      const card = await pg.locator('[data-testid=atlas-card]').innerText().catch(() => '');
      check.todo(far.length === 1 && far[0] === 'atlas-walk-later' && !/Too far to walk/.test(card),
        `DW14: past 10 km the card offers When I get there alone (${far.join(', ')})`);
      await pg.keyboard.press('Escape');

      // Drive to Providence with the destination saved, and park there a minute: nothing starts (DW4).
      await c.setGeolocation({ longitude: PROVIDENCE[0] - 2 * dLon, latitude: PROVIDENCE[1], accuracy: 6 });
      await pg.goto(navUrl);
      await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
      let here = [PROVIDENCE[0] - 2 * dLon, PROVIDENCE[1]];
      here = await go(c, pg, here, [PROVIDENCE[0] + 0.1 * dLon, PROVIDENCE[1] + 0.1 * dLat], 3);
      for (let k = 0; k < 60; k++) {
        await c.setGeolocation({ longitude: here[0], latitude: here[1] + (k % 2) * 1e-6, accuracy: 6 });
        await pg.waitForTimeout(1000);
      }
      const banners = await pg.locator('[data-testid=banner-dismiss]').count();
      const still = await pg.locator('[data-testid=ready-dest]').innerText().catch(() => '');
      check.todo(!(await openWalk(pg)) && banners === 0 && /To Providence/.test(still) && (await pg.locator('[data-testid=start]').count()) === 1,
        `DW4: at the place for a minute, nothing starts, nothing is said, Navigate waits (${banners} banners, "${still}")`);
      await pg.click('[data-testid=start]');
      await pg.waitForSelector('[data-testid=cap-photo]', { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(2000);
      const walk = await openWalk(pg);
      check.todo(!!walk, 'DW4: only Start starts the walk, where you are');
      await c.close();
    }

    // ---- The way back: a walk, a drive, a walk; then Walk back here (DW6-DW9, DW11, DW13). ----
    {
      const { c, pg } = await freshPage('drive-back');
      const s0 = at(-1.5, -0.5);
      await c.setGeolocation({ longitude: s0[0], latitude: s0[1], accuracy: 6 });
      await pg.goto(navUrl);
      await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
      await pg.click('[data-testid=start]');
      await pg.waitForSelector('[data-testid=cap-photo]', { timeout: 30000 });
      await pg.waitForTimeout(1500);
      let here = await go(c, pg, s0, at(-0.5, -0.5), 5);
      here = await go(c, pg, here, at(4, -0.5), 15);
      const parked = here;
      here = await go(c, pg, here, at(4, 1.5), 5);
      await pg.waitForTimeout(3000);
      const label = await pg.locator('[data-testid=walk-back]').getAttribute('aria-label').catch(() => null);
      check.todo(label === 'Walk me back to where the ride ended', `DW6, DW8: after a drive, Walk me back names where the ride ended (${label})`);
      const marksBefore = await pg.locator('.maplibregl-map').last().getAttribute('data-marks').catch(() => null);
      check.todo(marksBefore === '0', `DW11: nothing marks the way-back point while not led back (${marksBefore})`);
      await pg.click('[data-testid=walk-back]').catch(() => {});
      await routed(pg, 30000).catch(() => {});
      const bar = await pg.locator('[data-testid=nav-bar]').innerText().catch(() => '');
      const m = /([\d.]+)\s*(m|km)/.exec(await pg.locator('[data-testid=nav-left]').innerText().catch(() => ''));
      const left = m ? parseFloat(m[1]) * (m[2] === 'km' ? 1000 : 1) : NaN;
      check.todo(/Where the ride ended/.test(bar) && left > 120 && left < 320,
        `DW6, DW9: the way back leads to where the ride ended, along the walk, never the drive (${left} m, "${bar.replace(/\s+/g, ' ')}")`);
      check.todo(!/\d+\s*min.*(faster|shorter)|fastest/i.test(bar), 'DW8: no minutes compared');
      const marksLed = await pg.locator('.maplibregl-map').last().getAttribute('data-marks').catch(() => null);
      check.todo(marksLed === '1', `DW11: led back, the point is the route's end, one mark (${marksLed})`);
      await pg.click('[data-testid=nav-end]').catch(() => {});
      await pg.waitForTimeout(800);

      // Walk back here, at a phone's 320 px: the capture stack stays put (DW13), then the spot chosen wins (DW7).
      await pg.setViewportSize({ width: 320, height: 700 });
      await pg.waitForTimeout(600);
      const ids = ['cap-photo', 'cap-voice', 'cap-note'];
      const boxes = async () => Promise.all(ids.map((id) => pg.locator(`[data-testid=${id}]`).boundingBox()));
      const before = await boxes();
      const box = await pg.locator('canvas.maplibregl-canvas').last().boundingBox();
      const spot = { x: box.x + box.width / 2 - 60, y: box.y + box.height / 2 - 100 };
      await pg.mouse.move(spot.x, spot.y);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.waitForSelector('[data-testid=spot-way-back]', { timeout: 5000 }).catch(() => {});
      const during = await boxes();
      const free = await pg.evaluate((list) => list.every((id) => {
        const r = document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect();
        if (!r) return false;
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-testid]')?.getAttribute('data-testid') === id;
      }), ids);
      const same = before.every((b, i) => b && during[i] && Math.abs(b.x - during[i].x) < 1 && Math.abs(b.y - during[i].y) < 1);
      check.todo((await pg.locator('[data-testid=spot-way-back]').count()) === 1 && free && same,
        `DW13: with Walk back here on the card at 320 px, the camera, mic and note stay put and in reach (free ${free}, same ${same})`);
      await pg.click('[data-testid=spot-way-back]').catch(() => {});
      await pg.waitForTimeout(800);
      const said = await pg.locator('body').innerText();
      const label2 = await pg.locator('[data-testid=walk-back]').getAttribute('aria-label').catch(() => null);
      check.todo(/Walk me back now leads here\./.test(said) && label2 === 'Walk me back to the spot you chose',
        `DW7, DW8: Walk back here says so once and Walk me back now names the spot you chose (${label2})`);
      const marksChosen = await pg.locator('.maplibregl-map').last().getAttribute('data-marks').catch(() => null);
      check.todo(marksChosen === '0', `DW11: the spot chosen is not marked on the map (${marksChosen})`);
      await pg.setViewportSize({ width: 390, height: 844 });
      await pg.reload();
      await pg.waitForSelector('[data-testid=cap-photo]', { timeout: 30000 });
      await pg.waitForTimeout(3000);
      const label3 = await pg.locator('[data-testid=walk-back]').getAttribute('aria-label').catch(() => null);
      check.todo(label3 === 'Walk me back to the spot you chose', `DW7: a reload keeps the spot chosen (${label3})`);
      void parked;
      await c.close();
    }

    // ---- Near starts at once (DW1). ----
    {
      const { c, pg } = await freshPage('drive-near');
      await pg.goto(url);
      await openCard(pg, 'Wickenden');
      await pg.click('[data-testid=atlas-walk]').catch(() => {});
      await pg.waitForSelector('[data-testid=cap-photo]', { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      check.todo(!!(await openWalk(pg)) && (await pg.locator('[data-testid=atlas-walk-now]').count()) === 0,
        'DW1: Walk to a neighborhood 1 km away starts the walk in one tap, with no question');
      await c.close();
    }

    // Nothing left the device (DW12): the journey asked only this server, the tile host and Overture.
    const away = [...hosts].filter((x) => !x.startsWith('localhost') && x !== 'tiles.openfreemap.org' && x !== OVERTURE_HOST);
    check.todo(away.length === 0, `DW12: nothing is sent anywhere (${away.join(', ')})`);
  } finally {
    snapWorld.serve = false;
  }
}

module.exports = {
  name: 'drive',
  covers: [
    'src/lib/nav/wayBack.ts',
    'src/lib/nav/store/**',
    'src/lib/startPlan.ts',
    'src/lib/useStartWalk.ts',
    'src/components/atlas/AtlasCard.tsx',
    'src/app/(tabs)/index.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
