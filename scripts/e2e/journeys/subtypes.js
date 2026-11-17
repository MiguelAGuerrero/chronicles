// Explore subtypes (specs/explore-subtypes XS1, XS2, XS6, XS22-XS24; decision 0191): the places archive brings a waterfall
// beside the walk; an exploring walk names it. "What I'm into" shows five category headings, each over its kinds, with the
// subtypes indented under them; Ghost towns sits under Curiosities, off; the ready bar's settings list the same rows as the
// walk's drawer. E2E_ONLY=subtypes runs it alone.

const HEADINGS = ['Art', 'History', 'Parks & green spaces', 'Culture', 'Viewpoints & oddities'];

async function run(h) {
  const { navUrl, BASE, at, check, drawerTo, freshPage, places, shot } = h;
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');
  const fallsAt = at(0.1, -0.48);
  const z = 12;
  const tileOf = ([lon, lat]) => {
    const r = (lat * Math.PI) / 180;
    return [Math.floor(((lon + 180) / 360) * 2 ** z), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)];
  };
  const [x, y] = tileOf(fallsAt);
  const feat = (p, name, cls, id) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { name, class: cls, src: 'wd', id } });
  const archive = encodeArchive([{ z, x, y, data: encodeTile([feat(fallsAt, 'Bushkill Falls', 'waterfall', 'p_0000000000b00001')], z, x, y, () => ['places']) }], [-125, 24, -66.9, 49.4]);
  const file = 'places-us-20261117.pmtiles';
  places.files[file] = archive;
  places.manifest = JSON.stringify({
    schema: 1,
    regions: [{ id: 'us', current: { file, version: '20261117', bytes: archive.length, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] } }],
  });

  const { c, pg } = await freshPage('subtypes');
  const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key, value });
      tx.oncomplete = () => resolve(true);
    };
  }), [k, v]);
  const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  /** The list's order as drawn: headings and rows, top to bottom. */
  const listOrder = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid^=kind-heading-], [data-testid^=kind-]')]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .map((e) => ({ id: e.getAttribute('data-testid'), text: e.innerText.trim(), role: e.getAttribute('role'), left: e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft || '0'), h: e.getBoundingClientRect().height })));

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');

  await setMeta('start_mode', 'explore');
  await pg.reload();
  await pg.waitForSelector('[data-testid=start]');

  // XS24: the ready bar's settings (Explore mode shows "What I'm into") list the same rows as the walk's drawer (compared below).
  await drawerTo(pg, 'half');
  await pg.waitForSelector('[data-testid=start-settings]');
  await pg.waitForTimeout(800);
  const ready = (await listOrder()).map((r) => r.id);
  await drawerTo(pg, 'peek');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  const seen = [];
  for (let k = 0; k <= 23; k++) {
    const p = at(-0.5 + k * 0.05, -0.5);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
    seen.push(...(await marksNow()));
  }
  check(seen.some((l) => /Bushkill Falls/.test(String(l))), `XS1: an exploring walk names the archive's waterfall within 60 m (${JSON.stringify([...new Set(seen)])})`);

  await pg.click('[data-testid=walk-summary]');
  await pg.waitForSelector('[data-testid=options-card]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const drawer = await listOrder();
  const heads = drawer.filter((r) => r.id.startsWith('kind-heading-'));
  check(JSON.stringify(heads.map((r) => r.text)) === JSON.stringify(HEADINGS), `XS2: five headings in order (${JSON.stringify(heads.map((r) => r.text))})`);
  check(heads.length === 5 && heads.every((r) => r.role === 'heading'), 'XS23: each heading is announced as a header');
  const idx = (id) => drawer.findIndex((r) => r.id === id);
  check(idx('kind-ghost_towns') > idx('kind-curiosities') && idx('kind-curiosities') > idx('kind-heading-viewpoints'),
    `XS2: Ghost towns sits under Curiosities, under Viewpoints & oddities (${idx('kind-heading-viewpoints')} < ${idx('kind-curiosities')} < ${idx('kind-ghost_towns')})`);
  const ghost = drawer.find((r) => r.id === 'kind-ghost_towns');
  const curio = drawer.find((r) => r.id === 'kind-curiosities');
  const ghostOn = await pg.locator('[data-testid=kind-ghost_towns]').getAttribute('aria-checked').catch(() => null);
  check(!!ghost && !!curio && ghost.left > curio.left && ghostOn === 'false', `XS6: Ghost towns is indented and off (${JSON.stringify({ ghost: ghost?.left, curio: curio?.left, ghostOn })})`);
  check(drawer.every((r) => !/\d/.test(r.text)), 'XS19: no heading or row carries a number');
  // explore-subtypes audit 16: a category heading is no smaller than the rows it heads, and bold.
  const sizes = await pg.evaluate(() => {
    const px = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
    const head = document.querySelector('[data-testid=kind-heading-art]');
    const row = [...document.querySelectorAll('[data-testid=kind-public_art] *')].find((e) => e.childElementCount === 0 && /Public art/.test(e.textContent || ''));
    return { head: px(head), row: px(row), weight: head ? getComputedStyle(head).fontWeight : '' };
  });
  check(sizes.head >= sizes.row && Number(sizes.weight) >= 600, `explore-subtypes audit 16: the heading is at least the rows' size, bold (${JSON.stringify(sizes)})`);
  await shot(pg, 'subtypes-what-im-into');
  // The middle and the end of the list, for the UI review (decision 0145).
  await pg.locator('[data-testid=kind-bridges]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(pg, 'subtypes-what-im-into-structures');
  await pg.locator('[data-testid=kind-ghost_towns]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(pg, 'subtypes-what-im-into-curiosities');
  const rows = drawer.filter((r) => !r.id.startsWith('kind-heading-')).map((r) => r.id);
  check(ready.length > 0 && JSON.stringify(ready) === JSON.stringify(drawer.map((r) => r.id)), `XS24: the ready bar and the walk's drawer list the same rows (${ready.length} vs ${drawer.length})`);

  // XS22: at 320 px no row's label wraps (one line each).
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(500);
  const narrow = await listOrder();
  // explore-subtypes audit 2: rows have a 48 px floor that a two-line label fits under, so count the label's own lines.
  const wrapped = await pg.evaluate(() => [...document.querySelectorAll('[data-testid^=kind-]')]
    .filter((e) => !e.getAttribute('data-testid').startsWith('kind-heading-') && e.getBoundingClientRect().height > 0)
    .map((e) => {
      const leaf = [...e.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || ''));
      if (!leaf || !leaf.firstChild) return null;
      const range = document.createRange();
      range.selectNodeContents(leaf);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      return tops.size > 1 ? `${e.getAttribute('data-testid')} (${leaf.textContent})` : null;
    })
    .filter(Boolean));
  check(rows.length > 40 && wrapped.length === 0, `XS22, explore-subtypes audit 2: at 320 px every row's label is one line (${JSON.stringify(wrapped)})`);
  // More attractions (decision 0197): the new rows, Nature reserves, Piers and boardwalks and the zoos' longer label, among them.
  const newRows = ['kind-nature_reserves', 'kind-piers', 'kind-attractions'];
  check(newRows.every((id) => rows.includes(id)) && !wrapped.some((w) => newRows.some((id) => w.startsWith(id))), `MA9: the new rows fit one line at 320 px (${JSON.stringify(wrapped)})`);
  await shot(pg, 'subtypes-what-im-into-320');
  await c.close();
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

module.exports = {
  name: 'subtypes',
  covers: [
    'src/lib/discovery/subtypes.ts',
    'src/lib/explore/explore.ts',
    'src/components/ExploreSettings.tsx',
  ],
  run,
};
