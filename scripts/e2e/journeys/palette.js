// The map's palette, Earth and ink (map-palette MP1-MP14, decision 0188; the owner's answers to T22, Nov 17): one walk
// with a pin of each kind kept apart (a photo, a stacked moment of two photos, a video, a voice memo, a note) and a
// photo, a video and a note on the end (a pin of several); then the card's map, beat one's lit streets, the replay's
// stage (a memo, a note, a video's tile) and Explore, at 390 and 320 px; then a short walk beside a town's border, its
// edge and tint read on the replay's card (tend map T33). Colours are read from their source, so the checks hold whatever
// the palette is. E2E_ONLY=palette.

const fs = require('fs');
const path = require('path');

const SRC = path.join(path.dirname(module.filename), '..', '..', '..', 'src');
const MAP_TYPES = fs.readFileSync(path.join(SRC, 'components', 'map', 'types.ts'), 'utf8');
/** A colour of `COLORS` in map/types.ts as [r, g, b], or null. */
function paletteRgb(key) {
  const block = /export const COLORS = \{([\s\S]*?)\n\};/.exec(MAP_TYPES);
  const m = block && new RegExp(`\\n\\s*${key}: '#([0-9a-fA-F]{6})'`).exec(block[1]);
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
}
/** A named number of map/types.ts (the drawn opacities), or null. */
function mapNumber(name) {
  const m = new RegExp(`export const ${name} = ([0-9.]+);`).exec(MAP_TYPES);
  return m ? Number(m[1]) : null;
}
const ACCENT = [0xc2, 0x41, 0x0c];
const css = (c) => (c ? `rgb(${c.join(', ')})` : null);
const near = (a, b, tol) => !!a && !!b && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= tol;
const over = (top, under, a) => top.map((v, i) => Math.round(v * a + under[i] * (1 - a)));

