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
  // tend walkability T67: the edge of what was read is a thin dashed grey line, the hatch's fade inside it.
  check(edge.includes('walk-read:read'), `tend walkability T67: where the edge of what was read crosses the screen, at a fractional zoom, a dashed line is drawn along it (${edge.filter((k) => k.startsWith('walk')).join(', ')})`);
  await p5.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(5, -6), 13.2]);
  await p5.waitForTimeout(2500);
  await shot(p5, 'g5-fade-132');
  await p5.setViewportSize({ width: 320, height: 700 });
  await p5.waitForTimeout(1500);
  await shot(p5, 't67-edge-132-320');
  await p5.setViewportSize({ width: 390, height: 844 });
  await p5.waitForTimeout(1200);
  const readIn = async (pg, pt, r) => {
    const [x, y] = await pg.evaluate((p) => window.__project(p), pt);
    const m = await pg.locator('.maplibregl-map').last().boundingBox();
    return pg.evaluate((b) => window.__renderedIn(b), [[x - m.x - r, y - m.y - r], [x - m.x + r, y - m.y + r]]).catch(() => []);
  };
  // Where the hole below is, with every tile read: no line through the read's middle.
  await p5.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(0, -2), 13.4]);
  await p5.waitForTimeout(2500);
  const middle = await readIn(p5, at(0, -4), 40);
  check(!middle.includes('walk-read:read'), `tend walkability T67: with every tile read, no line runs through the middle of the read (${middle.filter((k) => k.startsWith('walk')).join(', ')})`);
  await p5.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(5, 0), 16]);
  await p5.waitForTimeout(2500);
  const near = await p5.evaluate(() => window.__renderedIn([[0, 0], [innerWidth, innerHeight]])).catch(() => []);
  check(near.includes('walk-car:area') && !near.includes('walk-read:read'), `tend walkability T67: at walking zoom, the edge of what was read wholly off the screen, no line is drawn (${near.filter((k) => k.startsWith('walk')).join(', ')})`);
  await shot(p5, 't67-offscreen');
  // tend walkability T68: the same screen, wholly inside the owner's car ground at walking zoom, names it, quietly: in the
  // map that shows, above Explore's sheet (`seenBox`), not under it.
  const seen = await p5.evaluate((b) => window.__renderedIn(b), await seenBox(p5)).catch(() => []);
  check(seen.includes('walk-text:text'), `tend walkability T68: a screen wholly inside car ground at walking zoom says what the hatch is ("Built around cars") (${near.filter((k) => k.startsWith('walk')).join(', ')})`);
  await shot(p5, 't68-inside');
  await p5.setViewportSize({ width: 320, height: 700 });
  await p5.waitForTimeout(1500);
  await shot(p5, 't68-inside-320');
  await p5.setViewportSize({ width: 390, height: 844 });
  await p5.waitForTimeout(1200);
  // Near the read's dashed edge, from a zoom between whole levels: the name keeps its room from the edge.
  await p5.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(5, -11), 15.4]);
  await p5.waitForTimeout(2500);
  await shot(p5, 't68-read-edge-154');
  await p5.setViewportSize({ width: 320, height: 700 });
  await p5.waitForTimeout(1500);
  await shot(p5, 't68-read-edge-154-320');
  await p5.setViewportSize({ width: 390, height: 844 });
  await p5.waitForTimeout(1200);
  await p5.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(5, -6), 13.2]);
  await p5.waitForTimeout(1500);
  await switchLayer(p5, 'walkability', false);
  await p5.waitForTimeout(2000);
  const off = await p5.evaluate(() => window.__renderedIn([[0, 0], [innerWidth, innerHeight]])).catch(() => []);
  check(!off.some((k) => k.startsWith('walk-')), `tend walkability T67: with the layer off, no line and no hatch (${off.filter((k) => k.startsWith('walk')).join(', ')})`);
  await shot(p5, 't67-layer-off');
  await c5.close();

  // tend walkability audit 1 (T67 ux 1): with Town borders on as well, the read's edge (short even dashes) beside a Nearby
  // towns line (solid), pictured at 390 and 320.
  {
    h.divisions.serve = true;
    const { pg: p7, c: c7 } = await freshPage('t67-borders', { touch: true });
    await c7.addInitScript(() => { window.__perf = {}; });
    await c7.setGeolocation({ longitude: at(5, 0)[0], latitude: at(5, 0)[1], accuracy: 6 });
    await p7.goto(h.exploreUrl);
    await p7.waitForSelector('[data-testid=layers]', { timeout: 30000 });
    await switchLayer(p7, 'walkability');
    await switchLayer(p7, 'borders');
    await p7.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '' && (document.querySelector('[data-borders]')?.getAttribute('data-borders') ?? '').includes('lined:'), null, { timeout: 45000 }).catch(() => {});
    await p7.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(8, -8), 13.6]);
    await p7.waitForTimeout(2500);
    const both = await p7.evaluate(() => window.__renderedIn([[0, 0], [innerWidth, innerHeight]])).catch(() => []);
    check(both.includes('walk-read:read') && both.includes('border-lined:'), `tend walkability audit 1, T67 ux 1: with Town borders on too, the read's edge and a Nearby towns line are both drawn, to be told apart (${both.filter((k) => /^(walk-read|border)/.test(k)).join(', ')})`);
    await shot(p7, 't67-borders');
    await p7.setViewportSize({ width: 320, height: 700 });
    await p7.waitForTimeout(1500);
    await shot(p7, 't67-borders-320');
    await c7.close();
    h.divisions.serve = false;
  }

  // tend walkability T67: a tile that could not be read is ringed by the line too. The scene's archive with the tile north
  // of the start made unreadable (bytes that are not a tile) and Overpass busy for it, so nothing reads that tile.
  {
    const { Buffer } = require('node:buffer');
    const { pg: p6, c: c6 } = await freshPage('t67-hole', { touch: true });
    await c6.addInitScript(() => { window.__perf = {}; });
    await c6.setGeolocation({ longitude: at(5, 0)[0], latitude: at(5, 0)[1], accuracy: 6 });
    await p6.goto(h.exploreUrl);
    await p6.waitForSelector('[data-testid=layers]', { timeout: 30000 });
    const src = `https://${h.OVERTURE_HOST}/tiles/${h.OVERTURE_RELEASE}/transportation.pmtiles`;
    const bytes = Buffer.from(await p6.evaluate(async (u) => {
      const b = new Uint8Array(await (await fetch(u)).arrayBuffer());
      let s = '';
      for (const x of b) s += String.fromCharCode(x);
      return btoa(s);
    }, src), 'base64');
    // The archive's one root directory (scripts/pmtiles-encode.mjs writes it uncompressed): ids, run lengths, lengths, offsets.
    const u64 = (o) => Number(bytes.readBigUInt64LE(o));
    const dataAt = u64(56);
    let pos = u64(8);
    const varint = () => { let n = 0; let m = 1; let b; do { b = bytes[pos++]; n += (b & 0x7f) * m; m *= 128; } while (b & 0x80); return n; };
    const count = varint();
    const ids = [];
    let last = 0;
    for (let i = 0; i < count; i++) ids.push((last += varint()));
    for (let i = 0; i < count; i++) varint();
    const lens = [];
    for (let i = 0; i < count; i++) lens.push(varint());
    const offs = [];
    for (let i = 0; i < count; i++) { const v = varint(); offs.push(v === 0 && i > 0 ? offs[i - 1] + lens[i - 1] : v - 1); }
    const [lon, lat] = at(0, 9);
    const tx = Math.floor(((lon + 180) / 360) * 2 ** 14);
    const ty = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** 14);
    const { zxyToTileId } = await import('pmtiles');
    const k = ids.indexOf(zxyToTileId(14, tx, ty));
    const holed = Buffer.from(bytes);
    if (k >= 0) holed.fill(7, dataAt + offs[k], dataAt + offs[k] + lens[k]);
    const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'ETag, Content-Length, Content-Range, Accept-Ranges' };
    await c6.route((u) => u.host === h.OVERTURE_HOST && u.pathname.endsWith('/transportation.pmtiles'), (r) => {
      const m = /bytes=(\d+)-(\d+)/.exec(r.request().headers().range ?? '');
      const from = m ? Number(m[1]) : 0;
      const to = Math.min(m ? Number(m[2]) : holed.length - 1, holed.length - 1);
      return r.fulfill({ status: 206, headers: { ...cors, 'content-range': `bytes ${from}-${to}/${holed.length}`, etag: '"e2e"' }, contentType: 'application/octet-stream', body: holed.subarray(from, to + 1) });
    });
    await c6.route(`https://${OVERPASS_HOST}/**`, (r) => r.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ remark: 'runtime error: Query timed out', elements: [] }) }));
    await switchLayer(p6, 'walkability');
    await p6.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 45000 }).catch(() => {});
    await p6.evaluate(([c, zz]) => window.__zoomTo(c, zz), [at(0, -2), 13.4]);
    await p6.waitForTimeout(2500);
    await shot(p6, 't67-hole');
    const ring = await readIn(p6, at(0, -4), 40);
    check(k >= 0 && ring.includes('walk-read:read'), `tend walkability T67: a tile that could not be read inside the read is ringed by the dashed line (${k >= 0 ? ring.filter((x) => x.startsWith('walk')).join(', ') : 'no such tile in the scene'})`);
    await p6.setViewportSize({ width: 320, height: 700 });
    await p6.waitForTimeout(1500);
    await shot(p6, 't67-hole-320');
    hosts.delete(OVERPASS_HOST);
    await c6.close();
  }
  h.edgeWorld.serve = false;
  walkability.mode = 'ok';
  await c4.close();

  // tend walkability T68: a scene of its own, served on each page's own context (the harness is not the loop's): a street
  // grid 100 m apart, with holes where the streets are arterials 300 m apart (ground built around cars): one 1.2 km square
  // east of the start (an area larger than the screen), one 500 m wide west of it (one car cell: smaller than the screen),
  // and two 1 km areas one above the other far east (two large areas side by side). The base map keeps its own streets.
  {
    const { Buffer } = require('node:buffer');
    const { encodeTile } = await import('../../mvt-encode.mjs');
    const { encodeArchive } = await import('../../pmtiles-encode.mjs');
    const holes = [[2, 14, -6, 6], [-14, -9, -4, 4], [40, 50, -12, -3], [40, 50, 1, 10]];
    const inHole = (x, y) => holes.some(([a, b, c0, d]) => x >= a && x <= b && y >= c0 && y <= d);
    const mph = (v) => JSON.stringify([{ max_speed: { unit: 'mph', value: v }, between: [0, 1] }]);
    const feats = [];
    const seg = (id, props, a, b, ids) => feats.push({ type: 'Feature', properties: { id, subtype: 'road', ...props, connectors: JSON.stringify(ids.map((k, n) => ({ connector_id: k, at: n }))) }, geometry: { type: 'LineString', coordinates: [a, b] } });
    for (let x = -30; x <= 70; x++) for (let y = -30; y <= 30; y++) if (!inHole(x, y)) feats.push({ type: 'Feature', properties: { id: `t${x}_${y}` }, geometry: { type: 'Point', coordinates: at(x, y) } });
    for (let y = -30; y <= 30; y++) for (let x = -30; x < 70; x++) if (!inHole(x, y) && !inHole(x + 1, y)) seg(`th${x}_${y}`, { class: 'residential', speed_limits: mph(25) }, at(x, y), at(x + 1, y), [`t${x}_${y}`, `t${x + 1}_${y}`]);
    for (let x = -30; x <= 70; x++) for (let y = -30; y < 30; y++) if (!inHole(x, y) && !inHole(x, y + 1)) seg(`tv${x}_${y}`, { class: 'residential', speed_limits: mph(25) }, at(x, y), at(x, y + 1), [`t${x}_${y}`, `t${x}_${y + 1}`]);
    holes.forEach(([a, b, c0, d], k) => {
      for (let y = c0; y <= d; y += 3) for (let x = a; x < b; x++) seg(`ta${k}_${x}_${y}`, { class: 'primary', speed_limits: mph(25) }, at(x, y), at(x + 1, y), []);
      for (let x = a; x <= b; x += 3) for (let y = c0; y < d; y++) seg(`tb${k}_${x}_${y}`, { class: 'primary', speed_limits: mph(25) }, at(x, y), at(x, y + 1), []);
    });
    const tileOf = ([lon, lat]) => [Math.floor(((lon + 180) / 360) * 2 ** 14), Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** 14)];
    const [x0, y0] = tileOf(at(-30, 30));
    const [x1, y1] = tileOf(at(70, -30));
    const tiles = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tiles.push({ z: 14, x, y, data: encodeTile(feats, 14, x, y, (f) => (f.geometry.type === 'Point' ? ['connector'] : ['segment'])) });
    const archive = Buffer.from(encodeArchive(tiles));
    const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'ETag, Content-Length, Content-Range, Accept-Ranges' };
    const scene = async (label, where) => {
      const { pg: p, c: cx } = await freshPage(label, { touch: true });
      await cx.addInitScript(() => { window.__perf = {}; });
      await cx.setGeolocation({ longitude: at(...where)[0], latitude: at(...where)[1], accuracy: 6 });
      await cx.route((u) => u.host === h.OVERTURE_HOST && u.pathname.endsWith('/transportation.pmtiles'), (r) => {
        const m = /bytes=(\d+)-(\d+)/.exec(r.request().headers().range ?? '');
        const from = m ? Number(m[1]) : 0;
        const to = Math.min(m ? Number(m[2]) : archive.length - 1, archive.length - 1);
        return r.fulfill({ status: 206, headers: { ...cors, 'content-range': `bytes ${from}-${to}/${archive.length}`, etag: '"t68"' }, contentType: 'application/octet-stream', body: archive.subarray(from, to + 1) });
      });
      await p.goto(h.exploreUrl);
      await p.waitForSelector('[data-testid=layers]', { timeout: 30000 });
      await switchLayer(p, 'walkability');
      await p.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 45000 }).catch(() => {});
      return { p, cx };
    };
    const look = async (p, centre, z) => {
      await p.evaluate(([cc, zz]) => window.__zoomTo(cc, zz), [centre, z]);
      await p.waitForTimeout(2500);
      return (await p.evaluate((b) => window.__renderedIn(b), await seenBox(p)).catch(() => [])).filter((k) => k.startsWith('walk'));
    };
    {
      const { p, cx } = await scene('t68-scene', [0, 0]);
      const inside = await look(p, at(8, -0.5), 16);
      check(inside.includes('walk-car:area') && !inside.includes('walk-car-edge:edge') && inside.includes('walk-text:text'), `tend walkability T68: a screen wholly inside a car area larger than it, at walking zoom, is named (${inside.join(', ')})`);
      await shot(p, 't68-large-16');
      const between = await look(p, at(8, -0.5), 15.5);
      check(between.includes('walk-text:text'), `tend walkability T68: between whole zooms it is still named (${between.join(', ')})`);
      await shot(p, 't68-large-155');
      const out = await look(p, at(8, -0.5), 14.6);
      check(out.includes('walk-car:area') && !out.includes('walk-text:text'), `tend walkability T68: below a zoom under walking zoom, where the words would outgrow it, no name (${out.join(', ')})`);
      const small = await look(p, at(-10.7, 0.9), 16);
      check(small.includes('walk-car:area') && !small.includes('walk-text:text'), `tend walkability T68: a car area smaller than the screen is not named (${small.join(', ')})`);
      await shot(p, 't68-small-16');
      await p.setViewportSize({ width: 320, height: 700 });
      await look(p, at(-10.7, 0.9), 16);
      await shot(p, 't68-small-16-320');
      await look(p, at(8, -0.5), 16);
      await shot(p, 't68-large-16-320');
      await p.setViewportSize({ width: 390, height: 844 });
      await switchLayer(p, 'walkability', false);
      await p.waitForTimeout(2000);
      const off = await look(p, at(8, -0.5), 16);
      check(!off.length, `tend walkability T68: with the layer off, no name and no hatch (${off.join(', ')})`);
      await shot(p, 't68-layer-off');
      await cx.close();
    }
    {
      const { p, cx } = await scene('t68-pair', [45, -1]);
      // Each named, looked at in turn from a zoom that holds the whole of its room; then both in one picture between them,
      // their facing edges in view.
      const south = await look(p, at(45, -6.7), 15.3);
      await shot(p, 't68-pair-south-153');
      const north = await look(p, at(45, 5.9), 15.3);
      await shot(p, 't68-pair-north-153');
      check(south.includes('walk-text:text') && north.includes('walk-text:text'), `tend walkability T68: two large areas side by side are each named (${south.join(', ')}; ${north.join(', ')})`);
      await look(p, at(45, -0.5), 15.2);
      await shot(p, 't68-pair-15');
      await cx.close();
    }
  }
}

/**
 * The part of the map a person sees (tend walkability T68): from the top down to where something other than the map's canvas
 * covers its middle (Explore's sheet), in the map's own pixels, for `window.__renderedIn`.
 */
async function seenBox(pg) {
  const m = await pg.locator('.maplibregl-map').last().boundingBox();
  const bottom = await pg.evaluate(([top, h]) => {
    let y = top + h - 2;
    while (y > top && document.elementFromPoint(innerWidth / 2, y)?.tagName !== 'CANVAS') y -= 4;
    return y;
  }, [m.y, m.height]);
  return [[0, 0], [m.width, bottom - m.y]];
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
