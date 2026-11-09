// Places worth the stop (PW1, PW4, PW9, PW11): the places archive, served by this harness at /places-e2e/ as the
// e2e build's address, brings a curiosity the map's tiles don't have; an exploring walk past it draws it as a mark,
// keeps it on the checklist as a Curiosity, and asks the archive only for byte ranges, with no cookie or referer.
// E2E_ONLY=curiosities runs it alone.

async function run(h) {
  const { navUrl, BASE, at, check, freshPage, places } = h;
  // The archive is built in chronicles-data (decision 0104); here the e2e's own encoders write one of the same shape
  // (z12 tiles, layer `places`, name, class, src and id), as the contract's example pack has.
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');
  // A folly just beside the first leg of the walk below (the marks journey's route), in the archive only.
  const [lon, lat] = at(0.1, -0.48);
  const z = 12;
  const x = Math.floor(((lon + 180) / 360) * 2 ** z);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
  const folly = { type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { name: 'Fox Point Folly', class: 'folly', src: 'wd', id: 'p_0000000000900001' } };
  const archive = encodeArchive([{ z, x, y, data: encodeTile([folly], z, x, y, () => ['places']) }], [-125, 24, -66.9, 49.4]);
  const file = 'places-us-20261108.pmtiles';
  places.files[file] = archive;
  places.manifest = JSON.stringify({
    schema: 1,
    regions: [{ id: 'us', current: { file, version: '20261108', bytes: archive.length, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] } }],
  });
  places.asked.length = 0;

  const { c, pg } = await freshPage('curiosities');
  const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key, value });
      tx.oncomplete = () => resolve(true);
    };
  }), [k, v]);
  const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await setMeta('start_mode', 'explore');
  await pg.reload();
  await pg.waitForSelector('[data-testid=start]');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  const seen = [];
  for (let k = 0; k <= 23; k++) {
    const p = at(-0.5 + k * 0.05, -0.5);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
    seen.push(...(await marksNow()));
  }
  check(seen.some((l) => /Fox Point Folly/.test(l)), `PW9: an exploring walk draws the archive's curiosity it passes, which the map's tiles don't have (${JSON.stringify([...new Set(seen)])})`);
  check(seen.every((l) => !/\d/.test(String(l))), 'PW11: no number on a mark');

  const kept = await pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction(['checklist_item', 'checklist_area'], 'readonly');
      const items = tx.objectStore('checklist_item').getAll();
      const areas = tx.objectStore('checklist_area').getAll();
      tx.oncomplete = () => resolve({ folly: items.result.find((i) => i.name === 'Fox Point Folly') ?? null, archives: areas.result.map((a) => a.archive ?? null) });
    };
  }));
  check(kept.folly?.kind === 'curiosities' && kept.folly?.category === 'viewpoints', `PW4: the checklist keeps it as a Curiosity of Viewpoints & oddities (${JSON.stringify(kept.folly)})`);
  check(kept.archives.includes('20261108'), `PW12: the area's checklist records the archive version it was built with (${JSON.stringify(kept.archives)})`);

  const tiles = places.asked.filter((a) => a.name === file);
  check(places.asked.some((a) => a.name === 'manifest.json') && tiles.length > 0 && tiles.every((a) => /^bytes=\d+-\d+$/.test(a.range ?? '')),
    `PW1: the manifest, then byte ranges of the one region file (${JSON.stringify(places.asked.map((a) => `${a.name} ${a.range ?? ''}`))})`);
  check(places.asked.every((a) => !a.cookie && !a.referer), 'PW1: no cookie and no referer on any archive request');
  check(places.asked.every((a) => a.name === 'manifest.json' || a.name === file), 'PW1: nothing else is asked of the archive host');
  await c.close();
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

module.exports = {
  name: 'curiosities',
  covers: [
    'src/lib/discovery/archive/**',
    'src/lib/discovery/{archiveManifest,archivePois,archiveMerge}.ts',
    'src/lib/net/tileReader.ts',
    'src/lib/landing/read.ts',
  ],
  run,
};
