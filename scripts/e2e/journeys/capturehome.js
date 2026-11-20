// Capture from Chronicle (HC1-HC5, HC7, HC10, HC14, decision 0112): the app opens on Chronicle's Memories, which keeps a
// moment in one tap from its open line (the journal, decision 0155; the `journal` journey holds the line's own checks). Its own browser: an empty app first, then seeded moments, then
// a walk minimized. E2E_ONLY=capturehome runs it alone.

// Counts every location read, so a launch that reads none and a moment that reads one fix can be told (HC9, HC14).
const COUNT_GEO = () => {
  const g = navigator.geolocation;
  window.__geo = { reads: 0, watching: 0 };
  const get = g.getCurrentPosition.bind(g);
  const watch = g.watchPosition.bind(g);
  const clear = g.clearWatch.bind(g);
  g.getCurrentPosition = (...a) => { window.__geo.reads += 1; return get(...a); };
  g.watchPosition = (...a) => { window.__geo.reads += 1; window.__geo.watching += 1; return watch(...a); };
  g.clearWatch = (id) => { window.__geo.watching = Math.max(0, window.__geo.watching - 1); return clear(id); };
  // HC6: a read of the moments can be made to fail, as a broken store would.
  const getAll = IDBIndex.prototype.getAll;
  IDBIndex.prototype.getAll = function (...a) {
    if (window.__breakReads) throw new DOMException('broken for the test', 'UnknownError');
    return getAll.apply(this, a);
  };
};

// tend captures audit 5: a read that cannot settle fails in bounded time (it rejects on an error, a blocked open or
// after 5 s) and closes its connection, so a poll of it never hangs the journey.
const stored = (pg) => pg.evaluate(() => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('stored: no answer from IndexedDB in 5 s')), 5000);
  const fail = (e) => { clearTimeout(timer); reject(e instanceof Error ? e : new Error(`stored: ${e && e.name}`)); };
  const req = indexedDB.open('chronicles');
  req.onerror = () => fail(req.error);
  req.onblocked = () => fail(new Error('stored: the open was blocked'));
  req.onsuccess = () => {
    const conn = req.result;
    try {
      const names = ['moment', 'walk', 'thread_member'];
      const tx = conn.transaction(names, 'readonly');
      tx.oncomplete = () => conn.close();
      tx.onerror = () => { conn.close(); fail(tx.error); };
      const all = (n) => new Promise((r, x) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => r(g.result); g.onerror = () => x(g.error); });
      // Each moment read back as its one piece with the moment's own fields (decision 0123).
      Promise.all(names.map(all)).then(([moments, walks, members]) => {
        clearTimeout(timer);
        resolve({ captures: moments.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })), walks, members });
      }, fail);
    } catch (e) {
      conn.close();
      fail(e);
    }
  };
}));

// How far a point lies from the segment a-b, in metres (the fake grid's units are 100 m).
const offSegmentM = (h, p, a, b) => {
  const xy = (q) => [(q[0] - h.at(0, 0)[0]) / h.dLon * 100, (q[1] - h.at(0, 0)[1]) / h.dLat * 100];
  const [P, A, B] = [xy(p), xy(a), xy(b)];
  const d = [B[0] - A[0], B[1] - A[1]];
  const len2 = d[0] * d[0] + d[1] * d[1];
  const k = len2 ? Math.max(0, Math.min(1, ((P[0] - A[0]) * d[0] + (P[1] - A[1]) * d[1]) / len2)) : 0;
  return Math.hypot(P[0] - A[0] - k * d[0], P[1] - A[1] - k * d[1]);
};

