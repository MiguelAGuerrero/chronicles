// The launch (NV1-NV6, NV11, NV16, NT1, NT2): the old /explore path, stale replay and day links, the three
// tabs at their paths with one live map, the manifest and the service worker; then, in fresh browsers,
// Walk here from Explore (NV12, NV15), a reload with a walk minimized (NV8), and Start with Explore and a
// destination (NV25). Nothing precedes it: `checks` runs on the shared page as it opens.

const path = require('path');

async function checks(h) {
  const { url, BASE, browser, page, start, at, check, shownCount, tabBarShown, onTab, routed } = h;
    // The old /explore path still opens Explore, with one tab bar (NV2).
    await page.goto(`${url}explore`);
    await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]', { timeout: 30000 }).catch(() => {});
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1,
      `the old /explore path opens Explore at / (NV2: ${page.url()})`);
    // A launch on a replay or a day that is no longer kept goes straight to Explore (NV2: the owner's
    // Home Screen app reopened on "This walk could not be found", Nov 3).
    for (const stale of ['replay/no-such-walk', 'day/1999-01-01']) {
      await page.goto(`${url}${stale}`);
      await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 }).catch(() => {});
      await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]', { timeout: 15000 }).catch(() => {});
      check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1
        && (await page.locator('text=This walk could not be found.').count()) === 0 && (await page.locator('text=Nothing was kept on this day.').count()) === 0,
        `a launch on a stale ${stale.split('/')[0]} link opens Explore (NV2: ${page.url()})`);
    }
    await page.goto(url);
    // Navigation & tabs (NV1-NV6): the app opens on Explore, at / (NV2, the owner's call, Nov 3).
    await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]');
    // Memos and videos play with the ringer switch off, on the web too (bug: silent playback on iPhone).
    check(await page.evaluate(() => navigator.audioSession.type) === 'playback', 'the page asks to play sound even in silent mode');
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1
      && (await page.locator('canvas.maplibregl-canvas').count()) === 1,
      `the app opens on Explore, at its own path, one live map (NV2, NV4, NV5: ${page.url()})`);
    // Explore reads one fix as the app opens and frames it (NV16, the owner's call, Nov 3).
    await page.waitForFunction((s) => [...document.querySelectorAll('[data-center]')].some((e) => {
      if (e.closest('[aria-hidden=true]')) return false;
      const [lon, lat] = (e.getAttribute('data-center') ?? '').split(',').map(Number);
      return Math.abs(lon - s[0]) < 0.004 && Math.abs(lat - s[1]) < 0.004;
    }), start, { timeout: 15000 }).then(() => true, () => false).then((ok) =>
      check(ok, 'Explore frames where you are as the app opens, from one fix of its own (NV16)'));
    const tabs = await page.locator('[data-testid=tab-explore], [data-testid=tab-navigate], [data-testid=tab-chronicle]').evaluateAll((els) => els.map((e) => `${e.dataset.testid}:${e.innerText.replace(/[^A-Za-z]/g, "")}:${e.querySelectorAll('svg, [aria-hidden], div').length > 1}`));
    check(tabs.join(',') === 'tab-explore:Explore:true,tab-navigate:Navigate:true,tab-chronicle:Chronicle:true', `a bottom bar with Explore, Navigate and Chronicle, in that order, each with an icon and a label (NV1: ${tabs.join(', ')})`);
    // Each tab at its own path, with one live map (NV4, NV5); Chronicle is review only (NV11).
    const nv = await onTab('navigate');
    await page.waitForSelector('[data-testid=start]');
    check(nv.path === '/walk' && (await page.locator('[data-testid=ready-bar]').count()) === 1 && !(await tabBarShown(page))
      && (await page.locator('canvas.maplibregl-canvas').count()) === 1 && (await page.locator('[data-testid=start]').count()) === 1,
      `Navigate opens the ready walk screen, no tab bar, one map with Start (NR1, NV4: ${JSON.stringify(nv)})`);
    check((await page.locator('[data-testid=ready-dest]').count()) === 0,
      'Start alone in the bar, with no destination line (NV19, NR5, NR8)');
    check((await page.locator('[data-testid=moment-photo]').count()) === 1 && (await page.locator('[data-testid=moment-note]').isVisible()), 'Navigate has quick capture, outside the bar (NV18, NR9)');
    await page.waitForTimeout(1500);
    const ex = await onTab('explore');
    check(ex.path === '/' && ex.canvases === 1, `Explore at /, one live map (NV4, NV5: ${JSON.stringify(ex)})`);
    const ch = await onTab('chronicle');
    await h.mapUp(page);
    await page.waitForSelector('text=Walk somewhere and it is starred here');
    check(ch.path === '/chronicle' && ch.canvases === 1, `Chronicle at /chronicle, one live map (NV4, NV5: ${JSON.stringify(ch)})`);
    check((await shownCount(page, '[data-testid=start], [data-testid=moment-note], [data-testid=look-here]')) === 0,
      'Chronicle has no Start, Explore button, quick capture or What’s good here (NV11)');
    await page.reload();
    await h.mapUp(page);
    await page.waitForSelector('[data-testid=home-sheet]');
    check(new URL(page.url()).pathname === `${BASE}/chronicle` && (await page.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1, 'a reload keeps the tab (NV5)');
    await page.goBack();
    await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('canvas.maplibregl-canvas').count()) === 1 && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1, 'the browser’s back on Chronicle goes to Explore (NV5)');
    await onTab('navigate');
    await page.goBack();
    await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 5000 }).catch(() => {});
    check(new URL(page.url()).pathname === `${BASE}/`, 'and on Navigate too (NV5)');

    // Notifications on the web (v1 slice 6). Installable: the manifest is linked under the base path and served (NT1).
    const manifestHref = await page.evaluate(() => document.querySelector('link[rel=manifest]')?.getAttribute('href'));
    const manifest = manifestHref ? await page.evaluate(async (h) => (await fetch(h)).json(), manifestHref) : null;
    check(manifestHref === `${BASE}/manifest.webmanifest` && manifest?.display === 'standalone' && manifest.start_url === './' && manifest.icons.some((i) => i.sizes === '512x512')
      && (await page.evaluate(() => !!document.querySelector('link[rel=apple-touch-icon]'))),
      'the web app can be installed: a manifest with icons, and Apple home-screen tags (NT1)');
    // The service worker is registered at the base path and active (NT2).
    const sw = await page.evaluate(async () => {
      const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 10000))]);
      return r ? { scope: r.scope, active: !!r.active } : null;
    });
    check(sw && sw.active && sw.scope.endsWith(`${BASE}/`), `the service worker is active at the base path (${JSON.stringify(sw)})`);
}

