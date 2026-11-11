// Notifications after a walk: a reminder tapped with Chronicle in front opens its capture at once, and
// from another tab opens it on Chronicle (NV13); then bulk placement behind a cover (H8). Starts on
// Chronicle with the first walk starred.

// Standing alone after the walk journey, the page is on the first walk's card: name it and return to
// Chronicle with its star, as the chronicle journey does. In the full flow the page is already there, so
// this does nothing.
async function arrive(h) {
  const { page } = h;
  if (await page.locator('[data-testid=to-name]').count()) {
    await page.click('[data-testid=to-name]');
    await page.click('[data-testid=save]');
    await h.mapUp(page);
    await page.waitForSelector('[data-testid=home-sheet]');
    await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 15000 });
  }
}

async function checks(h) {
  const { BASE, page, start, at, check, shot, tabTo } = h;
  await arrive(h);
    // A reminder tapped with the home in front, after a walk: the home opens it at once (audit: one
    // listener slot meant the walk screen, gone, had taken the home's).
    {
      const anyId = await page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
          g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).find((c) => c.kind === 'text')?.id ?? null);
        };
      }));
      const homeTap = { type: 'notice-response', id: 'recall-home', data: { captureIds: [anyId] }, action: null };
      await page.evaluate((m) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: m })), homeTap);
      const opened = await page.waitForSelector('[data-testid=viewer-close]', { timeout: 8000 }).then(() => true, () => false);
      check(opened && (await page.locator('[data-testid=viewer-close]').count()) === 1, 'a reminder tapped with Chronicle in front after a walk opens there, once');
      if (opened) await page.click('[data-testid=viewer-close]');
      // With Navigate in front and no walk open, a tap opens the captures on Chronicle (NV13).
      await tabTo(page, 'navigate');
      await page.waitForSelector('[data-testid=start]');
      await page.waitForTimeout(800);
      await page.evaluate((m) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: m })), homeTap);
      const onChronicle = await page.waitForSelector('[data-testid=viewer-close]', { timeout: 8000 }).then(() => true, () => false);
      check(onChronicle && new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=viewer-close]').count()) === 1,
        `a reminder tapped on another tab opens its capture on Chronicle, once (NV13: ${page.url()})`);
      if (onChronicle) await page.click('[data-testid=viewer-close]');
    }

    // Bulk placement (H8): a walk with no places is placed at the next opening, in the background from the
    // tiles (fix background-placing, the owner, Nov 11): no cover, no count, the map in view throughout.
    await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const d = req.result;
        const tx = d.transaction(['walk_area', 'area', 'walk'], 'readwrite');
        tx.objectStore('walk_area').clear();
        tx.objectStore('area').clear();
        const walks = tx.objectStore('walk');
        const all = walks.getAll();
        all.onsuccess = () => { for (const w of all.result) walks.put({ ...w, snapped_build: null }); };
        tx.oncomplete = () => { d.close(); resolve(); };
      };
    }));
    await page.reload();
    await h.mapUp(page);
    // Sampled until the star comes: a single walk can be placed between two looks. The map's grey cover
    // (`map-cover`, drawn when a map is `covered`) is what the owner saw; the old line and Skip went with it.
    await shot(page, '11-home-placing');
    let covered = false;
    for (let i = 0; i < 600 && !(await page.locator('[aria-label^="Fox Point,"]').count()); i++) {
      covered ||= (await page.locator('[data-testid=map-cover], [data-testid=skip-placing]').count()) > 0;
      covered ||= (await page.locator('text=/Placing your walks/').count()) > 0;
      await page.waitForTimeout(100);
    }
    check((await page.locator('[aria-label^="Fox Point,"]').count()) > 0, 'the walk is placed again and its star shows');
    check(!covered, 'placing old walks never covers the map or counts the walks (fix background-placing audit 7)');
}

// Alone: the walk journey first (the first walk, with its captures), then this.
async function run(h) {
  await require('./walk').run(h);
  await checks(h);
}

module.exports = {
  name: 'notifications',
  covers: [
    'src/lib/notify/**',
    'src/components/pwa*.ts',
    'src/lib/openers.ts',
    'public/sw.js',
  ],
  run,
  checks,
};
