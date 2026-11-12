// Quality of life: map staples (QL1-QL12, the owner's spec, Nov 3): Locate, the scale bar and the
// trace's end markers, read through the map's data attributes. E2E_ONLY=qol runs it alone.

const path = require('path');

async function run(h) {
  const { navUrl, BASE, browser, start, at, style, check, shot, drawerTo, tabTo, freshPage, scriptsDir } = h;
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

    // What is drawn around a point of the map (QL3): green pixels (the trace's colour) and the middle one,
    // read from a screenshot of the composited page, decoded in the page.
    const pixelsAround = async (p, r = 14) => {
      const [x, y] = await pg.evaluate((q) => window.__project(q), p);
      const png = await pg.screenshot({ clip: { x: x - r, y: y - r, width: 2 * r, height: 2 * r } });
      return pg.evaluate(async (b64) => {
        const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
        const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const cv = new OffscreenCanvas(bmp.width, bmp.height);
        const g = cv.getContext('2d');
        g.drawImage(bmp, 0, 0);
        const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
        const near = (i, rgb, tol) => Math.abs(d[i] - rgb[0]) + Math.abs(d[i + 1] - rgb[1]) + Math.abs(d[i + 2] - rgb[2]) <= tol;
        let green = 0;
        for (let i = 0; i < d.length; i += 4) if (near(i, [0x15, 0x80, 0x3d], 90)) green++;
        const c = ((bmp.height >> 1) * bmp.width + (bmp.width >> 1)) * 4;
        return { green, white: near(c, [255, 255, 255], 24), centre: [d[c], d[c + 1], d[c + 2]] };
      }, png.toString('base64'));
    };

    // The map's credits start closed behind their (i) button, and a tap opens them (owner, Nov 4:
    // maplibre's compact attribution opened itself across the bottom of a phone's map).
    const attribution = () => pg.evaluate(() => {
      const els = [...document.querySelectorAll('.maplibregl-ctrl-attrib')].filter((e) => !e.closest('[aria-hidden=true]'));
      const el = els[els.length - 1];
      if (!el) return null;
      const inner = el.querySelector('.maplibregl-ctrl-attrib-inner');
      return { compact: el.classList.contains('maplibregl-compact'), open: !!inner && getComputedStyle(inner).display !== 'none', text: inner ? inner.textContent : '' };
    });
    // A real two-finger turn (tend map 1): two touches swung 90° about a point in the map's top third, sent through
    // the DevTools protocol (Playwright has no multi-touch). Touch emulation is on only for the gesture. Returns the
    // map's bearing after it.
    const twoFingerTurn = async () => {
      const cdp = await c.newCDPSession(pg);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      const box = await pg.locator('xpath=//canvas[contains(@class,"maplibregl-canvas")][not(ancestor::*[@aria-hidden="true"])]').last().boundingBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 4, r = 60;
      const pts = (a) => [{ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), id: 1 }, { x: cx - r * Math.cos(a), y: cy - r * Math.sin(a), id: 2 }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(0) });
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts((i * Math.PI) / 24) });
        await pg.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      await cdp.detach();
      await pg.waitForTimeout(800);
      return Number((await attr('data-bearing')) || 0);
    };
    const checkAttribution = async (where) => {
      const a = await attribution();
      check(a && a.compact && !a.open, `map attribution: ${where} starts with its credits closed behind the (i) button (${JSON.stringify(a)})`);
      const button = pg.locator('xpath=//*[contains(@class,"maplibregl-ctrl-attrib-button")][not(ancestor::*[@aria-hidden="true"])]').last();
      // Dispatched: on Navigate the web notice banner lies over the top-right corner until dismissed.
      await button.dispatchEvent('click');
      await pg.waitForTimeout(200);
      const b = await attribution();
      check(b && b.open && /OpenStreetMap/.test(b.text), `map attribution: on ${where}, a tap on (i) shows the credits (${JSON.stringify(b)})`);
      await button.dispatchEvent('click');
      await pg.waitForTimeout(200);
    };

    // Navigate: Locate from 1 km away.
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.waitForTimeout(1500);
    await checkAttribution('Navigate');
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
    await tabTo(pg, 'explore');
    await pg.waitForTimeout(1200);
    await checkAttribution('Explore');
    const near = at(0.2, 0.3);
    await fix(near);
    const locate2 = shown('locate');
    check((await locate2.count()) === 1 && (await locate2.first().getAttribute('aria-label')) === 'Center on your position', `qol QL9: Explore shows a Locate button (${await locate2.count()})`);
    await locate2.first().click();
    await pg.waitForTimeout(2000);
    {
      // Explore frames inside its fit padding (atlas round 2: the title sits over the map): 84 px at
      // the top, 24 px at the bottom, so the fix is in the middle of the map below the title, 30 px
      // under the canvas's middle (QL10; this check measured from the canvas middle until Nov 4).
      const center = lonLat(await attr('data-center'));
      const walker = lonLat(await attr('data-walker'));
      const z = Number(await attr('data-zoom'));
      const k = center ? mpp(z, center[1]) : NaN;
      const dx = center ? ((near[0] - center[0]) * 111320 * Math.cos((center[1] * Math.PI) / 180)) / k : NaN;
      const dy = center ? -((near[1] - center[1]) * 111320) / k : NaN;
      const EXPLORE_PAD_SHIFT_PX = (84 - 24) / 2;
      check(center && Math.abs(dx) <= 3 && Math.abs(dy - EXPLORE_PAD_SHIFT_PX) <= 3 && walker && mAway(walker, near) < 5,
        `qol QL10: Explore's Locate frames the map around the fix, in the middle of the map below the title, and draws the dot (fix at canvas middle + (${dx.toFixed(1)}, ${dy.toFixed(1)}) px, ${EXPLORE_PAD_SHIFT_PX} px expected below; data-walker ${fmt(walker)})`);
      const s3 = await scaleBar();
      check(round(s3) && fits(s3), `qol QL5: Explore shows the scale bar (${describe(s3)})`);
    }
    // The compass (CP1-CP5, CP8): none at north-up; turned, it sits above Locate with its needle against
    // the turn; a tap eases the map back to north without moving the centre or zoom.
    {
      const compass = pg.locator('[data-testid=compass]').filter({ visible: true });
      const before = { c: await attr('data-center'), z: await attr('data-zoom'), b: Number(await attr('data-bearing') || 0) };
      check((await compass.count()) === 0 && Math.abs(before.b) < 1, `qol CP2, CP8: Explore opens north-up with no compass (${await compass.count()}, bearing ${before.b})`);
      await pg.evaluate(() => window.__turn(90));
      await pg.waitForTimeout(500);
      const turned = Number(await attr('data-bearing'));
      const cb = await compass.first().boundingBox().catch(() => null);
      const lb = await shown('locate').first().boundingBox().catch(() => null);
      check((await compass.count()) === 1 && Math.abs(turned - 90) < 1, `qol CP1, CP2: turned 90°, one compass shows (${await compass.count()}, bearing ${turned})`);
      check(cb && lb && cb.width === 44 && cb.height === 44 && Math.abs(cb.x - lb.x) <= 1 && cb.y + cb.height <= lb.y,
        `qol CP2: the compass is a 44 pt button directly above Locate in its column (compass ${cb && `${cb.x},${cb.y}`}, locate ${lb && `${lb.x},${lb.y}`})`);
      const angle = await pg.evaluate(() => {
        const el = document.querySelector('[data-testid=compass-needle]');
        const m = el && getComputedStyle(el).transform;
        const v = m && m.startsWith('matrix') ? m.slice(m.indexOf('(') + 1, -1).split(',').map(Number) : null;
        return v ? Math.round((Math.atan2(v[1], v[0]) * 180) / Math.PI) : null;
      });
      check(angle === -90, `qol CP3: the needle turns against the map (${angle}° for a 90° turn)`);
      check((await compass.first().getAttribute('aria-label')) === 'Point the map north', `qol CP5: the compass says "Point the map north"`);
      await compass.first().click();
      await pg.waitForTimeout(1500);
      const after = { c: await attr('data-center'), z: await attr('data-zoom'), b: Number(await attr('data-bearing')) };
      const cm = lonLat(after.c), cm0 = lonLat(before.c);
      check(Math.abs(after.b) < 0.5 && (await compass.count()) === 0, `qol CP4: a tap turns the map back to north and the compass leaves (bearing ${after.b}, ${await compass.count()} compass)`);
      check(cm && cm0 && mAway(cm, cm0) < 3 && Math.abs(Number(after.z) - Number(before.z)) < 0.05, `qol CP4: the centre and zoom stay (${mAway(cm, cm0).toFixed(1)} m, z ${before.z} → ${after.z})`);
      // A map with a compass turns under two real fingers (CP1), so the gesture below is a real turn where it is refused.
      const turnedByHand = await twoFingerTurn();
      check(Math.abs(turnedByHand) > 5, `tend map 1: two fingers turn Explore's map, which has a compass (bearing ${turnedByHand})`);
      // A fit keeps the bearing (CP1): Locate frames the fix with the map still turned.
      await shown('locate').first().click();
      await pg.waitForTimeout(2000);
      const afterLocate = Number((await attr('data-bearing')) || 0);
      check(Math.abs(afterLocate - turnedByHand) < 1 && (await compass.count()) === 1,
        `tend map 2: turned by hand, a Locate fit keeps the bearing and the compass (CP1; ${turnedByHand} → ${afterLocate}, ${await compass.count()} compass)`);
      await compass.first().click();
      await pg.waitForTimeout(1500);
    }
    await tabTo(pg, 'chronicle');
    await pg.waitForTimeout(1200);
    {
      const s4 = await scaleBar();
      const ends = await attr('data-ends');
      check(round(s4) && fits(s4), `qol QL5: Chronicle shows the scale bar (${describe(s4)})`);
      check(ends !== null && (ends === '' || ends === '|'), `qol QL1: Chronicle draws no trace, so it marks no start (data-ends ${JSON.stringify(ends)})`);
      const turnedChronicle = await twoFingerTurn();
      check(Math.abs(turnedChronicle) < 0.5, `tend map 1: Chronicle's map has no compass, so two fingers never turn it (CP1, decision 0082; bearing ${turnedChronicle})`);
    }
    await tabTo(pg, 'navigate');
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
        const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
        g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).filter((c) => c.kind === k).sort((a, b) => b.t - a.t)[0] ?? null);
      };
    }), kind);
    // A photo's pin shows its small copy, made after the pin was drawn (QL26, QL27); then a note beside it.
    await qstep('qol QL26, QL27', async () => {
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=cap-photo]')]);
      await chooser.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
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
      await pg.click('[data-testid=note-done]');
      await pg.waitForTimeout(1500);
    });
    await pg.waitForTimeout(2500);
    // Time left beside the distance (QL17, QL18), then End so the trace and its ends show as before.
    let qlNav = null;
    {
      const navLeft = pg.locator('[data-testid=nav-left]');
      await navLeft.waitFor({ timeout: 20000 }).catch(() => {});
      const text = (await navLeft.count()) ? await navLeft.innerText() : '';
      const label = (await navLeft.count()) ? await navLeft.getAttribute('aria-label') : '';
      check(/·\s*(<\s*1|\d+(\s*h\s*\d+)?)\s*min\s*·/.test(text) && /about .* left to /.test(label || ''),
        `qol QL17, QL18: the navigation bar says the time left and its label speaks it (${JSON.stringify(text)}, ${JSON.stringify(label)})`);
      // QL3: the start marker goes with the trace, which steps aside while navigating.
      const navEnds = lonLat(((await attr('data-ends')) ?? '').split('|')[0]);
      qlNav = navEnds ? { at: navEnds, opacity: await pg.locator('[data-trace-opacity]').last().getAttribute('data-trace-opacity'), px: await pixelsAround(navEnds) } : null;
      if (await pg.locator('[data-testid=nav-end]').count()) await pg.click('[data-testid=nav-end]');
      await pg.waitForTimeout(800);
    }
    {
      const ends = await attr('data-ends');
      const [a, b] = (ends ?? '').split('|');
      const startAt = lonLat(a);
      check(ends != null && startAt && mAway(startAt, s0) < 15 && !b,
        `qol QL2, QL4: a live walk marks where it began and has no end marker (data-ends ${JSON.stringify(ends)}, start ${startAt ? mAway(startAt, s0).toFixed(1) : '-'} m from the first fix)`);
      // QL3: drawn above the trace that starts under it (its middle is the marker's white, not the line's
      // green, with its green ring round it); while navigating, neither marker nor trace was drawn.
      const px = startAt ? await pixelsAround(startAt) : null;
      check(qlNav && qlNav.opacity === '0' && qlNav.px.green <= 3 && px && px.white && px.green >= 30,
        `qol QL3: the start marker sits above the trace and goes with it while navigating (navigating: ${JSON.stringify(qlNav && { opacity: qlNav.opacity, ...qlNav.px })}; after End: ${JSON.stringify(px)})`);
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
      const turnedReplay = await twoFingerTurn();
      check(Math.abs(turnedReplay) < 0.5, `tend map 1: the replay's map has no compass, so two fingers never turn it (CP1, decision 0082; bearing ${turnedReplay})`);
    }
    await shot(pg, 'qol-03-replay-card');
    // QL3: the markers never take a tap: the photo and the note were kept where the trace ends, so their
    // pin stands on the end marker, and a tap there opens it.
    await qstep('qol QL3 tap', async () => {
      const endAt = lonLat(((await attr('data-ends')) ?? '').split('|')[1]);
      const [x, y] = await pg.evaluate((q) => window.__project(q), endAt);
      const hit = await pg.evaluate(([px, py]) => {
        const el = document.elementFromPoint(px, py);
        const pin = el && el.closest('[aria-label$=". Open"]');
        return pin ? pin.getAttribute('aria-label') : el ? el.tagName.toLowerCase() : null;
      }, [x, y - 4]);
      await pg.mouse.click(x, y - 4);
      const opened = await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 5000 }).then(() => true, () => false);
      check(opened && /Open$/.test(hit ?? ''), `qol QL3: a tap on a pin over the end marker opens the pin (${JSON.stringify(hit)}, viewer ${opened})`);
      if (opened) await pg.click('[data-testid=viewer-close]');
      await pg.waitForTimeout(400);
    });

    // A note edited from the replay's viewer reads the new words when opened again (QL24, QL25).
    const openNote = async () => {
      await pg.locator('[aria-label$="captures here. Open"], [aria-label="Note. Open"]').last().click();
      await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 });
      for (let i = 0; i < 4; i++) {
        if (await pg.locator('[data-testid=viewer-more]').count()) {
          const onNote = await pg.evaluate(() => !!document.querySelector('[data-testid=viewer-close]') && /First words on the corner\.|Edited on the replay\./.test(document.body.innerText));
          if (onNote) {
            // Back keeps what was written (note pages NP9), so the note may read on past its first sentence.
            const shownNote = await pg.locator('text=/^(First words on the corner|Edited on the replay)\./').first().isVisible().catch(() => false);
            if (shownNote) return;
          }
        }
        const next = pg.locator('[aria-label="Next moment"]');
        if (!(await next.count())) return;
        await next.first().click();
        await pg.waitForTimeout(400);
      }
    };
    await qstep('qol QL24, QL25', async () => {
      await openNote();
      // Edit is in the viewer's toolbar (decision 0114).
      const item = pg.locator('[data-testid=viewer-edit-note]');
      await item.waitFor({ timeout: 5000 });
      await item.click();
      const input = pg.locator('[data-testid=note-input]');
      await input.waitFor({ timeout: 5000 });
      const prefilled = (await input.innerText()).trim();
      // A page emptied while open never stores an empty body (note pages NP9): a pause leaves the words as they were.
      await input.fill('');
      await pg.waitForTimeout(1600);
      const kept = await capRow('text');
      const blankRefused = !!kept && kept.body === 'First words on the corner.';
      await input.fill('Edited on the replay.');
      await pg.click('[data-testid=note-done]');
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

    // tend chronicle 1: Escape with the @ picker open closes the picker alone; the editor keeps what was typed,
    // the @ as typed (RF1), as Escape steps out of the Rename editor before its sheet (QL22).
    await qstep('tend chronicle 1', async () => {
      await openNote();
      await pg.click('[data-testid=viewer-edit-note]');
      const input = pg.locator('[data-testid=note-input]');
      await input.waitFor({ timeout: 5000 });
      await input.click();
      await input.press('End');
      await pg.keyboard.type(' and @');
      await pg.waitForSelector('[data-testid=moment-picker]', { timeout: 5000 });
      await pg.waitForTimeout(800);
      await shot(pg, 'qol-05-note-mention');
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(600);
      const after = {
        picker: await pg.locator('[data-testid=moment-picker]').count(),
        editor: await pg.locator('[data-testid=note-page]').count(),
        text: (await pg.locator('[data-testid=note-input]').count()) ? (await input.innerText()).trim() : null,
      };
      check(after.picker === 0 && after.editor === 1 && after.text === 'Edited on the replay. and @',
        `tend chronicle 1: Escape closes the @ picker alone, and the note editor keeps its words (${JSON.stringify(after)})`);
      if (after.editor) await pg.click('[data-testid=note-done]');
      await pg.waitForTimeout(300);
      if (await pg.locator('[data-testid=viewer-close]').count()) await pg.click('[data-testid=viewer-close]');
      await pg.waitForTimeout(400);
    });

    // The reminder bell on the replay's pin (RB1, RB5, RB6, RB7): Remind me here puts it on the same
    // pin element at once (reminder-bell audit 3), and Stop takes it off.
    await qstep('qol RB1, RB5, RB6, RB7', async () => {
      const bells = () => pg.locator('[data-ids] [data-testid=pin-reminder]').count();
      const before = await bells();
      await openNote();
      await pg.evaluate(() => document.querySelectorAll('[data-ids]').forEach((e) => { e.__beforeBell = true; }));
      await pg.click('[data-testid=viewer-more]');
      await pg.click('[data-testid=viewer-remind]');
      await pg.click('[data-testid=remind-save]');
      await pg.waitForSelector('[data-testid=capture-meta] >> text=/Reminder set/', { timeout: 5000 });
      await pg.waitForSelector('[data-ids] [data-testid=pin-reminder]', { timeout: 5000 }).catch(() => null);
      const belled = pg.locator('[data-ids]:has([data-testid=pin-reminder])');
      const set = { n: await belled.count(), kept: await belled.evaluateAll((els) => els.every((e) => e.__beforeBell === true)), label: (await belled.count()) ? await belled.first().getAttribute('aria-label') : '' };
      await pg.click('[data-testid=viewer-more]');
      await pg.click('[data-testid=viewer-remind]');
      await pg.click('[data-testid=remind-stop]');
      await pg.waitForFunction(() => !document.querySelector('[data-testid=pin-reminder]'), null, { timeout: 5000 }).catch(() => null);
      const after = await bells();
      check(before === 0 && set.n === 1 && set.kept && /reminder set\. Open$/.test(set.label) && after === 0,
        `qol RB1, RB5, RB6, RB7: the replay's note pin wears the bell once reminded, on the same element, says so, and loses it on Stop (before ${before}, set ${JSON.stringify(set)}, after ${after})`);
      await pg.click('[data-testid=viewer-close]');
      await pg.waitForTimeout(400);
    });

    // Chronicle: the walks list under this month's header (QL28); the walk renamed from its row (QL22, QL23).
    await qstep('qol QL22, QL23, QL28', async () => {
      await pg.click('[data-testid=not-now]');
      await h.mapUp(pg);
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

    // tend chronicle 6: the walk's More and its Rename editor are pictured for the review (ui-patterns, "How it
    // is checked": a shot for each state, a menu or sheet open included).
    await qstep('tend chronicle 6', async () => {
      await pg.locator('[data-testid=walk-more]').first().click();
      await pg.waitForSelector('[data-testid=action-rename]', { timeout: 10000 });
      await pg.waitForTimeout(800);
      await shot(pg, 'qol-04a-walk-actions');
      await pg.click('[data-testid=action-rename]');
      await pg.locator('[data-testid=rename-title]').waitFor({ timeout: 5000 });
      await pg.waitForTimeout(800);
      await shot(pg, 'qol-04b-rename-editor');
      await pg.click('[data-testid=rename-cancel]');
      await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 5000 });
      await pg.click('[data-testid=actions-cancel]');
      await pg.waitForSelector('[data-testid=walk-actions]', { state: 'detached', timeout: 5000 });
      check(true, 'tend chronicle 6: the walk\'s More and its Rename editor are pictured');
    });

    // inbox T2: the editor opens weeks after the walk as often as just after it, so its line asks for words, not for a
    // feeling still fresh; the first replay keeps its own (chronicle journey). Its own step, which closes the editor
    // whatever it finds, so a failure is named for itself and leaves nothing open (tend chronicle audit 2).
    await qstep('tend chronicle T2', async () => {
      await pg.locator('[data-testid=walk-more]').first().click();
      await pg.click('[data-testid=action-rename]');
      await pg.locator('[data-testid=rename-title]').waitFor({ timeout: 5000 });
      try {
        const lineLabel = await pg.evaluate(() => ({
          shown: document.getElementById('rename-epilogue-label')?.textContent ?? '',
          spoken: document.querySelector('[data-testid=rename-epilogue]')?.getAttribute('aria-label') ?? '',
        }));
        check(lineLabel.shown === 'One line, in your own words' && lineLabel.spoken === 'One line, in your own words',
          `tend chronicle T2: Rename's line reads "One line, in your own words", shown and spoken (${JSON.stringify(lineLabel)})`);
      } finally {
        // tend chronicle audit 2: the editor and its menu close whatever the check found.
        await pg.click('[data-testid=rename-cancel]').catch(() => {});
        await pg.click('[data-testid=actions-cancel]').catch(() => {});
        await pg.waitForSelector('[data-testid=walk-actions]', { state: 'detached', timeout: 5000 });
      }
    });

    // tend chronicle 4: Escape steps out of the Rename editor to the walk's menu, and a second Escape closes the
    // menu, never one Escape for both (QL22: "Escape, Back and the backdrop step out of the editor before the sheet").
    await qstep('tend chronicle 4', async () => {
      await pg.locator('[data-testid=walk-more]').first().click();
      await pg.click('[data-testid=action-rename]');
      await pg.locator('[data-testid=rename-title]').waitFor({ timeout: 5000 });
      await pg.waitForTimeout(800);
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(600);
      const once = { editor: await pg.locator('[data-testid=rename-editor]').count(), menu: await pg.locator('[data-testid=walk-actions]').count() };
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(600);
      const twice = { menu: await pg.locator('[data-testid=walk-actions]').count(), sheet: await pg.locator('[data-testid=walk-row]').count() };
      check(once.editor === 0 && once.menu === 1 && twice.menu === 0 && twice.sheet > 0,
        `tend chronicle 4: Escape steps out of the Rename editor to the walk's menu, then closes the menu (${JSON.stringify({ once, twice })})`);
      if (twice.menu) await pg.click('[data-testid=actions-cancel]');
    });

    // tend chronicle audit 2: Escape pressed while the walk's More is still fading in closes it, as it did before
    // tend chronicle 4 (the Modal sends Escape only once its fade has ended).
    await qstep('tend chronicle audit 2', async () => {
      await pg.locator('[data-testid=walk-more]').first().click();
      await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 5000 });
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(800);
      const left = { menu: await pg.locator('[data-testid=walk-actions]').count(), sheet: await pg.locator('[data-testid=walk-row]').count() };
      check(left.menu === 0 && left.sheet > 0, `tend chronicle audit 2: Escape during the menu's fade-in closes it, and only it (${JSON.stringify(left)})`);
      if (left.menu) await pg.click('[data-testid=actions-cancel]');
    });

    // tend chronicle 8: the sheet's Walks and Days segments are 44 px targets (X0, docs/research/ui-references.md).
    await qstep('tend chronicle 8', async () => {
      const sizes = await Promise.all(['sheet-walks', 'sheet-days'].map((id) => shown(id).first().boundingBox().then((b) => b && Math.round(b.height))));
      check(sizes.every((h) => h >= 44), `tend chronicle 8: the sheet's Walks and Days are 44 px tall at least (${JSON.stringify(sizes)})`);
    });

    // tend chronicle 5: the title's return key (Next) goes on to the line, in Rename as in the first replay's name.
    await qstep('tend chronicle 5', async () => {
      await pg.locator('[data-testid=walk-more]').first().click();
      await pg.click('[data-testid=action-rename]');
      await pg.locator('[data-testid=rename-title]').waitFor({ timeout: 5000 });
      await pg.waitForTimeout(800);
      await pg.locator('[data-testid=rename-title]').press('Enter');
      await pg.waitForTimeout(300);
      const focused = await pg.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);
      check(focused === 'rename-epilogue', `tend chronicle 5: Next in Rename's title goes on to the line (focus on ${focused})`);
      await pg.click('[data-testid=rename-cancel]');
      await pg.click('[data-testid=actions-cancel]');
      await pg.waitForSelector('[data-testid=walk-actions]', { state: 'detached', timeout: 5000 });
    });
    await c.close();

    // Location denied (QL19): a browser that refuses position requests. The "Not recording" chip is a
    // button that brings the recorder's notice back after it was dismissed.
    {
      const { c: c2, pg: pg2 } = await freshPage('qol-denied', { permissions: [] });
      await pg2.goto(navUrl);
      await pg2.waitForSelector('[data-testid=start]');
      // QL21: Navigate's own fix as it comes to the front is refused, quietly: no banner, no chip. Locate
      // is the loud path: its tap says why.
      const deniedSaid = () => pg2.getByText(/Location permission was denied|Couldn.t find your position/).count();
      await pg2.waitForTimeout(3000);
      const quiet = { banners: await deniedSaid(), chip: await pg2.locator('[data-testid=status-chip]').count() };
      await pg2.locator('xpath=//*[@data-testid="locate"][not(ancestor::*[@aria-hidden="true"])]').first().click();
      await pg2.waitForTimeout(2500);
      const loud = await deniedSaid();
      check(quiet.banners === 0 && quiet.chip === 0 && loud >= 1,
        `qol QL21: denied, Navigate's own fix on focus stays quiet; Locate says why (on focus ${JSON.stringify(quiet)}, after Locate ${loud})`);
      for (let i = 0; i < 4 && (await pg2.locator('[data-testid=banner-dismiss]').count()); i++) {
        await pg2.locator('[data-testid=banner-dismiss]').first().click();
        await pg2.waitForTimeout(300);
      }
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
}

module.exports = {
  name: 'qol',
  // tend chronicle 7: Rename (QL22) and Edit note (QL24) are checked here, so a change to either names this journey.
  covers: [
    'src/components/{LocateButton,CompassButton,HomeSheet,CaptureView,CapturePinView,WalkActions}.tsx',
    'src/components/map/**',
    'src/app/(tabs)/index.tsx',
    'src/lib/{scaleBar,units,useUnits,useLocate,rename,noteEdit,months,pins,thumbPlan,thumbJob,walkTitle,useReminded}.ts',
      'src/lib/unitsStore/**',
    'src/lib/nav/eta.ts',
  ],
  run,
};
