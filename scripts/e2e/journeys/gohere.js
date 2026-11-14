// Explore: Go here on every tile (specs/explore-go-here, GH1-GH15): a "Go here" on each tile opens a sheet of two choices,
// Chronicles (Navigate, ready) and the phone's maps app. E2E_ONLY=gohere runs it.

async function run(h) {
  const { exploreUrl, check, shot, freshPage, snapWorld, openWalk, metaOf, hosts } = h;
  snapWorld.serve = true;
  try {
    const { c, pg } = await freshPage('gohere');
    // A browser opens a maps link with window.open; record it, and fail it on demand (GH7).
    await c.addInitScript(() => {
      window.__opened = [];
      const real = window.open;
      window.open = (u, ...rest) => {
        window.__opened.push(String(u));
        if (window.__openFail) throw new Error('no app');
        return real ? null : null;
      };
    });
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.goto(exploreUrl);
    await pg.waitForFunction(() => document.querySelectorAll('[data-testid=atlas-tile]').length >= 2, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const goes = () => pg.locator('[data-testid=atlas-go-here]');
    const tiles = () => pg.locator('[data-testid=atlas-tile]');
    const heights = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => Math.round(e.getBoundingClientRect().height)));
    const nTiles = await tiles().count();
    // A finger taps where it is; a locator's click scrolls the button into view first, and the row then selects that tile.
    const tap = async (loc) => {
      const b = await loc.boundingBox();
      if (!b) return;
      const vw = pg.viewportSize().width;
      await pg.mouse.click(Math.min(b.x + b.width / 2, vw - 12), b.y + b.height / 2);
    };

    // GH1, GH8, GH12: each tile says Go here, with an arrow, as high as a finger; every tile one height.
    const first = goes().first();
    const label = await first.getAttribute('aria-label').catch(() => '');
    const box = await first.boundingBox().catch(() => null);
    check(nTiles >= 2 && (await goes().count()) === nTiles - 1 && (await tiles().first().locator('[data-testid=atlas-go-here]').count()) === 0 && /^Go here/.test(label ?? '') && /Go here/.test(await first.innerText().catch(() => '')) && !!box && box.height >= 44,
      `GH1, GH8: every tile but the one you are in says "Go here" with its place's name for a screen reader, 44 px high (${nTiles} tiles, ${await goes().count()} buttons, "${label}")`);
    const hs = await heights();
    check(hs.length > 0 && new Set(hs).size === 1, `GH12: every tile is one height (${hs.join(', ')})`);
    await shot(pg, 'gohere-1-row');

    // GH11: ink, no fill or border at rest, type no bigger than the meta line.
    const look = await first.evaluate((e) => { const s = getComputedStyle(e); const t = e.querySelector('[data-testid=atlas-go-here-text]') ?? e; return { bg: s.backgroundColor, border: s.borderTopWidth, color: getComputedStyle(t).color, size: parseFloat(getComputedStyle(t).fontSize) }; }).catch(() => null);
    check(!!look && /rgba\(0, 0, 0, 0\)|transparent/.test(look.bg) && look.border === '0px' && look.color === 'rgb(29, 36, 48)' && look.size <= 12,
      `GH11: Go here is ink, with no fill or border, no bigger than the meta line (${JSON.stringify(look)})`);

    // GH3: a tap on Go here neither selects another tile nor opens the card.
    const selBefore = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.selected));
    const lastGo = goes().last();
    await tap(lastGo);
    await pg.waitForTimeout(600);
    const selAfter = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.dataset.selected));
    check(JSON.stringify(selBefore) === JSON.stringify(selAfter) && (await pg.locator('[data-testid=atlas-card]').count()) === 0,
      `GH3: Go here neither selects its tile nor opens the card (${selBefore} -> ${selAfter}, ${await pg.locator('[data-testid=atlas-card]').count()} cards)`);

    // GH2, GH10: a sheet of exactly two choices, Chronicles first; nothing counted or timed.
    const rows = await pg.evaluate(() => ['go-here-app-label', 'go-here-maps-label', 'go-here-close'].map((id) => document.querySelector(`[data-testid=${id}]`)?.textContent ?? null));
    const sheet = await pg.locator('[data-testid=go-here-sheet]').innerText().catch(() => '');
    check(rows[0] === 'Chronicles' && !!rows[1] && /Maps/.test(rows[1]) && (await pg.locator('[data-testid=go-here-app], [data-testid=go-here-maps]').count()) === 2 && /Opens Navigate, ready/.test(sheet),
      `GH2: the sheet has two choices, Chronicles first, then the maps app (${JSON.stringify(rows)})`);
    check(!/minute|\bmin\b|fastest|\d+\s*(of|routes)/i.test(sheet.replace(/\d+(\.\d+)?\s*(km|m)\b/g, '')), `GH10: no minutes, "fastest" or counts in the sheet ("${sheet.replace(/\n/g, ' | ')}")`);
    // explore-go-here ui 1: the maps row says it leaves the app (an external glyph), the Chronicles row doesn't.
    check((await pg.locator('[data-testid=go-here-maps-external]').count()) === 1 && (await pg.locator('[data-testid=go-here-app-external]').count()) === 0,
      'explore-go-here ui 1: the maps row wears an external hand-off glyph and the Chronicles row does not');
    // explore-go-here ui 2: eight pixels between the two rows.
    const rb = await pg.evaluate(() => ['go-here-app', 'go-here-maps'].map((id) => document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect()).map((r) => r && { top: r.top, bottom: r.bottom }));
    check(!!rb[0] && !!rb[1] && rb[1].top - rb[0].bottom >= 8, `explore-go-here ui 2: the rows are 8 px apart (${rb[0] && rb[1] ? Math.round(rb[1].top - rb[0].bottom) : 'n/a'})`);
    await shot(pg, 'gohere-2-sheet');

    // GH2 close: Escape closes it; nothing saved, nothing opened, no walk.
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(500);
    check((await pg.locator('[data-testid=go-here-sheet]').count()) === 0 && !(await metaOf(pg, 'nav')) && !(await openWalk(pg)) && !(await pg.evaluate(() => window.__opened.length)),
      'GH2: Escape closes the sheet; nothing saved, no walk, nothing opened');

    // GH4, GH13: the maps app gets the destination alone, from the tap.
    const hostsBefore = hosts ? [...hosts] : [];
    await tap(goes().first());
    await pg.waitForSelector('[data-testid=go-here-maps]', { timeout: 5000 }).catch(() => {});
    await pg.click('[data-testid=go-here-maps]').catch(() => {});
    await pg.waitForTimeout(500);
    const opened = await pg.evaluate(() => window.__opened);
    check(opened.length === 1 && /(daddr|destination)=-?[\d.]+,-?[\d.]+/.test(opened[0]) && !/[?&](?!daddr|dirflg|api|destination|travelmode)\w+=/.test(opened[0].replace(/^[^?]*\?/, '?')) && !(await openWalk(pg)),
      `GH4: the maps app gets the destination alone, from the tap (${opened[0]})`);
    check(!hosts || [...hosts].length === hostsBefore.length, 'GH13: no host was asked for beyond the maps link');
    // GH7: a maps app that won't open says so once.
    await pg.evaluate(() => { window.__openFail = true; });
    await tap(goes().first());
    await pg.click('[data-testid=go-here-maps]').catch(() => {});
    await pg.waitForTimeout(600);
    const said = await pg.locator('text=Couldn’t open a maps app.').count();
    check(said === 1 && (await pg.locator('[data-testid=go-here-sheet]').count()) === 0, `GH7: a maps app that won't open says so once, and the sheet closes (${said})`);

    // GH5, GH6, GH13, GH15: Chronicles saves the destination and opens Navigate, ready; no walk; works far away.
    await pg.goto(exploreUrl);
    await pg.waitForSelector('[data-testid=atlas-go-here]', { timeout: 60000 }).catch(() => {});
    const famBefore = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.innerText));
    await tap(goes().last());
    await pg.click('[data-testid=go-here-app]').catch(() => {});
    await pg.waitForSelector('[data-testid=ready-dest]', { timeout: 15000 }).catch(() => {});
    const dest = await pg.locator('[data-testid=ready-dest]').innerText().catch(() => '');
    check(/^To .* · .*away/.test(dest) && (await pg.locator('[data-testid=start]').count()) === 1 && !(await openWalk(pg)),
      `GH5, GH6: Chronicles opens Navigate, ready, with the place, and no walk starts (${dest})`);
    await pg.goto(exploreUrl);
    await pg.waitForSelector('[data-testid=atlas-tile]', { timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    const famAfter = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-tile]')].map((e) => e.innerText));
    check(JSON.stringify(famBefore.map((t) => t.replace(/Go here/g, ''))) === JSON.stringify(famAfter.map((t) => t.replace(/Go here/g, ''))),
      'GH15: a Go here tap changes nothing a tile says of familiarity');
    // The destination is already saved: choosing again says it replaces it, once (spec line 6).
    await tap(goes().first());
    await pg.waitForSelector('text=Replaces where you were heading', { timeout: 5000 }).catch(() => {});
    const replaces = await pg.locator('text=Replaces where you were heading').count();
    check(replaces === 1, `GH5: a saved destination is said to be replaced, once (${replaces})`);
    await pg.keyboard.press('Escape');

    // GH9: the card's Walk to is unchanged (the drive journey keeps DW1-DW14); a tap on the tile still selects and opens.
    await tiles().last().click().catch(() => {});
    await pg.waitForTimeout(700);
    await shot(pg, 'gohere-4-selected');
    await tiles().last().click().catch(() => {});
    await pg.waitForTimeout(1200);
    // A town's tile opens its page (AT2); the page's own card then opens the area's card, which keeps Walk to.
    if (!(await pg.locator('[data-testid=atlas-card]').count())) {
      await pg.click('[data-testid=atlas-town-head]', { timeout: 30000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 }).catch(() => {});
    }
    check((await pg.locator('[data-testid=atlas-card]').count()) === 1 && (await pg.locator('[data-testid=atlas-walk], [data-testid=atlas-walk-later]').count()) >= 1,
      'GH9: the tile still selects and opens its card, whose Walk to is as it was');

    // GH12: at 320 px nothing wraps, and the capture stack still answers with the sheet open.
    await pg.keyboard.press('Escape');
    await pg.setViewportSize({ width: 320, height: 640 });
    await pg.waitForTimeout(800);
    const wraps = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=atlas-go-here]')].some((e) => e.getBoundingClientRect().height > 60 || e.scrollWidth > e.clientWidth + 1));
    const hs320 = await heights();
    check(!wraps && new Set(hs320).size === 1, `GH12: at 320 px nothing wraps and every tile is one height (${hs320.join(', ')})`);
    await tap(goes().first());
    // Explore has no capture stack (it lives on the walk screen); what the sheet must leave answering is the tab bar.
    const tabBox = await pg.locator('a[href$="navigate"]').first().boundingBox().catch(() => null);
    const sheetBox = await pg.locator('[data-testid=go-here-sheet]').boundingBox().catch(() => null);
    check(!!sheetBox && (!tabBox || sheetBox.y + sheetBox.height <= tabBox.y + 1), `GH12: the sheet at 320 px sits above the tab bar and covers none of it (${JSON.stringify({ sheetBox, tabBox })})`);
    await shot(pg, 'gohere-3-320');
    await c.close();
  } finally {
    snapWorld.serve = false;
  }
}

module.exports = {
  name: 'gohere',
  // Explore: Go here on every tile (GH1-GH15).
  covers: [
    'src/app/(tabs)/explore.tsx',
    'src/lib/atlas/goHere.ts',
    'src/lib/nav/handoff.ts',
    'src/lib/nav/openInMaps.ts',
    'src/components/atlas/AtlasTile.tsx',
    'src/components/atlas/GoHereSheet.tsx',
  ],
  run,
};
