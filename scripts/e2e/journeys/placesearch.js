// Place search (GZ1-GZ19): a magnifier on Explore opens a field; typing lists towns and cities from the bundled pack; a pick
// looks at that place. E2E_ONLY=placesearch runs it alone. Written first, as todos (check.todo), each failing until its code.
const fs = require('fs');
const path = require('path');

async function run(h) {
  const { exploreUrl, check, freshPage, snapWorld, hosts, shot } = h;
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
    check(!!mBox && mBox.width >= 44 && mBox.height >= 44 && /search places/i.test((await safe(() => magnifier.getAttribute('aria-label'), '')) || '') && !!tBox && Math.abs(mBox.y - tBox.y) < 60,
      'GZ1: a magnifier is drawn in the title row, named Search places, at least 44 px');
    await shot(pg, 'place-search-0-magnifier');

    // GZ2: the field is focused, labelled, 16 px, Clear only with text, a Close button; Escape closes.
    const reqsBefore = asked.length;
    const hostsBefore = [...hosts].sort().join();
    await open();
    const label = await safe(() => pg.locator('[data-testid=atlas-search-label]').innerText(), '');
    const focused = await safe(() => pg.evaluate(() => document.activeElement?.getAttribute('data-testid')), null);
    const fontPx = await safe(() => field.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)), 0);
    check(/search towns and cities/i.test(label) && focused === 'atlas-search-field' && fontPx >= 16 && !(await present(clear)) && (await present(close)),
      `GZ2: the field is focused, labelled, 16 px and has Close, and no Clear until there is text (${label}, ${focused}, ${fontPx})`);
    await shot(pg, 'place-search-1-open');
    await type('zuric');
    check(await present(clear) && /Zürich/.test((await safe(() => results.allInnerTexts(), [])).join('\n')),
      'GZ3: "zuric" finds Zürich by its plain spelling, and Clear is there once there is text');
    // place-search ui 1-2 (the UI review): Clear and Close are told apart (Close is a word) and Clear is a 44 px target; the field draws no stray outline.
    const cBox = await safe(() => clear.boundingBox(), null);
    const closeText = ((await safe(() => close.innerText(), '')) || '').trim();
    check(!!cBox && cBox.width >= 44 && cBox.height >= 44 && /^close$/i.test(closeText), `place-search ui 1: Clear is a 44 px target and Close is a word (${cBox && Math.round(cBox.width)}x${cBox && Math.round(cBox.height)}, "${closeText}")`);
    check(await safe(() => field.evaluate((e) => { const st = getComputedStyle(e); return st.outlineStyle === 'none' || parseFloat(st.outlineWidth) === 0; }), false), 'place-search ui 2: the field draws no outline box of its own');
    await type('s');
    check((await safe(() => results.count(), 0)) === 0, 'GZ3: one letter lists nothing');
    await type('spr');
    const rowText = await safe(() => results.first().innerText(), '');
    check((await safe(() => results.count(), 0)) > 1 && !/\d|\bkm\b|\baway\b/i.test(rowText) && /,/.test(rowText) && /keep typing to narrow it\./i.test(await body()),
      `GZ4/GZ5: a capped list ends with "Keep typing to narrow it.", each row is a name with its region and country and no digit (${JSON.stringify(rowText)})`);
    check(await safe(() => results.first().evaluate((e) => parseFloat(getComputedStyle(e).borderBottomWidth) > 0), false), 'place-search ui 3: result rows are separated by a hairline');
    await shot(pg, 'place-search-4-list');
    await type('qqzzqq');
    await shot(pg, 'place-search-5-none');
    check(/no towns or cities start like that\./i.test(await body()) && /smaller places are reached by move map\./i.test(await body()),
      'GZ8: no match says so, with the way on');

    // GZ9: nothing was asked of the network by typing, and the text is in no request.
    check(asked.slice(reqsBefore).every((u) => !/zuric|spr|qqzz/i.test(u)) && [...hosts].sort().join() === hostsBefore,
      'GZ9: typing asks no new host and the text is in no request');

    // GZ16: Close, reopen: the field is empty and nothing was stored.
    const keysBefore = await safe(() => pg.evaluate(() => JSON.stringify(Object.keys(localStorage).sort())), '');
    await type('carl');
    await safe(() => close.click());
    await pg.waitForTimeout(400);
    const refocus = await safe(() => pg.evaluate(() => document.activeElement?.getAttribute('data-testid')), null);
    await open();
    const keysAfter = await safe(() => pg.evaluate(() => JSON.stringify(Object.keys(localStorage).sort())), '');
    check(((await safe(() => field.inputValue(), 'x')) === '') && keysBefore === keysAfter && refocus === 'atlas-search',
      'GZ16/GZ11: after Close the field is empty on reopening, nothing is stored, and focus returned to the magnifier');
    await safe(() => pg.keyboard.press('Escape'));
    await pg.waitForTimeout(300);
    check(!(await present(sheet)), 'GZ2: Escape closes the search');

    // GZ11: arrows step the results, Enter picks.
    await open();
    await type('cranston');
    await safe(() => pg.keyboard.press('ArrowDown'));
    await safe(() => pg.keyboard.press('Enter'));
    await pg.waitForTimeout(3500);

    // GZ6: a pick looks at that place; the words name it, none says the middle of the map; Locate returns.
    const t = await title();
    const text = await body();
    check(!(await present(sheet)) && /^around cranston/i.test(t) && !/middle of the map|not around you|you.?re here/i.test(text),
      `GZ6: a pick looks at the place: the page is "Around Cranston", never "the middle of the map" (${JSON.stringify(t)})`);
    check(/around cranston/i.test(await safe(() => pg.locator('[data-testid=atlas-snap-said]').textContent(), '')),
      'GZ6: the look is announced with the place\'s name');
    await shot(pg, 'place-search-2-looked');
    // GZ7: the map data there is not the fixture's: the look says so in its words, Locate and Move map stay.
    check((await present(pg.locator('[data-testid=locate]'))) && (await present(pg.locator('[data-testid=atlas-move-map]'))),
      'GZ7: a look with no readable map data keeps Locate and Move map on screen');
    // GZ17: the magnifier is on a look's page too.
    check(await present(magnifier), 'GZ17: the magnifier is on a look\'s page');
    await safe(() => pg.locator('[data-testid=locate]').click());
    await pg.waitForTimeout(3500);
    check(/near you/i.test(await title()), 'GZ6: Locate ends the look');
    check(await present(magnifier), 'GZ17: the magnifier is on the page near you');

    // GZ17: Move map on, a pick leaves it on.
    await safe(() => pg.locator('[data-testid=atlas-move-map]').click());
    await open();
    await type('cranston');
    await safe(() => results.first().click());
    await pg.waitForTimeout(2500);
    check((await safe(() => pg.locator('[data-testid=atlas-move-map]').getAttribute('aria-pressed'), null)) === 'true',
      'GZ17: with Move map on, a pick leaves it on');
    await safe(() => pg.locator('[data-testid=atlas-move-map]').click());
    await safe(() => pg.locator('[data-testid=locate]').click());
    await pg.waitForTimeout(2500);

    // GZ14: the credit names the dataset where the map credits are.
    const credit = await safe(() => pg.locator('.maplibregl-ctrl-attrib').first().textContent(), '');
    check(/geonames/i.test(credit) && /CC BY 4\.0/i.test(credit), `GZ14: the map's credit names the place-name dataset (${JSON.stringify(credit)})`);

    // GZ10: offline, the field matches and picks.
    await c.setOffline(true);
    await open();
    await type('zuric');
    const offline = await safe(() => results.count(), 0);
    const picked = ((await safe(() => results.first().innerText(), '')) || '').split('\n')[0];
    await safe(() => results.first().click());
    await pg.waitForTimeout(1500);
    check(offline >= 1 && !!picked && (await title()).includes(picked), `GZ10: offline, the field matches and a pick looks there (${offline}, ${picked}, ${await title()})`);
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
      check(!!row && !!sh && !!cl && row.x >= sh.x - 1 && row.x + row.width <= sh.x + sh.width + 1 && rowRows,
        `GZ18: the longest name (${longName.length} chars) fits its row at ${width} px`);
      const rowTile = await safe(() => pg.locator('[data-testid=atlas-carousel]').boundingBox(), null);
      check(!!sh && (!rowTile || sh.y + sh.height <= rowTile.y + 1) && sh.x >= 0 && sh.x + sh.width <= width + 1,
        `GZ19: the search sheet clears the row and the tabs and stays on screen at ${width} px`);
      if (width === 320) await shot(pg, 'place-search-3-long-320');
      await safe(() => pg.keyboard.press('Escape'));
      await pg.waitForTimeout(300);
    }
  } finally {
    snapWorld.serve = false;
    await c.close();
  }
  await webFetch(h);
}

