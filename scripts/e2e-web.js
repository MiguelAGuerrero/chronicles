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
// A town point 2.9 km east: in reach of the walk, but outside the z14 tiles read for its streets.
features.push({ type: 'Feature', properties: { class: 'city', name: 'Providence' }, geometry: { type: 'Point', coordinates: at(29, 0) } });
// Points of interest for discovery (D1): a café and an unnamed artwork are
// kept, a bus stop is not a place to offer.
features.push({ type: 'Feature', properties: { class: 'cafe', subclass: 'cafe', name: 'Coffee Exchange' }, geometry: { type: 'Point', coordinates: at(0.65, -0.35) } });
features.push({ type: 'Feature', properties: { class: 'art_gallery', subclass: 'artwork' }, geometry: { type: 'Point', coordinates: at(1.1, 0.6) } });
features.push({ type: 'Feature', properties: { class: 'bus', subclass: 'bus_stop', name: 'Wickenden at Hope' }, geometry: { type: 'Point', coordinates: at(0.4, -0.6) } });
// Three more out east: over 500 m from where the walk scans, but within a home scan around Fox Point (S11).
features.push({ type: 'Feature', properties: { class: 'park', subclass: 'park', name: 'Gano Park' }, geometry: { type: 'Point', coordinates: at(5.4, 0.6) } });
features.push({ type: 'Feature', properties: { class: 'bakery', subclass: 'bakery', name: 'Sunny Bakery' }, geometry: { type: 'Point', coordinates: at(5.2, -1.0) } });
features.push({ type: 'Feature', properties: { class: 'museum', subclass: 'museum', name: 'Fox Point Museum' }, geometry: { type: 'Point', coordinates: at(4.6, 1.8) } });
// A busy strip 1.1 km east of Fox Point (v1.5 landing): Thayer Street lined with shops for 250 m,
// inside the read around a press at Fox Point, and far from every walk and scan above.
features.push({ type: 'Feature', properties: { class: 'tertiary', name: 'Thayer Street' }, geometry: { type: 'LineString', coordinates: [at(11, -3), at(11, 3)] } });
features.push({ type: 'Feature', properties: { class: 'minor', name: 'Angell Street' }, geometry: { type: 'LineString', coordinates: [at(9, 0.2), at(13, 0.2)] } });
for (let i = 0; i <= 10; i++) {
  const [cls, sub] = i % 2 ? ['cafe', 'cafe'] : ['shop', 'gift'];
  features.push({ type: 'Feature', properties: { class: cls, subclass: sub, name: `Thayer ${i}` }, geometry: { type: 'Point', coordinates: at(11 + (i % 2 ? 0.15 : -0.15), -1.2 + i * 0.25) } });
}
const style = {
  version: 8,
  // maxzoom 14 matters: at the default 18, lines are clipped to z18 tiles, which real data never is.
  sources: { openmaptiles: { type: 'geojson', maxzoom: 14, data: { type: 'FeatureCollection', features } } },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#eeeae4' } },
    { id: 'roads', type: 'line', source: 'openmaptiles', paint: { 'line-color': '#ffffff', 'line-width': 6 } },
  ],
};

// E2E_SHOTS=<dir> saves screenshots along the way, for looking at the UI.
const SHOTS = process.env.E2E_SHOTS;
async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

function check(ok, what) {
  if (!ok) throw new Error(`FAILED: ${what}`);
  console.log(`ok - ${what}`);
}

