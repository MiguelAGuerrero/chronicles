// Map layers (ML1-ML13) and their UI audit (layers audit 1-13): the Layers button and panel, the three layers' defaults (all off),
// each switch redrawing the map, closing the panel, a reload and the other map keeping them, the old walkability switch read in
// once, Busy streets' one read, and the panel's fit on a short phone and a wide window. E2E_ONLY=layers runs it alone.

async function run(h) {
  const { url, navUrl, BASE, at, check, shot, freshPage, overtureAsked, divisions, tabTo } = h;
  const attr = (pg, name) => pg.locator(`[${name}]`).first().getAttribute(name).catch(() => null);
  const openPanel = async (pg) => {
    if (!(await pg.locator('[data-testid=layers-panel]').count())) await pg.click('[data-testid=layers]');
    await pg.waitForSelector('[data-testid=layers-panel]', { timeout: 5000 });
  };
  const on = async (pg, id) => (await pg.locator(`[data-testid=layer-${id}]`).getAttribute('aria-checked')) === 'true';
  const transport = () => overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url)).length;
  const box = (pg, sel) => pg.locator(sel).first().boundingBox();

  // Pawtucket's outline is served, so the Town borders layer has something to draw when it is on.
  divisions.serve = true;
  const { c, pg } = await freshPage('layers');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await pg.waitForTimeout(2500);

  // ML2, ML3: one Layers button; its panel is closed; every layer starts off and the map draws none of them.
  check((await pg.locator('[data-testid=layers]').getAttribute('aria-label')) === 'Layers' && (await pg.locator('[data-testid=layers-panel]').count()) === 0
    && (await pg.locator('[data-testid=walk-layer]').count()) === 0, 'ML3: one Layers button, its panel closed, and no button of a layer\'s own');
  check(!(await attr(pg, 'data-borders')) && !(await attr(pg, 'data-walk')) && !(await attr(pg, 'data-busy')), `ML2: on a fresh install the map draws no layer (${await attr(pg, 'data-borders')})`);
  await openPanel(pg);
  check((await pg.locator('[data-testid=layers]').getAttribute('aria-expanded')) === 'true', 'ML3: the button says the panel is open');
  check(!(await on(pg, 'walkability')) && !(await on(pg, 'busy')) && !(await on(pg, 'borders')), 'ML2, ML5: Walkability, Busy streets and Town borders are all off, each a switch');
  check((await pg.locator('[data-testid=layer-legend-walkability]').count()) === 0 && (await pg.locator('[data-testid=layer-legend-yours]').count()) === 0, 'a layer that is off shows no legend');
  const text = await pg.locator('[data-testid=layers-panel]').innerText();
  check(!/\d|%/.test(text), `ML6: no number, count or percentage in the panel (${JSON.stringify(text.slice(0, 80))})`);
  const btn = await box(pg, '[data-testid=layers]');
  check(btn.width >= 44 && btn.height >= 44, `the Layers button is at least 44 px (${btn.width}x${btn.height})`);
  await shot(pg, 'layers-panel');

  // ML12: Town borders draw only while on, and the map redraws at once.
  await pg.click('[data-testid=layer-borders]');
  await pg.waitForFunction(() => (document.querySelector('[data-borders]')?.getAttribute('data-borders') ?? '').includes('tinted:'), null, { timeout: 45000 }).catch(() => {});
  check((await attr(pg, 'data-borders')) === 'lined:Central Falls|tinted:Pawtucket',
    `ML12: with Town borders on the map draws the town you are in and its neighbour (${await attr(pg, 'data-borders')})`);
  check((await pg.locator('[data-testid=layers-key]').count()) === 0 && (await pg.locator('[data-testid=layer-legend-yours]').count()) === 0, 'the panel over the map carries no legend: it is in the walk\'s settings');
  check(!/\d|%/.test(await pg.locator('[data-testid=layers-panel]').innerText()), 'ML6: still no number with a legend open');
  await pg.click('[data-testid=layer-borders]');
  await pg.waitForFunction(() => (document.querySelector('[data-borders]')?.getAttribute('data-borders') ?? 'x') === '', null, { timeout: 5000 }).catch(() => {});
  check(!(await on(pg, 'borders')) && (await attr(pg, 'data-borders')) === '', 'ML12: switched off, the map draws none');

  // ML4: the button and Escape close the panel, and so does a tap on the map.
  await pg.keyboard.press('Escape');
  check((await pg.locator('[data-testid=layers-panel]').count()) === 0, 'ML4: Escape closes the panel');
  await openPanel(pg);
  await pg.click('[data-testid=layers]');
  check((await pg.locator('[data-testid=layers-panel]').count()) === 0, 'ML4: the button closes it');
  await openPanel(pg);
  const mapBox = await pg.locator('canvas.maplibregl-canvas').last().boundingBox();
  // Above the panel, right of the title: bare map in Explore's short pane.
  await pg.mouse.click(mapBox.x + 224, mapBox.y + 6);
  await pg.waitForTimeout(400);
  check((await pg.locator('[data-testid=layers-panel]').count()) === 0, 'ML4: a tap on the map closes it');

  // layers audit 5: a panel left open does not follow you to another screen.
  await openPanel(pg);
  await tabTo(pg, 'navigate');
  await pg.waitForSelector('[data-testid=start]', { timeout: 15000 });
  check((await pg.locator('[data-testid=layers-panel]').count()) === 0, 'layers audit 5: the panel is closed after a tab change');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });

  // ML11: the Chronicle map is left alone.
  await tabTo(pg, 'chronicle');
  await pg.waitForTimeout(800);
  check((await pg.locator('[data-testid=layers]').count()) === 0, 'ML11: the Chronicle map has no Layers button');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });

  // ML13, WK4: nothing is read for Walkability while it is off.
  check(transport() === 0, `ML13: no transportation tile is read while Walkability is off (${transport()})`);

  // ML8, ML9: Busy streets draw on request, and are read once where nothing is remembered.
  await openPanel(pg);
  await pg.click('[data-testid=layer-busy]');
  await pg.waitForFunction(() => /^strips:[1-9]/.test(document.querySelector('[data-busy]')?.getAttribute('data-busy') ?? ''), null, { timeout: 90000 }).catch(() => {});
  const busy = await attr(pg, 'data-busy');
  check(/^strips:[1-9]/.test(busy ?? ''), `ML8, ML9: with the layer on and nothing remembered, the area is read once and its busy streets are drawn (${busy})`);
  await shot(pg, 'layers-busy');

  // ML5, ML7: a switch moves no other layer, and the setting is one for every map and survives a reload.
  await pg.click('[data-testid=layer-walkability]');
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  check(/^foot:[1-9]\d*\|car:[1-9]\d*$/.test((await attr(pg, 'data-walk')) ?? '') && (await on(pg, 'busy')) && !(await on(pg, 'borders')), `ML5: Walkability on draws its layer and moves no other (${await attr(pg, 'data-walk')})`);
  await pg.click('[data-testid=layer-borders]');
  await pg.reload();
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(pg);
  check((await on(pg, 'walkability')) && (await on(pg, 'busy')) && (await on(pg, 'borders')), 'ML7: after a reload the layers are as they were left');
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(pg);
  check((await on(pg, 'walkability')) && (await on(pg, 'busy')) && (await on(pg, 'borders')), 'ML7: Navigate\'s map has the same layers, one setting for every map');
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  check(/^foot:/.test((await attr(pg, 'data-walk')) ?? ''), 'ML3: Navigate\'s Layers button switches the same drawing');
  await shot(pg, 'layers-navigate');
  // The legend is in the settings drawer: one block per layer that is on, none over the map.
  await pg.click('[data-testid=layers]');
  await h.drawerTo(pg, 'up');
  await pg.waitForSelector('[data-testid=layers-key]', { timeout: 5000 });
  check((await pg.locator('[data-testid=layer-legend-walkability]').count()) === 1 && (await pg.locator('[data-testid=layer-legend-busy]').count()) === 1
    && (await pg.locator('[data-testid=layer-legend-yours]').count()) === 1 && (await pg.locator('[data-testid=layer-legend-nearby]').count()) === 1 && (await pg.locator('[data-testid=layer-swatch-yours]').count()) === 1,
    'ML8, ML12: the walk\'s settings drawer shows the legend of each layer that is on, with a swatch');
  check(!/\d|%/.test(await pg.locator('[data-testid=layers-key]').innerText()), 'ML6: no number in the drawer\'s legend');
  await shot(pg, 'layers-key');
  await h.drawerTo(pg, 'peek');
  await openPanel(pg);
  await pg.click('[data-testid=layer-busy]');
  await pg.waitForFunction(() => (document.querySelector('[data-busy]')?.getAttribute('data-busy') ?? 'x') === '', null, { timeout: 5000 }).catch(() => {});
  check(!(await attr(pg, 'data-busy')), 'ML8: with Busy streets off the map draws none');
  await c.close();

  // layers audit 1: on a short phone (375x667) with every layer on, on a live walk, the panel fits and every switch is reachable,
  // and it covers none of the capture stack.
  const { c: c2, pg: p2 } = await freshPage('layers-small');
  await p2.setViewportSize({ width: 375, height: 667 });
  await p2.goto(navUrl);
  await p2.waitForSelector('[data-testid=start]');
  await p2.click('[data-testid=start]');
  await p2.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  const s0 = at(-0.5, -0.5);
  await c2.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
  await p2.waitForTimeout(2500);
  for (const id of ['walkability', 'busy', 'borders']) {
    await openPanel(p2);
    if (!(await on(p2, id))) await p2.click(`[data-testid=layer-${id}]`);
  }
  await openPanel(p2);
  const vp = await p2.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const inside = async (sel) => {
    const b = await box(p2, sel);
    return !!b && b.x >= 0 && b.y >= 0 && b.x + b.width <= vp.w && b.y + b.height <= vp.h;
  };
  const panel = await box(p2, '[data-testid=layers-panel]');
  check(await inside('[data-testid=layer-walkability]') && await inside('[data-testid=layer-busy]') && await inside('[data-testid=layer-borders]'),
    `layers audit 1: on a 375x667 walk with every layer on, every switch is on screen (${JSON.stringify(panel)})`);
  const clash = [];
  for (const id of ['cap-photo', 'cap-voice', 'cap-note', 'stop']) {
    const b = await box(p2, `[data-testid=${id}]`).catch(() => null);
    if (b && panel.x < b.x + b.width && panel.x + panel.width > b.x && panel.y < b.y + b.height && panel.y + panel.height > b.y) clash.push(id);
  }
  check(clash.length === 0, `ML4: the panel covers none of the capture stack or the stop button (${clash.join(',') || 'none'})`);
  // fix layers-corner: on Navigate the button is in the bottom-left corner, off the right column and the navigation bar, and its panel opens to its right.
  const lb = await box(p2, '[data-testid=layers]');
  check(lb.x + lb.width / 2 < vp.w / 2 && lb.y > vp.h / 2 && panel.x >= lb.x + lb.width && panel.y + panel.height <= lb.y + lb.height + 1,
    `fix layers-corner: the Layers button is in the bottom-left corner and the panel opens beside it, growing upward (${JSON.stringify(lb)}, ${JSON.stringify(panel)})`);
  await shot(p2, 'layers-small');
  // layers audit 2: with Busy streets on, a walker's fixes do not rebuild the drawing once a fix.
  await p2.waitForFunction(() => /^strips:/.test(document.querySelector('[data-busy]')?.getAttribute('data-busy') ?? ''), null, { timeout: 90000 }).catch(() => {});
  const sets0 = Number(await attr(p2, 'data-busy-sets'));
  for (let k = 1; k <= 8; k++) {
    await c2.setGeolocation({ longitude: s0[0] + k * 0.00001, latitude: s0[1] + k * 0.000004, accuracy: 6 });
    await p2.waitForTimeout(1000);
  }
  const sets1 = Number(await attr(p2, 'data-busy-sets'));
  check(sets1 - sets0 <= 1, `layers audit 2: eight fixes with Busy streets on send the drawing at most once more (${sets0} -> ${sets1})`);
  await c2.close();

  // layers audit 3: a wide Explore (two panes, a narrow map) keeps a panel wide enough to read, inside the map pane.
  const { c: c3, pg: p3 } = await freshPage('layers-wide');
  await p3.setViewportSize({ width: 1280, height: 800 });
  await p3.goto(url);
  await p3.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(p3);
  const wide = await box(p3, '[data-testid=layers-panel]');
  const pane = await box(p3, 'canvas.maplibregl-canvas');
  check(wide.width >= 280 && wide.x >= pane.x && wide.x + wide.width <= pane.x + pane.width + 1, `layers audit 3: at 1280x800 the panel is at least 280 px wide and inside the map pane (${Math.round(wide.width)} px, pane ${Math.round(pane.width)})`);
  await shot(p3, 'layers-wide');
  await c3.close();

  // ML7: someone who turned the walkability switch on before layers existed has it on, once.
  const { c: c4, pg: p4 } = await freshPage('layers-migrate');
  await p4.goto(url);
  await p4.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await p4.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key: 'walk_layer', value: '1' });
      tx.oncomplete = () => resolve(true);
    };
  }));
  await p4.reload();
  await p4.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(p4);
  check(await on(p4, 'walkability'), 'ML7: the old walkability switch, on, is read in as Walkability on');
  divisions.serve = false;
  await c4.close();
}

module.exports = {
  name: 'layers',
  covers: [
    'src/lib/layers/**',
    'src/components/LayersControl.tsx',
    'src/components/map/{types,WalkMap.web,WalkMap.native}.ts*',
    'src/components/walk/{layout,useReady}.ts*',
    'src/app/(tabs)/index.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
