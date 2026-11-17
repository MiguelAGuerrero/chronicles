// Small places (specs/small-places SP1, SP2, SP11; decision 0183): the places archive brings an unnamed time capsule and a
// plaque beside the walk; an exploring walk names the time capsule ("A time capsule") and draws no plaque, since Plaques
// and markers starts off; "What I'm into" lists Plaques and markers indented under Monuments and memorials, off; switched
// on, the plaque is drawn. E2E_ONLY=small-places runs it alone.

async function run(h) {
  const { navUrl, BASE, at, check, freshPage, places, shot } = h;
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');
  // Beside the first leg of the walk below (the curiosities journey's route), in the archive only.
  const capsuleAt = at(0.1, -0.48);
  const plaqueAt = at(0.25, -0.48);
  const z = 12;
  const tileOf = ([lon, lat]) => {
    const r = (lat * Math.PI) / 180;
    return [Math.floor(((lon + 180) / 360) * 2 ** z), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)];
  };
  const [x, y] = tileOf(capsuleAt);
  const feat = (p, name, cls, id) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { name, class: cls, src: 'osm', id } });
  const archive = encodeArchive([{ z, x, y, data: encodeTile([feat(capsuleAt, '', 'time_capsule', 'p_0000000000a00001'), feat(plaqueAt, 'Founders Plaque', 'plaque', 'p_0000000000a00002')], z, x, y, () => ['places']) }], [-125, 24, -66.9, 49.4]);
  const file = 'places-us-20261116.pmtiles';
  places.files[file] = archive;
  places.manifest = JSON.stringify({
    schema: 1,
    regions: [{ id: 'us', current: { file, version: '20261116', bytes: archive.length, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] } }],
  });

  const { c, pg } = await freshPage('small-places');
  const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key, value });
      tx.oncomplete = () => resolve(true);
    };
  }), [k, v]);
  const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const walkLeg = async (from, to) => {
    const seen = [];
    for (let k = from; k <= to; k++) {
      const p = at(-0.5 + k * 0.05, -0.5);
      await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
      await pg.waitForTimeout(1000);
      seen.push(...(await marksNow()));
    }
    return seen;
  };

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await setMeta('start_mode', 'explore');
  await pg.reload();
  await pg.waitForSelector('[data-testid=start]');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  const first = await walkLeg(0, 23);
  check(first.some((l) => /A time capsule/.test(String(l))), `SP1: an exploring walk names the archive's unnamed time capsule "A time capsule" (${JSON.stringify([...new Set(first)])})`);
  check(first.every((l) => !/Founders Plaque/.test(String(l))), `SP7, SP11: no plaque is drawn while Plaques and markers is off by default (${JSON.stringify([...new Set(first)])})`);

  // SP2: the walk's options; the row sits under Monuments and memorials, indented, off.
  await pg.click('[data-testid=walk-summary]');
  await pg.waitForSelector('[data-testid=options-card]', { timeout: 10000 }).catch(() => {});
  await pg.locator('[data-testid=kind-plaques]').scrollIntoViewIfNeeded().catch(() => {});
  const mon = await pg.locator('[data-testid=kind-monuments]').boundingBox().catch(() => null);
  const row = await pg.locator('[data-testid=kind-plaques]').boundingBox().catch(() => null);
  const on = await pg.locator('[data-testid=kind-plaques]').getAttribute('aria-checked').catch(() => null);
  const label = await pg.locator('[data-testid=kind-plaques]').innerText().catch(() => '');
  await shot(pg, 'small-places-what-im-into');
  check(!!mon && !!row && row.y > mon.y && on === 'false' && /Plaques/.test(label) && !/markers/.test(label),
    `SP2, XS10: "What I'm into" lists Plaques under Monuments and memorials, off (${JSON.stringify({ mon: mon?.y, at: row?.y, on, label })})`);
  const monText = await pg.locator('[data-testid=kind-monuments]').evaluate((e) => e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft || '0')).catch(() => null);
  const rowText = await pg.locator('[data-testid=kind-plaques]').evaluate((e) => e.getBoundingClientRect().left + parseFloat(getComputedStyle(e).paddingLeft || '0')).catch(() => null);
  check(monText != null && rowText != null && rowText > monText, `SP2: the row is indented under its parent (${monText} < ${rowText})`);

  // SP11: switched on, the plaque is drawn on the way back.
  await pg.locator('[data-testid=kind-plaques]').click();
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(500);
  const back = await walkLeg(0, 23);
  check(back.some((l) => /Founders Plaque/.test(String(l))), `SP11: with Plaques and markers on, the walk draws the plaque (${JSON.stringify([...new Set(back)])})`);
  await c.close();
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

module.exports = {
  name: 'small-places',
  covers: [
    'src/lib/discovery/smallPlaces.ts',
    'src/lib/discovery/refinements.ts',
    'src/components/ExploreSettings.tsx',
  ],
  run,
};
