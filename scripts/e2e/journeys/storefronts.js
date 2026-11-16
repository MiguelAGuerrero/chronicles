// Storefronts (SF1-SF3, SF10, SF14, SF16): the Storefronts layer on the three maps that have a Layers button. Test first: every
// check is a todo until its code exists. E2E_ONLY=storefronts runs it alone.

async function run(h) {
  const { exploreUrl, navUrl, check, freshPage } = h;
  const { pg } = await freshPage('storefronts');
  const count = (sel) => pg.locator(sel).count().catch(() => 0);
  const attr = (name) => pg.locator(`[${name}]`).first().getAttribute(name).catch(() => null);

  await pg.goto(exploreUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await pg.click('[data-testid=layers]');
  await pg.waitForSelector('[data-testid=layers-panel]', { timeout: 5000 });

  // SF1, SF2: a switch row of its own, off by default, nothing asked while it is off.
  check.todo((await count('[data-testid=layer-storefronts]')) === 1 && (await pg.locator('[data-testid=layer-storefronts]').getAttribute('aria-checked').catch(() => null)) === 'false', 'SF1, SF2: the panel has a Storefronts switch, off on a fresh install');
  check.todo(h.storefrontsAsked.length === 0, 'SF2: while it is off nothing is asked of the storefront pack');
  check.todo(!/\d|%/.test(await pg.locator('[data-testid=layers-panel]').innerText()), 'SF13: no number, count or percentage in the panel');

  // SF1, SF10: on, the map draws the fixture's shops as same-size marks, none named.
  await pg.click('[data-testid=layer-storefronts]').catch(() => {});
  await pg.waitForTimeout(3000);
  check.todo(Number(await attr('data-storefronts')) > 0, 'SF1: with Storefronts on the Explore map draws the fixture pack\'s shops');
  check.todo((await count('[data-storefront-label]')) === 0, 'SF11: no label names a shop');

  // SF14, SF16: a tap on one opens the card at the map's top; a merged mark zooms and opens none.
  await pg.click('[data-testid=storefront-mark]').catch(() => {});
  check.todo((await count('[data-testid=storefront-card]')) === 1, 'SF14: a tap on an unmerged mark opens its card');
  const card = await pg.locator('[data-testid=storefront-card]').boundingBox().catch(() => null);
  check.todo(!!card && card.y < 422, 'SF16: the card sits in the top part of the map');
  const close = await pg.locator('[data-testid=storefront-card-close]').boundingBox().catch(() => null);
  check.todo(!!close && close.width >= 44 && close.height >= 44, 'SF16: the card\'s close control is at least 44 px');

  // SF3, SF16: the other two maps keep the setting; on Navigate the card never meets the capture stack and a capture still starts.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  check.todo((await attr('data-storefronts')) !== null, 'SF3: Navigate ready draws the layer from the one setting');
  await pg.click('[data-testid=storefront-mark]').catch(() => {});
  const stack = await pg.locator('[data-testid=capture-stack]').boundingBox().catch(() => null);
  const c2 = await pg.locator('[data-testid=storefront-card]').boundingBox().catch(() => null);
  check.todo(!!stack && !!c2 && (c2.y + c2.height <= stack.y || c2.y >= stack.y + stack.height), 'SF16: on Navigate the card never meets the capture stack');
  await pg.close().catch(() => {});
}

module.exports = {
  name: 'storefronts',
  covers: [
    'src/lib/storefronts/**',
    'src/components/StorefrontCard.tsx',
    'src/lib/layers/**',
    'src/components/map/{types,WalkMap.web,WalkMap.native}.ts*',
    'src/components/walk/useReady.tsx',
    'src/app/(tabs)/explore.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