async function run(h) {
  const { navUrl, at, scriptsDir, freshPage, shot, check, tabTo, toStop } = h;
  const { c, pg } = await freshPage('palette', { permissions: ['geolocation', 'microphone'] });
  // The map's projection for the pixel reads (`window.__project`), defined only when the page asks for perf counts.
  await c.addInitScript(() => { window.__perf = {}; });
  const fixtures = path.join(scriptsDir, 'fixtures');
  const go = async (x, y, wait = 700) => {
    const p = at(x, y);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(wait);
  };
  let here = [-0.5, -0.5];
  const walkTo = async (x, y) => {
    const n = Math.max(1, Math.round(Math.hypot(x - here[0], y - here[1]) / 0.04));
    for (let i = 1; i <= n; i++) await go(here[0] + ((x - here[0]) * i) / n, here[1] + ((y - here[1]) * i) / n);
    here = [x, y];
  };
  const take = async (file, saved) => {
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=cap-photo]')]);
    await chooser.setFiles(path.join(fixtures, file));
    await pg.waitForSelector(`text=${saved}`, { timeout: 20000 }).catch(() => null);
    await pg.waitForTimeout(1500);
  };
  const note = async (text) => {
    await pg.click('[data-testid=cap-note]');
    await pg.fill('[data-testid=note-input]', text);
    await pg.click('[data-testid=note-done]');
    await pg.waitForTimeout(1500);
  };
  const voice = async () => {
    await pg.click('[data-testid=cap-voice]');
    await pg.waitForSelector('[data-testid=voice-save]');
    await pg.waitForTimeout(2500);
    await pg.click('[data-testid=voice-save]');
    await pg.waitForTimeout(1500);
  };
  const dismissPill = async () => {
    if (await pg.locator('[data-testid=add-dismiss]').count()) await pg.click('[data-testid=add-dismiss]').catch(() => null);
    await pg.waitForTimeout(400);
  };
  // What is drawn at a point of the map: its middle pixel and, for each radius, the four pixels right, left, below
  // and above it, from a screenshot of the composited page (as qol reads the ends).
  const pixelsAround = async (p, r = 14, radii = []) => {
    const [x, y] = await pg.evaluate((q) => window.__project(q), p);
    const png = await pg.screenshot({ clip: { x: x - r, y: y - r, width: 2 * r, height: 2 * r } });
    return pg.evaluate(async ([b64, rr, rs]) => {
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const g = cv.getContext('2d');
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
      const k = bmp.width / (2 * rr);
      const px = (dx, dy) => {
        const i = ((Math.round(bmp.height / 2 + dy * k) * bmp.width) + Math.round(bmp.width / 2 + dx * k)) * 4;
        return [d[i], d[i + 1], d[i + 2]];
      };
      return { centre: px(0, 0), radial: rs.map((q) => [px(q, 0), px(-q, 0), px(0, q), px(0, -q)]) };
    }, [png.toString('base64'), r, radii]);
  };
  const hideMarkers = (hidden) => pg.evaluate((v) => document.querySelectorAll('.maplibregl-marker').forEach((m) => { m.style.visibility = v ? 'hidden' : ''; }), hidden);
  // Every capture pin on the map: its name, its head's colour, its discs' colours.
  const pins = () => pg.$$eval('.maplibregl-map button[aria-label]:not([data-testid=memory-pin])', (els) => els
    .filter((el) => el.querySelector('[data-testid=pin-head]'))
    .map((el) => ({
      label: el.getAttribute('aria-label'),
      several: (el.getAttribute('data-ids') || '').includes(','),
      head: getComputedStyle(el.querySelector('[data-testid=pin-head]')).backgroundColor,
      discs: [...el.querySelectorAll('[data-testid=pin-kind]')].map((d) => getComputedStyle(d).backgroundColor),
    })));

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await pg.waitForTimeout(1500);
  await go(-0.5, -0.5);
  await pg.click('[data-testid=start]');
  await pg.waitForSelector('[data-testid=walk-actions]');
  // Each pin 90 m or more from the next, so none group at the card's zoom.
  await walkTo(-0.5, 0.3);
  await take('photo.jpg', 'Photo saved here');
  await dismissPill();
  await walkTo(-0.5, 1.3);
  await take('photo.jpg', 'Photo saved here');
  // A second piece on the same moment: the stacked moment.
  if (await pg.waitForSelector('[data-testid=add-photo]', { timeout: 4000 }).then(() => true, () => false)) {
    const [ch2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=add-photo]')]);
    await ch2.setFiles(path.join(fixtures, 'photo.jpg'));
    await pg.waitForTimeout(1500);
  }
  await dismissPill();
  await walkTo(-0.5, 1.5);
  await walkTo(0.5, 1.5);
  await take('clip-4s.webm', 'Video saved here');
  await dismissPill();
  await walkTo(1.5, 1.5);
  await walkTo(1.5, 1.2);
  await voice();
  await dismissPill();
  await walkTo(1.5, 0.3);
  await note('A note on the corner.');
  await dismissPill();
  await walkTo(1.5, -0.5);
  await walkTo(0.5, -0.5);
  await take('photo.jpg', 'Photo saved here');
  await dismissPill();
  await take('clip-4s.webm', 'Video saved here');
  await dismissPill();
  await note('Where it ended.');
  await dismissPill();
  await pg.waitForTimeout(2000);
  await shot(pg, 'palette-01-walk-390');

  // The walk screen's pins, each in its kind's colour.
  const kindOf = (label) => (/^Photo, /.test(label) ? 'photo' : /^Video, /.test(label) ? 'video' : /^Voice memo, /.test(label) ? 'voice' : /^Note, /.test(label) ? 'text' : null);
  const pinChecks = async (where) => {
    const all = await pins();
    const single = all.filter((p) => !p.several);
    const many = all.filter((p) => p.several);
    const kinds = new Set(single.map((p) => kindOf(p.label)));
    const right = single.every((p) => kindOf(p.label) && p.head === css(paletteRgb(kindOf(p.label))));
    check(['photo', 'video', 'voice', 'text'].every((k) => kinds.has(k)) && right,
      `MP14: on ${where} each pin of one moment is its kind's colour (${JSON.stringify(single.map((p) => [p.label.split(',')[0], p.head]))})`);
    check(many.length >= 1 && many.every((p) => p.head === css(paletteRgb('several')) && p.discs.length === 2 && p.discs.every((d) => d !== p.head)),
      `MP14: on ${where} a pin of several is the charcoal head with its kinds' discs (${JSON.stringify(many.map((p) => [p.head, p.discs]))})`);
  };
  await pinChecks('the walk screen');

  await toStop(pg);

  const b = await pg.locator('[data-testid=stop]').boundingBox();
  await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 });
  await pg.waitForSelector('[data-testid=skip]', { timeout: 30000 });
  await pg.click('[data-testid=skip]');
  await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
  await pg.waitForTimeout(2000);
  await pinChecks('the replay\'s card');

  // The end: a walked centre, a white band, a walked outer ring, in the walked ink, not the accent.
  const endAt = await pg.evaluate(() => {
    const el = [...document.querySelectorAll('[data-ends]')].pop();
    const e = el && el.getAttribute('data-ends').split('|')[1];
    return e ? e.split(',').map(Number) : null;
  });
  const walked = paletteRgb('walked');
  let end = null;
  if (endAt) {
    await hideMarkers(true);
    try { end = await pixelsAround(endAt, 14, [7, 8, 9]); } finally { await hideMarkers(false); }
  }
  const ringWalked = end ? [0, 1, 2, 3].filter((k) => end.radial.some((at) => near(at[k], walked, 60))).length : 0;
  check(!!end && near(end.centre, walked, 60) && ringWalked === 4 && !near(end.centre, ACCENT, 60),
    `MP14: the end's centre and ring are the walked ink, never the accent (centre ${JSON.stringify(end && end.centre)}, ring ${ringWalked}/4, walked ${JSON.stringify(walked)})`);
  await shot(pg, 'palette-02-card-390');
  await pg.setViewportSize({ width: 320, height: 640 });
  await pg.waitForTimeout(1500);
  await shot(pg, 'palette-03-card-320');

  // Beat one's lit street: the walked ink under the trace's white edge and the trace, as the replay draws them.
  const trace = paletteRgb('trace');
  const quiet = mapNumber('QUIET_TRACE_OPACITY');
  const edge = mapNumber('TRACE_EDGE_OPACITY');
  const lit = walked && trace && quiet && edge ? over(trace, over([255, 255, 255], walked, edge * quiet), quiet) : null;
  // A point on the first street walked, between the start and the first pin.
  const street = at(-0.5, -0.1);
  // `stage`: the replay's stage on the path, the memo's play disc, a note's bubble edge and a video's tile.
  const watch = async (w) => {
    await pg.getByText('Watch again').click();
    const shown = await pg.waitForSelector('[data-testid=replay-headline]', { timeout: 15000 }).then(() => true, () => false);
    const seenLit = [];
    if (shown) {
      // The walked streets light over the first 80% of the fog's 4 s; read them from 2.9 s, before the path.
      await pg.waitForTimeout(2900);
      await shot(pg, `palette-04-beat-one-${w}`);
      for (let i = 0; i < 3; i++) {
        await hideMarkers(true);
        try { seenLit.push((await pixelsAround(street, 6)).centre); } finally { await hideMarkers(false); }
        await pg.waitForTimeout(150);
      }
    }
    const stage = {};
    const memo = await pg.waitForSelector('[data-testid=memo-play]', { timeout: 90000 }).then(() => true, () => false);
    if (memo) {
      stage.memo = await pg.$eval('[data-testid=memo-play]', (e) => getComputedStyle(e).backgroundColor);
      await shot(pg, `palette-05-stage-memo-${w}`);
    }
    const noted = await pg.waitForSelector('[data-testid=replay-note]', { timeout: 60000 }).then(() => true, () => false);
    if (noted) {
      stage.note = await pg.$eval('[data-testid=replay-note]', (e) => {
        for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (parseFloat(s.borderLeftWidth) > 0) return s.borderLeftColor; }
        return null;
      });
      await shot(pg, `palette-06-stage-note-${w}`);
    }
    // The stack holds the video's tile.
    const piled = await pg.waitForFunction(() => document.querySelectorAll('[data-testid=replay-stack] [data-testid=stack-entry]').length >= 1 && !!document.querySelector('[data-testid=replay-stack] [data-testid=video-mark], [data-testid=replay-stack] [style*="background-color"]'), null, { timeout: 60000 }).then(() => true, () => false);
    if (piled) {
      // A video with no still yet shows the madder tile; with its still (made on the web) the picture covers it. Either
      // way no tile is the old video red.
      stage.video = await pg.$$eval('[data-testid=replay-stack] *', (els, [want, old]) => {
        const bgs = els.map((e) => getComputedStyle(e).backgroundColor);
        return { madder: bgs.includes(want), oldRed: bgs.includes(old), pictures: els.filter((e) => e.tagName === 'IMG').length };
      }, [css(paletteRgb('video')), 'rgb(180, 35, 24)']);
      await shot(pg, `palette-07-stage-stack-${w}`);
    }
    await pg.waitForSelector('[data-testid=to-name], [data-testid=done]', { timeout: 120000 }).catch(() => null);
    await pg.waitForTimeout(1500);
    return { seenLit, stage };
  };
  const at320 = await watch('320');
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(1500);
  const at390 = await watch('390');
  const litOk = (r) => r.seenLit.some((p) => near(p, lit, 30) && !near(p, ACCENT, 60));
  check(!!lit && (litOk(at390) || litOk(at320)),
    `MP14: beat one's lit street is the walked ink under the faint trace, never the accent (want ${JSON.stringify(lit)}; 390 ${JSON.stringify(at390.seenLit)}, 320 ${JSON.stringify(at320.seenLit)})`);
  const stageOk = (r) => r.stage.memo === css(paletteRgb('voice')) && r.stage.note === css(paletteRgb('text')) && !!r.stage.video && !r.stage.video.oldRed && (r.stage.video.madder || r.stage.video.pictures > 0);
  check(stageOk(at390) && stageOk(at320),
    `MP9: the replay's stage takes the kinds' colours: the memo's play disc, a note's edge, the stack's video tile (390 ${JSON.stringify(at390.stage)}, 320 ${JSON.stringify(at320.stage)})`);

  // Explore draws none of these colours: its pictures, for the review, at both widths.
  await pg.goto(navUrl.replace(/navigate$/, ''));
  await tabTo(pg, 'explore');
  await pg.waitForTimeout(4000);
  await shot(pg, 'palette-08-explore-390');
  await pg.setViewportSize({ width: 320, height: 640 });
  await pg.waitForTimeout(1500);
  await shot(pg, 'palette-09-explore-320');
  await c.close();
  await townBorders(h);
}

