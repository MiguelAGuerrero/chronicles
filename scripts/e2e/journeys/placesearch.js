// Place search (GZ1-GZ19): a magnifier on Explore opens a field; typing lists towns and cities from the bundled pack; a pick
// looks at that place. E2E_ONLY=placesearch runs it alone. Written first, as todos (check.todo), each failing until its code.
const fs = require('fs');
const path = require('path');

async function run(h) {
  const { exploreUrl, check, freshPage, snapWorld, hosts, shot } = h;
  const todo = check.todo;
  snapWorld.serve = true;
  const { c, pg } = await freshPage('placesearch');
  const safe = async (fn, fallback = null) => fn().catch(() => fallback);
  const asked = [];
  pg.on('request', (r) => asked.push(r.url()));
  try {
    await pg.goto(exploreUrl);
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const body = () => safe(() => pg.locator('body').innerText(), '');
    const present = async (loc) => (await safe(() => loc.count(), 0)) > 0;
    const magnifier = pg.locator('[data-testid=atlas-search]');
    const sheet = pg.locator('[data-testid=atlas-search-sheet]');
    const field = pg.locator('[data-testid=atlas-search-field]');
    const results = pg.locator('[data-testid=atlas-search-result]');
    const clear = pg.locator('[data-testid=atlas-search-clear]');
    const close = pg.locator('[data-testid=atlas-search-close]');
    const title = () => safe(() => pg.locator('[data-testid=explore-area]').innerText(), '');
    const type = async (text) => { await safe(() => field.fill('')); await safe(() => field.pressSequentially(text, { delay: 15 })); await pg.waitForTimeout(400); };
    const open = async () => { await safe(() => magnifier.click()); await pg.waitForTimeout(500); };

    // GZ1: a magnifier is drawn in the title row, named Search places, 44 px.
    const mBox = await safe(() => magnifier.boundingBox(), null);
    const tBox = await safe(() => pg.locator('[data-testid=atlas-title-card]').boundingBox(), null);
    todo(!!mBox && mBox.width >= 44 && mBox.height >= 44 && /search places/i.test((await safe(() => magnifier.getAttribute('aria-label'), '')) || '') && !!tBox && Math.abs(mBox.y - tBox.y) < 60,
      'GZ1: a magnifier is drawn in the title row, named Search places, at least 44 px');
    await shot(pg, 'place-search-0-magnifier');

    // GZ2: the field is focused, labelled, 16 px, Clear only with text, a Close button; Escape closes.
    const reqsBefore = asked.length;
    const hostsBefore = [...hosts].sort().join();
    await open();
    const label = await safe(() => pg.locator('[data-testid=atlas-search-label]').innerText(), '');
    const focused = await safe(() => pg.evaluate(() => document.activeElement?.getAttribute('data-testid')), null);
    const fontPx = await safe(() => field.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)), 0);
    todo(/search towns and cities/i.test(label) && focused === 'atlas-search-field' && fontPx >= 16 && !(await present(clear)) && (await present(close)),
      `GZ2: the field is focused, labelled, 16 px and has Close, and no Clear until there is text (${label}, ${focused}, ${fontPx})`);
    await shot(pg, 'place-search-1-open');
    await type('zuric');
    todo(await present(clear) && /Zürich/.test(await safe(() => results.first().innerText(), '')),
      'GZ3: "zuric" finds Zürich by its plain spelling, and Clear is there once there is text');
    await type('s');
    todo((await safe(() => results.count(), 0)) === 0, 'GZ3: one letter lists nothing');
    await type('spr');
    const rowText = await safe(() => results.first().innerText(), '');
    todo((await safe(() => results.count(), 0)) > 1 && !/\d|\bkm\b|\baway\b/i.test(rowText) && /,/.test(rowText) && /keep typing to narrow it\./i.test(await body()),
      `GZ4/GZ5: a capped list ends with "Keep typing to narrow it.", each row is a name with its region and country and no digit (${JSON.stringify(rowText)})`);
    await type('qqzzqq');
    todo(/no towns or cities start like that\./i.test(await body()) && /smaller places are reached by move map\./i.test(await body()),
      'GZ8: no match says so, with the way on');

    // GZ9: nothing was asked of the network by typing, and the text is in no request.
    todo(asked.slice(reqsBefore).every((u) => !/zuric|spr|qqzz/i.test(u)) && [...hosts].sort().join() === hostsBefore,
      'GZ9: typing asks no new host and the text is in no request');

    // GZ16: Close, reopen: the field is empty and nothing was stored.
    const keysBefore = await safe(() => pg.evaluate(() => JSON.stringify(Object.keys(localStorage).sort())), '');
    await type('carl');
    await safe(() => close.click());
    await pg.waitForTimeout(400);
    const refocus = await safe(() => pg.evaluate(() => document.activeElement?.getAttribute('data-testid')), null);
    await open();
    const keysAfter = await safe(() => pg.evaluate(() => JSON.stringify(Object.keys(localStorage).sort())), '');
    todo(((await safe(() => field.inputValue(), 'x')) === '') && keysBefore === keysAfter && refocus === 'atlas-search',
      'GZ16/GZ11: after Close the field is empty on reopening, nothing is stored, and focus returned to the magnifier');
    await safe(() => pg.keyboard.press('Escape'));
    await pg.waitForTimeout(300);
    todo(!(await present(sheet)), 'GZ2: Escape closes the search');

    // GZ11: arrows step the results, Enter picks.
    await open();
    await type('cranston');
    await safe(() => pg.keyboard.press('ArrowDown'));
    await safe(() => pg.keyboard.press('Enter'));
    await pg.waitForTimeout(3500);

    // GZ6: a pick looks at that place; the words name it, none says the middle of the map; Locate returns.
    const t = await title();
    const text = await body();
    todo(!(await present(sheet)) && /^around cranston/i.test(t) && !/middle of the map|not around you|you.?re here/i.test(text),
      `GZ6: a pick looks at the place: the page is "Around Cranston", never "the middle of the map" (${JSON.stringify(t)})`);
    todo(/around cranston/i.test(await safe(() => pg.locator('[data-testid=atlas-snap-said]').textContent(), '')),
      'GZ6: the look is announced with the place\'s name');
    await shot(pg, 'place-search-2-looked');
    // GZ7: the map data there is not the fixture's: the look says so in its words, Locate and Move map stay.
    todo((await present(pg.locator('[data-testid=locate]'))) && (await present(pg.locator('[data-testid=atlas-move-map]'))),
      'GZ7: a look with no readable map data keeps Locate and Move map on screen');
    // GZ17: the magnifier is on a look's page too.
    todo(await present(magnifier), 'GZ17: the magnifier is on a look\'s page');
    await safe(() => pg.locator('[data-testid=locate]').click());
    await pg.waitForTimeout(3500);
    todo(/near you/i.test(await title()), 'GZ6: Locate ends the look');
    todo(await present(magnifier), 'GZ17: the magnifier is on the page near you');

    // GZ17: Move map on, a pick leaves it on.
    await safe(() => pg.locator('[data-testid=atlas-move-map]').click());
    await open();
    await type('cranston');
    await safe(() => results.first().click());
    await pg.waitForTimeout(2500);
    todo((await safe(() => pg.locator('[data-testid=atlas-move-map]').getAttribute('aria-pressed'), null)) === 'true',
      'GZ17: with Move map on, a pick leaves it on');
    await safe(() => pg.locator('[data-testid=atlas-move-map]').click());
    await safe(() => pg.locator('[data-testid=locate]').click());
    await pg.waitForTimeout(2500);

    // GZ14: the credit names the dataset where the map credits are.
    const credit = await safe(() => pg.locator('.maplibregl-ctrl-attrib').first().innerText(), '');
    todo(/geonames/i.test(credit) && /CC BY 4\.0/i.test(credit), `GZ14: the map's credit names the place-name dataset (${JSON.stringify(credit)})`);

    // GZ10: offline, the field matches and picks.
    await c.setOffline(true);
    await open();
    await type('zuric');
    const offline = await safe(() => results.count(), 0);
    await safe(() => results.first().click());
    await pg.waitForTimeout(1500);
    todo(offline >= 1 && /around z/i.test(await title()), `GZ10: offline, the field matches and a pick looks there (${offline})`);
    await c.setOffline(false);
    await safe(() => pg.locator('[data-testid=locate]').click());
    await pg.waitForTimeout(1500);

    // GZ18, GZ19: the longest name in the pack, at three widths: it fits and the overlays never overlap.
    const pack = JSON.parse(fs.readFileSync(path.join(h.scriptsDir, '..', 'assets', 'gazetteer', 'places.json'), 'utf8'));
    let longest = 0;
    pack.names.forEach((n, i) => { if (n.length > pack.names[longest].length) longest = i; });
    const longName = pack.names[longest];
    for (const width of [390, 320, 1000]) {
      await pg.setViewportSize({ width, height: 844 });
      await pg.waitForTimeout(600);
      await open();
      await type(longName.slice(0, 12));
      const row = await safe(() => results.first().boundingBox(), null);
      const sh = await safe(() => sheet.boundingBox(), null);
      const cl = await safe(() => close.boundingBox(), null);
      const rowRows = await safe(() => results.first().evaluate((e) => e.scrollWidth <= e.clientWidth + 1), false);
      todo(!!row && !!sh && !!cl && row.x >= sh.x - 1 && row.x + row.width <= sh.x + sh.width + 1 && rowRows,
        `GZ18: the longest name (${longName.length} chars) fits its row at ${width} px`);
      const rowTile = await safe(() => pg.locator('[data-testid=atlas-carousel]').boundingBox(), null);
      todo(!!sh && (!rowTile || sh.y + sh.height <= rowTile.y + 1) && sh.x >= 0 && sh.x + sh.width <= width + 1,
        `GZ19: the search sheet clears the row and the tabs and stays on screen at ${width} px`);
      if (width === 320) await shot(pg, 'place-search-3-long-320');
      await safe(() => pg.keyboard.press('Escape'));
      await pg.waitForTimeout(300);
    }
  } finally {
    snapWorld.serve = false;
    await c.close();
  }
}

module.exports = {
  name: 'placesearch',
  // Place search (GZ1-GZ19): the magnifier, the field, the results, a pick that looks at the place.
  covers: [
    'src/app/(tabs)/explore.tsx',
    'src/lib/atlas/freeLook.ts',
    'src/lib/atlas/overlaySlots.ts',
    'src/lib/gazetteer/**',
    'src/components/atlas/PlaceSearch.tsx',
    'src/components/icons.tsx',
    'src/components/map/WalkMap.web.tsx',
    'assets/gazetteer/places.json',
  ],
  run,
};
