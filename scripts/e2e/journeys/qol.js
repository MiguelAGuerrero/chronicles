// Quality of life: map staples (QL1-QL12, the owner's spec, Nov 3): Locate, the scale bar and the
// trace's end markers, read through the map's data attributes. E2E_ONLY=qol runs it alone.

const path = require('path');

// The map's credits start closed behind their (i) button, and a real tap on it opens them (owner, Nov 4: maplibre's
// compact attribution opened itself across the bottom of a phone's map). Tapped where a finger would tap, never
// dispatched in code (tend map 3: the (i) lay under the walk's strip, the replay's card, Locate and the camera, and a
// dispatched click never noticed). Opened, they cover no control; closed again after.
function creditsChecks({ check, shot }) {
  const credits = (page) => page.evaluate(() => {
    const els = [...document.querySelectorAll('.maplibregl-ctrl-attrib')].filter((e) => !e.closest('[aria-hidden=true]'));
    const el = els[els.length - 1];
    if (!el) return null;
    const inner = el.querySelector('.maplibregl-ctrl-attrib-inner');
    const b = el.querySelector('.maplibregl-ctrl-attrib-button');
    const r = b ? b.getBoundingClientRect() : null;
    const x = r ? r.left + r.width / 2 : NaN;
    const y = r ? r.top + r.height / 2 : NaN;
    // What a finger at the centre, and 18 px each way from it (a 44 px target), would touch.
    const on = (px, py) => {
      const hit = document.elementFromPoint(px, py);
      return !!hit && (hit === b || b.contains(hit));
    };
    const box = el.getBoundingClientRect();
    // The controls the open credits would lie over (any button outside the map's own DOM).
    const under = [...document.querySelectorAll('[data-testid]')]
      .filter((c) => !c.closest('[aria-hidden=true]') && !el.contains(c) && (c.tagName === 'BUTTON' || c.getAttribute('role') === 'button'))
      .filter((c) => {
        const q = c.getBoundingClientRect();
        return q.width > 0 && q.left < box.right && q.right > box.left && q.top < box.bottom && q.bottom > box.top;
      })
      .map((c) => c.getAttribute('data-testid'));
    // Each line of the open credits, and what a finger at its middle would touch: nothing may lie over them (tend map
    // audit 1: Explore's hint covered their middle line). And a word split across two lines (tend map audit 2).
    const lines = [];
    const broken = [];
    if (inner && getComputedStyle(inner).display !== 'none') {
      const range = document.createRange();
      range.selectNodeContents(inner);
      for (const q of range.getClientRects()) {
        if (q.width < 1) continue;
        const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
        lines.push({ y: Math.round(q.top), top: !!hit && el.contains(hit), on: hit && !el.contains(hit) ? (hit.closest('[data-testid]')?.getAttribute('data-testid') ?? hit.textContent.slice(0, 24)) : null });
      }
      const walker = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        for (const m of t.textContent.matchAll(/\S+/g)) {
          const w = document.createRange();
          w.setStart(t, m.index);
          w.setEnd(t, m.index + m[0].length);
          const tops = new Set([...w.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
          if (tops.size > 1) broken.push(m[0]);
        }
      }
    }
    return {
      lines,
      broken,
      // The (i) wears the app's ring only from the keyboard; a tap leaves no glow (tend map audit 3).
      glow: b ? getComputedStyle(b).boxShadow : null,
      // Nothing of the credits is cut: no line runs wider than the box (tend map 3, at 320 px).
      whole: !inner || inner.scrollWidth <= inner.clientWidth + 1,
      compact: el.classList.contains('maplibregl-compact'),
      open: !!inner && getComputedStyle(inner).display !== 'none',
      text: inner ? inner.textContent : '',
      x, y,
      // The (i)'s place in the map, from its bottom-left corner: the map's pane can move or resize while a screen settles.
      map: (() => {
        const m = el.closest('.maplibregl-map')?.getBoundingClientRect();
        return m ? { left: m.left, bottom: m.bottom, dx: x - m.left, dy: m.bottom - y } : null;
      })(),
      top: r ? on(x, y) : false,
      target: r ? [[-18, 0], [18, 0], [0, -18], [0, 18]].every(([dx, dy]) => on(x + dx, y + dy)) : false,
      box: [Math.round(box.left), Math.round(box.top), Math.round(box.right), Math.round(box.bottom)],
      under,
    };
  });
  return async (page, where, shotName) => {
    const a = await credits(page);
    check(a && a.compact && !a.open, `map attribution: ${where} starts with its credits closed behind the (i) button (${JSON.stringify(a && { compact: a.compact, open: a.open })})`);
    if (!a) return;
    check(a.top && a.target, `tend map 3: on ${where}, nothing covers the map's credits (i), and its target is 44 px (at ${Math.round(a.x)},${Math.round(a.y)}: centre ${a.top}, 44 px ${a.target})`);
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(300);
    const b = await credits(page);
    check(b && b.open && /OpenStreetMap/.test(b.text), `map attribution: on ${where}, a tap on (i) shows the credits (${JSON.stringify(b && { open: b.open, text: b.text })})`);
    check(b && b.under.length === 0 && b.whole, `tend map 3: on ${where}, the open credits lie over no control and none of their words is cut (box ${b && b.box}; under ${JSON.stringify(b && b.under)}; whole ${b && b.whole})`);
    check(b && b.lines.length > 0 && b.lines.every((l) => l.top), `tend map audit 1: on ${where}, every line of the open credits is the top element at its point (${JSON.stringify(b && b.lines)})`);
    check(b && b.broken.length === 0, `tend map audit 2: on ${where}, no word of the open credits breaks across two lines (${JSON.stringify(b && b.broken)})`);
    const placed = (q) => (q && q.map ? `${Math.round(q.map.dx)},${Math.round(q.map.dy)}` : 'none');
    check(b && a.map && b.map && Math.abs(b.map.dx - a.map.dx) < 1.5 && Math.abs(b.map.dy - a.map.dy) < 1.5,
      `tend map audit 2: on ${where}, the (i) stays where it was tapped in the map as the credits open (from the map's bottom left: ${placed(a)} → ${placed(b)})`);
    check(b && (!b.glow || b.glow === 'none'), `tend map audit 3: on ${where}, a tap leaves the (i) with no focus glow (${b && b.glow})`);
    if (shotName) await shot(page, shotName);
    // A second tap where the first one was, in the map, closes them again.
    if (b) await page.mouse.click(b.map ? b.map.left + a.map.dx : a.x, b.map ? b.map.bottom - a.map.dy : a.y);
    await page.waitForTimeout(300);
    const c = await credits(page);
    check(c && !c.open, `tend map audit 2: on ${where}, a second tap at the opening point closes the credits (open ${c && c.open})`);
  };
}

// tend map audit 22-24 (the T14 review's F4, F5, U1, U2; decision 0154): pins of several of every shape, at 390 and
// 320 (two photos, three notes, a voice memo and a video, a photo and a note), the same faint as memories, and a bell
// on each. A walk of its own in a fresh page, so the steps before it change nothing here.
async function pinsOfSeveral(h, pg8, c8, { check, shot }) {
  const { navUrl, at, scriptsDir } = h;
  const go = async (x, y) => {
    const p = at(x, y);
    await c8.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg8.waitForTimeout(900);
  };
  const take = async (file, saved) => {
    const [chooser] = await Promise.all([pg8.waitForEvent('filechooser'), pg8.click('[data-testid=cap-photo]')]);
    await chooser.setFiles(path.join(scriptsDir, 'fixtures', file));
    await pg8.waitForSelector(`text=${saved}`, { timeout: 20000 }).catch(() => null);
    await pg8.waitForTimeout(1500);
  };
  const note = async (text) => {
    await pg8.click('[data-testid=cap-note]');
    await pg8.fill('[data-testid=note-input]', text);
    await pg8.click('[data-testid=note-done]');
    await pg8.waitForTimeout(1500);
  };
  const voice = async () => {
    await pg8.click('[data-testid=cap-voice]');
    await pg8.waitForSelector('[data-testid=voice-save]');
    await pg8.waitForTimeout(2500);
    await pg8.click('[data-testid=voice-save]');
    await pg8.waitForTimeout(1500);
  };
  // Every pin of several on the map: its name, its head's colour, its discs' colours and boxes, the bell's box, the
  // opacity each is seen at (its own times every ancestor's, up to the marker), any digit or video mark.
  const several = (memory) => pg8.$$eval(memory ? '.maplibregl-map [data-testid=memory-pin][data-ids*=","]' : '.maplibregl-map button[data-ids*=","]:not([data-testid=memory-pin])', (els) => els.map((el) => {
    const seen = (n) => { let o = 1; for (let e = n; e && e !== el; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const head = el.querySelector('[data-testid=pin-head]');
    const discs = [...el.querySelectorAll('[data-testid=pin-kind]')];
    const bell = el.querySelector('[data-testid=pin-reminder]');
    return {
      label: el.getAttribute('aria-label'),
      head: head && getComputedStyle(head).backgroundColor,
      headSeen: head && Math.round(seen(head) * 100) / 100,
      discs: discs.map((d) => ({ bg: getComputedStyle(d).backgroundColor, seen: Math.round(seen(d) * 100) / 100, box: box(d) })),
      bell: box(bell),
      digits: /\d/.test(el.textContent || ''),
      videoMark: !!el.querySelector('[data-testid=pin-video-mark]'),
      thumb: !!el.querySelector('[data-testid=pin-thumb]'),
    };
  }));
  const MIXED = 'rgb(63, 63, 70)';

  await pg8.goto(navUrl);
  await pg8.waitForSelector('[data-testid=start]');
  await pg8.waitForTimeout(1500);
  await go(-0.5, -0.5);
  await pg8.click('[data-testid=start]');
  await pg8.waitForSelector('[data-testid=stop]');
  for (let i = 1; i <= 5; i++) await go(-0.5, -0.5 + i * 0.04);
  // Two photos; 140 m on, three notes; 140 m on, a voice memo and a video; 140 m on, a photo and a note, reminded.
  await take('photo.jpg', 'Photo saved here');
  await take('photo.jpg', 'Photo saved here');
  for (let i = 1; i <= 35; i++) await go(-0.5 + i * 0.04, -0.3);
  await note('One.');
  await note('Two.');
  await note('Three.');
  for (let i = 1; i <= 35; i++) await go(0.9, -0.3 + i * 0.04);
  await voice();
  await take('clip-4s.webm', 'Video saved here');
  for (let i = 1; i <= 35; i++) await go(0.9 - i * 0.04, 1.1);
  await take('photo.jpg', 'Photo saved here');
  await note('Four.');
  await go(-0.5, 1.14);
  await pg8.waitForTimeout(2500);

  // tend map audit 22: every pin of several on the neutral head, its two discs in their kinds' colours; one kind twice;
  // no numeral; and a pin of two videos (or a video and a memo) has no still and no video mark (VS3, VS4 are one moment's).
  const walkPins = await several(false);
  const want = [/^Two photos, .+\. Open$/, /^Three notes, .+\. Open$/, /^A voice memo and a video, .+\. Open$/, /^A photo and a note, .+\. Open$/];
  check(want.every((re) => walkPins.some((p) => re.test(p.label)))
    && walkPins.length === 4 && walkPins.every((p) => p.head === MIXED && p.discs.length === 2 && p.discs.every((d) => d.bg !== MIXED) && !p.digits && !p.videoMark && !p.thumb),
    `tend map audit 22: every pin of several is the neutral head with two discs of its kinds, one kind twice, no numeral, no still or video mark (${JSON.stringify(walkPins.map((p) => ({ label: p.label, head: p.head, discs: p.discs.map((d) => d.bg), digits: p.digits, videoMark: p.videoMark, thumb: p.thumb })))})`);
  await shot(pg8, 'qol-15-pins-several-390');
  await pg8.setViewportSize({ width: 320, height: 640 });
  await pg8.waitForTimeout(1500);
  await shot(pg8, 'qol-15-pins-several-320');
  await pg8.setViewportSize({ width: 390, height: 844 });
  await pg8.waitForTimeout(1000);

  // Stop; then a second walk past the first one's pins brings them back as memories.
  const b = await pg8.locator('[data-testid=stop]').boundingBox();
  await pg8.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await pg8.mouse.down();
  await pg8.waitForTimeout(1100);
  await pg8.mouse.up();
  await pg8.waitForURL(/replay/, { timeout: 30000 });
  await pg8.waitForSelector('[data-testid=skip]', { timeout: 30000 });
  await pg8.click('[data-testid=skip]');
  await pg8.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
  await pg8.waitForTimeout(1500);
  await shot(pg8, 'qol-17-pins-several-replay');
  await pg8.goto(navUrl);
  await pg8.waitForSelector('[data-testid=start]');
  await pg8.waitForTimeout(1500);
  await go(-0.5, -0.5);
  await pg8.click('[data-testid=start]');
  await pg8.waitForSelector('[data-testid=stop]');
  for (let i = 1; i <= 5; i++) await go(-0.5, -0.5 + i * 0.04);
  for (let i = 1; i <= 20; i++) await go(-0.5 + i * 0.04, -0.3);
  await pg8.waitForSelector('[data-testid=memory-pin][data-ids*=","]', { timeout: 15000 }).catch(() => null);
  await pg8.waitForTimeout(1500);

  // tend map audit 23: on a memory, the discs keep their full opacity at the faint pin's size; the head stays faded.
  const faint = await several(true);
  check(faint.length >= 1 && faint.every((p) => p.headSeen === 0.55 && p.discs.length === 2 && p.discs.every((d) => d.seen === 1) && /^Memories: /.test(p.label) && !p.digits),
    `tend map audit 23: a memory pin of several shows its discs solid over its faded head (${JSON.stringify(faint.map((p) => ({ label: p.label, head: p.headSeen, discs: p.discs.map((d) => d.seen) })))})`);
  await shot(pg8, 'qol-18-memory-several-390');
  await pg8.setViewportSize({ width: 320, height: 640 });
  await pg8.waitForTimeout(1500);
  await shot(pg8, 'qol-18-memory-several-320');
  await pg8.setViewportSize({ width: 390, height: 844 });
  await pg8.waitForTimeout(1000);
}

async function run(h) {
  const { navUrl, exploreUrl, BASE, browser, start, at, style, check, shot, drawerTo, tabTo, freshPage, scriptsDir } = h;
    const creditsCheck = creditsChecks(h);
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
    // Thousands marked ("2,000 km", tend map 7).
    const round = (s) => !!s && /^(1|2|5)0*$/.test(String(s.m)) && s.label === (s.m >= 1000 ? `${(s.m / 1000).toLocaleString('en-US')} km` : `${s.m} m`);
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

    // A real two-finger turn (tend map 1): two touches swung 90° about a point in the map's top third, sent through
    // the DevTools protocol (Playwright has no multi-touch). Touch emulation is on only for the gesture. Returns the
    // map's bearing after it.
    const twoFingerTurn = async () => {
      const cdp = await c.newCDPSession(pg);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      const box = await pg.locator('xpath=//canvas[contains(@class,"maplibregl-canvas")][not(ancestor::*[@aria-hidden="true"])]').last().boundingBox();
      const r = 60;
      let cx = box.x + box.width / 2, cy = box.y + box.height / 4;
      const pts = (a) => [{ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), id: 1 }, { x: cx - r * Math.cos(a), y: cy - r * Math.sin(a), id: 2 }];
      // Both touches land on the map's canvas, so a bearing of 0 after them is a refused turn, never a missed one: the
      // first spot down the map's middle where nothing (a pin, a marker, a card) lies under them (tend map audit 7).
      const hits = (ps) => pg.evaluate((qs) => qs.map((q) => {
        const el = document.elementFromPoint(q.x, q.y);
        return el?.classList.contains('maplibregl-canvas') ? null : (el?.closest('[data-testid]')?.getAttribute('data-testid') ?? el?.className?.toString().slice(0, 30) ?? 'nothing');
      }), ps);
      let off = [];
      for (const f of [1 / 4, 1 / 3, 1 / 5, 2 / 5, 1 / 6]) {
        cy = box.y + box.height * f;
        off = (await hits([...pts(0), ...pts(Math.PI / 2)])).filter(Boolean);
        if (!off.length) break;
      }
      check(!off.length, `tend map audit 7: the two-finger turn's touches land on the map's canvas (centre ${Math.round(cx)},${Math.round(cy)}; on ${JSON.stringify(off)})`);
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
    const checkAttribution = (where, shotName) => creditsCheck(pg, where, shotName);

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
    // Locate from the keyboard keeps the focus through its busy state and after (tend map 5; WCAG 2.2, 2.4.3).
    {
      const btn = shown('locate').first();
      await btn.focus();
      const seen = new Set();
      const read = () => pg.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName ?? null);
      // Locate's busy state is seen, however briefly, so the focus is held through it (tend map audit 7).
      await pg.evaluate(() => {
        window.__busySeen = false;
        const o = new MutationObserver(() => {
          if (document.querySelector('[data-testid=locate][aria-busy=true]')) window.__busySeen = true;
        });
        o.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-busy'], childList: true });
        window.__busyWatch = o;
      });
      await pg.keyboard.press('Enter');
      for (let i = 0; i < 20; i++) {
        seen.add(await read());
        await pg.waitForTimeout(50);
      }
      await pg.waitForTimeout(1500);
      seen.add(await read());
      check(seen.size === 1 && seen.has('locate'), `tend map 5: Locate pressed from the keyboard keeps the focus while it reads the fix and after (${JSON.stringify([...seen])})`);
      const busySeen = await pg.evaluate(() => { window.__busyWatch?.disconnect(); return window.__busySeen; });
      check(busySeen === true, `tend map audit 7: Locate said busy (aria-busy="true") while it read the fix (${busySeen})`);
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
      const rendersBefore = await pg.evaluate(() => window.__perf['render:explore'] ?? 0);
      const turnedByHand = await twoFingerTurn();
      const turnRenders = (await pg.evaluate(() => window.__perf['render:explore'] ?? 0)) - rendersBefore;
      // Each half degree of the turn is reported; only the compass reads it (tend map 8: Explore re-rendered for each).
      check(turnRenders <= 3, `tend map 8: a two-finger turn re-renders the compass, not Explore (${turnRenders} Explore renders over the turn)`);
      check(Math.abs(turnedByHand) > 5, `tend map 1: two fingers turn Explore's map, which has a compass (bearing ${turnedByHand})`);
      // A fit keeps the bearing (CP1): Locate frames the fix with the map still turned.
      await shown('locate').first().click();
      await pg.waitForTimeout(2000);
      const afterLocate = Number((await attr('data-bearing')) || 0);
      check(Math.abs(afterLocate - turnedByHand) < 1 && (await compass.count()) === 1,
        `tend map 2: turned by hand, a Locate fit keeps the bearing and the compass (CP1; ${turnedByHand} → ${afterLocate}, ${await compass.count()} compass)`);
      // From the keyboard, the compass leaves (CP4) and hands the focus to Locate below it, never to the page.
      await compass.first().focus();
      await pg.keyboard.press('Enter');
      await pg.waitForTimeout(1500);
      const focusedAfter = await pg.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName ?? null);
      check((await compass.count()) === 0 && focusedAfter === 'locate', `tend map 6: the compass pressed from the keyboard leaves and the focus goes to Locate below it (focus on ${focusedAfter}, ${await compass.count()} compass)`);
      // A fit while the compass still eases the map north ends north-up: Enter on the compass, then at once on Locate,
      // which now has the focus (tend map audit 4: the fit read the bearing mid-ease and froze the map part-way).
      const turnedAgain = await twoFingerTurn();
      await compass.first().focus();
      await pg.keyboard.press('Enter');
      await pg.keyboard.press('Enter');
      await pg.waitForTimeout(2500);
      const midEase = Number((await attr('data-bearing')) || 0);
      check(Math.abs(turnedAgain) > 5 && Math.abs(midEase) < 0.5 && (await compass.count()) === 0,
        `tend map audit 4: a Locate fit during the compass's turn to north ends north-up (turned ${turnedAgain}, after ${midEase}, ${await compass.count()} compass)`);
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
      await checkAttribution('Chronicle');
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
    // The live walk's compass (no journey reached it, the compass spec's record): the column's top; pressed from the
    // keyboard, it leaves and hands the focus to the button below it (tend map 6).
    {
      const compassW = pg.locator('[data-testid=compass]').filter({ visible: true });
      await pg.evaluate(() => window.__turn(45));
      await pg.waitForTimeout(600);
      const shownW = await compassW.count();
      await shot(pg, 'qol-02a-walk-compass');
      // The button below the compass in this state: Walk me back while it shows, else the unwalked switch (tend map audit 7).
      const expectW = (await pg.locator('[data-testid=walk-back]').filter({ visible: true }).count()) ? 'walk-back' : 'unwalked';
      if (shownW) {
        await compassW.first().focus();
        await pg.keyboard.press('Enter');
        await pg.waitForTimeout(1500);
      }
      const focusedW = await pg.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName ?? null);
      check(shownW === 1 && (await compassW.count()) === 0 && focusedW === expectW,
        `tend map 6: on the walk, turned, the compass shows; pressed from the keyboard it leaves and the focus goes to the column's next button (shown ${shownW}, focus on ${focusedW}, expected ${expectW}; tend map audit 7)`);
    }
    await checkAttribution('the walk screen', 'qol-06-walk-credits-open');

    // Stopped: both ends, and the bar above the card.
    await holdStop();
    {
      const ends = await attr('data-ends');
      const [a, b] = (ends ?? '').split('|');
      const startAt = lonLat(a);
      const endAt = lonLat(b);
      check(startAt && endAt && mAway(startAt, s0) < 15 && mAway(endAt, last) < 15,
        `qol QL2: the replay marks the start and the end of the trace (data-ends ${JSON.stringify(ends)}: start ${startAt ? mAway(startAt, s0).toFixed(1) : '-'} m, end ${endAt ? mAway(endAt, last).toFixed(1) : '-'} m off)`);
      // tend map T16: shape tells the two apart, not colour alone: the start's middle is white (hollow), the end's
      // the walked colour (solid). The pins and the walker are DOM markers over the end, hidden for the read.
      if (startAt && endAt) {
        // The markers come back whatever the read does (tend map audit 8): a read that throws left them all hidden.
        const markersHidden = async (read) => {
          await pg.evaluate(() => document.querySelectorAll('.maplibregl-marker').forEach((m) => { m.style.visibility = 'hidden'; }));
          try { return await read(); } finally {
            await pg.evaluate(() => document.querySelectorAll('.maplibregl-marker').forEach((m) => { m.style.visibility = ''; }));
          }
        };
        const hiddenNow = () => pg.evaluate(() => [...document.querySelectorAll('.maplibregl-marker')].filter((m) => m.style.visibility === 'hidden').length);
        const thrown = await markersHidden(async () => { throw new Error('a read that fails'); }).then(() => false, () => true);
        const left = await hiddenNow();
        const [pxStart, pxEnd] = await markersHidden(async () => [await pixelsAround(startAt), await pixelsAround(endAt)]);
        const leftAfter = await hiddenNow();
        check(thrown && left === 0 && leftAfter === 0,
          `tend map audit 8: after the ends read every marker is visible again, a failed read too (hidden after a throw ${left}, after the read ${leftAfter})`);
        const walked = [0xc2, 0x41, 0x0c];
        const nearWalked = (c) => Math.abs(c[0] - walked[0]) + Math.abs(c[1] - walked[1]) + Math.abs(c[2] - walked[2]) <= 60;
        check(pxStart.white && !pxEnd.white && nearWalked(pxEnd.centre),
          `tend map T16: the start is hollow (white middle) and the end solid in the walked colour (start ${JSON.stringify(pxStart.centre)}, end ${JSON.stringify(pxEnd.centre)})`);
      }
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
    await checkAttribution('the replay', 'qol-07-replay-credits-open');
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
      await pg.locator('.maplibregl-map button[data-ids*=","]:not([data-testid=memory-pin]), [aria-label="Note. Open"]').last().click();
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

    // Note types (NY6, NY9, NY10, NY11): the page's Type tool and menu, the card's mark, the pin's label, in one ink.
    await qstep('note-types NY6, NY9, NY10, NY11', async () => {
      await openNote();
      const bare = await pg.locator('[data-testid=note-type-mark]').count();
      await pg.click('[data-testid=viewer-edit-note]');
      await pg.locator('[data-testid=note-page]').waitFor({ timeout: 5000 });
      const row = pg.locator('[data-testid=note-type-row]');
      const rowBefore = (await row.count()) ? await row.getAttribute('aria-label') : '';
      if (await row.count()) await row.click();
      const pressed = (await row.count()) ? await row.getAttribute('aria-pressed') : null;
      const items = await pg.locator('[data-testid^=note-type-item-]').count();
      const colours = await pg.evaluate(() => [...new Set([...document.querySelectorAll('[data-testid^=note-type-glyph-]')].map((e) => getComputedStyle(e).color))]);
      // note-types audit 8: the menu reads down its columns (No type to Happy, then Neutral to Dislike), the chosen row tinted.
      const boxes = {};
      for (const id of ['none', 'question', 'emphasis', 'idea', 'happy', 'neutral', 'sad', 'like', 'dislike']) boxes[id] = await pg.locator(`[data-testid=note-type-item-${id}]`).boundingBox().catch(() => null);
      const colA = ['none', 'question', 'emphasis', 'idea', 'happy'].map((i) => boxes[i]);
      const colB = ['neutral', 'sad', 'like', 'dislike'].map((i) => boxes[i]);
      const down = (col) => col.every((b, i) => b && (i === 0 || (Math.abs(b.x - col[0].x) < 2 && b.y > col[i - 1].y)));
      const tint = await pg.evaluate(() => getComputedStyle(document.querySelector('[data-testid=note-type-item-none]')).backgroundColor);
      check(down(colA) && down(colB) && colB[0].x > colA[0].x && Math.abs(colB[0].y - colA[0].y) < 2 && tint !== 'rgba(0, 0, 0, 0)',
        `note-types audit 8: the Type menu reads down its columns and tints the chosen row (${JSON.stringify([colA.map((b) => b && Math.round(b.y)), colB.map((b) => b && Math.round(b.y)), tint])})`);
      // note-types audit 20: the chosen row is marked by a heavier label and an ink check as well as the tint.
      const chosenRow = await pg.evaluate(() => {
        const row = document.querySelector('[data-testid=note-type-item-none]');
        const label = [...row.querySelectorAll('div')].find((e) => e.children.length === 0 && (e.textContent || '').trim() === 'No type');
        const check = document.querySelector('[data-testid=note-type-check]');
        return { weight: label ? Number(getComputedStyle(label).fontWeight) : 0, check: check ? getComputedStyle(check).color : null };
      });
      check(chosenRow.weight >= 600 && chosenRow.check === 'rgb(29, 36, 48)', `note-types audit 20: the chosen row has a heavier label and an ink check (${JSON.stringify(chosenRow)})`);
      // note-types audit 9: on a small phone with the menu open, the whole menu and the page's bar stay in view.
      const vp = pg.viewportSize();
      await pg.setViewportSize({ width: 320, height: 520 });
      await pg.waitForTimeout(500);
      const inView = await pg.evaluate(() => {
        const m = document.querySelector('[data-testid=note-type-menu]').getBoundingClientRect();
        const b = document.querySelector('[data-testid=note-bar]').getBoundingClientRect();
        return { menuTop: Math.round(m.top), menuRight: Math.round(m.right), barBottom: Math.round(b.bottom), h: window.innerHeight, w: window.innerWidth };
      });
      await pg.setViewportSize(vp);
      await pg.waitForTimeout(400);
      check(inView.menuTop >= 0 && inView.barBottom <= inView.h && inView.menuRight <= inView.w, `note-types audit 9: at 320 x 520 with the menu open, the menu and the bar stay in view (${JSON.stringify(inView)})`);
      await shot(pg, 'qol-06-note-type-menu');
      if (items) await pg.click('[data-testid=note-type-item-idea]');
      await pg.waitForTimeout(300);
      const focusedAfter = await pg.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-testid'));
      check(focusedAfter === 'note-type-row', `note-types audit 21: choosing a type returns focus to the Type row (${focusedAfter})`);
      const rowAfter = (await row.count()) ? await row.getAttribute('aria-label') : '';
      await pg.click('[data-testid=note-done]');
      await pg.waitForTimeout(800);
      const mark = pg.locator('[data-testid=note-type-mark]');
      const markText = (await mark.count()) ? await mark.first().innerText() : '';
      const markLabel = (await mark.count()) ? await mark.first().getAttribute('aria-label') : '';
      const nameStyle = await pg.evaluate(() => {
        const el = [...document.querySelectorAll('[data-testid=note-type-mark] *')].find((e) => /^Idea$/.test((e.textContent || '').trim()) && e.children.length === 0 && getComputedStyle(e).fontFamily && e.tagName !== 'I');
        if (!el) return null;
        const st = getComputedStyle(el);
        return { color: st.color, size: parseFloat(st.fontSize) };
      });
      await shot(pg, 'qol-07-note-type-card');
      await pg.click('[data-testid=viewer-close]');
      await pg.waitForTimeout(600);
      // The note shares its pin with the photo, so the pin says its group's kinds, not the type (NY10); since tend map T14
      // (decision 0154) its head shows the two kinds fanned with no numeral, and its name says them in words with the
      // minutes in, never "2 captures here".
      const several = await pg.$$eval('.maplibregl-map button[data-ids*=","]:not([data-testid=memory-pin])', (es) => es.map((e) => ({
        label: e.getAttribute('aria-label'), kinds: e.querySelectorAll('[data-testid=pin-kind]').length, digits: /\d/.test(e.textContent || ''),
      })));
      const pin = several.filter((p) => /^A photo and a note, (at the start|.+ minutes? in)\. Open$/.test(p.label) && p.kinds === 2 && !p.digits).length;
      check(bare === 0 && /Type/.test(rowBefore) && /No type/.test(rowBefore) && items === 9 && /Idea/.test(rowAfter),
        `NY6: the note page's Type tool opens a menu of eight and "No type", and shows the choice (bare ${bare}, row ${JSON.stringify(rowBefore)}, items ${items}, after ${JSON.stringify(rowAfter)})`);
      check(/Idea/.test(markText) && markLabel === 'Idea',
        `NY9: the viewer's note card shows the type's mark and its spoken name, none without a type (${JSON.stringify([markText, markLabel])})`);
      check(pin >= 1, `NY10, tend map T14: a pin that holds the typed note and a photo shows the two kinds fanned, no numeral, and says "A photo and a note" with the minutes in (${JSON.stringify(several)})`);
      check(pressed === 'true', `note-types ui 1: the Type tool shows pressed while its menu is open, so it reads as a control (${pressed})`);
      check(!!nameStyle && nameStyle.color === 'rgb(29, 36, 48)' && nameStyle.size >= 14, `note-types ui 2: the mark's name is in ink and 14 px or more (${JSON.stringify(nameStyle)})`);
      check(items === 9 && colours.length === 1 && markLabel === 'Idea',
        `NY11: every glyph is drawn in one ink colour and each has its spoken name (${JSON.stringify(colours)})`);
      // Back to no type, so the steps after this one meet the note as before (NY8).
      await openNote();
      await pg.click('[data-testid=viewer-edit-note]');
      await pg.locator('[data-testid=note-type-row]').click().catch(() => null);
      await pg.click('[data-testid=note-type-item-none]').catch(() => null);
      await pg.click('[data-testid=note-done]').catch(() => null);
      await pg.waitForTimeout(600);
      const cleared = await pg.locator('[data-testid=note-type-mark]').count();
      check(cleared === 0, `NY8: choosing "No type" clears the mark (${cleared})`);
      await pg.click('[data-testid=viewer-close]').catch(() => null);
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

    // tend map 3 at 320 px: the credits stay reachable, and open over no control, on every map of a narrow phone.
    {
      const { c: c3, pg: p3 } = await freshPage('qol-320');
      await p3.setViewportSize({ width: 320, height: 700 });
      const fix3 = (p) => c3.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
      await fix3(s0);
      await p3.goto(navUrl);
      await p3.waitForSelector('[data-testid=start]');
      await p3.waitForTimeout(2500);
      await creditsCheck(p3, 'Navigate at 320', 'qol-08-ready-credits-open-320');
      await p3.click('[data-testid=start]');
      await p3.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
      for (let k = 1; k <= 4; k++) {
        await fix3(at(-0.5 + k * 0.05, -0.5));
        await p3.waitForTimeout(900);
      }
      await p3.waitForTimeout(1500);
      await creditsCheck(p3, 'the walk screen at 320', 'qol-09-walk-credits-open-320');
      const sb = await p3.locator('[data-testid=stop]').boundingBox();
      await p3.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await p3.mouse.down();
      await p3.waitForTimeout(1100);
      await p3.mouse.up();
      await p3.waitForURL(/replay/, { timeout: 30000 });
      await p3.waitForSelector('[data-testid=skip]', { timeout: 30000 });
      await p3.click('[data-testid=skip]');
      await p3.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await p3.waitForTimeout(1200);
      await creditsCheck(p3, 'the replay at 320', 'qol-10-replay-credits-open-320');
      await p3.goto(navUrl);
      await p3.waitForTimeout(2500);
      await tabTo(p3, 'explore');
      await p3.waitForTimeout(2500);
      await creditsCheck(p3, 'Explore at 320', 'qol-11-explore-credits-open-320');
      await tabTo(p3, 'chronicle');
      await p3.waitForTimeout(2500);
      await creditsCheck(p3, 'Chronicle at 320');
      await c3.close();
    }

    // tend map T17 (decision 0154): a refused location is a quiet notice in ink, never the red fault, in the owner's words,
    // every word of it on screen; and with no fix and no tiles drawn, no scale bar over the blank world ("2,000 km").
    const T17_WORDS = 'Location is off for this site. Turn it on in the browser’s settings to see where you are.';
    // tend recording T26 (decision 0162): Start's refusal, Locate's line with its own end.
    const T26_WORDS = 'Location is off for this site. Turn it on in the browser’s settings to record a walk.';
    // The region's text as written, the zero-width space a repeat adds kept (tend recording audit 4).
    const rawSaid = (page, id) => page.evaluate((id) => [...document.querySelectorAll(`[data-testid=${id}]`)].map((e) => e.textContent), id);
    const saidIn = (page, id) => page.evaluate((id) => [...document.querySelectorAll(`[data-testid=${id}]`)].map((e) => ({ live: e.getAttribute('aria-live'), text: e.textContent.replace(/\u200B/g, '') })), id);
    // The quiet notice holding `words`, read from the page: its role and live region, its colours, and each line of its
    // words from the browser's own line boxes (getClientRects), none cut.
    const readNotice = (page, words) => page.evaluate((words) => {
      const shown = (el) => !el.closest('[aria-hidden=true]') && el.getBoundingClientRect().width > 0;
      const banner = [...document.querySelectorAll('[data-testid=lift-in]')].filter(shown).find((b) => b.innerText.includes(words));
      const bars = [...document.querySelectorAll('[data-testid=scale-bar]')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.innerText);
      if (!banner) return { banner: null, bars, texts: [...document.querySelectorAll('[data-testid=lift-in]')].map((b) => b.innerText) };
      const text = [...banner.querySelectorAll('div')].find((d) => d.innerText.trim() === words && !d.querySelector('div'));
      const box = banner.getBoundingClientRect();
      // Each line of the words, from the browser's own line boxes: none cut by the banner or the screen's edge.
      const range = document.createRange();
      if (text) range.selectNodeContents(text);
      const lines = text ? [...range.getClientRects()].filter((q) => q.width > 0) : [];
      const cut = lines.filter((q) => q.left < box.left - 0.5 || q.right > box.right + 0.5 || q.top < box.top - 0.5 || q.bottom > box.bottom + 0.5 || q.right > window.innerWidth || q.left < 0);
      const textColor = text ? getComputedStyle(text).color : null;
      return {
        banner: { role: banner.getAttribute('role'), live: banner.getAttribute('aria-live'), bg: getComputedStyle(banner).backgroundColor, color: textColor },
        lines: lines.length,
        cut: cut.length,
        bars,
      };
    }, words);
    const isQuiet = (b) => !!b && b.role !== 'alert' && b.live === 'polite' && b.bg === 'rgb(255, 247, 230)' && b.color !== 'rgb(180, 35, 24)';
    const deniedNotice = async (page, where, { blank }) => {
      const seen = await readNotice(page, T17_WORDS);
      const b = seen.banner;
      // The error banner is #fdecea with the danger red's text; the quiet notice is the app's notice, dark amber on cream (#fff7e6).
      check(isQuiet(b) && seen.lines >= 1 && seen.cut === 0,
        `tend map T17: ${where}, Locate refused says "${T17_WORDS}" as a quiet notice, not an alert in red, every line whole (${JSON.stringify(seen)})`);
      if (blank) check(seen.bars.length === 0, `tend map T17: ${where}, with no fix and no tiles drawn, no scale bar over a blank world (${JSON.stringify(seen.bars)})`);
      else check(seen.bars.length === 1, `tend map T17: ${where}, with no fix but the tiles drawn, the scale bar stays (${JSON.stringify(seen.bars)})`);
    };

    // Location denied (QL19): a browser that refuses position requests. The "Not recording" chip is a
    // button that brings the recorder's notice back after it was dismissed.
    {
      const { c: c2, pg: pg2 } = await freshPage('qol-denied', { permissions: [] });
      await pg2.goto(navUrl);
      await pg2.waitForSelector('[data-testid=start]');
      // QL21: Navigate's own fix as it comes to the front is refused, quietly: no banner, no chip. Locate
      // is the loud path: its tap says why.
      const deniedSaid = () => pg2.getByText(/Location is off for this site|Couldn.t find your position/).count();
      await pg2.waitForTimeout(3000);
      const quiet = { banners: await deniedSaid(), chip: await pg2.locator('[data-testid=status-chip]').count() };
      await pg2.locator('xpath=//*[@data-testid="locate"][not(ancestor::*[@aria-hidden="true"])]').first().click();
      await pg2.waitForTimeout(2500);
      const loud = await deniedSaid();
      await shot(pg2, 'qol-13-locate-denied');
      check(quiet.banners === 0 && quiet.chip === 0 && loud >= 1,
        `qol QL21: denied, Navigate's own fix on focus stays quiet; Locate says why (on focus ${JSON.stringify(quiet)}, after Locate ${loud})`);
      // The fake streets draw at the world's zoom (a speck): tiles drawn, so the bar stays.
      await deniedNotice(pg2, 'Navigate at 390', { blank: false });
      for (let i = 0; i < 4 && (await pg2.locator('[data-testid=banner-dismiss]').count()); i++) {
        await pg2.locator('[data-testid=banner-dismiss]').first().click();
        await pg2.waitForTimeout(300);
      }
      await pg2.waitForTimeout(800);
      // tend recording T26 (decision 0162): Start refused says Locate's line with its own end, quietly, in the same slot,
      // and the polite region kept on screen says it to a screen reader (as tend map audit 12).
      await pg2.click('[data-testid=start]');
      await pg2.waitForTimeout(3000);
      const startSeen = await readNotice(pg2, T26_WORDS);
      const startSaid = await saidIn(pg2, 'ready-said');
      await shot(pg2, 'qol-13b-start-denied');
      check(isQuiet(startSeen.banner) && startSeen.lines >= 1 && startSeen.cut === 0 && startSaid.length === 1 && startSaid[0].text === T26_WORDS
        && (await pg2.getByText(/Location permission was denied/).count()) === 0,
        `tend recording T26: Navigate at 390, Start refused says "${T26_WORDS}" as a quiet notice, not an alert in red, every line whole, and the live region says it (${JSON.stringify({ ...startSeen, said: startSaid })})`);
      await c2.close();
    }

    // QL19 and tend recording T26: a walk whose location is refused once it is open (permission taken back, the page
    // reloaded) shows the "Not recording" chip, a button whose tap brings the recorder's quiet notice back after a
    // dismissal, in Start's words; the walk's live region says it. At 390 and 320.
    for (const [w, hgt] of [[390, 844], [320, 700]]) {
      const { c: c5, pg: pg5 } = await freshPage(`qol-denied-walk-${w}`);
      await pg5.setViewportSize({ width: w, height: hgt });
      await pg5.goto(navUrl);
      await pg5.waitForSelector('[data-testid=start]');
      await pg5.waitForTimeout(1500);
      await pg5.click('[data-testid=start]');
      await pg5.waitForSelector('[data-testid=walk-minimize]', { timeout: 20000 });
      await pg5.waitForTimeout(1500);
      await c5.clearPermissions();
      await pg5.reload();
      const chip = pg5.locator('[data-testid=status-chip]');
      await chip.waitFor({ timeout: 20000 }).catch(() => {});
      await pg5.waitForTimeout(1500);
      const notice = () => pg5.locator('[data-testid=lift-in]', { hasText: T26_WORDS });
      const firstSeen = await readNotice(pg5, T26_WORDS);
      const firstSaid = await saidIn(pg5, 'walk-said');
      await shot(pg5, `qol-13c-walk-not-recording-${w}`);
      const dismiss = pg5.locator('[data-testid=banner-dismiss]');
      if (await dismiss.count()) await dismiss.first().click();
      await pg5.waitForTimeout(400);
      const gone = (await notice().count()) === 0;
      const goneSaid = await saidIn(pg5, 'walk-said');
      if (await chip.count()) await chip.first().click();
      await pg5.waitForTimeout(600);
      const back = await notice().count();
      const backSaid = await saidIn(pg5, 'walk-said');
      check((await chip.count()) === 1 && (await chip.first().getAttribute('role')) === 'button' && (await chip.first().getAttribute('aria-label')) === 'Not recording. Why?' && !!firstSeen.banner && gone && back === 1,
        `qol QL19: ${w}, denied, the Not recording chip is a button whose tap brings the notice back (first ${!!firstSeen.banner}, dismissed ${gone}, back ${back})`);
      check(isQuiet(firstSeen.banner) && firstSeen.lines >= 1 && firstSeen.cut === 0
        && firstSaid.length === 1 && firstSaid[0].live === 'polite' && firstSaid[0].text === T26_WORDS && goneSaid[0]?.text === '' && backSaid[0]?.text === T26_WORDS,
        `tend recording T26: the walk at ${w}, Not recording says "${T26_WORDS}" quietly, every line whole, and the live region says it each time it shows (${JSON.stringify({ ...firstSeen, said: [firstSaid, goneSaid, backSaid] })})`);
      // tend recording audit 4: a second tap of the chip with the notice still up is said again: the region's text changes.
      const upRaw = await rawSaid(pg5, 'walk-said');
      if (await chip.count()) await chip.first().click();
      await pg5.waitForTimeout(600);
      const againRaw = await rawSaid(pg5, 'walk-said');
      check(upRaw.length === 1 && againRaw.length === 1 && againRaw[0] !== upRaw[0] && againRaw[0].replace(/\u200B/g, '') === T26_WORDS,
        `tend recording audit 4: at ${w}, the chip's tap with the notice up changes the walk's live region, so it is said again (${JSON.stringify([upRaw, againRaw])})`);
      await c5.close();
    }

    // tend recording audit 1-3: the same refusal is the same quiet notice, said, wherever a walk is asked for: Resume on a
    // paused walk (never "Could not resume: ..."), Walk here on Explore, and Walk here on Chronicle. Location is granted
    // first, so the screens have a fix and the map is near, then taken back before the tap. At 390 and 320.
    const noOldWords = async (page) => (await page.getByText(/Could not resume|Location permission was denied/).count()) === 0;
    const longPress = async (page) => {
      const box = await page.locator('canvas.maplibregl-canvas').filter({ visible: true }).last().boundingBox();
      await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 - 40);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
    };
    for (const [w, hgt] of [[390, 844], [320, 700]]) {
      {
        const { c: c6, pg: pg6 } = await freshPage(`qol-resume-refused-${w}`);
        await pg6.setViewportSize({ width: w, height: hgt });
        await pg6.goto(navUrl);
        await pg6.waitForSelector('[data-testid=start]');
        await pg6.waitForTimeout(1500);
        await pg6.click('[data-testid=start]');
        await pg6.waitForSelector('[data-testid=pause-walk]', { timeout: 20000 });
        await pg6.waitForTimeout(1500);
        await pg6.click('[data-testid=pause-walk]');
        await pg6.waitForSelector('[data-testid=resume-walk]', { timeout: 10000 });
        await pg6.waitForTimeout(800);
        await c6.clearPermissions();
        await pg6.click('[data-testid=resume-walk]');
        await pg6.waitForTimeout(3000);
        const seen = await readNotice(pg6, T26_WORDS);
        const said = await saidIn(pg6, 'walk-said');
        const old = await noOldWords(pg6);
        await shot(pg6, `qol-13d-resume-refused-${w}`);
        check(isQuiet(seen.banner) && seen.lines >= 1 && seen.cut === 0 && old && said.length === 1 && said[0].text === T26_WORDS,
          `tend recording audit 1: at ${w}, a refused Resume is the quiet notice in Start's words, said, never "Could not resume" (${JSON.stringify({ ...seen, said, old })})`);
        await c6.close();
      }
      // tend recording audit 2: Walk here on Explore; tend recording audit 3: Walk here on Chronicle, with a region of its own.
      for (const [tab, region, name] of [['explore', 'atlas-snap-said', 'Explore'], ['chronicle', 'chronicle-said', 'Chronicle']]) {
        const { c: c7, pg: pg7 } = await freshPage(`qol-walk-here-refused-${tab}-${w}`);
        await pg7.setViewportSize({ width: w, height: hgt });
        await pg7.goto(navUrl);
        await pg7.waitForSelector('[data-testid=start]');
        await pg7.waitForTimeout(1500);
        await tabTo(pg7, tab);
        await pg7.waitForTimeout(3000);
        if (tab === 'chronicle') {
          // Chronicle offers Walk here only at street zoom (NV12); with no walks its map shows the world, so zoom in first.
          const box = await pg7.locator('canvas.maplibregl-canvas').filter({ visible: true }).last().boundingBox();
          await pg7.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - 40);
          for (let i = 0; i < 30; i++) {
            await pg7.mouse.wheel(0, -600);
            await pg7.waitForTimeout(120);
          }
          await pg7.waitForTimeout(1500);
        }
        await c7.clearPermissions();
        await longPress(pg7);
        await pg7.locator('[data-testid=walk-here]').filter({ visible: true }).first().click({ timeout: 10000 }).catch(() => {});
        await pg7.waitForTimeout(600);
        if (await pg7.locator('[data-testid=spot-walk-now]').filter({ visible: true }).count()) await pg7.locator('[data-testid=spot-walk-now]').filter({ visible: true }).first().click();
        await pg7.waitForTimeout(3000);
        const seen = await readNotice(pg7, T26_WORDS);
        const said = await saidIn(pg7, region);
        const old = await noOldWords(pg7);
        await shot(pg7, `qol-13${tab === 'explore' ? 'e' : 'f'}-${tab}-walk-here-refused-${w}`);
        check(isQuiet(seen.banner) && seen.lines >= 1 && seen.cut === 0 && old && said.length === 1 && said[0].text === T26_WORDS,
          `tend recording audit ${tab === 'explore' ? 2 : 3}: ${name} at ${w}, Walk here refused is the quiet notice in Start's words and its live region says it (${JSON.stringify({ ...seen, said, old })})`);
        await c7.close();
      }
    }

    // tend map T17: Locate refused on Navigate and Explore, at 390 and 320, with no tiles drawn (the tile host's style
    // holds no streets, as when nothing has loaded): the same quiet notice, and no scale bar over the blank world.
    for (const [screen, url] of [['Navigate', navUrl], ['Explore', exploreUrl]]) {
      for (const [w, hgt] of [[390, 844], [320, 700]]) {
        const { c: c4, pg: pg4 } = await freshPage(`qol-denied-${screen}-${w}`, { permissions: [] });
        await c4.route('https://tiles.openfreemap.org/**', (r) => {
          const u = r.request().url();
          if (/\.pbf$/.test(u) || u.endsWith('/planet')) return r.fallback();
          return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...style, sources: { openmaptiles: { ...style.sources.openmaptiles, data: { type: 'FeatureCollection', features: [] } } } }) });
        });
        await pg4.setViewportSize({ width: w, height: hgt });
        await pg4.goto(url);
        await pg4.waitForTimeout(4000);
        // tend map audit 12: the quiet notice is no alert, so a polite live region kept on screen says the refusal; one
        // inserted with its words already in it is often never read.
        const saidId = screen === 'Navigate' ? 'ready-said' : 'atlas-snap-said';
        const said = () => pg4.evaluate((id) => [...document.querySelectorAll(`[data-testid=${id}]`)].map((e) => ({ live: e.getAttribute('aria-live'), text: e.textContent.replace(/\u200B/g, '') })), saidId);
        const saidBefore = await said();
        await pg4.locator('xpath=//*[@data-testid="locate"][not(ancestor::*[@aria-hidden="true"])]').first().click();
        await pg4.waitForTimeout(2500);
        const saidAfter = await said();
        check(saidBefore.length === 1 && saidBefore[0].live === 'polite' && !saidBefore[0].text.includes(T17_WORDS) && saidAfter.length === 1 && saidAfter[0].text === T17_WORDS,
          `tend map audit 12: ${screen} at ${w}, a polite live region on screen before the tap says the refusal after it (before ${JSON.stringify(saidBefore)}, after ${JSON.stringify(saidAfter)})`);
        await shot(pg4, `qol-14-${screen.toLowerCase()}-locate-denied-${w}`);
        await deniedNotice(pg4, `${screen} at ${w}`, { blank: true });
        await c4.close();
      }
    }

    // tend map audit 22: pins of several, in a walk of their own.
    {
      const { c: c8, pg: pg8 } = await freshPage('qol-pins');
      try {
        await pinsOfSeveral(h, pg8, c8, { check, shot });
      } catch (e) {
        check(false, `tend map audit 22: ${String(e.message).split('\n')[0]}`);
      }
      await c8.close();
    }
}

module.exports = {
  name: 'qol',
  // tend chronicle 7: Rename (QL22) and Edit note (QL24) are checked here, so a change to either names this journey.
  covers: [
    'src/components/{LocateButton,CompassButton,HomeSheet,CaptureView,CapturePinView,WalkActions,NoteMark}.tsx',
    'src/components/notePage/{NotePage,NoteTypeMenu}.tsx',
    'src/components/map/**',
    'src/app/(tabs)/index.tsx',
    'src/lib/{scaleBar,units,useUnits,useLocate,rename,noteEdit,noteType,months,pins,thumbPlan,thumbJob,walkTitle,useReminded}.ts',
      'src/lib/unitsStore/**',
    'src/lib/nav/eta.ts',
  ],
  run,
};
