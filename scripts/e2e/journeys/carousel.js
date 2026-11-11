// Explore carousel (EC1-EC20): the map fills the screen, the areas are a row of cards under it, the selected area is the
// only one named, a swipe on the map steps the row. E2E_ONLY=carousel runs it alone.

async function run(h) {
  const { url, exploreUrl, check, freshPage, snapWorld } = h;
  snapWorld.serve = true;
  const { c, pg } = await freshPage('carousel');
  await c.addInitScript(() => { window.__perf = {}; });
  const safe = async (fn, fallback = null) => fn().catch(() => fallback);
  try {
    await pg.goto(exploreUrl);
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const map = pg.locator('.maplibregl-map').first();
    const names = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.name));
    const selected = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=area-point][data-selected="1"]')].map((e) => e.dataset.name));
    const said = () => safe(() => pg.locator('[data-testid=atlas-snap-said]').textContent(), '');
    const drag = async (dx, dy) => {
      // On bare map: a "?" or an area point under the finger takes the touch (fix explore-town-scope).
      const { x, y } = await h.bareMapPoint(pg);
      await pg.mouse.move(x, y);
      await pg.mouse.down();
      await pg.mouse.move(x + dx, y + dy, { steps: 6 });
      await pg.waitForTimeout(150);
      await pg.mouse.up();
      await pg.waitForTimeout(1200);
    };

    // EC3 (fix explore-town-scope): near you the row is the towns alone, the first selected; the title names the level.
    const front = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => ({ name: e.dataset.name, level: e.dataset.level, sel: e.dataset.selected })));
    check(front.length >= 2 && front.every((t) => t.level === 'town') && front[0].sel === '1',
      `fix explore-town-scope: near you the row holds only towns, the first selected (${JSON.stringify(front)})`);
    check((await safe(() => pg.locator('[data-testid=explore-area]').innerText(), '')) === 'Near you' && (await pg.locator('[data-testid=atlas-back-pill]').count()) === 0,
      'fix explore-town-scope: near you the title says "Near you" and there is no back pill');
    // EC5, EC6: a town selected has no ring (a town has its border), and the map names only that town.
    const townSel = front[0]?.name;
    const townNamed = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=area-point]')].filter((e) => e.dataset.name).map((e) => e.dataset.name));
    check(((await map.getAttribute('data-ring')) ?? '') === '' && townNamed.length === 1 && townNamed[0] === townSel,
      `EC5: a town's card selected has no ring, and the map names only that town (${townSel}, ring "${await map.getAttribute('data-ring')}", ${JSON.stringify(townNamed)})`);
    // explore-carousel audit 15: the row has an accessible name that holds no count.
    const rowLabel = await safe(() => pg.locator('[data-testid=atlas-carousel]').getAttribute('aria-label'), '');
    check(rowLabel === 'Towns near you', `explore-carousel audit 15: the row is named for a screen reader, with no count (${JSON.stringify(rowLabel)})`);
    // explore-carousel audit 4: a town card that is not selected makes no promise of a way in.
    const townFooters = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile][data-level="town"]')].map((e) => ({ sel: e.dataset.selected, has: /See its neighborhoods/.test(e.innerText) })));
    check(townFooters.length > 0 && townFooters.every((t) => t.has === (t.sel === '1')), `explore-carousel audit 4: the footer shows only on the selected town card (${JSON.stringify(townFooters)})`);

    // A tap on the selected town opens its page: the town's own card, then its neighborhoods; the pill goes back to the towns.
    await safe(() => pg.locator('[data-testid=atlas-tile][data-selected="1"]').first().click());
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 4, null, { timeout: 30000 }).catch(() => {});
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=area-point]').length >= 4, null, { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const pillText = await safe(() => pg.locator('[data-testid=atlas-back-pill]').innerText(), '');
    check(/\bTowns$/.test(pillText.trim()) && (await safe(() => pg.locator('[data-testid=explore-area]').innerText(), '')) === townSel,
      `fix explore-town-scope: a town's page is titled with its name and its pill reads "Towns" (${townSel}, ${JSON.stringify(pillText)})`);
    const pageLevels = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-town-head], [data-testid=atlas-tile]')].map((e) => e.dataset.level));
    check(pageLevels[0] === 'town' && pageLevels.slice(1).every((l) => l === 'neighborhood'), `EC3: a town's page is its own card, then its neighborhoods (${pageLevels.join(', ')})`);
    // The town's own card leads; step onto its first neighborhood for the gestures (the keys go to the canvas, audit 3).
    await pg.locator('.maplibregl-canvas').first().focus().catch(() => {});
    await pg.keyboard.press('ArrowRight');
    await pg.waitForTimeout(1200);
    const row = await safe(() => pg.locator('[data-testid=atlas-carousel]').boundingBox());
    const mapBox = await safe(() => map.boundingBox());
    const vh = await pg.evaluate(() => window.innerHeight);

    // EC1: something is always selected; a tap on the map away from an area keeps it.
    const first = await selected();
    check(first.length === 1, `EC1: on arrival one area is selected (${JSON.stringify(first)})`);
    if (mapBox) await pg.mouse.click(mapBox.x + mapBox.width * 0.9, mapBox.y + mapBox.height * 0.2);
    await pg.waitForTimeout(500);
    check((await selected()).length === 1, 'EC1: a tap on the map away from an area keeps the selection');

    // EC2: the map is most of the screen, the row under it, no grid and no section headings.
    check(mapBox && row && mapBox.height > vh * 0.55 && row.y >= mapBox.y + mapBox.height - 2, `EC2: the map is over 55% of the screen and the row sits below it (${mapBox?.height}/${vh})`);
    check((await pg.locator('[data-testid=atlas-grid]').count()) === 0, 'EC2: there is no grid');
    const text = await pg.evaluate(() => document.body.innerText);
    check(!/Neighborhoods near you|Other towns/.test(text), 'EC2: no section headings');

    // EC4, EC8: a drag left on the map steps to the next card, and the row settles on it.
    const before = (await selected())[0];
    await drag(-80, 0);
    const after = (await selected())[0];
    const centred = await safe(() => pg.evaluate(() => {
      const r = document.querySelector('[data-testid=atlas-carousel]').getBoundingClientRect();
      const t = document.querySelector('[data-testid=atlas-tile][data-selected="1"], [data-testid=atlas-tile][data-selected="true"]');
      if (!t) return false;
      const b = t.getBoundingClientRect();
      return Math.abs(b.x + b.width / 2 - (r.x + r.width / 2)) < 40;
    }), false);
    check(before && after && after !== before && (await names()).indexOf(after) === (await names()).indexOf(before) + 1, `EC8: a drag left on the map selects the next card (${before} → ${after})`);
    check(centred, 'EC4: the row settles with the selected card centred');
    await drag(0, -90);
    check((await selected())[0] === after, 'EC8: a vertical drag on the map does nothing');
    await drag(80, 0);
    check((await selected())[0] === before, 'EC8: a drag right goes back to the previous card');

    // EC5, EC6: the selected area has its ring and the one name; the other points are unnamed dots.
    const named = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=area-point]')].filter((e) => e.dataset.name).map((e) => e.dataset.name));
    check(named.length === 1 && named[0] === (await selected())[0], `EC6: the map names only the selected area (${JSON.stringify(named)})`);

    // EC9: the arrow keys on the focused map.
    await map.focus().catch(() => {});
    const k0 = (await selected())[0];
    await pg.keyboard.press('ArrowRight');
    await pg.waitForTimeout(1200);
    const k1 = (await selected())[0];
    check(k0 && k1 && k1 !== k0, `EC9: ArrowRight steps to the next card (${k0} → ${k1})`);
    await pg.keyboard.press('ArrowUp');
    await pg.waitForTimeout(800);
    check((await selected())[0] === k1, 'EC9: ArrowUp does nothing');
    await pg.keyboard.press('ArrowLeft');
    await pg.waitForTimeout(1200);
    check((await selected())[0] === k0, 'EC9: ArrowLeft steps back');

    // EC10: one finger never pans; the wheel zooms.
    const c0 = await map.getAttribute('data-center');
    await drag(0, 24 + 5);
    check(await safe(async () => (await map.getAttribute('data-center')) === c0, false), 'EC10: a drag never pans the map');

    // EC11: a tap on the selected card opens its card; a tap on another selects and opens nothing.
    const other = pg.locator('[data-testid=atlas-tile][data-level="neighborhood"]:not([data-selected="1"])').first();
    const otherName = await safe(() => other.getAttribute('data-name'));
    await safe(() => other.click());
    await pg.waitForTimeout(1200);
    check(otherName && (await selected())[0] === otherName && (await pg.locator('[data-testid=atlas-card-close]').count()) === 0, `EC11: a tap on another card selects it and opens nothing (${otherName})`);
    await safe(() => pg.locator('[data-testid=atlas-tile][data-selected="1"], [data-testid=atlas-tile][data-selected="true"]').first().click());
    await pg.waitForTimeout(1200);
    check((await pg.locator('[data-testid=atlas-card-close]').count()) === 1, 'EC11: a tap on the selected card opens its card');
    await safe(() => pg.click('[data-testid=atlas-card-close]'));

    // EC13: a step is announced; a card is one labelled control.
    check(!!(await said()), 'EC13: a step is announced');
    const label = await safe(() => pg.locator('[data-testid=atlas-tile][data-selected="1"], [data-testid=atlas-tile][data-selected="true"]').first().getAttribute('aria-label'), '');
    check(/Opens its (card|page)$/.test(label ?? ''), `EC13: the selected card's label ends "Opens its card" (${label})`);

    // EC15, EC18: a card shows no digit outside a distance or a "Walked N times" clause, and no ranking words.
    const cards = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.innerText));
    const stray = cards.filter((t) => t.replace(/\d+(\.\d+)?\s?(km|mi|min|m|ft|h)\b/gi, '').replace(/Walked \d+ times?/gi, '').match(/\d/));
    check(cards.length > 0 && stray.length === 0 && !cards.some((t) => /\b(nearest|top|best)\b/i.test(t)), 'EC15: no digit outside a distance or a Walked-N-times clause, and no ranking words on a card');

    // EC19: Locate, Layers and the compass are inside the map, none under the row.
    const loc = await safe(() => pg.locator('[data-testid=locate]').boundingBox());
    check(loc && row && loc.y + loc.height <= row.y + 1, 'EC19: Locate is above the row');
    const layersBtn = await safe(() => pg.locator('[data-testid=layers]').boundingBox());
    check(layersBtn && row && layersBtn.y + layersBtn.height <= row.y, 'EC19: Layers is above the row');

    // EC5: the selected neighborhood has its ring; EC7: zoomed out, the map carries no street names.
    const ringOn = await safe(() => map.evaluate((el) => !!el.getAttribute('data-ring')), false);
    check(ringOn, 'EC5: the selected area has its ring on the map');
    // The Busy layer's names are DOM markers that are not area points. This world has no busy streets to name, so what
    // the journey can show is that zoomed out the map carries none; the distance and zoom rule is `carousel.test.ts` (EC7).
    const busyNames = () => pg.evaluate(() => [...document.querySelectorAll('.maplibregl-marker')].filter((m) => !m.matches('[data-testid=area-point]') && !m.querySelector('[data-testid=area-point]') && /Street|Avenue|Road/.test(m.textContent ?? '')).length);
    const mb = await map.boundingBox();
    await pg.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
    for (let i = 0; i < 6 && Number(await map.getAttribute('data-zoom')) >= 12.5; i++) {
      await pg.mouse.wheel(0, 400);
      await pg.waitForTimeout(500);
    }
    await pg.waitForTimeout(800);
    const zOut = Number(await map.getAttribute('data-zoom'));
    check(zOut < 13 && (await busyNames()) === 0, `EC7: zoomed out (${zOut.toFixed(1)}) the map carries no Busy street names`);

    // EC18: a card names its busiest street; EC20: the area's card still holds Walk to.
    const busiest = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].filter((e) => /Street|Avenue|Road/.test(e.innerText)).length);
    check(busiest > 0, `EC18: a card names its busiest street (${busiest} cards)`);
    await safe(() => pg.locator('[data-testid=atlas-tile][data-selected="1"], [data-testid=atlas-tile][data-selected="true"]').first().click());
    await pg.waitForTimeout(1200);
    check((await pg.locator('[data-testid=atlas-walk-to]').count()) + (await pg.getByText('Walk to').count()) > 0, 'EC20: the area\'s card still holds Walk to');
    await safe(() => pg.click('[data-testid=atlas-card-close]'));

    // EC14: no status card unless no area is listed (the empty row is checked on the town page below); EC17: Navigate pans.
    check((await pg.locator('[data-testid=atlas-empty]').count()) === 0, 'EC14: with areas listed, no status card shows');
    await safe(() => h.tabTo(pg, 'navigate'));
    await pg.waitForSelector('[data-testid=ready-bar]', { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    const nav = pg.locator('.maplibregl-map').last();
    const nb = await safe(() => nav.boundingBox());
    const n0 = ((await safe(() => nav.getAttribute('data-center'), '0,0')) || '0,0').split(',').map(Number);
    if (nb) {
      await pg.mouse.move(nb.x + nb.width / 2, nb.y + nb.height * 0.4);
      await pg.mouse.down();
      await pg.mouse.move(nb.x + nb.width / 2 - 120, nb.y + nb.height * 0.4, { steps: 8 });
      await pg.mouse.up();
    }
    await pg.waitForTimeout(1200);
    const n1 = ((await safe(() => nav.getAttribute('data-center'), '0,0')) || '0,0').split(',').map(Number);
    check(h.distanceM(n0, n1) > 20, `EC17: Navigate's map still pans by a drag (${h.distanceM(n0, n1).toFixed(0)} m)`);
  } finally {
    snapWorld.serve = false;
    await c.close();
  }
}

