// Walkability heads-up (WH3, WH7-WH10, WH13): on a routed walk over streets that are all fast roads, a quiet line says a
// stretch built around cars is ahead; nothing buzzes, nothing is pressable, and End takes it away. E2E_ONLY=headsup runs it alone.

async function run(h) {
  const { url, navUrl, BASE, at, check, shot, freshPage, overtureAsked, overpassAsked, walkability, hosts, OVERPASS_HOST, routed } = h;
  walkability.mode = 'grid';
  const { c, pg } = await freshPage('headsup', { touch: true });
  await c.addInitScript(() => {
    window.__buzz = [];
    navigator.vibrate = (p) => { window.__buzz.push({ t: performance.now(), p }); return true; };
  });
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  const s0 = at(-0.5, -0.5);
  await c.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
  await pg.waitForTimeout(2500);
  check((await pg.locator('[data-testid=walk-ahead]').count()) === 0, 'WH10: with no route, nothing is said');
  const box = await pg.locator('canvas.maplibregl-canvas').last().boundingBox();
  const spot = { x: box.x + box.width / 2 + 90, y: box.y + box.height / 2 - 120 };
  await pg.mouse.move(spot.x, spot.y);
  await pg.mouse.down();
  await pg.waitForTimeout(700);
  await pg.mouse.up();
  await pg.click('[data-testid=go-here]');
  // Direct, if a scenic route is offered too (scenic routes, SR2).
  await routed(pg, 30000);
  const navText = await pg.locator('[data-testid=nav-bar]').innerText();
  await pg.waitForSelector('[data-testid=walk-ahead]', { timeout: 45000 }).catch(() => {});
  // The icon is a glyph in a private-use character: only the printable words are the line.
  const line = (await pg.locator('[data-testid=walk-ahead]').innerText().catch(() => '')).replace(/[^\x20-\x7e]/g, '').trim();
  check(/^Next: a stretch built around cars( on (Wickenden|Transit|Arnold|Williams) Street)?$/.test(line) && !/\d/.test(line), `WH3, WH7: on a routed walk, a line says a stretch built around cars is ahead, with no number (${JSON.stringify(line)})`);
  check((await pg.locator('[data-testid=walk-ahead] [data-testid=walk-badge-car]').count()) === 1, 'WH7: the pedestrian with a car badge is beside it');
  const quiet = await pg.locator('[data-testid=walk-ahead]').evaluate((e) => ({
    pe: getComputedStyle(e).pointerEvents, live: e.getAttribute('aria-live'), pressables: e.querySelectorAll('button, a, [role=button], [tabindex="0"]').length,
  }));
  check(quiet.pe === 'none' && quiet.pressables === 0 && quiet.live === 'polite', `WH8: it cannot be pressed or focused and is a polite live region (${JSON.stringify(quiet)})`);
  check((await pg.evaluate(() => window.__buzz.length)) === 0, 'WH8: nothing buzzed');
  // WH9: it sits among the pills: it covers none of the capture stack, the edge buttons or the bottom strip.
  const rect = await pg.locator('[data-testid=walk-ahead]').boundingBox();
  const overlaps = [];
  for (const id of ['cap-photo', 'cap-voice', 'cap-note', 'stop', 'walk-layer']) {
    const b = await pg.locator(`[data-testid=${id}]`).first().boundingBox().catch(() => null);
    if (b && rect.x < b.x + b.width && rect.x + rect.width > b.x && rect.y < b.y + b.height && rect.y + rect.height > b.y) overlaps.push(id);
  }
  check(overlaps.length === 0, `WH9: the line covers no capture button, edge button or the strip (${overlaps.join(',') || 'none'})`);
  // WH13: it did not change the route: the bar still says the same way, and has no new button.
  {
    // The distances tick as the walker moves; the words (the way, the street) are what must hold.
    const words = (t) => t.replace(/\d+([.,]\d+)?/g, '#');
    const bar = await pg.locator('[data-testid=nav-bar]').innerText();
    check(words(bar) === words(navText), `WH13: the navigation bar goes on as before (${JSON.stringify(navText)} → ${JSON.stringify(bar)})`);
  }
  await shot(pg, 'headsup');
  // WH11, WH1b: only the route's tiles, by byte range; the layer's switch was never touched and draws nothing.
  check(!(await pg.locator('[data-walk]').first().getAttribute('data-walk').catch(() => '')), 'WH10: it does not need the layer on (the map draws no walkability)');
  const asked = overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url));
  check(asked.length > 0 && asked.every((q) => q.range), `WH11: the route's tiles are read by byte range (${asked.length} requests)`);
  // WH10: End takes it away.
  await pg.click('[data-testid=nav-end]');
  await pg.waitForSelector('[data-testid=nav-bar]', { state: 'detached', timeout: 5000 });
  check((await pg.locator('[data-testid=walk-ahead]').count()) === 0, 'WH10: End takes the line away');
  walkability.mode = 'ok';
  await c.close();
}

module.exports = {
  name: 'headsup',
  covers: [
    'src/lib/walk/{ahead,aheadWatch,useRouteWarning,walkApp,reader,layer}.ts',
    'src/components/WalkBandIcon.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
