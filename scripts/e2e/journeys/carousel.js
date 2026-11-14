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
    // tend explore 9 (decision 0172, O3, the accent at rest): the selected card's border, its "See its neighborhoods" and its
    // chevron are ink (#1d2430); the accent is only for a card's single primary action.
    const inkOf = (sel) => pg.evaluate((q) => {
      const tile = document.querySelector(q);
      if (!tile) return null;
      const label = [...tile.querySelectorAll('div')].find((e) => e.childElementCount === 0 && /^(See its neighborhoods|What’s here)$/.test(e.textContent));
      const chevron = label?.nextElementSibling;
      const cs = (e) => (e ? getComputedStyle(e) : null);
      return { border: cs(tile)?.borderTopColor, label: cs(label)?.color, chevron: cs(chevron)?.color };
    }, sel);
    const INK = 'rgb(29, 36, 48)';
    const atRest = await inkOf('[data-testid=atlas-tile][data-level="town"][data-selected="1"]');
    check(atRest && atRest.border === INK && atRest.label === INK && atRest.chevron === INK,
      `tend explore 9: the selected town card's border, "See its neighborhoods" and its chevron are ink, not the accent (${JSON.stringify(atRest)})`);

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
    const headAtRest = await inkOf('[data-testid=atlas-town-head][data-selected="1"]');
    check(headAtRest && headAtRest.border === INK && headAtRest.label === INK && headAtRest.chevron === INK,
      `tend explore 9: on a town's page its selected card's border, "What’s here" and its chevron are ink (${JSON.stringify(headAtRest)})`);
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
    // Neighborhood boundaries (HB9): its own ground as a line stands in place of the ring once the tiles are kept.
    await pg.waitForTimeout(3000);
    const ringOn = await safe(() => map.evaluate((el) => !!el.getAttribute('data-ring') || !!el.getAttribute('data-ground')), false);
    check(ringOn, 'EC5, HB9: the selected area has its ring, or its own ground, on the map');
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
    {
      // tend explore 6: one Escape steps out of one thing: the long press's choices, then the Layers panel, and only then the page.
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(500);
      const spotGone = (await pg.locator('[data-testid=atlas-spot]').count()) === 0;
      const page1 = (await pg.locator('[data-testid=atlas-back-pill]').count()) === 1;
      if (!spotGone) await pg.locator('[data-testid=atlas-spot] [aria-label=Close]').click().catch(() => {});
      if (!page1) await pg.locator('[data-testid=atlas-tile][data-level="town"]').first().click().catch(() => {});
      await pg.waitForSelector('[data-testid=layers]', { timeout: 5000 }).catch(() => {});
      await pg.click('[data-testid=layers]').catch(() => {});
      const panelShown = await pg.waitForSelector('[data-testid=layers-panel]', { timeout: 3000 }).then(() => true, () => false);
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(500);
      const panelGone = (await pg.locator('[data-testid=layers-panel]').count()) === 0;
      const page2 = (await pg.locator('[data-testid=atlas-back-pill]').count()) === 1;
      check(spotGone && page1 && panelShown && panelGone && page2, `tend explore 6, tend explore audit 4: on a town's page, Escape closes the choices, then Layers, and keeps the page (choices closed ${spotGone}, page ${page1}; panel ${panelShown} → closed ${panelGone}, page ${page2})`);
      if (!page2) await pg.locator('[data-testid=atlas-tile][data-level="town"]').first().click().catch(() => {});
      await pg.waitForTimeout(500);
    }
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
    // fix town-fit (the owner, Nov 13): back to yours and to it again, each town is framed whole each time, at its own
    // zoom; a town selected a second time kept the zoom the last one left.
    const z1 = Number(await map.getAttribute('data-zoom'));
    await pg.keyboard.press('ArrowLeft');
    await pg.waitForTimeout(3500);
    const zHome = Number(await map.getAttribute('data-zoom'));
    await pg.keyboard.press('ArrowRight');
    await pg.waitForTimeout(3500);
    const z2 = Number(await map.getAttribute('data-zoom'));
    check((await selTown()) && Math.abs(z2 - z1) < 0.05 && Math.abs(zHome - z1) > 1,
      `fix town-fit: a town selected again is framed whole again, at its own zoom (${z1.toFixed(2)} → yours ${zHome.toFixed(2)} → ${z2.toFixed(2)})`);
  } finally {
    snapWorld.serve = false;
    divisions.serve = false;
    await c.close();
  }
}

