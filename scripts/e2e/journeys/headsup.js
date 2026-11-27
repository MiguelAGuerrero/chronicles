// Walkability heads-up (WH3, WH7-WH10, WH13, UF15): on a routed walk over streets that are all fast roads, a quiet line says a
// stretch built around cars is ahead; nothing buzzes, nothing is pressable, and End takes it away. E2E_ONLY=headsup runs it alone.

async function run(h) {
  const { url, navUrl, BASE, at, check, shot, freshPage, overtureAsked, overpassAsked, walkability, hosts, OVERPASS_HOST, switchLayer, routed } = h;
  const transport = () => overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url)).length;
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
  // The heads-up speaks only while the Walkability layer is on (the owner's call, 2026-11-05): the walker asked for the information.
  await switchLayer(pg, 'walkability');
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
  for (const id of ['cap-photo', 'cap-voice', 'cap-note', 'walk-actions', 'layers']) {
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
  check(/^foot:|^car:/.test((await pg.locator('[data-walk]').first().getAttribute('data-walk').catch(() => '')) ?? ''), 'WH10: with the layer on, the map draws the tint beside the line');
  const asked = overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url));
  check(asked.length > 0 && asked.every((q) => q.range), `WH11: the route's tiles are read by byte range (${asked.length} requests)`);
  // WH10: End takes it away.
  await pg.click('[data-testid=nav-end]');
  await pg.waitForSelector('[data-testid=nav-bar]', { state: 'detached', timeout: 5000 });
  check((await pg.locator('[data-testid=walk-ahead]').count()) === 0, 'WH10: End takes the line away');
  walkability.mode = 'ok';
  await c.close();

  // UF15: ground built around cars with no fast road in it: arterial streets at 25 mph. No road stretch can fire, so the
  // second reason does, in its own words: an area, not a street.
  walkability.mode = 'arterial';
  const { c: c2, pg: p2 } = await freshPage('headsup-area', { touch: true });
  await p2.goto(navUrl);
  await p2.waitForSelector('[data-testid=start]');
  await p2.click('[data-testid=start]');
  await p2.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  const s1 = at(-0.5, -0.5);
  await c2.setGeolocation({ longitude: s1[0], latitude: s1[1] + 0.000002, accuracy: 6 });
  await p2.waitForTimeout(2500);
  await switchLayer(p2, 'walkability');
  const box2 = await p2.locator('canvas.maplibregl-canvas').last().boundingBox();
  await p2.mouse.move(box2.x + box2.width / 2 + 90, box2.y + box2.height / 2 - 120);
  await p2.mouse.down();
  await p2.waitForTimeout(700);
  await p2.mouse.up();
  await p2.click('[data-testid=go-here]');
  await routed(p2, 30000);
  await p2.waitForSelector('[data-testid=walk-ahead]', { timeout: 45000 }).catch(() => {});
  const area = (await p2.locator('[data-testid=walk-ahead]').innerText().catch(() => '')).replace(/[^\x20-\x7e]/g, '').trim();
  check(area === 'Next: an area built around cars', `UF15: entering ground built around cars, with no fast road in it, says an area and not a street, with no number (${JSON.stringify(area)})`);
  await shot(p2, 'headsup-area');
  await p2.click('[data-testid=nav-end]');
  await p2.waitForSelector('[data-testid=nav-bar]', { state: 'detached', timeout: 5000 });
  check((await p2.locator('[data-testid=walk-ahead]').count()) === 0, 'UF15, WH10: End takes it away');
  walkability.mode = 'ok';
  await c2.close();

  // The vision review (2026-11-05): with the Walkability layer off the heads-up says nothing and no route tile is read for it.
  walkability.mode = 'grid';
  const before = transport();
  const { c: c3, pg: p3 } = await freshPage('headsup-off', { touch: true });
  await p3.goto(navUrl);
  await p3.waitForSelector('[data-testid=start]');
  await p3.click('[data-testid=start]');
  await p3.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  const s2 = at(-0.5, -0.5);
  await c3.setGeolocation({ longitude: s2[0], latitude: s2[1] + 0.000002, accuracy: 6 });
  await p3.waitForTimeout(2500);
  const box3 = await p3.locator('canvas.maplibregl-canvas').last().boundingBox();
  await p3.mouse.move(box3.x + box3.width / 2 + 90, box3.y + box3.height / 2 - 120);
  await p3.mouse.down();
  await p3.waitForTimeout(700);
  await p3.mouse.up();
  await p3.click('[data-testid=go-here]');
  await routed(p3, 30000);
  await p3.waitForTimeout(8000);
  check((await p3.locator('[data-testid=walk-ahead]').count()) === 0 && transport() === before, `UF16, vision review (the heads-up and its reads): with the layer off the route says nothing and reads no walkability tile (${transport() - before} requests)`);
  await p3.click('[data-testid=nav-end]');
  walkability.mode = 'ok';
  await c3.close();

  // G5 (specs/walkability-car-ground, CG1, CG6, CG7, CG11): the owner's scene. Ground easy on foot meets ground built around
  // cars east of the start (the harness's 'edge'), its streets and a storefront street on the map; Walkability and
  // Storefronts on; a walk navigated into it until the heads-up shows. Pictured at 390 and 320 for the reviewers.
  walkability.mode = 'edge';
  h.edgeWorld.serve = true;
  const { c: c4, pg: p4 } = await freshPage('headsup-scene', { touch: true });
  await c4.addInitScript(() => { window.__perf = {}; });
  await p4.goto(navUrl);
  await p4.waitForSelector('[data-testid=start]');
  await switchLayer(p4, 'walkability');
  await switchLayer(p4, 'storefronts');
  await p4.click('[data-testid=start]');
  await p4.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await c4.setGeolocation({ longitude: at(-0.5, -0.5)[0], latitude: at(-0.5, -0.5)[1] + 0.000002, accuracy: 6 });
  await p4.waitForTimeout(3000);
  // A little further out, the walker left of the middle, so the route and the ground it enters are both in view.
  await p4.mouse.move(195, 420);
  await p4.mouse.wheel(0, 500);
  await p4.waitForTimeout(1500);
  await p4.mouse.move(300, 600);
  await p4.mouse.down();
  await p4.mouse.move(180, 600, { steps: 10 });
  await p4.mouse.up();
  await p4.waitForTimeout(1200);
  const [dx, dy] = await p4.evaluate((p) => window.__project(p), at(5, 1.5));
  await p4.mouse.move(dx, dy);
  await p4.mouse.down();
  await p4.waitForTimeout(700);
  await p4.mouse.up();
  await p4.click('[data-testid=go-here]');
  await routed(p4, 30000);
  // Walking north toward it, a fix every 5 m, until the heads-up is due.
  for (let k = 1; k <= 20; k++) {
    const p = at(-0.5, -0.5 + k / 20);
    await c4.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await p4.waitForTimeout(1000);
  }
  await p4.waitForSelector('[data-testid=walk-ahead]', { timeout: 45000 }).catch(() => {});
  await p4.waitForTimeout(2000);
  const cased = async () => Number((await p4.locator('[data-route-car]').first().getAttribute('data-route-car').catch(() => '0')) ?? 0);
  const sceneWalk = (await p4.locator('[data-walk]').first().getAttribute('data-walk').catch(() => '')) ?? '';
  check(/^car:[1-9]\d*\|edges:[1-9]\d*$/.test(sceneWalk), `CG1: on the owner's scene only the car ground is drawn, with its edge (${sceneWalk})`);
  check((await cased()) >= 1, `CG6: with the layer on, the route's stretch in car ground is cased in slate (${await cased()})`);
  // What the map draws in a box of its own pixels (`window.__renderedIn`): each layer, with a feature's kind.
  const rendered = (box) => p4.evaluate((b) => window.__renderedIn(b), box);
  const boxAt = async (pt, r) => {
    const [x, y] = await p4.evaluate((p) => window.__project(p), pt);
    const m = await p4.locator('.maplibregl-map').last().boundingBox();
    return [[x - m.x - r, y - m.y - r], [x - m.x + r, y - m.y + r]];
  };
  {
    const inCar = await rendered(await boxAt(at(3, -1), 90)).catch(() => []);
    check(inCar.includes('walk-car:area') && inCar.includes('roads:') && inCar.includes('road-label:'),
      `walkability-car-ground audit 6: inside the car ground the map draws its streets and their names through the hatch (${inCar.join(', ')})`);
    const all = await rendered([[0, 0], [390, 844]]).catch(() => []);
    check(all.includes('route-car-start:start'), `CG6: a small slate dot marks where the casing starts (${all.filter((x) => x.startsWith('route')).join(', ')})`);
  }
  const iconInk = await p4.locator('[data-testid=walk-ahead] [data-testid=walk-band-car] div[dir], [data-testid=walk-ahead] [data-testid=walk-band-car] *').first()
    .evaluate((e) => getComputedStyle(e).color).catch(() => '');
  const sceneLine = (await p4.locator('[data-testid=walk-ahead]').innerText().catch(() => '')).replace(/[^\x20-\x7e]/g, '').trim();
  check(iconInk === 'rgb(59, 74, 107)' && sceneLine === 'Next: an area built around cars', `CG7: the heads-up's icon is slate, not the accent; its words unchanged (${iconInk}, ${JSON.stringify(sceneLine)})`);
  check((await p4.evaluate(() => (window.__buzz ?? []).length)) === 0, 'CG8, WH8: nothing buzzed on the owner\'s scene');
  await shot(p4, 'headsup-scene');
  await p4.setViewportSize({ width: 320, height: 700 });
  await p4.waitForTimeout(1200);
  await shot(p4, 'headsup-scene-320');
  await p4.setViewportSize({ width: 390, height: 844 });
  await p4.waitForTimeout(800);
  await switchLayer(p4, 'walkability', false);
  await p4.waitForTimeout(1500);
  check((await cased()) === 0, `CG6: with the layer off, no casing (${await cased()})`);
  await switchLayer(p4, 'walkability');
  await p4.waitForFunction(() => Number(document.querySelector('[data-route-car]')?.getAttribute('data-route-car') ?? 0) > 0, null, { timeout: 30000 }).catch(() => {});
  await p4.click('[data-testid=nav-end]');
  await p4.waitForSelector('[data-testid=nav-bar]', { state: 'detached', timeout: 5000 });
  await p4.waitForTimeout(800);
  check((await cased()) === 0, `CG11: End takes the casing away (${await cased()})`);

  // walkability-car-ground audit 5: on Explore over the scene's car ground, the hatch's lines are 9 to 11.5 px apart at
  // every fractional zoom, measured on the screen; audit 7: the edge of what was read, the hatch fading toward it, pictured.
  const { pg: p5, c: c5 } = await freshPage('headsup-zooms', { touch: true });
  await c5.addInitScript(() => { window.__perf = {}; });
  await c5.setGeolocation({ longitude: at(5, 0)[0], latitude: at(5, 0)[1], accuracy: 6 });
  await p5.goto(h.exploreUrl);
  await switchLayer(p5, 'walkability');
  await p5.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  await p5.waitForTimeout(2000);
  const spacings = [];
  for (const z of [15, 15.24, 15.5, 15.74, 15.97]) {
    await p5.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(7.5, -4.5), z]);
    await p5.waitForTimeout(1500);
    const [cx, cy] = await p5.evaluate((p) => window.__project(p), at(7.5, -4.5));
    const png = await p5.screenshot({ clip: { x: Math.round(cx - 30), y: Math.round(cy), width: 60, height: 1 } });
    spacings.push([z, hatchSpacing(png)]);
  }
  check(spacings.every(([, s]) => s >= 8.5 && s <= 12), `walkability-car-ground audit 5: the hatch's lines are 9 to 11.5 px apart on the screen at every zoom (${spacings.map(([z, s]) => `${z}: ${s.toFixed(1)}`).join(', ')})`);
  await p5.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(5, -13), 14.6]);
  await p5.waitForTimeout(2500);
  await shot(p5, 'g5-fade-146');
  const edge = await p5.evaluate(() => window.__renderedIn([[0, 0], [innerWidth, innerHeight]])).catch(() => []);
  check(edge.some((k) => /^walk-car:area-\d$/.test(k)), `walkability-car-ground audit 7: toward the edge of what was read the hatch fades in steps (${edge.filter((k) => k.startsWith('walk')).join(', ')})`);
  await p5.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(5, -6), 13.2]);
  await p5.waitForTimeout(2500);
  await shot(p5, 'g5-fade-132');
  await c5.close();
  h.edgeWorld.serve = false;
  walkability.mode = 'ok';
  await c4.close();
}