// EC12, EC14: a town's page; the pill is over the map above the row.
async function townPage(h) {
  const { url, exploreUrl, check, freshPage, snapWorld, divisions } = h;
  snapWorld.serve = true;
  divisions.serve = true;
  const { c, pg } = await freshPage('carousel-town');
  try {
    await pg.goto(exploreUrl);
    // Your town leads the row near you, selected (fix explore-town-scope).
    await pg.waitForFunction(() => !!document.querySelector('[data-testid=atlas-tile][data-name="Allentown"][data-selected="1"]'), null, { timeout: 60000 }).catch(() => {});
    await pg.click('[data-testid=atlas-tile][data-selected="1"]').catch(() => {});
    await pg.waitForTimeout(3000);
    const first = await pg.evaluate(() => document.querySelector('[data-testid=atlas-town-head], [data-testid=atlas-tile]')?.dataset.name ?? null);
    const sel = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-town-head][data-selected="1"], [data-testid=atlas-tile][data-selected="1"]')].map((e) => e.dataset.name));
    check(first && sel.includes(first), `EC12: a town's page selects its own card first (${first} ${JSON.stringify(sel)})`);
    const pill = await pg.locator('[data-testid=atlas-back-pill]').boundingBox().catch(() => null);
    const row = await pg.locator('[data-testid=atlas-carousel]').boundingBox().catch(() => null);
    check(pill && row && pill.y + pill.height <= row.y + 1, 'EC12: the back pill is above the row');
    // explore-carousel audit 11: with the long press's choices showing, the way back is still there, above them.
    const mb = await pg.locator('.maplibregl-map').first().boundingBox();
    await pg.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(800);
    await pg.mouse.up();
    await pg.waitForTimeout(800);
    const spotBox = await pg.locator('[data-testid=atlas-spot]').boundingBox().catch(() => null);
    const pill2 = await pg.locator('[data-testid=atlas-back-pill]').boundingBox().catch(() => null);
    check(spotBox && pill2 && pill2.y + pill2.height <= spotBox.y + 1, `explore-carousel audit 11: on a town's page the back pill stays above the long press's choices (${pill2 && Math.round(pill2.y + pill2.height)} <= ${spotBox && Math.round(spotBox.y)})`);
    await pg.locator('[data-testid=atlas-spot] [aria-label=Close]').click().catch(() => {});
    await pg.waitForTimeout(500);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(1500);
    check((await pg.locator('[data-testid=atlas-back-pill]').count()) === 0, 'EC12: Escape returns from the town\'s page');
  } finally {
    snapWorld.serve = false;
    divisions.serve = false;
    await c.close();
  }
}

