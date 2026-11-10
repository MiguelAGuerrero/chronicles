// Atlas grading (AG3): a ring the map knows almost nothing about says nothing about its kinds,
// on its tile and on its card. E2E_ONLY=grading runs it alone.

async function run(h) {
  const { url, exploreUrl, at, check, freshPage, areaTile, hollowWorld } = h;
  hollowWorld.serve = true;
    const { c, pg } = await freshPage('grading');
    try {
    const hollow = at(-60, 0);
    await c.setGeolocation({ longitude: hollow[0], latitude: hollow[1], accuracy: 6 });
    await pg.goto(exploreUrl);
    // Near you the row is the towns: Quiet Hollow is on Hollow's page (fix explore-town-scope).
    const tile = await areaTile(pg, 'Quiet Hollow');
    await pg.waitForSelector('[data-testid=atlas-tile][data-name="Quiet Hollow"][data-read="1"]', { timeout: 60000 }).catch(() => {});
    const label = (await tile.getAttribute('aria-label').catch(() => null)) ?? '';
    check((await tile.getAttribute('data-read').catch(() => null)) === '1' && (await tile.locator('[data-kind]').count()) === 0
      && (await tile.locator('[data-testid=atlas-character]').count()) === 0 && !/Quiet|Not much|none/i.test(label.replace(/^Quiet Hollow\./, '')),
      `AG3: a thin ring's tile shows no kinds and no character line, and its label says nothing of them (${label})`);
    // A tap selects a card that is not selected; a tap on the selected one opens it (EC11).
    await tile.click().catch(() => {});
    if (!(await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 3000 }).then(() => true, () => false))) await tile.click().catch(() => {});
    await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 }).catch(() => {});
    const card = pg.locator('[data-testid=atlas-card]');
    check((await card.count()) === 1 && (await card.locator('[data-testid^=atlas-kind-]').count()) === 0
      && (await card.locator('[data-testid=atlas-how]').count()) === 0 && !/\bnone\b/.test(await card.innerText().catch(() => '')),
      'AG3: a thin ring\'s card shows no kind rows, no "none", no "How the marks work"');
    } finally {
      // Never left on for the journeys after this one (fix explore-town-scope audit 7).
      hollowWorld.serve = false;
      await c.close();
    }
}

module.exports = {
  name: 'grading',
  covers: [
    'src/lib/atlas/atlas.ts',
    'src/components/atlas/{AtlasCard,AtlasTile}.tsx',
  ],
  run,
};
