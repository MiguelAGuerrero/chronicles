// Explore subtypes (specs/explore-subtypes XS1, XS2, XS6, XS22-XS24; decision 0191): the places archive brings a waterfall
// beside the walk; an exploring walk names it. "What I'm into" shows five category headings, each over its kinds, with the
// subtypes indented under them; Ghost towns sits under Curiosities, off; the page opened from the ready bar's settings
// lists the same rows as the one opened from the walk's drawer (since decision 0192, its own page: specs/what-im-into-page).
// E2E_ONLY=subtypes runs it alone.

const HEADINGS = ['Art', 'History', 'Parks & green spaces', 'Culture', 'Viewpoints & oddities'];

async function run(h) {
  const { navUrl, BASE, at, check, drawerTo, openInto, closeInto, intoScrollTo, intoSettled, freshPage, places, shot } = h;
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

  // XS24 (WI3): the page from the ready bar's settings (Explore mode shows "What I'm into") lists the same rows as the one
  // from the walk's drawer (compared below).
  await openInto(pg, 'ready');
  const ready = (await listOrder()).map((r) => r.id);
  await closeInto(pg);
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

  await openInto(pg, 'walk');
  const drawer = await listOrder();
  // The five categories; Complexes' heading follows them on the page (WI15).
  const heads = drawer.filter((r) => r.id.startsWith('kind-heading-') && r.id !== 'kind-heading-complexes');
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
    const box = document.querySelector('[data-testid=kind-heading-art]');
    const head = box && [...box.querySelectorAll('*'), box].find((e) => e.childElementCount === 0 && /Art/.test(e.textContent || ''));
    const row = [...document.querySelectorAll('[data-testid=kind-public_art] *')].find((e) => e.childElementCount === 0 && /Public art/.test(e.textContent || ''));
    return { head: px(head), row: px(row), weight: head ? getComputedStyle(head).fontWeight : '' };
  });
  check(sizes.head >= sizes.row && Number(sizes.weight) >= 600, `explore-subtypes audit 16: the heading is at least the rows' size, bold (${JSON.stringify(sizes)})`);
  await shot(pg, 'subtypes-what-im-into');
  // The middle and the end of the list, for the UI review (decision 0145).
  // WI25: each scrolled to its row under the pinned heading and left to settle; the structures picture once never scrolled
  // (Bridges was already in view at the screen's foot), and the piers picture caught rows mid-scroll with no switch.
  const unsettled = [];
  const settledShot = async (id, name) => {
    const found = await intoScrollTo(pg, id);
    const left = await intoSettled(pg);
    unsettled.push(...(found ? left : [`${id} not found`]));
    await shot(pg, name);
  };
  const structuresAt = async () => pg.evaluate(() => {
    const r = document.querySelector('[data-testid=into-page] [data-testid=kind-structures]');
    return r ? Math.round(r.getBoundingClientRect().top) : null;
  });
  const structuresWas = await structuresAt();
  await settledShot('kind-structures', 'subtypes-what-im-into-structures');
  const structuresNow = await structuresAt();
  check(structuresWas != null && structuresNow != null && structuresNow < structuresWas && structuresNow < 200, `WI25: the structures picture is scrolled to Buildings and structures (${structuresWas} → ${structuresNow})`);
  await settledShot('kind-curiosities', 'subtypes-what-im-into-curiosities');
  // More attractions' rows in their sections, for the UI review (decision 0198).
  await settledShot('kind-parks', 'subtypes-what-im-into-parks');
  await settledShot('kind-attractions', 'subtypes-what-im-into-zoos');
  // more-attractions audit 8: the cold find's gap, the Culture section with Museums and galleries, and the amusement row.
  const culture = await pg.locator('[data-testid=kind-museums]').count();
  check(culture === 1, `more-attractions audit 8: Museums and galleries is a row under Culture (${culture})`);
  await settledShot('kind-museums', 'subtypes-what-im-into-culture');
  const fun = await pg.locator('[data-testid=kind-amusement_parks]').count();
  check(fun === 1, `more-attractions audit 8: Amusement parks is a row under Zoos and aquariums (${fun})`);
  await settledShot('kind-amusement_parks', 'subtypes-what-im-into-amusement');
  await settledShot('kind-piers', 'subtypes-what-im-into-piers');
  check(unsettled.length === 0, `WI25: every row in view shows its switch in each of the page's pictures (${JSON.stringify(unsettled)})`);
  const rows = drawer.filter((r) => !r.id.startsWith('kind-heading-')).map((r) => r.id);
  check(ready.length > 0 && JSON.stringify(ready) === JSON.stringify(drawer.map((r) => r.id)), `XS24, WI3: the page lists the same rows from the ready bar and the walk's drawer (${ready.length} vs ${drawer.length})`);

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
  // More attractions (decision 0198): the new rows among them; since its audit (1, 18) Amusement parks and
  // Natural monuments too.
  const newRows = ['kind-nature_reserves', 'kind-piers', 'kind-attractions', 'kind-amusement_parks', 'kind-natural_monuments'];
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
    'src/components/IntoPage.tsx',
  ],
  run,
};