const box = async (pg, sel) => {
  const b = await pg.locator(sel).filter({ visible: true }).first().boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
};
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function run(h) {
  const { url, BASE, check, shot, tabTo, toStop } = h;
  const { c, pg } = await h.freshPage('capturehome', { permissions: ['geolocation', 'microphone'] });
  await c.addInitScript(COUNT_GEO);
  // The map's projection for the e2e (`window.__project`, WalkMap.web.tsx), to find the walker on Explore (tend tabs audit 30).
  await c.addInitScript(() => { window.__perf = {}; });
  const shown = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const there = (sel, timeout = 10000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  // The journal's toolbar at the foot (JN41, decision 0178).
  const band = '[data-testid=open-line]';

  // HC1, HC14: an empty app opens on Memories, at /, with one tab bar, no map, and no location read.
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await there('[data-testid=memories]', 20000);
  await pg.waitForTimeout(2500);
  const opened = {
    path: new URL(pg.url()).pathname,
    chronicle: await pg.locator('[data-testid=tab-chronicle][aria-selected=true]').count(),
    memories: await shown('[data-testid=memories]'),
    bars: await pg.locator('[data-testid=tab-bar-wrap]').count(),
    maps: await pg.locator('canvas.maplibregl-canvas').count(),
  };
  check(opened.path === `${BASE}/` && opened.chronicle === 1 && opened.memories && opened.bars === 1 && opened.maps === 0,
    `HC1: the app opens on Memories at /, one tab bar, no live map (${JSON.stringify(opened)})`);
  const geoAtLaunch = await pg.evaluate(() => window.__geo.reads);
  check(geoAtLaunch === 0, `HC14: opening on Chronicle reads no location (${geoAtLaunch} reads)`);

  // HC3: Chronicle, Explore, Navigate.
  const tabs = await pg.locator('[data-testid^=tab-]').filter({ hasNot: pg.locator('[data-testid=tab-bar-wrap]') }).evaluateAll((els) =>
    els.filter((e) => /^tab-(chronicle|explore|navigate)$/.test(e.dataset.testid)).map((e) => e.innerText.replace(/[^A-Za-z]/g, '')));
  check(tabs.join(',') === 'Chronicle,Explore,Navigate', `HC3: the tabs read Chronicle, Explore, Navigate (${tabs.join(', ')})`);

  // Memories is a journal since decision 0155: what the band's checks proved here (HC6-HC9, HC11-HC13, HC15 and the
  // audit's 2, 5, 8, 9, 11) is the open line's now, checked by the `journal` journey (JN2, JN9-JN15, JN18). What stays
  // here is the launch and the tabs, the walk minimized under Memories, the recording bar and Explore's one fix.

  // A note kept before the walk, so Days has a day to open (the bar's Edit offer, below).
  // The journal's composer (JN47): the toolbar's field opens it with the caret in it.
  await pg.click('[data-testid=bar-compose]').catch(() => {});
  await pg.waitForTimeout(600);
  await pg.keyboard.type('A note before the walk.', { delay: 10 });
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=line-done]').catch(() => {});
  await pg.waitForTimeout(1500);

  // HC10, HC7, HC15: with a walk minimized, the band files into the walk, sits above the recording bar,
  // and the bar shows no camera on Memories (decision 0112).
  await tabTo(pg, 'navigate');
  await pg.waitForSelector('[data-testid=start]', { timeout: 15000 });
  await pg.click('[data-testid=start]');
  await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
  // A photo from the bar on Explore, which leaves its Edit pill up (T12).
  // The bar's photo opens its editor by itself (ME23 as decision 0240 has it); closed here unless `open` keeps it up.
  const barPhoto = async (p = pg, open = false) => {
    await tabTo(p, 'explore');
    await p.waitForSelector('[data-testid=bar-photo]', { timeout: 10000 }).catch(() => {});
    const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), p.click('[data-testid=bar-photo]').catch(() => {})]);
    await chooser?.setFiles(require('path').join(h.scriptsDir, 'fixtures', 'photo.jpg'));
    const up = await p.waitForSelector('[data-testid=media-editor]', { timeout: 10000 }).then(() => true, () => false);
    if (up && !open) {
      await p.click('[data-testid=edit-close]').catch(() => {});
      await p.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
    }
    return up;
  };
  // tend tabs T36 (the proxy's yes under 0157, 2026-11-18), as decision 0240 leaves it: the bar's photo opens the editor,
  // a Modal, where the bar's Edit pill once lifted Explore's map; the press hint shows again as it goes, none of its five
  // seconds (EC14's "after a few seconds on screen it is marked seen") having run beneath it. Before the steps: its half
  // minute between steps 5 and 6 left the stop unable to place HC10's note on the trace.
  {
    const hint = '[data-testid=atlas-press-hint]';
    // tend tabs audit 30 (the review's ux 1, steward 1): measured, not counted. Explore draws the walker in the map's
    // canvas (its 'points' layer, radius 7 and a 2 px ring), at the map's `data-walker`; a hint that is not drawn has no box.
    const rect = (sel, p = pg) => p.evaluate((q) => {
      const r = document.querySelector(q)?.getBoundingClientRect();
      return r && r.width > 0 ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null;
    }, sel);
    const walkerBox = (p = pg) => p.evaluate(() => {
      const maps = [...document.querySelectorAll('[data-walker]')].filter((e) => e.getAttribute('data-walker') && e.getBoundingClientRect().width > 0);
      if (!maps.length || !window.__project) return null;
      const [x, y] = window.__project(maps[maps.length - 1].getAttribute('data-walker').split(',').map(Number));
      return { x: Math.round(x - 9), y: Math.round(y - 9), w: 18, h: 18 };
    });
    // tend tabs audit 50 (the T40 review's ux U2): the walker against the hint and against every name and control Explore
    // keeps the map's names clear of (`NAMES_CLEAR_OF`, explore.tsx), each one drawn, 8 px apart; never against the hint
    // alone, which reads clear while it stands aside.
    const CLEAR_OF = ['atlas-title-card', 'atlas-search', 'outing-entry', 'layers', 'atlas-move-map', 'atlas-show-here', 'compass', 'locate', 'atlas-back-pill'];
    const walkerClear = async (p = pg) => {
      const walker = await walkerBox(p);
      const words = await rect(hint, p);
      const boxes = await p.evaluate((ids) => ids.flatMap((id) => [...document.querySelectorAll(`[data-testid="${id}"]`)]
        .map((el) => ({ id, r: el.getBoundingClientRect() })).filter((b) => b.r.width > 0 && b.r.height > 0)
        .map(({ id, r }) => ({ id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }))), CLEAR_OF);
      const near = walker ? boxes.filter((b) => overlap({ x: walker.x - 8, y: walker.y - 8, w: walker.w + 16, h: walker.h + 16 }, b)).map((b) => b.id) : [];
      return { walker, words, near, clear: !!walker && !overlap(walker, words) && near.length === 0 };
    };
    // tend tabs T40: the walker clear of the hint's one line by 4 px at least, so the two-line hint's 3 px overlap fails
    // here. Measured at 320 x 700: 7 px in A and back (the walker as framed on main), 13 px in C.
    const hintClear = async (p = pg) => {
      const m = await walkerClear(p);
      const w = m.walker;
      const clear4 = !!w && !!m.words && !overlap({ x: w.x - 4, y: w.y - 4, w: w.w + 8, h: w.h + 8 }, m.words);
      return { ...m, oneLine: !!m.words && m.words.h <= 30, clear4: clear4 && m.near.length === 0 };
    };
    // A fresh app on Explore with a walk minimized, at `size`: Navigate's walk minimized, then Explore's first focus.
    const freshExplore = async (label, size) => {
      const f = await h.freshPage(label, { permissions: ['geolocation', 'microphone'] });
      await f.c.addInitScript(() => { window.__perf = {}; });
      await f.pg.setViewportSize(size);
      await f.pg.goto(url);
      await f.pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
      await tabTo(f.pg, 'navigate');
      await f.pg.waitForSelector('[data-testid=start]', { timeout: 15000 });
      await f.pg.click('[data-testid=start]');
      await f.pg.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 });
      await f.pg.waitForTimeout(1500);
      await f.pg.click('[data-testid=walk-minimize]');
      await f.pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await tabTo(f.pg, 'explore');
      const shownUp = await f.pg.waitForSelector(hint, { timeout: 10000 }).then(() => true, () => false);
      await f.pg.waitForTimeout(1500);
      return { ...f, shownUp };
    };
    await tabTo(pg, 'explore');
    const hintBefore = await pg.waitForSelector(hint, { timeout: 10000 }).then(() => true, () => false);
    // tend tabs audit 29: the editor (a Modal) opens by itself after the bar's photo; the hint counts none of its seconds
    // beneath it.
    const up = await barPhoto(pg, true);
    await shot(pg, 'edit-after-capture-explore');
    await pg.waitForTimeout(6000);
    await pg.click('[data-testid=edit-close]').catch(() => {});
    const offers = await pg.locator('[data-testid=bar-edit-offer], [data-testid=capture-edit]').count();
    const back = await pg.waitForSelector(hint, { timeout: 5000 }).then(() => true, () => false);
    check(up && back && offers === 0,
      `tend tabs audit 29: six seconds in the media editor, open by itself after the bar's photo (decision 0240), leave the press hint unseen: it shows once the editor closes, and no Edit pill is left (${JSON.stringify({ up, back, offers })})`);
    await shot(pg, 'tabs-T36-hint-back');
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(500);
    const back320 = await hintClear();
    await shot(pg, 'tabs-T36-hint-back-320');
    await pg.setViewportSize({ width: 390, height: 844 });
    // Shown again, it is marked seen after its own few seconds on screen, and goes.
    await pg.waitForTimeout(6000);
    const after = await pg.locator(hint).count();
    check(hintBefore && back && back320.clear && after === 0,
      `tend tabs T36, tend tabs audit 30, audit 50: once the editor after the bar's photo goes, the hint shows again with the walker clear of it and 8 px clear of Explore's names and controls (320 x 700), and is marked seen only after its few seconds on screen (${JSON.stringify({ hintBefore, back, back320, after })})`);
    // tend tabs T40 (the owner's "Shorter one-line words", 2026-11-19): at 320 x 700 the hint is one line and the walker
    // stands clear of it: after the pill went (audit 30's back320, held now), framed at 390 x 844 on arrival in a fresh
    // app (A; its own context, so its waits take none of this hint's seconds: the T40 review's F5), and framed at
    // 320 x 700 from the start (C).
    const a = await freshExplore('capturehome-a', { width: 390, height: 844 });
    await a.pg.setViewportSize({ width: 320, height: 700 });
    await a.pg.waitForTimeout(600);
    const arrive320 = await hintClear(a.pg);
    await shot(a.pg, 'tabs-T40-arrive-320');
    await a.c.close();
    const cc = await freshExplore('capturehome-320', { width: 320, height: 700 });
    const fresh320 = await hintClear(cc.pg);
    await shot(cc.pg, 'tabs-T40-fresh-320');
    const t40 = [arrive320, back320, fresh320];
    check(a.shownUp && cc.shownUp && t40.every((m) => m.oneLine && m.clear4),
      `tend tabs T40, tend tabs audit 50: at 320 x 700 "Hold the map to look anywhere." is one line and the walker stands 4 px clear of it or more, and 8 px clear of Explore's names and controls, framed at 390 x 844 (on arrival and after the pill) and at 320 x 700 from the start (${JSON.stringify({ arrive320, back320, fresh320, shown: [a.shownUp, cc.shownUp] })})`);
    // tend tabs audit 50 (the T40 review's auditor F1, ux U1): framed at 320 x 700 with the hint up, then a 52 px card
    // lifts the map (a stand-in for the reminder card, `recording-reminder`, for which the hint steps aside, audit 51; the
    // stand-in is not published, so only the controls count for it). The bar's Edit pill that lifted it too went with
    // decision 0240.
    await cc.pg.evaluate(() => {
      const el = document.createElement('div');
      el.style.height = '52px';
      document.querySelector('[data-testid=recording-bar]')?.prepend(el);
    });
    await cc.pg.waitForTimeout(900);
    const card320 = await walkerClear(cc.pg);
    await shot(cc.pg, 'tabs-audit-50-card-320');
    await cc.c.close();
    check(!!card320.walker && card320.near.length === 0,
      `tend tabs audit 50: at 320 x 700, framed with the hint up, then a 52 px reminder card added, the walker is under none of Explore's names or controls (the stand-in card is not published, so the hint stays drawn over it here, which the real card sets aside: audit 51) (${JSON.stringify({ card320 })})`);
  }
  // A few steps along Wickenden Street, so the walk has a trace and a fresh fix to place by. At a walker's pace
  // (1.5 m a second): 12 m a second was over MAX_WALK_SPEED_MS (lib/geo), so every step was dropped as a jump and the
  // walk kept only its first fix (tend captures audit 2).
  const stepAt = (i) => h.at(-1 + i * 0.015, -1.5);
  const step = async (i) => {
    await c.setGeolocation({ longitude: stepAt(i)[0], latitude: stepAt(i)[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  };
  for (let i = 0; i < 6; i++) await step(i);
  // The walk's last fix: the context sends no new one until the next step, so it ages from here.
  const fixAt = Date.now();
  // A photo from the bar on Explore; its editor, open by itself, is closed (decision 0240).
  const barUp = await barPhoto();
  // tend tabs T37: the room runs low, so Memories' look owes the storage notice (only `estimate`, as the space journey
  // patches it; put back below).
  await pg.evaluate(() => {
    const sm = StorageManager.prototype;
    window.__estimate = sm.estimate;
    sm.estimate = async () => ({ quota: 1e12, usage: 1e12 - 300 * 1024 * 1024 });
  });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector(band, { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(600);
  const pillOnMemories = await shown('[data-testid=bar-edit-offer]');
  const walkBand = await box(pg, band);
  const barBox = await box(pg, '[data-testid=recording-bar]');
  check(!!walkBand && !!barBox && walkBand.y + walkBand.h <= barBox.y + 0.5 && !(await shown('[data-testid=bar-photo]')),
    `HC7: with a walk minimized, the band sits above the recording bar, which shows no camera on Memories (${JSON.stringify({ walkBand, barBox })})`);
  // tend captures audit 2: the walk's fix is stale (over FRESH_FIX_MS, 15 s, lib/pieceStamp) before the note begins,
  // whatever the machine's speed, so the note is kept unplaced and only the stop can place it ("else at stop").
  const fixAge = Date.now() - fixAt;
  if (fixAge < 16000) await pg.waitForTimeout(16000 - fixAge);
  // tend captures audit 3: no location is read for an entry on a walk (JN12; capture-from-chronicle audit 4).
  const readsBefore = await pg.evaluate(() => window.__geo.reads);
  // The journal's composer (JN47): the toolbar's field opens it with the caret in it.
  await pg.click('[data-testid=bar-compose]').catch(() => {});
  await pg.waitForTimeout(600);
  await pg.keyboard.type('Kept on the walk, from Memories.', { delay: 10 });
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=line-done]').catch(() => {});
  await pg.waitForTimeout(800);
  const readsAfter = await pg.evaluate(() => window.__geo.reads);
  for (let i = 6; i < 10; i++) await step(i);
  const db = await stored(pg);
  const open = db.walks.find((w) => w.ended_at == null);
  const kept = db.captures.find((x) => x.body === 'Kept on the walk, from Memories.');
  check(!!open && !!kept && kept.walk_id === open.id && kept.lat == null && readsAfter === readsBefore,
    `HC10 (tend captures audit 2, audit 3): a note from Memories with a walk minimized belongs to the walk, kept unplaced with a stale fix and no location read (${JSON.stringify({ walk: kept && kept.walk_id, open: open && open.id, lat: kept && kept.lat, fixAge, reads: [readsBefore, readsAfter] })})`);
  // tend tabs T37: no Edit pill holds it back (decision 0240), so the notice shows, in its own words, once.
  // tend tabs audit 36 (the T37 review's auditor 4): the browser's own `estimate` is put back whatever happens here, and
  // the notice is dismissed once it shows, so neither lingers into the checks after this one.
  let noticeAfter = '';
  try {
    noticeAfter = await pg.locator('[data-testid=space-line]').filter({ visible: true }).innerText({ timeout: 5000 }).catch(() => '');
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(500);
    await shot(pg, 'tabs-T37-notice-after-pill-320');
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.locator('[data-testid=space-dismiss]').click({ timeout: 5000 }).catch(() => {});
  } finally {
    await pg.evaluate(() => {
      if (window.__estimate) StorageManager.prototype.estimate = window.__estimate;
    });
  }
  check(barUp && !pillOnMemories && noticeAfter.replace(/\s+/g, ' ').trim() === 'Room for new photos and videos is running low. OK',
    `tend tabs T37, ME23 fix edit-after-capture: after a bar photo and its editor, Memories shows no Edit pill and the storage notice in its own words (${JSON.stringify({ barUp, pillOnMemories, noticeAfter })})`);
  // tend captures audit 2: the other half of HC10, "the latest fix": a note begun just after a fresh fix is placed there
  // when it is kept.
  await step(10);
  await pg.click('[data-testid=bar-compose]').catch(() => {});
  await pg.waitForTimeout(600);
  await pg.keyboard.type('Kept at the latest fix.', { delay: 10 });
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=line-done]').catch(() => {});
  await pg.waitForTimeout(800);
  const atFix = (await stored(pg)).captures.find((x) => x.body === 'Kept at the latest fix.');
  const fixOff = atFix && atFix.lat != null ? Math.round(h.distanceM([atFix.lon, atFix.lat], stepAt(10))) : null;
  check(!!atFix && atFix.walk_id === open?.id && fixOff != null && fixOff <= 5,
    `HC10 (tend captures audit 2): a note begun with a fresh fix on the walk is placed at that fix when kept (${JSON.stringify({ walk: atFix && atFix.walk_id, fixOff })})`);
  await pg.click('[data-testid=recording-return]');
  await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 10000 });
  await pg.waitForTimeout(1200);
  await shot(pg, '92-capturehome-walk');
  // Stopped from the bar, the walk places the note as it places its own captures (here, at stop), and its
  // replay plays it.
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 10000 });
  await pg.evaluate(() => {
    window.__sawNote = false;
    const look = () => {
      if (location.pathname.includes('/replay/') && document.body.innerText.includes('Kept on the walk, from Memories.')) window.__sawNote = true;
      if (!window.__sawNote) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  const sb = await pg.locator('[data-testid=bar-stop]').boundingBox();
  await pg.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 }).catch(() => {});
  // tend captures 2: polled from here, since waitForFunction takes an async predicate's pending promise as its first
  // truthy result and resolves with that one read's value: it read the note once as the replay opened, before a slow
  // snap (behind "Reading the streets you walked…") had placed it, and failed on a busy machine.
  let placedNote = null;
  let lastNote = null;
  for (let i = 0; i < 60 && !placedNote; i++) {
    lastNote = (await stored(pg).catch(() => ({ captures: [] }))).captures.find((x) => x.body === 'Kept on the walk, from Memories.') ?? null;
    if (lastNote && lastNote.lat != null) placedNote = lastNote;
    else await pg.waitForTimeout(500);
  }
  // tend captures audit 3: placed on the walk's trace at its time, between the fixes of steps 5 and 6.
  const offTrace = placedNote ? Math.round(offSegmentM(h, [placedNote.lon, placedNote.lat], stepAt(5), stepAt(6))) : null;
  check(!!placedNote && placedNote.walk_id === open?.id && offTrace != null && offTrace <= 5,
    `HC10 (tend captures 2, audit 3): the stopped walk placed the note as its own capture, on its trace at its time, waited for and not read once (${JSON.stringify(placedNote ? { walk: placedNote.walk_id, offTrace } : lastNote && { walk: lastNote.walk_id, lat: lastNote.lat })})`);
  // Watched from before Stop: a short walk's replay can show the note and reach its card before a wait begins here.
  const played = await pg.waitForFunction(() => window.__sawNote === true, null, { timeout: 60000 }).then(() => true, () => false);
  check(played, 'HC10: the walk\'s replay plays the note kept from Memories');

  // capture-from-chronicle audit 3, 4: a denied mic on the web says so above the band, with no Settings button
  // (the web has no settings to open), and the error and a moment's toast stack without covering each other.
  {
    const { c: c3, pg: p3 } = await h.freshPage('capturehome-mic', { permissions: ['geolocation'] });
    await c3.addInitScript(() => {
      const no = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = no;
      const q = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = (d) => (d && d.name === 'microphone' ? Promise.resolve({ state: 'denied', onchange: null, addEventListener() {}, removeEventListener() {} }) : q(d));
    });
    await p3.goto(url);
    await p3.waitForSelector('[data-testid=band-voice]', { timeout: 30000 });
    await p3.click('[data-testid=band-voice]');
    const err = await p3.waitForSelector('[data-testid=band-error]', { timeout: 8000 }).then(() => true, () => false);
    const settingsBtn = err ? await p3.locator('[data-testid=band-error] [role=button]').count() : -1;
    check(err && settingsBtn === 0, `capture-from-chronicle audit 4: on the web a denied mic is said above the band, with no Settings button (${err}, ${settingsBtn})`);
    // An entry written beside the error: the line keeps its box under it (the journal has no toast to stack).
    const pair = { err: await box(p3, '[data-testid=band-error]'), line: await box(p3, '[data-testid=open-line]') };
    check(!!pair.err && !!pair.line && !overlap(pair.err, pair.line),
      `capture-from-chronicle audit 3: an error sits above the open line, never over it (${JSON.stringify(pair)})`);
    await c3.close();
  }

  // Empty walk (EW1, EW8, EW9): a walk started and stopped from the bar where the phone never moved, holding nothing, has no replay:
  // the pill says "Walk not kept." with Undo, which brings the walk back whole; closing the pill lets it go.
  {
    const { c: c4, pg: p4 } = await h.freshPage('capturehome-empty', { permissions: ['geolocation'] });
    await p4.goto(url);
    await tabTo(p4, 'navigate');
    await p4.waitForSelector('[data-testid=start]', { timeout: 30000 });
    const holdStop = async (id = 'bar-stop') => {
      await p4.waitForSelector(`[data-testid=${id}]`, { timeout: 10000 });
      const bb = await p4.locator(`[data-testid=${id}]`).boundingBox();
      await p4.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await p4.mouse.down();
      await p4.waitForTimeout(1100);
      await p4.mouse.up();
    };
    const begin = async (minimize = true) => {
      await p4.click('[data-testid=start]');
      await p4.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 });
      // Standing still, the phone keeps reporting the same place; the context's one fix is stale once a walk starts later (a phone's are fresh).
      for (let i = 0; i < 3; i++) {
        await c4.setGeolocation({ longitude: h.start[0], latitude: h.start[1], accuracy: 6 });
        await p4.waitForTimeout(1300);
      }
      if (minimize) await p4.click('[data-testid=walk-minimize]');
    };
    await begin();
    await holdStop();
    const pill = await p4.waitForSelector('[data-testid=undo-toast]', { timeout: 15000 }).then(() => true, () => false);
    const said = pill ? await p4.locator('[data-testid=undo-toast]').innerText() : '';
    check(pill && /Walk not kept\./.test(said) && !/\d|nothing|empty|wasted/i.test(said) && !/replay/.test(p4.url()),
      `EW1, EW8: stopping a walk that held nothing plays no replay and says "Walk not kept." (${said.replace(/\n/g, ' | ')}, ${p4.url()})`);
    await p4.click('[data-testid=undo]');
    await p4.waitForTimeout(1200);
    const back = (await stored(p4)).walks.filter((w) => w.ended_at != null);
    check(back.length === 1, `EW9: Undo brings the walk back, ended and whole (${back.length})`);
    await p4.goto(url);
    await tabTo(p4, 'navigate');
    await begin();
    await holdStop();
    const again = await p4.waitForSelector('[data-testid=undo-dismiss]', { timeout: 15000 }).then(() => true, () => false);
    check(again, `EW1: a second empty walk is dropped too (${p4.url()}, ${(await p4.locator('body').innerText()).replace(/\n/g, ' | ').slice(0, 160)})`);
    if (again) await p4.click('[data-testid=undo-dismiss]');
    await p4.waitForTimeout(1500);
    check((await stored(p4)).walks.filter((w) => w.id !== back[0].id).length === 0, 'EW1: closing the pill lets the dropped walk go, as a delete does');
    // The walk screen's own Stop reaches the same decision (EW7): it leaves the screen for where the walker was, with the pill.
    await tabTo(p4, 'navigate');
    await p4.waitForSelector('[data-testid=start]', { timeout: 15000 });
    await begin(false);
    await toStop(p4);
    await holdStop('stop');
    const onScreen = await p4.waitForSelector('[data-testid=undo-toast]', { timeout: 15000 }).then(() => true, () => false);
    check(onScreen && !/\/walk|replay/.test(p4.url()) && /Walk not kept\./.test(await p4.locator('[data-testid=undo-toast]').innerText()),
      `EW7: Stop on the walk screen drops an empty walk the same way, back where the walker was (${p4.url()})`);
    await c4.close();
  }

  // tend tabs audit 33 (the T37 review's auditor 2, steward 1; the owner's answer of Nov 18, "The whole column"): the
  // storage notice waits while any dark pill stands in Memories' column, not only the bar's Edit pill: an empty walk's
  // Undo ("Walk not kept.") and the band's own Edit offer after a photo. The room is read from `estimate` alone, as the
  // space journey patches it, on a page of its own.
  {
    const { c: c5, pg: p5 } = await h.freshPage('capturehome-column', { permissions: ['geolocation'] });
    await c5.addInitScript(() => {
      window.__free = 4000 * 1024 * 1024;
      const quota = 1e12;
      const sm = StorageManager.prototype;
      sm.estimate = async () => ({ quota, usage: quota - window.__free });
      sm.persisted = async () => true;
    });
    const vis = async (sel) => (await p5.locator(sel).filter({ visible: true }).count()) > 0;
    const words = () => p5.locator('[data-testid=space-line]').filter({ visible: true }).innerText({ timeout: 4000 }).then((t) => t.replace(/\s+/g, ' ').trim(), () => '');
    const setFree = (mb) => p5.evaluate((n) => { window.__free = n * 1024 * 1024; }, mb);
    await p5.goto(url);
    await tabTo(p5, 'navigate');
    await p5.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await p5.click('[data-testid=start]');
    await p5.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 });
    for (let i = 0; i < 3; i++) {
      await c5.setGeolocation({ longitude: h.start[0], latitude: h.start[1], accuracy: 6 });
      await p5.waitForTimeout(1300);
    }
    await setFree(300);
    await p5.click('[data-testid=walk-minimize]');
    await p5.waitForSelector('[data-testid=bar-stop]', { timeout: 10000 });
    const lowUp = await p5.waitForSelector('[data-testid=space-line]', { timeout: 8000 }).then(() => true, () => false);
    // An empty walk stopped from the bar: its Undo pill rises in the column, and the notice steps aside.
    const sb = await p5.locator('[data-testid=bar-stop]').boundingBox();
    await p5.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await p5.mouse.down();
    await p5.waitForTimeout(1100);
    await p5.mouse.up();
    const undoUp = await p5.waitForSelector('[data-testid=undo-toast]', { timeout: 15000 }).then(() => true, () => false);
    await p5.waitForTimeout(400);
    const withUndo = { undo: await vis('[data-testid=undo-toast]'), line: await vis('[data-testid=space-line]') };
    await p5.setViewportSize({ width: 320, height: 700 });
    await p5.waitForTimeout(400);
    await shot(p5, 'tabs-audit33-undo-alone-320');
    await p5.setViewportSize({ width: 390, height: 844 });
    await p5.click('[data-testid=undo-dismiss]').catch(() => {});
    await p5.waitForSelector('[data-testid=undo-toast]', { state: 'detached', timeout: 5000 }).catch(() => {});
    const backLow = await words();
    check(lowUp && undoUp && withUndo.undo && !withUndo.line && backLow === 'Room for new photos and videos is running low. OK',
      `tend tabs audit 33: with Undo in Memories' column the storage notice steps aside, and comes back in its own words as Undo goes (${JSON.stringify({ lowUp, undoUp, withUndo, backLow })})`);
    // A photo from the band with the room now very low: its editor opens by itself (decision 0240), a Modal over the
    // column, and the notice shows in its own words once it closes.
    await setFree(50);
    const [chooser] = await Promise.all([p5.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), p5.click('[data-testid=band-photo]').catch(() => {})]);
    await chooser?.setFiles(require('path').join(h.scriptsDir, 'fixtures', 'photo.jpg'));
    const editorUp = await p5.waitForSelector('[data-testid=media-editor]', { timeout: 10000 }).then(() => true, () => false);
    await p5.waitForTimeout(600);
    await p5.click('[data-testid=edit-close]').catch(() => {});
    await p5.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
    const offers = await p5.locator('[data-testid=capture-offer], [data-testid=capture-edit]').count();
    const veryLow = await words();
    check(editorUp && offers === 0 && veryLow === 'There is almost no room left for new photos, videos and memos. OK',
      `tend tabs audit 33, ME23 fix edit-after-capture: the band's photo opens its editor by itself; closed, no Edit pill is left and the storage notice shows in its own words (${JSON.stringify({ editorUp, offers, veryLow })})`);
    await c5.close();
  }

  // tend tabs audit 34 (the T37 review's ux 1, auditor 3, steward 5; the owner's answer of Nov 18, decision 0208): the
  // page keeps room at its foot for the toolbar and the messages above it, both, so at 320 x 700 the storage notice
  // with its longest words (the refusal on an iPhone's browser, four lines) covers none of the newest entry's actions.
  {
    const { c: c6, pg: p6 } = await h.freshPage('capturehome-foot', { permissions: ['geolocation'] });
    await c6.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
      const quota = 1e12;
      const sm = StorageManager.prototype;
      sm.estimate = async () => ({ quota, usage: quota - 4000 * 1024 * 1024 });
      sm.persisted = async () => false;
      sm.persist = async () => false;
    });
    await p6.setViewportSize({ width: 320, height: 700 });
    await p6.goto(url);
    await p6.waitForSelector('[data-testid=band-photo]', { timeout: 30000 });
    await p6.waitForTimeout(1500);
    // A photo kept outside a walk asks the browser, which refuses; its editor, open by itself, holds the words back.
    const [chooser] = await Promise.all([p6.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), p6.click('[data-testid=band-photo]').catch(() => {})]);
    await chooser?.setFiles(require('path').join(h.scriptsDir, 'fixtures', 'photo.jpg'));
    await p6.waitForSelector('[data-testid=media-editor]', { timeout: 10000 }).catch(() => {});
    await p6.click('[data-testid=edit-close]').catch(() => {});
    await p6.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
    // The next look off the walk says it (SA10): Memories in front again.
    await tabTo(p6, 'explore');
    await p6.waitForTimeout(800);
    await tabTo(p6, 'chronicle', 'memories');
    const said = await p6.waitForSelector('[data-testid=space-line]', { timeout: 10000 }).then((e) => e.innerText(), () => '');
    await p6.waitForTimeout(1200);
    const notice = await box(p6, '[data-testid=space-line]');
    const actions = await p6.locator('[data-testid=quick-actions]').filter({ visible: true }).evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }));
    const newest = actions[actions.length - 1] ?? null;
    await shot(p6, 'tabs-audit34-notice-clear-320');
    check(said.replace(/\s+/g, ' ').trim() === 'This browser may clear Chronicles’ moments when it needs room. The Home Screen app is less likely to. OK'
      && !!notice && !!newest && !actions.some((a) => overlap(a, notice)),
      `tend tabs audit 34: at 320 x 700 the storage notice, in its longest words, covers none of the newest entry's actions (${JSON.stringify({ said, notice, newest })})`);
    await c6.close();
  }

  // HC14: Explore reads its one fix the first time it comes to the front.
  await pg.click('[data-testid=walk-minimize]').catch(() => {});
  const { c: c2, pg: p2 } = await h.freshPage('capturehome-explore');
  await c2.addInitScript(COUNT_GEO);
  await p2.goto(url);
  await p2.waitForSelector('[data-testid=tab-explore]', { timeout: 30000 });
  await p2.waitForTimeout(1500);
  const before = await p2.evaluate(() => window.__geo.reads);
  await p2.click('[data-testid=tab-explore]');
  await p2.waitForTimeout(4000);
  const after = await p2.evaluate(() => window.__geo.reads);
  check(before === 0 && after >= 1, `HC14: Explore reads its fix on its first focus, not at launch (${before} → ${after})`);
  await c2.close();
  await c.close();
}

module.exports = {
  name: 'capturehome',
  covers: [
    'src/components/chronicle/MemoriesScreen.tsx',
    'src/components/MomentBar.tsx',
    'src/components/walk/CaptureStack.tsx',
    'src/components/RecordingBar.tsx',
    'src/lib/captureBand.ts',
    'src/app/(tabs)/{_layout,index,explore}.tsx',
    'src/app/chronicle.tsx',
    'src/lib/startPlan.ts',
    'src/lib/emptyWalk/**',
    'src/lib/session.ts',
  ],
  run,
};
