// Where you are, now (specs/current-position, YH1-YH7; G17, decisions 0273, 0275): Explore reads one fresh fix each time it
// comes to the front (its tab's focus, or the app back from the back), by itself only while location is allowed; Navigate's
// ready map reads on the return too; no watch outlives a read; with location refused Explore says so quietly, until
// dismissed for the launch, draws no dot and says no walk time; a fix twenty minutes old stands in, muted and said, and
// any fix ages out past thirty minutes with nothing read. The GPS is Playwright's; an init script hangs it, refuses it,
// shifts the clock, sends the page to the back and counts the browser's watches. E2E_ONLY=position runs it alone.

const KIT = () => {
  let denied = false;
  try {
    denied = localStorage.getItem('e2e-geo-denied') === '1';
  } catch {}
  window.__geoDenied = denied;
  // Undecided again (iOS "Allow Once" expired, "Ask Next Time"): the permission reads "prompt".
  window.__geoPrompt = false;
  window.__clockShift = 0;
  window.__geoHang = false;
  window.__vis = 'visible';
  window.__open = new Set();
  window.__calls = 0;
  const now = Date.now;
  Date.now = () => now() + window.__clockShift;
  const g = navigator.geolocation;
  const watch = g.watchPosition.bind(g);
  const clear = g.clearWatch.bind(g);
  g.watchPosition = (ok, err, o) => {
    window.__calls++;
    let id;
    if (window.__geoDenied) {
      id = 9e6 + window.__calls;
      setTimeout(() => err && err({ code: 1, PERMISSION_DENIED: 1, message: 'User denied Geolocation' }), 30);
    } else if (window.__geoHang) id = 1e6 + window.__calls;
    else id = watch(ok, err, o);
    window.__open.add(id);
    return id;
  };
  g.clearWatch = (id) => {
    window.__open.delete(id);
    if (id < 1e6) clear(id);
  };
  // A site blocked in the browser's settings reads "denied" (the permissions API), as a person's Block does.
  const perms = navigator.permissions;
  if (perms && perms.query) {
    const q = perms.query.bind(perms);
    perms.query = (d) => (d && d.name === 'geolocation' && (window.__geoDenied || window.__geoPrompt)
      ? Promise.resolve({ state: window.__geoDenied ? 'denied' : 'prompt', onchange: null, addEventListener() {}, removeEventListener() {} })
      : q(d));
  }
  // The app going behind and coming back (react-native-web's AppState reads `visibilityState`).
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__vis });
  window.__away = () => {
    window.__vis = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    window.__vis = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
  };
};

const LOCATION_OFF_WEB = 'Location is off for this site. Turn it on in your browser’s or your phone’s settings to see where you are.';

async function run(h) {
  const { snapWorld } = h;
  // Cranston, a second town 4 km west of Providence (the snap journey's world).
  snapWorld.serve = true;
  try {
    await journey(h);
  } finally {
    snapWorld.serve = false;
  }
}