(async () => {
  const server = await serve();
  const url = `http://localhost:${server.address().port}${BASE}/`;
  // A fake microphone, so voice memos can be recorded headless.
  // Sound only after a tap, as on iOS: the replay reaches its stops on its own clock.
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=user-gesture-required'],
  });
  const start = at(-0.5, -0.5);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation', 'microphone'],
    geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 },
  });
  // iOS's Audio Session API, which Chromium lacks: the stub records what the
  // app asks for, so the web's "play with the ringer off" can be checked.
  await ctx.addInitScript(() => {
    const seen = [];
    window.__audioSessions = seen;
    let type = 'auto';
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: { get type() { return type; }, set type(v) { type = v; seen.push(v); } },
    });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Nothing leaves the device (D10): every request goes to this server or the tile host.
  const hosts = new Set();
  ctx.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol)) hosts.add(u.host); });
  // The app's own tile reads (landing, ambient) get the same fake world as vector tiles.
  const { encodeTile } = await import('./mvt-encode.mjs');
  // Slow tiles on demand, so Cancel can land while a read is still out.
  let tileDelayMs = 0;
  await ctx.route('https://tiles.openfreemap.org/**', async (r) => {
    const tile = /\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(r.request().url());
    if (tile && tileDelayMs) await new Promise((res) => setTimeout(res, tileDelayMs));
    if (tile) {
      const [z, x, y] = tile.slice(1).map(Number);
      return r.fulfill({ contentType: 'application/x-protobuf', body: Buffer.from(encodeTile(features, z, x, y)) });
    }
    return r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        r.request().url().endsWith('/planet')
          ? { tiles: ['https://tiles.openfreemap.org/planet/20261028_001001_pt/{z}/{x}/{y}.pbf'] }
          : style,
      ),
    });
  });

  try {
    await page.goto(url);
    // Home is the places map; with nothing walked, one line and Start (H1, H2).
    await page.waitForSelector('text=Walk somewhere and it is starred here');
    // Memos and videos play with the ringer switch off, on the web too (bug: silent playback on iPhone).
    check(await page.evaluate(() => navigator.audioSession.type) === 'playback', 'the page asks to play sound even in silent mode');
    check((await page.locator('canvas.maplibregl-canvas').count()) === 1 && (await page.locator('[data-testid=start]').count()) === 1, 'home opens on the map, empty, with Start');
    await shot(page, '00-home-empty');
    await page.click('[data-testid=start]');
    await page.waitForSelector('[data-testid=stop]');
    await page.waitForTimeout(2500);
    await shot(page, '01-walk-start');

    // Scan (v1 slice 2). The first scan asks preferences first (S14), then
    // reads the 500 m around you: a café and an unnamed artwork, not the bus stop (S2, S15).
    await page.click('[data-testid=scan]');
    await page.waitForSelector('[data-testid=prefs-done]');
    check((await page.locator('[data-testid^=pref-][data-testid$=-normal][aria-checked=true]').count()) === 8, 'the first scan asks preferences, all normal');
    check((await page.locator('[data-testid=auto-scan]').count()) === 1, 'the preferences offer a scan when a walk starts (A2)');
    await page.click('[data-testid=pref-food-more]');
    await shot(page, '01a-prefs');
    await page.click('[data-testid=prefs-done]');
    await page.waitForSelector('text=Only 2 spots nearby', { timeout: 30000 });
    const walkMarks = () => page.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]');
    check((await walkMarks().count()) === 2 && (await page.locator('[aria-label="A mark to find. Open"]').count()) >= 2, 'a scan drops a "?" mark for each place nearby (S3, S7)');
    await shot(page, '01b-marks');

    // Leaks (the owner's iPhone tab crashed mid-walk): nothing may pile up while walking.
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    const leakSample = async () => {
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      const mm = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
      return { bodyDivs: await page.evaluate(() => document.body.children.length), listeners: mm.JSEventListeners, nodes: mm.Nodes };
    };
    const leak0 = await leakSample();

    // Walk 300 m at 5 m/s, one fix a second (the fix filter rejects anything over 7 m/s).
    const route = [at(-0.5, -0.5), at(0.5, -0.5), at(0.5, 0.5), at(1.5, 0.5)];
    const pts = [];
    for (let k = 1; k < route.length; k++)
      for (let s = 1; s <= 20; s++)
        pts.push([route[k - 1][0] + ((route[k][0] - route[k - 1][0]) * s) / 20, route[k - 1][1] + ((route[k][1] - route[k - 1][1]) * s) / 20]);
    for (let k = 0; k < pts.length; k++) {
      await ctx.setGeolocation({ longitude: pts[k][0], latitude: pts[k][1], accuracy: 6 });
      await page.waitForTimeout(1000);
      if (k === 10) {
        // A memo can be thrown away instead of saved.
        await page.click('[data-testid=cap-voice]');
        await page.waitForSelector('[data-testid=voice-discard]');
        await page.waitForTimeout(1500);
        await shot(page, '02-voice-recording');
        check(await page.evaluate(() => navigator.audioSession.type) === 'play-and-record', 'recording a memo switches the page to record');
        await page.click('[data-testid=voice-discard]');
        await page.waitForSelector('[data-testid=voice-undo]');
        await page.waitForTimeout(500);
        check(await page.evaluate(() => navigator.audioSession.type) === 'playback', 'after the memo, sound plays even in silent mode again');
        check((await page.locator('[aria-label^="Voice memo"]').count()) === 0, 'a discarded voice memo is not kept');
        await page.click('[data-testid=voice-undo]');
        await page.waitForSelector('text=/Voice memo discarded/', { state: 'detached' });
        await page.waitForTimeout(2500);
        check((await page.locator('[aria-label="Voice memo. Open"]').count()) === 1, 'undo brings a discarded memo back');
        // A tap and an immediate save is an accidental tap: not kept, and said so.
        await page.click('[data-testid=cap-voice]');
        await page.waitForSelector('[data-testid=voice-save]');
        await page.click('[data-testid=voice-save]');
        await page.waitForSelector('text=Too short, not kept');
        check(true, 'a memo under a second is not kept, and the walker is told');
        // A tap on Stop says it needs holding.
        await page.click('[data-testid=stop]');
        await page.waitForSelector('text=Hold to stop the walk');
        check(true, 'a tap on Stop explains it needs a hold');
      }
      if (k === 6) {
        // This walk's options: quiet walk on both platforms; hints are phone-only, so the web has none (A1, A2).
        await page.click('[data-testid=walk-options]');
        await page.waitForSelector('[data-testid=options-card]');
        check((await page.locator('[data-testid=quiet-walk]').count()) === 1 && (await page.locator('[data-testid=ambient]').count()) === 0, 'walk options offer a quiet walk, and no ambient hints on the web');
        await shot(page, '01c-options');
        await page.click('[data-testid=options-close]');
      }
      if (k === 13) {
        // Within 60 m, the café's mark shows what it is (S7).
        check((await page.locator('[aria-label="Coffee Exchange, Food & drink. Open"]').count()) === 1, 'a mark shows its name and category within 60 m');
      }
      if (k === 15) {
        // The camera takes video too. The web caps clips at 15 s; a longer one is turned away.
        const fixtures = path.join(__dirname, 'fixtures');
        let [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid=cap-photo]')]);
        await chooser.setFiles(path.join(fixtures, 'clip-20s.webm'));
        await page.waitForSelector('text=/Videos can be up to 15 seconds/');
        check(true, 'a video over the web limit is turned away');
        [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid=cap-photo]')]);
        await chooser.setFiles(path.join(fixtures, 'clip-4s.webm'));
        await page.waitForSelector('text=Video saved here');
        await page.waitForTimeout(2500);
        // Within ~30 m at walking zoom, the video shares a pin with the memo.
        check((await page.locator('[aria-label="2 captures here. Open"]').count()) === 1, 'a short video is kept, sharing a pin with the memo nearby');
        // The video is taken about 40 m from the café: it finds the mark (S8). (The memo at step 10, 62 m off, does not.)
        check((await walkMarks().count()) === 1 && (await page.locator('[aria-label="Coffee Exchange, Food & drink. Open"]').count()) === 0, 'a capture within 60 m finds the mark');
      }
      if (k === 25) {
        await page.click('[data-testid=cap-note]');
        await page.fill('[data-testid=note-input]', 'The bakery smelled of cardamom.');
        await page.click('[data-testid=note-save]');
        await page.waitForTimeout(2500);
        check((await page.locator('[aria-label="Note. Open"], [aria-label$="captures here. Open"]').count()) >= 1, 'the note is pinned on the map');
        await shot(page, '03-walking');
        // What happened here: a long press near where the note was taken (the
        // map follows the walker, so near the map's center) shows it. A plain
        // tap there does nothing.
        // The home map stays mounted under the walk screen; the walk's map is the last.
        const box = await page.locator('canvas.maplibregl-canvas').last().boundingBox();
        // Beside the pin (whose tap area covers the spot itself): ~27 m away at this zoom.
        const spot = { x: box.x + box.width / 2 + 30, y: box.y + box.height / 2 + 10 };
        await page.mouse.click(spot.x, spot.y);
        await page.waitForTimeout(800);
        check((await page.getByText('What happened here').count()) === 0 && (await page.getByText('Nothing captured here yet').count()) === 0, 'a plain tap on the walk map does nothing');
        await page.mouse.move(spot.x, spot.y);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
        // The press sheet offers Go here, and what happened here when captures are near.
        await page.click('[data-testid=here-open]');
        await page.waitForSelector('text=What happened here');
        check((await page.getByText('The bakery smelled of cardamom.').count()) > 0, 'a long press on the map shows what happened there');
        // Remind me here, from the viewer: once by default, with an optional end (R1).
        await page.click('[data-testid=viewer-remind]');
        await page.waitForSelector('[data-testid=remind-editor]');
        check((await page.locator('[data-testid=remind-once][aria-checked=true]').count()) === 1 && (await page.locator('[data-testid=remind-none][aria-checked=true]').count()) === 1, 'remind me here offers how often, once by default, and until when');
        await shot(page, '03a-remind');
        await page.click('[data-testid=remind-save]');
        await page.waitForSelector('text=It will come back when you pass here');
        check((await page.locator('[aria-label="Reminder set. Change or stop it"]').count()) === 1, 'the viewer shows the reminder is set');
        await page.click('[aria-label="Close"]');
      }
      if (k === 28) {
        // Go here on a mark routes to it, labelled "Mark" until it is revealed (S12).
        await walkMarks().first().click();
        await page.waitForSelector('[data-testid=mark-card]');
        check(/A mark to find/.test(await page.locator('[data-testid=mark-card]').innerText()), 'an unrevealed mark’s card does not say what it is');
        await page.click('[data-testid=mark-go]');
        await page.waitForSelector('[data-testid=nav-bar]', { timeout: 30000 });
        check(/· Mark$/.test(await page.locator('[data-testid=nav-left]').innerText()), 'going to a mark says "Mark" until it is revealed');
      }
      if (k === 30) {
        // A photo, then the opt-in caption.
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid=cap-photo]')]);
        await chooser.setFiles(path.join(__dirname, 'fixtures', 'photo.jpg'));
        await page.click('[data-testid=add-caption]');
        await page.fill('[data-testid=caption-input]', 'Mural on Wickenden');
        await page.waitForTimeout(400);
        await shot(page, '03b-caption');
        await page.click('[data-testid=caption-save]');
        await page.waitForTimeout(800);
        check(true, 'a photo can take a caption');
      }
      if (k === 33) {
        // Pause: positions sent while paused are not recorded, and the clock stops.
        await page.click('[data-testid=pause-walk]');
        await page.waitForSelector('text=Paused');
        // One publish cycle, so a fix taken just before the pause is already counted.
        await page.waitForTimeout(2500);
        const before = await page.locator('text=/ · \\d+ m$/').first().innerText();
        // Walking on at a believable pace (4 m a second), which the speed gate would keep.
        for (let j = 1; j <= 3; j++) {
          await ctx.setGeolocation({ longitude: pts[k][0], latitude: pts[k][1] + j * 0.000036, accuracy: 6 });
          await page.waitForTimeout(1000);
        }
        await page.waitForTimeout(2200);
        const during = await page.locator('text=/ · \\d+ m$/').first().innerText();
        check(before.split(' · ')[1] === during.split(' · ')[1], `nothing is recorded while paused (${before} → ${during})`);
        await page.click('[data-testid=resume-walk]');
        await page.waitForSelector('[data-testid=pause-walk]');
        await ctx.setGeolocation({ longitude: pts[k][0], latitude: pts[k][1], accuracy: 6 });
      }
      if (k === 36) {
        // Looking around: a drag stops the map following; Recenter brings it back.
        const box = await page.locator('canvas.maplibregl-canvas').last().boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 3 + 60, { steps: 8 });
        await page.mouse.up();
        await page.waitForSelector('[data-testid=recenter]');
        await page.click('[data-testid=recenter]');
        await page.waitForSelector('[data-testid=recenter]', { state: 'detached' });
        check(true, 'after looking around, Recenter brings the map back');
        // Unwalked streets near me.
        await page.click('[data-testid=unwalked]');
        await page.waitForSelector('text=/unwalked nearby/');
        await shot(page, '03c-unwalked');
        check(true, 'unwalked streets near me shows a count');
        await page.click('[data-testid=unwalked]');
      }
      if (k === 39) {
        // 40 s of walking with captures, a scan and a route: the page stays the same size (leak regression).
        const leak1 = await leakSample();
        check(leak1.bodyDivs - leak0.bodyDivs <= 3 && leak1.listeners - leak0.listeners < 2000,
          `walking leaks no portals or listeners (body ${leak0.bodyDivs} → ${leak1.bodyDivs}, listeners ${leak0.listeners} → ${leak1.listeners}, nodes ${leak0.nodes} → ${leak1.nodes})`);
      }
      if (k === 40) {
        // A reload mid-walk is how the web resumes: it must land back on the walk.
        await page.reload();
        await page.waitForSelector('[data-testid=stop]');
        check(page.url().endsWith(`${BASE}/walk`), 'a reload mid-walk resumes the walk');
      }
      if (k === 44) {
        const bar = await page.waitForSelector('[data-testid=nav-left]', { timeout: 30000 }).then((e) => e.innerText(), () => '');
        check(/Public art/.test(bar), `revealed, the mark is named in the bar (${bar})`);
      }
      if (k === 54) {
        // Dismiss passes on a mark (S9).
        await page.click('[aria-label="Public art, Art. Open"]');
        await page.click('[data-testid=mark-dismiss]');
        await page.waitForTimeout(500);
        check((await walkMarks().count()) === 0, 'dismiss passes on a mark');
      }
    }
    await page.waitForTimeout(2200);

    // Navigate (slice 4). Walk me back routes to the start along the trace and counts down (N1, N7).
    const meters = (t) => {
      const m = /([\d.]+)\s*(km|m)\b/.exec(t);
      return m ? parseFloat(m[1]) * (m[2] === 'km' ? 1000 : 1) : NaN;
    };
    const navLeft = async () => meters(await page.locator('[data-testid=nav-left]').innerText());
    await page.click('[data-testid=walk-back]');
    await page.waitForSelector('[data-testid=nav-bar]');
    const left0 = await navLeft();
    check(left0 > 250 && left0 < 350 && /Start/.test(await page.locator('[data-testid=nav-bar]').innerText()), `walk me back routes to the start (${left0} m)`);
    await shot(page, '03d-walk-back');
    const back = [...pts].reverse();
    for (let k = 0; k < 24; k++) {
      await ctx.setGeolocation({ longitude: back[k][0], latitude: back[k][1], accuracy: 6 });
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2200);
    const left1 = await navLeft();
    check(left1 < left0 - 80, `the distance left counts down (${left0} → ${left1} m)`);
    // Arrival shows for 4 s, about 30 m out: watch for it on the way.
    let sawArrival = false;
    for (let k = 24; k < back.length; k++) {
      await ctx.setGeolocation({ longitude: back[k][0], latitude: back[k][1], accuracy: 6 });
      await page.waitForTimeout(1000);
      sawArrival ||= (await page.locator('text=/You.re here: Start/').count()) > 0;
    }
    await ctx.setGeolocation({ longitude: route[0][0], latitude: route[0][1], accuracy: 6 });
    for (let k = 0; k < 6 && !sawArrival; k++) {
      await page.waitForTimeout(1000);
      sawArrival = (await page.locator('text=/You.re here: Start/').count()) > 0;
    }
    check(sawArrival && (await page.locator('[data-testid=nav-bar]').count()) === 0, 'arriving at the start says so, and navigation ends (N9)');
    // A long press on the map, then Go here, routes over the streets (N3, N11); End clears it (N10).
    {
      const box = await page.locator('canvas.maplibregl-canvas').last().boundingBox();
      const spot = { x: box.x + box.width / 2 + 90, y: box.y + box.height / 2 - 120 };
      await page.mouse.move(spot.x, spot.y);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.waitForSelector('[data-testid=go-here]');
      // The card sits above the capture row: the camera is still the camera (audit).
      const cam = await page.locator('[data-testid=cap-photo]').boundingBox();
      const atCam = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'), { x: cam.x + cam.width / 2, y: cam.y + cam.height / 2 });
      check(atCam === 'cap-photo', `the spot card leaves the capture row free (${atCam})`);
      // A tap on the map closes it (a click within 1 s of a long press is its end, not a tap).
      await page.waitForTimeout(1100);
      await page.mouse.click(box.x + 40, box.y + 200);
      await page.waitForTimeout(700);
      check((await page.locator('[data-testid=go-here]').count()) === 0, 'a tap on the map closes the spot card');
      await page.mouse.move(spot.x, spot.y);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.click('[data-testid=go-here]');
      await page.waitForSelector('[data-testid=nav-bar]', { timeout: 30000 });
      const left = await navLeft();
      check(left > 50 && left < 1500, `a long press, then Go here, routes over the streets (${left} m)`);
      await shot(page, '03e-go-here');
      await page.click('[data-testid=nav-end]');
      await page.waitForSelector('[data-testid=nav-bar]', { state: 'detached', timeout: 5000 });
      check(true, 'End clears the route');
    }

    // The walk back passed the flagged capture again: never in the walk that recorded it (R2).
    check((await page.locator('[data-testid=reminder]').count()) === 0, 'a flagged capture does not come back in its own walk');
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

    // The memo and the video share the first stop. Step past the memo with
    // Continue; the video then plays, and waits for Continue too.
    for (let k = 0; k < 4 && !(await page.locator('video').count()); k++) {
      await page.waitForSelector('[data-testid=moment]', { timeout: 60000 });
      await page.waitForTimeout(900);
      if (!(await page.locator('video').count())) await page.click('[data-testid=moment]');
      await page.waitForTimeout(400);
    }
    await page.waitForSelector('video', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await shot(page, '04a-replay-video');
    const playing = await page.evaluate(() => {
      const v = document.querySelector('video');
      return !!v && v.currentTime > 0 && !v.paused;
    });
    check(playing, 'the video plays at its stop in the replay');
    if (await page.locator('[data-testid=video-sound]').count()) {
      // Sound was refused without a tap: it plays muted, and one tap brings the sound.
      await page.click('[data-testid=video-sound]');
      await page.waitForTimeout(500);
      const sound = await page.evaluate(() => {
        const v = document.querySelector('video');
        return !!v && !v.muted && !v.paused;
      });
      check(sound, 'a video that could not start with sound plays muted, and a tap turns the sound on');
    }
    // The player fills the screen's width, above the strip with Continue.
    const vbox = await page.locator('video').boundingBox();
    const cbox = await page.locator('[data-testid=moment]').boundingBox();
    check(vbox && cbox && vbox.width >= 389 && vbox.y + vbox.height <= cbox.y, `the video fills the width above the strip (${vbox && Math.round(vbox.width)} wide)`);
    await page.click('[data-testid=moment]');

    let moment = false;
    for (let k = 0; k < 120 && !moment; k++) {
      moment = (await page.getByText('cardamom').count()) > 0;
      if (!moment) await page.waitForTimeout(500);
    }
    check(moment, 'the note gets its moment in the replay');
    await page.waitForTimeout(3000);
    await shot(page, '04-replay-moment');
    check((await page.getByText('cardamom').count()) > 0, 'the replay waits at the note until a tap');
    await page.click('[data-testid=moment]');

    // Continue through any stops left (the captioned photo), checking its caption shows.
    let captionShown = false;
    for (let k = 0; k < 90 && !(await page.locator('[data-testid=to-name]').count()); k++) {
      if (await page.locator('[data-testid=moment]').count()) {
        // Give the photo time to load and its caption bar to be placed.
        await page.waitForTimeout(1200);
        if (await page.locator('[aria-label="Caption: Mural on Wickenden"]').count()) {
          if (!captionShown) await shot(page, '04b-replay-caption');
          captionShown = true;
        }
        await page.click('[data-testid=moment]').catch(() => {});
      }
      await page.waitForTimeout(500);
    }
    check(captionShown, 'the photo shows its caption in the replay');
    await page.waitForSelector('[data-testid=to-name]', { timeout: 45000 });
    const card = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    // A block each of Transit and Arnold; the unnamed block between them clears fog but is not a street.
    check(/\b2 new streets\b/.test(card), `the card counts the 2 named streets walked (${card.slice(0, 80)})`);
    // The walk is placed, down to its neighborhood, with the town found by the wide read
    // and the state from the bundled outlines.
    const placed = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['area', 'walk_area'], 'readonly');
        const a = tx.objectStore('area').getAll();
        const w = tx.objectStore('walk_area').getAll();
        tx.oncomplete = () => resolve({ areas: a.result, rows: w.result });
      };
    }));
    const levels = Object.fromEntries(placed.areas.map((x) => [x.level, x.name]));
    check(
      levels.neighborhood === 'Fox Point' && levels.town === 'Providence' && levels.state === 'Rhode Island' && levels.country === 'United States of America'
        && placed.rows.length === 4 && placed.rows.every((r) => r.metres > 0),
      `the walk is placed in Fox Point, Providence, Rhode Island (${JSON.stringify(levels)})`,
    );
    // Places of interest are read with the streets and cached, tagged with the build (D1).
    const pois = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const r = req.result.transaction('place', 'readonly').objectStore('place').getAll();
        r.onsuccess = () => resolve(r.result);
      };
    }));
    const poiNames = pois.map((p) => `${p.category}:${p.name}`).sort();
    check(
      poiNames.includes('art:Public art') && poiNames.includes('food:Coffee Exchange') && !poiNames.some((n) => /Wickenden at Hope/.test(n))
        && pois.every((p) => p.build === '20261028_001001_pt'),
      `the walk's reads cache its places of interest, and no bus stop (${poiNames.join(', ')})`,
    );
    // The card counts finds by category, and keeps the mark passed on as a low (S9, S13).
    check(/Found 1 food & drink/.test(card) || (await page.locator('[data-testid=card-finds]').innerText()) === 'Found 1 food & drink', 'the card counts finds by category');
    const low = await page.locator('[data-testid=card-low]').allInnerTexts();
    check(low.length === 1 && /^Passed on: a mark near Arnold Street$/.test(low[0]), `the card keeps the dismissed mark as a low (${low.join(' | ')})`);
    await page.waitForTimeout(800);
    await shot(page, '05-card');
    // The card's zoom groups nearby captures; open the pin holding the note
    // (the last one taken) and step to it.
    const pinsOnCard = page.locator('[aria-label$=". Open"]');
    await pinsOnCard.nth((await pinsOnCard.count()) - 1).click();
    for (let k = 0; k < 6 && !(await page.getByText('The bakery smelled of cardamom.').count()); k++) {
      await page.click('[aria-label="Next capture"]');
      await page.waitForTimeout(300);
    }
    await page.waitForSelector('text=The bakery smelled of cardamom.');
    await page.waitForTimeout(1200);
    await shot(page, '06-pin-opened');
    check(true, 'a pin on the card opens its capture');
    await page.click('[aria-label="Close"]');

    await page.click('[data-testid=to-name]');
    await page.fill('[data-testid=epilogue-input]', 'Cardamom and the river.');
    await page.click('[data-testid=save]');
    // Back home: the walk is a star where it was walked (H1, H7).
    await page.waitForSelector('[data-testid=home-sheet]');
    check((await page.locator('[data-testid=start]').count()) === 1, 'home appears once in the stack');
    await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 15000 });
    await shot(page, '08-home-star');
    check(true, 'the walk is a star on the home map');
    // A star lists its place's walks in the sheet, with the place's parents (H6).
    await page.click('[aria-label^="Fox Point,"]');
    await page.waitForSelector('[data-testid=place-title]');
    const sheet = (await page.locator('[data-testid=home-sheet]').innerText()).replace(/\s+/g, ' ');
    check(/Fox Point/.test(sheet) && /Providence, Rhode Island/.test(sheet) && /Cardamom and the river\./.test(sheet), `a star lists its place's walks (${sheet.slice(0, 120)})`);
    await shot(page, '09-home-place');
    // Back to the map. A mouse drag on the sheet's header settles at a step, never halfway (audit).
    await page.click('[data-testid=sheet-map]');
    await page.waitForTimeout(400);
    const head = await page.locator('[data-testid=sheet-drag]').boundingBox();
    await page.mouse.move(head.x + head.width / 2, head.y + head.height / 2);
    await page.mouse.down();
    await page.mouse.move(head.x + head.width / 2, head.y - 260, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const vh = page.viewportSize().height;
    const sheetH = (await page.locator('[data-testid=home-sheet]').boundingBox()).height;
    check([Math.round(vh * 0.5), vh - 56].some((h) => Math.abs(sheetH - h) < 30), `a dragged sheet settles at a step (${Math.round(sheetH)} px)`);
    await page.click('[data-testid=sheet-map]');
    await page.waitForTimeout(400);
    // The map view survives a replay (H5): pan, note the star, replay, come back.
    const home = await page.locator('canvas.maplibregl-canvas').first().boundingBox();
    await page.mouse.move(home.x + home.width / 2, home.y + 200);
    await page.mouse.down();
    await page.mouse.move(home.x + home.width / 2 + 70, home.y + 250, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const starBefore = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    // The Walks list: every stopped walk; one opens its replay as a re-watch (H4, H5).
    await page.click('[data-testid=sheet-walks]');
    await page.waitForSelector('[data-testid=walk-row]');
    check((await page.locator('[data-testid=walk-row]').count()) === 1, 'the walks list has the one stopped walk');
    await shot(page, '10-home-walks');
    await page.locator('[data-testid=walk-row]').first().click();
    await page.waitForSelector('[data-testid=done]', { timeout: 90000 });
    check(true, 're-watching from the walks list reaches the card with no taps');

    // A replay opened with no tap at all (a fresh page, as after a reload)
    // may not start a video with sound: it plays muted and offers the sound.
    const fresh = await ctx.newPage();
    fresh.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    // iOS's rule, which headless Chromium does not enforce: sound needs a tap first.
    await fresh.addInitScript(() => {
      let tapped = false;
      document.addEventListener('pointerdown', () => (tapped = true), true);
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (!this.muted && !tapped) return Promise.reject(new DOMException('play() needs a tap', 'NotAllowedError'));
        return play.call(this);
      };
    });
    await fresh.goto(page.url());
    // The memo comes first and is refused too: it waits a moment, as a photo does, and moves on.
    await fresh.waitForSelector('[aria-label="Play voice memo"]', { timeout: 90000 });
    const memoAt = Date.now();
    await fresh.waitForSelector('video', { timeout: 15000 });
    const memoMs = Date.now() - memoAt;
    check(memoMs > 3000 && memoMs < 9000, `a refused memo moves on after a few seconds (${(memoMs / 1000).toFixed(1)} s)`);
    // Muted playback with the button, within a second or two (the clip is short and moves on by itself).
    const muted = await fresh
      .waitForFunction(() => {
        const v = document.querySelector('video');
        return !!v && v.muted && !v.paused && !!document.querySelector('[data-testid=video-sound]');
      }, null, { timeout: 3000 })
      .then(() => true, () => false);
    await shot(fresh, '07-video-sound');
    check(muted, 'with no tap yet, the video plays muted with a sound button');
    await fresh.click('[data-testid=video-sound]');
    await fresh.waitForTimeout(500);
    const sound = await fresh.evaluate(() => {
      const v = document.querySelector('video');
      return !!v && !v.muted && !v.paused;
    });
    check(sound, 'a tap on it turns the sound on');
    await fresh.close();
    await page.click('[data-testid=done]');
    await page.waitForSelector('[data-testid=home-sheet]');
    // The sheet kept its walks list (H5), so it is counted rather than Start.
    check((await page.locator('[data-testid=home-sheet]').count()) === 1 && (await page.locator('[data-testid=walk-row]').count()) === 1, 'done returns to the one home, its walks list as it was');
    await page.waitForTimeout(800);
    const starAfter = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    check(Math.abs(starAfter.x - starBefore.x) < 3 && Math.abs(starAfter.y - starBefore.y) < 3, `the map kept its view across the replay (${Math.round(starBefore.x)},${Math.round(starBefore.y)} → ${Math.round(starAfter.x)},${Math.round(starAfter.y)})`);

    // Bulk placement (H8): a walk with no places is placed at the next opening,
    // behind a cover that can be skipped.
    await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const d = req.result;
        const tx = d.transaction(['walk_area', 'area', 'walk'], 'readwrite');
        tx.objectStore('walk_area').clear();
        tx.objectStore('area').clear();
        const walks = tx.objectStore('walk');
        const all = walks.getAll();
        all.onsuccess = () => { for (const w of all.result) walks.put({ ...w, snapped_build: null }); };
        tx.oncomplete = () => { d.close(); resolve(); };
      };
    }));
    await page.reload();
    await page.waitForSelector('text=/Placing your walks/', { timeout: 20000 });
    check((await page.locator('[data-testid=skip-placing]').count()) === 1, 'placing old walks shows a cover that can be skipped');
    await shot(page, '11-home-placing');
    await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 60000 });
    await page.waitForTimeout(500);
    check((await page.locator('text=/Placing your walks/').count()) === 0, 'the walk is placed again and the cover goes');

    // Scan here, from the home (S1, S11): a long press just below Fox Point's star.
    {
      const st = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      const p = { x: st.x + st.width / 2, y: st.y + st.height / 2 + 50 };
      await page.mouse.move(p.x, p.y);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await shot(page, '11a-home-press');
      await page.click('[data-testid=scan-here]');
      await page.waitForSelector('text=Only 3 spots nearby', { timeout: 30000 });
      check((await page.locator('[data-testid=mark-pin]').count()) === 3, 'Scan here on the home leaves three marks for the next walk');
      await shot(page, '11b-home-scan');
      // Preferences are editable from the home (S14).
      await page.click('[data-testid=prefs-open]');
      await page.waitForSelector('[data-testid=prefs-done]');
      check((await page.locator('[data-testid=pref-food-more][aria-checked=true]').count()) === 1, 'the home opens the preferences as they were left');
      await page.click('text=Cancel');
    }

    // What's good here (v1.5): a long press, then a read of the area around the city
    // nearby, finds Thayer Street's strip and puts Start here on it (L1, L2, L5, L7, L9).
    {
      const st = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      const press = async (box) => {
        await page.waitForTimeout(1100);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 50);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
      };
      // Cancel goes at once and keeps nothing (audit).
      tileDelayMs = 4000;
      await press(st);
      await page.click('[data-testid=look-here]');
      await page.click('[data-testid=look-cancel]');
      const gone = (await page.locator('[data-testid=look-cancel]').count()) === 0;
      await page.waitForTimeout(6000);
      tileDelayMs = 0;
      check(gone && (await page.locator('[data-testid=start-here]').count()) === 0, 'cancelling a look stops it at once, with nothing kept');
      await press(st);
      await page.click('[data-testid=look-here]');
      await page.waitForSelector('text=/Busiest area: Thayer Street. A best guess from the map./', { timeout: 30000 });
      await page.waitForTimeout(1500);
      await shot(page, '11c-landing');
      check((await page.getByText('Thayer Street', { exact: true }).count()) >= 1 && (await page.locator('[data-testid=start-here]').count()) === 1,
        'what\u2019s good here finds the strip, named, with one Start here');
      const rows = () => page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('landing', 'readonly').objectStore('landing').getAll();
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const first = await rows();
      check(first.length === 1 && first[0].analysis.landing.street === 'Thayer Street', 'the area is remembered, its landing on Thayer Street');
      await page.click('[data-testid=start-here]');
      await page.waitForSelector('[data-testid=start-card]');
      check(/Start here · Thayer Street/.test(await page.locator('[data-testid=start-card]').innerText()) && (await page.locator('[data-testid=start-walk]').count()) === 1,
        'Start here offers Walk here and Scan here');
      await page.click('[data-testid=start-card] [aria-label=Close]');
      // Remembered: after a reload, it is still on the map, offline (L11).
      await page.reload();
      await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 30000 });
      await page.waitForTimeout(1500);
      check((await page.locator('[data-testid=start-here]').count()) === 1, 'the analyzed area is still on the map after a reload');
      // Again: the same area is replaced, not added (L12).
      const st2 = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      await page.mouse.move(st2.x + st2.width / 2, st2.y + st2.height / 2 + 50);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.click('[data-testid=look-here]');
      await page.waitForSelector('text=/Busiest area/', { timeout: 30000 });
      check((await rows()).length === 1, 'looking again replaces the area');
      await page.reload();
      await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 30000 });
      await page.waitForTimeout(1000);
    }

    // From the home, a star's Walk here starts a walk navigating there (N11),
    // even when the phone has no position yet: it routes on the first fix (audit).
    await page.evaluate(() => {
      const g = navigator.geolocation;
      const watch = g.watchPosition.bind(g);
      g.watchPosition = (ok, err, o) => {
        const t0 = Date.now();
        return watch((p) => Date.now() - t0 > 4000 && ok(p), err, o);
      };
    });
    await page.click('[aria-label^="Fox Point,"]');
    await page.waitForSelector('[data-testid=place-go]');
    await page.click('[data-testid=place-go]');
    await page.waitForURL(/\/walk/, { timeout: 30000 });
    check(await page.waitForSelector('text=Walk started · recording', { timeout: 10000 }).then(() => true, () => false), 'a walk started from the home says it is recording');
    await page.waitForTimeout(5000);
    await ctx.setGeolocation({ longitude: route[0][0], latitude: route[0][1] + 0.00002, accuracy: 6 });
    await page.waitForSelector('[data-testid=nav-bar]', { timeout: 40000 });
    check(/\/walk(\?|$)/.test(page.url()) && /Fox Point/.test(await page.locator('[data-testid=nav-bar]').innerText()), 'a star\u2019s Walk here starts a walk navigating there, once there is a fix');
    await shot(page, '12-home-go');
    // The walk adopts the marks scanned from the home (S11).
    check((await page.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').count()) === 3, 'the next walk adopts the home’s marks');
    // A later walk passing the flagged capture brings it back, in front (R2, R3, R4).
    // At a walking pace: a jump would be dropped as a GPS glitch.
    for (let j = 1; j <= 26; j++) {
      const f = j / 26;
      await ctx.setGeolocation({ longitude: route[0][0] + (pts[25][0] - route[0][0]) * f, latitude: route[0][1] + (pts[25][1] - route[0][1]) * f, accuracy: 6 });
      await page.waitForTimeout(1000);
      if (await page.locator('[data-testid=reminder]').count()) break;
    }
    const reminded = await page.waitForSelector('[data-testid=reminder]', { timeout: 15000 }).then(() => true, () => false);
    check(reminded && /memor|note/i.test(await page.locator('[data-testid=reminder]').innerText()), 'a later walk passing a flagged capture brings it back');
    await shot(page, '13-reminder');
    const recallRows = () => page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const r = req.result.transaction('recall', 'readonly').objectStore('recall').getAll();
        r.onsuccess = () => resolve(r.result);
      };
    }));
    // Once: the flag clears on its first fire (R6, R9).
    const left = (await recallRows()).length;
    check(left === 0, `a "once" reminder clears when it fires (${left} left)`);
    await page.click('[data-testid=reminder-open]');
    await page.waitForSelector('[data-testid=viewer-remind]');
    check(true, 'the reminder opens its capture');
    // Flagged again here, mid-walk, every visit: it waits for the next walk, not two seconds (audit).
    await page.click('[data-testid=viewer-remind]');
    await page.click('[data-testid=remind-visit]');
    await page.click('[data-testid=remind-save]');
    await page.waitForSelector('text=It will come back when you pass here');
    await page.click('[aria-label="Close"]');
    for (let j = 1; j <= 4; j++) {
      await ctx.setGeolocation({ longitude: pts[25][0], latitude: pts[25][1] + j * 0.00005, accuracy: 6 });
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);
    const again = await recallRows();
    check((await page.locator('[data-testid=reminder]').count()) === 0 && again.length === 1 && again[0].fired_count === 0,
      'a capture flagged mid-walk doesn’t come back in that walk');
    const away = [...hosts].filter((h) => !h.startsWith('localhost') && h !== 'tiles.openfreemap.org');
    check(away.length === 0, `nothing is sent anywhere but the map tiles (${away.join(', ')})`);
    check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