// Whole towns (WT1-WT14, decision 0132): Allentown's page lists every neighborhood inside its border, a hamlet in it,
// no ward; the selected area's places are "?" where they have room and dots where not; a tapped dot zooms in.
async function wholeTowns(h) {
  const { exploreUrl, check, freshPage, snapWorld, wholeWorld, divisions, areaTile, shot } = h;
  snapWorld.serve = true;
  divisions.serve = true;
  wholeWorld.serve = true;
  const { c, pg } = await freshPage('carousel-whole');
  await c.addInitScript(() => { window.__perf = {}; });
  try {
    await pg.goto(exploreUrl);
    await pg.waitForFunction(() => !!document.querySelector('[data-testid=atlas-tile][data-name="Allentown"][data-selected="1"]'), null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(4000);
    await shot(pg, 'whole-towns-0-town-selected');
    // whole-towns audit 14: a town at its own scale shows its places as dots, found or not, and no "?".
    const townView = await pg.evaluate(() => ({
      pins: document.querySelectorAll('[data-testid=mark-pin]').length,
      dots: JSON.parse(document.querySelector('[data-waiting-dots]')?.getAttribute('data-waiting-dots') ?? '[]').length,
      zoom: Number(document.querySelector('[data-zoom]')?.getAttribute('data-zoom') ?? 0),
    }));
    check(townView.zoom >= 14 || (townView.pins === 0 && townView.dots >= 1), `whole-towns audit 14: a town at its own scale is dots, no "?" (${JSON.stringify(townView)})`);
    // WT5, WT6: on Allentown's page, the hamlet inside its border has a card; the ward has none.
    const hamlet = await areaTile(pg, 'Quarry Hill');
    const cards = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.name));
    check((await hamlet.count()) === 1, `WT5: a hamlet inside the town's border has a card on its page (${JSON.stringify(cards)})`);
    check(!cards.includes('3rd Ward') && cards.includes('Wickenden'), `WT6: a ward inside the border has no card (${JSON.stringify(cards)})`);
    await shot(pg, 'whole-towns-1-town-page');
    // WT8: no text on the page or the row counts places or neighborhoods, in digits or words.
    const COUNT = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozens?|several|many)\s+(neighbou?rhoods?|places?)\b/i;
    const pageText = await pg.locator('body').innerText().catch(() => '');
    check(!COUNT.test(pageText), `WT8: no count of places or neighborhoods on the town's page (${(pageText.match(COUNT) ?? [''])[0]})`);

    // Select Wickenden: its ring is read, its places drawn.
    await (await areaTile(pg, 'Wickenden')).click().catch(() => {});
    const drawn = () => pg.evaluate(() => {
      const map = document.querySelector('.maplibregl-map');
      const dots = JSON.parse(map?.closest('[data-waiting-dots]')?.getAttribute('data-waiting-dots') ?? document.querySelector('[data-waiting-dots]')?.getAttribute('data-waiting-dots') ?? '[]');
      const pins = [...document.querySelectorAll('[data-testid=mark-pin]')].map((e) => ({ label: e.getAttribute('aria-label'), hidden: e.getAttribute('aria-hidden'), text: e.innerText }));
      return { dots, pins, zoom: Number(document.querySelector('[data-zoom]')?.getAttribute('data-zoom') ?? 0) };
    });
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=mark-pin]').length > 0, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    const out = await drawn();
    await shot(pg, 'whole-towns-2-neighborhood-dots');
    // The murals (6) and Fox Point's art and memorial in Wickenden's 800 m ring: more than one per kind.
    check(out.pins.length + out.dots.length >= 6, `WT7: the selected neighborhood's map holds every place still to find, as "?" and dots (${out.pins.length} "?", ${out.dots.length} dots at zoom ${out.zoom})`);
    check(out.dots.length >= 1, `WT12: zoomed out, the murals 30 m apart are dots where a "?" would crowd (${out.dots.length} dots at zoom ${out.zoom})`);
    check(out.pins.every((p) => p.text.trim() === '?' || p.text.trim() === ''), `WT10, WT14: no pin on Explore's map is named or found (${JSON.stringify(out.pins.map((p) => p.text))})`);
    check(out.pins.every((p) => p.label === 'A place to find. Open'), 'WT10: no found place is drawn');
    const said = await pg.locator('[data-testid=atlas-waiting-said]').getAttribute('aria-label').catch(() => '');
    check(out.pins.every((p) => p.hidden === 'true') && /^Waiting in Wickenden: /.test(said ?? '') && !/\d/.test(said ?? ''),
      `WT11: the "?" are one accessible element naming the area and the kinds ("${said}"; pins hidden: ${out.pins.every((p) => p.hidden === 'true')})`);
    // whole-towns audit 6: no two "?" overlap on screen.
    const overlapping = () => pg.evaluate(() => {
      const r = [...document.querySelectorAll('[data-testid=mark-pin]')].map((e) => e.getBoundingClientRect());
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
        if (r[i].left < r[j].right - 4 && r[j].left < r[i].right - 4 && r[i].top < r[j].bottom - 4 && r[j].top < r[i].bottom - 4) return true;
      }
      return false;
    });
    check(!(await overlapping()), 'whole-towns audit 6: no two "?" overlap on screen (a neighborhood selected)');
    // whole-towns audit 5: the spoken line is a button that opens the selected area's card, by keyboard too.
    await pg.locator('[data-testid=atlas-waiting-said]').focus().catch(() => {});
    await pg.keyboard.press('Enter');
    await pg.waitForTimeout(1500);
    const cardOpen = (await pg.locator('[data-testid=atlas-card]').count()) > 0;
    check(cardOpen, 'whole-towns audit 5: the spoken line opens the selected area\'s card by keyboard');
    if (cardOpen) {
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(1200);
    }

    // WT13: a tap on a dot eases the map in around it until it is a "?". Zoomed out the murals lie under their "?" (a tap
    // there opens the card, as a "?" does), so zoom in two steps first, where they are dots apart, and tap one no pin covers.
    await pg.locator('.maplibregl-canvas').first().focus().catch(() => {});
    await pg.keyboard.press('+');
    await pg.waitForTimeout(900);
    await pg.keyboard.press('+');
    await pg.waitForTimeout(2000);
    const before = await drawn();
    await shot(pg, 'whole-towns-3-zoomed-in');
    const free = await pg.evaluate((dots) => {
      const rects = [...document.querySelectorAll('[data-testid=mark-pin], [data-testid=area-point]')].map((e) => e.getBoundingClientRect());
      return dots.find((d) => {
        const [x, y] = window.__project(d);
        return !rects.some((r) => x > r.left - 6 && x < r.right + 6 && y > r.top - 6 && y < r.bottom + 6);
      }) ?? null;
    }, before.dots);
    if (free) {
      const [x, y] = await pg.evaluate((q) => window.__project(q), free);
      await pg.mouse.click(x, y);
      await pg.waitForTimeout(3000);
      const after = await drawn();
      await shot(pg, 'whole-towns-4-dot-tapped');
      const isPin = await pg.evaluate((q) => [...document.querySelectorAll('[data-testid=mark-pin]')].some((e) => {
        const r = e.getBoundingClientRect();
        const [px, py] = window.__project(q);
        return Math.abs(r.left + r.width / 2 - px) < 8 && Math.abs(r.bottom - py) < 20;
      }), free);
      check(after.zoom > before.zoom && isPin, `WT13: a tapped dot zooms in until it is a "?" (zoom ${before.zoom} → ${after.zoom}; a "?" there: ${isPin})`);
      check(after.pins.length > out.pins.length, `WT12: zoomed in, more of the cluster is "?" (${out.pins.length} → ${after.pins.length})`);
      check(!(await overlapping()), 'whole-towns audit 6: no two "?" overlap on screen (zoomed in)');
    } else {
      check(false, `WT13: a dot no pin covers, to tap (${before.dots.length} dots at zoom ${before.zoom})`);
    }

    // whole-towns audit 4: a "?" with places under it zooms in on a tap rather than opening the card.
    await pg.locator('.maplibregl-canvas').first().focus().catch(() => {});
    for (let i = 0; i < 3; i++) {
      await pg.keyboard.press('-');
      await pg.waitForTimeout(700);
    }
    await pg.waitForTimeout(1500);
    const z0 = (await drawn()).zoom;
    // A "?" with a dot under its drawn box.
    const crowdedAt = await pg.evaluate((dots) => {
      const pts = dots.map((d) => window.__project(d));
      for (const e of document.querySelectorAll('[data-testid=mark-pin]')) {
        const r = e.getBoundingClientRect();
        if (pts.some(([x, y]) => x > r.left && x < r.right && y > r.top && y < r.bottom)) return [r.left + r.width / 2, r.top + r.height / 3];
      }
      return null;
    }, (await drawn()).dots);
    if (crowdedAt) {
      await pg.mouse.click(crowdedAt[0], crowdedAt[1]);
      await pg.waitForTimeout(2500);
      const z1 = (await drawn()).zoom;
      const opened = (await pg.locator('[data-testid=atlas-card]').count()) > 0;
      check(z1 > z0 && !opened, `whole-towns audit 4: a "?" with places under it zooms in on a tap (zoom ${z0} → ${z1}, card ${opened ? 'opened' : 'closed'})`);
      if (opened) await pg.keyboard.press('Escape');
    } else {
      check(false, 'whole-towns audit 4: a "?" to tap');
    }

    // WT14: only the selected area's: select another neighborhood, and none of Wickenden's dots stays.
    await (await areaTile(pg, 'Hope Village')).click().catch(() => {});
    await pg.waitForTimeout(2500);
    const other = await drawn();
    await shot(pg, 'whole-towns-5-other-neighborhood');
    const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
    check(!other.dots.some((d) => out.dots.some((w) => near(d, w))), `WT14: dots are drawn for the selected area only (${other.dots.length} dots for Hope Village)`);
  } finally {
    snapWorld.serve = false;
    divisions.serve = false;
    wholeWorld.serve = false;
    await c.close();
  }
}

