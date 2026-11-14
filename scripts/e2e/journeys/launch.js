// The launch (NV1-NV6, NV11, NV16, HC3, HC5, NT1, NT2): the old /chronicle path, stale replay and day links, the three
// tabs at their paths with one live map, the manifest and the service worker; then, in fresh browsers,
// Walk here from Explore (NV12, NV15), a reload with a walk minimized (NV8), and Start with Explore and a
// destination (NV25). Nothing precedes it: `checks` runs on the shared page as it opens.

const path = require('path');

async function checks(h) {
  const { url, BASE, browser, page, start, at, check, shownCount, tabBarShown, onTab, routed } = h;
    // HC5: a launch on a replay or a day that is no longer kept, and the old /chronicle path, open Chronicle
    // at /, with one tab bar (NV2: the owner's Home Screen app reopened on "This walk could not be found", Nov 3).
    for (const stale of ['replay/no-such-walk', 'day/1999-01-01', 'chronicle']) {
      await page.goto(`${url}${stale}`);
      await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 }).catch(() => {});
      await page.waitForSelector('[data-testid=tab-chronicle][aria-selected=true]', { timeout: 15000 }).catch(() => {});
      check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1
        && (await page.locator('[data-testid=tab-bar-wrap]').count()) === 1 && (await page.locator('text=This walk could not be found.').count()) === 0
        && (await page.locator('text=Nothing was kept on this day.').count()) === 0,
        `HC5: a launch on ${stale.split('/')[0]} opens Chronicle at / (${page.url()})`);
    }
    // tend replay T20 (decision 0165): reached from inside the app, a walk not found, a day with nothing kept and a
    // screen that threw keep their words, and the way back names where it goes: "Back to Chronicle", to / (decision
    // 0112), whole on one line and on screen at 390 and 320 px. The throw is one failed read of the walks.
    {
      const inApp = (p) => page.evaluate((to) => { window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')); }, `${BASE}/${p}`);
      const backBox = () => page.evaluate(() => {
        const b = [...document.querySelectorAll('[role=button]')].find((e) => e.getAttribute('aria-label') === 'Back to Chronicle' && e.offsetParent);
        if (!b) return null;
        const r = b.getBoundingClientRect();
        const t = [...b.querySelectorAll('*')].find((e) => e.textContent === 'Back to Chronicle' && !e.children.length);
        const tr = t?.getBoundingClientRect();
        const lh = t ? parseFloat(getComputedStyle(t).lineHeight) || parseFloat(getComputedStyle(t).fontSize) * 1.2 : 0;
        return {
          said: b.getAttribute('aria-label'), shown: t?.textContent ?? null, h: Math.round(r.height),
          oneLine: !!(tr && tr.height < lh * 1.6), whole: !!(t && t.scrollWidth <= t.clientWidth + 1 && tr.left >= r.left - 1 && tr.right <= r.right + 1),
          onScreen: r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight, wide: document.documentElement.scrollWidth <= window.innerWidth,
        };
      });
      const fine = (m) => !!(m && m.said === 'Back to Chronicle' && m.shown === 'Back to Chronicle' && m.h >= 44 && m.oneLine && m.whole && m.onScreen && m.wide);
      const deadEnds = [
        ['replay', 'replay/no-such-walk', 'text=This walk could not be found.'],
        ['day', 'day/1999-01-01', 'text=Nothing was kept on this day.'],
        ['error', 'day/2000-01-01', '[data-testid=screen-error]'],
      ];
      for (const [name, p, sign] of deadEnds) {
        await page.goto(url);
        await page.waitForSelector('[data-testid=memories]', { timeout: 15000 }).catch(() => {});
        // One read of the walks fails, the next ones read again: the day screen's load throws into its ErrorBoundary.
        // Only a read made on the day's route fails, so Chronicle beneath never takes it (the T20 review's auditor 4).
        if (name === 'error') await page.evaluate(() => {
          const real = IDBObjectStore.prototype.getAll;
          window.__t20Failed = false;
          IDBObjectStore.prototype.getAll = function (...a) {
            if (this.name !== 'walk' || !location.pathname.includes('/day/')) return real.apply(this, a);
            IDBObjectStore.prototype.getAll = real;
            window.__t20Failed = true;
            throw new Error('tend replay T20: one read of the walks failed');
          };
        });
        await inApp(p);
        await page.waitForSelector(sign, { timeout: 15000 }).catch(() => {});
        const shown = (await page.locator(sign).count()) === 1 && (name !== 'error' || (await page.evaluate(() => window.__t20Failed)));
        const at390 = await backBox();
        await h.shot(page, `t20-${name}-390`);
        let at320 = null;
        try {
          await page.setViewportSize({ width: 320, height: 700 });
          await page.waitForTimeout(400);
          at320 = await backBox();
          await h.shot(page, `t20-${name}-320`);
        } finally {
          await page.setViewportSize({ width: 390, height: 844 });
          await page.waitForTimeout(400);
        }
        await page.getByRole('button', { name: 'Back to Chronicle', exact: true }).click({ timeout: 5000 }).catch(() => {});
        await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 }).catch(() => {});
        await page.waitForSelector('[data-testid=tab-chronicle][aria-selected=true]', { timeout: 15000 }).catch(() => {});
        const home = new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1
          && (await page.locator(sign).count()) === 0;
        check(shown && fine(at390) && fine(at320) && home,
          `tend replay T20: ${p} reached from inside the app keeps its words, and its way back reads and is said "Back to Chronicle", whole on one line at 390 and 320 px, and opens Chronicle at / (${JSON.stringify({ shown, at390, at320, home, url: page.url() })})`);
      }
      // The failed read is the step's own doing, and the boundary logs it: not the app's console error.
      for (let i = h.errors.length - 1; i >= 0; i--) if (/tend replay T20: one read of the walks failed/.test(h.errors[i])) h.errors.splice(i, 1);
    }
    // A tab's error screen (fix ios-video audit 1): the map's WebGL context refused while armed, on the paths named,
    // so the map throws into that tab's own ErrorBoundary; the step's own errors are dropped from the console list.
    const failMaps = (on) => page.evaluate((paths) => {
      const proto = HTMLCanvasElement.prototype;
      window.__glReal = window.__glReal ?? proto.getContext;
      const real = window.__glReal;
      proto.getContext = !paths ? real : function (kind, ...rest) {
        if (/webgl/.test(String(kind)) && paths.some((q) => location.pathname.endsWith(q))) return null;
        return real.call(this, kind, ...rest);
      };
    }, on);
    const dropGlErrors = (from) => { for (let i = h.errors.length - 1; i >= from; i--) if (/WebGL|webgl|GPUInitialization/.test(h.errors[i])) h.errors.splice(i, 1); };
    const screenErr = () => shownCount(page, '[data-testid=screen-error]');
    const shownButton = (name) => page.getByRole('button', { name, exact: true }).filter({ visible: true }).count();
    {
      // tend replay audit 7 (the T20 review's auditor 1): inside the tabs dismissTo('/') did nothing, so Explore's
      // "Back to Chronicle" goes by router.navigate('/') and opens Chronicle's tab.
      const from = h.errors.length;
      await page.goto(url);
      await page.waitForSelector('[data-testid=memories]', { timeout: 15000 }).catch(() => {});
      // Memories draws no map (NV4), so every map refused from here on is Explore's, made as its tab opens.
      await failMaps(['']);
      await page.click('[data-testid=tab-explore]');
      await page.waitForFunction(() => [...document.querySelectorAll('[data-testid=screen-error]')].some((e) => !e.closest('[aria-hidden=true]')), null, { timeout: 15000 }).catch(() => {});
      const errs = await screenErr();
      const backs = await shownButton('Back to Chronicle');
      const shown = errs === 1 && backs === 1;
      await h.shot(page, 'audit7-explore-error-390');
      await failMaps(null);
      await page.getByRole('button', { name: 'Back to Chronicle', exact: true }).filter({ visible: true }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForSelector('[data-testid=tab-chronicle][aria-selected=true]', { timeout: 10000 }).catch(() => {});
      const home = new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1
        && (await screenErr()) === 0;
      check(shown && home, `tend replay audit 7: Explore's error screen shows "Back to Chronicle", and it opens Chronicle's tab at / (${JSON.stringify({ errs, backs, home, url: page.url() })})`);
      dropGlErrors(from);
    }
    await page.goto(`${url}explore`);
    await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]', { timeout: 15000 }).catch(() => {});
    check(new URL(page.url()).pathname === `${BASE}/explore` && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1
      && (await page.locator('[data-testid=tab-bar-wrap]').count()) === 1, `HC5: /explore opens Explore, with one tab bar (${page.url()})`);
    await page.goto(url);
    // Navigation & tabs (NV1-NV6, amended by decision 0112): the app opens on Chronicle's Memories, at /.
    await page.waitForSelector('[data-testid=tab-chronicle][aria-selected=true]');
    await page.waitForSelector('[data-testid=memories]', { timeout: 15000 });
    // Memos and videos play with the ringer switch off, on the web too (bug: silent playback on iPhone).
    check(await page.evaluate(() => navigator.audioSession.type) === 'playback', 'the page asks to play sound even in silent mode');
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1
      && (await page.locator('canvas.maplibregl-canvas').count()) === 0,
      `the app opens on Chronicle's Memories, at /, with no live map (NV2, NV4, NV5: ${page.url()})`);
    const tabs = await page.locator('[data-testid=tab-explore], [data-testid=tab-navigate], [data-testid=tab-chronicle]').evaluateAll((els) => els.map((e) => `${e.dataset.testid}:${e.innerText.replace(/[^A-Za-z]/g, "")}:${e.querySelectorAll('svg, [aria-hidden], div').length > 1}`));
    check(tabs.join(',') === 'tab-chronicle:Chronicle:true,tab-explore:Explore:true,tab-navigate:Navigate:true', `a bottom bar with Chronicle, Explore and Navigate, in that order, each with an icon and a label (NV1, HC3: ${tabs.join(', ')})`);
    // Explore reads one fix the first time it comes to the front, and frames it (NV16, amended by HC14).
    const ex = await onTab('explore');
    await page.waitForFunction((s) => [...document.querySelectorAll('[data-center]')].some((e) => {
      if (e.closest('[aria-hidden=true]')) return false;
      const [lon, lat] = (e.getAttribute('data-center') ?? '').split(',').map(Number);
      return Math.abs(lon - s[0]) < 0.004 && Math.abs(lat - s[1]) < 0.004;
    }), start, { timeout: 15000 }).then(() => true, () => false).then((ok) =>
      check(ok, 'Explore frames where you are the first time it comes to the front, from one fix of its own (NV16)'));
    check(ex.path === '/explore' && ex.canvases === 1, `Explore at /explore, one live map (NV4, NV5: ${JSON.stringify(ex)})`);
    // Each tab at its own path, with one live map (NV4, NV5).
    const nv = await onTab('navigate');
    await page.waitForSelector('[data-testid=start]');
    check(nv.path === '/walk' && (await page.locator('[data-testid=ready-bar]').count()) === 1 && !(await tabBarShown(page))
      && (await page.locator('canvas.maplibregl-canvas').count()) === 1 && (await page.locator('[data-testid=start]').count()) === 1,
      `Navigate opens the ready walk screen, no tab bar, one map with Start (NR1, NV4: ${JSON.stringify(nv)})`);
    check((await page.locator('[data-testid=ready-dest]').count()) === 0,
      'Start alone in the bar, with no destination line (NV19, NR5, NR8)');
    check((await page.locator('[data-testid=moment-photo]').count()) === 1 && (await page.locator('[data-testid=moment-note]').isVisible()), 'Navigate has quick capture, outside the bar (NV18, NR9)');
    await page.waitForTimeout(1500);
    const ch = await onTab('chronicle');
    await h.mapUp(page);
    await page.waitForSelector('text=Walk somewhere and it is starred here');
    check(ch.path === '/' && ch.canvases === 1, `Chronicle's map at /, one live map (NV4, NV5: ${JSON.stringify(ch)})`);
    check((await shownCount(page, '[data-testid=start], [data-testid=moment-note], [data-testid=line-input], [data-testid=look-here]')) === 0,
      'Chronicle\'s map has no Start, Explore button, quick capture or What’s good here; the band is on Memories only (NV11, HC6)');
    await page.reload();
    await page.waitForSelector('[data-testid=tab-chronicle][aria-selected=true]');
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1, 'a reload keeps the tab (NV5)');
    await onTab('explore');
    await page.goBack();
    await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1, 'the browser’s back on Explore goes to Chronicle (NV5, HC4)');
    await onTab('navigate');
    await page.goBack();
    await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 5000 }).catch(() => {});
    check(new URL(page.url()).pathname === `${BASE}/`, 'and on Navigate too (NV5)');
    // The story goes on from Explore, as it began there before 0112.
    await page.click('[data-testid=tab-explore]');
    await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]');

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
      await pg.waitForSelector('[data-testid=atlas-carousel]');
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
          const tx = req.result.transaction(['moment', 'recall'], 'readwrite');
          tx.objectStore('moment').put(((c) => ({ id: c.id, walk_id: c.walk_id ?? null, t: c.t, lat: c.lat ?? null, lon: c.lon ?? null, segment_id: c.segment_id ?? null, piece_ids: [c.id], pieces: [Object.fromEntries(Object.entries({ ...c, moment_id: c.id }).filter(([k]) => !['walk_id', 'lat', 'lon', 'segment_id'].includes(k)))] }))({ id: 'old-note', walk_id: 'old-walk', t: Date.now() - 86_400_000, kind: 'text', file_path: null, body: 'The old bench by the steps', segment_id: null, lat, lon }));
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
      check(!/\/walk/.test(new URL(pg.url()).pathname) && (await tabBarShown(pg)) && /^\d+:\d\d · \d+ m · Paused$/.test(await barText())
        && Math.abs(barBox.y + barBox.height - tabBox.y) < 6 && (await pg.locator('[data-testid=recording-bar] [data-testid=stop]').count()) === 0,
        `minimized, a recording bar sits just above the tab bar: time, distance, Paused, and no Stop (NV9: "${await barText()}")`);
      // Minimized to the tab beneath: Chronicle's Memories since 0112, which has no map. Never two.
      const liveMaps = await pg.locator('canvas.maplibregl-canvas').count();
      check(liveMaps <= 1, `at most one live map with the walk minimized (NV4: ${liveMaps})`);
      // The bar's camera, while paused: the photo is kept for the open walk, and the walk screen stays down (NV9).
      const photosOf = () => pg.evaluate((id) => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
          g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).filter((x) => x.walk_id === id && x.kind === 'photo'));
        };
      }), w.id);
      // On Memories the band's camera takes the bar's place (decision 0112): the bar's own camera is on the other tabs.
      if (!(await pg.locator('[data-testid=bar-photo]').count())) await pg.click('[data-testid=tab-explore]');
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=bar-photo]')]);
      await chooser.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
      // tend tabs T12: the bar's photo is told in a pill above the bar that waits; the line keeps its time and distance.
      const saidPhoto = await pg.waitForSelector('[data-testid=bar-edit-offer]', { timeout: 10000 })
        .then((e) => e.evaluate((n) => n.firstElementChild?.textContent ?? ''), () => '');
      const offeredAt = Date.now();
      const kept = await photosOf();
      check(saidPhoto === 'Photo saved to your walk' && kept.length === 1 && !/\/walk/.test(new URL(pg.url()).pathname),
        `a photo from the bar's camera lands in the open walk, paused too, without opening the walk screen (NV9: "${saidPhoto}", ${kept.length})`);
      // tend tabs 9 pictured the offer at 390 and 320 px; since T12 it is a pill above the bar, its words whole on one line.
      {
        const pill = async () => pg.evaluate(() => {
          const q = (sel) => document.querySelector(sel);
          const p = q('[data-testid=bar-edit-offer]');
          const bar = q('[data-testid=recording-bar]')?.getBoundingClientRect();
          if (!p || !bar) return null;
          const r = p.getBoundingClientRect();
          const t = p.firstElementChild;
          const tr = t.getBoundingClientRect();
          const edit = p.querySelector('[data-testid=capture-edit]')?.getBoundingClientRect();
          const close = p.querySelector('[data-testid=bar-edit-offer-close]');
          const closeBox = close?.getBoundingClientRect();
          return {
            above: r.bottom <= bar.top + 1,
            oneLine: tr.height - parseFloat(getComputedStyle(t).paddingTop) - parseFloat(getComputedStyle(t).paddingBottom)
              <= parseFloat(getComputedStyle(t).fontSize) * 1.6 && t.scrollWidth <= Math.ceil(tr.width) + 1,
            room: Math.round(window.innerWidth - r.width),
            // tend tabs audit 17: the pill's words and the line's time and distance are drawn whole, measured, not read.
            whole: t.scrollWidth <= t.clientWidth + 1,
            numbers: (() => {
              const s = q('[data-testid=recording-stats]');
              const n = s?.firstChild;
              const cut = n?.textContent?.indexOf(' · Paused') ?? -1;
              if (!s || !n || n.nodeType !== 3 || cut < 1) return false;
              const range = document.createRange();
              range.setStart(n, 0);
              range.setEnd(n, cut);
              return range.getBoundingClientRect().right <= s.getBoundingClientRect().left + s.clientWidth + 1;
            })(),
            inPill: !!(edit && edit.width >= 44 && edit.right <= r.right + 1),
            // tend tabs audit 20: Edit and Close stand apart, as Undo and its Close do.
            apart: edit && closeBox ? Math.round(closeBox.left - edit.right) : null,
            close: close?.getAttribute('aria-label') ?? null,
            live: p.getAttribute('aria-live'),
            stats: q('[data-testid=recording-stats]')?.textContent ?? null,
            said: !!q('[data-testid=recording-said]'),
            wide: document.documentElement.scrollWidth <= window.innerWidth,
          };
        });
        const fine = (m) => !!(m && m.above && m.oneLine && m.whole && m.inPill && m.apart >= 4 && m.close === 'Close, the photo stays as it is'
          && m.live === 'polite' && /^\d+:\d\d · \d+ m · Paused$/.test(m.stats ?? '') && m.numbers && !m.said && m.wide);
        const at390 = await pill();
        await h.shot(pg, 'tabs-9-bar-edit-offer');
        let at320 = null;
        try {
          await pg.setViewportSize({ width: 320, height: 700 });
          await pg.waitForTimeout(400);
          at320 = await pill();
          await h.shot(pg, 'tabs-9-bar-edit-offer-320');
        } finally {
          await pg.setViewportSize({ width: 390, height: 844 });
          await pg.waitForTimeout(400);
        }
        check(fine(at390) && fine(at320),
          `tend tabs T12, tend tabs audit 17, tend tabs audit 20: after a photo the bar's Edit offer is a pill above it, Edit and Close apart, "Photo saved to your walk · Edit · ✕", its words whole on one line at 390 and 320 px, announced politely, the line keeping its time and distance (${JSON.stringify(at390)}, ${JSON.stringify(at320)})`);
        // It waits: past ME23's six seconds it is still there; its Close ends it and the line stays.
        await pg.waitForTimeout(Math.max(0, 6800 - (Date.now() - offeredAt)));
        const waited = await pill();
        await pg.click('[data-testid=bar-edit-offer-close]');
        await pg.waitForTimeout(400);
        const closed = await pg.locator('[data-testid=bar-edit-offer]').count();
        const stats = await pg.locator('[data-testid=recording-stats]').innerText().catch(() => '');
        check(fine(waited) && closed === 0 && /^\d+:\d\d · \d+ m · Paused$/.test(stats),
          `tend tabs T12: the pill is still up after 6 s and goes with its Close, the line still its time and distance (${!!waited}, ${closed}, "${stats}")`);
      }
      // A tap on the bar returns to the walk, where the photo is pinned (NV9).
      await pg.click('[data-testid=recording-return]');
      await pg.waitForSelector('[data-testid=stop]');
      await pg.waitForTimeout(1500);
      check(/\/walk/.test(new URL(pg.url()).pathname) && (await pg.locator('[aria-label^="Photo, "][aria-label$=". Open"], .maplibregl-map button[data-ids*=","]:not([data-testid=memory-pin])').count()) >= 1 && !(await tabBarShown(pg)),
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
      // NV7: the navigation bar shares the top row with Minimize (the owner, Nov 6): level with it, to its right, never below it.
      const navBox = await pg.locator('[data-testid=nav-bar]').boundingBox();
      const minNav = await pg.locator('[data-testid=walk-minimize]').boundingBox();
      check(Math.abs(navBox.y - minNav.y) <= 2 && minNav.x < 60 && navBox.x >= minNav.x + minNav.width, 'the navigation bar sits on the top row, beside Minimize (NV7)');
      // fix nav-top audit 1: beside Minimize the bar is narrower, so its label wraps instead of losing the place and time.
      const clipped = await pg.locator('[data-testid=nav-left]').evaluate((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
      check(!clipped, 'fix nav-top audit 1: the navigation label is not clipped beside Minimize');
      // fix nav-top audit 6: Minimize's touch area stays off the bar.
      check(minNav.x + minNav.width + 2 <= navBox.x, 'fix nav-top audit 6: Minimize and the bar have a gap between them');
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
    'src/app/{_layout,chronicle}.tsx',
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
