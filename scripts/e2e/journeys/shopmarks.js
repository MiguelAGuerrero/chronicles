// Shop marks (SM1-SM3, SM10, SM11, SM13, SM14, SM16): the Shop marks layer on the maps that have a Layers button, over a fixture pack
// the harness serves at /shop-marks-e2e/: off by default and nothing asked while off; on, the drawn shops are marks (an errand shop is
// not one, two close ones are one); a tap on a lone mark opens its card at the map's top, a tap elsewhere only closes it, a tap on
// the merged mark zooms and opens none; the card never meets the capture stack. E2E_ONLY=shopmarks runs it alone.

async function run(h) {
  const { exploreUrl, navUrl, at, check, freshPage, shopPack, shot } = h;
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');

  // The pack's shape (specs/shop-marks, SM4): z12 tiles, layer `shop marks`, a type, a name and a position. Around the first
  // leg: a second-hand shop, a bookshop, two charity shops 10 m apart (one mark at zoom 15), and a supermarket (never drawn).
  const shops = [
    ['second_hand', 'Second Chance', at(0.2, 0.1)],
    ['books', 'Page One Books', at(-0.9, 0.35)],
    ['charity', 'Twin A', at(1.0, -0.4)],
    ['charity', 'Twin B', at(1.0, -0.3)],
    ['supermarket', 'Corner Grocer', at(-0.1, -0.2)],
  ].map(([type, name, p]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { type, name } }));
  const z = 12;
  const tileOf = ([lon, lat]) => {
    const r = (lat * Math.PI) / 180;
    return [Math.floor(((lon + 180) / 360) * 2 ** z), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)];
  };
  const tiles = new Map();
  for (const f of shops) tiles.set(tileOf(f.geometry.coordinates).join(','), tileOf(f.geometry.coordinates));
  const archive = encodeArchive([...tiles.values()].map(([x, y]) => ({ z, x, y, data: encodeTile(shops, z, x, y, () => ['shops']) })), [-125, 24, -66.9, 49.4]);
  const file = 'shops-us-20261114.pmtiles';
  shopPack.files[file] = archive;
  shopPack.manifest = JSON.stringify({
    schema: 1,
    regions: [{ id: 'us', current: { file, version: '20261114', bytes: archive.length, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] }, previous: [] }],
  });
  shopPack.asked.length = 0;

  const { c, pg } = await freshPage('shop marks');
  // The e2e taps a spot on the map by where a point lies (the map reports it only while measuring).
  await c.addInitScript(() => { window.__perf = {}; });
  const count = (sel) => pg.locator(sel).count().catch(() => 0);
  const attr = (name) => pg.locator(`[${name}]`).first().getAttribute(name).catch(() => null);
  const openPanel = async () => {
    if (!(await count('[data-testid=layers-panel]'))) await pg.click('[data-testid=layers]');
    await pg.waitForSelector('[data-testid=layers-panel]', { timeout: 5000 });
  };
  const here = at(0, 0);
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });

  // SM1, SM2, SM13: the Explore map's panel has a Shop marks switch of its own, off on a fresh install, and nothing is asked of the pack.
  await pg.goto(exploreUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await pg.waitForTimeout(2500);
  await shot(pg, 'shopmarks-explore-closed');
  await openPanel();
  check((await count('[data-testid=layer-storefronts]')) === 1, 'SM1: the Explore map\'s Layers panel has a Shop marks switch');
  check((await pg.locator('[data-testid=layer-storefronts]').getAttribute('aria-checked')) === 'false', 'SM2: it is off on a fresh install');
  check(shopPack.asked.length === 0, `SM2: while it is off nothing is asked of the shop pack (${shopPack.asked.length})`);
  check(!/\d|%/.test(await pg.locator('[data-testid=layers-panel]').innerText()), 'SM13: no number, count or percentage in the panel');
  const rowIcons = await pg.locator('[data-testid=layers-panel]').evaluate((el) => [...el.querySelectorAll('[data-testid^=layer-]')].map((e) => e.getAttribute('data-testid')));
  check(rowIcons.includes('layer-busy') && rowIcons.includes('layer-storefronts'), `SM1: Busy streets and Shop marks are two rows (${JSON.stringify(rowIcons)})`);
  await shot(pg, 'shopmarks-explore-panel');
  await pg.keyboard.press('Escape');

  // SM1, SM3: Navigate ready draws the shops from the same setting, as marks: the errand shop is not one, the twins are one.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await pg.waitForFunction(() => Number(document.querySelector('[data-zoom]')?.getAttribute('data-zoom') ?? 0) >= 14, null, { timeout: 30000 }).catch(() => {});
  await shot(pg, 'shopmarks-ready-closed');
  await openPanel();
  check(shopPack.asked.length === 0, 'SM2: Navigate\'s map, with the layer off, asks nothing either');
  await pg.click('[data-testid=layer-storefronts]');
  await pg.waitForFunction(() => Number(document.querySelector('[data-shop-marks]')?.getAttribute('data-shop-marks') ?? 0) > 0, null, { timeout: 30000 }).catch(() => {});
  check((await attr('data-shop-marks')) === '3', `SM1, SM9, SM10: three marks: two shops and the twins as one, no supermarket (${await attr('data-shop-marks')})`);
  const note = await pg.locator('[data-testid=layer-status-storefronts]').innerText().catch(() => '');
  check(/Tap a mark/.test(note) && !/\d/.test(note), `SM1, SM13: the panel's one line says what a mark is, in words (${JSON.stringify(note)})`);
  check(shopPack.asked.every((q) => q.cookie == null && q.referer == null), 'SM6: the pack is asked for with no cookie or referer');
  await pg.keyboard.press('Escape');
  await pg.reload();
  await pg.waitForFunction(() => Number(document.querySelector('[data-shop-marks]')?.getAttribute('data-shop-marks') ?? 0) > 0, null, { timeout: 30000 }).catch(() => {});
  check((await attr('data-shop-marks')) === '3', 'SM3: after a reload the layer is as it was left, one setting for every map');

  // SM14: a tap on a lone mark opens its card; no label names a shop on the map (SM11).
  const px = async (p) => pg.evaluate((q) => window.__project(q), p);
  const tap = async (p) => { const [x, y] = await px(p); await pg.mouse.click(x, y); await pg.waitForTimeout(700); };
  await tap(at(0.2, 0.1));
  check((await count('[data-testid=shop-card]')) === 1, 'SM14: a tap on a lone mark opens its card');
  const cardText = await pg.locator('[data-testid=shop-card]').innerText().catch(() => '');
  check(/Second Chance/.test(cardText) && /Second hand/.test(cardText) && !/\d|chain|independent|rating|open/i.test(cardText), `SM14, SM15: the card holds the name and its kind in words and nothing else (${JSON.stringify(cardText)})`);
  check((await pg.locator('[data-testid=shop-card]').getAttribute('aria-live')) === 'polite', 'shop-marks ui 7: the card announces itself when it opens');
  check((await count('[data-shop-label]')) === 0, 'SM11: no label on the map names a shop');
  const close = await pg.locator('[data-testid=shop-card-close]').boundingBox();
  check(!!close && close.width >= 44 && close.height >= 44, `SM16: the card's close control is at least 44 px (${JSON.stringify(close)})`);
  await shot(pg, 'shopmarks-ready-card');

  // SM16: the card never meets the capture stack.
  const card = await pg.locator('[data-testid=shop-card]').boundingBox();
  const stackBtns = await pg.locator('[data-testid$=-photo], [data-testid$=-voice], [data-testid$=-note]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { y: r.top, h: r.height, w: r.width }; }).filter((b) => b.w > 0));
  check(!!card && stackBtns.length > 0 && stackBtns.every((b) => b.y >= card.y + card.height || b.y + b.h <= card.y), `SM16: the card clears the capture stack (${JSON.stringify({ card, stackBtns })})`);

  // SM14: a tap elsewhere only closes the card; a tap on the merged mark zooms and opens none.
  await tap(at(-0.5, -0.9));
  check((await count('[data-testid=shop-card]')) === 0, 'SM14: a tap elsewhere closes the card');
  const z0 = Number(await attr('data-zoom'));
  await tap(at(1.0, -0.35));
  await pg.waitForTimeout(1200);
  check((await count('[data-testid=shop-card]')) === 0 && Number(await attr('data-zoom')) > z0 + 1, `SM14: a tap on the merged mark zooms in and opens no card (${z0} to ${await attr('data-zoom')})`);

  // SM2: switched off, the marks go and the layer asks no more.
  await openPanel();
  await pg.click('[data-testid=layer-storefronts]');
  await pg.waitForFunction(() => document.querySelector('[data-shop-marks]')?.getAttribute('data-shop-marks') === '0', null, { timeout: 10000 }).catch(() => {});
  check((await attr('data-shop-marks')) === '0', 'SM2: switched off, the map draws none');

  // SM3: Explore's map is a host too: switched on there, it says what it is doing in the panel's one line, in words, with no number.
  await pg.goto(exploreUrl);
  await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
  await openPanel();
  await pg.click('[data-testid=layer-storefronts]');
  // The map reports its zoom a moment after it loads: until it does the line says "Zoom in to see them", and then the layer reads.
  await pg.waitForFunction(() => Number(document.querySelector('[data-shop-marks]')?.getAttribute('data-shop-marks') ?? 0) > 0, null, { timeout: 30000 }).catch(() => {});
  const exLine = await pg.locator('[data-testid=layer-status-storefronts]').innerText().catch(() => '');
  check(/Tap a mark/.test(exLine) && !/\d/.test(exLine), `SM3, SM7: Explore's panel says what a mark is, in words (${JSON.stringify(exLine)})`);
  check((await attr('data-shop-marks')) === '3', `SM3: Explore's map draws the shops too (${await attr('data-shop-marks')} at zoom ${await attr('data-zoom')})`);
  await shot(pg, 'shopmarks-explore-on');
  await pg.keyboard.press('Escape');

  // SM3, SM12: the live walk is the third host: started from Navigate, it draws the shops within 800 m of you, and the card opens clear of
  // the capture stack; the layer is on from the one setting.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname.endsWith('/walk'), { timeout: 15000 });
  await c.setGeolocation({ longitude: here[0], latitude: here[1] + 0.000002, accuracy: 6 });
  await pg.waitForFunction(() => Number(document.querySelector('[data-shop-marks]')?.getAttribute('data-shop-marks') ?? 0) > 0, null, { timeout: 30000 }).catch(() => {});
  check((await attr('data-shop-marks')) === '3', `SM3, SM12: the live walk draws the shops within 800 m of you (${await attr('data-shop-marks')})`);
  await tap(at(0.2, 0.1));
  const wcard = await pg.locator('[data-testid=shop-card]').boundingBox().catch(() => null);
  const wstack = await pg.locator('[data-testid$=-photo], [data-testid$=-voice], [data-testid$=-note]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { y: r.top, h: r.height, w: r.width }; }).filter((b) => b.w > 0));
  check(!!wcard && wstack.length > 0 && wstack.every((b) => b.y >= wcard.y + wcard.height || b.y + b.h <= wcard.y), `SM14, SM16: on the live walk the card opens clear of the capture stack (${JSON.stringify({ wcard, wstack })})`);
  await shot(pg, 'shopmarks-walk-card');
  await pg.close().catch(() => {});
}

module.exports = {
  name: 'shop marks',
  covers: [
    'src/lib/shop marks/**',
    'src/components/ShopCard.tsx',
    'src/lib/layers/**',
    'src/components/map/{types,WalkMap.web,WalkMap.native}.ts*',
    'src/components/walk/useReady.tsx',
    'src/app/(tabs)/explore.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