// The area card's footer at 390 and 320 (decision 0172): where you are, it is a status line in ink (tend explore 10); a far
// town's question has a quiet "Not now" and no name line (tend explore 11).
async function cardFooter(h) {
  const { exploreUrl, check, freshPage, shot, areaTile, snapWorld } = h;
  for (const [w, hgt] of [[390, 844], [320, 700]]) {
    const { c, pg } = await freshPage(`carousel-footer-${w}`);
    try {
      await pg.setViewportSize({ width: w, height: hgt });
      await pg.goto(exploreUrl);
      const fox = await areaTile(pg, 'Fox Point');
      await fox.click().catch(() => {});
      if (!(await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 3000 }).catch(() => null))) await fox.click().catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(900);
      // tend explore 10 (O10): "You're in Fox Point" is a status line in ink, never link-coloured; the page's heading stays the town.
      const here = await pg.evaluate(() => {
        const e = [...document.querySelectorAll('[data-testid=atlas-card] div')].find((d) => d.childElementCount === 0 && /^You’re in /.test(d.textContent));
        return e ? { text: e.textContent, color: getComputedStyle(e).color, link: !!e.closest('a,[role=link],[role=button]') } : null;
      });
      const heading = await pg.locator('[data-testid=explore-area]').innerText().catch(() => '');
      check(here && here.text === 'You’re in Fox Point' && here.color === 'rgb(29, 36, 48)' && !here.link && heading === 'Providence',
        `tend explore 10: at ${w}, the card's "You're in Fox Point" is a status line in ink, not link-coloured, and the heading stays the town (${JSON.stringify({ ...here, heading })})`);
      await shot(pg, `carousel-here-card-${w}`);
    } finally {
      await c.close();
    }
    // tend explore 11 (O2): a far town's question says no name of its own (the card's header names the town), and its
    // way out is a quiet "Not now" in words, not a second close button.
    snapWorld.serve = true;
    const { c: c2, pg: pg2 } = await freshPage(`carousel-far-${w}`);
    try {
      await pg2.setViewportSize({ width: w, height: hgt });
      await pg2.goto(exploreUrl);
      const cranston = pg2.locator('[data-testid=atlas-tile][data-name="Cranston"]');
      await pg2.waitForSelector('[data-testid=atlas-tile][data-name="Cranston"]', { timeout: 60000 }).catch(() => {});
      await cranston.first().click().catch(() => {});
      await pg2.waitForTimeout(800);
      if (!(await pg2.locator('[data-testid=atlas-card]').count()) && (await cranston.count())) await cranston.first().click().catch(() => {});
      await pg2.waitForTimeout(800);
      if (!(await pg2.locator('[data-testid=atlas-card]').count())) await pg2.click('[data-testid=atlas-town-head]', { timeout: 30000 }).catch(() => {});
      await pg2.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 }).catch(() => {});
      await pg2.waitForTimeout(700);
      await pg2.click('[data-testid=atlas-walk]').catch(() => {});
      await pg2.waitForTimeout(900);
      const asked = await pg2.evaluate(() => {
        const footer = document.querySelector('[data-testid=atlas-footer]');
        const cancel = document.querySelector('[data-testid=atlas-walk-cancel]');
        const r = cancel?.getBoundingClientRect();
        return {
          footer: footer?.innerText.replace(/\s+/g, ' ').trim() ?? null,
          cancel: cancel?.innerText.trim() ?? null,
          spoken: cancel?.getAttribute('aria-label') ?? null,
          size: r ? [Math.round(r.width), Math.round(r.height)] : null,
          now: !!document.querySelector('[data-testid=atlas-walk-now]'),
        };
      });
      check(asked.now && asked.cancel === 'Not now' && asked.spoken === 'Not now' && asked.footer != null && !/Cranston/.test(asked.footer)
        && asked.size && asked.size[0] >= 44 && asked.size[1] >= 44,
        `tend explore 11: at ${w}, a far town's question has no name line and a quiet "Not now" in words, a 44 px target (${JSON.stringify(asked)})`);
      await shot(pg2, `carousel-far-question-${w}`);
      await pg2.click('[data-testid=atlas-walk-cancel]').catch(() => {});
      await pg2.waitForTimeout(500);
      check((await pg2.locator('[data-testid=atlas-walk]').count()) === 1 && (await pg2.locator('[data-testid=atlas-walk-now]').count()) === 0,
        `tend explore 11: at ${w}, Not now closes the question and leaves the card`);
    } finally {
      await c2.close();
      snapWorld.serve = false;
    }
  }
}

