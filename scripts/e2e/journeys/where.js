// Where I've been (specs/where-ive-been, WB1-WB6, WB8, WB9, WB11, WB12, WB16, WB17): the walk screen without the
// unwalked-streets button, and the "Where I've been" layer drawing earlier walks' lines near the map on the walk screen
// and Explore. Two closed walks are written into storage (one near, one 8 km away), so the layer has something to draw
// and something to leave out. E2E_ONLY=where runs it alone.

async function run(h) {
  const { navUrl, BASE, at, check, shot, freshPage, openWalk, tabTo, drawerTo, switchLayer, nothingLeaves } = h;
  const { c, pg } = await freshPage('where');
  await c.addInitScript(() => { window.__perf = {}; });
  const attr = (name) => pg.locator(`[${name}]`).last().getAttribute(name).catch(() => null);
  const past = async () => ((await attr('data-past')) ?? '').split('|').filter(Boolean).sort();
  const sends = () => pg.evaluate(() => window.__perf['past:send'] ?? 0);
  const waitPast = async (want, timeout = 30000) => {
    const until = Date.now() + timeout;
    while (Date.now() < until && !want(await past())) await pg.waitForTimeout(500);
    return past();
  };
  const panelOpen = async () => {
    if (!(await pg.locator('[data-testid=layers-panel]').count())) await pg.click('[data-testid=layers]');
    await pg.waitForSelector('[data-testid=layers-panel]', { timeout: 5000 });
  };
  const closePanel = async () => {
    if (await pg.locator('[data-testid=layers-panel]').count()) await pg.click('[data-testid=layers]');
  };
  const isOn = async () => (await pg.locator('[data-testid=layer-past]').getAttribute('aria-checked').catch(() => null)) === 'true';

  // Two earlier walks, closed: one along the street south of the start, one 8 km east.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  const now = Date.now();
  const along = (id, from, to, t0) => {
    const pts = [];
    const n = 40;
    for (let k = 0; k <= n; k++) {
      const p = at(from[0] + ((to[0] - from[0]) * k) / n, from[1] + ((to[1] - from[1]) * k) / n);
      pts.push({ walk_id: id, t: t0 + k * 4000, lon: p[0], lat: p[1], accuracy_m: 6, speed: 1.4, course: null });
    }
    return pts;
  };
  const seeds = [
    { id: 'past-near', t0: now - 50 * 3600_000, pts: along('past-near', [-2, -1], [1, -1], now - 50 * 3600_000) },
    { id: 'past-far', t0: now - 26 * 3600_000, pts: along('past-far', [80, 0], [82, 0], now - 26 * 3600_000) },
  ];
  await pg.evaluate((walks) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'trace_point'], 'readwrite');
      for (const w of walks) {
        tx.objectStore('walk').put({ id: w.id, started_at: w.t0, ended_at: w.t0 + 200_000, title: null, epilogue: null, open: false, area: null, snapped_build: null });
        for (const p of w.pts) tx.objectStore('trace_point').add(p);
      }
      tx.oncomplete = () => resolve(true);
    };
  }), seeds);
  await pg.reload();
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await pg.waitForTimeout(1500);
  await shot(pg, 'where-00-ready');

  // WB4: the Layers panel lists "Where I've been", off; nothing drawn yet.
  await panelOpen();
  const row = pg.locator('[data-testid=layer-past]');
  check.todo((await row.count()) === 1 && /Where I.ve been/.test((await pg.locator('[data-testid=layers-panel]').innerText()) ?? '') && !(await isOn()),
    'WB4: the walk\'s Layers panel lists "Where I\'ve been", a switch, off');
  check.todo((await past()).length === 0, `WB6: off, no earlier walk is drawn (${await past()})`);
  await shot(pg, 'where-01-panel');

  // WB6, WB12, WB16: on, the near walk draws and the far one does not; the panel says what it is doing in words.
  await row.click().catch(() => {});
  const notes = [];
  for (let k = 0; k < 10; k++) {
    const t = (await pg.locator('[data-testid=layers-panel]').innerText().catch(() => '')) ?? '';
    const m = /Getting your walks ready…|None of your walks pass here|Waiting for your position/.exec(t);
    if (m) notes.push(m[0]);
    await pg.waitForTimeout(200);
  }
  const drawn = await waitPast((p) => p.includes('past-near'));
  check.todo(JSON.stringify(drawn) === '["past-near"]', `WB6: on, the walk within 5 km draws and the one 8 km away does not (${drawn})`);
  check.todo(notes.every((n) => n === 'Getting your walks ready…'), `WB12: while older walks are prepared the panel says so in words (${notes.join(', ')})`);
  check.todo(!/\d|%/.test(await pg.locator('[data-testid=layers-panel]').innerText().catch(() => '')), 'WB10: no number in the panel with the layer on');
  const settledSends = await sends();
  check.todo(settledSends >= 1 && settledSends <= 2, `WB16: preparing sent the lines at most twice, never once a walk (${settledSends})`);
  await shot(pg, 'where-02-on');
  await closePanel();

  // WB11: the legend in the ready bar's settings, in words.
  await drawerTo(pg, 'half');
  const legend = (await pg.locator('[data-testid=layer-legend-past]').innerText().catch(() => '')) ?? '';
  check.todo(/Your earlier walks/.test(legend), `WB11: "On the map" names the layer's line in words (${legend})`);
  await shot(pg, 'where-02b-legend');
  await drawerTo(pg, 'peek');

  // WB9: the fog's paint is the same with the layer on as off.
  const fogOn = await attr('data-fog-paint');
  await switchLayer(pg, 'past', false);
  const fogOff = await attr('data-fog-paint');
  await switchLayer(pg, 'past', true);
  await waitPast((p) => p.includes('past-near'));
  check.todo(!!fogOn && fogOn === fogOff, `WB9: the fog is painted the same with the layer on and off (${fogOn} / ${fogOff})`);

  // WB8, WB16: Start; the walk being recorded is never in the layer, and a minute of fixes resends nothing.
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
  const before = await sends();
  const route = [];
  for (let k = 0; k <= 30; k++) route.push(at(-0.5 + k * 0.03, -0.5));
  for (const p of route) {
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  const walk = await openWalk(pg);
  const during = await past();
  check.todo(!!walk && !during.includes(walk.id) && during.includes('past-near'), `WB8: the walk being recorded is not part of the layer (${during})`);
  check.todo((await sends()) === before, `WB16: thirty fixes sent the lines no more (${before} -> ${await sends()})`);

  // WB1: no unwalked-streets control, line or veil on the live walk; the fog still draws, quietly.
  check.todo((await pg.locator('[data-testid=unwalked]').count()) === 0 && (await pg.locator('text=/unwalked nearby/').count()) === 0,
    'WB1: the live walk has no unwalked-streets button and no "unwalked nearby" line');
  check.todo((await attr('data-veil')) === '0' && (await attr('data-fog-paint')) === fogOff, `WB1: no veil and the fog quiet (${await attr('data-veil')}, ${await attr('data-fog-paint')})`);

  // WB2: the column closes up: Walk me back sits right above Recenter, nothing between.
  const box = await pg.locator('canvas.maplibregl-canvas').last().boundingBox();
  await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
  await pg.mouse.down();
  await pg.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 3 + 40, { steps: 8 });
  await pg.mouse.up();
  await pg.waitForSelector('[data-testid=recenter]', { timeout: 5000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=walk-back]', { timeout: 10000 }).catch(() => {});
  const back = await pg.locator('[data-testid=walk-back]').boundingBox().catch(() => null);
  const rec = await pg.locator('[data-testid=recenter]').boundingBox().catch(() => null);
  const gap = back && rec ? rec.y - (back.y + back.height) : null;
  check.todo(!!back && !!rec && Math.abs(back.x - rec.x) < 1 && gap >= 0 && gap < 20, `WB2: Walk me back sits right above Recenter, no slot between (gap ${gap})`);
  await shot(pg, 'where-03-walk');

  // WB3: the compass hands focus to Walk me back while it shows.
  await pg.evaluate(() => window.__turn && window.__turn(40));
  await pg.waitForSelector('[data-testid=compass]', { timeout: 5000 }).catch(() => {});
  await pg.click('[data-testid=compass]').catch(() => {});
  await pg.waitForTimeout(900);
  const focused = await pg.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? '');
  check.todo(focused === 'walk-back', `WB3: leaving the compass, focus goes to Walk me back (${focused})`);
  await pg.click('[data-testid=recenter]').catch(() => {});

  // WB5, WB6: Explore has the switch on too; only its main map draws the lines; a reload keeps it.
  await tabTo(pg, 'explore');
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await panelOpen();
  check.todo(await isOn(), 'WB5: on in the walk, on in Explore');
  await closePanel();
  await waitPast((p) => p.includes('past-near'));
  const hosts = await pg.evaluate(() => [...document.querySelectorAll('[data-past]')].filter((e) => e.getAttribute('data-past')).length);
  check.todo(hosts === 1 && (await past()).includes('past-near'), `WB6: on Explore the main map draws the lines and nothing else does (${hosts})`);
  await shot(pg, 'where-04-explore');
  await pg.reload();
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await panelOpen();
  check.todo(await isOn(), 'WB5: still on after a reload');
  await closePanel();

  // WB8: once stopped, the walk joins the layer.
  await pg.goto(`${h.url}walk`);
  await pg.waitForSelector('[data-testid=stop]', { timeout: 30000 });
  const s = await pg.locator('[data-testid=stop]').boundingBox();
  await pg.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 }).catch(() => {});
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  const after = await waitPast((p) => !!walk && p.includes(walk.id));
  check.todo(!!walk && after.includes(walk.id), `WB8: once stopped, the walk joins the layer (${after})`);

  // WB17: nothing new left the device.
  nothingLeaves();
  await c.close();
}

module.exports = {
  name: 'where',
  covers: [
    'src/lib/pastLines/**',
    'src/lib/layers/**',
    'src/lib/stackSlots.ts',
    'src/components/LayersControl.tsx',
    'src/components/map/{types,WalkMap.web,WalkMap.native}.ts*',
    'src/components/walk/{layout,useReady}.ts*',
    'src/app/(tabs)/explore.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
