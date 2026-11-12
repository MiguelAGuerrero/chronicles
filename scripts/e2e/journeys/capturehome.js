// Capture from Chronicle (HC1-HC5, HC7, HC10, HC14, decision 0112): the app opens on Chronicle's Memories, which keeps a
// moment in one tap from its open line (the journal, decision 0154; the `journal` journey holds the line's own checks). Its own browser: an empty app first, then seeded moments, then
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

const stored = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const names = ['moment', 'walk', 'thread_member'];
    const tx = req.result.transaction(names, 'readonly');
    const all = (n) => new Promise((r) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => r(g.result); });
    // Each moment read back as its one piece with the moment's own fields (decision 0123).
    Promise.all(names.map(all)).then(([moments, walks, members]) => resolve({ captures: moments.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })), walks, members }));
  };
}));

const box = async (pg, sel) => {
  const b = await pg.locator(sel).filter({ visible: true }).first().boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
};
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function run(h) {
  const { url, BASE, check, shot, tabTo } = h;
  const { c, pg } = await h.freshPage('capturehome', { permissions: ['geolocation', 'microphone'] });
  await c.addInitScript(COUNT_GEO);
  const shown = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const there = (sel, timeout = 10000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
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

  // Memories is a journal since decision 0154: what the band's checks proved here (HC6-HC9, HC11-HC13, HC15 and the
  // audit's 2, 5, 8, 9, 11) is the open line's now, checked by the `journal` journey (JN2, JN9-JN15, JN18). What stays
  // here is the launch and the tabs, the walk minimized under Memories, the recording bar and Explore's one fix.

  // A note kept before the walk, so Days has a day to open (the bar's Edit offer, below).
  await pg.click('[data-testid=line-input]').catch(() => {});
  await pg.keyboard.type('A note before the walk.', { delay: 10 });
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=line-done]').catch(() => {});
  await pg.waitForTimeout(1500);

  // HC10, HC7, HC15: with a walk minimized, the band files into the walk, sits above the recording bar,
  // and the bar shows no camera on Memories (decision 0112).
  await tabTo(pg, 'navigate');
  await pg.waitForSelector('[data-testid=start]', { timeout: 15000 });
  await pg.click('[data-testid=start]');
  await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
  // A few steps along Wickenden Street, so the walk has a trace and a fresh fix to place by.
  const step = async (i) => {
    await c.setGeolocation({ longitude: h.at(-1 + i * 0.12, -1.5)[0], latitude: h.at(-1 + i * 0.12, -1.5)[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  };
  for (let i = 0; i < 6; i++) await step(i);
  // A photo from the bar on Explore, which leaves its Edit pill up (T12).
  const barPhoto = async () => {
    await tabTo(pg, 'explore');
    await pg.waitForSelector('[data-testid=bar-photo]', { timeout: 10000 }).catch(() => {});
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), pg.click('[data-testid=bar-photo]').catch(() => {})]);
    await chooser?.setFiles(require('path').join(h.scriptsDir, 'fixtures', 'photo.jpg'));
    return pg.waitForSelector('[data-testid=bar-edit-offer]', { timeout: 10000 }).then(() => true, () => false);
  };
  // tend tabs audit 16: the offer lives with the bar, so a screen opened over the tabs (a day's replay) ends it, as
  // decision 0149 says; back on the tabs the bar is whole and nothing breaks.
  {
    const up = await barPhoto();
    await tabTo(pg, 'chronicle', 'days');
    await pg.waitForSelector('[data-testid=day-row]', { timeout: 10000 }).catch(() => {});
    await pg.locator('[data-testid=day-row]').first().click().catch(() => {});
    await pg.waitForSelector('[data-testid=day-replay]', { timeout: 10000 }).catch(() => {});
    await pg.click('[data-testid=day-replay]').catch(() => {});
    const overTabs = await pg.waitForURL(/\/day\//, { timeout: 15000 }).then(() => true, () => false);
    await pg.waitForTimeout(800);
    await pg.goBack();
    const barBack = await pg.waitForSelector('[data-testid=recording-stats]', { timeout: 15000 }).then(() => true, () => false);
    await pg.waitForTimeout(600);
    const pillAfter = await pg.locator('[data-testid=bar-edit-offer]').count();
    const stats = await pg.locator('[data-testid=recording-stats]').innerText().catch(() => '');
    check(up && overTabs && barBack && pillAfter === 0 && /^\d+:\d\d · \d/.test(stats),
      `tend tabs audit 16: a day opened over the tabs ends the bar's Edit offer; back on the tabs the bar keeps its line and no pill is left (${up}, ${overTabs}, ${barBack}, ${pillAfter}, "${stats}")`);
  }
  // tend tabs audit 21: a photo from the bar on Explore leaves its Edit pill up, and it follows to Memories.
  const pillUp = await barPhoto();
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector(band, { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(600);
  const pillOnMemories = await shown('[data-testid=bar-edit-offer]');
  await shot(pg, 'tabs-T12-pill-on-memories');
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(500);
  await shot(pg, 'tabs-T12-pill-on-memories-320');
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(500);
  const walkBand = await box(pg, band);
  const barBox = await box(pg, '[data-testid=recording-bar]');
  check(!!walkBand && !!barBox && walkBand.y + walkBand.h <= barBox.y + 0.5 && !(await shown('[data-testid=bar-photo]')),
    `HC7: with a walk minimized, the band sits above the recording bar, which shows no camera on Memories (${JSON.stringify({ walkBand, barBox })})`);
  await pg.click('[data-testid=line-input]').catch(() => {});
  await pg.keyboard.type('Kept on the walk, from Memories.', { delay: 10 });
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=line-done]').catch(() => {});
  await pg.waitForTimeout(800);
  for (let i = 6; i < 10; i++) await step(i);
  const db = await stored(pg);
  const open = db.walks.find((w) => w.ended_at == null);
  const kept = db.captures.find((x) => x.body === 'Kept on the walk, from Memories.');
  check(!!open && !!kept && kept.walk_id === open.id,
    `HC10: a note from Memories with a walk minimized belongs to the walk (${kept && kept.walk_id} vs ${open && open.id})`);
  const pillAfterNote = await pg.locator('[data-testid=bar-edit-offer]').count();
  check(pillUp && pillOnMemories && pillAfterNote === 0,
    `tend tabs audit 21: the bar's Edit pill, up on Memories after a bar photo, ends with the next capture, a note from Memories' open line (${pillUp}, ${pillOnMemories}, ${pillAfterNote})`);
  await pg.click('[data-testid=recording-return]');
  await pg.waitForSelector('[data-testid=stop]', { timeout: 10000 });
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
  const placedNote = await pg.waitForFunction(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction(['moment'], 'readonly').objectStore('moment').getAll();
      g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).find((x) => x.body === 'Kept on the walk, from Memories.' && x.lat != null) ?? null);
    };
  }), null, { timeout: 15000, polling: 500 }).then((v) => v.jsonValue(), () => null);
  check(!!placedNote && placedNote.walk_id === open?.id, `HC10: the stopped walk placed the note as its own capture (${placedNote && [placedNote.lat, placedNote.lon]})`);
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
  ],
  run,
};