// tend explore 12 (decision 0172, O7): a long press below zoom 10 says "Zoom in to look closer" for MOTION.toast (3 s), then
// the toast goes by itself; nothing else about it changed. At 390 and 320, pictured.
async function toastDwell(h) {
  const { exploreUrl, check, freshPage, shot } = h;
  for (const [w, hgt] of [[390, 844], [320, 700]]) {
    const { c, pg } = await freshPage(`carousel-toast-${w}`);
    try {
      await pg.setViewportSize({ width: w, height: hgt });
      await pg.goto(exploreUrl);
      await pg.waitForSelector('[data-testid=atlas-tile]', { timeout: 60000 }).catch(() => {});
      await pg.waitForTimeout(2000);
      const box = await pg.locator('canvas.maplibregl-canvas').filter({ visible: true }).last().boundingBox();
      await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 40);
      for (let i = 0; i < 20; i++) {
        await pg.mouse.wheel(0, 600);
        await pg.waitForTimeout(120);
      }
      await pg.waitForTimeout(1500);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.waitForTimeout(400);
      const up = await pg.getByText('Zoom in to look closer').count();
      await shot(pg, `carousel-toast-${w}`);
      await pg.waitForTimeout(3300);
      const gone = await pg.getByText('Zoom in to look closer').count();
      check(up === 1 && gone === 0, `tend explore 12: at ${w}, the toast shows, then goes by itself within its dwell, MOTION.toast (${JSON.stringify({ up, gone })})`);
    } finally {
      await c.close();
    }
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
    'src/components/atlas/AtlasCard.tsx',
    'src/components/map/WalkMap.web.tsx',
    'src/components/map/types.ts',
    'src/components/AreaPoint.tsx',
    'src/lib/atlas/hoods.ts',
    'src/lib/atlas/waitingPins.ts',
  ],
  run: async (h) => {
    await run(h);
    await townPage(h);
    await wide(h);
    await hintOnce(h);
    await townFramedOnce(h);
    await wholeTowns(h);
    await cardFooter(h);
    await toastDwell(h);
  },
};
