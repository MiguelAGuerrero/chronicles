// Marks on a walk through an area read before (the owner, Nov 2): the Explore tab showed "?"
// marks that an exploring walk passing them never drew. E2E_ONLY=marks runs it alone.

async function run(h) {
  const { navUrl, BASE, start, at, check, freshPage } = h;
    const { c, pg } = await freshPage('marks');
    await c.addInitScript(() => { window.__perf = {}; });
    const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key, value });
        tx.oncomplete = () => resolve(true);
      };
    }), [k, v]);
    const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const walkPast = async (label) => {
      const seen = [];
      for (let k = 0; k <= 23; k++) {
        const p = at(-0.5 + k * 0.05, -0.5);
        await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
        await pg.waitForTimeout(1000);
        if (k % 4 === 3 || k === 23) seen.push(`${k * 5}m:${JSON.stringify(await marksNow())}`);
      }
      console.log(`# ${label}: ${seen.join(' | ')}`);
      return marksNow();
    };
    const holdStop = async () => {
      const b = await pg.locator('[data-testid=stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      await pg.waitForURL(/replay/, { timeout: 30000 });
      await pg.waitForSelector('[data-testid=skip]', { timeout: 30000 });
      await pg.click('[data-testid=skip]');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await pg.waitForTimeout(800);
    };
    const startWalk = async () => {
      await pg.waitForSelector('[data-testid=start]');
      await pg.click('[data-testid=start]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
      const s0 = at(-0.5, -0.5);
      await c.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
      await pg.waitForTimeout(2500);
    };
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    // First walk, explore from the start: it reads and builds Fox Point's checklist as it goes.
    await setMeta('start_mode', 'explore');
    await pg.reload();
    await startWalk();
    const first = await walkPast('first walk (area unread)');
    check(first.some((l) => /Hessian Memorial/.test(l)), `marks: a first exploring walk draws the memorial it passes (${JSON.stringify(first)})`);
    // E15: on the web, with the page open, exploring runs the same code as on a phone: the walk read its
    // area with the app's own tile decoder, kept the checklist, and named what it passed.
    {
      const kept = await pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const tx = req.result.transaction(['explore_read', 'checklist_item'], 'readonly');
          const reads = tx.objectStore('explore_read').getAll();
          const items = tx.objectStore('checklist_item').getAll();
          tx.oncomplete = () => resolve({ reads: reads.result.length, items: items.result.length, visible: document.visibilityState });
        };
      }));
      check(kept.visible === 'visible' && kept.reads >= 1 && kept.items >= 1 && first.some((l) => /Hessian Memorial/.test(l)),
        `E15: on the web, with the page open, an exploring walk reads its area, keeps its checklist and names what it passes (${JSON.stringify(kept)})`);
    }
    await holdStop();
    await pg.goto(navUrl);
    // Second walk through the same area, read before: the tab's "?" must show on the walk too.
    await startWalk();
    const second = await walkPast('second walk (area read before)');
    check(second.some((l) => /Hessian Memorial/.test(l)), `marks: a later exploring walk through an area read before draws the memorial it passes (${JSON.stringify(second)})`);
    await c.close();
}

module.exports = {
  name: 'marks',
  covers: [
    'src/lib/explore/**',
    'src/lib/discovery/**',
    'src/lib/atlas/**',
    'src/components/MarkPinView.tsx',
    'src/components/atlas/**',
    'src/app/walk.tsx',
  ],
  run,
};