async function journey(h) {
  const { exploreUrl, at, check, shot, freshPage, tabTo } = h;
  const { c, pg } = await freshPage('position');
  await c.addInitScript(KIT);
  const fox = at(1, 0);
  const fox300 = at(4, 0);
  // About 150 m east of Cranston's own point, so the dot and the town's point are told apart in the pictures (current-position audit 8).
  const cranston = at(-38.5, 2);
  const near = (s, p, tol = 1e-4) => !!s && s.split(',').map(Number).every((v, i) => Math.abs(v - p[i]) < tol);
  // The dot on the map in front (Explore's or the ready map's), '' with none.
  const walker = () => pg.evaluate(() => {
    const el = [...document.querySelectorAll('[data-walker]')].find((e) => !e.closest('[aria-hidden=true]') && e.getBoundingClientRect().width > 0);
    return el ? { at: el.getAttribute('data-walker') ?? '', muted: el.getAttribute('data-walker-muted') ?? '' } : { at: '', muted: '' };
  });
  const tiles = () => pg.locator('[data-testid=atlas-tile]').evaluateAll((els) => els.filter((e) => !e.closest('[aria-hidden=true]')).map((e) => ({ name: e.dataset.name, selected: e.dataset.selected, text: e.innerText.replace(/\s+/g, ' ').trim() })));
  // The notice slot's text: a Banner (`lift-in`) over the map; the stand-in's line has no ✕ (current-position audit 5).
  const banner = async () => (await pg.locator('[data-testid=lift-in]').filter({ visible: true }).allInnerTexts().catch(() => [])).join(' ').replace(/\s+/g, ' ').trim();
  const said = async () => ((await pg.locator('[data-testid=atlas-snap-said]').textContent().catch(() => '')) ?? '');
  const open = () => pg.evaluate(() => window.__open.size);
  const calls = () => pg.evaluate(() => window.__calls);
  const until = async (ok, ms) => {
    for (const end = Date.now() + ms; Date.now() < end; await pg.waitForTimeout(250)) if (await ok()) return true;
    return false;
  };
  const shots = async (name) => {
    const vp = pg.viewportSize();
    await shot(pg, `${name}-390`);
    await pg.setViewportSize({ width: 320, height: vp.height });
    await pg.waitForTimeout(900);
    await shot(pg, `${name}-320`);
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(400);
  };
  const walkWords = (ts) => ts.filter((t) => / min walk|away|from you/.test(t.text)).map((t) => t.name);

  // Launched at Fox Point.
  await c.setGeolocation({ longitude: fox[0], latitude: fox[1], accuracy: 6 });
  await pg.goto(exploreUrl);
  await pg.waitForSelector('[data-testid=atlas-tile]', { timeout: 60000 }).catch(() => {});
  await until(async () => near((await walker()).at, fox), 20000);
  await pg.waitForTimeout(1500);

  // 1. The Done when: the GPS moves to Cranston while the page is in the back; brought to the front, Explore leads with it.
  await c.setGeolocation({ longitude: cranston[0], latitude: cranston[1], accuracy: 6 });
  await pg.evaluate(() => window.__away());
  await until(async () => near((await walker()).at, cranston) && (await tiles())[0]?.name === 'Cranston', 30000);
  await pg.waitForTimeout(1500);
  const t1 = await tiles();
  const w1 = await walker();
  check(near(w1.at, cranston) && t1[0]?.name === 'Cranston' && /You’re here/.test(t1[0]?.text ?? '') && t1[0]?.selected === '1', `YH1: back at the front after a drive, Explore leads with the town you stand in, "You're here", the dot there (${w1.at}; ${JSON.stringify(t1.slice(0, 2))})`);
  check((await open()) === 0, `YH3: after the return's read on Explore no watch is open (${await open()})`);
  await shots('yh-moved');
  const onTop = await pg.evaluate(() => {
    const el = document.querySelector('[data-testid=walker-dot]');
    if (!el) return 'no walker-dot';
    // Both are pointer-events: none on the map; made hittable for the probe alone, the one drawn on top answers.
    const marks = [el, ...document.querySelectorAll('[data-testid=area-point]')];
    for (const m of marks) m.style.pointerEvents = 'auto';
    const pt = document.querySelector('[data-testid=area-point][data-name="Cranston"]');
    const r = (pt ?? el).getBoundingClientRect();
    const w = el.getBoundingClientRect();
    // Over the town's point itself: the walker's dot moved onto it for the probe.
    const was = el.style.transform;
    el.style.transform = `translate(${r.x + r.width / 2 - (w.x + w.width / 2)}px, ${r.y + 6 - (w.y + w.height / 2)}px) ${was}`;
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + 6);
    el.style.transform = was;
    for (const m of marks) m.style.pointerEvents = 'none';
    return hit && hit.closest('[data-testid=walker-dot]') ? 'walker' : hit?.closest('[data-testid=area-point]') ? 'area point' : `other: ${hit?.tagName}`;
  });
  check(onTop === 'walker', `current-position audit 8: the walker's dot draws over a town's point (${onTop})`);
  // ... and Plan an outing plans around it (its own read, fix outing-current-position).
  await pg.click('[data-testid=outing-entry]').catch(() => {});
  await pg.waitForSelector('[data-testid=outing]', { timeout: 15000 }).catch(() => {});
  await until(async () => near(await pg.evaluate(() => document.querySelector('[data-testid=outing] [data-walker]')?.getAttribute('data-walker') ?? ''), cranston), 20000);
  const wo = await pg.evaluate(() => document.querySelector('[data-testid=outing] [data-walker]')?.getAttribute('data-walker') ?? '');
  check(near(wo, cranston), `YH7: the Done when: Plan an outing, opened after the return, plans around Cranston (${wo})`);
  await pg.click('[data-testid=outing-close]').catch(() => {});
  await pg.waitForSelector('[data-testid=outing]', { state: 'detached', timeout: 10000 }).catch(() => {});

  // 2. The tab's focus reads too: back at Fox Point, Chronicle, then Explore.
  await tabTo(pg, 'chronicle', 'memories');
  await c.setGeolocation({ longitude: fox[0], latitude: fox[1], accuracy: 6 });
  await pg.waitForTimeout(500);
  await tabTo(pg, 'explore');
  await until(async () => near((await walker()).at, fox) && (await tiles())[0]?.name === 'Providence', 30000);
  const t2 = await tiles();
  check(near((await walker()).at, fox) && t2[0]?.name === 'Providence' && /You’re here/.test(t2[0]?.text ?? ''), `YH1: the tab's focus reads a fix: back at Fox Point, Explore leads with Providence, "You're here" (${JSON.stringify(t2.slice(0, 2))})`);

  // 2b. Forty minutes away from Explore with the GPS hung: at its front the old fix says no "You're here" while it reads.
  await tabTo(pg, 'chronicle', 'memories');
  await pg.evaluate(() => { window.__geoHang = true; window.__clockShift = 40 * 60_000; });
  await tabTo(pg, 'explore');
  await pg.waitForTimeout(1000);
  const t2b = await tiles();
  check(!t2b.some((t) => /You’re here/.test(t.text)) && (!(await walker()).at || (await walker()).muted === '1'), `current-position audit 4: at a front with no fresh read, an old fix never says "You're here" (${JSON.stringify(t2b.slice(0, 2))}; ${JSON.stringify(await walker())})`);
  await pg.evaluate(() => { window.__geoHang = false; window.__clockShift = 0; });
  await pg.evaluate(() => window.__away());
  await until(async () => near((await walker()).at, fox) && (await walker()).muted === '0', 20000);

  // 3. A pick kept: a neighbouring town picked, then a read 300 m on within the same town.
  await pg.waitForTimeout(1000);
  const other = t2.find((t) => t.name !== 'Providence');
  if (other) await pg.click(`[data-testid=atlas-tile][data-name="${other.name}"]`).catch(() => {});
  await pg.waitForTimeout(2500);
  const camBefore = await pg.evaluate(() => [...document.querySelectorAll('[data-center]')].find((e) => !e.closest('[aria-hidden=true]'))?.getAttribute('data-center') ?? '');
  await tabTo(pg, 'chronicle', 'memories');
  await c.setGeolocation({ longitude: fox300[0], latitude: fox300[1], accuracy: 6 });
  await pg.waitForTimeout(500);
  await tabTo(pg, 'explore');
  await until(async () => near((await walker()).at, fox300), 20000);
  await pg.waitForTimeout(2500);
  const t3 = await tiles();
  const camAfter = await pg.evaluate(() => [...document.querySelectorAll('[data-center]')].find((e) => !e.closest('[aria-hidden=true]'))?.getAttribute('data-center') ?? '');
  check(!!other && near((await walker()).at, fox300) && t3.find((t) => t.name === other.name)?.selected === '1' && near(camAfter, camBefore.split(',').map(Number), 2e-4), `YH1: a read 300 m on within the same town keeps the pick and the frame (${other?.name}; ${camBefore} -> ${camAfter}; ${JSON.stringify(t3.slice(0, 3))})`);

  // 4. Navigate's ready map reads on the return too.
  await tabTo(pg, 'navigate');
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 }).catch(() => {});
  await until(async () => near((await walker()).at, fox300), 20000);
  await c.setGeolocation({ longitude: cranston[0], latitude: cranston[1], accuracy: 6 });
  await pg.evaluate(() => window.__away());
  await until(async () => near((await walker()).at, cranston), 30000);
  check(near((await walker()).at, cranston), `YH2: Navigate's ready map reads one fix when the app returns to the front (${(await walker()).at})`);
  await pg.waitForTimeout(1000);
  check((await open()) === 0, `YH3: after the return's read on Navigate no watch is open (${await open()})`);

  // 5. A read that hangs ends at its timeout; a tab left mid-read ends its read.
  await pg.evaluate(() => { window.__geoHang = true; });
  await pg.evaluate(() => window.__away());
  await pg.waitForTimeout(1000);
  const hungOpen = await open();
  await pg.waitForTimeout(11000);
  check(hungOpen >= 1 && (await open()) === 0, `YH3: a read that finds nothing ends its own watch at its timeout (${hungOpen} open while reading, ${await open()} after)`);
  await tabTo(pg, 'explore');
  await pg.waitForTimeout(800);
  const readingOpen = await open();
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForTimeout(1200);
  check(readingOpen >= 1 && (await open()) === 0, `YH3: Explore left mid-read ends its read's watch at once (${readingOpen} open while reading, ${await open()} after)`);

  // 6. No fresh fix in time, the clock twenty minutes on: the held fix stands in, muted and said.
  await pg.evaluate(() => { window.__clockShift = 20 * 60_000; });
  await tabTo(pg, 'explore');
  await until(async () => /^From where you were/.test(await banner()), 25000);
  await pg.waitForTimeout(1000);
  const b6 = await banner();
  const w6 = await walker();
  const t6 = await tiles();
  check(b6.startsWith('From where you were twenty minutes ago.') && w6.muted === '1' && !!w6.at && !t6.some((t) => /You’re here/.test(t.text)), `YH6: no fresh fix in time, a fix twenty minutes old stands in: said, its dot muted, nothing says "You're here" ("${b6}", ${JSON.stringify(w6)})`);
  await shots('yh-earlier');

  // 7. Left in front past thirty minutes: the stand-in ages out with nothing read.
  const c7 = await calls();
  await pg.evaluate(() => { window.__clockShift = 31 * 60_000; });
  await until(async () => !(await walker()).at, 25000);
  await pg.waitForTimeout(800);
  const t7 = await tiles();
  check(!(await walker()).at && !t7.some((t) => /You’re here/.test(t.text)) && walkWords(t7).length === 0 && !/From where you were/.test(await banner()) && (await calls()) === c7, `YH6: Explore in front 31 minutes after its read: no "You're here", no full dot, no read (${JSON.stringify(t7.slice(0, 2))}; ${(await calls()) - c7} reads)`);
  await shots('yh-aged');

  // 7b. A fix read now, then thirty-one minutes in front: the same, with nothing read.
  await pg.evaluate(() => { window.__geoHang = false; window.__clockShift = 0; });
  await pg.evaluate(() => window.__away());
  await until(async () => near((await walker()).at, cranston) && (await walker()).muted === '0', 20000);
  await pg.evaluate(() => { window.__geoHang = true; });
  // The owner's "After 5 minutes": six minutes on in front, the fix is muted and said, counting on.
  await pg.evaluate(() => { window.__clockShift = 6 * 60_000; });
  await until(async () => /From where you were six minutes ago/.test(await banner()), 25000);
  check((await walker()).muted === '1' && /^From where you were six minutes ago\./.test(await banner()) && !(await tiles()).some((t) => /You’re here/.test(t.text)), `current-position audit 4: a fix read in front, six minutes on, is drawn muted and said ("${await banner()}")`);
  check((await pg.locator('[data-testid=banner-dismiss]').filter({ visible: true }).count()) === 0, `current-position audit 5: the stand-in's line has no ✕ ("${await banner()}")`);
  await shots('yh-five-minutes');
  // Undecided again on the return ("Allow Once" expired): nothing asks, nothing is read, nothing says location is off.
  await pg.evaluate(() => { window.__geoHang = false; window.__clockShift = 0; });
  await pg.evaluate(() => window.__away());
  await until(async () => near((await walker()).at, cranston) && (await walker()).muted === '0', 20000);
  await pg.evaluate(() => { window.__geoPrompt = true; });
  const c7a = await calls();
  await pg.evaluate(() => window.__away());
  await pg.waitForTimeout(2500);
  check((await calls()) === c7a && !(await banner()).startsWith('Location is off') && !!(await walker()).at, `current-position audit 1: undecided on the return, Explore reads nothing, asks nothing and says nothing of location being off (${(await calls()) - c7a} reads; "${await banner()}")`);
  await pg.evaluate(() => { window.__geoPrompt = false; window.__geoHang = true; });
  const c7b = await calls();
  await pg.evaluate(() => { window.__clockShift = 31 * 60_000; });
  await until(async () => !(await walker()).at, 25000);
  const t7b = await tiles();
  check(!(await walker()).at && !t7b.some((t) => /You’re here/.test(t.text)) && (await calls()) === c7b, `YH6: a fix read in front, thirty-one minutes on with no read: no dot, no "You're here" (${JSON.stringify(t7b.slice(0, 2))}; ${(await calls()) - c7b} reads)`);

  // 8. Refused (the site blocked), after a reload: the quiet notice, said; no dot; no walk time; the areas where they were.
  await pg.evaluate(() => { window.__geoHang = false; window.__clockShift = 0; localStorage.setItem('e2e-geo-denied', '1'); });
  await pg.reload();
  await pg.waitForSelector('[data-testid=atlas-tile]', { timeout: 60000 }).catch(() => {});
  await until(async () => (await banner()).startsWith(LOCATION_OFF_WEB), 20000);
  await pg.waitForTimeout(1500);
  const b8 = await banner();
  const t8 = await tiles();
  check(b8.startsWith(LOCATION_OFF_WEB) && (await said()).replace(/​/g, '') === LOCATION_OFF_WEB, `YH4: location refused, Explore says so in the quiet notice, with where to turn it on, said to a screen reader ("${b8}"; "${await said()}")`);
  check(!(await walker()).at && t8.length > 0 && !t8.some((t) => /You’re here/.test(t.text)), `YH5: refused, no walker dot and nothing says "You're here"; the areas stay listed (${JSON.stringify(t8.slice(0, 2))})`);
  check(t8.length > 0 && walkWords(t8).length === 0, `YH5: refused, no area says a walk time or distance (${JSON.stringify(t8.slice(0, 3))})`);
  await shots('yh-refused');
  const title = ((await pg.locator('[data-testid=atlas-title]').innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  const rowLabel = await pg.evaluate(() => [...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).find((l) => /^(Towns|Areas) (near|around) /.test(l ?? '')) ?? '');
  check(/^Around /.test(title) && !/you/i.test(title) && /^(Towns|Areas) around (?!you)/.test(rowLabel), `current-position audit 7: refused, the title and the row say where the list is around, never near or around you ("${title}"; "${rowLabel}")`);
  // The selected town is framed, its point and name in view at 320.
  await pg.setViewportSize({ width: 320, height: 844 });
  await pg.waitForTimeout(1500);
  const sel = await pg.evaluate(() => {
    const el = document.querySelector('[data-testid=area-point][data-selected="1"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), name: el.getAttribute('data-name') };
  });
  check(!!sel && sel.left >= 0 && sel.right <= 320, `current-position audit 9: with location refused the selected town's point and name are in view at 320 (${JSON.stringify(sel)})`);
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(600);
  // A town's page with no fix: no subtitle and no empty line.
  const lead = (await tiles())[0];
  if (lead) {
    await pg.click(`[data-testid=atlas-tile][data-name="${lead.name}"]`).catch(() => {});
    await pg.waitForSelector('[data-testid=atlas-back-pill]', { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(1500);
  }
  const sub = await pg.locator('[data-testid=explore-subtitle]').count();
  check(!!lead && (await pg.locator('[data-testid=atlas-back-pill]').count()) === 1 && sub === 0, `current-position audit 10: a town's page with no fix has no subtitle and no empty line (${lead?.name}; ${sub})`);
  await shots('yh-town-nofix');
  await pg.click('[data-testid=atlas-back-pill]').catch(() => {});
  await pg.waitForTimeout(1200);
  // Walk there with no position asks first (the card opens); nothing starts and no destination is kept.
  await pg.locator('[data-testid=tile-walk]').filter({ visible: true }).first().click().catch(() => {});
  await pg.waitForTimeout(1500);
  check((await pg.locator('[data-testid=atlas-card]').filter({ visible: true }).count()) === 1 && !/\/walk/.test(pg.url()), `current-position audit 2: with no position, Walk there asks first (${pg.url()})`);
  await pg.click('[data-testid=atlas-card-close]').catch(() => {});
  await pg.waitForTimeout(800);
  // Each time it comes to the front, until dismissed.
  const s8 = await said();
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForTimeout(600);
  await tabTo(pg, 'explore');
  await until(async () => (await said()) !== s8, 10000);
  check((await banner()).startsWith(LOCATION_OFF_WEB) && (await said()) !== s8, `YH4: each time Explore comes to the front with location refused it says the notice again ("${await banner()}")`);
  // The outing page open, the app returns: the page says it, Explore waits (one notice said).
  await pg.click('[data-testid=outing-entry]').catch(() => {});
  await pg.waitForSelector('[data-testid=outing]', { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  const s9 = await said();
  await pg.evaluate(() => window.__away());
  await pg.waitForTimeout(2500);
  const outingSaid = ((await pg.locator('[data-testid=outing-position-said]').textContent().catch(() => '')) ?? '').replace(/​/g, '').trim();
  check((await said()) === s9 && /^Location is off for this site\./.test(outingSaid), `YH4: outing page open, the app returns refused: one notice said (Explore's region unchanged; the page's "${outingSaid}")`);
  await pg.click('[data-testid=outing-close]').catch(() => {});
  await pg.waitForSelector('[data-testid=outing]', { state: 'detached', timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  // Dismissed, it stays dismissed until the next launch.
  await pg.locator('[data-testid=banner-dismiss]').filter({ visible: true }).first().click().catch(() => {});
  await pg.waitForTimeout(500);
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForTimeout(600);
  await tabTo(pg, 'explore');
  await pg.waitForTimeout(2500);
  const b10 = await banner();
  check(!b10.startsWith(LOCATION_OFF_WEB) && !(await walker()).at, `YH4: a dismissed notice stays dismissed until the next launch, and still no dot ("${b10}")`);
  await shots('yh-refused-dismissed');
  await pg.reload();
  await pg.waitForSelector('[data-testid=atlas-tile]', { timeout: 60000 }).catch(() => {});
  await until(async () => (await banner()).startsWith(LOCATION_OFF_WEB), 20000);
  check((await banner()).startsWith(LOCATION_OFF_WEB), `YH4: the next launch says it again ("${await banner()}")`);
  check((await open()) === 0, `YH3: refused, no watch is left open (${await open()})`);
  await pg.evaluate(() => localStorage.removeItem('e2e-geo-denied'));
  await c.close();
}

module.exports = {
  name: 'position',
  covers: [
    'src/lib/locate/**',
    'src/lib/lastFix.ts',
    'src/app/(tabs)/explore.tsx',
    'src/components/walk/useReady.tsx',
  ],
  run,
};