// gazetteer-web-fetch audit 1-2: on the web the pack is fetched on first search (a web exception, docs/ARCHITECTURE.md), so a
// stalled request and a page gone offline before its first search each end in "Search is unavailable." with Try again.
async function webFetch(h) {
  const { exploreUrl, check, freshPage } = h;
  // The failures these two cause on purpose (a request cut, the network off) are logged by the browser; only theirs are dropped.
  const dropNetErrors = (from) => { for (let i = h.errors.length - 1; i >= from; i--) if (/^placesearch-(stall|offline): Failed to load resource: net::ERR_(FAILED|INTERNET_DISCONNECTED)$/.test(h.errors[i])) h.errors.splice(i, 1); };
  const errorsFrom = h.errors.length;
  const packTs = fs.readFileSync(path.join(h.scriptsDir, '..', 'src', 'lib', 'gazetteer', 'pack.ts'), 'utf8');
  const timeoutMs = Number((/PACK_FETCH_MS = ([\d_]+)/.exec(packTs)?.[1] ?? '0').replace(/_/g, ''));
  const PACK = /\/gazetteer\/places\.json(\?|$)/;
  const search = (pg) => pg.locator('[data-testid=atlas-search]');
  const retry = (pg) => pg.locator('[data-testid=atlas-search-retry]');
  const ready = (pg) => pg.waitForSelector('[data-testid=atlas-search]', { timeout: 60000 }).catch(() => {});
  const said = (pg, text) => pg.evaluate((t) => document.body.innerText.includes(t), text).catch(() => false);
  const unavailable = async (pg) => (await said(pg, 'Search is unavailable.')) && (await retry(pg).count().catch(() => 0)) > 0;
  const zurich = async (pg) => {
    await pg.locator('[data-testid=atlas-search-field]').fill('').catch(() => {});
    await pg.locator('[data-testid=atlas-search-field]').pressSequentially('zuric', { delay: 15, timeout: 10000 }).catch(() => {});
    return pg.waitForFunction(() => [...document.querySelectorAll('[data-testid=atlas-search-result]')].some((e) => /Zürich/.test(e.innerText)), null, { timeout: 20000 }).then(() => true, () => false);
  };
  {
    // audit 1: the request never answers: "Getting ready…", then after the timeout "Search is unavailable."; Try again reads it.
    const { c, pg } = await freshPage('placesearch-stall');
    let release = () => {};
    const held = new Promise((r) => { release = r; });
    let asked = 0;
    try {
      await pg.clock.install();
      await c.route(PACK, async (r) => {
        asked++;
        if (asked > 1) return r.continue();
        await held;
        await r.abort().catch(() => {});
      });
      await pg.goto(exploreUrl);
      await ready(pg);
      await search(pg).click({ timeout: 10000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const waiting = await said(pg, 'Getting ready…');
      await pg.clock.fastForward(timeoutMs + 1000);
      await pg.waitForFunction(() => document.body.innerText.includes('Search is unavailable.'), null, { timeout: 10000 }).catch(() => {});
      const shown = await unavailable(pg);
      release();
      await retry(pg).click({ timeout: 5000 }).catch(() => {});
      const found = await zurich(pg);
      check(timeoutMs > 0 && waiting && shown && found && asked === 2,
        `gazetteer-web-fetch audit 1: a pack request that never answers ends in "Search is unavailable." with Try again, which then finds Zürich (${timeoutMs} ms; ${waiting}, ${shown}, ${found}, ${asked} asked)`);
    } finally {
      release();
      await c.close();
    }
  }
  {
    // audit 2: the page loaded online, offline before its first search: unavailable; online again, Try again finds Zürich.
    const { c, pg } = await freshPage('placesearch-offline');
    try {
      await pg.goto(exploreUrl);
      await ready(pg);
      await pg.waitForTimeout(1500);
      await c.setOffline(true);
      await search(pg).click({ timeout: 10000 }).catch(() => {});
      await pg.waitForFunction(() => document.body.innerText.includes('Search is unavailable.'), null, { timeout: 15000 }).catch(() => {});
      const shown = await unavailable(pg);
      await c.setOffline(false);
      await retry(pg).click({ timeout: 5000 }).catch(() => {});
      const found = await zurich(pg);
      check(shown && found, `gazetteer-web-fetch audit 2: offline before the first search says "Search is unavailable."; online again, Try again finds Zürich (${shown}, ${found})`);
    } finally {
      await c.setOffline(false).catch(() => {});
      await c.close();
    }
  }
  dropNetErrors(errorsFrom);
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
