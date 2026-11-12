// Complexes (CX4, CX5, CX9, CX10, CX16): the Wickenden Street Arcade and Public Market Hall at Transit Street (a long name on purpose: the UI review's longest case), a named building holding nine restaurants in the fake Overture's
// `buildings` and `places` tiles, is a complex of Fox Point: its card lists it by name and kind as a word, with no number and
// no line about what it holds; the map names it only at close zoom; Overture is asked for its tiles by byte range alone; and
// switching Shopping off in the settings takes it off the card. E2E_ONLY=complexes runs it alone.

async function run(h) {
  const { exploreUrl, navUrl, at, check, shot, freshPage, areaTile, complexWorld, drawerTo, overtureAsked, OVERTURE_RELEASE } = h;
  complexWorld.serve = true;
  const { c, pg } = await freshPage('complexes');
  const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key, value });
      tx.oncomplete = () => resolve(true);
    };
  }), [k, v]);
  // Fox Point's card, opened: a tap selects an area's card, a tap on the selected one opens it (EC11).
  const openFoxPoint = async () => {
    await pg.goto(exploreUrl);
    const tile = await areaTile(pg, 'Fox Point');
    await pg.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"][data-read="1"]', { timeout: 60000 }).catch(() => {});
    await tile.click().catch(() => {});
    if (!(await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 3000 }).then(() => true, () => false))) await tile.click().catch(() => {});
    await pg.waitForSelector('[data-testid=atlas-card]', { timeout: 15000 }).catch(() => {});
  };
  try {
    const here = at(0, 0);
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    await openFoxPoint();
    const found = await pg.waitForSelector('[data-testid=atlas-complexes]', { timeout: 60000 }).then(() => true, () => false);
    const text = found ? await pg.locator('[data-testid=atlas-complexes]').innerText() : '';
    await pg.locator('[data-testid=atlas-complexes]').scrollIntoViewIfNeeded().catch(() => {});
    await pg.waitForTimeout(500);
    await shot(pg, 'complexes-card');
    check(found && (await pg.locator('[data-testid=atlas-complex]').count()) === 1 && /The Wickenden Street Arcade and Public Market Hall at Transit Street/.test(text) && /Shopping/.test(text),
      `CX4: the area card lists the complex by name and its kind as a word (${JSON.stringify(text)})`);
    check(found && !/\d/.test(text) && !/\b(restaurants?|shops|food|places)\b/i.test(text) && (await pg.locator('[data-testid=atlas-complexes-more]').count()) === 0,
      `CX4, CX5: no digit and no line about what it holds; with one complex there is no "See more" (${JSON.stringify(text)})`);
    check((await pg.locator('[data-testid=atlas-complexes-hint]').innerText().catch(() => '')).includes('settings'), 'complexes audit 26: the card says where the kinds are switched, in a quiet line under the section');
    check((await pg.locator('[data-testid=complex-label]').count()) === 0, 'CX9: the map names no complex until it is zoomed close');
    check(overtureAsked.filter((q) => /buildings\.pmtiles$/.test(new URL(q.url).pathname)).length > 0
      && overtureAsked.every((q) => {
        const u = new URL(q.url);
        return u.searchParams.get('list-type') === '2' || ([`/tiles/${OVERTURE_RELEASE}/buildings.pmtiles`, `/tiles/${OVERTURE_RELEASE}/places.pmtiles`, `/tiles/${OVERTURE_RELEASE}/divisions.pmtiles`, `/tiles/${OVERTURE_RELEASE}/transportation.pmtiles`].includes(u.pathname) && /^bytes=\d+-\d+$/.test(q.range ?? ''));
      }),
      'CX16: its buildings come from the host the app already uses, by byte range alone');

    // CX10: Shopping off in the settings; the card keeps no complexes, and the app was asked for nothing new to show it.
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await setMeta('start_mode', 'explore');
    await pg.reload();
    await pg.waitForSelector('[data-testid=start]');
    await drawerTo(pg, 'half');
    const row = pg.locator('[data-testid=complex-kind-shopping]');
    await row.scrollIntoViewIfNeeded().catch(() => {});
    check((await pg.locator('[data-testid^=complex-kind-]').count()) === 5 && (await row.count()) === 1, 'CX10: five switches for the kinds of complex, beside What I’m into');
    await row.click();
    await pg.waitForTimeout(500);
    await shot(pg, 'complexes-settings');
    await pg.locator('[data-testid=complex-kind-civic]').scrollIntoViewIfNeeded().catch(() => {});
    await pg.waitForTimeout(300);
    await shot(pg, 'complexes-settings-all');
    await openFoxPoint();
    await pg.waitForTimeout(8000);
    check((await pg.locator('[data-testid=atlas-complexes]').count()) === 0 && (await pg.locator('[data-testid=atlas-card]').count()) === 1,
      'CX10: with Shopping off the card shows no section and no notice');
  } finally {
    complexWorld.serve = false;
    await c.close();
  }
}

module.exports = {
  name: 'complexes',
  covers: [
    'src/lib/complexes/**',
    'src/components/ComplexLabel.tsx',
    'src/components/ExploreSettings.tsx',
    'src/components/atlas/AtlasCard.tsx',
  ],
  run,
};
