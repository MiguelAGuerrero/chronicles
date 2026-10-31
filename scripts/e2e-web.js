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
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await ctx.route('https://tiles.openfreemap.org/**', (r) =>
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
    // Home is the places map; with nothing walked, one line and Start (H1, H2).
    await page.waitForSelector('text=Walk somewhere and it is starred here');
    check((await page.locator('canvas.maplibregl-canvas').count()) === 1 && (await page.locator('[data-testid=start]').count()) === 1, 'home opens on the map, empty, with Start');
    await shot(page, '00-home-empty');
    await page.click('[data-testid=start]');
    await page.waitForSelector('[data-testid=stop]');
    await page.waitForTimeout(2500);
    await shot(page, '01-walk-start');

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
        await page.click('[data-testid=voice-discard]');
        await page.waitForSelector('[data-testid=voice-undo]');
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
        await page.waitForSelector('text=What happened here');
        check((await page.getByText('The bakery smelled of cardamom.').count()) > 0, 'a long press on the map shows what happened there');
        await page.click('[aria-label="Close"]');
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
    check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
