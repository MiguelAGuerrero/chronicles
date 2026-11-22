// Modes to layers (MD1-MD8, MD11, MD16, MD19; decision 0234): no Explore mode. A walk starts with the layers the ready map shows
// (decision 0260, amending MD3 and MD10; fix walk-layers-remembered); the walk's Layers panel lists Places; turning it on draws
// the "?", turning it off takes them away, and the choice is remembered; nothing covers the capture stack.
// Written first, as todos (check.todo), each failing until its code. E2E_ONLY=modes runs it alone.

async function run(h) {
  const { navUrl, BASE, at, check, freshPage, drawerTo, toStop, shot, switchLayer, metaOf } = h;
  const { c, pg } = await freshPage('modes', { touch: true });
  const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').count();
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  // MD2: the start drawer has no Quiet / Explore choice.
  await drawerTo(pg, 'half');
  await pg.waitForSelector('[data-testid=start-settings]');
  await pg.waitForTimeout(800);
  await shot(pg, 'modes-0-start-settings');
  await pg.locator('[data-testid=range-slider]').scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(500);
  await shot(pg, 'modes-0b-start-settings-range');
  check((await pg.locator('[data-testid=mode-quiet], [data-testid=mode-explore]').count()) === 0, 'MD2: the walk settings have no Quiet / Explore choice');
  await drawerTo(pg, 'peek');
  // fix walk-layers-remembered: chosen on the ready map, Storefronts on and Places off, as the walk starts with them.
  await switchLayer(pg, 'places', false);
  await switchLayer(pg, 'storefronts', true);
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  const s0 = at(-0.5, -0.5);
  await c.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
  await pg.waitForTimeout(2500);
  // MD3 (decision 0260), MD2: Places off on the ready map, the walk draws no "?" and no range ring.
  check((await marksNow()) === 0 && (await pg.locator('[data-testid=range-ring]').count()) === 0, 'MD3: with Places off on the ready map, the walk draws no "?" and no range ring');
  await shot(pg, 'modes-1-walk-fresh');
  // MD1: found by names: the Layers button, the panel, a switch named Places, off.
  await pg.getByRole('button', { name: 'Layers' }).click().catch(() => {});
  const row = pg.getByRole('switch', { name: /^Places$/ });
  check((await row.count()) === 1 && (await row.getAttribute('aria-checked').catch(() => null)) === 'false', 'MD1: the walk\'s Layers panel lists Places, off');
  // fix walk-layers-remembered: a few seconds into the walk, what the ready map showed is still on: nothing resets it.
  check((await pg.locator('[data-testid=layer-storefronts]').getAttribute('aria-checked').catch(() => null)) === 'true', 'fix walk-layers-remembered: Storefronts, switched on on the ready map, is still on during the walk');
  await pg.waitForTimeout(600);
  await shot(pg, 'modes-2-walk-panel-off');
  // MD16: with the panel open, the capture stack is still one tap: the note opens.
  check((await pg.locator('[data-testid=cap-note]').isVisible().catch(() => false)), 'MD16: the capture stack is visible with the Layers panel open');
  // MD4: on, the "?" for places within range draw as Explore mode drew them.
  await row.click().catch(() => {});
  await pg.waitForTimeout(500);
  // modes-to-layers ui 1: the Places row says how far it shows and where to set it.
  check(/within \d+[ \u00a0]m/.test(await pg.locator('[data-testid=layer-status-places]').innerText().catch(() => '')) && /Walk settings/.test(await pg.locator('[data-testid=layer-status-places]').innerText().catch(() => '')), 'modes-to-layers ui 1: the Places row says how far a "?" shows and where it is set');
  for (let k = 0; k <= 8; k++) {
    const p = at(-0.5 + k * 0.05, -0.5);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  check((await marksNow()) > 0, 'MD4: with Places on the "?" draw');
  await shot(pg, 'modes-3-walk-places-on');
  // MD19: nothing says what is left, how many, or nearby to find.
  const text = await pg.locator('body').innerText().catch(() => '');
  check(!/left to find|still to find|nearby to find|remaining/i.test(text), 'MD19: no copy says what is left to find');
  // And off again takes them away.
  await pg.getByRole('button', { name: 'Layers' }).click().catch(() => {});
  if (!(await pg.getByRole('switch', { name: /^Places$/ }).count())) await pg.locator('[data-testid=layers]').click().catch(() => {});
  await pg.getByRole('switch', { name: /^Places$/ }).click().catch(() => {});
  await pg.waitForTimeout(1200);
  check((await marksNow()) === 0, 'MD4: with Places off the "?" are gone');
  const kept = JSON.parse((await metaOf(pg, 'map_layers')) ?? '{}');
  check(kept.places === false && kept.storefronts === true && !(await metaOf(pg, 'walk_layers')), `fix walk-layers-remembered: the walk's switches are the one setting every map keeps (${JSON.stringify(kept)})`);
  await toStop(pg).catch(() => {});
  await c.close();
}

module.exports = {
  name: 'modes',
  covers: [
    'src/app/walk.tsx',
    'src/lib/layers/**',
    'src/lib/explore/{explore,useExplore,settings,placesSpans}.ts',
    'src/lib/{startPlan,useStartWalk}.ts',
    'src/components/{StartSettings,LayersControl}.tsx',
    'src/components/walk/useReady.tsx',
  ],
  run,
};
