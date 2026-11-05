// Walkability (WK1-WK4, WK13, WK14, WK17, WK20-WK22): the switch on the Explore and Navigate maps, what it draws from
// Overture's tile, the fallback to Overpass, the band icons and their tooltips. E2E_ONLY=walk runs it alone.

async function run(h) {
  const { url, navUrl, BASE, at, check, shot, freshPage, overtureAsked, overpassAsked, walkability, hosts, OVERPASS_HOST } = h;
  const drawn = (pg) => pg.locator('[data-walk]').first().getAttribute('data-walk').catch(() => null);
  const { c, pg } = await freshPage('walk');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=walk-layer]', { timeout: 30000 });
  check((await pg.locator('[data-testid=walk-legend]').count()) === 0 && !(await drawn(pg)), 'WK13: the layer is off until switched on, and draws nothing');
  await pg.waitForTimeout(1500);
  check(!overtureAsked.some((q) => /transportation\.pmtiles/.test(q.url)) && overpassAsked.length === 0, 'WK4: nothing is read while the layer is off');
  await pg.click('[data-testid=walk-layer]');
  await pg.waitForSelector('[data-testid=walk-legend]', { timeout: 5000 });
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  const first = await drawn(pg);
  check(first === 'car:1|mixed:1', `WK13: a fast road is drawn as built around cars, a street with nothing mapped as mixed, and a street with a sidewalk as nothing (${first})`);
  const asked = overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url));
  check(asked.length > 0 && asked.every((q) => q.range && new URL(q.url).search === ''), `WK1: Overture's transportation tiles are read by byte range, with nothing but the tile (${asked.length} requests)`);
  check(overpassAsked.length === 0, 'WK1b: Overpass is not asked while Overture answers');
  check((await pg.locator('[data-testid=walk-badge-car]').count()) === 1 && (await pg.locator('[data-testid=walk-badge-caution]').count()) === 1, 'WK21: the legend shows the pedestrian with a car badge and with a caution badge');
  check(/OpenStreetMap and Overture/.test(await pg.locator('[data-testid=walk-credit]').innerText()) && /aren't mapped/.test(await pg.locator('[data-testid=walk-credit]').innerText()), 'WK14, WK17: the layer credits OpenStreetMap and Overture and says unmapped sidewalks can read worse than they are');
  await shot(pg, 'walk-legend-open');
  if (process.env.E2E_DEBUG) console.log(JSON.stringify(await pg.evaluate(() => ['walk-legend', 'walk-layer', 'walk-tip-car', 'walk-tip-mixed'].map((id) => { const b = document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect(); return [id, b && [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)], innerWidth, innerHeight]; }))));
  await pg.hover('[data-testid=walk-tip-car]');
  await pg.waitForSelector('[data-testid=tooltip]', { timeout: 3000 }).catch(() => {});
  const tip = await pg.locator('[data-testid=tooltip]').innerText().catch(() => '');
  check(/^Built around cars/.test(tip) && !/\d/.test(tip), `WK22, WK23: hovering the car icon says what it means, with no number (${tip})`);
  // walkability audit 14: each band's tooltip opens fully on screen, in Explore's short map pane on a 390 px phone.
  const inside = async (id, label) => {
    await pg.hover(`[data-testid=${id}]`);
    await pg.waitForSelector('[data-testid=tooltip]', { timeout: 3000 }).catch(() => {});
    const r = await pg.locator('[data-testid=tooltip]').boundingBox().catch(() => null);
    const vp = await pg.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    check(!!r && r.x >= 0 && r.y >= 0 && r.x + r.width <= vp.w && r.y + r.height <= vp.h, `walkability audit 14: the ${label} tooltip opens fully on screen (${JSON.stringify(r)} in ${vp.w}x${vp.h})`);
    await pg.keyboard.press('Escape');
  };
  await inside('walk-tip-mixed', 'mixed');
  await inside('walk-tip-car', 'car');
  await pg.hover('[data-testid=walk-tip-car]');
  await pg.waitForSelector('[data-testid=tooltip]', { timeout: 3000 }).catch(() => {});
  await shot(pg, 'walk-explore');
  await pg.keyboard.press('Escape');
  check((await pg.locator('[data-testid=tooltip]').count()) === 0, 'WK22: Escape closes the tooltip');
  if (process.env.E2E_DEBUG) console.log((await pg.locator('[data-testid=walk-layer]').evaluate((e) => e.outerHTML.slice(0, 300))));
  check((await pg.locator('[data-testid=walk-layer]').getAttribute('aria-checked')) === 'true', 'WK13: the switch says it is on');
  // WK20: a reload keeps the switch, and the tiles stay on the device.
  const before = overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url)).length;
  await pg.reload();
  await pg.waitForSelector('[data-testid=walk-legend]', { timeout: 30000 });
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  check((await drawn(pg)) === 'car:1|mixed:1' && overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url)).length === before, `WK20, WK2: after a reload the switch is still on and the tiles come from the device (${await drawn(pg)})`);
  // One setting for every map: Navigate's map has it on too.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=walk-layer]', { timeout: 30000 });
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  check((await pg.locator('[data-testid=walk-layer]').getAttribute('aria-checked')) === 'true' && (await drawn(pg)) === 'car:1|mixed:1', `WK13: Navigate's map has the same switch, on, and draws the same stretches (${await drawn(pg)})`);
  await shot(pg, 'walk-navigate');
  await pg.click('[data-testid=walk-layer]');
  check((await pg.locator('[data-testid=walk-legend]').count()) === 0, 'WK13: switching off hides the legend');
  // WK11: the area card says, in words, how its streets treat someone on foot (a third of this ring's street is each band).
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"]', { timeout: 60000 });
  await pg.click('[data-testid=atlas-tile][data-name="Fox Point"]');
  await pg.waitForSelector('[data-testid=atlas-onfoot-words]', { timeout: 30000 }).catch(() => {});
  const words = await pg.locator('[data-testid=atlas-onfoot-words]').innerText().catch(() => '');
  check(words === 'A mix of easy and car-oriented streets', `WK11: the area card says how its streets treat someone on foot, in words (${JSON.stringify(words)})`);
  check(!/\d|%/.test(await pg.locator('[data-testid=atlas-onfoot]').innerText().catch(() => '1')), 'WK12: the card\'s line has no number or percentage');
  await shot(pg, 'walk-card');
  await c.close();

  // WK1b, WK3: Overture can't be read (not a PMTiles file), so Overpass answers, with the tile's bounds and nothing else.
  walkability.mode = 'broken';
  const { c: c2, pg: p2 } = await freshPage('walk-fallback');
  await p2.goto(url);
  await p2.waitForSelector('[data-testid=walk-layer]', { timeout: 30000 });
  await p2.click('[data-testid=walk-layer]');
  await p2.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 45000 }).catch(() => {});
  const second = await drawn(p2);
  check(second === 'car:1|mixed:0', `WK1b: with Overture unreadable, Overpass's tags draw the stretch (a secondary mapped with no sidewalk is built around cars) (${second})`);
  const q = overpassAsked[0];
  check(!!q && q.method === 'POST' && /^data=/.test(q.body ?? '') && /way%5B%22highway%22%5D\(/.test(q.body) && !/key|user|device/i.test(q.body), `WK18: Overpass is asked with the tile's bounds in a form body and nothing else (${q?.body?.slice(0, 80)})`);
  await shot(p2, 'walk-fallback');
  // Overpass is the one new host (decision 0093): what it was sent is asserted above (the tile's bounds in a form body),
  // so the nothing-leaves check, strict for every other journey, is not asked about it here.
  hosts.delete(OVERPASS_HOST);
  walkability.mode = 'ok';
  await c2.close();
}

module.exports = {
  name: 'walkability',
  covers: [
    'src/lib/walk/**',
    'src/components/{Tooltip,WalkBandIcon,WalkLayerControl}.tsx',
    'src/components/map/{types,WalkMap.web,WalkMap.native}.ts*',
    'src/components/walk/{layout,useReady}.ts*',
    'src/components/atlas/AtlasCard.tsx',
    'src/app/(tabs)/index.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