// The fresh-browser flows. The full flow runs them after the shared page's story, as before.
async function fresh(h) {
  const { navUrl, start, at, dLat, dLon, check, metaOf, drawerTo, tabTo, shownCount, tabBarShown, freshPage, openWalk, scriptsDir, routed } = h;
    // Starting from the tabs, in fresh browsers (NV12, NV15, NV25).
    {
      // Walk here on Explore is a one-tap start to that spot, with the saved choices; it never fills the drawer (NV12, NV15).
      const { c, pg } = await freshPage('walk-here');
      await pg.goto(navUrl);
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      await tabTo(pg, 'explore');
      await pg.waitForSelector('[data-testid=atlas-grid]');
      await pg.waitForTimeout(1500);
      const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
      await pg.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 40);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.click('[data-testid=walk-here]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      check(await pg.waitForSelector('text=Walk started · recording', { timeout: 10000 }).then(() => true, () => false), 'Walk here on Explore starts a walk at once, recording (NV12, NV15)');
      const w = await openWalk(pg);
      const nav = JSON.parse((await metaOf(pg, 'nav')) || 'null');
      check(w && nav && nav.walk_id === w.id && nav.dest.label === 'Your spot' && (await metaOf(pg, 'explore_walk')) !== w.id,
        'it goes to that spot with the saved choices (Quiet), and the drawer’s destination is not filled (NV12)');
      await c.close();
    }
    {
      // Minimizing a walk (NV7-NV10): the walk goes on under the tabs, with a recording bar above the tab bar.
      const { c, pg } = await freshPage('minimize');
      await c.addInitScript(() => { window.__perf = {}; });
      await pg.goto(navUrl);
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      // An earlier walk's note, flagged every visit, 150 m north of the start: passed while minimized (NV8).
      const memAt = at(-0.5, 1.0);
      await pg.evaluate(({ lon, lat }) => new Promise((resolve, reject) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const tx = req.result.transaction(['capture', 'recall'], 'readwrite');
          tx.objectStore('capture').put({ id: 'old-note', walk_id: 'old-walk', t: Date.now() - 86_400_000, kind: 'text', file_path: null, body: 'The old bench by the steps', segment_id: null, lat, lon });
          tx.objectStore('recall').put({ capture_id: 'old-note', frequency: 'visit', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }), { lon: memAt[0], lat: memAt[1] });
      await pg.click('[data-testid=start]');
      await pg.waitForSelector('[data-testid=stop]');
      const w = await openWalk(pg);
      const north = async (y0, y1, each) => {
        for (let k = 0, y = y0; y <= y1 + 1e-9; k++, y += 0.05) {
          const p = at(-0.5, y);
          await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
          await pg.waitForTimeout(1000);
          if (each) await each(k, y);
        }
      };
      await north(-0.5, -0.3);
      // NV7: Minimize at the walk screen's top-left edge, away from the capture row and Stop.
      const minBox = await pg.locator('[data-testid=walk-minimize]').boundingBox();
      const capBox = await pg.locator('[data-testid=cap-photo]').boundingBox();
      check(minBox && minBox.x < 60 && minBox.y < 120 && minBox.y + minBox.height < capBox.y - 200 && (await pg.locator('[data-testid=walk-minimize]').getAttribute('aria-label')) === 'Minimize the walk',
        `the walk screen has Minimize at its top-left edge (NV7: ${minBox && `${Math.round(minBox.x)},${Math.round(minBox.y)}`})`);
      // Paused, then minimized: the bar says Paused (NV9).
      await pg.click('[data-testid=pause-walk]');
      await pg.waitForSelector('[data-testid=resume-walk]');
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await pg.waitForTimeout(600);
      const barText = () => pg.locator('[data-testid=recording-stats]').innerText();
      const barBox = await pg.locator('[data-testid=recording-bar]').boundingBox();
      const tabBox = await pg.locator('[data-testid=tab-navigate]').boundingBox();
      check(!/\/walk/.test(new URL(pg.url()).pathname) && (await tabBarShown(pg)) && /^Paused · \d+:\d\d · \d+ m$/.test(await barText())
        && Math.abs(barBox.y + barBox.height - tabBox.y) < 6 && (await pg.locator('[data-testid=recording-bar] [data-testid=stop]').count()) === 0,
        `minimized, a recording bar sits just above the tab bar: time, distance, Paused, and no Stop (NV9: "${await barText()}")`);
      check((await pg.locator('canvas.maplibregl-canvas').count()) === 1, 'one live map with the walk minimized (NV4)');
      // The bar's camera, while paused: the photo is kept for the open walk, and the walk screen stays down (NV9).
      const photosOf = () => pg.evaluate((id) => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
          g.onsuccess = () => resolve(g.result.filter((x) => x.walk_id === id && x.kind === 'photo'));
        };
      }), w.id);
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=bar-photo]')]);
      await chooser.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
      const saidPhoto = await pg.waitForSelector('[data-testid=recording-said]', { timeout: 10000 }).then((e) => e.innerText(), () => '');
      const kept = await photosOf();
      check(saidPhoto === 'Photo saved to your walk' && kept.length === 1 && !/\/walk/.test(new URL(pg.url()).pathname),
        `a photo from the bar's camera lands in the open walk, paused too, without opening the walk screen (NV9: "${saidPhoto}", ${kept.length})`);
      // A tap on the bar returns to the walk, where the photo is pinned (NV9).
      await pg.click('[data-testid=recording-return]');
      await pg.waitForSelector('[data-testid=stop]');
      await pg.waitForTimeout(1500);
      check(/\/walk/.test(new URL(pg.url()).pathname) && (await pg.locator('[aria-label="Photo. Open"], [aria-label$="captures here. Open"]').count()) >= 1 && !(await tabBarShown(pg)),
        'a tap on the bar returns to the walk, the tab bar hidden, with the bar’s photo on its map (NV6, NV9)');
      await pg.click('[data-testid=resume-walk]');
      await pg.waitForSelector('[data-testid=pause-walk]');
      await north(-0.25, -0.2);
      await pg.waitForTimeout(2200);
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-stats]', { timeout: 10000 });
      await pg.waitForTimeout(2200);
      const m = (t) => {
        const r = /([\d.]+) (km|m)$/.exec(t);
        return r ? parseFloat(r[1]) * (r[2] === 'km' ? 1000 : 1) : NaN;
      };
      const d0 = m(await barText());
      // Minimized, it keeps recording across the tabs, each with one live map and the bar (NV4, NV8, NV9).
      const onTabs = [];
      let perfA = null;
      await north(-0.15, 1.25, async (k) => {
        if (k === 6 || k === 14 || k === 22) {
          // Navigate isn't a tab under the bar any more: it opens the walk (NR2), so the tour ends on Chronicle.
          const id = { 6: 'chronicle', 14: 'explore', 22: 'chronicle' }[k];
          await pg.click(`[data-testid=tab-${id}]`);
          await pg.waitForTimeout(400);
          onTabs.push(`${id}:${await shownCount(pg, '[data-testid=recording-bar]')}:${await pg.locator('canvas.maplibregl-canvas').count()}`);
        }
        if (k === 23) perfA = { at: Date.now(), ...(await pg.evaluate(() => ({ ...window.__perf }))) };
      });
      await pg.waitForTimeout(2200);
      {
        // The bar ticks and follows the trace by itself: the tab beneath it isn't re-rendered (perf).
        const b = await pg.evaluate(() => ({ ...window.__perf }));
        const secs = (Date.now() - perfA.at) / 1000;
        const rate = (k) => ((b[k] ?? 0) - (perfA[k] ?? 0)) / secs;
        check(rate('render:navigate') <= 0.2 && rate('render:bar') <= 1.2 && rate('render:walk') === 0,
          `minimized, only the bar follows the walk (navigate ${rate('render:navigate').toFixed(2)}/s, bar ${rate('render:bar').toFixed(2)}/s over ${secs.toFixed(0)} s)`);
      }
      const d1 = m(await barText());
      check(onTabs.join(',') === 'chronicle:1:0,explore:1:1,chronicle:1:0', `the bar is on every tab, with one live map where there is a map; Chronicle's Memories has none (NV4, NV9, RM1: ${onTabs.join(', ')})`);
      check(d1 > d0 + 100 && /^\d+:\d\d · \d+ m$/.test(await barText()), `minimized, the walk keeps recording: the bar's distance grows (NV8: ${d0} → ${d1} m)`);
      // Remind me here keeps firing while minimized (NV8): checked outside the walk screen, shown on the bar.
      const fired = await pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('recall', 'readonly').objectStore('recall').get('old-note');
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const reminderOnBar = await pg.waitForSelector('[data-testid=recording-reminder]', { timeout: 5000 }).then((e) => e.innerText(), () => '');
      check(fired?.fired_count === 1 && fired.last_walk_id === w.id && /A note from here/.test(reminderOnBar),
        `Remind me here fires with the walk minimized, and the bar says so (NV8: ${JSON.stringify(fired && { n: fired.fired_count, walk: fired.last_walk_id === w.id })}, "${reminderOnBar}")`);
      // NV10, as changed by the tabs audit (U2): no Start with a walk open, and the recording bar is the one way back.
      check((await shownCount(pg, '[data-testid=resume]')) === 0 && (await shownCount(pg, '[data-testid=start]')) === 0 && (await shownCount(pg, '[data-testid=recording-return]')) === 1,
        'with a walk open, no tab has a Start, and the recording bar is the way back (NV10, NR2)');
      // NV10: Walk here on Explore routes the open walk there and returns to it; no second walk.
      await tabTo(pg, 'explore');
      await pg.waitForTimeout(1500);
      {
        const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
        await pg.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 40);
        await pg.mouse.down();
        await pg.waitForTimeout(700);
        await pg.mouse.up();
      }
      await pg.click('[data-testid=walk-here]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      const nav = JSON.parse((await metaOf(pg, 'nav')) || 'null');
      const still = await openWalk(pg);
      const walks = await pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
          g.onsuccess = () => resolve(g.result.length);
        };
      }));
      const wasRouted = await routed(pg, 40000).then(() => true, () => false);
      check(still?.id === w.id && walks === 1 && nav?.walk_id === w.id && nav.dest.label === 'Your spot' && wasRouted,
        `with a walk open, Walk here routes that walk there and returns to it (NV10: ${walks} walk, routed ${wasRouted})`);
      // NV7: under the navigation bar when one shows.
      const navBox = await pg.locator('[data-testid=nav-bar]').boundingBox();
      const minNav = await pg.locator('[data-testid=walk-minimize]').boundingBox();
      check(minNav.y >= navBox.y + navBox.height && minNav.x < 60, 'Minimize sits under the navigation bar while one shows (NV7)');
      // Back on the walk screen, the trace covers the stretch walked while minimized, and memories are pinned again (NV8).
      const last = at(-0.5, 1.25);
      const end = ((await pg.locator('[data-trace-end]').last().getAttribute('data-trace-end')) || '0,0').split(',').map(Number);
      const off = Math.hypot((end[0] - last[0]) / dLon, (end[1] - last[1]) / dLat) * 100;
      // The trace hides while navigating, but is still drawn underneath: its end is where the walk is.
      check(off < 20, `the trace kept growing while minimized: it ends where the walk is (NV8: ${off.toFixed(0)} m off)`);
      check(await pg.waitForSelector('[data-testid=memory-pin]', { timeout: 15000 }).then(() => true, () => false), 'memory pins show again when the walk screen returns (NV8)');
      await c.close();
    }

    {
      // Start with Explore and a destination: the walk opens exploring, heading there (NV25).
      const { c, pg } = await freshPage('start-explore');
      await pg.goto(navUrl);
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      await drawerTo(pg, 'half');
      await pg.click('[data-testid=mode-explore]');
      await drawerTo(pg, 'peek');
      const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
      await pg.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 3);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.waitForSelector('[data-testid=ready-dest]', { timeout: 5000 });
      await pg.click('[data-testid=start]');
      await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
      const said = await pg.waitForSelector('text=Walk started · recording', { timeout: 10000 }).then(() => true, () => false);
      const w = await openWalk(pg);
      const nav = JSON.parse((await metaOf(pg, 'nav')) || 'null');
      check(said && w && (await metaOf(pg, 'explore_walk')) === w.id && Number(await metaOf(pg, `explored:${w.id}`)) >= w.started_at - 5000 && nav?.walk_id === w.id,
        'Start with Explore and a destination opens the walk exploring, its destination saved for it, saying it is recording (NV25)');
      await pg.click('[data-testid=walk-summary]');
      await pg.waitForSelector('[data-testid=options-card]');
      check(await pg.locator('[data-testid=explore-walk] input').isChecked(), 'the walk’s options card shows the same mode (NV22, NV26)');
      await c.close();
    }
}

async function run(h) {
  await checks(h);
  await fresh(h);
}

module.exports = {
  name: 'launch',
  covers: [
    'src/app/{_layout,explore}.tsx',
    'src/lib/{launchWalk,launchRoute,lastFix,settleWithin,tabsHidden}.ts',
    'src/components/{ScreenError,Modal}.tsx',
    // The app's web styles and shared primitives: every screen wears them, and the launch shows the first.
    'src/components/webStyles*.ts',
    'src/components/{icons,ui}.tsx',
  ],
  run,
  checks,
  fresh,
};
