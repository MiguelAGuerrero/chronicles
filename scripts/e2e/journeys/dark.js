// After dark (DK1, DK3-DK5, DK10, DK12-DK16): the fourth layer on Explore, Navigate and the live walk, from a fake Overpass
// answer (the harness's darkWorld), with the browser's clock set after sunset and by day in Providence. E2E_ONLY=dark runs it.

// Providence: sunset on Dec 15, 2026 is about 21:16 UTC (4:16 pm EST).
const NIGHT = new Date('2026-12-15T23:30:00Z'); // 6:30 pm
const DAY = new Date('2026-12-15T17:00:00Z'); // noon
const TZ = 'America/New_York';

async function run(h) {
  const { url, exploreUrl, navUrl, BASE, at, check, shot, freshPage, overpassAsked, darkWorld, switchLayer, routed, hosts, OVERPASS_HOST } = h;
  const darkAsked = () => overpassAsked.filter((q) => decodeURIComponent(q.body ?? '').includes('opening_hours')).length;
  const attr = (pg, name) => pg.locator(`[${name}]`).first().getAttribute(name).catch(() => null);
  const waitDark = (pg, want, timeout = 30000) => pg.waitForFunction((w) => {
    const v = document.querySelector('[data-dark]')?.getAttribute('data-dark') ?? '';
    return w.test(v);
  }, want, { timeout }).catch(() => {});
  const panelLine = async (pg) => {
    if (!(await pg.locator('[data-testid=layers-panel]').count())) await pg.click('[data-testid=layers]').catch(() => {});
    const t = await pg.locator('[data-testid=layer-status-dark]').innerText({ timeout: 5000 }).catch(() => '');
    await pg.click('[data-testid=layers]').catch(() => {});
    return t.trim();
  };
  const tryLayer = (pg, id, on = true) => switchLayer(pg, id, on).then(() => true, () => false);

  // DK13, DK1, DK3, DK4, DK5: Explore after sunset.
  darkWorld.mode = 'mixed';
  const { c, pg } = await freshPage('dark', { timezoneId: TZ });
  await pg.clock.setSystemTime(NIGHT);
  await pg.goto(exploreUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await pg.waitForTimeout(3000);
  check(darkAsked() === 0 && !(await attr(pg, 'data-dark')), `DK13: with the layer off nothing is asked and nothing drawn (${darkAsked()} requests)`);
  await shot(pg, 'dark-rest');
  await pg.click('[data-testid=layers]');
  const row = pg.locator('[data-testid=layer-dark]');
  const rowText = (await row.innerText({ timeout: 5000 }).catch(() => '')).trim();
  const moon = await pg.locator('[data-testid=layer-dark-icon]').count().catch(() => 0);
  check(/After dark/.test(rowText) && moon === 1 && (await row.getAttribute('aria-checked').catch(() => null)) === 'false', `DK1: the panel lists After dark with a moon, off (${JSON.stringify(rowText)})`);
  // DK2: what a cold eye has to go on: the Layers button in view, and the row's word in ink, not a test id. The cold find
  // itself is the ux-reviewer's, from the pictures (decision 0167; the spec's record).
  const seen = await pg.evaluate(() => {
    const b = document.querySelector('[data-testid=layers]')?.getBoundingClientRect();
    const r = document.querySelector('[data-testid=layer-dark]');
    const style = r ? getComputedStyle(r.querySelector('div[dir], div') ?? r) : null;
    return { button: !!b && b.width >= 44 && b.top >= 0 && b.bottom <= innerHeight, word: !!r && /After dark/.test(r.textContent ?? '') && style?.opacity !== '0' && style?.visibility !== 'hidden' };
  });
  check(seen.button && seen.word, `DK2: the Layers button is in view and the row says After dark in ink (${JSON.stringify(seen)})`);
  check(/Lit streets, places open/.test(rowText), `after-dark ui 1: the switch says under its name what it shows (${JSON.stringify(rowText)})`);
  await shot(pg, 'dark-panel');
  await pg.click('[data-testid=layers]').catch(() => {});
  const switched = await tryLayer(pg, 'dark');
  await waitDark(pg, /^lit:\d+\|open:\d+$/);
  const drawn = await attr(pg, 'data-dark');
  check(switched && drawn === 'lit:2|open:1', `DK1, DK3, DK4: on, the map draws the two lit streets and the one place open now; unlit, untagged, closed and unreadable draw nothing (${drawn})`);
  check(darkAsked() > 0 && overpassAsked.filter((q) => decodeURIComponent(q.body ?? '').includes('opening_hours')).every((q) => q.method === 'POST' && !/lat=|lon=/.test(q.url)), 'DK8: the tiles are asked of Overpass by box, by POST');
  const night = await panelLine(pg);
  check(night === 'Open now. Only what is mapped.', `DK5: after sunset the panel line says Open now (${JSON.stringify(night)})`);
  await shot(pg, 'dark-explore');
  await pg.click('[data-testid=layers]');
  await pg.waitForSelector('[data-testid=layer-status-dark]', { timeout: 5000 });
  await shot(pg, 'dark-panel-on');
  await pg.click('[data-testid=layers]');
  // DK15: nothing is sent again while nothing changes.
  const sets = Number((await attr(pg, 'data-dark-sets')) ?? 0);
  await pg.waitForTimeout(4000);
  check(sets > 0 && Number((await attr(pg, 'data-dark-sets')) ?? 0) === sets, `DK15: the drawing is sent once and not again while nothing changes (${sets})`);

  // DK5: by day, the reading is an hour after tonight's sunset.
  await pg.clock.setSystemTime(DAY);
  await pg.reload();
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await waitDark(pg, /^lit:/);
  const day = await panelLine(pg);
  check(day === 'Open after sunset. Only what is mapped.', `DK5: by day the panel line says Open after sunset (${JSON.stringify(day)})`);
  check((await attr(pg, 'data-dark')) === 'lit:2|open:1', 'DK4: by day, the bar open after sunset is marked and the bookshop, closed by then, is not');

  // DK1, DK12: the same setting draws on Navigate, and the legend is in its settings drawer.
  await pg.clock.setSystemTime(NIGHT);
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await waitDark(pg, /^lit:/);
  check(/^lit:2\|open:1$/.test((await attr(pg, 'data-dark')) ?? ''), 'DK1: one setting for every map: Navigate draws the layer too');
  await h.drawerTo(pg, 'up').catch(() => {});
  const key = await pg.locator('[data-testid=layers-key]').innerText({ timeout: 5000 }).catch(() => '');
  check(/Lit streets/.test(key) && /Open after dark/.test(key) && /On a route after dark/.test(key) && /Only what is mapped: a street with no lighting mapped may still be lit\./.test(key), `DK12: the legend in Navigate's settings names the three and the note (${JSON.stringify(key.slice(0, 200))})`);
  await shot(pg, 'dark-legend');
  await c.close();

  // DK14: Overpass refusing: no guess, and the panel says so.
  darkWorld.mode = 'busy';
  const { c: c2, pg: p2 } = await freshPage('dark-busy', { timezoneId: TZ });
  await p2.clock.setSystemTime(NIGHT);
  await p2.goto(exploreUrl);
  await p2.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await tryLayer(p2, 'dark');
  await p2.waitForTimeout(6000);
  const busyLine = await panelLine(p2);
  check(busyLine === 'Not available now' && !(await attr(p2, 'data-dark')), `DK14: with Overpass refusing, the panel says Not available now and nothing is drawn (${JSON.stringify(busyLine)})`);
  await c2.close();
  // The refusal is the point of this page: the browser logs the 429 it was made to receive, which is not an error of the app's.
  for (let i = h.errors.length - 1; i >= 0; i--) if (/^dark-busy: .*status of 429/.test(h.errors[i])) h.errors.splice(i, 1);

  // DK10: a navigated walk after sunset over streets mapped as unlit: a line, the moon, the route unchanged.
  darkWorld.mode = 'unlit';
  const { c: c3, pg: p3 } = await freshPage('dark-headsup', { timezoneId: TZ, touch: true });
  await c3.addInitScript(() => {
    window.__buzz = [];
    navigator.vibrate = (p) => { window.__buzz.push(p); return true; };
    // The browser's clock is set to an evening a month on; its fixes carry the real time, so they would read as a month old.
    // Each fix is stamped with the page's own clock, as a phone's would be.
    const g = navigator.geolocation;
    const now = (ok) => (p) => ok({ coords: p.coords, timestamp: Date.now() });
    const watch = g.watchPosition.bind(g);
    const once = g.getCurrentPosition.bind(g);
    g.watchPosition = (ok, err, o) => watch(now(ok), err, o);
    g.getCurrentPosition = (ok, err, o) => once(now(ok), err, o);
  });
  await p3.clock.setSystemTime(NIGHT);
  await p3.goto(navUrl);
  await p3.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await p3.click('[data-testid=start]');
  await p3.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 }).catch(() => {});
  const s0 = at(-0.5, -0.5);
  await c3.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
  await p3.waitForTimeout(2500);
  // A fix stamped in the same instant the walk starts can fall a few milliseconds before it, and the walk keeps none from before
  // its start: fixes are sent until the open walk holds one from after its start.
  const kept = () => p3.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'trace_point'], 'readonly');
      const w = tx.objectStore('walk').getAll();
      const t = tx.objectStore('trace_point').getAll();
      tx.oncomplete = () => {
        const open = w.result.find((x) => x.open);
        resolve(!!open && t.result.some((p) => p.walk_id === open.id && p.t >= open.started_at));
      };
    };
    req.onerror = () => resolve(false);
  }));
  for (let i = 1; i <= 20 && !(await kept()); i++) {
    await c3.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002 * (i + 1), accuracy: 6 });
    await p3.waitForTimeout(500);
  }
  await p3.waitForTimeout(1000);
  await tryLayer(p3, 'dark');
  // The destination is kept with the open walk, and a reload routes to it on the first fix (as a reload mid-walk does): the
  // route does not wait on the walk map's camera, which a browser clock moved a month on cannot be trusted to move.
  await p3.evaluate((dest) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'meta'], 'readwrite');
      const g = tx.objectStore('walk').getAll();
      g.onsuccess = () => {
        const open = g.result.find((w) => w.open);
        tx.objectStore('meta').put({ key: 'nav', value: JSON.stringify({ walk_id: open?.id ?? null, dest: { at: dest, label: 'Your spot', kind: 'point' } }) });
      };
      tx.oncomplete = () => resolve();
    };
  }), at(2, 2));
  await p3.reload();
  // Direct, if a scenic route is offered too (scenic routes, SR2).
  await routed(p3, 45000).catch(() => {});
  await p3.waitForSelector('[data-testid=nav-bar]', { timeout: 15000 }).catch(() => {});
  const navText = await p3.locator('[data-testid=nav-bar]').innerText({ timeout: 5000 }).catch(() => '');
  // The line, once it has words (it is polled: the route's tiles are read while it comes).
  let line = '';
  const until = Date.now() + 45000;
  while (Date.now() < until && !line) {
    line = (await p3.locator('[data-testid=walk-ahead]').innerText({ timeout: 500 }).catch(() => '')).replace(/[^\x20-\x7e]/g, '').trim();
    if (!line) await p3.waitForTimeout(250);
  }
  check(/^Next: (Grid -?\d Street is mapped as unlit|a stretch mapped as unlit)$/.test(line), `DK10: after sunset, a line says a stretch mapped as unlit is ahead (${JSON.stringify(line)})`);
  check((await p3.locator('[data-testid=walk-ahead] [data-testid=walk-ahead-moon]').count()) === 1 && (await p3.locator('[data-testid=walk-ahead] [data-testid=walk-badge-car]').count()) === 0, 'DK10: it wears the moon, never the car');
  check((await p3.evaluate(() => window.__buzz.length)) === 0, 'DK10: nothing buzzed');
  const words = (t) => t.replace(/\d+([.,]\d+)?/g, '#');
  check(navText !== '' && words(await p3.locator('[data-testid=nav-bar]').innerText().catch(() => '')) === words(navText), 'DK10: the route is unchanged');
  await shot(p3, 'dark-headsup');
  await p3.click('[data-testid=nav-end]').catch(() => {});
  await c3.close();

  // DK16: Chronicle's map and the replay never draw the layer, even with it on.
  darkWorld.mode = 'mixed';
  const { c: c4, pg: p4 } = await freshPage('dark-chronicle', { timezoneId: TZ });
  await p4.clock.setSystemTime(NIGHT);
  await p4.goto(exploreUrl);
  await tryLayer(p4, 'dark');
  await waitDark(p4, /^lit:/);
  await p4.goto(url);
  await p4.waitForTimeout(3000);
  check((await p4.locator('[data-dark]').count()) === 0, 'DK16: Chronicle draws no after-dark data');
  await c4.close();
  darkWorld.mode = 'mixed';
  // Overpass is the one host after dark adds to (it was walkability's already, decision 0093): what it was sent is asserted above
  // (DK8: a tile's box, by POST), so the nothing-leaves check, strict for every other journey, is not asked about it here.
  const away = [...hosts].filter((x) => !x.startsWith('localhost') && x !== 'tiles.openfreemap.org' && x !== h.OVERTURE_HOST && x !== OVERPASS_HOST);
  check(away.length === 0, `DK8: after dark sends nothing but a tile's box to Overpass, and nothing to anyone else (${away.join(', ')})`);
  hosts.delete(OVERPASS_HOST);
}

module.exports = {
  name: 'dark',
  covers: [
    'src/lib/dark/**',
    'src/lib/net/overpassGate.ts',
    'src/lib/layers/{registry,notes}.ts',
    'src/components/LayersControl.tsx',
    'src/components/map/{types.ts,WalkMap.web.tsx}',
    'src/lib/walk/{ahead,useRouteWarning}.ts',
    'src/app/walk.tsx',
  ],
  run,
};
