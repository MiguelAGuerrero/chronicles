// Discrete navigation (DN1, DN10, DN12, DN13; amended by the Explore carousel, decision 0124): one finger never pans
// Explore's map, a swipe steps the row of cards, and the other gestures work as before. The row itself is the `carousel`
// journey. E2E_ONLY=snap runs it alone.

async function run(h) {
  const { url, exploreUrl, distanceM, check, tabTo, freshPage, snapWorld } = h;
  snapWorld.serve = true;
  const { c, pg } = await freshPage('snap');
  await c.addInitScript(() => { window.__perf = {}; });
  try {
    // Near you the row is the towns; the gestures step Providence's neighborhoods, on its page (fix explore-town-scope).
    const intoTown = async () => {
      await pg.goto(exploreUrl);
      await h.areaTile(pg, 'Wickenden');
      await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 4, null, { timeout: 60000 }).catch(() => {});
      await pg.waitForFunction(() => document.querySelectorAll('[data-testid=area-point]').length >= 4, null, { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(2500);
      // The town's own card leads; step onto its first neighborhood.
      await pg.locator('.maplibregl-canvas').first().focus().catch(() => {});
      if (process.env.E2E_DEBUG) console.log('DBG before', JSON.stringify(await pg.evaluate(() => ({ tiles: [...document.querySelectorAll('[data-testid=atlas-tile],[data-testid=atlas-town-head]')].map((e) => `${e.dataset.name}:${e.dataset.selected}`), pill: !!document.querySelector('[data-testid=atlas-back-pill]'), pts: [...document.querySelectorAll('[data-testid=area-point]')].map((e) => `${e.dataset.name}:${e.dataset.selected}`), active: document.activeElement?.className }))));
      await pg.keyboard.press('ArrowRight');
      await pg.waitForTimeout(1200);
      if (process.env.E2E_DEBUG) console.log('DBG after', JSON.stringify(await pg.evaluate(() => ({ tiles: [...document.querySelectorAll('[data-testid=atlas-tile],[data-testid=atlas-town-head]')].map((e) => `${e.dataset.name}:${e.dataset.selected}`), pill: !!document.querySelector('[data-testid=atlas-back-pill]'), pts: [...document.querySelectorAll('[data-testid=area-point]')].map((e) => `${e.dataset.name}:${e.dataset.selected}`) }))));
    };
    await intoTown();
    const map = pg.locator('.maplibregl-map').first();
    const centre = async () => ((await map.getAttribute('data-center')) || '0,0').split(',').map(Number);
    const zoom = async () => Number(await map.getAttribute('data-zoom'));
    const selected = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=area-point][data-selected="1"]')].map((e) => e.dataset.name));
    const said = () => pg.locator('[data-testid=atlas-snap-said]').textContent().catch(() => '');
    const drag = async (dx, dy) => {
      const b = await map.boundingBox();
      const x = b.x + b.width / 2;
      const y = b.y + b.height * 0.5;
      await pg.mouse.move(x, y);
      await pg.mouse.down();
      await pg.mouse.move(x + dx, y + dy, { steps: 6 });
      // Rest before letting go: a slow swipe, no coast.
      await pg.waitForTimeout(150);
      await pg.mouse.up();
      await pg.waitForTimeout(1300);
    };

    // discrete-navigation audit 11: the map says the arrow keys step between areas (DN11 is findable).
    const mapLabel = (await pg.locator('.maplibregl-canvas').first().getAttribute('aria-label')) ?? '';
    check(/arrow keys/i.test(mapLabel), `discrete-navigation audit 11: the map's label says the arrow keys step between areas (${mapLabel})`);

    // DN1: a drag never pans the map, whichever way it points; a swipe more vertical than horizontal changes nothing.
    const first = await selected();
    const c0 = await centre();
    await drag(0, 60);
    check(JSON.stringify(await selected()) === JSON.stringify(first) && distanceM(await centre(), c0) < 5, `DN1: a vertical drag leaves the map and the selection where they were (${JSON.stringify(first)}, ${distanceM(await centre(), c0).toFixed(0)} m)`);
    await drag(12, 6);
    check(JSON.stringify(await selected()) === JSON.stringify(first) && distanceM(await centre(), c0) < 5, 'DN1: a drag under 24 px is not a swipe');

    // DN12: a swipe announces the area's name, and the map keeps its zoom (EC5).
    const z0 = await zoom();
    await drag(-60, 0);
    const next = await selected();
    check(next.length === 1 && next[0] !== first[0] && ((await said()) || '').includes(next[0]) && Math.abs((await zoom()) - z0) < 0.05,
      `DN12: a swipe announces the area's name and keeps the zoom (${JSON.stringify(next)}, "${await said()}")`);

    // DN10: the wheel still zooms; the long press still offers its choices, and closing them keeps the selection.
    const zw = await zoom();
    const b = await map.boundingBox();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height * 0.5);
    await pg.mouse.wheel(0, 500);
    await pg.waitForTimeout(1200);
    check((await zoom()) < zw - 0.3, `DN10: the mouse wheel still zooms (z${zw.toFixed(2)} → z${(await zoom()).toFixed(2)})`);
    const beforePress = await selected();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height * 0.5);
    await pg.mouse.down();
    await pg.waitForTimeout(800);
    await pg.mouse.up();
    await pg.waitForTimeout(600);
    check((await pg.locator('[data-testid=atlas-spot]').count()) === 1, 'DN10: the long press still offers What\'s good here');
    await pg.locator('[data-testid=atlas-spot] [aria-label=Close]').click().catch(() => {});
    await pg.waitForTimeout(500);
    check(beforePress.length === 1 && JSON.stringify(await selected()) === JSON.stringify(beforePress), `DN10: closing the long press's choices keeps the selection (${JSON.stringify(await selected())})`);

    // discrete-navigation audit 10: a drag cut off by the window losing focus (its mouseup lost) is never a swipe.
    const before10 = await selected();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height * 0.5);
    await pg.mouse.down();
    await pg.mouse.move(b.x + 20, b.y + b.height * 0.5, { steps: 6 });
    await pg.evaluate(() => window.dispatchEvent(new Event('blur')));
    await pg.mouse.up();
    await pg.waitForTimeout(1500);
    check(JSON.stringify(await selected()) === JSON.stringify(before10), `discrete-navigation audit 10: a drag cut off by the window losing focus is never a swipe (${JSON.stringify(before10)} → ${JSON.stringify(await selected())})`);

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
    // open never leaves it showing another area.
    await pg.setViewportSize({ width: 1200, height: 800 });
    await intoTown();
    // A neighborhood is selected; a tap on it opens its card.
    const firstName = (await selected())[0];
    await pg.locator(`[data-testid=atlas-tile][data-name="${firstName}"]`).click().catch(() => {});
    await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 5000 }).catch(() => {});
    const cardOpen = await pg.locator('[data-testid=atlas-card]').count();
    await drag(-60, 0);
    const cardText = await pg.locator('[data-testid=atlas-card]').innerText().catch(() => '');
    const now = await selected();
    check(cardOpen === 1 && now.length === 1 && now[0] !== firstName && !cardText.includes(firstName),
      `discrete-navigation audit 1: on a wide screen a swipe never leaves the card on the area it left (${JSON.stringify(now)}, card ${JSON.stringify(cardText.slice(0, 40))})`);
  } finally {
    snapWorld.serve = false;
    await c.close();
  }
}

module.exports = {
  name: 'snap',
  // Discrete navigation (DN1, DN10, DN12, DN13): one finger never pans Explore's map; a swipe steps the row.
  covers: [
    'src/app/(tabs)/explore.tsx',
    'src/lib/atlas/snap.ts',
    'src/components/map/WalkMap.web.tsx',
    'src/components/map/types.ts',
    'src/components/AreaPoint.tsx',
  ],
  run,
};
