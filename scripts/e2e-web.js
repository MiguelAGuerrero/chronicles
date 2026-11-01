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
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };

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
// Points of interest for discovery (D1): a memorial and an unnamed artwork are
// attractions on Fox Point's checklist; a café and a plain church are places but never
// on a checklist (S18, S20); a bus stop is not a place.
features.push({ type: 'Feature', properties: { class: 'monument', subclass: 'memorial', name: 'Hessian Memorial' }, geometry: { type: 'Point', coordinates: at(0.65, -0.35) } });
features.push({ type: 'Feature', properties: { class: 'cafe', subclass: 'cafe', name: 'Coffee Exchange' }, geometry: { type: 'Point', coordinates: at(-0.6, 0.4) } });
features.push({ type: 'Feature', properties: { class: 'place_of_worship', subclass: 'place_of_worship', name: 'Grace Church' }, geometry: { type: 'Point', coordinates: at(-0.4, -0.6) } });
features.push({ type: 'Feature', properties: { class: 'art_gallery', subclass: 'artwork' }, geometry: { type: 'Point', coordinates: at(1.1, 0.6) } });
features.push({ type: 'Feature', properties: { class: 'bus', subclass: 'bus_stop', name: 'Wickenden at Hope' }, geometry: { type: 'Point', coordinates: at(0.4, -0.6) } });
// Three more out east, within Fox Point's 1 km but far from the walk: on its checklist, never in range (E3, E6).
features.push({ type: 'Feature', properties: { class: 'park', subclass: 'park', name: 'Gano Park' }, geometry: { type: 'Point', coordinates: at(5.4, 0.6) } });
features.push({ type: 'Feature', properties: { class: 'bakery', subclass: 'bakery', name: 'Sunny Bakery' }, geometry: { type: 'Point', coordinates: at(5.2, -1.0) } });
features.push({ type: 'Feature', properties: { class: 'museum', subclass: 'museum', name: 'Fox Point Museum' }, geometry: { type: 'Point', coordinates: at(4.6, 1.8) } });
// A busy strip 1.1 km east of Fox Point (v1.5 landing): Thayer Street lined with shops for 250 m,
// inside the read around a press at Fox Point, and inside the walk's own explore read (E2).
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
  // The full Chromium in headless mode ('chromium' channel): the old headless shell always denies
  // notifications, whatever is granted, so the test notification couldn't be checked (NT6).
  const browser = await chromium.launch({
    channel: 'chromium',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=user-gesture-required'],
  });
  const start = at(-0.5, -0.5);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation', 'microphone', 'notifications'],
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
  // Opt-in render and map-update counters (src/lib/perfCount.ts).
  await ctx.addInitScript(() => { window.__perf = {}; });
  // Motion (M7): whether each pill or banner that lifts in was animating a frame after it appeared.
  await ctx.addInitScript(() => {
    const lifts = [];
    window.__lifts = lifts;
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          const els = n.matches('[data-testid=lift-in]') ? [n] : [...n.querySelectorAll('[data-testid=lift-in]')];
          for (const el of els)
            requestAnimationFrame(() => lifts.push({ el, animated: el.getAnimations().length > 0 || Number(getComputedStyle(el).opacity) < 1 }));
        }
    }).observe(document, { childList: true, subtree: true });
  });
  // The deferred four (M9-M12): each entrance as it appears, whether it was moving a frame later, and
  // what it marks; a stuck or vacuous wrapper fails (audit 3).
  await ctx.addInitScript(() => {
    const enters = [];
    window.__enters = enters;
    const moving = (el) => {
      const cs = getComputedStyle(el);
      const t = cs.transform;
      const m = t && t !== 'none' ? new DOMMatrix(t) : null;
      const still = !m || (Math.abs(m.a - 1) < 0.001 && Math.abs(m.d - 1) < 0.001 && Math.abs(m.f) < 0.1 && Math.abs(m.b) < 0.001);
      const ring = el.firstElementChild && el.dataset.testid === 'enter-pulse' ? Number(getComputedStyle(el.firstElementChild).opacity) > 0.05 : false;
      return Number(cs.opacity) < 0.99 || !still || ring;
    };
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          const els = n.matches('[data-testid^=enter-]') ? [n] : [...n.querySelectorAll('[data-testid^=enter-]')];
          for (const el of els)
            requestAnimationFrame(() => {
              const marker = el.closest('button, [role=img]');
              enters.push({ kind: el.dataset.testid.slice(6), animated: moving(el), label: marker?.getAttribute('aria-label') ?? '', ids: marker?.dataset.ids ?? '', el });
            });
        }
    }).observe(document, { childList: true, subtree: true });
  });
  // How far a button is pressed down (M4): its own scale and opacity while held, and its scale after.
  const pressedScale = async (pg, selector) => {
    const loc = pg.locator(selector).first();
    const box = await loc.boundingBox();
    const read = () => loc.evaluate((el) => {
      const t = getComputedStyle(el).transform;
      return { scale: t && t !== 'none' ? new DOMMatrix(t).a : 1, opacity: Number(getComputedStyle(el).opacity) };
    });
    await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(250);
    const held = await read();
    // Away, then up: the press is cancelled, not fired.
    await pg.mouse.move(box.x + box.width / 2, box.y - 300, { steps: 4 });
    await pg.mouse.up();
    await pg.waitForTimeout(500);
    const after = await read();
    return { scale: held.scale, opacity: held.opacity, after: after.scale };
  };
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Nothing leaves the device (D10): every request goes to this server or the tile host.
  const hosts = new Set();
  ctx.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol)) hosts.add(u.host); });
  // The app's own tile reads (landing, explore) get the same fake world as vector tiles.
  const { encodeTile } = await import('./mvt-encode.mjs');
  // Slow tiles on demand, so Cancel can land while a read is still out.
  let tileDelayMs = 0;
  // A stalled TileJSON request on demand, as on a phone with a weak signal (bug: a blank replay after Stop).
  let tilejsonStall = null;
  await ctx.route('https://tiles.openfreemap.org/**', async (r) => {
    const tile = /\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(r.request().url());
    if (tile && tileDelayMs) await new Promise((res) => setTimeout(res, tileDelayMs));
    if (tile) {
      const [z, x, y] = tile.slice(1).map(Number);
      return r.fulfill({ contentType: 'application/x-protobuf', body: Buffer.from(encodeTile(features, z, x, y)) });
    }
    if (tilejsonStall && r.request().url().endsWith('/planet')) await tilejsonStall;
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
    check((await page.locator('[data-testid=start-explore]').count()) === 1, 'beside Start, Explore starts a walk that explores (E1)');

    // Notifications on the web (v1 slice 6). Installable: the manifest is linked under the base path and served (NT1).
    const manifestHref = await page.evaluate(() => document.querySelector('link[rel=manifest]')?.getAttribute('href'));
    const manifest = manifestHref ? await page.evaluate(async (h) => (await fetch(h)).json(), manifestHref) : null;
    check(manifestHref === `${BASE}/manifest.webmanifest` && manifest?.display === 'standalone' && manifest.icons.some((i) => i.sizes === '512x512')
      && (await page.evaluate(() => !!document.querySelector('link[rel=apple-touch-icon]'))),
      'the web app can be installed: a manifest with icons, and Apple home-screen tags (NT1)');
    // The service worker is registered at the base path and active (NT2).
    const sw = await page.evaluate(async () => {
      const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 10000))]);
      return r ? { scope: r.scope, active: !!r.active } : null;
    });
    check(sw && sw.active && sw.scope.endsWith(`${BASE}/`), `the service worker is active at the base path (${JSON.stringify(sw)})`);
    // Settings: a switch per kind, both on; the test notification is a real one (NT4, NT6).
    await page.click('[data-testid=settings-open]');
    await page.waitForSelector('[data-testid=notify-settings]');
    const isOn = (id) => page.locator(`[data-testid=${id}] input`).isChecked();
    check((await isOn('notify-recall')) && (await isOn('notify-pause')), 'notifications: Remind me here and the pause reminder, both on by default (NT4)');
    await page.click('[data-testid=notify-test]');
    await page.waitForSelector('[data-testid=notify-sent]', { timeout: 10000 });
    const shownNotes = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => `${n.title}|${n.tag}`));
    check(shownNotes.includes('A memory from here|test'), `the test notification is shown through the service worker (${shownNotes.join(', ')}) (NT6)`);
    await shot(page, '00a-notify-settings');
    // A kind switched off stays off (NT4).
    await page.click('[data-testid=notify-pause]');
    await page.click('[data-testid=settings-done]');
    await page.click('[data-testid=settings-open]');
    await page.waitForSelector('[data-testid=notify-settings]');
    check((await isOn('notify-recall')) && !(await isOn('notify-pause')), 'a notification kind switched off stays off');
    await page.click('[data-testid=notify-pause]');
    await page.click('[data-testid=settings-done]');
    await shot(page, '00-home-empty');
    const held = await pressedScale(page, '[data-testid=start]');
    check(held.scale > 0.95 && held.scale < 0.99 && held.after === 1, `a large button presses down while held, and springs back (M4: ${held.scale.toFixed(3)} → ${held.after})`);
    await page.click('[data-testid=start]');
    await page.waitForSelector('[data-testid=stop]');
    // Caught as it appears: the walk's one-time long-press hint (after 100 m), dismissed at once, must
    // leave no copy behind to be read out again (audit 5).
    const hintLoc = page.locator('[data-testid=lift-in]', { hasText: 'Press and hold the map' });
    const hintDismissed = hintLoc.waitFor({ timeout: 180000 }).then(async () => {
      await hintLoc.locator('[aria-label=Dismiss]').click();
      await page.waitForTimeout(60);
      return (await hintLoc.count()) === 0;
    }, () => null);
    await page.waitForTimeout(2500);
    await shot(page, '01-walk-start');

    // Explore (v1 slice 5). A walk starts quiet: no "?" marks, no busy streets, though its checklist
    // is read in the background (E1, E2, E9).
    const walkMap = () => page.locator('.maplibregl-map').last();
    const walkMarks = () => walkMap().locator('[data-testid=mark-pin]');
    const placesRead = () => page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['checklist_area', 'checklist_item'], 'readonly');
        const a = tx.objectStore('checklist_area').getAll();
        const i = tx.objectStore('checklist_item').getAll();
        tx.oncomplete = () => resolve({ areas: a.result, items: i.result });
      };
    }));
    let read = { areas: [], items: [] };
    for (let i = 0; i < 30 && !read.areas.length; i++) {
      await page.waitForTimeout(500);
      read = await placesRead();
    }
    const fox = read.areas.find((x) => x.name === 'Fox Point');
    check(fox && fox.count === 4 && read.items.filter((x) => x.area_key === fox.key).map((x) => x.name).sort().join(',') === 'Fox Point Museum,Gano Park,Hessian Memorial,Public art',
      `a quiet walk still builds its neighborhood's checklist, attractions only (${JSON.stringify(read.areas.map((x) => [x.name, x.count]))})`);
    check((await walkMarks().count()) === 0 && (await walkMap().getByText('Thayer Street', { exact: true }).count()) === 0, 'a quiet walk shows no "?" marks and no busy streets');
    // Settings, from the walk's options: the range previewed as a ring around you (E16, E20, E21).
    await page.click('[data-testid=walk-options]');
    await page.waitForSelector('[data-testid=options-card]');
    check((await page.locator('[data-testid=explore-walk][aria-checked=false], [data-testid=explore-walk]:not([aria-checked=true])').count()) === 1, 'Explore starts off on a new walk (E1)');
    await page.click('[data-testid=open-settings]');
    await page.waitForSelector('[data-testid=settings]');
    const ringNow = () => page.locator('[data-ring]').last().getAttribute('data-ring');
    await page.waitForTimeout(500);
    check((await page.locator('[data-testid=range-value]').innerText()) === '100 m' && (await ringNow()) === '100', 'the range is 100 m by default, drawn as a ring on the walk map while settings are open');
    await page.click('[data-testid=range-plus]');
    await page.waitForTimeout(300);
    check((await page.locator('[data-testid=range-value]').innerText()) === '120 m' && (await ringNow()) === '120', 'the ring redraws as the range changes');
    await page.click('[data-testid=range-minus]');
    for (let i = 0; i < 6; i++) await page.click('[data-testid=range-minus]');
    check((await page.locator('[data-testid=range-value]').innerText()) === '60 m', 'the range never goes under 60 m');
    for (let i = 0; i < 2; i++) await page.click('[data-testid=range-plus]');
    check((await page.locator('[data-testid=kind-churches]').count()) === 1 && (await page.locator('[data-testid=pocket-alert]').count()) === 0, 'what I’m into lists the kinds; the web has no pocket alert');
    await shot(page, '01a-settings');
    await page.click('[data-testid=settings-done]');
    await page.waitForTimeout(300);
    check((await ringNow()) === '', 'the ring is never on the walk map outside settings');
    // Motion (M7): banners lift in rather than pop, and a dismissed one leaves no copy behind (audit 5).
    const lifts = await page.evaluate(() => window.__lifts.map((l) => ({ animated: l.animated, text: l.el.innerText.slice(0, 40) })));
    check(lifts.some((l) => /On the web/.test(l.text) && l.animated), `a banner lifts in rather than popping (M7: ${JSON.stringify(lifts.slice(0, 3))})`);


    // Leaks (the owner's iPhone tab crashed mid-walk): nothing may pile up while walking.
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    const leakSample = async () => {
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      const mm = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
      return { bodyDivs: await page.evaluate(() => document.body.children.length), listeners: mm.JSEventListeners, nodes: mm.Nodes };
    };
    // One live map during a walk: the home's is taken down while it isn't on screen (perf, Nov 1).
    check((await page.locator('canvas.maplibregl-canvas').count()) === 1, 'only the walk\u2019s map is live during a walk');
    const leak0 = await leakSample();
    const perf0 = await page.evaluate(() => ({ ...window.__perf }));
    const perfT0 = Date.now();

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
        // Explore on, for this walk (E1): the busy streets show, as information (E2, S21).
        await page.click('[data-testid=walk-options]');
        await page.waitForSelector('[data-testid=options-card]');
        await page.click('[data-testid=explore-walk]');
        await shot(page, '01c-options');
        await page.click('[data-testid=options-close]');
        // The quiet read kept no busy streets (the owner's call); switching Explore on reads them at once.
        await walkMap().getByText('Thayer Street', { exact: true }).first().waitFor({ timeout: 15000 }).catch(() => {});
        check((await walkMap().getByText('Thayer Street', { exact: true }).count()) >= 1, 'switching Explore on brings in the busy streets around');
      }
      if (k === 8) {
        // 75 m from the memorial: inside the 100 m range, a "?" that doesn't say what it is (E6).
        check((await walkMarks().count()) === 1 && (await page.locator('[aria-label="A place to find. Open"]').count()) === 1, 'a "?" shows for a place within range, and only that one');
      }
      if (k === 13) {
        // The live walk's dot is one gliding marker; the layers stay empty for it.
        check((await page.locator('[data-testid=walker-puck]').count()) === 1 && (await page.locator('[data-testid=walker-puck] svg').count()) === 2, 'the walker is one gliding marker, dot and cone');
        // Within 60 m, the memorial's "?" shows what it is (E7).
        check((await page.locator('[aria-label="Hessian Memorial, History & landmarks. Open"]').count()) === 1, 'a "?" shows its name and category within 60 m');
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
        // The video is taken about 40 m from the memorial: it finds it (E8). (The memo at step 10, 62 m off, does not.)
        await page.waitForTimeout(500);
        check((await page.locator('[aria-label="Found: Hessian Memorial, History & landmarks"]').count()) === 1, 'a capture within 60 m finds the place, which stays drawn as found');
        const seenEnters = await page.evaluate(() => window.__enters.map((e) => ({ kind: e.kind, animated: e.animated, label: e.label })));
        check(seenEnters.some((e) => e.kind === 'pulse' && e.animated && /^Found: Hessian/.test(e.label)), 'a find pulses once from its pin (M12)');
        check(seenEnters.some((e) => e.kind === 'flip' && e.animated), 'a revealed "?" turns into its place, on its way to being found (M11)');
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
        // Beside the pin (whose tap area covers the spot itself): ~27 m away at this zoom. The memorial's
        // found pin sits here too; it lets taps through to the map and the capture (audit, UI).
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
        // Go here on a "?" routes to it, unnamed until it is revealed (E12).
        await page.locator('[aria-label="A place to find. Open"]').first().click();
        await page.waitForSelector('[data-testid=mark-card]');
        check(/A place to find/.test(await page.locator('[data-testid=mark-card]').innerText()), 'an unrevealed place’s card does not say what it is');
        await page.click('[data-testid=mark-go]');
        await page.waitForSelector('[data-testid=nav-bar]', { timeout: 30000 });
        check(/· A place to find$/.test(await page.locator('[data-testid=nav-left]').innerText()), 'going to a place says "A place to find" until it is revealed');
        // On the way (E22): nothing else is in range of this short route, so no faint marks beyond the target.
        check((await page.locator('[aria-label="A place on the way. Open"]').count()) === 0, 'no faint marks where nothing lies along the route');
      }
      if (k === 30) {
        // A photo, then the opt-in caption.
        const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-testid=cap-photo]')]);
        await chooser.setFiles(path.join(__dirname, 'fixtures', 'photo.jpg'));
        // Its pin drops in (M10): the photo's own pin, moving as it appears, and gone back to a plain pin after.
        const before = await page.evaluate(() => window.__enters.length);
        await page.waitForFunction((n) => window.__enters.slice(n).some((e) => e.kind === 'drop'), before, { timeout: 5000 }).catch(() => {});
        const photoId = (await page.evaluate(() => new Promise((resolve) => {
          const req = indexedDB.open('chronicles');
          req.onsuccess = () => {
            const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
            g.onsuccess = () => resolve(g.result.filter((c) => c.kind === 'photo').sort((a, b) => b.t - a.t)[0]?.id ?? null);
          };
        })));
        const drops = await page.evaluate((n) => window.__enters.slice(n).filter((e) => e.kind === 'drop').map((e) => ({ animated: e.animated, ids: e.ids })), before);
        await page.waitForTimeout(600);
        const lingering = await walkMap().locator('[data-testid=enter-drop]').count();
        check(drops.some((d) => d.animated && d.ids.split(',').includes(photoId)) && lingering === 0,
          `the new photo's own pin drops in, then is a plain pin again (M10, audit 3, 4: ${JSON.stringify(drops)}, ${lingering} left)`);
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
        // 40 s of walking with captures, an explore read and a route: the page stays the same size (leak regression).
        const leak1 = await leakSample();
        // Reactivity budget (Nov 1): one fix a second must not re-render the screen several times,
        // nor re-send the map's sources more often than it changes.
        const perf1 = await page.evaluate(() => ({ ...window.__perf }));
        const secs = (Date.now() - perfT0) / 1000;
        const rate = (k) => ((perf1[k] ?? 0) - (perf0[k] ?? 0)) / secs;
        // This window is busy with taps (memos, a video, a note, a long press); steady walking is about
        // 1.4 renders a second (scripts/perf-walk.js). Before the fixes it was 3.7 here.
        check(rate('render:walk') <= 2.5 && rate('setData:cone') <= 1.05 && rate('setData:trace') <= 0.6,
          `walking stays within its render budget (walk ${rate('render:walk').toFixed(2)}/s, cone ${rate('setData:cone').toFixed(2)}/s, trace ${rate('setData:trace').toFixed(2)}/s)`);
        check(leak1.bodyDivs - leak0.bodyDivs <= 3 && leak1.listeners - leak0.listeners < 2000,
          `walking leaks no portals or listeners (body ${leak0.bodyDivs} → ${leak1.bodyDivs}, listeners ${leak0.listeners} → ${leak1.listeners}, nodes ${leak0.nodes} → ${leak1.nodes})`);
      }
      if (k === 40) {
        // A reload mid-walk is how the web resumes: it must land back on the walk.
        await page.reload();
        await page.waitForSelector('[data-testid=stop]');
        check(page.url().endsWith(`${BASE}/walk`), 'a reload mid-walk resumes the walk');
        await page.waitForTimeout(2500);
        const replayed = await page.evaluate(() => window.__enters.length);
        check(replayed === 0, `nothing animates when a screen reloads: pins and finds are just there (M10, M12: ${replayed})`);
      }
      if (k === 44) {
        const bar = await page.waitForSelector('[data-testid=nav-left]', { timeout: 30000 }).then((e) => e.innerText(), () => '');
        check(/Public art/.test(bar), `revealed, the place is named in the bar (${bar})`);
      }
      if (k === 54) {
        // What I'm into (E17): public art switched off hides its "?" at once; back on, it shows again.
        check((await page.locator('[aria-label="Public art, Art. Open"]').count()) === 1, 'the artwork shows, named, beside you');
        await page.click('[data-testid=walk-options]');
        await page.click('[data-testid=open-settings]');
        await page.click('[data-testid=kind-public_art]');
        await page.click('[data-testid=settings-done]');
        await page.waitForTimeout(500);
        check((await page.locator('[aria-label="Public art, Art. Open"]').count()) === 0, 'a kind switched off loses its "?" marks');
        await page.click('[data-testid=walk-options]');
        await page.click('[data-testid=open-settings]');
        await page.click('[data-testid=kind-public_art]');
        await page.click('[data-testid=settings-done]');
        await page.waitForTimeout(500);
        check((await page.locator('[aria-label="Public art, Art. Open"]').count()) === 1, 'switched back on, it shows at once');
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
    // The trace steps aside while navigating, so the route reads (the owner's call, Nov 2).
    const traceOpacity = () => page.locator('[data-trace-opacity]').last().getAttribute('data-trace-opacity');
    await page.waitForTimeout(500);
    check((await traceOpacity()) === '0', 'the trace hides while navigating');
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
    check((await traceOpacity()) === '1', 'the trace comes back once navigation ends');
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

    const dismissed = await hintDismissed;
    check(dismissed === true, `a dismissed banner leaves no copy behind (audit 5${dismissed == null ? ': the hint never showed' : ''})`);
    const box = await page.locator('[data-testid=stop]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    let releaseTilejson;
    tilejsonStall = new Promise((res) => { releaseTilejson = res; });
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    await page.waitForURL(/replay/, { timeout: 30000 });
    check(true, 'holding Stop opens the replay');
    // The walk opens from the device, whatever the network does (bug, Nov 1: blank until a reload).
    let opened = false;
    for (let k = 0; k < 40 && !opened; k++) {
      opened = (await page.getByText('Opening your walk').count()) === 0 && (await page.locator('canvas.maplibregl-canvas').count()) === 1;
      if (!opened) await page.waitForTimeout(50);
    }
    check(opened, 'the replay opens within 2 s while the tile host stalls');
    tilejsonStall = null;
    releaseTilejson();

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
      poiNames.includes('art:Public art') && poiNames.includes('history:Hessian Memorial') && poiNames.includes('food:Coffee Exchange') && !poiNames.some((n) => /Wickenden at Hope/.test(n))
        && pois.every((p) => p.build === '20261028_001001_pt'),
      `the walk's reads cache its places of interest, and no bus stop (${poiNames.join(', ')})`,
    );
    // The card lists the walk's finds, and keeps what it passed without stopping as a low (E11).
    check((await page.locator('[data-testid=card-finds]').innerText()) === 'Found Hessian Memorial', 'the card lists the places found');
    const low = await page.locator('[data-testid=card-low]').allInnerTexts();
    check(low.length === 1 && low[0] === 'Passed 1 place you didn’t stop for', `the card keeps the place passed as a low (${low.join(' | ')})`);
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
    check((await page.locator('[data-testid=enter-bounce]').count()) === 0, 'no star settles before one is selected');
    // A star lists its place's walks in the sheet, with the place's parents (H6).
    await page.click('[aria-label^="Fox Point,"]');
    await page.waitForSelector('[data-testid=place-title]');
    check(await page.evaluate(() => window.__enters.some((e) => e.kind === 'bounce' && e.animated && /^Fox Point,/.test(e.label))), 'a selected star settles into its ring (M9)');
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
    // Grabbed where the map itself is under the pointer: not the star, nor Start or the sheet floating
    // over it (the old grab pressed Start, so this check compared a view that never moved).
    const grab = await page.evaluate(({ w, h }) => {
      for (let y = 140; y < h - 220; y += 40)
        for (let x = 40; x < w - 40; x += 40) {
          const e = document.elementFromPoint(x, y);
          if (e?.tagName === 'CANVAS') return { x, y };
        }
      return null;
    }, { w: home.width, h: home.height });
    const starPanned = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    await page.mouse.move(home.x + grab.x, home.y + grab.y);
    await page.mouse.down();
    await page.mouse.move(home.x + grab.x + 40, home.y + grab.y + 30, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const starMoved = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    check(Math.abs(starMoved.x - starPanned.x - 40) < 6 && Math.abs(starMoved.y - starPanned.y - 30) < 6,
      `a drag on the home map pans it, so the next check compares a moved view (${Math.round(starPanned.x)},${Math.round(starPanned.y)} → ${Math.round(starMoved.x)},${Math.round(starMoved.y)})`);
    const fitsBefore = await page.evaluate(() => window.__perf.fit ?? 0);
    // The Walks list: every stopped walk; one opens its replay as a re-watch (H4, H5).
    // Opening it zooms out to every place walked (M6), framing the star above the sheet.
    await page.click('[data-testid=sheet-walks]');
    await page.waitForSelector('[data-testid=walk-row]');
    await page.waitForTimeout(1200);
    const starBefore = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    const sheetTop = (await page.locator('[data-testid=home-sheet]').boundingBox()).y;
    const fitsAfter = await page.evaluate(() => window.__perf.fit ?? 0);
    check(fitsAfter === fitsBefore && starBefore.y + starBefore.height < sheetTop && starBefore.y > 0,
      `opening the walks list leaves a view that already shows every place alone (M6, audit 7: ${fitsAfter - fitsBefore} fits, star at ${Math.round(starBefore.y)}, sheet at ${Math.round(sheetTop)})`);
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

    // Reduce motion (M2): the same home with the system setting on. Nothing presses down, the sheet snaps.
    {
      const still = await ctx.newPage();
      still.on('pageerror', (e) => errors.push(String(e)));
      await still.emulateMedia({ reducedMotion: 'reduce' });
      await still.goto(page.url());
      await still.waitForSelector('[data-testid=home-sheet]');
      await still.waitForTimeout(800);
      await still.click('[aria-label^="Fox Point,"]');
      await still.waitForTimeout(100);
      const stillEnters = await still.evaluate(() => window.__enters.map((e) => ({ kind: e.kind, animated: e.animated })));
      check(!stillEnters.some((e) => e.animated), `with reduce motion on, a selected star doesn't move (M2, M9: ${JSON.stringify(stillEnters)})`);
      await still.keyboard.press('Escape');
      await still.waitForTimeout(400);
      const flat = await pressedScale(still, '[data-testid=start]');
      const peek = (await still.locator('[data-testid=home-sheet]').boundingBox()).height;
      await still.click('[data-testid=sheet-walks]');
      await still.waitForTimeout(60);
      const open = (await still.locator('[data-testid=home-sheet]').boundingBox()).height;
      check(flat.scale === 1 && flat.opacity < 1 && open - peek > 200,
        `with reduce motion on, nothing moves, the press still shows, and the sheet snaps open (M2, audit 4: scale ${flat.scale}, opacity ${flat.opacity}, ${Math.round(peek)} → ${Math.round(open)} px in 60 ms)`);
      await still.close();
    }
    // A spring cut short by a drag still reports where the sheet ended (audit 2): Start sits on the
    // peeking sheet. Touch, as on a phone: in a browser a mouse drag on a moving element is cancelled.
    {
      const springy = await ctx.newPage();
      springy.on('pageerror', (e) => errors.push(String(e)));
      await springy.goto(page.url());
      await springy.waitForSelector('[data-testid=home-sheet]');
      await springy.waitForTimeout(800);
      await springy.click('[data-testid=sheet-walks]');
      await springy.waitForTimeout(700);
      await springy.click('[data-testid=sheet-map]');
      await springy.waitForTimeout(60);
      const hd = await springy.locator('[data-testid=sheet-drag]').boundingBox();
      const touch = await springy.context().newCDPSession(springy);
      const x = hd.x + hd.width / 2;
      const vh = springy.viewportSize().height;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: hd.y + 10 }] });
      for (let y = hd.y + 30; y < vh - 10; y += 60) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await springy.waitForTimeout(900);
      const startBox = await springy.locator('[data-testid=start]').boundingBox({ timeout: 3000 }).catch(() => null);
      check(!!startBox && startBox.y > vh * 0.7, `after a drag cuts a spring short, Start sits on the peeking sheet (audit 2: Start at ${startBox ? Math.round(startBox.y) : 'none'} of ${vh})`);
      await springy.close();
    }

    // A reminder tapped with the home in front, after a walk: the home opens it at once (audit: one
    // listener slot meant the walk screen, gone, had taken the home's).
    {
      const anyId = await page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
          g.onsuccess = () => resolve(g.result.find((c) => c.kind === 'text')?.id ?? null);
        };
      }));
      const homeTap = { type: 'notice-response', id: 'recall-home', data: { captureIds: [anyId] }, action: null };
      await page.evaluate((m) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: m })), homeTap);
      const opened = await page.waitForSelector('[data-testid=viewer-close]', { timeout: 8000 }).then(() => true, () => false);
      check(opened && (await page.locator('[data-testid=viewer-close]').count()) === 1, 'a reminder tapped with the home in front after a walk opens there, once');
      if (opened) await page.click('[data-testid=viewer-close]');
    }

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

    // The place view counts Fox Point's checklist, never the overview (E10).
    check((await page.locator('[data-testid=place-count]').count()) === 0 && (await page.locator('[data-testid=mark-pin]').count()) === 0, 'the home shows no count and no "?" on the overview');
    await page.click('[aria-label^="Fox Point,"]');
    await page.waitForSelector('[data-testid=place-count]');
    check(/^1 of 4 · list from /.test(await page.locator('[data-testid=place-count]').innerText()), `Fox Point's place view says how many of its places were found (${await page.locator('[data-testid=place-count]').innerText()})`);
    check(/Hessian Memorial/.test(await page.locator('[data-testid=place-found]').innerText()), 'and which');
    await page.click('[data-testid=sheet-map]');
    // Settings from the home: the ring around where the last walk was, with the places inside it (E21).
    await page.click('[data-testid=settings-open]');
    await page.waitForSelector('[data-testid=settings]');
    await page.waitForTimeout(1500);
    check((await page.locator('[data-ring]').first().getAttribute('data-ring')) === '100', 'the home previews the range as a ring');
    await shot(page, '11a-home-settings');
    await page.click('text=Cancel');
    await page.waitForTimeout(500);
    check((await page.locator('[data-ring]').first().getAttribute('data-ring')) === '' && (await page.locator('[data-testid=mark-pin]').count()) === 0, 'closing settings takes the ring and its places away');

    // What's good here (v1.5): a long press, then a read of the area around the city
    // nearby, finds Thayer Street's strip, as information: no Start here pin (L1, L2, L5, L7, L9, explore).
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
      const rowCount = async () => (await page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('landing', 'readonly').objectStore('landing').getAll();
          g.onsuccess = () => resolve(g.result.length);
        };
      })));
      const rowsBefore = await rowCount();
      tileDelayMs = 4000;
      await press(st);
      await page.click('[data-testid=look-here]');
      await page.click('[data-testid=look-cancel]');
      const gone = (await page.locator('[data-testid=look-cancel]').count()) === 0;
      await page.waitForTimeout(6000);
      tileDelayMs = 0;
      check(gone && (await rowCount()) === rowsBefore, 'cancelling a look stops it at once, with nothing kept');
      await press(st);
      await page.click('[data-testid=look-here]');
      await page.waitForSelector('text=/Busiest area: Thayer Street. A best guess from the map./', { timeout: 30000 });
      await page.waitForTimeout(1500);
      await shot(page, '11c-landing');
      check((await page.getByText('Thayer Street', { exact: true }).count()) >= 1 && (await page.locator('[data-testid=start-here]').count()) === 0,
        'what\u2019s good here finds the strip, named, with no Start here pin');
      const rows = () => page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('landing', 'readonly').objectStore('landing').getAll();
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const first = await rows();
      // The walk's own explore read remembered the area around its start; the look adds the city's.
      check(first.some((r) => r.analysis.strips.some((x) => x.name === 'Thayer Street')), 'the area is remembered, Thayer Street among its strips');
      // Remembered: after a reload, it is still on the map, offline (L11).
      await page.reload();
      await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 30000 });
      await page.waitForTimeout(1500);
      check((await page.getByText('Thayer Street', { exact: true }).count()) >= 1, 'the analyzed area is still on the map after a reload');
      // Again: the same area is replaced, not added (L12).
      const st2 = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
      await page.mouse.move(st2.x + st2.width / 2, st2.y + st2.height / 2 + 50);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.click('[data-testid=look-here]');
      await page.waitForSelector('text=/Busiest area/', { timeout: 30000 });
      check((await rows()).length === first.length, 'looking again replaces the area');
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
    // A walk from a star starts quiet (E1); reminders still come back on a quiet walk (the owner's call, after the audit).
    check((await walkMarks().count()) === 0, 'a new walk starts quiet');
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
    // Memories on revisit: the first walk's captures nearby show as faint pins on this quiet walk
    // (MR1, MR6), but not the one whose reminder card is up (MR7).
    const captureRows = () => page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
        g.onsuccess = () => resolve(g.result);
      };
    }));
    const memoryPins = () => walkMap().locator('[data-testid=memory-pin]');
    await page.waitForSelector('[data-testid=memory-pin]', { timeout: 15000 }).catch(() => null);
    const flaggedNote = (await captureRows()).find((c) => /cardamom/.test(c.body ?? ''));
    const shownIds = (await memoryPins().evaluateAll((els) => els.map((e) => e.dataset.ids))).join(',');
    check((await memoryPins().count()) >= 1 && !shownIds.includes(flaggedNote.id),
      `a later walk shows the earlier walk's captures nearby as memory pins, minus the one being reminded (MR1, MR6, MR7: ${await memoryPins().count()} pins)`);
    // Read by place, never the whole store (audit 2).
    const indexed = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => resolve([...req.result.transaction('capture', 'readonly').objectStore('capture').indexNames]);
    }));
    check(indexed.includes('lat'), `captures are read by latitude, not with getAll over the store (audit 2: ${indexed.join(', ')})`);
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
    // A memory pin: faded and smaller than a capture pin (MR3); a tap previews it (MR4), and the preview
    // opens the viewer with every memory from that spot (MR5).
    await page.waitForSelector('[data-testid=memory-pin]', { timeout: 15000 });
    // The faded pin itself; its clock badge stays solid (MR3, MR10).
    const look = await memoryPins().first().evaluate((el) => ({
      opacity: Math.min(...[...el.querySelectorAll('*')].map((e) => Number(getComputedStyle(e).opacity))),
      badge: Number(getComputedStyle(el.querySelector('[data-testid=memory-badge]')).opacity),
      label: el.getAttribute('aria-label'),
    }));
    check(look.opacity < 0.7 && look.badge === 1 && /memor/i.test(look.label), `memory pins are faint, their clock solid, and named as memories (MR3, MR10: opacity ${look.opacity}, badge ${look.badge}, "${look.label}")`);
    check((await memoryPins().first().locator('[data-testid=memory-badge]').count()) === 1 && (await walkMap().locator('[data-testid=mark-pin] [data-testid=memory-badge]').count()) === 0,
      'a memory pin carries a clock badge, and nothing else does (MR10)');
    // Under this walk's own pins, never over them (audit 6).
    const z = await memoryPins().first().evaluate((el) => getComputedStyle(el).zIndex);
    check(z === '0', `memory pins sit under capture pins (audit 6: z-index ${z})`);
    // The tapped pin's own capture leads the preview (audit 3).
    const tappedIds = (await memoryPins().first().getAttribute('data-ids')).split(',');
    const tappedFirst = (await captureRows()).find((c) => c.id === tappedIds[0]);
    // ✕ and Escape close it (MR4).
    await memoryPins().first().click();
    await page.waitForSelector('[data-testid=memory-preview]');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const goneEsc = (await page.locator('[data-testid=memory-preview]').count()) === 0;
    await memoryPins().first().click();
    await page.waitForSelector('[data-testid=memory-preview]');
    await page.click('[data-testid=memory-close]');
    await page.waitForTimeout(200);
    check(goneEsc && (await page.locator('[data-testid=memory-preview]').count()) === 0, 'Escape and ✕ close the preview (MR4)');
    await memoryPins().first().click();
    await page.waitForSelector('[data-testid=memory-preview]');
    const preview = await page.locator('[data-testid=memory-preview]').innerText();
    const kindWord = { photo: /Photo|\w/, video: /Video/, voice: /Voice memo/, text: /\w/ }[tappedFirst.kind];
    // The first line with words: the kind's icon is a glyph on its own line.
    const firstLine = preview.split('\n').map((l) => l.trim()).find((l) => /[A-Za-z0-9]/.test(l)) ?? '';
    check(kindWord.test(firstLine) && (tappedFirst.kind !== 'text' || firstLine === (tappedFirst.body ?? '').split('\n')[0]),
      `the preview shows the tapped pin's own capture (audit 3: ${tappedFirst.kind}, "${firstLine}")`);
    check(/20\d\d|Nov|Oct/.test(preview) && /Fox Point|Cardamom/.test(preview), `a tap previews the memory with its date and walk (MR4: ${preview.replace(/\s+/g, ' ').slice(0, 80)})`);
    check((await page.locator('[data-testid=reminder]').count()) === 0, 'opening a memory never brings a card or a buzz of its own');
    await page.click('[data-testid=memory-open]');
    await page.waitForSelector('text=Memories here');
    check((await page.locator('[data-testid=memory-preview]').count()) === 0, 'the preview opens the viewer with the memories from that spot (MR5)');
    await page.click('[data-testid=viewer-close]');
    // A tapped reminder notification opens its capture, playing (NT8). First with the walk screen in front:
    // the service worker's message reaches the page's listener, and the capture opens at once (audit 1).
    const noteId = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
        g.onsuccess = () => resolve(g.result.find((c) => /cardamom/.test(c.body ?? ''))?.id ?? null);
      };
    }));
    const tap = { type: 'notice-response', id: 'recall-x', data: { captureIds: [noteId] }, action: null };
    await page.evaluate((m) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: m })), tap);
    check(await page.waitForSelector('text=The bakery smelled of cardamom.', { timeout: 10000 }).then(() => true, () => false),
      'a reminder tapped with the walk in front opens its capture at once');
    await page.click('[data-testid=viewer-close]');
    // Then a cold open: no window was open, so the service worker opened one carrying the tap. With the
    // walk still open, the home sends it on to the walk, which opens the capture (audit 2).
    await page.goto(`${url}?notice=${encodeURIComponent(JSON.stringify(tap))}`);
    check(await page.waitForSelector('text=The bakery smelled of cardamom.', { timeout: 20000 }).then(() => true, () => false)
      && !page.url().includes('notice='), 'a tap that opened the app opens its capture on the walk, and leaves the URL clean');
    await page.waitForTimeout(800);
    const viewers = await page.locator('[data-testid=viewer-close]').count();
    check(viewers === 1, `it opens once, on the walk: the home beneath doesn't open it too (${viewers} viewers)`);
    await page.click('[data-testid=viewer-close]');

    const away = [...hosts].filter((h) => !h.startsWith('localhost') && h !== 'tiles.openfreemap.org');
    check(away.length === 0, `nothing is sent anywhere but the map tiles (${away.join(', ')})`);
    check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
  } catch (e) {
    console.error(e.message);
    // E2E_FAIL_SHOT=<file> saves what the page showed when it failed.
    if (process.env.E2E_FAIL_SHOT) await page.screenshot({ path: process.env.E2E_FAIL_SHOT }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
