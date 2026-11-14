// After dark (DK1, DK3-DK5, DK10, DK12-DK16): the fourth layer on Explore, Navigate and the live walk, from a fake Overpass
// answer (the harness's darkWorld), with the browser's clock set after sunset and by day in Providence. E2E_ONLY=dark runs it.

// Providence: sunset on Dec 15, 2026 is about 21:16 UTC (4:16 pm EST).
const NIGHT = new Date('2026-12-15T23:30:00Z'); // 6:30 pm
const DAY = new Date('2026-12-15T17:00:00Z'); // noon
const TZ = 'America/New_York';

async function run(h) {
  const { url, exploreUrl, navUrl, BASE, at, check, shot, freshPage, overpassAsked, darkWorld, switchLayer, routed } = h;
  const darkAsked = () => overpassAsked.filter((q) => decodeURIComponent(q.body ?? '').includes('opening_hours')).length;
  const attr = (pg, name) => pg.locator(`[${name}]`).first().getAttribute(name).catch(() => null);
  const waitDark = (pg, want, timeout = 30000) => pg.waitForFunction((w) => {
    const v = document.querySelector('[data-dark]')?.getAttribute('data-dark') ?? '';
    return w.test(v);
  }, want, { timeout }).catch(() => {});
  const panelLine = async (pg) => {
    if (!(await pg.locator('[data-testid=layers-panel]').count())) await pg.click('[data-testid=layers]').catch(() => {});
    const t = await pg.locator('[data-testid=layer-note-dark]').innerText({ timeout: 5000 }).catch(() => '');
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
  check.todo(darkAsked() === 0 && !(await attr(pg, 'data-dark')), `DK13: with the layer off nothing is asked and nothing drawn (${darkAsked()} requests)`);
  await pg.click('[data-testid=layers]');
  const row = pg.locator('[data-testid=layer-dark]');
  const rowText = (await row.innerText({ timeout: 5000 }).catch(() => '')).trim();
  const moon = await pg.locator('[data-testid=layer-dark] [data-testid=layer-icon-moon-outline]').count().catch(() => 0);
  check.todo(/After dark/.test(rowText) && moon === 1 && (await row.getAttribute('aria-checked').catch(() => null)) === 'false', `DK1: the panel lists After dark with a moon, off (${JSON.stringify(rowText)})`);
  // DK2: what a cold eye has to go on: the Layers button in view, and the row's word in ink, not a test id. The cold find
  // itself is the ux-reviewer's, from the pictures (decision 0167; the spec's record).
  const seen = await pg.evaluate(() => {
    const b = document.querySelector('[data-testid=layers]')?.getBoundingClientRect();
    const r = document.querySelector('[data-testid=layer-dark]');
    const style = r ? getComputedStyle(r.querySelector('div[dir], div') ?? r) : null;
    return { button: !!b && b.width >= 44 && b.top >= 0 && b.bottom <= innerHeight, word: !!r && /After dark/.test(r.textContent ?? '') && style?.opacity !== '0' && style?.visibility !== 'hidden' };
  });
  check.todo(seen.button && seen.word, `DK2: the Layers button is in view and the row says After dark in ink (${JSON.stringify(seen)})`);
  await shot(pg, 'dark-panel');
  await pg.click('[data-testid=layers]').catch(() => {});
  const switched = await tryLayer(pg, 'dark');
  await waitDark(pg, /^lit:\d+\|open:\d+$/);
  const drawn = await attr(pg, 'data-dark');
  check.todo(switched && drawn === 'lit:2|open:1', `DK1, DK3, DK4: on, the map draws the two lit streets and the one place open now; unlit, untagged, closed and unreadable draw nothing (${drawn})`);
  check.todo(darkAsked() > 0 && overpassAsked.filter((q) => decodeURIComponent(q.body ?? '').includes('opening_hours')).every((q) => q.method === 'POST' && !/lat=|lon=/.test(q.url)), 'DK8: the tiles are asked of Overpass by box, by POST');
  const night = await panelLine(pg);
  check.todo(night === 'Open now. Only what is mapped.', `DK5: after sunset the panel line says Open now (${JSON.stringify(night)})`);
  await shot(pg, 'dark-explore');
  // DK15: nothing is sent again while nothing changes.
  const sets = Number((await attr(pg, 'data-dark-sets')) ?? 0);
  await pg.waitForTimeout(4000);
  check.todo(sets > 0 && Number((await attr(pg, 'data-dark-sets')) ?? 0) === sets, `DK15: the drawing is sent once and not again while nothing changes (${sets})`);

  // DK5: by day, the reading is an hour after tonight's sunset.
  await pg.clock.setSystemTime(DAY);
  await pg.reload();
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await waitDark(pg, /^lit:/);
  const day = await panelLine(pg);
  check.todo(day === 'Open after sunset. Only what is mapped.', `DK5: by day the panel line says Open after sunset (${JSON.stringify(day)})`);
  check.todo((await attr(pg, 'data-dark')) === 'lit:2|open:1', 'DK4: by day, the bar open after sunset is marked and the bookshop, closed by then, is not');

  // DK1, DK12: the same setting draws on Navigate, and the legend is in its settings drawer.
  await pg.clock.setSystemTime(NIGHT);
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await waitDark(pg, /^lit:/);
  check.todo(/^lit:2\|open:1$/.test((await attr(pg, 'data-dark')) ?? ''), 'DK1: one setting for every map: Navigate draws the layer too');
  await h.drawerTo(pg, 'up').catch(() => {});
  const key = await pg.locator('[data-testid=layers-key]').innerText({ timeout: 5000 }).catch(() => '');
  check.todo(/Lit streets/.test(key) && /Open after dark/.test(key) && /On a route after dark/.test(key) && /Only what is mapped: a street with no lighting mapped may still be lit\./.test(key), `DK12: the legend in Navigate's settings names the three and the note (${JSON.stringify(key.slice(0, 200))})`);
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
  check.todo(busyLine === 'Not available now' && !(await attr(p2, 'data-dark')), `DK14: with Overpass refusing, the panel says Not available now and nothing is drawn (${JSON.stringify(busyLine)})`);
  await c2.close();

  // DK10: a navigated walk after sunset over streets mapped as unlit: a line, the moon, the route unchanged.
  darkWorld.mode = 'unlit';
  const { c: c3, pg: p3 } = await freshPage('dark-headsup', { timezoneId: TZ, touch: true });
  await c3.addInitScript(() => {
    window.__buzz = [];
    navigator.vibrate = (p) => { window.__buzz.push(p); return true; };
  });
  await p3.clock.setSystemTime(NIGHT);
  await p3.goto(navUrl);
  await p3.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await p3.click('[data-testid=start]');
  await p3.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 }).catch(() => {});
  const s0 = at(-0.5, -0.5);
  await c3.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
  await p3.waitForTimeout(2500);
  await tryLayer(p3, 'dark');
  const box = await p3.locator('canvas.maplibregl-canvas').last().boundingBox().catch(() => null);
  let line = '';
  let navText = '';
  if (box) {
    await p3.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 - 120);
    await p3.mouse.down();
    await p3.waitForTimeout(700);
    await p3.mouse.up();
    await p3.click('[data-testid=go-here]', { timeout: 5000 }).catch(() => {});
    await routed(p3, 30000).catch(() => {});
    navText = await p3.locator('[data-testid=nav-bar]').innerText({ timeout: 5000 }).catch(() => '');
    await p3.waitForSelector('[data-testid=walk-ahead]', { timeout: 45000 }).catch(() => {});
    line = (await p3.locator('[data-testid=walk-ahead]').innerText().catch(() => '')).replace(/[^\x20-\x7e]/g, '').trim();
  }
  check.todo(/^Next: (Grid -?\d Street is mapped as unlit|a stretch mapped as unlit)$/.test(line), `DK10: after sunset, a line says a stretch mapped as unlit is ahead (${JSON.stringify(line)})`);
  check.todo((await p3.locator('[data-testid=walk-ahead] [data-testid=walk-ahead-moon]').count()) === 1 && (await p3.locator('[data-testid=walk-ahead] [data-testid=walk-badge-car]').count()) === 0, 'DK10: it wears the moon, never the car');
  check.todo((await p3.evaluate(() => window.__buzz.length)) === 0, 'DK10: nothing buzzed');
  const words = (t) => t.replace(/\d+([.,]\d+)?/g, '#');
  check.todo(navText !== '' && words(await p3.locator('[data-testid=nav-bar]').innerText().catch(() => '')) === words(navText), 'DK10: the route is unchanged');
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
  check.todo((await p4.locator('[data-dark]').count()) === 0, 'DK16: Chronicle draws no after-dark data');
  await c4.close();
  darkWorld.mode = 'mixed';
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
