// Discrete navigation (DN1-DN13): Explore's map steps from area to area instead of panning.
// E2E_ONLY=snap runs it alone.

async function run(h) {
  const { url, at, distanceM, dLat, dLon, check, shot, tabTo, freshPage, snapWorld } = h;
    snapWorld.serve = true;
    const { c, pg } = await freshPage('snap');
    // window.__project, to find where an area sits on the map's screen.
    await c.addInitScript(() => { window.__perf = {}; });
    try {
      const hoods = { 'Fox Point': at(1, 0), Wickenden: at(10, 0), 'Point Street': at(-9, 0), 'Hope Village': at(1, 12), 'Ship Street': at(1, -11) };
      const headingOf = (a, b) => ((Math.atan2((b[0] - a[0]) / dLon, (b[1] - a[1]) / dLat) * 180) / Math.PI + 360) % 360;
      const apart = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
      // What the spec says a swipe from here that way lands on (DN2, DN3): the nearest within 45°,
      // past 100 m of the map's middle when nothing is selected.
      const expectFrom = (from, heading, skip = null) => {
        let best = null;
        let bestM = Infinity;
        for (const [name, p] of Object.entries(hoods)) {
          const m = distanceM(from, p);
          if (name === skip || m < (skip ? 1 : 100) || apart(headingOf(from, p), heading) > 45) continue;
          if (m < bestM) [best, bestM] = [name, m];
        }
        return best;
      };
      await pg.goto(url);
      await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 5, null, { timeout: 60000 }).catch(() => {});
      await pg.waitForFunction(() => document.querySelectorAll('[data-testid=area-point]').length >= 5, null, { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(2500);
      const map = pg.locator('.maplibregl-map').first();
      const centre = async () => ((await map.getAttribute('data-center')) || '0,0').split(',').map(Number);
      const zoom = async () => Number(await map.getAttribute('data-zoom'));
      const selected = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=area-point][data-selected="1"]')].map((e) => e.dataset.name));
      const said = () => pg.locator('[data-testid=atlas-snap-said]').textContent().catch(() => '');
      const drag = async (dx, dy) => {
        const b = await map.boundingBox();
        const x = b.x + b.width / 2;
        const y = b.y + b.height * 0.6;
        await pg.mouse.move(x, y);
        await pg.mouse.down();
        await pg.mouse.move(x + dx, y + dy, { steps: 6 });
        await pg.mouse.up();
        await pg.waitForTimeout(1500);
      };
      const tilesShown = (await pg.locator('[data-testid=atlas-tile]').evaluateAll((els) => els.map((e) => e.dataset.name))).join(', ');
      check(Object.keys(hoods).every((n) => tilesShown.includes(n)), `snap: the page near you lists the five neighborhoods (${tilesShown})`);

      // discrete-navigation audit 11: the map says the arrow keys step between areas (DN11 is findable).
      const mapLabel = (await pg.locator('.maplibregl-canvas').first().getAttribute('aria-label')) ?? '';
      check(/arrow keys/i.test(mapLabel), `discrete-navigation audit 11: the map's label says the arrow keys step between areas (${mapLabel})`);
      // The centre areas are framed at: the middle of the map below the title card (padding 84 top, 24 bottom).
      const framed = () => pg.evaluate(() => {
        const r = document.querySelector('.maplibregl-map').getBoundingClientRect();
        return window.__unproject([r.width / 2, (84 + r.height - 24) / 2]);
      });
      // DN3, DN2: nothing selected, a drag down goes north from the map's middle.
      const c0 = await framed();
      const z0 = await zoom();
      const grid = await pg.locator('[data-testid=atlas-grid]').boundingBox();
      const inGrid = (r) => !!r && r.y >= grid.y - 1 && r.y + r.height <= grid.y + grid.height + 1;
      const hopeBefore = await pg.locator('[data-testid=atlas-tile][data-name="Hope Village"]').boundingBox().catch(() => null);
      await drag(0, 60);
      const first = expectFrom(c0, 0);
      const sel1 = await selected();
      check(first === 'Hope Village' && sel1.length === 1 && sel1[0] === first, `DN3: with nothing selected, a swipe starts from the map's middle (${JSON.stringify(sel1)}, expected ${first})`);
      const c1 = await centre();
      // Centred where a tap's frame puts an area: the middle of the map below the title card (padding 84 top, 24 elsewhere).
      const mb0 = await map.boundingBox();
      const [px, py] = first ? await pg.evaluate((p) => window.__project(p), hoods[first]) : [0, 0];
      const offX = px - (mb0.x + mb0.width / 2);
      const offY = py - (mb0.y + (84 + mb0.height - 24) / 2);
      check(Math.hypot(offX, offY) < 6 && Math.abs((await zoom()) - z0) < 0.05,
        `DN2: a swipe centres the area it selects and keeps the zoom (${offX.toFixed(0)}, ${offY.toFixed(0)} px off; z${z0.toFixed(2)} → z${(await zoom()).toFixed(2)})`);
      // DN6: it only selects. No card; the tile is marked (the accent border) and scrolled into the grid's view.
      const tile = pg.locator(`[data-testid=atlas-tile][data-name="${first}"]`);
      const tb = await tile.boundingBox().catch(() => null);
      const edge = await tile.evaluate((e) => getComputedStyle(e).borderTopColor).catch(() => '');
      check((await pg.locator('[data-testid=atlas-card]').count()) === 0 && edge === 'rgb(194, 65, 12)' && inGrid(tb),
        `DN6: a swipe selects, the card stays closed, the tile is marked and in view (${edge}, ${tb && Math.round(tb.y)}..${tb && Math.round(tb.y + tb.height)} in ${Math.round(grid.y)}..${Math.round(grid.y + grid.height)})`);
      check(!!hopeBefore && !inGrid(hopeBefore), `DN6: the tile was out of view before the swipe, so the grid scrolled to it (${hopeBefore && Math.round(hopeBefore.y)})`);
      check(((await said()) || '').includes(first), `DN12: a swipe announces the area's name (${await said()})`);
      // DN2: a drag under 24 px is not a swipe.
      await drag(12, 6);
      check(JSON.stringify(await selected()) === JSON.stringify(sel1) && distanceM(await centre(), c1) < 5, 'DN2: a drag under 24 px is not a swipe');
      await shot(pg, 'snap-north');

      // From there, south, then east: Fox Point, then Wickenden.
      await drag(0, -60);
      const second = expectFrom(hoods[first], 180, first);
      check(JSON.stringify(await selected()) === JSON.stringify([second]), `DN2: a drag up goes south (${JSON.stringify(await selected())}, expected ${second})`);
      await drag(-60, 0);
      const third = expectFrom(hoods[second], 90, second);
      check(third === 'Wickenden' && JSON.stringify(await selected()) === JSON.stringify([third]), `DN2: a drag left goes east (${JSON.stringify(await selected())}, expected ${third})`);
      // DN4, DN1: nothing further east. The drag pans nothing and changes nothing.
      const cE = await centre();
      await drag(-60, 0);
      check(JSON.stringify(await selected()) === JSON.stringify([third]), `DN4: with nothing that way, the selection stays (${JSON.stringify(await selected())})`);
      check(distanceM(await centre(), cE) < 5, `DN1: a drag that points at no area leaves the map's centre where it was (${distanceM(await centre(), cE).toFixed(0)} m)`);
      // DN5: the opposite swipe returns.
      await drag(60, 0);
      check(JSON.stringify(await selected()) === JSON.stringify([second]), `DN5: the opposite swipe returns where it came from (${JSON.stringify(await selected())})`);

      // DN11: the arrow keys on the focused map; + still zooms.
      await pg.locator('.maplibregl-canvas').first().focus();
      await pg.keyboard.press('ArrowRight');
      await pg.waitForTimeout(1500);
      check(JSON.stringify(await selected()) === JSON.stringify([third]), `DN11: ArrowRight on the focused map selects the area to the east (${JSON.stringify(await selected())})`);
      const zk = await zoom();
      await pg.keyboard.press('+');
      await pg.waitForTimeout(1200);
      check((await zoom()) > zk + 0.5, `DN11: + on the focused map still zooms in (z${zk.toFixed(2)} → z${(await zoom()).toFixed(2)})`);

      // discrete-navigation audit 5: cleared at Wickenden, a swipe north starts from where Wickenden is framed
      // (below the title card) and reaches Hope Village; from the canvas's middle, 400 m further north, it is
      // just outside the 45° and nothing would be selected.
      const bb = await map.boundingBox();
      await pg.mouse.click(bb.x + 30, bb.y + bb.height * 0.6);
      await pg.waitForTimeout(900);
      const cleared = await selected();
      await drag(0, 60);
      check(cleared.length === 0 && JSON.stringify(await selected()) === '["Hope Village"]',
        `discrete-navigation audit 5: after a tap clears a swiped-to area, a swipe starts from where it is framed (${JSON.stringify(cleared)} → ${JSON.stringify(await selected())})`);
      // discrete-navigation audit 6: a tap on the selected area's own point keeps it selected.
      const [fx, fy] = await pg.evaluate((p) => window.__project(p), hoods['Hope Village']);
      await pg.mouse.click(fx, fy);
      await pg.waitForTimeout(900);
      check(JSON.stringify(await selected()) === '["Hope Village"]', `discrete-navigation audit 6: a tap on the selected area's point keeps it selected (${JSON.stringify(await selected())})`);
      // discrete-navigation audit 7: Fox Point twice in a row (a tile tap between) is announced twice.
      const saidRaw = () => pg.locator('[data-testid=atlas-snap-said]').evaluate((e) => e.textContent).catch(() => '');
      await drag(0, -60);
      const said1 = await saidRaw();
      await pg.locator('[data-testid=atlas-tile][data-name="Hope Village"]').click().catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 5000 }).catch(() => {});
      await pg.keyboard.press('Escape');
      await pg.waitForFunction(() => !document.querySelector('[data-testid=atlas-card]'), null, { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(800);
      await drag(0, -60);
      const said2 = await saidRaw();
      check(JSON.stringify(await selected()) === JSON.stringify([second]) && said1.includes(second) && said2.includes(second) && said2 !== said1,
        `discrete-navigation audit 7: a second swipe to the same area is announced again (${JSON.stringify(said1)} → ${JSON.stringify(said2)})`);

      // DN10: the wheel still zooms; the long press still offers its choices.
      const zw = await zoom();
      const b = await map.boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6);
      await pg.mouse.wheel(0, 500);
      await pg.waitForTimeout(1200);
      check((await zoom()) < zw - 0.3, `DN10: the mouse wheel still zooms (z${zw.toFixed(2)} → z${(await zoom()).toFixed(2)})`);
      const beforePress = await selected();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6);
      await pg.mouse.down();
      await pg.waitForTimeout(800);
      await pg.mouse.up();
      await pg.waitForTimeout(600);
      check((await pg.locator('[data-testid=atlas-spot]').count()) === 1, 'DN10: the long press still offers What\'s good here');
      await pg.locator('[data-testid=atlas-spot] [aria-label=Close]').click().catch(() => {});
      await pg.waitForTimeout(500);
      check(beforePress.length === 1 && JSON.stringify(await selected()) === JSON.stringify(beforePress), `DN9: closing the long press's choices keeps the selection (${JSON.stringify(await selected())})`);

      // DN9: a tap on the map clears the selection.
      await pg.mouse.click(b.x + 40, b.y + b.height * 0.6);
      await pg.waitForTimeout(900);
      check((await selected()).length === 0, `DN9: a tap on the map clears the selection (${JSON.stringify(await selected())})`);

      // discrete-navigation audit 4: a banner opens above the grid (What's good here's answer), moving every row
      // down without resizing it; a swipe to Hope Village still brings its tile into the grid's view.
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6);
      await pg.mouse.down();
      await pg.waitForTimeout(800);
      await pg.mouse.up();
      await pg.waitForTimeout(600);
      await pg.click('[data-testid=look-here]').catch(() => {});
      await pg.waitForFunction(() => /best guess/i.test(document.body.innerText), null, { timeout: 45000 }).catch(() => {});
      await pg.locator('[data-testid=atlas-grid]').evaluate((e) => { e.scrollTop = 0; }).catch(() => {});
      await pg.waitForTimeout(600);
      for (let i = 0; i < 4 && JSON.stringify(await selected()) !== '["Hope Village"]'; i++) await drag(0, 60);
      const grid4 = await pg.locator('[data-testid=atlas-grid]').boundingBox();
      const hope4 = await pg.locator('[data-testid=atlas-tile][data-name="Hope Village"]').boundingBox().catch(() => null);
      check(/best guess/i.test(await pg.locator('body').innerText()) && JSON.stringify(await selected()) === '["Hope Village"]'
        && hope4 && hope4.y >= grid4.y - 1 && hope4.y + hope4.height <= grid4.y + grid4.height + 1,
        `discrete-navigation audit 4: after a banner opens above the grid, a swipe still brings the tile into view (${hope4 && Math.round(hope4.y)}..${hope4 && Math.round(hope4.y + hope4.height)} in ${Math.round(grid4.y)}..${Math.round(grid4.y + grid4.height)})`);
      // discrete-navigation audit 10: a drag cut off by the window losing focus (its mouseup lost) is never a swipe.
      const before10 = await selected();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6);
      await pg.mouse.down();
      await pg.mouse.move(b.x + b.width / 2, 4, { steps: 6 });
      await pg.evaluate(() => window.dispatchEvent(new Event('blur')));
      await pg.mouse.up();
      await pg.waitForTimeout(1500);
      check(JSON.stringify(await selected()) === JSON.stringify(before10), `discrete-navigation audit 10: a drag cut off by the window losing focus is never a swipe (${JSON.stringify(before10)} → ${JSON.stringify(await selected())})`);

      // DN8: a town's page with nothing selected steps between towns, and back.
      const title = () => pg.locator('[data-testid=explore-area]').innerText().catch(() => '');
      const home = await title();
      await pg.click('[data-testid=atlas-title]').catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-town-head]', { timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      await drag(60, 0);
      await pg.waitForFunction(() => document.querySelector('[data-testid=explore-area]')?.textContent === 'Cranston', null, { timeout: 5000 }).catch(() => {});
      const west = await title();
      check(home === 'Providence' && west === 'Cranston', `DN8: on a town's page a swipe west opens the next town's page (${home} → ${west})`);
      await shot(pg, 'snap-town');
      await drag(-60, 0);
      await pg.waitForFunction(() => document.querySelector('[data-testid=explore-area]')?.textContent === 'Providence', null, { timeout: 5000 }).catch(() => {});
      check((await title()) === 'Providence', `DN8: the opposite swipe brings the first town back (${await title()})`);

      // DN13: Navigate's map still pans by a drag.
      await tabTo(pg, 'navigate');
      await pg.waitForSelector('[data-testid=ready-bar]', { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(2000);
      const nav = pg.locator('.maplibregl-map').last();
      const nb = await nav.boundingBox();
      const before = ((await nav.getAttribute('data-center')) || '0,0').split(',').map(Number);
      await pg.mouse.move(nb.x + nb.width / 2, nb.y + nb.height * 0.4);
      await pg.mouse.down();
      await pg.mouse.move(nb.x + nb.width / 2 - 120, nb.y + nb.height * 0.4, { steps: 8 });
      await pg.mouse.up();
      await pg.waitForTimeout(1200);
      const after = ((await nav.getAttribute('data-center')) || '0,0').split(',').map(Number);
      check(distanceM(before, after) > 20, `DN13: Navigate's map still pans by a drag (${distanceM(before, after).toFixed(0)} m)`);

      // discrete-navigation audit 1: on a wide screen the card is a side panel beside the map. A swipe with a card
      // open never leaves it showing another area; on a town's page Escape still leaves after a swipe to the next town.
      await pg.setViewportSize({ width: 1200, height: 800 });
      await pg.goto(url);
      await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 5, null, { timeout: 60000 }).catch(() => {});
      await pg.waitForTimeout(2000);
      await pg.locator('[data-testid=atlas-tile][data-name="Fox Point"]').click().catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 5000 }).catch(() => {});
      const cardOpen = await pg.locator('[data-testid=atlas-card]').count();
      await drag(-60, 0);
      const cardText = await pg.locator('[data-testid=atlas-card]').innerText().catch(() => '');
      check(cardOpen === 1 && JSON.stringify(await selected()) === '["Wickenden"]' && !/Fox Point/.test(cardText),
        `discrete-navigation audit 1: on a wide screen a swipe never leaves the card on the area it left (${JSON.stringify(await selected())}, card ${JSON.stringify(cardText.slice(0, 40))})`);
      await pg.click('[data-testid=atlas-title]').catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-town-head]', { timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      await pg.click('[data-testid=atlas-town-head]').catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 5000 }).catch(() => {});
      await drag(60, 0);
      await pg.waitForFunction(() => document.querySelector('[data-testid=explore-area]')?.textContent === 'Cranston', null, { timeout: 5000 }).catch(() => {});
      const wideWest = await title();
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(1000);
      check(wideWest === 'Cranston' && (await pg.locator('[data-testid=atlas-back-pill]').count()) === 0 && (await pg.locator('[data-testid=atlas-card]').count()) === 0,
        `discrete-navigation audit 1: after a swipe to the next town, Escape still leaves its page (${wideWest}, back pill ${await pg.locator('[data-testid=atlas-back-pill]').count()})`);
    } finally {
      snapWorld.serve = false;
      await c.close();
    }
}

module.exports = {
  name: 'snap',
  // Discrete navigation (DN1-DN13): Explore's map steps from area to area.
  covers: [
    'src/app/(tabs)/index.tsx',
    'src/lib/atlas/snap.ts',
    'src/components/map/WalkMap.web.tsx',
    'src/components/map/types.ts',
    'src/components/AreaPoint.tsx',
  ],
  run,
};