// EC16: from 1000 px the layout is the same and the card opens beside it.
async function wide(h) {
  const { url, exploreUrl, check, freshPage, snapWorld } = h;
  snapWorld.serve = true;
  const { c, pg } = await freshPage('carousel-wide');
  try {
    await pg.setViewportSize({ width: 1200, height: 800 });
    await pg.goto(exploreUrl);
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const map = await pg.locator('.maplibregl-map').first().boundingBox();
    const row = await pg.locator('[data-testid=atlas-carousel]').boundingBox().catch(() => null);
    check(!!(map && row && map.width > 1000 && row.y >= map.y + map.height - 2), `EC16: at 1200 px the map is full width and the row is at its bottom (${map?.width})`);
  } finally {
    snapWorld.serve = false;
    await c.close();
  }
}

// explore-carousel audit 10: the long press's hint shows once, whether or not the long press was ever used.
async function hintOnce(h) {
  const { url, exploreUrl, check, freshPage, snapWorld } = h;
  snapWorld.serve = true;
  const { c, pg } = await freshPage('carousel-hint');
  try {
    await pg.goto(exploreUrl);
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    const first = await pg.locator('[data-testid=atlas-press-hint]').count();
    await pg.waitForTimeout(7000);
    await pg.reload();
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const second = await pg.locator('[data-testid=atlas-press-hint]').count();
    check(first === 1 && second === 0, `explore-carousel audit 10: the hint shows once, and not again on the next visit (${first} → ${second})`);
  } finally {
    snapWorld.serve = false;
    await c.close();
  }
}