/** WCAG contrast of two [r, g, b]. */
const contrastOf = (a, b) => {
  const lum = (c) => c.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// tend map T33 (the owner's answers to T33, Nov 17, decision 0199): the town borders in their own cocoa, drawn over the
// replay's veil, so the edge holds TB8's 3.5:1 and the tint TB10's 1.15 there. Its own ground: Pawtucket's east edge
// 100 m east of the start and Central Falls beyond it, served on this page only, so a short walk has the border in frame.
async function townBorders(h) {
  const { navUrl, url, exploreUrl, at, freshPage, shot, check, tabTo, mapUp, switchLayer, OVERTURE_HOST, OVERTURE_RELEASE, toStop } = h;
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');
  const area = (name, id, x0, x1) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[at(x0, -10), at(x1, -10), at(x1, 10), at(x0, 10), at(x0, -10)]] },
    properties: { subtype: 'locality', class: 'land', '@name': name, division_id: id, id: `${id}-area` } });
  const towns = [area('Pawtucket', 'pawtucket', -10, 1), { type: 'Feature', geometry: { type: 'Point', coordinates: at(-3, 4) }, properties: { subtype: 'locality', '@name': 'Pawtucket', id: 'pawtucket' } },
    area('Central Falls', 'central-falls', 1, 12)];
  const [lon, lat] = at(0, 0);
  const archive = encodeArchive([10, 12].map((z) => {
    const x = Math.floor(((lon + 180) / 360) * 2 ** z);
    const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
    return { z, x, y, data: encodeTile(towns, z, x, y, (f) => [f.geometry.type === 'Polygon' ? 'division_area' : 'division']) };
  }));
  const { c, pg } = await freshPage('palette-borders');
  await c.addInitScript(() => { window.__perf = {}; });
  // Registered after the harness's own Overture route, so it answers first; everything but the towns falls through.
  await c.route(`https://${OVERTURE_HOST}/**`, (r) => {
    if (new URL(r.request().url()).pathname !== `/tiles/${OVERTURE_RELEASE}/divisions.pmtiles`) return r.fallback();
    const m = /bytes=(\d+)-(\d+)/.exec(r.request().headers().range ?? '');
    const from = m ? Number(m[1]) : 0;
    const to = Math.min(m ? Number(m[2]) : archive.length - 1, archive.length - 1);
    return r.fulfill({ status: 206, contentType: 'application/octet-stream', body: archive.subarray(from, to + 1),
      headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'ETag, Content-Length, Content-Range, Accept-Ranges', 'content-range': `bytes ${from}-${to}/${archive.length}`, etag: '"e2e"' } });
  });
  const go = async (x, y) => {
    const p = at(x, y);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(600);
  };
  let here = [-0.5, -0.5];
  const walkTo = async (x, y) => {
    const n = Math.max(1, Math.round(Math.hypot(x - here[0], y - here[1]) / 0.04));
    for (let i = 1; i <= n; i++) await go(here[0] + ((x - here[0]) * i) / n, here[1] + ((y - here[1]) * i) / n);
    here = [x, y];
  };
  // A row of pixels across the east edge, at a block's middle (the fake grid's streets run every 100 m on the half), and
  // a block's middle inside the town and one outside it: the replay's veiled ground, with and without the tint.
  const row = async (p, r) => {
    const [x, y] = await pg.evaluate((q) => window.__project(q), p);
    const png = await pg.screenshot({ clip: { x: Math.round(x) - r, y: Math.round(y), width: 2 * r + 1, height: 1 } });
    return pg.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const g = cv.getContext('2d');
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, bmp.width, 1).data;
      return Array.from({ length: bmp.width }, (_, i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    }, png.toString('base64'));
  };
  const hidePins = (hidden) => pg.evaluate((v) => document.querySelectorAll('.maplibregl-marker').forEach((m) => { m.style.visibility = v ? 'hidden' : ''; }), hidden);
  const darkest = (px) => px.reduce((m, p) => (p[0] + p[1] + p[2] < m[0] + m[1] + m[2] ? p : m), [255, 255, 255]);
  const tinted = () => pg.waitForFunction(() => [...document.querySelectorAll('[data-borders]')].some((e) => /tinted:/.test(e.getAttribute('data-borders') ?? '')), null, { timeout: 45000 }).catch(() => {});

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await pg.waitForTimeout(1500);
  // Town borders on, one setting for every map (ML7), so the walk screen draws the town's edge.
  await switchLayer(pg, 'borders');
  await go(-0.5, -0.5);
  await pg.click('[data-testid=start]');
  await pg.waitForSelector('[data-testid=walk-actions]');
  // A walk starts with every layer off and keeps its own (modes to layers MD3, MD10): the ready map's setting above is
  // what the replay and a day read; the walk's Town borders is switched on from the walk's own panel.
  await switchLayer(pg, 'borders');
  await walkTo(-0.5, 0.8);
  await walkTo(0.85, 0.8);
  // tend map audit 39 measured the town's edge under the walk's unwalked veil; the veil went with the unwalked-streets
  // button (decision 0222, WB1), so the walk draws its firm edge on the plain map. The replay and a day keep theirs below.
  await pg.waitForFunction(() => [...document.querySelectorAll('[data-borders]')].some((e) => /firm:Pawtucket/.test(e.getAttribute('data-borders') ?? '')), null, { timeout: 45000 }).catch(() => {});
  const walkDrawn = await pg.$$eval('[data-borders]', (es) => es.map((e) => e.getAttribute('data-borders')).join(' '));
  check(/firm:Pawtucket/.test(walkDrawn), `the walk draws the town's firm edge (${walkDrawn})`);
  await walkTo(0.85, -0.5);
  await walkTo(0.1, -0.5);
  await pg.waitForTimeout(1500);
  await toStop(pg);
  const b = await pg.locator('[data-testid=stop]').boundingBox();
  await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 });
  await pg.waitForSelector('[data-testid=skip]', { timeout: 30000 });
  await pg.click('[data-testid=skip]');
  await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
  await tinted();
  await pg.waitForTimeout(2500);
  const drawn = await pg.$$eval('[data-borders]', (es) => es.map((e) => e.getAttribute('data-borders')).join(' '));
  await hidePins(true);
  const across = await row(at(1, 0), 6);
  const inside = (await row(at(0, 0), 0))[0];
  const outside = (await row(at(1.25, 0), 0))[0];
  await hidePins(false);
  const edge = darkest(across);
  // The edge as drawn: the border's colour at its firm opacity over Central Falls' grey line, which shares the edge.
  const hexOf = (key) => {
    const m = new RegExp(`export const BORDER = \\{[\\s\\S]*?\\n\\s*${key}: '#([0-9a-fA-F]{6})'`).exec(MAP_TYPES);
    return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null;
  };
  const opacityOf = (key) => Number((new RegExp(`export const BORDER = \\{[\\s\\S]*?\\n\\s*${key}: ([0-9.]+)`).exec(MAP_TYPES) ?? [])[1]);
  const [border, lined] = [hexOf('color'), hexOf('lined')];
  const want = border && lined ? over(border, over(lined, outside, opacityOf('linedOpacity')), opacityOf('firmOpacity')) : null;
  const measured = `edge ${JSON.stringify(edge)} ${contrastOf(edge, outside).toFixed(2)}:1, tint ${JSON.stringify(inside)} ${contrastOf(inside, outside).toFixed(2)}, ground ${JSON.stringify(outside)}, want ${JSON.stringify(want)}; ${drawn}`;
  console.log(`tend map T33 measured on the replay's card: ${measured}`);
  check(/tinted:Pawtucket/.test(drawn) && contrastOf(edge, outside) >= 3.5 && near(edge, want, 24),
    `tend map T33: on the replay's card the town's edge is the border's own colour drawn over the veil, 3.5:1 on the veiled ground (TB8) (${measured})`);
  check(contrastOf(inside, outside) >= 1.15,
    `tend map T33: on the replay's card the walked town's tint is drawn over the veil, 1.15 on the veiled ground (TB10) (${measured})`);
  // tend map audit 38 (the owner's "Lighten the fill on veiled maps"): the tint's opacity read back from its pixels is the
  // veiled one, at which a base-map label on Positron's veiled land keeps TB10's 4:1.
  const veiledOpacity = Number((/export function borderFillOpacity\(overVeil: boolean\): number \{\s*return overVeil \? ([0-9.]+)/.exec(MAP_TYPES) ?? [])[1]);
  const drawnOpacity = border ? [0, 1, 2].map((i) => (outside[i] - inside[i]) / (outside[i] - border[i])).reduce((a, v) => a + v, 0) / 3 : NaN;
  const positronVeiled = over(paletteRgb('veil'), [0xf2, 0xf3, 0xf0], 0.45);
  const labelFloor = border ? contrastOf([0x66, 0x66, 0x66], over(border, positronVeiled, veiledOpacity)) : 0;
  check(Math.abs(drawnOpacity - veiledOpacity) <= 0.006 && labelFloor >= 4,
    `tend map audit 38: over the veil the tint is drawn at ${veiledOpacity} (read ${drawnOpacity.toFixed(3)}), so a label on it keeps 4:1 on Positron's veiled land (${labelFloor.toFixed(3)}:1)`);
  await shot(pg, 'palette-10-borders-card-390');
  // The pictures for the review: beat one, Chronicle's map, a day's replay, Explore's town page.
  await pg.getByText('Watch again').click();
  if (await pg.waitForSelector('[data-testid=replay-headline]', { timeout: 15000 }).then(() => true, () => false)) {
    await pg.waitForTimeout(1800);
    await shot(pg, 'palette-11-borders-beat-one-390');
  }
  await pg.waitForSelector('[data-testid=to-name]', { timeout: 90000 }).catch(() => null);
  await pg.goto(url);
  await tabTo(pg, 'chronicle');
  await mapUp(pg);
  await tinted();
  await pg.waitForTimeout(2500);
  await shot(pg, 'palette-12-borders-chronicle-390');
  await pg.click('[data-testid=sheet-days]').catch(() => null);
  await pg.waitForSelector('[data-testid=day-row]', { timeout: 15000 }).catch(() => null);
  await pg.click('[data-testid=day-row]').catch(() => null);
  await pg.waitForSelector('[data-testid=day-title]', { timeout: 15000 }).catch(() => null);
  await pg.click('[data-testid=day-replay]').catch(() => null);
  await pg.waitForURL(/\/day\//, { timeout: 15000 }).catch(() => null);
  await tinted();
  await pg.waitForTimeout(1500);
  await shot(pg, 'palette-13-borders-day-390');
  await pg.waitForSelector('[data-testid=day-card]', { timeout: 30000 }).catch(() => null);
  await pg.waitForTimeout(2000);
  await shot(pg, 'palette-14-borders-day-card-390');
  await pg.goto(exploreUrl);
  await switchLayer(pg, 'borders');
  const yours = '[data-testid=atlas-tile][data-level="town"][data-selected="1"]';
  await pg.waitForSelector(yours, { timeout: 30000 }).catch(() => null);
  await pg.click(yours).catch(() => {});
  await pg.waitForSelector('[data-testid=atlas-town-head]', { timeout: 10000 }).catch(() => {});
  await tinted();
  await pg.waitForTimeout(4000);
  await shot(pg, 'palette-15-borders-explore-town-390');
  await c.close();
}

module.exports = {
  name: 'palette',
  covers: ['src/components/map/types.ts', 'src/components/map/WalkMap.web.tsx', 'src/components/CapturePinView.tsx', 'src/components/ceremony/{Bubbles,Still,Stack}.tsx'],
  run,
};
