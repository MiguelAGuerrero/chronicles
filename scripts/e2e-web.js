// End-to-end check of the web build: walk, note, hold-to-stop, replay, name, log.
//
//   npm run export:web && node scripts/e2e-web.js
//   CHRONICLES_BASE_URL=/chronicles npm run export:web && E2E_BASE=/chronicles node scripts/e2e-web.js
//
// Test harness only: the browser's GPS is mocked with Playwright, and the tile
// host is replaced by a small fake street grid (a GeoJSON source tiled at z14,
// like OpenMapTiles), so it runs without network access to OpenFreeMap. The
// app itself has no simulation. Exits non-zero on failure.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIST = path.join(__dirname, '..', 'dist');
// The sub-path the build was exported for (GitHub Pages serves it at /chronicles).
const BASE = process.env.E2E_BASE ?? '';
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf' };

function serve() {
  // Unknown paths get index.html, as GitHub Pages serves 404.html; .mjs must be
  // served as JavaScript for the map worker. Paths outside BASE are a 404.
  const server = http.createServer((q, r) => {
    const pathname = decodeURIComponent(q.url.split('?')[0]);
    if (!pathname.startsWith(`${BASE}/`)) {
      r.writeHead(404);
      r.end();
      return;
    }
    let p = path.join(DIST, pathname.slice(BASE.length));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
    r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(r);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

// A grid of streets 100 m apart near Fox Point, Providence. Arnold Street lies on a z14 tile edge.
const O = [-71.4, 41.82];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x, y) => [O[0] + x * dLon, O[1] + y * dLat];
const features = [];
const names = ['Wickenden Street', 'Transit Street', 'Arnold Street', 'Williams Street'];
const xs = [-1.5, -0.5, 0.5, 1.5, 2.5, 3.5];
const ys = [-1.5, -0.5, 0.5, 1.5];
ys.forEach((y, i) => features.push({ type: 'Feature', properties: { class: 'minor', name: names[i] }, geometry: { type: 'LineString', coordinates: [at(-2, y), at(4, y)] } }));
xs.forEach((x) => features.push({ type: 'Feature', properties: { class: 'minor' }, geometry: { type: 'LineString', coordinates: [at(x, -2), at(x, 2)] } }));
features.push({ type: 'Feature', properties: { class: 'neighbourhood', name: 'Fox Point' }, geometry: { type: 'Point', coordinates: at(1, 0) } });
const style = {
  version: 8,
  // maxzoom 14 matters: at the default 18, lines are clipped to z18 tiles, which real data never is.
  sources: { openmaptiles: { type: 'geojson', maxzoom: 14, data: { type: 'FeatureCollection', features } } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#eeeae4' } },
    { id: 'roads', type: 'line', source: 'openmaptiles', paint: { 'line-color': '#ffffff', 'line-width': 6 } },
  ],
};

function check(ok, what) {
  if (!ok) throw new Error(`FAILED: ${what}`);
  console.log(`ok - ${what}`);
}

(async () => {
  const server = await serve();
  const url = `http://localhost:${server.address().port}${BASE}/`;
  const browser = await chromium.launch();
  const start = at(-0.5, -0.5);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation'],
    geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('https://tiles.openfreemap.org/**', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        r.request().url().endsWith('/planet')
          ? { tiles: ['https://tiles.openfreemap.org/planet/20261028_001001_pt/{z}/{x}/{y}.pbf'] }
          : style,
      ),
    }),
  );

  try {
    await page.goto(url);
    await page.click('[data-testid=start]');
    await page.waitForSelector('[data-testid=stop]');

    // Walk 300 m at 5 m/s, one fix a second (the fix filter rejects anything over 7 m/s).
    const route = [at(-0.5, -0.5), at(0.5, -0.5), at(0.5, 0.5), at(1.5, 0.5)];
    const pts = [];
    for (let k = 1; k < route.length; k++)
      for (let s = 1; s <= 20; s++)
        pts.push([route[k - 1][0] + ((route[k][0] - route[k - 1][0]) * s) / 20, route[k - 1][1] + ((route[k][1] - route[k - 1][1]) * s) / 20]);
    for (let k = 0; k < pts.length; k++) {
      await ctx.setGeolocation({ longitude: pts[k][0], latitude: pts[k][1], accuracy: 6 });
      await page.waitForTimeout(1000);
      if (k === 25) {
        await page.click('[data-testid=cap-note]');
        await page.fill('[data-testid=note-input]', 'The bakery smelled of cardamom.');
        await page.click('[data-testid=note-save]');
      }
      if (k === 40) {
        // A reload mid-walk is how the web resumes: it must land back on the walk.
        await page.reload();
        await page.waitForSelector('[data-testid=stop]');
        check(page.url().endsWith(`${BASE}/walk`), 'a reload mid-walk resumes the walk');
      }
    }
    await page.waitForTimeout(2200);

    await page.click('[data-testid=stop]');
    await page.waitForTimeout(600);
    check(page.url().endsWith('/walk'), 'a tap on Stop does not end the walk');

    const box = await page.locator('[data-testid=stop]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    await page.waitForURL(/replay/, { timeout: 30000 });
    check(true, 'holding Stop opens the replay');

    let reading = false;
    for (let k = 0; k < 200 && !reading; k++) {
      reading = (await page.getByText('Reading the streets').count()) > 0;
      if (!reading) await page.waitForTimeout(50);
    }
    check(reading, 'the first beat reads the streets');

    let moment = false;
    for (let k = 0; k < 120 && !moment; k++) {
      moment = (await page.getByText('cardamom').count()) > 0;
      if (!moment) await page.waitForTimeout(500);
    }
    check(moment, 'the note gets its moment in the replay');

    await page.waitForSelector('[data-testid=to-name]', { timeout: 45000 });
    const card = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    check(/\b3 new streets\b/.test(card), `the card counts 3 new streets (${card.slice(0, 80)})`);

    await page.click('[data-testid=to-name]');
    await page.fill('[data-testid=epilogue-input]', 'Cardamom and the river.');
    await page.click('[data-testid=save]');
    await page.waitForSelector('text=Cardamom and the river.');
    check((await page.locator('[data-testid=start]').count()) === 1, 'the log appears once in the stack');
    check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