/** The distance between the hatch's lines across them, in CSS px, from a 1 px high screenshot strip: the dark pixels' runs, their starts' median gap, over the square root of two (45 degrees). */
function hatchSpacing(png) {
  const zlib = require('zlib');
  let off = 8;
  let w = 0;
  const idat = [];
  let ctype = 6;
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString('ascii', off + 4, off + 8);
    if (type === 'IHDR') { w = png.readUInt32BE(off + 8); ctype = png[off + 17]; }
    if (type === 'IDAT') idat.push(png.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const bpp = ctype === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const rows = raw.length / (w * bpp + 1);
  const lum = new Array(w).fill(0);
  let prev = Buffer.alloc(w * bpp);
  for (let y = 0; y < rows; y++) {
    const f = raw[y * (w * bpp + 1)];
    const line = Buffer.from(raw.subarray(y * (w * bpp + 1) + 1, (y + 1) * (w * bpp + 1)));
    for (let i = 0; i < line.length; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      const p = a + b - c;
      const pr = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      line[i] = (line[i] + [0, a, b, (a + b) >> 1, pr][f]) & 255;
    }
    prev = line;
    if (y === 0) for (let x = 0; x < w; x++) lum[x] = (line[x * bpp] + line[x * bpp + 1] + line[x * bpp + 2]) / 3;
  }
  const scale = w / 60;
  const mx = Math.max(...lum);
  const mn = Math.min(...lum);
  const cut = mn + (mx - mn) * 0.5;
  const starts = [];
  for (let x = 1; x < w; x++) if (lum[x] < cut && lum[x - 1] >= cut) starts.push(x);
  const gaps = starts.slice(1).map((x, k) => x - starts[k]).sort((p, q) => p - q);
  if (!gaps.length) return 0;
  return gaps[Math.floor(gaps.length / 2)] / scale / Math.SQRT2;
}

module.exports = {
  name: 'headsup',
  covers: [
    'src/lib/walk/{ahead,aheadWatch,useRouteWarning,walkApp,reader,layer}.ts',
    'src/components/WalkBandIcon.tsx',
    'src/app/walk.tsx',
    'src/lib/walk/carGround.ts',
  ],
  run,
};
