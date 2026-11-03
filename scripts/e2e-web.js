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
// Ionicons' glyphs, to tell which icon a button draws (tabs audit U10, U11).
const IONS = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const glyph = (name) => String.fromCodePoint(IONS[name]);
// A glyph's icon name, for messages: the characters themselves don't print.
const iconOf = (text) => Object.keys(IONS).find((k) => glyph(k) === text) ?? JSON.stringify(text);

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
  // E2E_SOFT=1 reports a failed check and goes on, to see every check fail on code from before a fix.
  if (!ok && process.env.E2E_SOFT) {
    console.log(`not ok - ${what}`);
    return;
  }
  if (!ok) throw new Error(`FAILED: ${what}`);
  console.log(`ok - ${what}`);
}

(async () => {
  const server = await serve();
  const url = `http://localhost:${server.address().port}${BASE}/`;
  // Explore is the root (NV2); scenarios that begin on Navigate open its own path.
  const navUrl = `${url}navigate`;
  // A fake microphone, so voice memos can be recorded headless.
  // Sound only after a tap, as on iOS: the replay reaches its stops on its own clock.
  // The full Chromium in headless mode ('chromium' channel): the old headless shell always denies
  // notifications, whatever is granted, so the test notification couldn't be checked (NT6).
  const browser = await chromium.launch({
    channel: 'chromium',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=user-gesture-required'],
  });
  const start = at(-0.5, -0.5);
  // Headless Chromium reports en-US, whose default is miles (QL13). The checks read metres, so every
  // context tells the app's units default it is in Canada; formatting is untouched. E2E_MILES=1 keeps en-US.
  const metricRegion = (c) => (process.env.E2E_MILES ? Promise.resolve() : c.addInitScript(() => {
    const ro = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function () { return { ...ro.call(this), locale: 'en-CA' }; };
  }));
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
  await metricRegion(ctx);
  // Opt-in render and map-update counters (src/lib/perfCount.ts).
  await ctx.addInitScript(() => { window.__perf = {}; });
  // Open in Maps (NH1-NH7): links the app opens are recorded, never followed.
  await ctx.addInitScript(() => {
    window.__opened = [];
    window.open = (u) => {
      window.__opened.push(String(u));
      return null;
    };
  });
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
  // A meta value, read from IndexedDB.
  const metaOf = (pg, key) => pg.evaluate((k) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('meta', 'readonly').objectStore('meta').get(k);
      g.onsuccess = () => resolve(g.result?.value ?? null);
    };
  }), key);
  // Navigate's drawer has one height now: 'half' and 'full' open its settings dialog (the summary line under
  // Start), 'peek' closes it with Escape. Other sheets (home, Explore) still go by their own handles.
  const drawerTo = async (pg, size, testid = 'drawer-drag') => {
    if (testid === 'drawer-drag') {
      const open = (await pg.locator('[data-testid=start-dialog]').count()) > 0;
      if (size === 'peek') {
        if (open) {
          await pg.keyboard.press('Escape');
          await pg.waitForTimeout(400);
        }
      } else if (!open) {
        await pg.click('[data-testid=start-options]');
        await pg.waitForSelector('[data-testid=start-dialog]');
        await pg.waitForTimeout(400);
      }
      return;
    }
    if (size === 'peek') {
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(600);
      return;
    }
    const hb = await pg.locator(`[data-testid=${testid}]`).boundingBox();
    if (size === 'half') await pg.mouse.click(hb.x + hb.width / 2, hb.y + 8);
    else {
      await pg.mouse.move(hb.x + hb.width / 2, hb.y + 8);
      await pg.mouse.down();
      await pg.mouse.move(hb.x + hb.width / 2, 30, { steps: 8 });
      await pg.mouse.up();
    }
    await pg.waitForTimeout(700);
  };
  // Elements on the tab in front: JS tabs keep the others mounted beneath it, aria-hidden.
  const shownCount = (pg, sel) => pg.evaluate((q) => [...document.querySelectorAll(q)].filter((e) => !e.closest('[aria-hidden=true]')).length, sel);
  // What is drawn at a point: the tab bar hides under the walk and the replays (NV6).
  const tabBarShown = (pg) => pg.evaluate(() => {
    const t = document.querySelector('[data-testid=tab-navigate]');
    if (!t) return false;
    const b = t.getBoundingClientRect();
    if (!b.width) return false;
    return !!document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('[data-testid^=tab-]');
  });
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
  const tileRoute = async (r) => {
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
  };
  await ctx.route('https://tiles.openfreemap.org/**', tileRoute);

