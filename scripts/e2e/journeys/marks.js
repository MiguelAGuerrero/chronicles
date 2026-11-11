// Marks on a walk through an area read before (the owner, Nov 2): the Explore tab showed "?"
// marks that an exploring walk passing them never drew. E2E_ONLY=marks runs it alone.

async function run(h) {
  const { navUrl, BASE, start, at, check, freshPage, shot } = h;
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
    // RP18, RP8 (Remarkable and public): "What I'm into" lists Buildings and structures after Monuments and memorials, on by default.
    {
      await pg.click('[data-testid=walk-summary]');
      await pg.waitForSelector('[data-testid=options-card]', { timeout: 10000 }).catch(() => {});
      await pg.locator('[data-testid=kind-structures]').scrollIntoViewIfNeeded().catch(() => {});
      const mon = await pg.locator('[data-testid=kind-monuments]').boundingBox().catch(() => null);
      const box = await pg.locator('[data-testid=kind-structures]').boundingBox().catch(() => null);
      const on = await pg.locator('[data-testid=kind-structures]').getAttribute('aria-checked').catch(() => null);
      const label = await pg.locator('[data-testid=kind-structures]').innerText().catch(() => '');
      check(!!mon && !!box && box.y > mon.y && on === 'true' && /Buildings and structures/.test(label),
        `RP18: "What I'm into" lists Buildings and structures after Monuments and memorials, on by default (${JSON.stringify({ mon: mon?.y, at: box?.y, on, label })})`);
      // PK11 (Presence and kinds): Community spaces sits after Theatres and before Monuments and memorials, on by default.
      await pg.locator('[data-testid=kind-community]').scrollIntoViewIfNeeded().catch(() => {});
      const th = await pg.locator('[data-testid=kind-theatres]').boundingBox().catch(() => null);
      const cm = await pg.locator('[data-testid=kind-community]').boundingBox().catch(() => null);
      const mo = await pg.locator('[data-testid=kind-monuments]').boundingBox().catch(() => null);
      const cOn = await pg.locator('[data-testid=kind-community]').getAttribute('aria-checked').catch(() => null);
      const cLabel = await pg.locator('[data-testid=kind-community]').innerText().catch(() => '');
      await shot(pg, 'marks-what-im-into');
      check(!!th && !!cm && !!mo && cm.y > th.y && mo.y > cm.y && cOn === 'true' && /Community spaces/.test(cLabel),
        `PK11: "What I'm into" lists Community spaces after Theatres and before Monuments and memorials, on by default (${JSON.stringify({ th: th?.y, at: cm?.y, mo: mo?.y, on: cOn, label: cLabel })})`);
      // PC6 (Community parks): the kind sits right after Parks and gardens, on by default, with its own label.
      await pg.locator('[data-testid=kind-community_parks]').scrollIntoViewIfNeeded().catch(() => {});
      const pk = await pg.locator('[data-testid=kind-parks]').boundingBox().catch(() => null);
      const cp = await pg.locator('[data-testid=kind-community_parks]').boundingBox().catch(() => null);
      const vw = await pg.locator('[data-testid=kind-viewpoints]').boundingBox().catch(() => null);
      const cpOn = await pg.locator('[data-testid=kind-community_parks]').getAttribute('aria-checked').catch(() => null);
      const cpLabel = await pg.locator('[data-testid=kind-community_parks]').innerText().catch(() => '');
      check(!!pk && !!cp && !!vw && cp.y > pk.y && vw.y > cp.y && cpOn === 'true' && /Community parks/.test(cpLabel),
        `PC6: "What I'm into" lists Community parks after Parks and gardens and before Viewpoints, on by default (${JSON.stringify({ pk: pk?.y, at: cp?.y, vw: vw?.y, on: cpOn, label: cpLabel })})`);
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(800);
    }
    // RP20: Fox Point Museum stands 67 m past the grid's east end: still shown and findable, its card says so.
    {
      const legs = [[[0.65, -0.5], [3.5, -0.5]], [[3.5, -0.5], [3.5, 1.5]], [[3.5, 1.5], [4.1, 1.7]]];
      for (const [[x0, y0], [x1, y1]] of legs) {
        const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.06);
        for (let k = 1; k <= steps; k++) {
          const p = at(x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps);
          await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
          await pg.waitForTimeout(1000);
        }
      }
      await pg.waitForTimeout(2000);
      const labels = await marksNow();
      const pin = pg.locator('[data-testid=mark-pin][aria-label*="Fox Point Museum"]');
      if ((await pin.count()) > 0) await pin.first().click();
      await pg.waitForSelector('[data-testid=mark-card]', { timeout: 5000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=mark-reach]', { timeout: 5000 }).catch(() => {});
      const said = await pg.locator('[data-testid=mark-reach]').innerText().catch(() => '');
      const title = await pg.locator('[data-testid=mark-card]').innerText().catch(() => '');
      check(/Fox Point Museum/.test(title) && said === 'No street or path close by',
        `RP20: a place to find with no street or path within 60 m is still shown, and its card says "No street or path close by" (${JSON.stringify({ labels, said, title: title.slice(0, 80) })})`);
      // Near the grid, the memorial's card says nothing of the kind.
      await pg.click('[data-testid=mark-close]').catch(() => {});
    }
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
