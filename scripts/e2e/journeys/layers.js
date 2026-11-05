// Map layers (ML1-ML13): the Layers button and panel, the three layers' defaults (Walkability and Busy streets off, Town
// borders on), each switch redrawing the map, closing the panel, a reload and the other map keeping them, the old walkability
// switch read in once, and Busy streets' one read. E2E_ONLY=layers runs it alone.

async function run(h) {
  const { url, navUrl, check, shot, freshPage, overtureAsked, divisions } = h;
  const attr = (pg, name) => pg.locator(`[${name}]`).first().getAttribute(name).catch(() => null);
  const openPanel = async (pg) => {
    if (!(await pg.locator('[data-testid=layers-panel]').count())) await pg.click('[data-testid=layers]');
    await pg.waitForSelector('[data-testid=layers-panel]', { timeout: 5000 });
  };
  const on = async (pg, id) => (await pg.locator(`[data-testid=layer-${id}]`).getAttribute('aria-checked')) === 'true';
  const transport = () => overtureAsked.filter((q) => /transportation\.pmtiles/.test(q.url)).length;

  // Pawtucket's outline is served, so the Town borders layer has something to draw.
  divisions.serve = true;
  const { c, pg } = await freshPage('layers');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  // The town you are in is tinted once it is decided (TB1), a moment after its neighbour is lined.
  await pg.waitForFunction(() => (document.querySelector('[data-borders]')?.getAttribute('data-borders') ?? '').includes('tinted:'), null, { timeout: 45000 }).catch(() => {});

  // ML2, ML3: one Layers button; its panel is closed; the three layers start Walkability off, Busy streets off, Town borders on.
  check((await pg.locator('[data-testid=layers]').getAttribute('aria-label')) === 'Layers' && (await pg.locator('[data-testid=layers-panel]').count()) === 0
    && (await pg.locator('[data-testid=walk-layer]').count()) === 0, 'ML3: one Layers button, its panel closed, and no button of a layer\'s own');
  check((await attr(pg, 'data-borders')) === 'lined:Central Falls|tinted:Pawtucket' && !(await attr(pg, 'data-walk')) && !(await attr(pg, 'data-busy')),
    `ML2: on a fresh install only the town borders are drawn (${await attr(pg, 'data-borders')})`);
  await openPanel(pg);
  check((await pg.locator('[data-testid=layers]').getAttribute('aria-expanded')) === 'true', 'ML3: the button says the panel is open');
  check(!(await on(pg, 'walkability')) && !(await on(pg, 'busy')) && (await on(pg, 'borders')), 'ML2, ML5: Walkability and Busy streets are off, Town borders on, each a switch');
  check((await pg.locator('[data-testid=layer-legend-yours]').count()) === 1 && (await pg.locator('[data-testid=layer-legend-nearby]').count()) === 1
    && (await pg.locator('[data-testid=layer-swatch-yours]').count()) === 1 && (await pg.locator('[data-testid=layer-legend-walkability]').count()) === 0,
    'ML10 (legend): a layer that is on shows its legend, with a swatch, and one that is off shows none');
  const text = await pg.locator('[data-testid=layers-panel]').innerText();
  check(!/\d|%/.test(text), `ML6: no number, count or percentage in the panel (${JSON.stringify(text.slice(0, 80))})`);
  await shot(pg, 'layers-panel');

  // ML12: Town borders draw only while on, and the map redraws at once.
  await pg.click('[data-testid=layer-borders]');
  await pg.waitForFunction(() => (document.querySelector('[data-borders]')?.getAttribute('data-borders') ?? 'x') === '', null, { timeout: 5000 }).catch(() => {});
  check(!(await on(pg, 'borders')) && (await attr(pg, 'data-borders')) === '' && (await pg.locator('[data-testid=layer-legend-yours]').count()) === 0, 'ML12: with Town borders off the map draws none and its legend goes');
  await pg.click('[data-testid=layer-borders]');
  await pg.waitForFunction(() => (document.querySelector('[data-borders]')?.getAttribute('data-borders') ?? '').includes('tinted:'), null, { timeout: 10000 }).catch(() => {});
  check((await attr(pg, 'data-borders')) === 'lined:Central Falls|tinted:Pawtucket', 'ML12: on again, the borders come back');

  // ML4: the button and Escape close the panel, and so does a tap on the map.
  await pg.keyboard.press('Escape');
  check((await pg.locator('[data-testid=layers-panel]').count()) === 0, 'ML4: Escape closes the panel');
  await openPanel(pg);
  await pg.click('[data-testid=layers]');
  check((await pg.locator('[data-testid=layers-panel]').count()) === 0, 'ML4: the button closes it');
  await openPanel(pg);
  const box = await pg.locator('canvas.maplibregl-canvas').last().boundingBox();
  // Above the panel, right of the title: bare map in Explore's short pane.
  await pg.mouse.click(box.x + 224, box.y + 22);
  await pg.waitForTimeout(400);
  check((await pg.locator('[data-testid=layers-panel]').count()) === 0, 'ML4: a tap on the map closes it');

  // ML13, WK4: nothing is read for Walkability while it is off.
  check(transport() === 0, `ML13: no transportation tile is read while Walkability is off (${transport()})`);

  // ML8, ML9: Busy streets draw on request, and are read once where nothing is remembered.
  await openPanel(pg);
  await pg.click('[data-testid=layer-busy]');
  check((await pg.locator('[data-testid=layer-legend-busy]').count()) === 1, 'ML8: Busy streets on shows its legend');
  await pg.waitForFunction(() => /^strips:[1-9]/.test(document.querySelector('[data-busy]')?.getAttribute('data-busy') ?? ''), null, { timeout: 90000 }).catch(() => {});
  const busy = await attr(pg, 'data-busy');
  check(/^strips:[1-9]/.test(busy ?? ''), `ML8, ML9: with the layer on and nothing remembered, the area is read once and its busy streets are drawn (${busy})`);
  await shot(pg, 'layers-busy');

  // ML5, ML7: a switch moves no other layer, and the setting is one for every map and survives a reload.
  await pg.click('[data-testid=layer-walkability]');
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  check(/^foot:[1-9]\d*\|car:[1-9]\d*$/.test((await attr(pg, 'data-walk')) ?? '') && (await on(pg, 'busy')) && (await on(pg, 'borders')), `ML5: Walkability on draws its layer and moves no other (${await attr(pg, 'data-walk')})`);
  await pg.click('[data-testid=layer-borders]');
  await pg.reload();
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(pg);
  check((await on(pg, 'walkability')) && (await on(pg, 'busy')) && !(await on(pg, 'borders')), 'ML7: after a reload the layers are as they were left');
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(pg);
  check((await on(pg, 'walkability')) && (await on(pg, 'busy')) && !(await on(pg, 'borders')), 'ML7: Navigate\'s map has the same layers, one setting for every map');
  await pg.waitForFunction(() => (document.querySelector('[data-walk]')?.getAttribute('data-walk') ?? '') !== '', null, { timeout: 30000 }).catch(() => {});
  check((await attr(pg, 'data-borders')) === '' && /^foot:/.test((await attr(pg, 'data-walk')) ?? ''), 'ML3, ML12: Navigate\'s Layers button switches the same drawing (no borders, walkability drawn)');
  await shot(pg, 'layers-navigate');
  await pg.click('[data-testid=layer-busy]');
  await pg.waitForFunction(() => (document.querySelector('[data-busy]')?.getAttribute('data-busy') ?? 'x') === '', null, { timeout: 5000 }).catch(() => {});
  check(!(await attr(pg, 'data-busy')), 'ML8: with Busy streets off the map draws none');
  await c.close();

  // ML7: someone who turned the walkability switch on before layers existed has it on, once.
  const { c: c2, pg: p2 } = await freshPage('layers-migrate');
  await p2.goto(url);
  await p2.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await p2.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key: 'walk_layer', value: '1' });
      tx.oncomplete = () => resolve(true);
    };
  }));
  await p2.reload();
  await p2.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel(p2);
  check(await on(p2, 'walkability'), 'ML7: the old walkability switch, on, is read in as Walkability on');
  divisions.serve = false;
  await c2.close();
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