// explore-carousel audit 6: selecting a town on the page near you frames the map once, not again when its outline arrives.
async function townFramedOnce(h) {
  const { url, exploreUrl, check, freshPage, snapWorld, divisions } = h;
  snapWorld.serve = true;
  divisions.serve = true;
  const { c, pg } = await freshPage('carousel-frame');
  try {
    await pg.goto(exploreUrl);
    // Your town leads the row near you, selected (fix explore-town-scope).
    await pg.waitForFunction(() => !!document.querySelector('[data-testid=atlas-tile][data-name="Allentown"][data-selected="1"]'), null, { timeout: 60000 }).catch(() => {});
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const map = pg.locator('.maplibregl-map').first();
    await pg.locator('.maplibregl-canvas').first().focus().catch(() => {});
    // Another town than yours (which leads the row, selected): one step along the row of towns.
    const selTown = () => pg.evaluate(() => !!document.querySelector('[data-testid=atlas-tile][data-level="town"][data-selected="1"]:not([data-name="Allentown"])'));
    for (let i = 0; i < 12 && !(await selTown()); i++) {
      await pg.keyboard.press('ArrowRight');
      await pg.waitForTimeout(700);
    }
    await pg.waitForTimeout(2500);
    const tiles = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => `${e.dataset.name}:${e.dataset.level}:${e.dataset.selected}`));
    const at1 = await map.getAttribute('data-bounds');
    await pg.waitForTimeout(6000);
    const at2 = await map.getAttribute('data-bounds');
    check((await selTown()) && at1 === at2, `explore-carousel audit 6: a town selected in the row is framed once, not again when its outline arrives (${at1} → ${at2}; ${tiles.join(', ')})`);
  } finally {
    snapWorld.serve = false;
    divisions.serve = false;
    await c.close();
  }
}

module.exports = {
  name: 'carousel',
  // Explore carousel (EC1-EC20): the map and a row of area cards.
  covers: [
    'src/app/(tabs)/explore.tsx',
    'src/lib/atlas/carousel.ts',
    'src/components/atlas/AtlasCarousel.tsx',
    'src/components/atlas/AtlasTile.tsx',
    'src/components/map/WalkMap.web.tsx',
    'src/components/map/types.ts',
    'src/components/AreaPoint.tsx',
  ],
  run: async (h) => {
    await run(h);
    await townPage(h);
    await wide(h);
    await hintOnce(h);
    await townFramedOnce(h);
  },
};
