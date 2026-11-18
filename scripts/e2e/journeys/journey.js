// A journey carried by the session (OJ5, OJ20, OJ24, OJ26, OJ28, OJ29, OJ31, OJ39, OJ48, OJ50; decision 0210): from Curio Row toward
// Providence, a town on the way and the destination each hold one bookshop (from a stores pack this journey serves), so the journey has
// two chapters of one stop. Start begins a session at once and the walk screen's bar names the town ahead with Open in Maps and "Pass
// by"; the page, opened again while the session records, carries the capture stack and can leave a town out. E2E_ONLY=journey runs it.

const TOWN = 'North Scituate';
const END = 'Providence';

async function run(h) {
  const { exploreUrl, at, check, freshPage, shot, places } = h;
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');
  const gz = require('../../../assets/gazetteer/places.json');
  const gi = gz.names.findIndex((n, i) => n === TOWN && Math.abs(gz.lat[i] / 1e4 - 41.83) < 0.2);
  const town = [gz.lon[gi] / 1e4, gz.lat[gi] / 1e4];
  const z12 = ([lon, lat]) => {
    const r = (lat * Math.PI) / 180;
    return [Math.floor(((lon + 180) / 360) * 2 ** 12), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** 12)];
  };
  const shopAt = [town[0] + 0.001, town[1] + 0.001];
  const ei = gz.names.findIndex((n, i) => n === END && Math.abs(gz.lat[i] / 1e4 - 41.82) < 0.2);
  const end = [gz.lon[ei] / 1e4, gz.lat[ei] / 1e4];
  const endShopAt = [end[0] + 0.001, end[1] + 0.001];
  const [sx, sy] = z12(shopAt);
  const bounds = [-125, 24, -66.9, 49.4];
  const storesFile = 'stores-us-20261108.pmtiles';
  const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: shopAt }, properties: { name: 'Hollow Oak Books', id: 's_0000000000000009', src: 'osm', what: 'books' } };
  const endFeature = { type: 'Feature', geometry: { type: 'Point', coordinates: endShopAt }, properties: { name: 'Benefit Street Books', id: 's_0000000000000008', src: 'osm', what: 'books' } };
  const [ex, ey] = z12(endShopAt);
  const tiles = ex === sx && ey === sy ? [{ z: 12, x: sx, y: sy, data: encodeTile([feature, endFeature], 12, sx, sy, () => ['stores']) }]
    : [{ z: 12, x: sx, y: sy, data: encodeTile([feature], 12, sx, sy, () => ['stores']) }, { z: 12, x: ex, y: ey, data: encodeTile([endFeature], 12, ex, ey, () => ['stores']) }];
  places.files[storesFile] = encodeArchive(tiles, bounds);
  // A places archive beside it, as the manifest must name one: a folly far from everything here.
  const placesFile = 'places-us-20261108.pmtiles';
  const [fx, fy] = z12(at(-240, 50));
  places.files[placesFile] = encodeArchive([{ z: 12, x: fx, y: fy, data: encodeTile([{ type: 'Feature', geometry: { type: 'Point', coordinates: at(-240, 50) }, properties: { name: 'Far Folly', class: 'folly', src: 'wd', id: 'p_0000000000900002' } }], 12, fx, fy, () => ['places']) }], bounds);
  const file = (f, bytes) => ({ file: f, version: '20261108', bytes, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds });
  places.manifest = JSON.stringify({ schema: 1, regions: [{ id: 'us', current: file(placesFile, places.files[placesFile].length), previous: [], stores: { current: file(storesFile, places.files[storesFile].length), previous: [] } }] });
  const { c, pg } = await freshPage('journey');
  const here = at(-248, 0);
  // The road engine (RE1, RE8): the tiles at its zoom hold one main road from here through the town to the place, bent once so it
  // is not the straight line; every request for them is kept.
  // The road leaves here, meets a junction off the straight line, and turns there for the town; the road it leaves goes on (RE21).
  const k = Math.cos((here[1] * Math.PI) / 180);
  const d = [(town[0] - here[0]) * k, town[1] - here[1]];
  // The junction is 600 m from here, off to one side by 50 degrees, so the fixes of a short drive reach it.
  const len = Math.hypot(d[0], d[1]);
  const rot = [(d[0] * Math.cos(0.87) - d[1] * Math.sin(0.87)) / len, (d[0] * Math.sin(0.87) + d[1] * Math.cos(0.87)) / len];
  const mDeg = 600 / 111320;
  const bend = [here[0] + (rot[0] * mDeg) / k, here[1] + rot[1] * mDeg];
  /** Moves the mocked GPS from a to b as a drive does, a fix a second at 12 m/s: a jump is not a fix the trace keeps, and a ride is told only after 20 s of it (R1). */
  const go = async (a, b) => {
    const n = Math.max(1, Math.round(h.distanceM(a, b) / 12));
    for (let i = 1; i <= n; i++) {
      await c.setGeolocation({ longitude: a[0] + ((b[0] - a[0]) * i) / n, latitude: a[1] + ((b[1] - a[1]) * i) / n, accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    return b;
  };
  const on = [bend[0] + (bend[0] - here[0]) * 0.4, bend[1] + (bend[1] - here[1]) * 0.4];
  const roadOf = (coordinates) => ({ type: 'Feature', properties: { class: 'primary' }, geometry: { type: 'LineString', coordinates } });
  const mainRoads = [roadOf([here, bend, on]), roadOf([bend, town, end])];
  const along = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const roadAsked = [];
  await pg.route(/\/12\/\d+\/\d+\.pbf$/, (r) => {
    const m = /\/12\/(\d+)\/(\d+)\.pbf$/.exec(r.request().url());
    roadAsked.push(r.request().url());
    return r.fulfill({ contentType: 'application/x-protobuf', body: Buffer.from(encodeTile(mainRoads, 12, Number(m[1]), Number(m[2]))) });
  });
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.goto(exploreUrl);
  const entry = pg.locator('[data-testid=outing-entry]');
  await entry.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
  await entry.click();
  await pg.waitForSelector('[data-testid=outing-want-books]', { timeout: 30000 }).catch(() => {});
  const toward = async () => {
    await pg.click('[data-testid=outing-where]');
    await pg.waitForSelector('[data-testid=atlas-search-field]', { timeout: 15000 }).catch(() => {});
    await pg.locator('[data-testid=atlas-search-field]').pressSequentially(END, { delay: 15 }).catch(() => {});
    await pg.waitForSelector('[data-testid=atlas-search-result]', { timeout: 60000 }).catch(() => {});
    // The search lists the nearest first (North Providence): take the row that is Providence itself.
    await pg.locator('[data-testid=atlas-search-result]').filter({ hasText: /^\s*Providence/ }).first().click().catch(() => {});
    await pg.waitForSelector('[data-testid=outing-away]', { timeout: 15000 }).catch(() => {});
    // The chips settle a moment after the page opens (they follow "What I'm into"): set them until only Books is on.
    for (let round = 0; round < 4; round++) {
      let changed = false;
      for (const el of await pg.locator('[data-testid^=outing-want-]').all()) {
        const id = ((await el.getAttribute('data-testid')) ?? '').replace('outing-want-', '');
        if (((await el.getAttribute('aria-pressed')) === 'true') !== (id === 'books')) {
          await el.click();
          changed = true;
        }
      }
      await pg.waitForTimeout(500);
      if (!changed) break;
    }
    if (process.env.E2E_DEBUG) console.log('CHIPS', JSON.stringify(await pg.locator('[data-testid^=outing-want-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').slice(12) + '=' + e.getAttribute('aria-pressed')))), (await pg.locator('[data-testid=outing-sheet]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(-120));
    await pg.waitForFunction(() => !document.querySelector('[data-testid=outing-reading]') && !document.querySelector('[data-testid=outing-reading-towns]') && !!document.querySelector('[data-testid=outing-journey-0]'), null, { timeout: 180000 }).catch(() => {});
    await pg.waitForTimeout(500);
  };
  await pg.waitForTimeout(1500);
  check(roadAsked.length === 0, `RE8: opening Explore and the page reads no road (${roadAsked.length} tiles asked)`);
  await toward();
  // RE1, RE2, RE11a, RE17, RE18, RE30: the road is found after the journeys are offered; the page then says how the way is chosen
  // in place of the straight-line caveat, and distances are by road.
  await pg.waitForFunction(() => /keeps to the roads/.test(document.querySelector('[data-testid=outing-road]')?.textContent ?? ''), null, { timeout: 90000 }).catch(() => {});
  {
    const said = ((await pg.locator('[data-testid=outing-road]').innerText().catch(() => '')) ?? '').trim();
    check((await pg.locator('[data-testid=outing-road-note]').count()) === 0, 'road-engine audit 11: among the chips the page says one line about the road, not three');
    check(said === 'The way keeps to the roads through the towns.' && (await pg.locator('[data-testid=outing-straight]').count()) === 0, `RE1, RE11a, RE18: with the road found the page says once how the way is chosen, and no longer that distances are straight lines (${said})`);
    const linkPoints = Number(await pg.locator('[data-testid=outing-map]').getAttribute('data-link-points'));
    check(linkPoints > 3 && linkPoints <= 400, `RE1, RE16: the line handed to the map is the road, not the towns joined straight (${linkPoints} points)`);
    const awayNow = ((await pg.locator('[data-testid=outing-away]').innerText().catch(() => '')) ?? '').trim();
    check(/^\d+(\.\d)?[ \u00a0](km|mi) by road$/.test(awayNow), `RE2, RE13: the place's distance is said by road, with no time (${awayNow})`);
    const hosts = [...new Set(roadAsked.map((u) => new URL(u).host))];
    check(roadAsked.length > 0 && roadAsked.length <= 60 && hosts.length === 1 && hosts[0] === 'tiles.openfreemap.org', `RE7, RE8, RE30: the road is read from the map's own tiles alone, a bounded strip of them, once a place is picked (${roadAsked.length} tiles, ${hosts.join(' ')})`);
  }
  if (process.env.E2E_DEBUG) console.log('SHEET', (await pg.locator('[data-testid=outing-sheet]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500), JSON.stringify(places.asked.map((x) => x.name + ':' + (x.range ?? '')).slice(-12)));
  const card = ((await pg.locator('[data-testid=outing-journey-0]').innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  check(/^Among the shops North Scituate and Providence\. Books\. \d+(\.\d)?[ \u00a0](km|mi) by road\.$/.test(card), `OJ20, OJ21: toward a place a drive away, the journey names the towns in order and what they hold, with no distance on foot for single stops and its distance by road last (RE17) (${card})`);
  await shot(pg, '01-toward');
  await pg.click('[data-testid=outing-see]');
  await pg.waitForSelector('[data-testid=outing-chapter-0]', { timeout: 15000 }).catch(() => {});
  {
    const noteSaid = ((await pg.locator('[data-testid=outing-road-note]').innerText().catch(() => '')) ?? '').trim();
    check(noteSaid === 'The map holds no turn restrictions and no closures. Your maps app chooses its own road, which may not be this one.', `RE19, RE26, road-engine audit 11: with the journey's towns, at rest, the page says what the map cannot know and that the maps app takes its own road (${noteSaid})`);
  }
  const line = ((await pg.locator('[data-testid=outing-chapter-line-0]').innerText().catch(() => '')) ?? '').trim();
  check((await pg.locator('[data-testid=outing-chapter-name-0]').innerText().catch(() => '')).trim() === TOWN && line === 'Books here. One stop.', `OJ5, OJ24, outing-journey audit 49: the town's chapter says what it holds and that it is one stop, and nothing of being new with no recorded outing to read that from (${line})`);
  check((await pg.locator('[data-testid=outing-maps-0]').count()) === 1 && (await pg.locator('[data-testid=outing-leave-0]').count()) === 1 && (await pg.locator('[data-testid=outing-leave-1]').count()) === 0, 'OJ26, OJ29: each town has Open in Maps; a town on the way can be left out, the destination\'s cannot');
  check((await pg.locator('[data-testid=outing-chapter-name-1]').innerText().catch(() => '')).trim() === END && (await pg.locator('[data-testid=outing-start-line]').innerText().catch(() => '')).trim() === 'Start records from here, toward North Scituate.' && (await pg.locator('[data-testid=outing-later-line]').innerText().catch(() => '')).trim() === '"When I get there" keeps North Scituate only.', 'OJ5, outing-journey audit 47, 48: the towns are chapters in order; beside Start the page says recording begins here, and what "When I get there" keeps');
  check((await pg.locator('[data-testid=outing-start]').count()) === 1 && (await pg.locator('[data-testid=outing-later]').count()) === 1, 'OJ28: far from the first town, Start is offered with "When I get there" beside it');
  // RE19: a town a drive away is handed to the maps app for driving directions, the point alone.
  // This page is a fresh one: the links it opens are recorded here, never followed.
  await pg.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  await pg.click('[data-testid=outing-maps-0]');
  await pg.waitForTimeout(500);
  {
    const opened = await pg.evaluate(() => window.__opened ?? []);
    check(opened.length === 1 && /(travelmode=driving|dirflg=d)/.test(opened[0]) && !/Scituate/i.test(decodeURIComponent(opened[0])), `RE19: Open in Maps for a town a drive away asks for driving directions, with the point alone (${opened[0]})`);
  }
  const page = await pg.locator('[data-testid=outing]').innerText();
  check(!page.includes('Hollow Oak'), 'QC24: the shop is not named on the page before a tap');
  await shot(pg, '02-town');
  await pg.click('[data-testid=outing-start]');
  await pg.waitForSelector('[data-testid=journey-bar]', { timeout: 90000 }).catch(() => {});
  // The town is said as soon as the session opens; its distance follows the first fix, asked for again here as the walk journeys do.
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.waitForFunction(() => /away\.$/.test(document.querySelector('[data-testid=journey-next]')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
  const bar = ((await pg.locator('[data-testid=journey-next]').innerText().catch(() => '')) ?? '').trim();
  check(/^Toward North Scituate\. \d+(\.\d)?[ \u00a0](km|mi) away\.$/.test(bar), `OJ28, OJ29: Start begins a session at once and its bar says the town it is headed toward and how far away (${bar})`);
  check((await pg.locator('[data-testid=journey-maps]').getAttribute('aria-label')) === 'Open in Maps' && (await pg.locator('[data-testid=journey-pass]').getAttribute('aria-label')) === 'Pass by' && ((await pg.locator('[data-testid=journey-pass]').innerText()) ?? '').trim() === 'Pass by' && (await pg.locator('[data-testid=nav-bar]').count()) === 0, 'OJ29-OJ31, outing-journey audit 33: the bar hands the road to Maps and lets the town be passed by, spoken as it is written; no way on foot was started for you');
  // Guiding the drive (RE3, RE19-RE28): "Drive there" on the bar; nothing guides until it is tapped.
  {
    const text = async (id) => ((await pg.locator(`[data-testid=${id}]`).innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
    const z12Before = roadAsked.length;
    check((await pg.locator('[data-testid=journey-drive]').count()) === 1 && (await text('journey-drive')) === 'Drive there' && (await pg.locator('[data-testid=journey-turn]').count()) === 0, 'RE3, RE19: between towns the bar offers "Drive there" beside Open in Maps and Pass by, and guides nothing by itself');
    // What is spoken is recorded, never played (RE25).
    await pg.evaluate(() => { window.__said = []; window.speechSynthesis.speak = (u) => { window.__said.push(u.text); }; window.speechSynthesis.cancel = () => {}; });
    await pg.click('[data-testid=journey-drive]');
    await pg.waitForSelector('[data-testid=journey-turn]', { timeout: 15000 }).catch(() => {});
    const notice = await text('journey-turn');
    await shot(pg, '03c0-notice');
    check(notice === 'The map holds no turn restrictions and no closures.' && (await pg.evaluate(() => window.__said.length)) === 0, `RE26: at the tap, before any turn, the bar says what the map cannot know, and nothing is spoken (${notice})`);
    check((await pg.locator('[data-testid=journey-end]').count()) === 1 && (await text('journey-mute')) === 'Mute turns' && (await text('journey-end')) === 'End directions' && (await pg.locator('[data-testid=journey-maps], [data-testid=journey-pass], [data-testid=journey-drive]').count()) === 0, 'RE20a, RE25: while guiding the bar holds End and the mute, and nothing else to tap');
    {
      const b = await pg.locator('[data-testid=journey-bar]').boundingBox().catch(() => null);
      const caps = await pg.locator('[aria-label="Take a photo or video"], [aria-label="Record a voice memo"], [aria-label="Write a note"]').evaluateAll((els) => els.map((e) => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; }).filter((q) => q.w > 0));
      check(!!b && caps.length >= 3 && caps.every((q) => b.y + b.height <= q.y || q.y + q.h <= b.y || q.x >= b.x + b.width || q.x + q.w <= b.x), `RE27: the capture stack stays on the screen while guiding, never under the bar (${caps.length} controls)`);
    }
    // Along the road toward the junction: the turn there and how far, over the town.
    const p1 = await go(here, along(here, bend, 0.5));
    await pg.waitForFunction(() => /^(Left|Right)\./.test(document.querySelector('[data-testid=journey-turn]')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
    const turn = await text('journey-turn');
    const under = await text('journey-next');
    check(/^(Left|Right)\. \d+(\.\d)?[ \u00a0](km|mi|m|ft)\.$/.test(turn) && under === 'Toward North Scituate.', `RE20, RE21: moving, the bar says the turn coming and how far to it, and under it the town; no time, speed or count (${turn} / ${under})`);
    const said1 = await pg.evaluate(() => window.__said);
    check(said1.length === 1 && /^(Left|Right) ahead\.$/.test(said1[0]), `RE25: the turn is spoken once as it nears, the turn alone (${JSON.stringify(said1)})`);
    check(roadAsked.length > z12Before, 'RE8: the road for the drive is read on the tap on "Drive there"');
    await shot(pg, '03c-guiding');
    const drawn = Number(await pg.locator('[data-testid=journey-bar]').getAttribute('data-drive-points'));
    check(drawn > 1, `road-engine audit 12: the road being driven is handed to the map while guiding (${drawn} points)`);
    {
      const vp = pg.viewportSize();
      await pg.setViewportSize({ width: 320, height: 700 });
      await pg.waitForTimeout(400);
      const tb = await pg.locator('[data-testid=journey-turn]').boundingBox().catch(() => null);
      const whole = await pg.locator('[data-testid=journey-turn]').evaluate((e) => e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1).catch(() => false);
      check(!!tb && tb.height <= 50 && whole, `RE20: at 320 px the turn reads whole in at most two lines (${tb ? Math.round(tb.height) : 0} px)`);
      if (vp) await pg.setViewportSize(vp);
    }
    // Past the junction on the road to the town: that turn is not said again; the road and what is left of it.
    await go(p1, bend);
    const p2 = await go(bend, along(bend, town, 200 / h.distanceM(bend, town)));
    await pg.waitForFunction(() => /^On this road\./.test(document.querySelector('[data-testid=journey-turn]')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
    const after = await text('journey-turn');
    await shot(pg, '03d-on-this-road');
    check(/^On this road\. \d+(\.\d)?[ \u00a0](km|mi|m|ft)\.$/.test(after), `RE23: a turn passed is not said again (${after})`);
    // The mute says what a tap does now, and is kept with the guiding.
    await pg.click('[data-testid=journey-mute]');
    await pg.waitForTimeout(600);
    await shot(pg, '03e-muted');
    check((await text('journey-mute')) === 'Say turns' && /muted/.test(JSON.stringify(await h.metaOf(pg, 'outing_journey').catch(() => null))), `RE25: muted, the control offers to say turns again, and the mute rides with the session (${await text('journey-mute')})`);
    // Off the way: no turn is shown, and nothing says so.
    const off = await go(p2, [p2[0] - ((d[1] / len) * (250 / 111320)) / k, p2[1] + (d[0] / len) * (250 / 111320)]);
    await pg.waitForFunction(() => !document.querySelector('[data-testid=journey-turn]'), null, { timeout: 60000 }).catch(() => {});
    await shot(pg, '03f-off-the-way');
    const body = await pg.locator('body').innerText();
    check((await pg.locator('[data-testid=journey-turn]').count()) === 0 && (await text('journey-next')) === 'Toward North Scituate.' && !/recalculat|off route|turn around|wrong way/i.test(body) && (await pg.evaluate(() => window.__said.length)) === 1, `RE22, RE25, road-engine audit 8: off the way the bar shows the town alone and no turn, nothing is flagged and nothing more is spoken (${await text('journey-next')})`);
    // Back on it, a reload finds the guiding again; End stops it and the other controls return.
    await go(off, p2);
    await pg.waitForFunction(() => /^On this road\./.test(document.querySelector('[data-testid=journey-turn]')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
    await pg.reload();
    await pg.waitForSelector('[data-testid=journey-bar]', { timeout: 90000 }).catch(() => {});
    await c.setGeolocation({ longitude: p2[0], latitude: p2[1], accuracy: 6 });
    await pg.waitForFunction(() => /^On this road\./.test(document.querySelector('[data-testid=journey-turn]')?.textContent ?? ''), null, { timeout: 90000 }).catch(() => {});
    check(/^On this road\./.test(await text('journey-turn')) && (await pg.locator('[data-testid=journey-end]').count()) === 1, `RE28: guiding rides with the open session across a reload (${await text('journey-turn')})`);
    const kept = JSON.stringify(await h.metaOf(pg, 'outing_journey').catch(() => null));
    check(/driving/.test(kept) && !/path|turn|Left|Right|nodes/.test(kept), `RE28: only the towns' points and that a drive is guided are kept: no way, turn or road (${String(kept).length} bytes)`);
    await pg.click('[data-testid=journey-end]');
    await pg.waitForSelector('[data-testid=journey-maps]', { timeout: 15000 }).catch(() => {});
    check((await pg.locator('[data-testid=journey-turn]').count()) === 0 && (await pg.locator('[data-testid=journey-maps]').count()) === 1 && (await pg.locator('[data-testid=journey-pass]').count()) === 1 && (await pg.locator('[data-testid=journey-drive]').count()) === 1, 'RE19, RE20a: End stops the guiding; Open in Maps, Pass by and Drive there return');
    await go(p2, bend);
    await go(bend, here);
  }
  const screen = await pg.locator('body').innerText();
  check(!screen.includes('Hollow Oak') && !/\b(min|minutes|ETA|next|first|last)\b/i.test(bar) && !/\bof \d|\d of\b/.test(bar), 'OJ31, OJ34, outing-journey audit 47: the bar names no stop, no time, no count and no ordinal');
  {
    const bg = await pg.locator('[data-testid=journey-bar]').evaluate((e) => getComputedStyle(e).backgroundColor);
    check(/rgb\(255, 255, 255\)/.test(bg), `outing-journey audit 47: the bar is on the surface's ground, not the route's colour (${bg})`);
  }
  {
    const b = await pg.locator('[data-testid=journey-bar]').boundingBox().catch(() => null);
    const caps = await pg.locator('[aria-label="Take a photo or video"], [aria-label="Record a voice memo"], [aria-label="Write a note"]').evaluateAll((els) => els.map((e) => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; }).filter((q) => q.w > 0));
    check(!!b && caps.length >= 3 && caps.every((q) => b.y + b.height <= q.y || q.y + q.h <= b.y || q.x >= b.x + b.width || q.x + q.w <= b.x), `OJ33: the bar never covers the capture stack (${caps.length} controls)`);
  }
  {
    // Audit 39: at 320 px the bar and its controls are inside the screen; with "Drive there" beside them they may take two rows (RE19).
    const vp = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(500);
    const bb = await pg.locator('[data-testid=journey-bar]').boundingBox().catch(() => null);
    const m = await pg.locator('[data-testid=journey-maps]').boundingBox().catch(() => null);
    const ps = await pg.locator('[data-testid=journey-pass]').boundingBox().catch(() => null);
    await shot(pg, '03b-bar-320');
    check(!!bb && !!m && !!ps && bb.x >= 0 && bb.x + bb.width <= 320 && m.x >= bb.x && ps.x + ps.width <= bb.x + bb.width + 1 && m.x + m.width <= bb.x + bb.width + 1 && ps.y + ps.height <= bb.y + bb.height + 1, `outing-journey audit 39: at 320 px the bar and its controls fit on the screen (${bb ? Math.round(bb.width) : 0} px)`);
    if (vp) await pg.setViewportSize(vp);
    await pg.waitForTimeout(300);
  }
  {
    // The line is whole on screen: not cut short by the controls beside it.
    const whole = await pg.locator('[data-testid=journey-next]').evaluate((e) => e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1);
    const b = await pg.locator('[data-testid=journey-bar]').boundingBox().catch(() => null);
    check(whole && !!b && b.x + b.width <= (pg.viewportSize()?.width ?? 0), 'OJ29: the town and how far away it is read whole on the bar');
  }
  await shot(pg, '03-bar');
  // OJ48: a reload keeps the session's plan.
  await pg.reload();
  await pg.waitForSelector('[data-testid=journey-bar]', { timeout: 90000 }).catch(() => {});
  check((await pg.locator('[data-testid=journey-bar]').count()) === 1, 'OJ48: the plan rides with the open session across a reload');
  // OJ31: passed by, the town leaves the plan and the one after is ahead; it can be taken back.
  await pg.click('[data-testid=journey-pass]');
  await pg.waitForTimeout(500);
  const bar2 = ((await pg.locator('[data-testid=journey-next]').innerText().catch(() => '')) ?? '').trim();
  check(/^Toward Providence\./.test(bar2) && (await pg.locator('[data-testid=journey-undo]').count()) === 1, `OJ31, outing-journey audit 46: passed by, the town is let go and the one after is ahead, with Undo (${bar2})`);
  await shot(pg, '04-bar-next');
  await pg.click('[data-testid=journey-undo]');
  await pg.waitForTimeout(400);
  check(/^Toward North Scituate\./.test(((await pg.locator('[data-testid=journey-next]').innerText().catch(() => '')) ?? '').trim()), 'outing-journey audit 46: Undo brings the town back');
  await pg.click('[data-testid=journey-pass]');
  await pg.waitForTimeout(800);
  // Audit 46 (the steward's S1): a town passed by is not named again after a reload: the plan kept holds only what is ahead.
  await pg.reload();
  await pg.waitForSelector('[data-testid=journey-bar]', { timeout: 90000 }).catch(() => {});
  const bar3 = ((await pg.locator('[data-testid=journey-next]').innerText().catch(() => '')) ?? '').trim();
  check(/^Toward Providence\./.test(bar3), `outing-journey audit 46: a town passed by is not named again after a reload (${bar3})`);
  await pg.click('[data-testid=journey-pass]');
  await pg.waitForTimeout(800);
  await pg.reload();
  await pg.waitForSelector('[data-testid=walk-minimize]', { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  check((await pg.locator('[data-testid=journey-bar]').count()) === 0, 'OJ31: with no town ahead the plan is gone for the session and the bar with it, with no line');
  await shot(pg, '05-bar-gone');
  // OJ26, OJ39: the page opened again while the session records carries the capture stack, and a town on the way can be left out.
  // A person gets there by minimizing the session and going to Explore; the address alone leads back to the session.
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForSelector('[data-testid=tab-explore]', { timeout: 15000 }).catch(() => {});
  await pg.click('[data-testid=tab-explore]');
  await entry.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(1000);
  await entry.click({ timeout: 10000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=outing-want-books]', { timeout: 30000 }).catch(() => {});
  await toward();
  await shot(pg, '06-page-recording');
  {
    const ids = ['plan-cap-photo', 'plan-cap-voice', 'plan-cap-note'];
    const boxes = [];
    for (const id of ids) boxes.push(await pg.locator(`[data-testid=${id}]`).boundingBox().catch(() => null));
    const rects = await pg.locator('[data-testid=outing-see], [data-testid=outing-journey-0], [data-testid^=outing-want-], [data-testid=outing-chains], [data-testid=outing-straight]').evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }));
    const hit = (b, q) => b.x < q.x + q.w && q.x < b.x + b.width && b.y < q.y + q.h && q.y < b.y + b.height;
    const vw = pg.viewportSize()?.width ?? 0;
    check(boxes.every((b) => !!b && b.x >= 0 && b.x + b.width <= vw) && boxes.every((b) => rects.every((q) => !hit(b, q))), `outing-journey audit 32 (OJ39): while a session records the page carries the capture stack, one tap each, over none of the sheet's controls or its card (${boxes.filter(Boolean).length} of 3)`);
  }
  await pg.click('[data-testid=outing-see]');
  await pg.waitForSelector('[data-testid=outing-leave-0]', { timeout: 15000 }).catch(() => {});
  await shot(pg, '07-two-towns-recording');
  check(((await pg.locator('[data-testid=outing-start]').innerText().catch(() => '')) ?? '').trim() === 'Follow this', 'outing-journey audit 50: while a session records, the page\'s primary says what it does now');
  await pg.click('[data-testid=outing-leave-0]');
  await pg.waitForTimeout(800);
  check((await pg.locator('[data-testid=outing-said]').innerText().catch(() => '')).trim() === 'Left North Scituate out.' && (await pg.locator('[data-testid=outing-undo]').count()) === 1, 'outing-journey audit 43: leaving a town out says so once and can be undone');
  const left = await pg.locator('[data-testid^=outing-chapter-name-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
  const leftCard = ((await pg.locator('[data-testid=outing-summary], [data-testid=outing-journey-0]').first().innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ');
  check(JSON.stringify(left) === JSON.stringify([END]) || /Providence\. Books\./.test(leftCard) && !/North Scituate/.test(await pg.locator('[data-testid=outing-sheet]').innerText()), `OJ26: left out, the town is gone from the journey and the destination's stays (${left.join(',')})`);
  await shot(pg, '08-left-out');
  await c.close();
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

module.exports = {
  name: 'journey',
  covers: ['src/lib/outing/**', 'src/components/outing/**', 'src/app/walk.tsx'],
  run,
};