// A fresh browser, for a flow of its own (NV12, NV15, NV25, the tabs audit).
  // `permissions: []` makes a browser that denies location (QL19).
  const freshPage = async (label, opts = {}) => {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      // E2E_MOBILE=1: a phone's touch screen, so taps come as touches and the browser makes the clicks.
      ...(process.env.E2E_MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}),
      permissions: opts.permissions ?? ['geolocation'],
      geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 },
    });
    await metricRegion(c);
    await c.route('https://tiles.openfreemap.org/**', tileRoute);
    c.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol)) hosts.add(u.host); });
    const pg = await c.newPage();
    pg.on('pageerror', (e) => errors.push(`${label}: ${e}`));
    pg.on('console', (m) => m.type() === 'error' && errors.push(`${label}: ${m.text()}`));
    return { c, pg };
  };
  const openWalk = (pg) => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
      g.onsuccess = () => resolve(g.result.find((w) => w.open) ?? null);
    };
  }));
  // The tabs audit (Navigation & tabs): each accepted finding's regression check, `tabs audit N`, in a
  // fresh browser. E2E_ONLY=tabs runs it alone.
  const tabsAudit = async () => {
    const { c, pg } = await freshPage('tabs-audit');
    await c.addInitScript(() => {
      window.__perf = {};
      // Location watches begun, so Navigate is seen to start none of its own while a walk is open (U2).
      const g = navigator.geolocation;
      const watch = g.watchPosition.bind(g);
      window.__watchCalls = 0;
      g.watchPosition = (...a) => { window.__watchCalls++; return watch(...a); };
    });
    const rows = (pg2, kind) => pg2.evaluate((k) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
        g.onsuccess = () => resolve(g.result.filter((x) => !k || x.kind === k));
      };
    }), kind);
    const vh = 844;
    let w = null;
    // E2E_SOFT=1: a step that throws (an element missing on code from before a fix) is reported, and the next runs.
    const step = async (name, fn) => {
      try {
        await fn();
      } catch (e) {
        if (!process.env.E2E_SOFT) throw e;
        console.log(`not ok - ${name}: ${String(e.message).split('\n')[0]}`);
      }
    };
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.waitForTimeout(1500);

    await step('tabs audit U9 and the banner', async () => {
      // tabs audit U9: the web's note can be dismissed, and stays dismissed after a reload.
      const noteText = 'text=On the web, a walk is traced while this page is open and on screen.';
      const noteShown = (await pg.locator(noteText).count()) === 1;
      const closeBox = noteShown ? await pg.locator('[data-testid=banner-dismiss]').boundingBox() : null;
      // tabs audit U4: the banner's ✕ is 44 pt itself (react-native-web has no hit slop).
      check(closeBox && closeBox.width >= 44 && closeBox.height >= 44, `tabs audit U4: the banner's ✕ is at least 44 pt (${closeBox && `${closeBox.width}×${closeBox.height}`})`);
      await pg.click('[data-testid=banner-dismiss]');
      await pg.waitForTimeout(400);
      await pg.reload();
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      check(noteShown && (await pg.locator(noteText).count()) === 0, 'tabs audit U9: Navigate’s web note can be dismissed, and stays dismissed after a reload');

    });
    await step('tabs audit U1, U4, U12 in the drawer', async () => {
      // tabs audit U1: Start and the capture row stay docked low and tappable at the peek.
      const r = await (async () => {
        const vh = pg.viewportSize().height;
        const out = [];
        for (const id of ['moment-photo', 'moment-voice', 'moment-note', 'start']) {
          const b = await pg.locator(`[data-testid=${id}]`).boundingBox();
          const hit = b && await pg.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'), { x: b.x + b.width / 2, y: b.y + b.height / 2 });
          out.push(b && hit === id && b.y > vh * 0.6 ? 'ok' : `${id}:${b && Math.round(b.y)}:${hit}`);
        }
        return out;
      })();
      check(r.every((x) => x === 'ok'), `tabs audit U1: Start and the camera, mic and pencil sit low on the screen and can be tapped (${r.join(', ')})`);
      // Nov 3: the drawer doesn't pull up; its summary line opens one dialog with every setting in one scroll.
      const peekBox = await pg.locator('[data-testid=navigate-drawer]').boundingBox();
      await drawerTo(pg, 'half');
      check((await pg.locator('[data-testid=start-dialog]').count()) === 1 && (await pg.locator('[data-testid=mode-quiet]').isVisible())
        && (await pg.locator('[data-testid=notify-settings]').count()) === 1 && (await pg.locator('[data-testid=kind-churches]').count()) === 0,
        'Nov 3: the summary line opens one dialog: the mode, the destination, reminders and alerts (no kinds with Quiet)');
      await drawerTo(pg, 'peek');
      check((await pg.locator('[data-testid=start-dialog]').count()) === 0 && Math.round((await pg.locator('[data-testid=navigate-drawer]').boundingBox()).height) === Math.round(peekBox.height),
        'Nov 3: Escape closes the dialog, and the drawer is as it was');
      // A pull on the grip opens the dialog too, and the drawer itself doesn't move.
      {
        const hb = await pg.locator('[data-testid=drawer-drag]').boundingBox();
        await pg.mouse.move(hb.x + hb.width / 2, hb.y + 8);
        await pg.mouse.down();
        await pg.mouse.move(hb.x + hb.width / 2, 120, { steps: 8 });
        await pg.mouse.up();
        await pg.waitForTimeout(600);
        check((await pg.locator('[data-testid=start-dialog]').count()) === 1, 'Nov 3: a pull on the grip opens the dialog');
        await drawerTo(pg, 'peek');
      }
      await drawerTo(pg, 'half');
      // The settings scroll above the dialog's own Start: the last setting can be brought into view inside it.
      {
        await pg.locator('[data-testid=notify-test]').scrollIntoViewIfNeeded();
        await pg.waitForTimeout(300);
        const btn = await pg.locator('[data-testid=notify-test]').boundingBox();
        const foot = await pg.locator('[data-testid=start-dialog-start]').boundingBox();
        check(btn && btn.y + btn.height <= foot.y, `Nov 3: the dialog's settings scroll above its Start walk, never under it (${btn && Math.round(btn.y + btn.height)} ≤ ${Math.round(foot.y)})`);
      }
      // tabs audit U12: no second "Notifications" heading under "Reminders and alerts".
      const heads = await pg.locator('[data-testid=start-dialog] [role=heading]').allInnerTexts();
      check(heads.includes('Reminders and alerts') && !heads.includes('Notifications'), `tabs audit U12: Reminders and alerts, with no Notifications heading under it (${heads.join(', ')})`);
      // tabs audit U4: a whole switch row flips its switch, tapped on its words.
      {
        const isOn = () => pg.locator('[data-testid=notify-pause] input').isChecked();
        const before = await isOn();
        await pg.locator('[data-testid=notify-pause]').getByText('Pause reminder', { exact: true }).click();
        await pg.waitForTimeout(300);
        const after = await isOn();
        await pg.locator('[data-testid=notify-pause]').getByText('Pause reminder', { exact: true }).click();
        await pg.waitForTimeout(300);
        check(before === true && after === false && (await isOn()) === true && (await metaOf(pg, 'notify_off')) !== null,
          `tabs audit U4: tapping a switch row's words flips its switch (${before} → ${after})`);
      }
      // tabs audit U4: the range's − and + are 44 pt.
      await pg.locator('[data-testid=mode-explore]').scrollIntoViewIfNeeded();
      await pg.click('[data-testid=mode-explore]');
      await pg.waitForTimeout(400);
      {
        const m = await pg.locator('[data-testid=range-minus]').boundingBox();
        const p = await pg.locator('[data-testid=range-plus]').boundingBox();
        check(m.width >= 44 && m.height >= 44 && p.width >= 44 && p.height >= 44, `tabs audit U4: the range's − and + are at least 44 pt (${m.width}×${m.height}, ${p.width}×${p.height})`);
        const kindRow = pg.locator('[data-testid=kind-public_art]');
        const was = await kindRow.locator('input').isChecked();
        await kindRow.getByText('Public art', { exact: true }).click();
        await pg.waitForTimeout(300);
        const now = await kindRow.locator('input').isChecked();
        await kindRow.getByText('Public art', { exact: true }).click();
        await pg.waitForTimeout(300);
        check(was !== now, 'tabs audit U4: a kind’s row flips its switch, tapped on its name');
      }
      await pg.locator('[data-testid=mode-quiet]').scrollIntoViewIfNeeded();
      await pg.click('[data-testid=mode-quiet]');
      await drawerTo(pg, 'peek');
      check((await pg.locator('[data-testid=peek-choices]').innerText()) === 'Quiet', 'tabs audit U12: the line under Start says the mode');

    });
    // Chronicle with no walks (tabs audit U7): the peek holds the empty line and a way to Navigate.
    const emptyPeek = async (when) => {
      const sheet = await pg.locator('[data-testid=home-sheet]').boundingBox();
      const nav = await pg.locator('[data-testid=sheet-navigate]').boundingBox().catch(() => null);
      const said = (await pg.locator('[data-testid=home-sheet]').innerText()).includes('Walk somewhere and it is starred here');
      check(said && nav && sheet && nav.y >= sheet.y && nav.y + nav.height <= sheet.y + sheet.height + 1 && (await shownCount(pg, '[data-testid=sheet-navigate]')) === 1,
        `tabs audit U7: ${when}, Chronicle's peek says how walks get here and offers Navigate (${said}, ${nav && Math.round(nav.y)})`);
      if (await pg.locator('[data-testid=sheet-navigate]').count()) await pg.click('[data-testid=sheet-navigate]');
      else await pg.click('[data-testid=tab-navigate]');
      await pg.waitForTimeout(1000);
      check((await pg.locator('[data-testid=tab-navigate][aria-selected=true]').count()) === 1, `tabs audit U7: ${when}, the peek's Navigate opens Navigate`);
    };
    await step('tabs audit Chronicle read before the walk', async () => {
      // Chronicle is opened once before any walk: its last read says no walk is open (tabs audit 2).
      await pg.click('[data-testid=tab-chronicle]');
      await pg.waitForSelector('[data-testid=home-sheet]');
      await pg.waitForTimeout(800);
      await emptyPeek('with nothing walked');

    });
    await step('tabs audit 3: a memo, then Walk here', async () => {
      // tabs audit 3: a memo recording on Navigate is saved when another tab comes to the front, and
      // Walk here started meanwhile waits for it: never a walk under a recording memo.
      await pg.click('[data-testid=moment-voice]');
      await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 });
      await pg.waitForTimeout(1600);
      await pg.click('[data-testid=tab-explore]');
      await pg.waitForSelector('[data-testid=atlas-grid]');
      await pg.waitForTimeout(1500);
      // Explore is the atlas now (AT1): the grid of areas near you, under a small map.
      check((await pg.locator('[data-testid=atlas-grid]').count()) === 1, 'Explore opens on the atlas of areas near you (AT1)');
      {
        const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
        await pg.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 40);
        await pg.mouse.down();
        await pg.waitForTimeout(700);
        await pg.mouse.up();
      }
      {
        // tabs audit U6: What's good here? is the filled button; Walk here the secondary one.
        await pg.waitForSelector('[data-testid=look-here]');
        const bg = (sel) => pg.locator(sel).evaluate((e) => getComputedStyle(e).backgroundColor);
        const look = await bg('[data-testid=look-here]');
        const walkHere = await bg('[data-testid=walk-here]');
        check(look === 'rgb(194, 65, 12)' && walkHere !== look, `tabs audit U6: on Explore's card, What's good here? is primary and Walk here secondary (${look}, ${walkHere})`);
      }
      await pg.click('[data-testid=walk-here]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      await pg.waitForSelector('[data-testid=stop]');
      w = await openWalk(pg);
      const memos = await rows(pg, 'voice');
      check(memos.length === 1 && memos[0].walk_id == null && memos[0].file_path && w,
        `tabs audit 3: leaving Navigate mid-memo saves the memo, and Walk here starts the walk only after (${memos.length} memo)`);

    });
    const north = async (y0, y1) => {
      for (let y = y0; y <= y1 + 1e-9; y += 0.05) {
        const p = at(-0.5, y);
        await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
        await pg.waitForTimeout(1000);
      }
    };
    await north(-0.5, -0.3);

    await step('tabs audit 1: a double tap on the bar', async () => {
      // tabs audit 1: a double tap on the recording bar opens one walk screen, not two.
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-return]', { timeout: 10000 });
      await pg.waitForTimeout(600);
      // Two quick taps, as a thumb gives them: the second lands before the walk screen has taken the bar away.
      {
        const b = await pg.locator('[data-testid=recording-return]').boundingBox();
        const touch = await c.newCDPSession(pg);
        const pt = [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }];
        for (let k = 0; k < 2; k++) {
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        }
      }
      await pg.waitForSelector('[data-testid=stop]');
      await pg.waitForTimeout(1500);
      const canvases = await pg.locator('canvas.maplibregl-canvas').count();
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await pg.waitForTimeout(800);
      check(canvases === 1 && !/\/walk/.test(new URL(pg.url()).pathname) && (await tabBarShown(pg)),
        `tabs audit 1: a double tap on the recording bar opens one walk screen, and one Minimize goes back to the tabs (${canvases} maps)`);

    });
    await step('tabs audit 2: a reminder tapped minimized', async () => {
      // tabs audit 2: a reminder tapped while the walk is minimized opens on the walk, though Chronicle,
      // read before the walk began, is still mounted under the tabs.
      const memAt = at(-0.5, -0.2);
      await pg.evaluate(({ lon, lat }) => new Promise((resolve, reject) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const tx = req.result.transaction(['capture'], 'readwrite');
          tx.objectStore('capture').put({ id: 'audit-old-note', walk_id: 'old-walk', t: Date.now() - 86_400_000, kind: 'text', file_path: null, body: 'Under the arch', segment_id: null, lat, lon });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }), { lon: memAt[0], lat: memAt[1] });
      const tap = { type: 'notice-response', id: 'recall-audit', data: { captureIds: ['audit-old-note'] }, action: null };
      await pg.evaluate((m) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: m })), tap);
      const onWalk = await pg.waitForURL(/\/walk/, { timeout: 10000 }).then(() => true, () => false);
      const viewers = onWalk ? await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => pg.locator('[data-testid=viewer-close]').count(), () => 0) : 0;
      check(onWalk && viewers === 1, `tabs audit 2: a reminder tapped with the walk minimized opens on the walk, once (${pg.url()}, ${viewers} viewer)`);
      // The walk's viewer offers Open in Maps for a capture with a place (NH6).
      if (viewers) {
        await pg.click('[data-testid=viewer-more]');
        check((await pg.locator('[data-testid=viewer-handoff]').count()) === 1, 'the walk’s viewer has Open in Maps in its More menu (NH6)');
        // The menu's backdrop covers the screen: a tap beside the menu closes it.
        await pg.mouse.click(20, 420);
        await pg.waitForSelector('[data-testid=viewer-menu]', { state: 'detached', timeout: 5000 });
      }
      await pg.click('[data-testid=viewer-close]');
      await pg.waitForTimeout(400);

    });
    await step('tabs audit U2: the live view', async () => {
      // tabs audit U2: Navigate with a walk minimized is a live view of the walk.
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await pg.click('[data-testid=tab-navigate]');
      await pg.waitForTimeout(1200);
      const watches0 = await pg.evaluate(() => window.__watchCalls);
      await pg.click('[data-testid=tab-chronicle]');
      await pg.waitForTimeout(500);
      await pg.click('[data-testid=tab-navigate]');
      await pg.waitForTimeout(1500);
      check((await pg.evaluate(() => window.__watchCalls)) === watches0, 'tabs audit U2: Navigate reads no fix of its own while a walk is open (the recorder already watches)');
      check((await shownCount(pg, '[data-testid=start]')) === 0 && (await shownCount(pg, '[data-testid=resume]')) === 0 && (await shownCount(pg, '[data-testid=recording-bar]')) === 1,
        'tabs audit U2: with a walk open, Navigate has no Start and no second Return button: the recording bar is the way back');
      // No drawer with a walk minimized (the owner, Nov 3): no "Your walk is recording" line, no settings,
      // and the capture row sits low on the map. The bar is the walk's strip.
      {
        const drawers = await shownCount(pg, '[data-testid=navigate-drawer]');
        const line = await shownCount(pg, '[data-testid=peek-choices]');
        const recording = await pg.evaluate(() => [...document.querySelectorAll('div')].filter((e) => !e.closest('[aria-hidden=true]') && e.childElementCount === 0 && /Your walk is recording/.test(e.textContent ?? '')).length);
        const row = await pg.locator('[data-testid=moment-photo]').filter({ visible: true }).first().boundingBox();
        const bar = await pg.locator('[data-testid=recording-bar]').boundingBox();
        check(drawers === 0 && line === 0 && recording === 0 && row && bar && bar.y - (row.y + row.height) < 40,
          `tabs audit U2: with a walk minimized, Navigate has no drawer and no "Your walk is recording"; the capture row sits just above the bar (drawer ${drawers}, line ${line}, text ${recording}, gap ${row && bar ? Math.round(bar.y - (row.y + row.height)) : '?'} px)`);
      }
      // And the walk comes back from the bar, then minimizes again.
      {
        await pg.click('[data-testid=recording-return]');
        const back = await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 5000 }).then(() => true, () => false);
        check(back, `tabs audit U2: the recording bar brings the walk back (${pg.url()})`);
        if (back) {
          await pg.waitForSelector('[data-testid=walk-minimize]', { timeout: 10000 });
          await pg.click('[data-testid=walk-minimize]');
          await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
          await pg.waitForTimeout(800);
        }
      }
    });
    await step('tabs audit U7: Chronicle while minimized', async () => {
      await pg.click('[data-testid=tab-chronicle]');
      await pg.waitForSelector('[data-testid=home-sheet]');
      await pg.waitForTimeout(1000);
      await emptyPeek('with a walk minimized and none finished');
    });
    await step('tabs audit U2: following the walk', async () => {
      // The walk goes on; Navigate follows it: the trace, the walker, the capture row for the walk.
      const perfA = { at: Date.now(), ...(await pg.evaluate(() => ({ ...window.__perf }))) };
      await north(-0.25, 0.25);
      await pg.waitForTimeout(2200);
      {
        const b = await pg.evaluate(() => ({ ...window.__perf }));
        const secs = (Date.now() - perfA.at) / 1000;
        const rate = (k) => ((b[k] ?? 0) - (perfA[k] ?? 0)) / secs;
        check(rate('render:navigate') <= 0.2 && rate('render:navigate-walk') <= 1.0 && rate('render:map') <= 1.5 && rate('render:walk') === 0,
          `tabs audit U2: on Navigate, only the live view follows the walk (navigate ${rate('render:navigate').toFixed(2)}/s, live view ${rate('render:navigate-walk').toFixed(2)}/s, map ${rate('render:map').toFixed(2)}/s over ${secs.toFixed(0)} s)`);
      }
      {
        const last = at(-0.5, 0.25);
        const end = ((await pg.locator('[data-trace-end]').last().getAttribute('data-trace-end')) || '0,0').split(',').map(Number);
        const off = Math.hypot((end[0] - last[0]) / dLon, (end[1] - last[1]) / dLat) * 100;
        check(off < 20 && (await pg.locator('[data-testid=walker-puck]').evaluateAll((els) => els.filter((e) => e.style.display !== 'none').length)) === 1 && (await pg.locator('canvas.maplibregl-canvas').count()) === 1,
          `tabs audit U2: Navigate shows the walk's growing trace and the walker, on one live map (${off.toFixed(0)} m off)`);
      }
    });
    await step('tabs audit U2: the capture row for the walk', async () => {
      // The capture row keeps a note for the open walk, shown on Navigate's map, and once on Return.
      await pg.click('[data-testid=moment-note]');
      await pg.fill('[data-testid=moment-note-input]', 'A blue door');
      await pg.click('[data-testid=moment-note-save]');
      const said = await pg.waitForSelector('[data-testid=moment-toast]', { timeout: 10000 }).then((e) => e.innerText(), () => '');
      await pg.waitForTimeout(800);
      const notes = (await rows(pg, 'text')).filter((x) => x.walk_id === w.id);
      const pinned = await shownCount(pg, '[aria-label="Note"]');
      check(said === 'Note saved to your walk' && notes.length === 1 && pinned === 1,
        `tabs audit U2: Navigate's capture row keeps a note for the open walk, pinned on its map ("${said}", ${notes.length} kept, ${pinned} pinned)`);
      await pg.click('[data-testid=recording-return]');
      await pg.waitForSelector('[data-testid=stop]');
      await pg.waitForTimeout(1500);
      check((await pg.locator('[aria-label="Note. Open"]').count()) === 1, 'tabs audit U2: back on the walk, the note from Navigate is pinned once, not lost or doubled');
    });
    await step('tabs audit U11: the options icon', async () => {
      // tabs audit U11: the walk options button draws one icon, quiet or exploring.
      const icon = () => pg.locator('[data-testid=walk-options]').innerText();
      const quiet = await icon();
      await pg.click('[data-testid=walk-options]');
      await pg.waitForSelector('[data-testid=options-card]');
      await pg.click('[data-testid=explore-walk]');
      await pg.waitForTimeout(600);
      const exploring = await icon();
      const on = await pg.locator('[data-testid=explore-walk] input').isChecked().catch(() => null);
      await pg.click('[data-testid=explore-walk]');
      await pg.waitForTimeout(400);
      await pg.click('[data-testid=walk-options]');
      await pg.waitForTimeout(400);
      check(on === true && quiet === exploring && quiet === glyph('options-outline'),
        `tabs audit U11: the walk options button keeps one icon whatever the mode (${iconOf(quiet)}, ${iconOf(exploring)})`);
    });
    await step('tabs audit U10: the bar when paused', async () => {
      // tabs audit U10: paused, the bar shows a pause glyph; its way back doesn't read as "expand".
      await pg.click('[data-testid=pause-walk]');
      await pg.waitForSelector('[data-testid=resume-walk]', { timeout: 10000 });
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await pg.waitForTimeout(600);
      const pausedGlyph = await pg.locator('[data-testid=recording-bar] [data-testid=recording-paused]').innerText().catch(() => '');
      const go = await pg.locator('[data-testid=recording-bar] [data-testid=recording-go]').innerText().catch(() => '');
      const all = await pg.locator('[data-testid=recording-return]').innerText();
      check(pausedGlyph === glyph('pause'), `tabs audit U10: paused, the recording bar shows a pause glyph, not only a grey dot (${iconOf(pausedGlyph)})`);
      check(go && go !== glyph('chevron-up') && !all.includes(glyph('chevron-up')) && (await pg.locator('[data-testid=recording-return]').count()) === 1,
        `tabs audit U10: the bar's way back to the walk isn't an expand chevron (${iconOf(go)})`);
      await pg.click('[data-testid=recording-return]');
      await pg.waitForSelector('[data-testid=resume-walk]', { timeout: 10000 });
      await pg.click('[data-testid=resume-walk]');
      await pg.waitForSelector('[data-testid=pause-walk]', { timeout: 10000 });
      await pg.waitForTimeout(600);
    });
    const holdStop = async () => {
      const b = await pg.locator('[data-testid=stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      await pg.waitForURL(/replay/, { timeout: 30000 });
      await pg.waitForSelector('[data-testid=skip]', { timeout: 30000 });
      await pg.click('[data-testid=skip]');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await pg.waitForTimeout(800);
    };
    const walkRow = (id) => pg.evaluate((wid) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('walk', 'readonly').objectStore('walk').get(wid);
        g.onsuccess = () => resolve(g.result ?? null);
      };
    }), id);
    await step('tabs audit U13, U14, audit 6: the first replay', async () => {
      await north(0.3, 0.5);
      await holdStop();
      // tabs audit U13: no big orange count on the card; new streets are a clause in its line.
      const loud = await pg.evaluate(() => [...document.querySelectorAll('div, span')]
        .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const hit = r.width && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return hit && (hit === e || e.contains(hit));
        })
        .filter((e) => { const cs = getComputedStyle(e); return parseFloat(cs.fontSize) >= 28 || cs.color === 'rgb(194, 65, 12)'; })
        .map((e) => e.textContent.trim()));
      const cardText = (await pg.locator('body').innerText()).replace(/\s+/g, ' ');
      check(loud.length === 0 && !/\b\d+ new streets?\b/.test(cardText), `tabs audit U13: the card has no large accent number (${JSON.stringify(loud)})`);
      // tabs audit U14: a quiet Not now beside naming.
      const notNow = await pg.locator('[data-testid=not-now]').count();
      const notNowBg = notNow ? await pg.locator('[data-testid=not-now]').evaluate((e) => getComputedStyle(e).backgroundColor) : '';
      check(notNow === 1 && (await pg.locator('[data-testid=not-now]').innerText()) === 'Not now' && notNowBg !== 'rgb(194, 65, 12)' && (await pg.locator('[data-testid=to-name]').count()) === 1,
        `tabs audit U14: the first replay's card has a quiet Not now, and Name it stays (${notNow}, ${notNowBg})`);
      // tabs audit audit 6: Back from the first replay goes to Chronicle, like Keep it (NV27).
      await pg.goBack();
      await pg.waitForURL((u) => u.pathname === `${BASE}/chronicle`, { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const path = new URL(pg.url()).pathname;
      check(path === `${BASE}/chronicle` && (await pg.locator('[data-testid=to-name]').count()) === 0 && (await pg.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1,
        `tabs audit audit 6: Back from the first replay goes to Chronicle, not the tab the walk began on (${path})`);
      const row = await walkRow(w.id);
      check(row && !row.open && row.title == null, 'tabs audit audit 6: the walk is kept, unnamed');
      if (path !== `${BASE}/chronicle`) {
        await pg.goto(`${url}chronicle`);
        await pg.waitForSelector('[data-testid=home-sheet]');
      }
    });
    await step('tabs audit U8, U13, U15: Chronicle after a walk', async () => {
      await pg.waitForSelector('[data-testid=home-sheet]');
      await pg.waitForTimeout(2500);
      // tabs audit U15: a fit to one short walk stops around z15, not at street-sign zoom.
      const zoom = await pg.evaluate(() => Number(document.querySelector('[data-zoom]')?.getAttribute('data-zoom') ?? NaN));
      check(zoom > 10 && zoom <= 15.05, `tabs audit U15: Chronicle's fit to a single walk caps its zoom at z15 (z${zoom})`);
      // tabs audit U13: the peek has no "N walks · M places".
      const peekText = await pg.locator('[data-testid=sheet-drag]').innerText();
      check(!/\b\d+ (walk|walks|place|places)\b/.test(peekText), `tabs audit U13: Chronicle's peek carries no counts (${JSON.stringify(peekText)})`);
      // tabs audit U8: a Walks | Days switch in the header at every height.
      const both = async (size) => {
        const head = await pg.locator('[data-testid=sheet-drag]').boundingBox();
        const out = [];
        for (const id of ['sheet-walks', 'sheet-days']) {
          const b = await pg.locator(`[data-testid=${id}]`).boundingBox().catch(() => null);
          out.push(b && b.y >= head.y && b.y + b.height <= head.y + head.height + 1 ? 'ok' : `${id}:${b && Math.round(b.y)}`);
        }
        check(out.every((x) => x === 'ok'), `tabs audit U8: at ${size}, the sheet's header has the Walks | Days switch (${out.join(', ')})`);
      };
      await both('peek');
      await drawerTo(pg, 'half', 'sheet-drag');
      await both('half');
      const rowsText = (await pg.locator('[data-testid=walk-row]').allInnerTexts()).join(' | ');
      check(rowsText && !/new streets?/.test(rowsText), `tabs audit U13: the walks list doesn't count new streets (${rowsText.replace(/\s+/g, ' ')})`);
      await drawerTo(pg, 'full', 'sheet-drag');
      await both('full');
      if (await pg.locator('[data-testid=sheet-days]').count()) {
        await pg.click('[data-testid=sheet-days]');
        await pg.waitForTimeout(500);
        check((await pg.locator('[data-testid=day-row]').count()) >= 1 && (await pg.locator('[data-testid=sheet-walks]').count()) === 1,
          'tabs audit U8: the switch flips the open sheet between walks and days');
      }
      await drawerTo(pg, 'peek');
    });
    await step('tabs audit U14: Not now', async () => {
      // tabs audit U14: Not now keeps the walk unnamed and goes to Chronicle.
      await pg.click('[data-testid=tab-navigate]');
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(800);
      await pg.click('[data-testid=start]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      await pg.waitForSelector('[data-testid=stop]');
      const second = await openWalk(pg);
      await north(0.5, 0.6);
      await holdStop();
      await pg.click('[data-testid=not-now]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/chronicle`, { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(1000);
      const row = second && await walkRow(second.id);
      check(new URL(pg.url()).pathname === `${BASE}/chronicle` && (await pg.locator('[data-testid=home-sheet]').count()) === 1 && row && row.title == null && !row.open,
        `tabs audit U14: Not now goes to Chronicle and leaves the walk unnamed (${pg.url()}, ${row && row.title})`);
    });
    await c.close();
  };

  // Marks on a walk through an area read before (the owner, Nov 2): the Explore tab showed "?"
  // marks that an exploring walk passing them never drew. E2E_ONLY=marks runs it alone.
  const marksRepro = async () => {
    const { c, pg } = await freshPage('marks');
    await c.addInitScript(() => { window.__perf = {}; });
    const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key, value });
        tx.oncomplete = () => resolve(true);
      };
    }), [k, v]);
    const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const walkPast = async (label) => {
      const seen = [];
      for (let k = 0; k <= 23; k++) {
        const p = at(-0.5 + k * 0.05, -0.5);
        await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
        await pg.waitForTimeout(1000);
        if (k % 4 === 3 || k === 23) seen.push(`${k * 5}m:${JSON.stringify(await marksNow())}`);
      }
      console.log(`# ${label}: ${seen.join(' | ')}`);
      return marksNow();
    };
    const holdStop = async () => {
      const b = await pg.locator('[data-testid=stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      await pg.waitForURL(/replay/, { timeout: 30000 });
      await pg.waitForSelector('[data-testid=skip]', { timeout: 30000 });
      await pg.click('[data-testid=skip]');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await pg.waitForTimeout(800);
    };
    const startWalk = async () => {
      await pg.waitForSelector('[data-testid=start]');
      await pg.click('[data-testid=start]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
      const s0 = at(-0.5, -0.5);
      await c.setGeolocation({ longitude: s0[0], latitude: s0[1] + 0.000002, accuracy: 6 });
      await pg.waitForTimeout(2500);
    };
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    // First walk, explore from the start: it reads and builds Fox Point's checklist as it goes.
    await setMeta('start_mode', 'explore');
    await pg.reload();
    await startWalk();
    const first = await walkPast('first walk (area unread)');
    check(first.some((l) => /Hessian Memorial/.test(l)), `marks: a first exploring walk draws the memorial it passes (${JSON.stringify(first)})`);
    await holdStop();
    await pg.goto(navUrl);
    // Second walk through the same area, read before: the tab's "?" must show on the walk too.
    await startWalk();
    const second = await walkPast('second walk (area read before)');
    check(second.some((l) => /Hessian Memorial/.test(l)), `marks: a later exploring walk through an area read before draws the memorial it passes (${JSON.stringify(second)})`);
    await c.close();
  };

  // A reload with a walk minimized (the owner, Nov 2): after it, nothing responded, and a reload
  // didn't clear it. E2E_ONLY=reload runs it alone.
  const reloadMinimized = async () => {
    const { c, pg } = await freshPage('reload');
    const state = async (label) => {
      const s = await pg.evaluate(() => {
        const at = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); if (!b.width) return 'hidden'; const top = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return top?.closest(q) ? 'top' : `under:${top?.closest('[data-testid]')?.getAttribute('data-testid') ?? top?.tagName}`; };
        return { path: location.pathname, bar: at('[data-testid=recording-return]'), stop: at('[data-testid=stop]'), minimize: at('[data-testid=walk-minimize]'), tabNav: at('[data-testid=tab-navigate]'), drawer: document.querySelector('[data-testid=navigate-drawer]')?.getBoundingClientRect().height ?? null };
      });
      console.log(`# ${label}: ${JSON.stringify(s)}`);
      return s;
    };
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    for (let k = 0; k < 12; k++) {
      const p = at(-0.5 + k * 0.05, -0.5);
      await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    await state('walking');
    await pg.click('[data-testid=walk-minimize]');
    await pg.waitForSelector('[data-testid=recording-return]', { timeout: 10000 });
    await pg.waitForTimeout(800);
    await state('minimized');
    {
      // iOS cancels a tap's click when an element appears just after it (its content-change check):
      // a view that keeps inserting elements loses every tap. Count what the minimized view adds.
      await pg.evaluate(() => {
        window.__added = [];
        new MutationObserver((ms) => {
          for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) window.__added.push(`${n.tagName}.${(n.getAttribute('data-testid') || n.className || '').toString().slice(0, 40)}`);
        }).observe(document.body, { childList: true, subtree: true });
      });
      for (let k = 12; k < 22; k++) {
        const p = at(-0.5 + k * 0.05, -0.5);
        await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
        await pg.waitForTimeout(1000);
      }
      const added = await pg.evaluate(() => window.__added);
      const by = {};
      for (const a of added) by[a] = (by[a] || 0) + 1;
      console.log(`# added in 10 s minimized: ${added.length} ${JSON.stringify(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8))}`);
    }
    {
      // The browser's own Back while the walk screen is up (a swipe, or history), then the bar.
      await pg.click('[data-testid=recording-return]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 10000 });
      await pg.waitForTimeout(1500);
      await pg.goBack().catch(() => {});
      await pg.waitForTimeout(1500);
      const s1 = await state('after the browser back');
      if (s1.bar === 'top') {
        await pg.click('[data-testid=recording-return]');
        await pg.waitForTimeout(2500);
      }
      const s2 = await state('after the browser back, tapped the bar');
      check(s2.path === `${BASE}/walk` && s2.stop === 'top', `reload: after the browser's Back, the walk is in front or one tap away (${JSON.stringify(s1)} → ${JSON.stringify(s2)})`);
      if (s2.minimize === 'top') {
        await pg.click('[data-testid=walk-minimize]');
        await pg.waitForTimeout(1500);
      }
    }
    for (let r = 1; r <= 2; r++) {
      await pg.reload();
      await pg.waitForTimeout(5000);
      const s = await state(`reload ${r}`);
      const ok = (s.path === `${BASE}/walk` && s.stop === 'top') || s.bar === 'top';
      check(ok, `reload: with a walk minimized, reload ${r} leaves the walk or its bar in front and tappable (${JSON.stringify(s)})`);
      if (s.path === `${BASE}/walk` && s.minimize === 'top') {
        await pg.click('[data-testid=walk-minimize]');
        await pg.waitForTimeout(1500);
        const m = await state(`reload ${r}, minimized`);
        check(m.bar === 'top', `reload: minimizing after reload ${r} shows the bar in front (${JSON.stringify(m)})`);
        if (m.bar === 'top') {
          await pg.click('[data-testid=recording-return]');
          await pg.waitForTimeout(1500);
          const b = await state(`reload ${r}, back`);
          check(b.path === `${BASE}/walk` && b.stop === 'top', `reload: the bar brings the walk back after reload ${r} (${JSON.stringify(b)})`);
          await pg.click('[data-testid=walk-minimize]').catch(() => {});
          await pg.waitForTimeout(1500);
        }
      }
    }
    {
      // A way out from the bar itself (the owner, Nov 2: stuck minimized, with no way to stop).
      // A tap explains; a hold stops the walk and opens its replay.
      await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 10000 });
      await pg.click('[data-testid=bar-stop]');
      await pg.waitForTimeout(400);
      const said = await pg.locator('[data-testid=recording-said]').innerText().catch(() => '');
      check(said === 'Hold to stop the walk' && new URL(pg.url()).pathname === `${BASE}/navigate`, `bar stop: a tap only says to hold ("${said}")`);
      const b = await pg.locator('[data-testid=bar-stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      const toReplay = await pg.waitForURL(/replay/, { timeout: 30000 }).then(() => true, () => false);
      const w = await openWalk(pg);
      check(toReplay && w == null, `bar stop: a hold on the bar's Stop ends the walk and opens its replay (${pg.url()}, open: ${w && w.id})`);
    }
    await c.close();
  };

  // Filling gaps (G5, G6, G9, G10, G12): a walk whose GPS was out twice, written into storage
  // with past times (a real gap would take minutes), then reloaded. Along Thayer Street, with
  // nowhere else to have been, the gap fills by itself; along Transit Street in a grid, slowly,
  // it is offered faint until kept. E2E_ONLY=gaps runs it alone.
  const gapsScenario = async () => {
    const { c, pg } = await freshPage('gaps');
    await c.addInitScript(() => { window.__perf = {}; });
    const here = at(3.0, -0.5);
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    for (let k = 0; k < 3; k++) {
      await c.setGeolocation({ longitude: here[0], latitude: here[1] + k * 0.000001, accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    for (let k = 0; k < 15 && !(await metaOf(pg, 'tile_url')); k++) await pg.waitForTimeout(1000);
    const walk = await openWalk(pg);
    const now = Date.now();
    const min = 60_000;
    // Fixes along a line at 1.4 m/s, one every 5 s, from t0.
    const along = (from, to, t0) => {
      const pts = [];
      const d = Math.hypot((to[0] - from[0]) * 100, (to[1] - from[1]) * 100);
      const n = Math.max(1, Math.round(d / 7));
      for (let k = 0; k <= n; k++) {
        const p = at(from[0] + ((to[0] - from[0]) * k) / n, from[1] + ((to[1] - from[1]) * k) / n);
        pts.push({ walk_id: walk.id, t: t0 + k * 5000, lon: p[0], lat: p[1], accuracy_m: 6, speed: 1.4, course: null });
      }
      return pts;
    };
    const points = [
      // Thayer Street north, then 5 min out over 400 m, then on: nowhere else to have been (G5).
      ...along([11, -2.9], [11, -1.9], now - 70 * min),
      ...along([11, 2.1], [11, 2.9], now - 63 * min),
      // 35 min later: Transit Street east, then 10 min out over 340 m, time to go round a block (G6).
      ...along([-1.9, -0.5], [-1.2, -0.5], now - 27 * min),
      ...along([2.2, -0.5], [3.0, -0.5], now - 16 * min),
    ];
    await pg.evaluate(([id, startedAt, pts]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['walk', 'trace_point'], 'readwrite');
        const w = tx.objectStore('walk').get(id);
        w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
        for (const p of pts) tx.objectStore('trace_point').add(p);
        tx.oncomplete = () => resolve(true);
      };
    }), [walk.id, now - 70 * min - 1000, points]);
    await pg.reload();
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    const mapState = () => pg.locator('[data-faint]').last().evaluate((e) => ({ runs: Number(e.dataset.runs), faint: Number(e.dataset.faint), links: Number(e.dataset.gaplinks ?? -1), drawing: Number(e.dataset.drawing ?? -1), center: e.dataset.center ?? '' }));
    let st = await mapState();
    for (let k = 0; k < 20 && !(st.faint === 1 && st.runs === 3); k++) {
      await pg.waitForTimeout(1000);
      st = await mapState();
    }
    // Without filling there would be five lines (Thayer's two halves, Transit's two, and the fixes
    // here now, 15 min after the last). Thayer's gap joins its line, the 15 min standing here is
    // joined straight (every break is a gap, Nov 3), and Transit's is faint.
    check(st.runs === 3, `gaps: a gap along a street with nowhere else to go fills by itself, one line (G5: ${JSON.stringify(st)})`);
    check(st.faint === 1, `gaps: a gap with time to go round a block is offered faint (G6: ${JSON.stringify(st)})`);
    const km = (t) => { const m = /([\d.]+) (k?m)\b/.exec(t); return m ? Number(m[1]) * (m[2] === 'km' ? 1000 : 1) : NaN; };
    const before = km(await pg.locator('[data-testid=walk-stats]').innerText());
    // A tap on the faint stretch opens its card (G9).
    await pg.waitForFunction(() => typeof window.__project === 'function');
    const tap = async (p) => {
      const [x, y] = await pg.evaluate((q) => window.__project(q), p);
      await pg.mouse.click(x, y);
      await pg.waitForTimeout(900);
    };
    // Away from the line's ends, which are the recorded trace's (audit 8).
    await tap(at(1.6, -0.5));
    const title = await pg.locator('[data-testid=gap-title]').innerText().catch(() => '');
    check(title === 'Probably along Transit Street' && (await pg.locator('[data-testid=gap-keep]').count()) === 1,
      `gaps: tapping the faint stretch opens its card, with Keep (G9: "${title}")`);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(400);
    check((await pg.locator('[data-testid=gap-card]').count()) === 0, 'gaps: Escape closes the card (G9)');
    // Another card in the slot closes it for good, rather than hiding it to come back (gaps audit 7).
    await tap(at(1.6, -0.5));
    await pg.click('[data-testid=walk-options]');
    await pg.waitForTimeout(400);
    const underOptions = await pg.locator('[data-testid=gap-card]').count();
    await pg.click('[data-testid=walk-options]');
    await pg.waitForTimeout(400);
    check(underOptions === 0 && (await pg.locator('[data-testid=gap-card]').count()) === 0, `gaps audit 7: the walk's options close the stretch's card, and it doesn't come back (${underOptions})`);
    // Drawing on the walk screen (GW1, GW8): the card offers Draw my way; drawing hides the capture
    // row and stops following, so a new fix doesn't move the map; Cancel leaves the gap as it was.
    await tap(at(1.6, -0.5));
    check((await pg.locator('[data-testid=gap-draw]').count()) === 1, 'GW1: an offered stretch\'s card has Draw my way');
    await pg.click('[data-testid=gap-draw]').catch(() => {});
    await pg.waitForSelector('[data-testid=gap-draw-bar]', { timeout: 5000 }).catch(() => {});
    const centerBefore = (await mapState()).center;
    await c.setGeolocation({ longitude: here[0] + 0.0004, latitude: here[1], accuracy: 6 });
    await pg.waitForTimeout(2500);
    const drawingNow = await mapState();
    check((await pg.locator('[data-testid=gap-draw-bar]').count()) === 1 && !(await pg.locator('[data-testid=cap-photo]').isVisible().catch(() => false)) && drawingNow.center === centerBefore,
      `GW8: drawing on the walk screen hides the capture row and a new fix doesn't move the map (${centerBefore} → ${drawingNow.center})`);
    await pg.click('[data-testid=gap-draw-cancel]').catch(() => {});
    await pg.waitForTimeout(600);
    const afterCancel = await mapState();
    check((await pg.locator('[data-testid=gap-draw-bar]').count()) === 0 && afterCancel.faint === 1 && afterCancel.drawing === 0, `GW4: Cancel leaves the gap as it was (${JSON.stringify(afterCancel)})`);
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    await pg.waitForTimeout(1500);
    await tap(at(1.6, -0.5));
    await pg.click('[data-testid=gap-keep]');
    for (let k = 0; k < 10 && (st = await mapState()).runs !== 2; k++) await pg.waitForTimeout(500);
    await pg.waitForTimeout(2500);
    const after = km(await pg.locator('[data-testid=walk-stats]').innerText());
    check(st.runs === 2 && st.faint === 0, `gaps: Keep draws it solid, joined to the trace (G10: ${JSON.stringify(st)})`);
    check(after - before > 250 && after - before < 450, `gaps: a kept stretch counts as walked distance (G11: ${before} m → ${after} m)`);
    const rows = () => pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('gap_fill', 'readonly').objectStore('gap_fill').getAll();
        g.onsuccess = () => resolve(g.result.map((r) => `${r.state}:${r.street}`));
      };
    }));
    check(JSON.stringify(await rows()) === '["kept:Transit Street"]', `gaps: Keep is stored with the walk (G10: ${JSON.stringify(await rows())})`);
    // On the replay, the filled stretch along Thayer has its own card; Not this way breaks the line again (G9, G10, G12).
    const b = await pg.locator('[data-testid=stop]').boundingBox();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1100);
    await pg.mouse.up();
    await pg.waitForURL(/replay/, { timeout: 30000 });
    await pg.waitForSelector('[data-testid=skip]', { timeout: 60000 });
    await pg.click('[data-testid=skip]');
    await pg.waitForSelector('[data-testid=to-name], [data-testid=done]', { timeout: 30000 });
    await pg.waitForTimeout(1500);
    const firstCard = await mapState();
    // A later session: nothing inferred is remembered, and the filled stretch must still be there (gaps audit 2).
    await pg.reload();
    await pg.waitForSelector('[data-testid=skip], [data-testid=to-name], [data-testid=done]', { timeout: 60000 });
    if (await pg.locator('[data-testid=skip]').count()) await pg.click('[data-testid=skip]');
    await pg.waitForSelector('[data-testid=to-name], [data-testid=done]', { timeout: 30000 });
    let onCard = await mapState();
    for (let k = 0; k < 20 && onCard.runs !== firstCard.runs; k++) {
      await pg.waitForTimeout(500);
      onCard = await mapState();
    }
    check(onCard.runs === firstCard.runs, `gaps audit 2: after a reload, the replay still fills its gaps (${firstCard.runs} → ${onCard.runs})`);
    await pg.waitForFunction(() => typeof window.__project === 'function');
    check(onCard.faint === 0, `gaps: the replay draws no faint stretch once kept (${JSON.stringify(onCard)})`);
    await tap(at(11, 0.6));
    const filled = await pg.locator('[data-testid=gap-title]').innerText().catch(() => '');
    check(filled === 'Filled in along Thayer Street' && (await pg.locator('[data-testid=gap-keep]').count()) === 0,
      `gaps: on the replay, a stretch filled by itself has a card with Not this way only (G9, G12: "${filled}")`);
    if (filled) {
      await pg.click('[data-testid=gap-dismiss]');
      let r = await mapState();
      for (let k = 0; k < 30 && r.runs <= onCard.runs; k++) {
        await pg.waitForTimeout(500);
        r = await mapState();
      }
      check(r.runs === onCard.runs + 1, `gaps: Not this way breaks the line again on the replay (G10, G12: ${onCard.runs} → ${r.runs})`);
      const stored = await rows();
      check(stored.includes('dismissed:Thayer Street'), `gaps: Not this way is stored too (G10: ${JSON.stringify(stored)})`);
      // A dismissed gap is joined by a dotted line; tapping it opens its card, and its way can be drawn (GW1-GW5, GW7).
      let dotted = await mapState();
      for (let k = 0; k < 10 && dotted.links !== 1; k++) {
        await pg.waitForTimeout(500);
        dotted = await mapState();
      }
      check(dotted.links === 1, `GW2: a dismissed gap is joined by a dotted line (${JSON.stringify(dotted)})`);
      await tap(at(11, 0.6));
      const empty = await pg.locator('[data-testid=gap-title]').innerText().catch(() => '');
      check(/^Not recorded for \d+ min$/.test(empty) && (await pg.locator('[data-testid=gap-draw]').count()) === 1 && (await pg.locator('[data-testid=gap-keep]').count()) === 0,
        `GW1, GW2: tapping the dotted line opens its card, with Draw my way ("${empty}")`);
      // Paths slow to come: Done waits for them, and says so (gap-drawing audit 4).
      tileDelayMs = 4000;
      await pg.click('[data-testid=gap-draw]').catch(() => {});
      await pg.waitForSelector('[data-testid=gap-draw-bar]', { timeout: 5000 }).catch(() => {});
      const waiting = await pg.locator('[data-testid=gap-draw-bar]').innerText().catch(() => '');
      const doneOff = await pg.locator('[data-testid=gap-draw-done]').evaluate((e) => e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('disabled')).catch(() => false);
      check(/Reading the paths/.test(waiting) && doneOff, `gap-drawing audit 4: Done waits for the paths ("${waiting.replace(/\n/g, ' · ')}", disabled ${doneOff})`);
      tileDelayMs = 0;
      await pg.waitForFunction(() => !/Reading the paths/.test(document.querySelector('[data-testid=gap-draw-bar]')?.innerText ?? ''), null, { timeout: 15000 }).catch(() => {});
      await pg.waitForTimeout(500);
      const startPts = (await mapState()).drawing;
      // Two taps along Thayer Street; Undo takes the second away; tap it again.
      await tap(at(11, -0.8));
      await tap(at(11, 1.2));
      const two = (await mapState()).drawing;
      await pg.click('[data-testid=gap-draw-undo]').catch(() => {});
      await pg.waitForTimeout(500);
      const undone = (await mapState()).drawing;
      check(startPts >= 1 && two > undone && undone > startPts, `GW3, GW4: taps grow the line along the street, and Undo takes the last away (${startPts} → ${two} → ${undone} points)`);
      await tap(at(11, 1.2));
      const barText = await pg.locator('[data-testid=gap-draw-bar]').innerText().catch(() => '');
      check(!/couldn.t be read/i.test(barText), `GW7: the paths around the taps were read ("${barText.replace(/\n/g, ' · ')}")`);
      await pg.click('[data-testid=gap-draw-done]').catch(() => {});
      let drawn = await mapState();
      for (let k = 0; k < 30 && drawn.runs !== onCard.runs; k++) {
        await pg.waitForTimeout(500);
        drawn = await mapState();
      }
      const keptNow = await rows();
      check(drawn.runs === onCard.runs && drawn.links === 0 && drawn.drawing === 0 && keptNow.filter((x) => x.startsWith('kept')).length === 2,
        `GW5: Done keeps the drawn way: one line again, no dotted join (${JSON.stringify(drawn)}, ${JSON.stringify(keptNow)})`);
    }
    await c.close();
  };

  // Quality of life: map staples (QL1-QL12, the owner's spec, Nov 3): Locate, the scale bar and the
  // trace's end markers, read through the map's data attributes. E2E_ONLY=qol runs it alone.
  const qolScenario = async () => {
    const { c, pg } = await freshPage('qol');
    await c.addInitScript(() => {
      window.__perf = {};
      // Location watches begun and cleared, and the ids still open: Locate's fix is a one-off (QL12).
      const g = navigator.geolocation;
      const watch = g.watchPosition.bind(g);
      const clear = g.clearWatch.bind(g);
      window.__watchCalls = 0;
      window.__clearCalls = 0;
      window.__openWatches = new Set();
      g.watchPosition = (...a) => { window.__watchCalls++; const id = watch(...a); window.__openWatches.add(id); return id; };
      g.clearWatch = (id) => { window.__clearCalls++; window.__openWatches.delete(id); return clear(id); };
    });
    const fix = (p) => c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    const lonLat = (s) => (s ? s.split(',').map(Number) : null);
    const fmt = (p) => (p ? p.map((v) => v.toFixed(5)).join(',') : String(p));
    const mAway = (a, b) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((b[1] * Math.PI) / 180), (a[1] - b[1]) * 111320);
    const mpp = (zoom, lat) => (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
    // The next round length up (1, 2, 5 × a power of ten).
    const nextRound = (m) => { const d = Number(String(m)[0]); return d === 1 ? m * 2 : d === 2 ? m * 2.5 : m * 2; };
    // Elements on the screen in front: JS tabs keep the others mounted beneath it, aria-hidden (the bar is aria-hidden itself).
    const shown = (testid) => pg.locator(`xpath=//*[@data-testid="${testid}"][not(ancestor::*[@aria-hidden="true"])]`);
    // The bar's line sits inside the bar, which is aria-hidden itself (QL8): only other hidden ancestors count.
    const scaleLine = () => pg.locator('xpath=//*[@data-testid="scale-line"][not(ancestor::*[@aria-hidden="true" and not(@data-testid="scale-bar")])]');
    // The live map's container attributes (data-zoom, data-center, data-walker, data-ends).
    const attr = (name) => pg.evaluate((n) => {
      const els = [...document.querySelectorAll('[data-zoom]')].filter((e) => !e.closest('[aria-hidden=true]'));
      const el = els[els.length - 1];
      return el ? el.getAttribute(n) : null;
    }, name);
    // The scale bar as drawn (QL5-QL7): its metres, label, the line's measured width and the width those
    // metres take at the map's zoom and the view's latitude.
    const scaleBar = async () => {
      const bar = shown('scale-bar').last();
      if (!(await bar.count())) return null;
      const m = Number(await bar.getAttribute('data-m'));
      const hidden = await bar.getAttribute('aria-hidden');
      const label = (await bar.innerText()).trim();
      const line = await scaleLine().last().boundingBox();
      const box = await bar.boundingBox();
      const zoom = Number(await attr('data-zoom'));
      const center = lonLat(await attr('data-center'));
      const px = center ? mpp(zoom, center[1]) : NaN;
      return { m, hidden, label, width: line ? line.width : 0, want: m / px, next: nextRound(m) / px, box, zoom };
    };
    const describe = (s) => (s ? `${s.m} m "${s.label}", ${s.width.toFixed(1)} px for ${s.want.toFixed(1)} at z${s.zoom.toFixed(2)}` : 'no scale bar');
    const fits = (s) => !!s && s.width > 0 && s.width <= 100.5 && Math.abs(s.width - s.want) <= s.want * 0.05;
    const round = (s) => !!s && /^(1|2|5)0*$/.test(String(s.m)) && s.label === (s.m >= 1000 ? `${s.m / 1000} km` : `${s.m} m`);
    // Two zoom levels out: the map's keyboard handler, then the wheel if it didn't take.
    const zoomOutBy = async (levels) => {
      const z0 = Number(await attr('data-zoom'));
      const canvas = pg.locator('canvas.maplibregl-canvas').last();
      await canvas.focus();
      for (let i = 0; i < levels; i++) {
        await pg.keyboard.press('-');
        await pg.waitForTimeout(500);
      }
      const box = await canvas.boundingBox();
      await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
      for (let i = 0; i < 12 && Number(await attr('data-zoom')) > z0 - levels; i++) {
        await pg.mouse.wheel(0, 400);
        await pg.waitForTimeout(400);
      }
      await pg.waitForTimeout(700);
      return [z0, Number(await attr('data-zoom'))];
    };
    const holdStop = async () => {
      const b = await pg.locator('[data-testid=stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      await pg.waitForURL(/replay/, { timeout: 30000 });
      await pg.waitForSelector('[data-testid=skip]', { timeout: 30000 });
      await pg.click('[data-testid=skip]');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await pg.waitForTimeout(800);
    };

    // Navigate: Locate from 1 km away.
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.waitForTimeout(1500);
    const far = at(10, 0);
    await fix(far);
    const locate = shown('locate');
    const lb = (await locate.count()) ? await locate.first().boundingBox() : null;
    const locateLabel = (await locate.count()) ? await locate.first().getAttribute('aria-label') : null;
    check((await locate.count()) === 1 && lb && lb.width >= 44 && lb.height >= 44 && locateLabel === 'Center on your position',
      `qol QL9: Navigate shows one 44 pt Locate button labelled "Center on your position" (${await locate.count()}, ${lb && `${lb.width}×${lb.height}`}, ${JSON.stringify(locateLabel)})`);
    // The busy state can be over in a frame with a mocked fix, so every change to the button is recorded as it happens.
    await pg.evaluate(() => {
      window.__locateBusy = [];
      new MutationObserver((records) => {
        for (const r of records) {
          const node = r.target.nodeType === 1 ? r.target : r.target.parentElement;
          const el = node && node.closest('[data-testid=locate]');
          if (!el) continue;
          if (r.type === 'childList') window.__locateBusy.push('content');
          else if (el.matches(':disabled, [aria-disabled=true], [aria-busy=true]')) window.__locateBusy.push(`${r.attributeName}=${el.getAttribute(r.attributeName)}`);
        }
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled', 'aria-busy'] });
    });
    const watches0 = await pg.evaluate(() => window.__watchCalls);
    await locate.first().click();
    const busyNow = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=locate]')].some((el) => !el.closest('[aria-hidden=true]') && el.matches(':disabled, [aria-disabled=true], [aria-busy=true]')));
    await pg.waitForTimeout(200);
    const busySeen = await pg.evaluate(() => window.__locateBusy);
    check(busyNow || busySeen.length > 0, `qol QL11: Locate shows busy while the fix is read (now: ${busyNow}, seen: ${JSON.stringify(busySeen.slice(0, 4))})`);
    await pg.waitForTimeout(2000);
    {
      const center = lonLat(await attr('data-center'));
      const walker = lonLat(await attr('data-walker'));
      const zoom = Number(await attr('data-zoom'));
      const off = center ? mAway(center, far) : NaN;
      // The fit centres the fix in the view above the drawer, so the canvas's own middle sits a little
      // south of it: inside the 250 m the fit frames is the test, not the exact middle.
      check(center && off < 250, `qol QL10: Navigate's Locate frames the map around the fix 1 km away (canvas middle ${off.toFixed(1)} m off at ${fmt(center)}, z${zoom})`);
      check(zoom >= 13 && zoom <= 17.5, `qol QL10: Locate fits about 250 m around the fix (z${zoom})`);
      check(walker && mAway(walker, far) < 5, `qol QL10: the dot is drawn at the fix (data-walker ${fmt(walker)}, ${walker ? mAway(walker, far).toFixed(1) : '-'} m off)`);
      const w = await pg.evaluate(() => ({ watches: window.__watchCalls, clears: window.__clearCalls, open: [...window.__openWatches] }));
      check(w.watches > watches0 && w.open.length === 0 && w.clears >= w.watches,
        `qol QL12: every watch the tap began is cleared once the fix is read (${w.watches} watches, ${w.clears} clears, open: ${JSON.stringify(w.open)})`);
    }
    await shot(pg, 'qol-01-navigate-located');

    // Units (QL13-QL16): the dialog's Distances segment, defaulting from the locale, switches the scale
    // bar to feet or miles and back. The dialog is closed before each read, so the bar is the one in front.
    {
      // The region the app's default reads (the harness reports en-CA unless E2E_MILES=1).
      const lang = await pg.evaluate(() => Intl.DateTimeFormat().resolvedOptions().locale);
      const wantMi = /-(US|GB|LR|MM)$/i.test(lang);
      await drawerTo(pg, 'full');
      const km = pg.locator('[data-testid=units-km]');
      const mi = pg.locator('[data-testid=units-mi]');
      const kmOn = (await km.getAttribute('aria-checked')) === 'true';
      const miOn = (await mi.getAttribute('aria-checked')) === 'true';
      check((await km.count()) === 1 && (await mi.count()) === 1 && (await km.getAttribute('role')) === 'radio' && (wantMi ? miOn && !kmOn : kmOn && !miOn),
        `qol QL13, QL16: the dialog has a Distances segment, defaulting from the locale (${lang}: km ${kmOn}, mi ${miOn})`);
      const other = wantMi ? km : mi;
      const back = wantMi ? mi : km;
      await other.click();
      await pg.waitForTimeout(300);
      await drawerTo(pg, 'peek');
      const sw = await scaleBar();
      const unitOf = (label) => (label.match(/ (m|km|ft|mi)$/) || [])[1];
      const swUnit = sw && unitOf(sw.label);
      check(sw && sw.m > 0 && (wantMi ? /^(m|km)$/ : /^(ft|mi)$/).test(swUnit || '') && fits(sw),
        `qol QL14, QL15: switched, the scale bar reads in ${wantMi ? 'metres' : 'feet or miles'} and still fits (${describe(sw)})`);
      await drawerTo(pg, 'full');
      await back.click();
      await pg.waitForTimeout(300);
      await drawerTo(pg, 'peek');
      const sb = await scaleBar();
      check(sb && (wantMi ? /^(ft|mi)$/ : /^(m|km)$/).test(unitOf(sb.label) || ''), `qol QL16: switched back, the bar follows at once (${describe(sb)})`);
      // The rest of the scenario reads round metres: km from here.
      if (wantMi) {
        await drawerTo(pg, 'full');
        await km.click();
        await pg.waitForTimeout(300);
        await drawerTo(pg, 'peek');
      }
    }

    // The scale bar on Navigate, and after zooming out.
    const s1 = await scaleBar();
    check(s1 && s1.hidden === 'true' && round(s1), `qol QL5, QL8: Navigate shows a scale bar for a round length, hidden from screen readers (${describe(s1)}, aria-hidden=${s1 && s1.hidden})`);
    check(fits(s1) && s1.next > 100, `qol QL5, QL7: the bar is the longest round length within 100 px, within 5% of its metres (${describe(s1)}; next ${s1 && s1.next.toFixed(1)} px)`);
    const [z0, z1] = await zoomOutBy(2);
    const s2 = await scaleBar();
    check(z1 <= z0 - 1.5 && s2 && s2.m > s1.m && round(s2) && fits(s2),
      `qol QL7: zoomed out two levels, the bar grows to a longer round length and still fits (z${z0.toFixed(2)} → z${z1.toFixed(2)}, ${describe(s2)})`);

    // A destination before Start (QL17): a long press 300 m east along the street, so the walk navigates.
    const s0 = at(-0.5, -0.5);
    const destAt = at(2.5, -0.5);
    await fix(s0);
    await shown('locate').first().click();
    await pg.waitForTimeout(2000);
    {
      const center = lonLat(await attr('data-center'));
      const zoom = Number(await attr('data-zoom'));
      const canvas = await pg.locator('canvas.maplibregl-canvas').last().boundingBox();
      const k = mpp(zoom, center[1]);
      const x = canvas.x + canvas.width / 2 + ((destAt[0] - center[0]) * 111320 * Math.cos((center[1] * Math.PI) / 180)) / k;
      const y = canvas.y + canvas.height / 2 - ((destAt[1] - center[1]) * 111320) / k;
      await pg.mouse.move(x, y);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.waitForTimeout(1100);
      await drawerTo(pg, 'full');
      const destText = await pg.locator('[data-testid=drawer-dest]').innerText().catch(() => '');
      check(/\d+(\.\d+)? (m|km|ft|mi)\b/.test(destText), `qol QL14: the destination line carries a distance (${JSON.stringify(destText)})`);
      await drawerTo(pg, 'peek');
    }

    // Explore has Locate and the bar; Chronicle has the bar and no trace ends.
    await pg.click('[data-testid=tab-explore]');
    await pg.waitForTimeout(1200);
    const near = at(0.2, 0.3);
    await fix(near);
    const locate2 = shown('locate');
    check((await locate2.count()) === 1 && (await locate2.first().getAttribute('aria-label')) === 'Center on your position', `qol QL9: Explore shows a Locate button (${await locate2.count()})`);
    await locate2.first().click();
    await pg.waitForTimeout(2000);
    {
      const center = lonLat(await attr('data-center'));
      const walker = lonLat(await attr('data-walker'));
      const off = center ? mAway(center, near) : NaN;
      check(center && off < 250 && walker && mAway(walker, near) < 5,
        `qol QL10: Explore's Locate frames the map around the fix and draws the dot (canvas middle ${off.toFixed(1)} m off, data-walker ${fmt(walker)})`);
      const s3 = await scaleBar();
      check(round(s3) && fits(s3), `qol QL5: Explore shows the scale bar (${describe(s3)})`);
    }
    await pg.click('[data-testid=tab-chronicle]');
    await pg.waitForTimeout(1200);
    {
      const s4 = await scaleBar();
      const ends = await attr('data-ends');
      check(round(s4) && fits(s4), `qol QL5: Chronicle shows the scale bar (${describe(s4)})`);
      check(ends == null || ends === '' || ends === '|', `qol QL1: Chronicle draws no trace, so it marks no start (data-ends ${JSON.stringify(ends)})`);
    }
    await pg.click('[data-testid=tab-navigate]');
    await pg.waitForTimeout(800);

    // A walk: the start marker goes with the trace; no end marker while it is live.
    await fix(s0);
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await fix([s0[0], s0[1] + 0.000002]);
    await pg.waitForTimeout(2500);
    const last = at(-0.5 + 8 * 0.05, -0.5);
    for (let k = 1; k <= 8; k++) {
      await fix(at(-0.5 + k * 0.05, -0.5));
      await pg.waitForTimeout(1000);
    }
    // A step that throws is reported as a failed check, and the scenario goes on (round 3's checks).
    const qstep = async (name, fn) => {
      try {
        await fn();
      } catch (e) {
        check(false, `${name}: ${String(e.message).split('\n')[0]}`);
      }
    };
    const capRow = (kind) => pg.evaluate((k) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
        g.onsuccess = () => resolve(g.result.filter((c) => c.kind === k).sort((a, b) => b.t - a.t)[0] ?? null);
      };
    }), kind);
    // A photo's pin shows its small copy, made after the pin was drawn (QL26, QL27); then a note beside it.
    await qstep('qol QL26, QL27', async () => {
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=cap-photo]')]);
      await chooser.setFiles(path.join(__dirname, 'fixtures', 'photo.jpg'));
      await pg.waitForSelector('text=Photo saved here', { timeout: 15000 }).catch(() => {});
      // Inside the photo's own pin on the walk map (a pin's content may be hidden from screen readers under its label).
      const thumb = pg.locator('.maplibregl-map [aria-label="Photo. Open"] [data-testid=pin-thumb]');
      await thumb.first().waitFor({ timeout: 20000 }).catch(() => {});
      const row = await capRow('photo');
      const inPin = (await thumb.count()) > 0;
      check((await thumb.count()) === 1 && inPin && row && row.thumb_path && row.thumb_path !== 'none',
        `qol QL26, QL27: the photo's pin shows its small copy once it is made, without a reload (${await thumb.count()} pictures, in its pin ${inPin}, thumb ${row && row.thumb_path})`);
    });
    await qstep('qol note', async () => {
      await pg.click('[data-testid=cap-note]');
      await pg.fill('[data-testid=note-input]', 'First words on the corner.');
      await pg.click('[data-testid=note-save]');
      await pg.waitForTimeout(1500);
    });
    await pg.waitForTimeout(2500);
    // Time left beside the distance (QL17, QL18), then End so the trace and its ends show as before.
    {
      const navLeft = pg.locator('[data-testid=nav-left]');
      await navLeft.waitFor({ timeout: 20000 }).catch(() => {});
      const text = (await navLeft.count()) ? await navLeft.innerText() : '';
      const label = (await navLeft.count()) ? await navLeft.getAttribute('aria-label') : '';
      check(/·\s*(<\s*1|\d+(\s*h\s*\d+)?)\s*min\s*·/.test(text) && /about .* left to /.test(label || ''),
        `qol QL17, QL18: the navigation bar says the time left and its label speaks it (${JSON.stringify(text)}, ${JSON.stringify(label)})`);
      if (await pg.locator('[data-testid=nav-end]').count()) await pg.click('[data-testid=nav-end]');
      await pg.waitForTimeout(800);
    }
    {
      const ends = await attr('data-ends');
      const [a, b] = (ends ?? '').split('|');
      const startAt = lonLat(a);
      check(ends != null && startAt && mAway(startAt, s0) < 15 && !b,
        `qol QL2, QL4: a live walk marks where it began and has no end marker (data-ends ${JSON.stringify(ends)}, start ${startAt ? mAway(startAt, s0).toFixed(1) : '-'} m from the first fix)`);
      const s5 = await scaleBar();
      const stop = await pg.locator('[data-testid=stop]').boundingBox();
      check(round(s5) && fits(s5) && s5.box && stop && s5.box.y + s5.box.height <= stop.y + 0.5,
        `qol QL8: the walk screen's scale bar sits clear of its bottom strip (bar bottom ${s5 && s5.box && Math.round(s5.box.y + s5.box.height)}, strip from ${stop && Math.round(stop.y)}; ${describe(s5)})`);
    }
    await shot(pg, 'qol-02-walk');

    // Stopped: both ends, and the bar above the card.
    await holdStop();
    {
      const ends = await attr('data-ends');
      const [a, b] = (ends ?? '').split('|');
      const startAt = lonLat(a);
      const endAt = lonLat(b);
      check(startAt && endAt && mAway(startAt, s0) < 15 && mAway(endAt, last) < 15,
        `qol QL2: the replay marks the start and the end of the trace (data-ends ${JSON.stringify(ends)}: start ${startAt ? mAway(startAt, s0).toFixed(1) : '-'} m, end ${endAt ? mAway(endAt, last).toFixed(1) : '-'} m off)`);
      const s6 = await scaleBar();
      // The card: the outermost painted box around Name it.
      const cardTop = await pg.evaluate(() => {
        let el = document.querySelector('[data-testid=to-name]');
        let top = el ? el.getBoundingClientRect().y : NaN;
        for (; el; el = el.parentElement) {
          const bg = getComputedStyle(el).backgroundColor;
          const r = el.getBoundingClientRect();
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && r.height > 0 && r.y > innerHeight * 0.2) top = Math.min(top, r.y);
        }
        return top;
      });
      check(round(s6) && fits(s6) && s6.box && s6.box.y + s6.box.height <= cardTop + 0.5,
        `qol QL8: the replay's scale bar sits above the card (bar bottom ${s6 && s6.box && Math.round(s6.box.y + s6.box.height)}, card from ${Math.round(cardTop)}; ${describe(s6)})`);
    }
    await shot(pg, 'qol-03-replay-card');

    // A note edited from the replay's viewer reads the new words when opened again (QL24, QL25).
    const openNote = async () => {
      await pg.locator('[aria-label$="captures here. Open"], [aria-label="Note. Open"]').last().click();
      await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 });
      for (let i = 0; i < 4; i++) {
        if (await pg.locator('[data-testid=viewer-more]').count()) {
          const onNote = await pg.evaluate(() => !!document.querySelector('[data-testid=viewer-close]') && /First words on the corner\.|Edited on the replay\./.test(document.body.innerText));
          if (onNote) {
            const shownNote = await pg.locator('text=/^(First words on the corner|Edited on the replay)\.$/').first().isVisible().catch(() => false);
            if (shownNote) return;
          }
        }
        const next = pg.locator('[aria-label="Next capture"]');
        if (!(await next.count())) return;
        await next.first().click();
        await pg.waitForTimeout(400);
      }
    };
    await qstep('qol QL24, QL25', async () => {
      await openNote();
      await pg.click('[data-testid=viewer-more]');
      const item = pg.locator('[data-testid=viewer-edit-note]');
      await item.waitFor({ timeout: 5000 });
      await item.click();
      const input = pg.locator('[data-testid=note-edit-input]');
      await input.waitFor({ timeout: 5000 });
      const prefilled = await input.inputValue();
      await input.fill('   ');
      const blankRefused = (await pg.locator('[data-testid=note-edit-save]').getAttribute('aria-disabled')) === 'true';
      await input.fill('Edited on the replay.');
      await pg.click('[data-testid=note-edit-save]');
      await pg.waitForTimeout(800);
      const seenNow = await pg.locator('text=Edited on the replay.').first().isVisible().catch(() => false);
      await pg.click('[data-testid=viewer-close]');
      await pg.waitForTimeout(600);
      await openNote();
      const seenAgain = await pg.locator('text=Edited on the replay.').first().isVisible().catch(() => false);
      const row = await capRow('text');
      check(prefilled === 'First words on the corner.' && blankRefused && seenNow && seenAgain && row && row.body === 'Edited on the replay.',
        `qol QL24, QL25: Edit note opens prefilled, refuses blank, and the new words show at once and when opened again (prefilled ${JSON.stringify(prefilled)}, blank refused ${blankRefused}, now ${seenNow}, again ${seenAgain}, stored ${JSON.stringify(row && row.body)})`);
      await pg.click('[data-testid=viewer-close]');
      await pg.waitForTimeout(400);
    });

    // Chronicle: the walks list under this month's header (QL28); the walk renamed from its row (QL22, QL23).
    await qstep('qol QL22, QL23, QL28', async () => {
      await pg.click('[data-testid=not-now]');
      await pg.waitForSelector('[data-testid=home-sheet]', { timeout: 15000 });
      await pg.waitForTimeout(800);
      await drawerTo(pg, 'half', 'sheet-drag');
      await pg.waitForSelector('[data-testid=walk-row]', { timeout: 10000 });
      const month = await pg.evaluate(() => new Date().toLocaleDateString(undefined, { month: 'long' }));
      // The text itself (a style may set it in capitals on screen).
      const headers = await shown('month-header').allTextContents();
      const role = (await shown('month-header').count()) ? await shown('month-header').first().getAttribute('role') : null;
      check(headers.length === 1 && headers[0] === month && role === 'heading',
        `qol QL28: the walks list sits under this month's header (${JSON.stringify(headers)}, role ${role})`);
      await pg.locator('[data-testid=walk-more]').first().click();
      await pg.waitForSelector('[data-testid=action-rename]', { timeout: 10000 });
      const first = pg.locator('[data-testid=walk-actions] [role=button]').first();
      const firstIsRename = (await first.getAttribute('data-testid')) === 'action-rename';
      await pg.click('[data-testid=action-rename]');
      const title = pg.locator('[data-testid=rename-title]');
      await title.waitFor({ timeout: 5000 });
      const prefilled = await title.inputValue();
      await title.fill('Fox Point at dusk');
      await pg.fill('[data-testid=rename-epilogue]', 'The harbour went pink.');
      await pg.click('[data-testid=rename-save]');
      await pg.waitForSelector('[data-testid=walk-actions]', { state: 'detached', timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(600);
      const rows = (await pg.locator('[data-testid=walk-row]').allInnerTexts()).join(' | ');
      const stored = await pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
          g.onsuccess = () => resolve(g.result.map((w) => ({ title: w.title, epilogue: w.epilogue })));
        };
      }));
      check(firstIsRename && prefilled.length > 0 && /Fox Point at dusk/.test(rows) && /The harbour went pink\./.test(rows)
        && stored.some((w) => w.title === 'Fox Point at dusk' && w.epilogue === 'The harbour went pink.'),
        `qol QL22, QL23: Rename is first in the walk's More, prefilled, and the row shows the new name at once (first ${firstIsRename}, prefilled ${JSON.stringify(prefilled)}, rows ${JSON.stringify(rows)})`);
      await shot(pg, 'qol-04-chronicle-renamed');
    });
    await c.close();

    // Location denied (QL19): a browser that refuses position requests. The "Not recording" chip is a
    // button that brings the recorder's notice back after it was dismissed.
    {
      const { c: c2, pg: pg2 } = await freshPage('qol-denied', { permissions: [] });
      await pg2.goto(navUrl);
      await pg2.waitForSelector('[data-testid=start]');
      await pg2.waitForTimeout(800);
      await pg2.click('[data-testid=start]');
      const chip = pg2.locator('[data-testid=status-chip]');
      await chip.waitFor({ timeout: 20000 }).catch(() => {});
      const onWalk = /\/walk$/.test(new URL(pg2.url()).pathname);
      if (onWalk && (await chip.count())) {
        const noticeText = 'Location permission was denied';
        const notice = () => pg2.locator('[data-testid=lift-in]', { hasText: noticeText });
        const first = (await notice().count()) > 0;
        const dismiss = pg2.locator('[data-testid=banner-dismiss]');
        if (await dismiss.count()) await dismiss.first().click();
        await pg2.waitForTimeout(400);
        const gone = (await notice().count()) === 0;
        await chip.first().click();
        await pg2.waitForTimeout(600);
        check((await chip.first().getAttribute('role')) === 'button' && (await chip.first().getAttribute('aria-label')) === 'Not recording. Why?' && first && gone && (await notice().count()) === 1,
          `qol QL19: denied, the Not recording chip is a button whose tap brings the notice back (first ${first}, dismissed ${gone}, back ${await notice().count()})`);
      } else {
        const banner = await pg2.locator('[data-testid=lift-in]').allInnerTexts();
        check(banner.some((t) => /Location permission was denied/.test(t)), `qol QL19: denied, Start explains where to allow location (walk opened: ${onWalk}; ${JSON.stringify(banner)})`);
      }
      await c2.close();
    }
  };

  try {
    if (process.env.E2E_ONLY === 'reload') {
      await reloadMinimized();
      check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
      return;
    }
    if (process.env.E2E_ONLY === 'qol') {
      await qolScenario();
      check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
      return;
    }
    if (process.env.E2E_ONLY === 'marks') {
      await marksRepro();
      check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
      return;
    }
    if (process.env.E2E_ONLY === 'gaps') {
      await gapsScenario();
      check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
      return;
    }
    if (process.env.E2E_ONLY === 'tabs') {
      await tabsAudit();
      check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
      return;
    }
    // The old /explore path still opens Explore, with one tab bar (NV2).
    await page.goto(`${url}explore`);
    await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]', { timeout: 30000 }).catch(() => {});
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1,
      `the old /explore path opens Explore at / (NV2: ${page.url()})`);
    // A launch on a replay or a day that is no longer kept goes straight to Explore (NV2: the owner's
    // Home Screen app reopened on "This walk could not be found", Nov 3).
    for (const stale of ['replay/no-such-walk', 'day/1999-01-01']) {
      await page.goto(`${url}${stale}`);
      await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 }).catch(() => {});
      await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]', { timeout: 15000 }).catch(() => {});
      check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1
        && (await page.locator('text=This walk could not be found.').count()) === 0 && (await page.locator('text=Nothing was kept on this day.').count()) === 0,
        `a launch on a stale ${stale.split('/')[0]} link opens Explore (NV2: ${page.url()})`);
    }
    await page.goto(url);
    // Navigation & tabs (NV1-NV6): the app opens on Explore, at / (NV2, the owner's call, Nov 3).
    await page.waitForSelector('[data-testid=tab-explore][aria-selected=true]');
    // Memos and videos play with the ringer switch off, on the web too (bug: silent playback on iPhone).
    check(await page.evaluate(() => navigator.audioSession.type) === 'playback', 'the page asks to play sound even in silent mode');
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1
      && (await page.locator('canvas.maplibregl-canvas').count()) === 1,
      `the app opens on Explore, at its own path, one live map (NV2, NV4, NV5: ${page.url()})`);
    // Explore reads one fix as the app opens and frames it (NV16, the owner's call, Nov 3).
    await page.waitForFunction((s) => [...document.querySelectorAll('[data-center]')].some((e) => {
      if (e.closest('[aria-hidden=true]')) return false;
      const [lon, lat] = (e.getAttribute('data-center') ?? '').split(',').map(Number);
      return Math.abs(lon - s[0]) < 0.004 && Math.abs(lat - s[1]) < 0.004;
    }), start, { timeout: 15000 }).then(() => true, () => false).then((ok) =>
      check(ok, 'Explore frames where you are as the app opens, from one fix of its own (NV16)'));
    const tabs = await page.locator('[data-testid^=tab-]').evaluateAll((els) => els.map((e) => `${e.dataset.testid}:${e.innerText.replace(/[^A-Za-z]/g, "")}:${e.querySelectorAll('svg, [aria-hidden], div').length > 1}`));
    check(tabs.join(',') === 'tab-explore:Explore:true,tab-navigate:Navigate:true,tab-chronicle:Chronicle:true', `a bottom bar with Explore, Navigate and Chronicle, in that order, each with an icon and a label (NV1: ${tabs.join(', ')})`);
    // Each tab at its own path, with one live map (NV4, NV5); Chronicle is review only (NV11).
    const onTab = async (id) => {
      await page.click(`[data-testid=tab-${id}]`);
      await page.waitForTimeout(800);
      return { path: new URL(page.url()).pathname.slice(BASE.length), canvases: await page.locator('canvas.maplibregl-canvas').count() };
    };
    const nv = await onTab('navigate');
    await page.waitForSelector('[data-testid=start]');
    check(nv.path === '/navigate' && (await page.locator('canvas.maplibregl-canvas').count()) === 1 && (await page.locator('[data-testid=start]').count()) === 1,
      `Navigate at /navigate, on the map with Start (NV4, NV5: ${JSON.stringify(nv)})`);
    check((await page.locator('[data-testid=start-explore]').count()) === 0 && (await page.locator('[data-testid=peek-choices]').innerText()) === 'Quiet',
      'Start alone at the peek, with the mode: Quiet the first time (NV19, NV22)');
    check((await page.locator('[data-testid=moment-photo]').count()) === 1 && (await page.locator('[data-testid=moment-note]').isVisible()), 'Navigate has the quick-capture row, outside the drawer (NV18, NV19)');
    await page.waitForTimeout(1500);
    const ex = await onTab('explore');
    check(ex.path === '/' && ex.canvases === 1, `Explore at /, one live map (NV4, NV5: ${JSON.stringify(ex)})`);
    const ch = await onTab('chronicle');
    await page.waitForSelector('text=Walk somewhere and it is starred here');
    check(ch.path === '/chronicle' && ch.canvases === 1, `Chronicle at /chronicle, one live map (NV4, NV5: ${JSON.stringify(ch)})`);
    check((await shownCount(page, '[data-testid=start], [data-testid=start-explore], [data-testid=moment-note], [data-testid=look-here]')) === 0,
      'Chronicle has no Start, Explore button, quick capture or What’s good here (NV11)');
    await page.reload();
    await page.waitForSelector('[data-testid=home-sheet]');
    check(new URL(page.url()).pathname === `${BASE}/chronicle` && (await page.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1, 'a reload keeps the tab (NV5)');
    await page.goBack();
    await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    check(new URL(page.url()).pathname === `${BASE}/` && (await page.locator('canvas.maplibregl-canvas').count()) === 1 && (await page.locator('[data-testid=tab-explore][aria-selected=true]').count()) === 1, 'the browser’s back on Chronicle goes to Explore (NV5)');
    await onTab('navigate');
    await page.goBack();
    await page.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 5000 }).catch(() => {});
    check(new URL(page.url()).pathname === `${BASE}/`, 'and on Navigate too (NV5)');

    // Notifications on the web (v1 slice 6). Installable: the manifest is linked under the base path and served (NT1).
    const manifestHref = await page.evaluate(() => document.querySelector('link[rel=manifest]')?.getAttribute('href'));
    const manifest = manifestHref ? await page.evaluate(async (h) => (await fetch(h)).json(), manifestHref) : null;
    check(manifestHref === `${BASE}/manifest.webmanifest` && manifest?.display === 'standalone' && manifest.start_url === './' && manifest.icons.some((i) => i.sizes === '512x512')
      && (await page.evaluate(() => !!document.querySelector('link[rel=apple-touch-icon]'))),
      'the web app can be installed: a manifest with icons, and Apple home-screen tags (NT1)');
    // The service worker is registered at the base path and active (NT2).
    const sw = await page.evaluate(async () => {
      const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 10000))]);
      return r ? { scope: r.scope, active: !!r.active } : null;
    });
    check(sw && sw.active && sw.scope.endsWith(`${BASE}/`), `the service worker is active at the base path (${JSON.stringify(sw)})`);

    // The pre-start drawer and its dialog (NV19-NV24, Nov 3): the choices, each saved as it changes.
    await onTab('navigate');
    await page.waitForSelector('[data-testid=start]');
    const drawerH = async () => Math.round((await page.locator('[data-testid=navigate-drawer]').boundingBox()).height);
    const peekH = await drawerH();
    await drawerTo(page, 'half');
    check((await page.locator('[data-testid=mode-quiet][aria-checked=true]').count()) === 1 && (await page.locator('[data-testid=mode-explore]').count()) === 1
      && /Long-press the map/.test(await page.locator('[data-testid=start-dialog]').innerText()) && (await page.locator('[data-testid=kind-churches]').count()) === 0
      && (await page.locator('[data-testid=notify-settings]').count()) === 1,
      'in the dialog: the mode, Quiet | Explore, the destination with its hint, reminders and alerts; no kinds with Quiet (NV20, NV21)');
    // The drawer keeps its height while another tab is in front (NV3).
    await drawerTo(page, 'peek');
    await onTab('chronicle');
    await onTab('navigate');
    check((await drawerH()) === peekH, `the drawer keeps its height across tabs (NV3: ${peekH} px)`);
    // Settings: a switch per kind, both on; the test notification is a real one (NT4, NT6).
    await drawerTo(page, 'half');
    const isOn = (id) => page.locator(`[data-testid=${id}] input`).isChecked();
    check((await isOn('notify-recall')) && (await isOn('notify-pause')), 'notifications: Remind me here and the pause reminder, both on by default (NT4)');
    check((await page.locator('[data-testid=pocket-alert]').count()) === 0, 'the web has no pocket alert (NV21)');
    await page.click('[data-testid=notify-test]');
    await page.waitForSelector('[data-testid=notify-sent]', { timeout: 10000 });
    const shownNotes = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => `${n.title}|${n.tag}`));
    check(shownNotes.includes('A memory from here|test'), `the test notification is shown through the service worker (${shownNotes.join(', ')}) (NT6)`);
    await shot(page, '00a-notify-settings');
    // A kind switched off stays off: saved as it changes, with no Done (NT4, NV22).
    await page.click('[data-testid=notify-pause]');
    await drawerTo(page, 'peek');
    await drawerTo(page, 'half');
    await drawerTo(page, 'full');
    check((await isOn('notify-recall')) && !(await isOn('notify-pause')), 'a notification kind switched off stays off');
    await page.click('[data-testid=notify-pause]');
    // Explore: what I'm into and the range appear, with the ring on this map (NV21); saved as they change (NV22).
    const ringNow = () => page.locator('[data-ring]').last().getAttribute('data-ring');
    await page.click('[data-testid=mode-explore]');
    await page.waitForTimeout(500);
    check((await page.locator('[data-testid=kind-churches]').count()) === 1 && (await page.locator('[data-testid=range-value]').innerText()) === '100 m' && (await ringNow()) === '100',
      'with Explore chosen, what I’m into and the range show, the range drawn as a ring on this map (NV21)');
    await page.click('[data-testid=range-plus]');
    await page.waitForTimeout(400);
    check((await page.locator('[data-testid=range-value]').innerText()) === '120 m' && (await ringNow()) === '120' && (await metaOf(page, 'explore_range')) === '120',
      'the ring redraws as the range changes, and the range is saved at once (NV22)');
    await page.click('[data-testid=range-minus]');
    await page.waitForTimeout(300);
    check((await metaOf(page, 'start_mode')) === 'explore' && (await metaOf(page, 'explore_range')) === '100', 'the mode and the range are saved as they change (NV22)');
    await drawerTo(page, 'peek');
    await page.waitForTimeout(300);
    check((await ringNow()) === '' && (await page.locator('[data-testid=peek-choices]').innerText()) === 'Explore', 'the ring goes with the drawer down; the peek shows the mode');
    // The mode opens on the last one picked (NV22).
    await page.reload();
    await page.waitForSelector('[data-testid=peek-choices]');
    await page.waitForFunction(() => document.querySelector('[data-testid=peek-choices]')?.textContent === 'Explore', null, { timeout: 5000 }).catch(() => {});
    check((await page.locator('[data-testid=peek-choices]').innerText()) === 'Explore', 'after a reload the drawer opens on the last mode picked (NV22)');
    // A long press on Navigate's map sets the destination, with its ring (NV23); Clear takes it away.
    {
      // After the reload, the map frames itself around the first fix: press once it has.
      await page.waitForTimeout(1500);
      const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
      await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 3);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.waitForFunction(() => /Your spot/.test(document.querySelector('[data-testid=peek-choices]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
      const line = await page.locator('[data-testid=peek-choices]').innerText();
      check(/^Explore · Your spot · \d+ m away$/.test(line), `a long press on Navigate's map sets the destination, shown at the peek with its distance (NV19, NV23: ${line})`);
      check(JSON.parse(await metaOf(page, 'nav')).walk_id === null, 'the destination is kept in meta nav, for no walk yet (NV22)');
      await shot(page, '00b-drawer-dest');
      await drawerTo(page, 'half');
      check(/Your spot · \d+ m away/.test(await page.locator('[data-testid=drawer-dest]').innerText()), 'at half, the destination with its straight-line distance and Clear (NV20)');
      await page.click('[data-testid=dest-clear]');
      await page.click('[data-testid=mode-quiet]');
      await page.waitForTimeout(300);
      check((await page.locator('[data-testid=drawer-dest]').count()) === 0 && !(await metaOf(page, 'nav')) && (await metaOf(page, 'start_mode')) === 'quiet', 'Clear takes the destination away; back to Quiet');
      await drawerTo(page, 'peek');
    }
    await shot(page, '00-home-empty');
    const held = await pressedScale(page, '[data-testid=start]');
    check(held.scale > 0.95 && held.scale < 0.99 && held.after === 1, `a large button presses down while held, and springs back (M4: ${held.scale.toFixed(3)} → ${held.after})`);
    // Start at the peek starts at once, with no drawer opened (NV19, NV25).
    await page.click('[data-testid=start]');
    await page.waitForSelector('[data-testid=stop]');
    check(new URL(page.url()).pathname === `${BASE}/walk` && !(await tabBarShown(page)), 'Start opens the walk over the tabs, the tab bar hidden (NV6, NV25)');
    // A fresh fix, as a phone's GPS gives one: the emulated position is otherwise re-sent with the time it was
    // read on Navigate, and a fix from before the walk began is dropped as stale (MAX_STALE_MS).
    await ctx.setGeolocation({ longitude: start[0], latitude: start[1] + 0.000002, accuracy: 6 });
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
    await page.waitForTimeout(500);
    {
      // Capture stays one tap away while the walk's settings are open (rev 34).
      const cam = await page.locator('[data-testid=cap-photo]').boundingBox();
      const atCam = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-testid]')?.getAttribute('data-testid'), { x: cam.x + cam.width / 2, y: cam.y + cam.height / 2 });
      check(atCam === 'cap-photo', `the walk's settings panel leaves the capture row free (rev 34: ${atCam})`);
    }
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
    const dotMoves = [];
    let dotLast = null;
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
        // Without motion (headless Chromium sends no samples), the walk goes on and says so (MO2).
        check((await page.locator('[data-testid=motion-off]').count()) === 1, 'without motion, the walk\u2019s options say standing still may drift (MO2)');
        // The GPS log goes to the share sheet with every raw reading (the GPS log, Nov 1).
        await page.evaluate(() => { navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; });
        await page.waitForTimeout(500);
        await page.click('[data-testid=share-gps-log]');
        const shared = await page.waitForFunction(() => window.__shared, null, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => null);
        const rows = shared?.text?.split('\n') ?? [];
        check(rows[0]?.startsWith('# Chronicles GPS log') && rows.includes('s,lat,lon,accuracy_m,speed_ms,course') && rows.filter((r) => /^\d+\.\d,/.test(r)).length >= 5, `the walk's options share its GPS log (${rows.length} lines)`);
        await page.click('[data-testid=options-close]');
        // The quiet read kept no busy streets (the owner's call); switching Explore on reads them at once.
        await walkMap().getByText('Thayer Street', { exact: true }).first().waitFor({ timeout: 15000 }).catch(() => {});
        check((await walkMap().getByText('Thayer Street', { exact: true }).count()) >= 1, 'switching Explore on brings in the busy streets around');
      }
      if (k === 8) {
        // 75 m from the memorial: inside the 100 m range, a "?" that doesn't say what it is (E6).
        check((await walkMarks().count()) === 1 && (await page.locator('[aria-label="A place to find. Open"]').count()) === 1, 'a "?" shows for a place within range, and only that one');
      }
      if (k >= 16 && k <= 20) {
        // The dot moves on every fix, not every 2 s with the trace (the live dot, Nov 1).
        const at = await page.locator('[data-testid=walker-puck]').getAttribute('data-at');
        if (k > 16) dotMoves.push(at !== dotLast);
        dotLast = at;
        if (k === 20) check(dotMoves.length === 4 && dotMoves.every(Boolean), `the dot moves on every fix, as it comes (${dotMoves.join(',')})`);
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
        // The note may share the spot with the video nearby: step to it.
        for (let i = 0; i < 4 && !(await page.getByText('The bakery smelled of cardamom.').count()); i++) {
          if (!(await page.locator('[aria-label="Next capture"]').count())) break;
          await page.click('[aria-label="Next capture"]');
          await page.waitForTimeout(300);
        }
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
        // A small copy is kept with it (TH1): stored on the capture, decodable, at most 240 px. Polled: it
        // is made after the capture is kept, in its own time (TH2).
        const readThumb = (id) => page.evaluate((id) => new Promise((resolve) => {
          const req = indexedDB.open('chronicles');
          req.onsuccess = () => {
            const db = req.result;
            const g = db.transaction('capture', 'readonly').objectStore('capture').get(id);
            g.onsuccess = () => {
              const path = g.result?.thumb_path;
              if (!path) return resolve({ path: null });
              const stores = [...db.objectStoreNames].filter((n) => /media/.test(n));
              const m = db.transaction(stores[0], 'readonly').objectStore(stores[0]).get(path);
              m.onsuccess = async () => {
                const blob = m.result instanceof Blob ? m.result : m.result?.blob;
                if (!blob) return resolve({ path, size: null });
                const bmp = await createImageBitmap(blob);
                resolve({ path, w: bmp.width, h: bmp.height });
              };
              m.onerror = () => resolve({ path, size: null });
            };
          };
        }), id);
        let thumb = await readThumb(photoId);
        for (let i = 0; i < 20 && !thumb.w; i++) {
          await page.waitForTimeout(250);
          thumb = await readThumb(photoId);
        }
        check(!!thumb.path && Math.max(thumb.w, thumb.h) <= 240 && Math.max(thumb.w, thumb.h) >= 100,
          `a new photo keeps a small copy beside it (TH1: ${JSON.stringify(thumb)})`);
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

    // Open in Maps (Bridges and Open in Maps, NH1-NH7): the destination goes to the phone's maps app.
    {
      const opened = () => page.evaluate(() => window.__opened.slice());
      /** The destination of a Google walking-directions link (this browser is a desktop: NH2). */
      const destOf = (u) => {
        const m = /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=(-?\d+\.\d{6}),(-?\d+\.\d{6})&travelmode=walking$/.exec(u ?? '');
        return m ? [Number(m[2]), Number(m[1])] : null;
      };
      const metersApart = (a, b) => Math.hypot((a[0] - b[0]) / dLon, (a[1] - b[1]) / dLat) * 100;
      const box = await page.locator('canvas.maplibregl-canvas').last().boundingBox();
      const press = async (x, y) => {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
      };
      const spot = { x: box.x + box.width / 2 + 90, y: box.y + box.height / 2 - 120 };
      await press(spot.x, spot.y);
      await page.waitForSelector('[data-testid=spot-handoff]');
      // At a 320 px phone's width, every button on the card stays on screen (NH6).
      await page.setViewportSize({ width: 320, height: 700 });
      await page.waitForTimeout(500);
      const inside = await page.evaluate(() =>
        ['go-here', 'spot-handoff', 'spot-close', 'here-open'].every((id) => {
          const el = document.querySelector(`[data-testid=${id}]`);
          if (!el) return true;
          const b = el.getBoundingClientRect();
          return b.left >= 0 && b.right <= 320 && b.width >= 44 && b.height >= 44;
        }),
      );
      check(inside, 'the long-press card’s buttons, Open in Maps among them, fit 320 px at 44 pt (NH6)');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      await page.click('[data-testid=spot-handoff]');
      const fromCard = destOf((await opened()).at(-1));
      check(!!fromCard && (await page.locator('[data-testid=spot-handoff]').count()) === 0, `the long-press card opens walking directions to its spot (NH1, NH6: ${(await opened()).at(-1)})`);
      await page.waitForTimeout(1100);
      await press(spot.x, spot.y);
      await page.click('[data-testid=go-here]');
      await page.waitForSelector('[data-testid=nav-bar]', { timeout: 30000 });
      const left = await navLeft();
      await page.click('[data-testid=nav-handoff]');
      const fromBar = destOf((await opened()).at(-1));
      check(!!fromBar && !!fromCard && metersApart(fromBar, fromCard) < 5, `the bar's Open in Maps sends the destination (NH3${fromBar && fromCard ? `: ${metersApart(fromBar, fromCard).toFixed(1)} m from the card's` : ''})`);
      await page.waitForTimeout(1500);
      check((await page.locator('[data-testid=nav-bar]').count()) === 1 && Math.abs((await navLeft()) - left) < 30, 'navigation goes on after the hand-off (NH7)');
      await page.click('[data-testid=nav-end]');
      await page.waitForSelector('[data-testid=nav-bar]', { state: 'detached', timeout: 5000 });
      // A route that can't be found offers the maps app (NH5): zoomed far out, a spot many km away.
      const zoomNow = () => page.evaluate(() => Number([...document.querySelectorAll('[data-zoom]')].at(-1)?.getAttribute('data-zoom') ?? NaN));
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let k = 0; k < 20 && !((await zoomNow()) <= 9.5); k++) {
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(800);
      await press(box.x + 50, box.y + box.height * 0.3);
      await page.waitForSelector('[data-testid=go-here]');
      await page.click('[data-testid=go-here]');
      const failed = await page.waitForSelector('text=/Too far to walk from here|No walking route found nearby/', { timeout: 90000 }).then(() => true, () => false);
      const action = page.locator('[role=button]:has-text("Open in Maps")');
      check(failed && (await action.count()) === 1, `a route that can't be found offers Open in Maps (NH5, at z${(await zoomNow()).toFixed(1)})`);
      if (failed && (await action.count())) {
        // It stays until dismissed: the destination is already forgotten (audit 6).
        await page.waitForTimeout(7000);
        check((await action.count()) === 1, 'the failed route’s Open in Maps is still there after 7 s (audit 6)');
        const actionBox = await action.boundingBox();
        check(actionBox && actionBox.height >= 44, `its button is 44 pt tall (audit 6: ${actionBox && Math.round(actionBox.height)})`);
        await action.click();
        const far = destOf((await opened()).at(-1));
        // The walker stands where walk me back ended: the route's start.
        const walker = route[0];
        check(!!far && !!walker && metersApart(far, walker) > 2000, `its Open in Maps goes to the spot asked for (NH5${far && walker ? `: ${(metersApart(far, walker) / 1000).toFixed(1)} km away` : ''})`);
      }
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let k = 0; k < 20 && !((await zoomNow()) >= 15.8); k++) {
        await page.mouse.wheel(0, -400);
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(800);
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
    // Said as a clause in the card's line, not a big number (tabs audit U13).
    const cardLine = await page.locator('[data-testid=card-line]').innerText();
    check(/your first time down (Transit Street and Arnold Street|Arnold Street and Transit Street)$/.test(cardLine) && !/\bnew streets?\b/.test(card),
      `the card names the 2 named streets new to you, in its line (${cardLine})`);
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
    // Named, never counted (tabs audit U13).
    check(low.length === 1 && /^Passed .+ without stopping$/.test(low[0]) && !/\d/.test(low[0]), `the card keeps the place passed as a low, by name (${low.join(' | ')})`);
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
    // Back on Chronicle: the walk is a star where it was walked (H1, H7, NV27).
    await page.waitForSelector('[data-testid=home-sheet]');
    check(new URL(page.url()).pathname === `${BASE}/chronicle` && (await page.locator('[data-testid=home-sheet]').count()) === 1 && (await tabBarShown(page)),
      `closing the replay after Stop returns to Chronicle, once, with the tab bar (NV27: ${page.url()})`);
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
    // The sheet grows into the screen above the tab bar.
    const vh = (await page.locator('[data-testid=tab-navigate]').boundingBox()).y;
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
    // And across the tabs: Chronicle's map is taken down while Navigate is in front, and comes back where it was (NV3, NV4).
    await page.click('[data-testid=tab-navigate]');
    await page.waitForSelector('[data-testid=start]');
    await page.waitForTimeout(800);
    check((await page.locator('canvas.maplibregl-canvas').count()) === 1, 'one live map on Navigate after a walk (NV4)');
    await page.click('[data-testid=tab-chronicle]');
    await page.waitForTimeout(1200);
    const starTabs = await page.locator('[aria-label^="Fox Point,"]').boundingBox();
    check((await page.locator('canvas.maplibregl-canvas').count()) === 1 && Math.abs(starTabs.x - starBefore.x) < 3 && Math.abs(starTabs.y - starBefore.y) < 3 && (await page.locator('[data-testid=walk-row]').count()) === 1,
      `Chronicle keeps its sheet and its map view across tabs (NV3: ${Math.round(starTabs.x)},${Math.round(starTabs.y)})`);

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
      await still.click('[data-testid=tab-navigate]');
      await still.waitForSelector('[data-testid=start]');
      await still.waitForTimeout(800);
      const flat = await pressedScale(still, '[data-testid=start]');
      await still.click('[data-testid=tab-chronicle]');
      await still.waitForTimeout(400);
      const peek = (await still.locator('[data-testid=home-sheet]').boundingBox()).height;
      await still.click('[data-testid=sheet-walks]');
      await still.waitForTimeout(60);
      const open = (await still.locator('[data-testid=home-sheet]').boundingBox()).height;
      check(flat.scale === 1 && flat.opacity < 1 && open - peek > 200,
        `with reduce motion on, nothing moves, the press still shows, and the sheet snaps open (M2, audit 4: scale ${flat.scale}, opacity ${flat.opacity}, ${Math.round(peek)} → ${Math.round(open)} px in 60 ms)`);
      await still.close();
    }
    // A spring cut short by a drag still reports where the sheet ended (audit 2): the capture row sits on
    // Navigate's peeking drawer, as Start did on the home's sheet. Touch, as on a phone: in a browser a mouse
    // drag on a moving element is cancelled.
    const rowGap = async (pg) => {
      const top = (await pg.locator('[data-testid=navigate-drawer]').boundingBox()).y;
      const cam = await pg.locator('[data-testid=moment-photo]').boundingBox({ timeout: 3000 }).catch(() => null);
      return cam ? Math.round(top - (cam.y + cam.height)) : null;
    };
    {
      const springy = await ctx.newPage();
      springy.on('pageerror', (e) => errors.push(String(e)));
      await springy.goto(navUrl);
      await springy.waitForSelector('[data-testid=start]');
      await springy.waitForTimeout(800);
      const rest = await rowGap(springy);
      await drawerTo(springy, 'half');
      await springy.keyboard.press('Escape');
      await springy.waitForTimeout(60);
      const hd = await springy.locator('[data-testid=drawer-drag]').boundingBox();
      const touch = await springy.context().newCDPSession(springy);
      const x = hd.x + hd.width / 2;
      const vh = springy.viewportSize().height;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: hd.y + 6 }] });
      for (let y = hd.y + 30; y < vh - 10; y += 60) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await springy.waitForTimeout(900);
      const gap = await rowGap(springy);
      check(rest != null && gap != null && Math.abs(gap - rest) <= 4, `after a drag cuts a spring short, the capture row sits on the peeking drawer (audit 2: gap ${gap}, at rest ${rest})`);
      await springy.close();
    }
    // The row rides on the drawer's own animated height, never a height reported when a move ends: let go
    // of the open drawer partway down and, while the spring's tail is still settling, the row already sits
    // on the peeking drawer (the owner's screenshot, Nov 1: Start floated mid-screen over a closed sheet).
    {
      const rides = await ctx.newPage();
      rides.on('pageerror', (e) => errors.push(String(e)));
      await rides.goto(navUrl);
      await rides.waitForSelector('[data-testid=start]');
      await rides.waitForTimeout(800);
      const rest = await rowGap(rides);
      await drawerTo(rides, 'half');
      const hd = await rides.locator('[data-testid=drawer-drag]').boundingBox();
      const touch = await rides.context().newCDPSession(rides);
      const x = hd.x + hd.width / 2;
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: hd.y + 6 }] });
      for (let i = 1; i <= 4; i++) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: hd.y + 6 + i * 45 }] });
        await rides.waitForTimeout(10);
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await rides.waitForTimeout(450);
      const gap = await rowGap(rides);
      check(rest != null && gap != null && Math.abs(gap - rest) <= 4, `let go partway down, the capture row sits on the drawer as it settles, not where it was open (gap ${gap}, at rest ${rest})`);
      await rides.close();
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
      check(opened && (await page.locator('[data-testid=viewer-close]').count()) === 1, 'a reminder tapped with Chronicle in front after a walk opens there, once');
      if (opened) await page.click('[data-testid=viewer-close]');
      // With Navigate in front and no walk open, a tap opens the captures on Chronicle (NV13).
      await page.click('[data-testid=tab-navigate]');
      await page.waitForSelector('[data-testid=start]');
      await page.waitForTimeout(800);
      await page.evaluate((m) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: m })), homeTap);
      const onChronicle = await page.waitForSelector('[data-testid=viewer-close]', { timeout: 8000 }).then(() => true, () => false);
      check(onChronicle && new URL(page.url()).pathname === `${BASE}/chronicle` && (await page.locator('[data-testid=viewer-close]').count()) === 1,
        `a reminder tapped on another tab opens its capture on Chronicle, once (NV13: ${page.url()})`);
      if (onChronicle) await page.click('[data-testid=viewer-close]');
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
    // Waited for as one: a single walk can be placed between seeing the text and counting the button.
    const placingCover = await page.waitForSelector('[data-testid=skip-placing]', { timeout: 20000 }).then(() => true, () => false);
    check(placingCover, 'placing old walks shows a cover that can be skipped');
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
    // Explore is an atlas (AT1-AT14): the areas near Navigate's last fix as a grid of same-scale tiles,
    // read by themselves, nearest first; never asking for a position of its own.
    const tileOf = (name) => page.locator(`[data-testid=atlas-tile][data-name="${name}"]`);
    const toExplore = async () => {
      await page.click('[data-testid=tab-navigate]');
      await page.waitForSelector('[data-testid=start]');
      await page.waitForTimeout(1500);
      await page.click('[data-testid=tab-explore]');
      await page.waitForSelector('[data-testid=atlas-grid]');
    };
    await toExplore();
    await page.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"][data-read="1"]', { timeout: 60000 }).catch(() => {});
    {
      const names = await page.locator('[data-testid=atlas-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));
      const fox = tileOf('Fox Point');
      const label = (await fox.getAttribute('aria-label')) ?? '';
      check((await page.locator('canvas.maplibregl-canvas').count()) === 1 && names[0] === 'Fox Point' && /^Fox Point\. You’re here\./.test(label),
        `AT1: the atlas lists the neighborhoods near you, the one you're in first (${names.join(', ')}: ${label})`);
      check((await fox.getAttribute('data-read')) === '1' && (await fox.locator('svg').count()) >= 1 && (await fox.locator('[data-kind]').count()) >= 1,
        'AT3, AT5, AT6: its ring was read by itself; the tile has its picture and the kinds it has (round 3: only those present)');
      check(/Walked (once|\d+ times)/.test(label) && /History: (some|plenty|lots)/.test(label),
        `AT3, AT13: the tile says how often you walked there and each kind present in words (${label})`);
      const atlasRows = await page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('atlas_area', 'readonly').objectStore('atlas_area').getAll();
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const foxRow = atlasRows.find((r) => r.name === 'Fox Point');
      check(foxRow && foxRow.profile && foxRow.build && foxRow.code, 'AT12: the ring read is kept as a cache tagged with the build and the atlas rules');
      check(!/\d+\s*of\s*\d+/.test(await page.locator('body').innerText()), 'AT11: no "N of M" anywhere on Explore');
      await shot(page, '11b-explore');
    }
    {
      // AT8: a tile opens its card; unfound places are never named (AT7), finds are.
      await tileOf('Fox Point').click();
      await page.waitForSelector('[data-testid=atlas-card]');
      const card = await page.locator('[data-testid=atlas-card]').innerText();
      check(/Hessian Memorial/.test(await page.locator('[data-testid=atlas-found]').innerText().catch(() => '')),
        `AT8: the card names what you found here (${card.replace(/\s+/g, ' ').slice(0, 160)})`);
      check((await page.locator('[data-testid=atlas-walk]').count()) === 0 && /You’re in Fox Point/.test(card), 'AT8: the area you are in has no Walk to');
      check((await page.locator('[data-testid=atlas-kind-history]').count()) === 1 && !/\d+\s*of\s*\d+/.test(card), 'AT8: the eight kinds in words, no counts');
      {
        // The card's body shows, not only its header (an iPhone left it at the header's height, Nov 3). Round 3:
        // it opens low, so the map above stays in sight; a tap on its handle raises it.
        const vh = page.viewportSize().height;
        const box = await page.locator('[data-testid=atlas-card]').boundingBox();
        check(box && box.height > vh * 0.5 && box.height < vh * 0.7 && box.y > vh * 0.3,
          `atlas round 3: the card opens as a sheet that leaves the map in sight (${box && Math.round(box.y)}+${box && Math.round(box.height)} of ${vh})`);
        await page.click('[data-testid=atlas-card-grip]');
        await page.waitForTimeout(700);
        const up = await page.locator('[data-testid=atlas-card]').boundingBox();
        check(up && up.height > vh * 0.8, `atlas round 3: its handle raises it (${up && Math.round(up.height)})`);
        const kind = await page.locator('[data-testid=atlas-kind-history]').boundingBox();
        check(kind && up && kind.y + kind.height <= up.y + up.height + 1, 'AT8: its body is inside it');
      }
      await page.click('[data-testid=atlas-how]');
      {
        const how = await page.locator('[data-testid=atlas-how-panel]').innerText();
        check(/same marks mean the same anywhere/.test(how) && !/\d/.test(how), `atlas round 3: How the marks work says it in words, with no counts (${how.replace(/\s+/g, ' ').slice(0, 80)})`);
      }
      await shot(page, '11c-atlas-card');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      check((await page.locator('[data-testid=atlas-card]').count()) === 0, 'AT8: Escape closes the card');
      // explore-atlas audit 8: a card left open closes when another tab comes to the front, so it never keeps
      // Back and Escape from that tab.
      await tileOf('Fox Point').click();
      await page.waitForSelector('[data-testid=atlas-card]');
      await page.click('[data-testid=tab-chronicle]');
      await page.waitForTimeout(600);
      await page.click('[data-testid=tab-explore]');
      await page.waitForSelector('[data-testid=atlas-grid]');
      check((await page.locator('[data-testid=atlas-card]').count()) === 0, 'explore-atlas audit 8: leaving the tab closes its card');
      // AT2 (round 3): your own town is the title, never listed again among the other towns; the title opens its page.
      const towns = await page.locator('[data-testid=atlas-tile][data-level="town"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));
      const homeName = await page.locator('[data-testid=explore-area]').innerText();
      check(!towns.includes(homeName), `atlas round 3: your town (${homeName}) isn't listed again among the other towns (${towns.join(', ') || 'none'})`);
      await page.click('[data-testid=atlas-title]');
      const head = await page.waitForSelector('[data-testid=atlas-town-head]', { timeout: 10000 }).then(() => true, () => false);
      check(head && (await page.locator('[data-testid=explore-area]').innerText()) === homeName && (await page.locator('[data-testid=atlas-back-pill]').count()) === 1,
        `AT2: the title opens your town's own page, headed by its picture, with a way back low on the screen (${homeName})`);
      await page.click('[data-testid=atlas-back-pill]');
      await page.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"]', { timeout: 10000 });
      check((await page.locator('[data-testid=atlas-town-head]').count()) === 0, 'AT2: back returns to the areas near you');
    }
    // What's good here (v1.5): a long press on the small map, then a read of the area around the city
    // nearby, finds Thayer Street's strip, as information (L1, L2, L5, L7, L9, NV15).
    {
      const press = async () => {
        await page.waitForTimeout(1100);
        const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
        // The small map shows more ground per pixel than the old full-screen one: pressed near its middle.
        await page.mouse.move(box.x + box.width / 2 - 15, box.y + box.height / 2 - 10);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
        await page.waitForSelector('[data-testid=look-here]', { timeout: 5000 });
      };
      // Cancel goes at once and keeps nothing (audit).
      const rows = () => page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('landing', 'readonly').objectStore('landing').getAll();
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const rowsBefore = (await rows()).length;
      tileDelayMs = 4000;
      await press();
      check((await page.locator('[data-testid=walk-here]').count()) === 1, 'at street zoom, Explore’s long press offers Walk here too (NV15)');
      {
        // atlas round 3: the choices sit over the map, never inside the scrolled list; the hint goes once used.
        const map = await page.locator('canvas.maplibregl-canvas').boundingBox();
        const sp = await page.locator('[data-testid=atlas-spot]').boundingBox();
        check(sp && map && sp.y >= map.y - 1 && sp.y + sp.height <= map.y + map.height + 1, 'atlas round 3: the long press’s choices sit over the map');
        check((await page.locator('[data-testid=atlas-press-hint]').count()) === 0, 'atlas round 3: the press hint goes once the long press is used');
      }
      await page.click('[data-testid=look-here]');
      await page.click('[data-testid=look-cancel]');
      const gone = (await page.locator('[data-testid=look-cancel]').count()) === 0;
      await page.waitForTimeout(6000);
      tileDelayMs = 0;
      check(gone && (await rows()).length === rowsBefore, 'cancelling a look stops it at once, with nothing kept');
      await press();
      await page.click('[data-testid=look-here]');
      const said = await page.waitForSelector('text=/A best guess from the map|Couldn’t read the map here/', { timeout: 30000 }).then((e) => e.innerText(), () => 'nothing');
      await shot(page, '11c-landing');
      check(/Busiest area: Thayer Street/.test(said) && (await page.locator('[data-testid=start-here]').count()) === 0, `what’s good here finds the strip, named, with no Start here pin (${said})`);
      const first = await rows();
      check(first.some((r) => r.analysis.strips.some((x) => x.name === 'Thayer Street')), 'the area is remembered, Thayer Street among its strips');
      // Again: the same area is replaced, not added (L12).
      await press();
      await page.click('[data-testid=look-here]');
      await page.waitForSelector('text=/Busiest area/', { timeout: 30000 });
      check((await rows()).length === first.length, 'looking again replaces the area');
      // Reloaded on the tab, the atlas comes back from storage at once (AT12), offline of the map's reads (NV5).
      await page.reload();
      const back = await page.waitForSelector('[data-testid=atlas-tile][data-name="Fox Point"][data-read="1"]', { timeout: 30000 }).then(() => true, () => false);
      const label = back ? (await tileOf('Fox Point').getAttribute('aria-label')) ?? '' : '';
      check(back && new URL(page.url()).pathname === `${BASE}/`,
        `AT1, AT12: after a reload, the atlas is back on the same tab from where it last listed (${label}; the launch's one fix may already say "You're here", NV16)`);
      await page.click('[data-testid=tab-chronicle]');
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

    // Rides (R5, R6, R11): a bus leg at 12 m/s, one fix a second, is drawn dashed and reads "On a ride",
    // never "Weak GPS" (the bug, Nov 1: a bus kept its first fix and showed Weak GPS); the card shows
    // walked and ridden distance apart.
    const busFrom = pts[25];
    for (let j = 0; j < 4; j++) {
      await ctx.setGeolocation({ longitude: busFrom[0], latitude: busFrom[1] + j * 0.00001, accuracy: 6 });
      await page.waitForTimeout(1000);
    }
    const busStep = 12 / (111320 * Math.cos((busFrom[1] * Math.PI) / 180));
    let rideChip = false;
    let weakSeen = false;
    for (let j = 1; j <= 45; j++) {
      await ctx.setGeolocation({ longitude: busFrom[0] + j * busStep, latitude: busFrom[1] + 0.00003, accuracy: 6 });
      await page.waitForTimeout(1000);
      if (await page.getByText('Weak GPS').count()) weakSeen = true;
      if (j >= 30 && !rideChip) rideChip = (await page.getByText('On a ride').count()) > 0;
    }
    await page.waitForTimeout(2200);
    await shot(page, '14-ride');
    check(rideChip, 'a bus leg reads "On a ride" (R11)');
    check(!weakSeen, 'a bus leg never reads "Weak GPS" (R11)');
    const rides = await page.locator('[data-rides]').last().getAttribute('data-rides');
    check(Number(rides?.split(':')[0]) === 1 && Number(rides?.split(':')[1]) > 30, `the ride is drawn as its own dashed line (R5: ${rides})`);
    const stats = await page.locator('[data-testid=walk-stats]').innerText();
    check(/^\d+:\d\d · \d+ m\n\+ \d+ m ride$/.test(stats), `the walk's distance shows the ride apart, on its own line (R6: "${stats}")`);
    const holdBox = await page.locator('[data-testid=stop]').boundingBox();
    await page.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    await page.waitForURL(/replay/, { timeout: 30000 });
    await page.waitForSelector('[data-testid=skip]', { timeout: 60000 });
    await page.click('[data-testid=skip]');
    await page.waitForSelector('[data-testid=card-ride]', { timeout: 60000 });
    const cardDistance = await page.locator('[data-testid=card-distance]').innerText();
    const cardRide = await page.locator('[data-testid=card-ride]').innerText();
    await shot(page, '14b-ride-card');
    // The bus leg is 45 s at 12 m/s: about 540 m, with no jog from the stop (the audit's run-up, Nov 1).
    const rideMetres = Number(/\+ (\d+) m by ride/.exec(cardRide)?.[1]);
    check(/^\d+ m$/.test(cardDistance) && rideMetres > 480 && rideMetres < 600, `the card shows walked, and the ride on its own line (R6: "${cardDistance}", "${cardRide}")`);
    // Moments and days (the concept doc's "Moments and days" tab, M1-M17), in a fresh browser: nothing kept yet.
    {
      const ctx2 = await browser.newContext({
        viewport: { width: 390, height: 844 },
        permissions: ['geolocation', 'microphone'],
        geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 },
      });
      await metricRegion(ctx2);
      await ctx2.route('https://tiles.openfreemap.org/**', tileRoute);
      ctx2.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol)) hosts.add(u.host); });
      // Location watches started and cleared, so a moment is seen to leave none running (M5).
      await ctx2.addInitScript(() => {
        const g = navigator.geolocation;
        const watch = g.watchPosition.bind(g);
        const clear = g.clearWatch.bind(g);
        window.__watches = new Set();
        g.watchPosition = (...a) => { const id = watch(...a); window.__watches.add(id); return id; };
        g.clearWatch = (id) => { window.__watches.delete(id); clear(id); };
      });
      const p2 = await ctx2.newPage();
      p2.on('pageerror', (e) => errors.push(`moments: ${e}`));
      p2.on('console', (m) => m.type() === 'error' && errors.push(`moments: ${m.text()}`));
      const captureRows = () => p2.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
          g.onsuccess = () => resolve(g.result.sort((a, b) => a.t - b.t));
        };
      }));
      const note = async (open, input, save, text) => {
        await p2.click(open);
        await p2.fill(input, text);
        await p2.click(save);
      };
      await p2.goto(navUrl);
      await p2.waitForSelector('[data-testid=moment-note]');
      check((await p2.locator('[data-testid=moment-photo]').count()) === 1 && (await p2.locator('[data-testid=moment-voice]').count()) === 1
        && (await p2.locator('[data-testid=start]').count()) === 1, 'Navigate offers camera, mic and pencil beside Start, with no walk open (M1, NV18)');
      // Navigate's map is around one fix, read as the tab comes to the front; nothing keeps watching (NV17).
      await p2.waitForTimeout(2500);
      const reads0 = await p2.evaluate(() => ({ live: window.__watches.size }));
      await p2.click('[data-testid=tab-chronicle]');
      await p2.waitForTimeout(500);
      await p2.click('[data-testid=tab-navigate]');
      await p2.waitForTimeout(2500);
      check(reads0.live === 0 && (await p2.evaluate(() => window.__watches.size)) === 0, 'Navigate reads one fix each time it comes to the front, and leaves no watch running (NV17)');

      // A note from the home is kept at once and placed by one fix (M1, M2), with no watch left running (M5).
      await note('[data-testid=moment-note]', '[data-testid=moment-note-input]', '[data-testid=moment-note-save]', 'A green dress in the window.');
      check(await p2.waitForSelector('text=Note kept here', { timeout: 15000 }).then(() => true, () => false), 'a note from the home is kept, and says it was placed (M2)');
      let rows = await captureRows();
      check(rows.length === 1 && rows[0].walk_id == null && rows[0].lat != null && Math.abs(rows[0].lon - start[0]) < 1e-5,
        `the moment belongs to no walk and sits where it was made (M1, M2)`);
      check((await p2.evaluate(() => window.__watches.size)) === 0, 'no location watch keeps running after a moment (M5)');
      // The moment is a pin where it was made, on Navigate, and the pin opens it (M16, moment pins 1-2).
      check(await p2.waitForSelector('[aria-label="Note. Open"]', { timeout: 15000 }).then(() => true, () => false), 'a placed moment shows as a pin on Navigate (M16, moment pins 1)');
      await shot(p2, '20-moment-home');
      await p2.click('[aria-label="Note. Open"]');
      check(await p2.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => true, () => false)
        && (await p2.getByText('A green dress in the window.').count()) > 0, 'the moment\'s pin on Navigate opens it in the viewer (M16, moment pins 2)');
      await p2.click('[data-testid=viewer-close]');
      await p2.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 10000 }).catch(() => {});

      // With nothing walked yet, Chronicle frames the moment, so its pin is in view, not the world (moment pins 3).
      await p2.click('[data-testid=tab-chronicle]');
      check(await p2.waitForSelector('[aria-label="Note. Open"]', { timeout: 15000 }).then(() => true, () => false), 'Chronicle frames a moment made before any walk, and shows its pin (M16, moment pins 3)');

      // Today is listed in Chronicle's sheet with its moment (M7, M9, NV18).
      await p2.click('[data-testid=sheet-days]');
      await p2.waitForSelector('[data-testid=day-row]');
      const dayRow = await p2.locator('[data-testid=day-row]').first().innerText();
      check(/^Today/.test(dayRow) && /1 moment\b/.test(dayRow), `the days list starts with today and its moment (${dayRow.replace(/\n/g, ' · ')})`);
      await p2.click('[data-testid=sheet-map]');

      // A walk with a note of its own, in the same day (M3).
      await p2.click('[data-testid=tab-navigate]');
      await p2.click('[data-testid=start]');
      await p2.waitForURL(/\/walk/, { timeout: 15000 });
      const route2 = [];
      for (let k = 1; k <= 30; k++) route2.push([start[0] + (k / 30) * 1.5 * dLon, start[1]]);
      for (let k = 0; k < route2.length; k++) {
        await ctx2.setGeolocation({ longitude: route2[k][0], latitude: route2[k][1], accuracy: 6 });
        await p2.waitForTimeout(1000);
        if (k === 25) {
          await note('[data-testid=cap-note]', '[data-testid=note-input]', '[data-testid=note-save]', 'The tailor on the corner.');
          await p2.waitForSelector('text=Note saved here');
        }
      }
      const stopBox = await p2.locator('[data-testid=stop]').boundingBox();
      await p2.mouse.move(stopBox.x + stopBox.width / 2, stopBox.y + stopBox.height / 2);
      await p2.mouse.down();
      await p2.waitForTimeout(1100);
      await p2.mouse.up();
      await p2.waitForURL(/replay/, { timeout: 30000 });
      await p2.waitForSelector('[data-testid=skip]', { timeout: 30000 });
      await p2.click('[data-testid=skip]');
      await p2.click('[data-testid=to-name]');
      await p2.click('[data-testid=save]');
      await p2.waitForSelector('[data-testid=home-sheet]');
      rows = await captureRows();
      check(rows.length === 2 && rows[1].walk_id != null, 'a note made on a walk belongs to that walk (M3)');

      // Mid-memo, the drawer stays down, Start can't be pressed, and the memo keeps recording (audit 1, NV28).
      await p2.click('[data-testid=tab-navigate]');
      await p2.click('[data-testid=moment-voice]');
      await p2.waitForSelector('[data-testid=moment-voice-save]');
      await p2.waitForTimeout(1500);
      await p2.click('[data-testid=start-options]');
      await p2.waitForTimeout(500);
      check((await p2.locator('[data-testid=start-dialog]').count()) === 0 && (await p2.locator('[data-testid=mode-quiet]').count()) === 0 && (await p2.locator('[data-testid=moment-voice-save]').isVisible())
        && (await p2.locator('[data-testid=start][aria-disabled=true]').count()) === 1,
        'opening the drawer mid-memo does nothing, Start is disabled, and the memo keeps recording (audit 1, NV28)');
      await p2.click('[data-testid=moment-voice-discard]');
      await p2.waitForSelector('[data-testid=moment-voice-undo]');
      check(true, 'a memo discarded on the home can be undone (audit 14)');

      // With no fix coming, a moment is shown at once (audit 2), then said to have no place (M2).
      await p2.evaluate(() => {
        navigator.geolocation.watchPosition = () => 999;
      });
      await note('[data-testid=moment-note]', '[data-testid=moment-note-input]', '[data-testid=moment-note-save]', 'Sale on linen, ends Friday.');
      await p2.waitForTimeout(500);
      await p2.click('[data-testid=tab-chronicle]');
      await p2.click('[data-testid=sheet-days]');
      await p2.waitForSelector('[data-testid=day-row]');
      const early = await p2.locator('[data-testid=day-row]').first().innerText();
      check(/3 moments\b/.test(early), `a moment shows in its day at once, before its fix is settled (audit 2: ${early.replace(/\n/g, ' · ')})`);
      await p2.click('[data-testid=sheet-map]');
      await p2.click('[data-testid=tab-navigate]');
      check(await p2.waitForSelector('text=/No location/', { timeout: 20000 }).then(() => true, () => false), 'a moment with no fix is kept and says "No location" (M2)');
      await p2.click('[data-testid=tab-chronicle]');
      rows = await captureRows();
      check(rows.length === 3 && rows[2].walk_id == null && rows[2].lat == null, 'the moment with no fix is stored without a place');

      // The day's timeline: moment, walk, moment, in time order; the walk is one row (M8).
      await p2.click('[data-testid=sheet-days]');
      await p2.click('[data-testid=day-row]');
      await p2.waitForSelector('[data-testid=day-title]');
      const order = await p2.locator('[data-testid=timeline-moment], [data-testid=timeline-walk]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
      check(order.join(',') === 'timeline-moment,timeline-walk,timeline-moment', `the day lists its moments and walk in time order (${order.join(', ')})`);
      check(/1 moment\b/.test(await p2.locator('[data-testid=timeline-walk]').innerText()), 'the walk is one row with its moment count (M8)');
      await p2.click('[data-testid=sheet-days-back]');
      await p2.waitForSelector('[data-testid=day-row]');
      check((await p2.locator('[data-testid=day-title]').count()) === 0, 'a day\u2019s timeline goes back to the days list (audit 11)');
      await p2.click('[data-testid=day-row]');
      await p2.waitForSelector('[data-testid=day-title]');
      await shot(p2, '21-day-timeline');
      // A moment opens in the viewer (M8).
      await p2.locator('[data-testid=timeline-moment]').first().click();
      check(await p2.waitForSelector('text=A green dress in the window.', { timeout: 5000 }).then(() => true, () => false), 'a moment in the timeline opens in the viewer');
      await p2.click('[aria-label="Close"]');

      // The day's replay: the dress, then the walk's path and its note, then the moment with no place (M10, M11, M14).
      await p2.click('[data-testid=day-replay]');
      await p2.waitForURL(/\/day\//, { timeout: 15000 });
      const seen = [];
      for (let i = 0; i < 3; i++) {
        await p2.waitForSelector('[data-testid=day-moment]', { timeout: 60000 });
        await p2.waitForTimeout(700);
        const body = await p2.locator('body').innerText();
        seen.push(/green dress/.test(body) ? 'dress' : /tailor/.test(body) ? 'tailor' : /linen/.test(body) ? `linen${/No location/.test(body) ? ':nowhere' : ''}` : '?');
        if (i === 1) await shot(p2, '22-day-replay-walk');
        await p2.click('[data-testid=day-moment]');
        await p2.waitForSelector('[data-testid=day-moment]', { state: 'detached', timeout: 5000 }).catch(() => {});
      }
      check(seen.join(',') === 'dress,tailor,linen:nowhere', `the day replays its moments in order, the walk's inside it, the placeless one said so (${seen.join(', ')})`);
      await p2.waitForSelector('[data-testid=day-card]', { timeout: 30000 });
      const line = await p2.locator('[data-testid=day-card-line]').innerText();
      const cardText = await p2.locator('[data-testid=day-card]').innerText();
      check(/^3 moments · 2 places$/.test(line) && /walked/.test(cardText) && !/streak|badge/i.test(cardText), `the day ends on a quiet card (${line})`);
      await shot(p2, '23-day-card');
      // Watching again moves on by itself (M12).
      await p2.click('[data-testid=day-again]');
      check(await p2.waitForSelector('[data-testid=day-card]', { timeout: 90000 }).then(() => true, () => false), 'watching the day again reaches the card with no taps (M12)');
      const watchedMeta = await p2.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('meta', 'readonly').objectStore('meta').getAll();
          g.onsuccess = () => resolve(g.result.some((m) => /^day_watched:/.test(m.key ?? m.k ?? '')));
        };
      }));
      check(watchedMeta, 'the day is remembered as watched (M12)');
      await p2.click('[data-testid=day-done]');

      // Back home: the placed moment shows as a pin (M16), and the walk still opens its own replay (M17).
      await p2.waitForSelector('[data-testid=day-title]');
      check(new URL(p2.url()).pathname === `${BASE}/chronicle`, 'the day replay closes back to Chronicle');
      await p2.click('[data-testid=sheet-map]');
      check(await p2.waitForSelector('[aria-label="Note. Open"]', { timeout: 15000 }).then(() => true, () => false), 'a placed moment shows as a pin on the home map (M16)');
      await p2.click('[data-testid=sheet-days]');
      await p2.click('[data-testid=day-row]');
      await p2.click('[data-testid=timeline-walk]');
      await p2.waitForURL(/\/replay\//, { timeout: 15000 });
      check(await p2.waitForSelector('[data-testid=done]', { timeout: 90000 }).then(() => true, () => false), 'a walk in the timeline opens its own replay, as before (M8, M17)');
      await ctx2.close();
    }

    // Motion (MO1, MO5, MO8): the phone's sensors say standing still while the GPS wanders indoors.
    {
      const ctx3 = await browser.newContext({
        viewport: { width: 390, height: 844 },
        permissions: ['geolocation'],
        geolocation: { longitude: start[0], latitude: start[1], accuracy: 10 },
      });
      await metricRegion(ctx3);
      await ctx3.route('https://tiles.openfreemap.org/**', tileRoute);
      await ctx3.addInitScript(() => {
        window.__perf = {};
        // As on an iPhone: motion is asked for from a tap, then samples arrive; here, a phone held still.
        window.__motionAsked = 0;
        DeviceMotionEvent.requestPermission = () => { window.__motionAsked++; return Promise.resolve('granted'); };
        setInterval(() => {
          const e = new Event('devicemotion');
          Object.assign(e, { accelerationIncludingGravity: { x: 0.02 * (Math.random() - 0.5), y: 0.02 * (Math.random() - 0.5), z: 9.81 }, acceleration: null, rotationRate: null, interval: 50 });
          window.dispatchEvent(e);
        }, 50);
      });
      const p3 = await ctx3.newPage();
      p3.on('pageerror', (e) => errors.push(`motion: ${e}`));
      p3.on('console', (m) => m.type() === 'error' && errors.push(`motion: ${m.text()}`));
      await p3.goto(navUrl);
      await p3.waitForSelector('[data-testid=start]');
      await p3.click('[data-testid=start]');
      await p3.waitForSelector('[data-testid=stop]');
      check((await p3.evaluate(() => window.__motionAsked)) === 1, 'Start asks for motion, from its own tap (MO1)');
      // A few calm fixes, then the sensors have had time to say still.
      for (let k = 0; k < 6; k++) {
        await ctx3.setGeolocation({ longitude: start[0], latitude: start[1] + k * 1e-6, accuracy: 10 });
        await p3.waitForTimeout(1000);
      }
      const puckAt = async () => (await p3.locator('[data-testid=walker-puck]').getAttribute('data-at'))?.split(',').map(Number) ?? null;
      const before = await puckAt();
      // Indoor drift: 15-25 m off, moving slowly enough to pass the speed gate.
      for (let k = 0; k < 20; k++) {
        const a = k * 0.35;
        await ctx3.setGeolocation({ longitude: start[0] + Math.sin(a) * 20 * dLon / 100, latitude: start[1] + (1 - Math.cos(a)) * 20 * dLat / 100, accuracy: 10 });
        await p3.waitForTimeout(1000);
      }
      const after = await puckAt();
      const movedM = before && after ? Math.hypot((after[0] - before[0]) / dLon * 100, (after[1] - before[1]) / dLat * 100) : Infinity;
      check(movedM < 3, `told still, the dot holds while the GPS drifts (MO5: moved ${movedM.toFixed(1)} m)`);
      const stills = await p3.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('still', 'readonly').objectStore('still').getAll();
          g.onsuccess = () => resolve(g.result);
          g.onerror = () => resolve([]);
        };
      }));
      check(stills.length >= 1 && stills[0].ended_at == null, `standing is kept with the walk as a still spell (MO8: ${stills.length})`);
      await ctx3.close();
    }

    // Starting from the tabs, in fresh browsers (NV12, NV15, NV25).
    {
      // Walk here on Explore is a one-tap start to that spot, with the saved choices; it never fills the drawer (NV12, NV15).
      const { c, pg } = await freshPage('walk-here');
      await pg.goto(navUrl);
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      await pg.click('[data-testid=tab-explore]');
      await pg.waitForSelector('[data-testid=atlas-grid]');
      await pg.waitForTimeout(1500);
      const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
      await pg.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 40);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.click('[data-testid=walk-here]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      check(await pg.waitForSelector('text=Walk started · recording', { timeout: 10000 }).then(() => true, () => false), 'Walk here on Explore starts a walk at once, recording (NV12, NV15)');
      const w = await openWalk(pg);
      const nav = JSON.parse((await metaOf(pg, 'nav')) || 'null');
      check(w && nav && nav.walk_id === w.id && nav.dest.label === 'Your spot' && (await metaOf(pg, 'explore_walk')) !== w.id,
        'it goes to that spot with the saved choices (Quiet), and the drawer’s destination is not filled (NV12)');
      await c.close();
    }
    {
      // Minimizing a walk (NV7-NV10): the walk goes on under the tabs, with a recording bar above the tab bar.
      const { c, pg } = await freshPage('minimize');
      await c.addInitScript(() => { window.__perf = {}; });
      await pg.goto(navUrl);
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      // An earlier walk's note, flagged every visit, 150 m north of the start: passed while minimized (NV8).
      const memAt = at(-0.5, 1.0);
      await pg.evaluate(({ lon, lat }) => new Promise((resolve, reject) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const tx = req.result.transaction(['capture', 'recall'], 'readwrite');
          tx.objectStore('capture').put({ id: 'old-note', walk_id: 'old-walk', t: Date.now() - 86_400_000, kind: 'text', file_path: null, body: 'The old bench by the steps', segment_id: null, lat, lon });
          tx.objectStore('recall').put({ capture_id: 'old-note', frequency: 'visit', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }), { lon: memAt[0], lat: memAt[1] });
      await pg.click('[data-testid=start]');
      await pg.waitForSelector('[data-testid=stop]');
      const w = await openWalk(pg);
      const north = async (y0, y1, each) => {
        for (let k = 0, y = y0; y <= y1 + 1e-9; k++, y += 0.05) {
          const p = at(-0.5, y);
          await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
          await pg.waitForTimeout(1000);
          if (each) await each(k, y);
        }
      };
      await north(-0.5, -0.3);
      // NV7: Minimize at the walk screen's top-left edge, away from the capture row and Stop.
      const minBox = await pg.locator('[data-testid=walk-minimize]').boundingBox();
      const capBox = await pg.locator('[data-testid=cap-photo]').boundingBox();
      check(minBox && minBox.x < 60 && minBox.y < 120 && minBox.y + minBox.height < capBox.y - 200 && (await pg.locator('[data-testid=walk-minimize]').getAttribute('aria-label')) === 'Minimize the walk',
        `the walk screen has Minimize at its top-left edge (NV7: ${minBox && `${Math.round(minBox.x)},${Math.round(minBox.y)}`})`);
      // Paused, then minimized: the bar says Paused (NV9).
      await pg.click('[data-testid=pause-walk]');
      await pg.waitForSelector('[data-testid=resume-walk]');
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      await pg.waitForTimeout(600);
      const barText = () => pg.locator('[data-testid=recording-stats]').innerText();
      const barBox = await pg.locator('[data-testid=recording-bar]').boundingBox();
      const tabBox = await pg.locator('[data-testid=tab-navigate]').boundingBox();
      check(!/\/walk/.test(new URL(pg.url()).pathname) && (await tabBarShown(pg)) && /^Paused · \d+:\d\d · \d+ m$/.test(await barText())
        && Math.abs(barBox.y + barBox.height - tabBox.y) < 6 && (await pg.locator('[data-testid=recording-bar] [data-testid=stop]').count()) === 0,
        `minimized, a recording bar sits just above the tab bar: time, distance, Paused, and no Stop (NV9: "${await barText()}")`);
      check((await pg.locator('canvas.maplibregl-canvas').count()) === 1, 'one live map with the walk minimized (NV4)');
      // The bar's camera, while paused: the photo is kept for the open walk, and the walk screen stays down (NV9).
      const photosOf = () => pg.evaluate((id) => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('capture', 'readonly').objectStore('capture').getAll();
          g.onsuccess = () => resolve(g.result.filter((x) => x.walk_id === id && x.kind === 'photo'));
        };
      }), w.id);
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=bar-photo]')]);
      await chooser.setFiles(path.join(__dirname, 'fixtures', 'photo.jpg'));
      const saidPhoto = await pg.waitForSelector('[data-testid=recording-said]', { timeout: 10000 }).then((e) => e.innerText(), () => '');
      const kept = await photosOf();
      check(saidPhoto === 'Photo saved to your walk' && kept.length === 1 && !/\/walk/.test(new URL(pg.url()).pathname),
        `a photo from the bar's camera lands in the open walk, paused too, without opening the walk screen (NV9: "${saidPhoto}", ${kept.length})`);
      // A tap on the bar returns to the walk, where the photo is pinned (NV9).
      await pg.click('[data-testid=recording-return]');
      await pg.waitForSelector('[data-testid=stop]');
      await pg.waitForTimeout(1500);
      check(/\/walk/.test(new URL(pg.url()).pathname) && (await pg.locator('[aria-label="Photo. Open"], [aria-label$="captures here. Open"]').count()) >= 1 && !(await tabBarShown(pg)),
        'a tap on the bar returns to the walk, the tab bar hidden, with the bar’s photo on its map (NV6, NV9)');
      await pg.click('[data-testid=resume-walk]');
      await pg.waitForSelector('[data-testid=pause-walk]');
      await north(-0.25, -0.2);
      await pg.waitForTimeout(2200);
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-stats]', { timeout: 10000 });
      await pg.waitForTimeout(2200);
      const m = (t) => {
        const r = /([\d.]+) (km|m)$/.exec(t);
        return r ? parseFloat(r[1]) * (r[2] === 'km' ? 1000 : 1) : NaN;
      };
      const d0 = m(await barText());
      // Minimized, it keeps recording across the tabs, each with one live map and the bar (NV4, NV8, NV9).
      const onTabs = [];
      let perfA = null;
      await north(-0.15, 1.25, async (k) => {
        if (k === 6 || k === 14 || k === 22) {
          const id = { 6: 'chronicle', 14: 'explore', 22: 'navigate' }[k];
          await pg.click(`[data-testid=tab-${id}]`);
          await pg.waitForTimeout(400);
          onTabs.push(`${id}:${await shownCount(pg, '[data-testid=recording-bar]')}:${await pg.locator('canvas.maplibregl-canvas').count()}`);
        }
        if (k === 23) perfA = { at: Date.now(), ...(await pg.evaluate(() => ({ ...window.__perf }))) };
      });
      await pg.waitForTimeout(2200);
      {
        // The bar ticks and follows the trace by itself: the tab beneath it isn't re-rendered (perf).
        const b = await pg.evaluate(() => ({ ...window.__perf }));
        const secs = (Date.now() - perfA.at) / 1000;
        const rate = (k) => ((b[k] ?? 0) - (perfA[k] ?? 0)) / secs;
        check(rate('render:navigate') <= 0.2 && rate('render:bar') <= 1.2 && rate('render:walk') === 0,
          `minimized, only the bar follows the walk (navigate ${rate('render:navigate').toFixed(2)}/s, bar ${rate('render:bar').toFixed(2)}/s over ${secs.toFixed(0)} s)`);
      }
      const d1 = m(await barText());
      check(onTabs.join(',') === 'chronicle:1:1,explore:1:1,navigate:1:1', `the bar is on every tab, with one live map (NV4, NV9: ${onTabs.join(', ')})`);
      check(d1 > d0 + 100 && /^\d+:\d\d · \d+ m$/.test(await barText()), `minimized, the walk keeps recording: the bar's distance grows (NV8: ${d0} → ${d1} m)`);
      // Remind me here keeps firing while minimized (NV8): checked outside the walk screen, shown on the bar.
      const fired = await pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('recall', 'readonly').objectStore('recall').get('old-note');
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const reminderOnBar = await pg.waitForSelector('[data-testid=recording-reminder]', { timeout: 5000 }).then((e) => e.innerText(), () => '');
      check(fired?.fired_count === 1 && fired.last_walk_id === w.id && /A note from here/.test(reminderOnBar),
        `Remind me here fires with the walk minimized, and the bar says so (NV8: ${JSON.stringify(fired && { n: fired.fired_count, walk: fired.last_walk_id === w.id })}, "${reminderOnBar}")`);
      // NV10, as changed by the tabs audit (U2): no Start with a walk open, and the recording bar is the one way back.
      check((await shownCount(pg, '[data-testid=resume]')) === 0 && (await shownCount(pg, '[data-testid=start]')) === 0 && (await shownCount(pg, '[data-testid=recording-return]')) === 1,
        'with a walk open, Navigate has no Start, and the recording bar is the way back (NV10, U2)');
      // NV10: Walk here on Explore routes the open walk there and returns to it; no second walk.
      await pg.click('[data-testid=tab-explore]');
      await pg.waitForTimeout(1500);
      {
        const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
        await pg.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 - 40);
        await pg.mouse.down();
        await pg.waitForTimeout(700);
        await pg.mouse.up();
      }
      await pg.click('[data-testid=walk-here]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      const nav = JSON.parse((await metaOf(pg, 'nav')) || 'null');
      const still = await openWalk(pg);
      const walks = await pg.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
          g.onsuccess = () => resolve(g.result.length);
        };
      }));
      const routed = await pg.waitForSelector('[data-testid=nav-bar]', { timeout: 40000 }).then(() => true, () => false);
      check(still?.id === w.id && walks === 1 && nav?.walk_id === w.id && nav.dest.label === 'Your spot' && routed,
        `with a walk open, Walk here routes that walk there and returns to it (NV10: ${walks} walk, routed ${routed})`);
      // NV7: under the navigation bar when one shows.
      const navBox = await pg.locator('[data-testid=nav-bar]').boundingBox();
      const minNav = await pg.locator('[data-testid=walk-minimize]').boundingBox();
      check(minNav.y >= navBox.y + navBox.height && minNav.x < 60, 'Minimize sits under the navigation bar while one shows (NV7)');
      // Back on the walk screen, the trace covers the stretch walked while minimized, and memories are pinned again (NV8).
      const last = at(-0.5, 1.25);
      const end = ((await pg.locator('[data-trace-end]').last().getAttribute('data-trace-end')) || '0,0').split(',').map(Number);
      const off = Math.hypot((end[0] - last[0]) / dLon, (end[1] - last[1]) / dLat) * 100;
      // The trace hides while navigating, but is still drawn underneath: its end is where the walk is.
      check(off < 20, `the trace kept growing while minimized: it ends where the walk is (NV8: ${off.toFixed(0)} m off)`);
      check(await pg.waitForSelector('[data-testid=memory-pin]', { timeout: 15000 }).then(() => true, () => false), 'memory pins show again when the walk screen returns (NV8)');
      await c.close();
    }
    await tabsAudit();
    await gapsScenario();
    {
      // Start with Explore and a destination: the walk opens exploring, heading there (NV25).
      const { c, pg } = await freshPage('start-explore');
      await pg.goto(navUrl);
      await pg.waitForSelector('[data-testid=start]');
      await pg.waitForTimeout(1500);
      await drawerTo(pg, 'half');
      await pg.click('[data-testid=mode-explore]');
      await drawerTo(pg, 'peek');
      const box = await pg.locator('canvas.maplibregl-canvas').boundingBox();
      await pg.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 3);
      await pg.mouse.down();
      await pg.waitForTimeout(700);
      await pg.mouse.up();
      await pg.waitForFunction(() => /Your spot/.test(document.querySelector('[data-testid=peek-choices]')?.textContent ?? ''), null, { timeout: 5000 });
      await pg.click('[data-testid=start]');
      await pg.waitForURL(/\/walk/, { timeout: 15000 });
      const said = await pg.waitForSelector('text=Walk started · recording', { timeout: 10000 }).then(() => true, () => false);
      const w = await openWalk(pg);
      const nav = JSON.parse((await metaOf(pg, 'nav')) || 'null');
      check(said && w && (await metaOf(pg, 'explore_walk')) === w.id && Number(await metaOf(pg, `explored:${w.id}`)) >= w.started_at - 5000 && nav?.walk_id === w.id,
        'Start with Explore and a destination opens the walk exploring, its destination saved for it, saying it is recording (NV25)');
      await pg.click('[data-testid=walk-options]');
      await pg.waitForSelector('[data-testid=options-card]');
      check(await pg.locator('[data-testid=explore-walk] input').isChecked(), 'the walk’s options card shows the same mode (NV22, NV26)');
      await c.close();
    }

    // Clearing walks and moments (D1-D11): on the first walk, which holds a photo, a memo, a video and a note.
    {
      const all = (name) => page.evaluate((n) => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction(n, 'readonly').objectStore(n).getAll();
          g.onsuccess = () => resolve(g.result);
        };
      }), name);
      const mediaKeys = () => page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('media', 'readonly').objectStore('media').getAllKeys();
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const toast = () => page.locator('[data-testid=undo-toast]').innerText().catch(() => '');
      const past = () => page.waitForTimeout(5800);
      // The ride walk's card has More, with Delete walk (D1); Escape closes it, nothing changed.
      await page.click('[data-testid=card-more]');
      await page.waitForSelector('[data-testid=action-delete]');
      await shot(page, '24-walk-actions');
      // A finished walk shares its GPS log from More, every raw reading, the ride's too (the owner, Nov 3:
      // a gap that wasn't filled could not be looked into once the walk had ended).
      await page.evaluate(() => { window.__shared = null; navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; });
      await page.waitForSelector('[data-testid=action-gps-log]', { timeout: 5000 }).catch(() => {});
      await page.click('[data-testid=action-gps-log]').catch(() => {});
      const sharedEnded = await page.waitForFunction(() => window.__shared, null, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => null);
      const endedRows = (sharedEnded?.text ?? '').split('\n');
      check(endedRows[0]?.startsWith('# Chronicles GPS log') && endedRows.filter((r) => /^\d+\.\d,/.test(r)).length >= 20,
        `a finished walk's More shares its GPS log (${endedRows.length} lines)`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-testid=walk-actions]', { state: 'detached', timeout: 5000 });
      check(true, 'the replay card offers the walk’s actions, and Escape closes them (D1)');
      await page.click('[data-testid=to-name]');
      await page.click('[data-testid=save]');
      await page.waitForSelector('[data-testid=home-sheet]');

      const first = (await all('walk')).sort((a, b) => a.started_at - b.started_at)[0];
      const capsOf = async () => (await all('capture')).filter((c) => c.walk_id === first.id);
      const sumOf = async () => (await all('walk_summary')).find((x) => x.walk_id === first.id);
      const findsBefore = (await all('find')).filter((f) => f.walk_id === first.id).length;
      await page.click('[data-testid=sheet-walks]');
      await page.waitForSelector('[data-testid=walk-row]');
      const rowsBefore = await page.locator('[data-testid=walk-row]').count();
      // Newest first: the first walk is the last row.
      await page.locator('[data-testid=walk-row]').nth(rowsBefore - 1).click();
      await page.waitForSelector('[data-testid=skip]', { timeout: 60000 });
      await page.click('[data-testid=skip]');
      await page.waitForSelector('[data-testid=done]', { timeout: 60000 });

      // D3: a moment from the card's viewer. The note is flagged to come back, so its reminder goes too.
      const noteCap = (await capsOf()).find((c) => /cardamom/.test(c.body ?? ''));
      const notesBefore = (await sumOf()).notes;
      const openNote = async () => {
        const pins = page.locator('[aria-label$=". Open"]');
        await pins.nth((await pins.count()) - 1).click();
        for (let k = 0; k < 6 && !(await page.getByText('The bakery smelled of cardamom.').count()); k++) {
          await page.click('[aria-label="Next capture"]');
          await page.waitForTimeout(300);
        }
        await page.waitForSelector('text=The bakery smelled of cardamom.');
      };
      await openNote();
      await page.click('[data-testid=viewer-more]');
      await page.click('[data-testid=viewer-delete]');
      await page.waitForSelector('[data-testid=confirm]');
      const ask = await page.locator('[data-testid=confirm]').innerText();
      check(/Delete this note\?/.test(ask) && /undo it for 5 seconds/.test(ask), `deleting a moment asks first, saying what goes (D4: ${ask.replace(/\n/g, ' · ')})`);
      await shot(page, '25-confirm-moment');
      await page.click('[data-testid=confirm-cancel]');
      check((await page.getByText('The bakery smelled of cardamom.').count()) > 0, 'Cancel keeps the moment (D4)');
      await page.click('[data-testid=viewer-more]');
      await page.click('[data-testid=viewer-delete]');
      await page.click('[data-testid=confirm-delete]');
      await page.waitForSelector('[data-testid=undo-toast]');
      check(/Note deleted/.test(await toast()) && (await page.getByText('The bakery smelled of cardamom.').count()) === 0,
        'a deleted moment leaves at once, with Undo (D3, D5)');
      await shot(page, '26-undo-moment');
      check((await capsOf()).some((c) => c.id === noteCap.id), 'nothing is stored before the 5 s are up (D5)');
      await page.click('[data-testid=undo]');
      await page.waitForTimeout(300);
      if (await page.locator('[data-testid=viewer-close]').count()) await page.click('[data-testid=viewer-close]');
      await past();
      check((await capsOf()).some((c) => c.id === noteCap.id) && (await page.locator('[data-testid=undo-toast]').count()) === 0, 'Undo brings the moment back as it was (D5)');
      await openNote();
      check(true, 'the moment is back on the map after Undo');
      await page.click('[data-testid=viewer-more]');
      await page.click('[data-testid=viewer-delete]');
      await page.click('[data-testid=confirm-delete]');
      await page.waitForSelector('[data-testid=undo-toast]');
      await past();
      if (await page.locator('[data-testid=viewer-close]').count()) await page.click('[data-testid=viewer-close]');
      const recallsLeft = (await all('recall')).filter((r) => r.capture_id === noteCap.id).length;
      check(!(await capsOf()).some((c) => c.id === noteCap.id) && recallsLeft === 0, `after 5 s the moment and its reminder are gone (D3: ${recallsLeft} reminders)`);
      check((await sumOf()).notes === notesBefore - 1, `the walk's counts follow (D9: notes ${notesBefore} → ${(await sumOf()).notes})`);

      // D2: the walk's photos, videos and memos go; the walk, its notes and its finds stay.
      const media = (await capsOf()).filter((c) => c.kind !== 'text');
      const mediaRefs = media.flatMap((c) => [c.file_path, c.thumb_path]).filter((r) => r && r !== 'none');
      check(media.length >= 3 && mediaRefs.every(Boolean), `the walk has media to remove (${media.map((c) => c.kind).join(', ')})`);
      await page.click('[data-testid=card-more]');
      await page.click('[data-testid=action-media]');
      await page.waitForSelector('[data-testid=confirm]');
      const askMedia = await page.locator('[data-testid=confirm]').innerText();
      check(/Remove photos, videos and memos\?/.test(askMedia) && /photo/.test(askMedia) && /stay/.test(askMedia), `removing media says what goes and what stays (D4: ${askMedia.replace(/\n/g, ' · ')})`);
      await page.click('[data-testid=confirm-delete]');
      await page.waitForSelector('[data-testid=undo-toast]');
      check(/Photos, videos and memos removed/.test(await toast()), 'the pill names what went (D5)');
      await past();
      const keysNow = new Set(await mediaKeys());
      const capsNow = await capsOf();
      const s2 = await sumOf();
      // Its one note went in the D3 check above, so nothing may be left but notes, if any.
      check(capsNow.every((c) => c.kind === 'text'), `only notes are left (D2: ${capsNow.length} left, ${capsNow.map((c) => c.kind).join(', ') || 'none'})`);
      check(mediaRefs.every((r) => !keysNow.has(r)), 'their files and thumbnails are gone from storage (D2)');
      check((await all('find')).filter((f) => f.walk_id === first.id).length === findsBefore, 'places they found stay found (D2)');
      check(s2.photos === 0 && (s2.videos ?? 0) === 0 && s2.voices === 0 && s2.distance_m > 0, 'the counts drop to the notes, the walk stays (D9)');
      await page.click('[data-testid=done]');
      await page.waitForSelector('[data-testid=walk-row]');

      // D1: the walk itself, from its row. Undo first, then for good.
      const deleteFirst = async () => {
        await page.locator('[data-testid=walk-more]').nth(rowsBefore - 1).click();
        await page.click('[data-testid=action-delete]');
        await page.waitForSelector('[data-testid=confirm]');
        const t = await page.locator('[data-testid=confirm]').innerText();
        await page.click('[data-testid=confirm-delete]');
        return t;
      };
      const askWalk = await deleteFirst();
      check(/Delete this walk\?/.test(askWalk) && /Its trace/.test(askWalk), `deleting a walk says what goes (D4: ${askWalk.replace(/\n/g, ' · ')})`);
      await page.waitForSelector('[data-testid=undo-toast]');
      check((await page.locator('[data-testid=walk-row]').count()) === rowsBefore - 1 && /Walk deleted/.test(await toast()), 'the walk leaves the list at once, with Undo (D1, D5)');
      await page.click('[data-testid=undo]');
      await page.waitForTimeout(300);
      check((await page.locator('[data-testid=walk-row]').count()) === rowsBefore, 'Undo brings the walk back (D5)');
      await deleteFirst();
      await past();
      const left = {
        walk: (await all('walk')).filter((w) => w.id === first.id).length,
        trace: (await all('trace_point')).filter((x) => x.walk_id === first.id).length,
        captures: (await capsOf()).length,
        visited: (await all('visited_segment')).filter((x) => x.walk_id === first.id).length,
        areas: (await all('walk_area')).filter((x) => x.walk_id === first.id).length,
        finds: (await all('find')).filter((x) => x.walk_id === first.id).length,
        summary: (await all('walk_summary')).filter((x) => x.walk_id === first.id).length,
        files: (await mediaKeys()).filter((k) => String(k).startsWith(`walks/${first.id}/`)).length,
      };
      check(Object.values(left).every((n) => n === 0), `the walk and everything tied to it are gone (D1: ${JSON.stringify(left)})`);
      check((await page.locator('[data-testid=walk-row]').count()) === rowsBefore - 1, 'it stays gone from the list (D8)');
      // D7: every later walk's new streets are counted again without it.
      const walksLeft = (await all('walk')).sort((a, b) => a.started_at - b.started_at);
      const visited = await all('visited_segment');
      const seen = new Set();
      const wrong = [];
      for (const w of walksLeft) {
        // Named streets only, as a snap counts them (audit 1).
        const keys = new Set(visited.filter((v) => v.walk_id === w.id && v.street_key.startsWith('name:')).map((v) => v.street_key));
        const fresh = [...keys].filter((k) => !seen.has(k)).length;
        keys.forEach((k) => seen.add(k));
        const sm = (await all('walk_summary')).find((x) => x.walk_id === w.id);
        if (sm && sm.new_streets !== fresh) wrong.push(`${w.id}: ${sm.new_streets} ≠ ${fresh}`);
      }
      check(wrong.length === 0, `later walks' new streets are counted again without it (D7${wrong.length ? `: ${wrong.join('; ')}` : ''})`);
    }

    const away = [...hosts].filter((h) => !h.startsWith('localhost') && h !== 'tiles.openfreemap.org');
    check(away.length === 0, `nothing is sent anywhere but the map tiles (${away.join(', ')})`);
    check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
  } catch (e) {
    console.error(e.message);
    // E2E_FAIL_SHOT=<file> saves what the page showed when it failed.
    if (process.env.E2E_FAIL_SHOT) await page.screenshot({ path: process.env.E2E_FAIL_SHOT }).catch(() => {});
    // Every other open page too (a fresh context's), beside it.
    if (process.env.E2E_FAIL_SHOT) {
      let n = 0;
      for (const c of browser.contexts()) for (const pg of c.pages()) if (pg !== page) await pg.screenshot({ path: process.env.E2E_FAIL_SHOT.replace(/(\.png)?$/, `-${++n}.png`) }).catch(() => {});
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
