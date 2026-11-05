// Walkability (specs/walkability-urban-form UF1-UF19, specs/walkability WK1-WK4, WK18, WK20-WK23): the Walkability layer on the
// Explore and Navigate maps, switched from the Layers panel (specs/map-layers): ground easy on foot and ground built around
// cars tinted from Overture's tile, the fallback to Overpass, the legend's icons and tooltips, the area card's line.
// E2E_ONLY=walkability runs it alone.

async function run(h) {
  const { url, navUrl, BASE, at, check, shot, freshPage, overtureAsked, overpassAsked, walkability, hosts, OVERPASS_HOST } = h;
  const openPanel = async (pg) => {
    if (!(await pg.locator('[data-testid=layers-panel]').count())) await pg.click('[data-testid=layers]');
    await pg.waitForSelector('[data-testid=layers-panel]', { timeout: 5000 });
  };
  const isOn = async (pg) => (await pg.locator('[data-testid=layer-walkability]').getAttribute('aria-checked')) === 'true';
  const drawn = (pg) => pg.locator('[data-walk]').first().getAttribute('data-walk').catch(() => null);
  const { c, pg } = await freshPage('walk');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(pg);
  check(!(await isOn(pg)) && (await pg.locator('[data-testid=layer-legend-walkability]').count()) === 0 && !(await drawn(pg)), 'WK13, ML2: the Walkability layer is off until switched on, and draws nothing');
  await pg.waitForTimeout(1500);
  check(!overtureAsked.some((q) => /transportation\.pmtiles/.test(q.url)) && overpassAsked.length === 0, 'WK4: nothing is read while the layer is off');
  await pg.click('[data-testid=layer-walkability]');
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  const first = await drawn(pg);
  check(/^foot:[1-9]\d*\|car:[1-9]\d*$/.test(first ?? ''), `UF9, UF11: the dense grid around you is tinted easy on foot and the sparse arterials east of it built around cars (${first})`);
  const asked = overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url));
  check(asked.length > 0 && asked.every((q) => q.range && new URL(q.url).search === ''), `WK1: Overture's transportation tiles are read by byte range, with nothing but the tile (${asked.length} requests)`);
  check(overpassAsked.length === 0, 'WK1b: Overpass is not asked while Overture answers');
  check((await pg.locator('[data-testid=layers-key]').count()) === 0 && (await pg.locator('[data-testid=tooltip]').count()) === 0, 'the Layers panel on the map carries no legend and no tooltip (the owner, Nov 5: the tooltip is intrusive)');
  await openPanel(pg);
  check(await isOn(pg), 'WK13: the switch says it is on');
  // WK20: a reload keeps the switch, and the tiles stay on the device.
  const before = overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url)).length;
  await pg.reload();
  await openPanel(pg);
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  check(/^foot:[1-9]\d*\|car:[1-9]\d*$/.test((await drawn(pg)) ?? '') && overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url)).length === before, `WK20, WK2: after a reload the switch is still on and the tiles come from the device (${await drawn(pg)})`);
  // One setting for every map: Navigate's map has it on too.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(pg);
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  check((await isOn(pg)) && /^foot:[1-9]\d*\|car:[1-9]\d*$/.test((await drawn(pg)) ?? ''), `WK13: Navigate's map has the same switch, on, and draws the same stretches (${await drawn(pg)})`);
  await shot(pg, 'walk-navigate');
  // The legend lives in the walk's settings drawer, never over the map.
  await h.drawerTo(pg, 'up');
  await pg.waitForSelector('[data-testid=layers-key]', { timeout: 5000 });
  check((await pg.locator('[data-testid=walk-badge-car]').count()) === 1 && (await pg.locator('[data-testid=walk-badge-caution]').count()) === 0 && (await pg.locator('[data-testid=layer-swatch-foot]').count()) === 1 && (await pg.locator('[data-testid=layer-swatch-car]').count()) === 1, 'UF10, WK21: the legend shows the pedestrian and the pedestrian with a car badge, each beside its tint, and no caution badge');
  check(/OpenStreetMap and Overture/.test(await pg.locator('[data-testid=layer-note-walkability]').innerText()) && /read differently/.test(await pg.locator('[data-testid=layer-note-walkability]').innerText()), 'UF10, WK17: the layer credits OpenStreetMap and Overture and says an area can read differently from how it feels');
  await shot(pg, 'walk-legend-open');
  await pg.hover('[data-testid=walk-tip-car]');
  await pg.waitForSelector('[data-testid=tooltip]', { timeout: 3000 }).catch(() => {});
  const tip = await pg.locator('[data-testid=tooltip]').innerText().catch(() => '');
  check(/^Streets far apart and busy/.test(tip) && !/\d|most|likely/i.test(tip), `WK22, WK23: hovering the car row says what the ground is, with no number and no promise (${tip})`);
  // walkability audit 8: the whole legend row is the target, at least 44 px tall.
  const rowBox = await pg.locator('[data-testid=walk-tip-car]').boundingBox();
  check(rowBox.height >= 44, `walkability audit 8: a legend row's target is at least 44 px tall (${Math.round(rowBox.height)})`);
  // walkability audit 4: it is in the flow, so it is never covered: the topmost element at its middle is the tip itself.
  const topmost = await pg.evaluate(() => { const t = document.querySelector('[data-testid=tooltip]'); if (!t) return null; const r = t.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-testid]')?.getAttribute('data-testid') ?? null; });
  check(topmost === 'tooltip', `walkability audit 4: the tip is the topmost thing where it is (${topmost})`);
  await pg.mouse.move(5, 300);
  // walkability audit 8: a tap shows it and a second tap closes it, with no mouse over it.
  await pg.locator('[data-testid=walk-tip-car]').click();
  await pg.mouse.move(5, 300);
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=tooltip]').count()) === 1, 'walkability audit 8: a tap keeps the tip open');
  await pg.locator('[data-testid=walk-tip-car]').click();
  check((await pg.locator('[data-testid=tooltip]').count()) === 0, 'walkability audit 8: a second tap closes it');
  // walkability audit 14: each band's tooltip opens fully on screen, in Explore's short map pane on a 390 px phone.
  const inside = async (id, label) => {
    await pg.hover(`[data-testid=${id}]`);
    await pg.waitForSelector('[data-testid=tooltip]', { timeout: 3000 }).catch(() => {});
    const r = await pg.locator('[data-testid=tooltip]').boundingBox().catch(() => null);
    const vp = await pg.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    check(!!r && r.x >= 0 && r.y >= 0 && r.x + r.width <= vp.w && r.y + r.height <= vp.h, `walkability audit 14: the ${label} tooltip opens fully on screen (${JSON.stringify(r)} in ${vp.w}x${vp.h})`);
    await pg.mouse.move(5, 300);
    await pg.waitForFunction(() => !document.querySelector('[data-testid=tooltip]'), null, { timeout: 3000 }).catch(() => {});
  };
  await inside('walk-tip-foot', 'easy on foot');
  await inside('walk-tip-car', 'car');
  await pg.hover('[data-testid=walk-tip-car]');
  await pg.waitForSelector('[data-testid=tooltip]', { timeout: 3000 }).catch(() => {});
  // walkability audit 8: the row is announced once, as its words and what it means together.
  const label = await pg.locator('[data-testid=walk-tip-car]').getAttribute('aria-label');
  check(/^Built around cars\. Streets far apart and busy/.test(label ?? ''), `walkability audit 8: the legend row has one label, its words then its meaning (${label})`);
  await shot(pg, 'walk-explore');
  await pg.keyboard.press('Escape');
  check((await pg.locator('[data-testid=tooltip]').count()) === 0, 'WK22: Escape closes the tooltip');
  await h.drawerTo(pg, 'peek');
  await openPanel(pg);
  await pg.click('[data-testid=layer-walkability]');
  await h.drawerTo(pg, 'up');
  check((await pg.locator('[data-testid=layer-legend-walkability]').count()) === 0, 'WK13: switching off hides the legend');
  await h.drawerTo(pg, 'peek');
  // WK11: the area card says, in words, how its streets treat someone on foot (a third of this ring's street is each band).
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"]', { timeout: 60000 });
  await pg.click('[data-testid=atlas-tile][data-name="Fox Point"]');
  await pg.waitForSelector('[data-testid=atlas-onfoot-words]', { timeout: 30000 }).catch(() => {});
  const words = await pg.locator('[data-testid=atlas-onfoot-words]').innerText().catch(() => '');
  check(words === 'Streets close together, with crossings', `UF13, UF14: the area card for the neighborhood around the dense grid says what its ground is, in words (${JSON.stringify(words)})`);
  check(!/\d|%/.test(await pg.locator('[data-testid=atlas-onfoot]').innerText().catch(() => '1')), 'UF12: the card\'s line has no number or percentage');
  await shot(pg, 'walk-card');
  await c.close();

  // WK1b, WK3: Overture can't be read (not a PMTiles file), so Overpass answers, with the tile's bounds and nothing else.
  walkability.mode = 'broken';
  const { c: c2, pg: p2 } = await freshPage('walk-fallback');
  await p2.goto(url);
  await p2.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(p2);
  await p2.click('[data-testid=layer-walkability]');
  await p2.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 45000 }).catch(() => {});
  const second = await drawn(p2);
  check(/^foot:0\|car:[1-9]\d*$/.test(second ?? ''), `WK1b, UF3: with Overture unreadable, Overpass's ways tint the ground (one long secondary road and no junctions is built around cars) (${second})`);
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
    'src/components/{Tooltip,WalkBandIcon}.tsx',
    'src/components/map/{types,WalkMap.web,WalkMap.native}.ts*',
    'src/components/walk/{layout,useReady}.ts*',
    'src/components/atlas/AtlasCard.tsx',
    'src/app/(tabs)/index.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
