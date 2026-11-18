// A journey carried by the session (OJ5, OJ20, OJ24, OJ26, OJ28, OJ29, OJ31, OJ39, OJ48, OJ50; decision 0201): from Curio Row toward
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
  await toward();
  if (process.env.E2E_DEBUG) console.log('SHEET', (await pg.locator('[data-testid=outing-sheet]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500), JSON.stringify(places.asked.map((x) => x.name + ':' + (x.range ?? '')).slice(-12)));
  const card = ((await pg.locator('[data-testid=outing-journey-0]').innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  check(/^Among the shops North Scituate and Providence\. Books\.$/.test(card), `OJ20, OJ21: toward a place a drive away, the journey names the towns in order and what they hold, with no distance on foot for single stops (${card})`);
  await shot(pg, '01-toward');
  await pg.click('[data-testid=outing-see]');
  await pg.waitForSelector('[data-testid=outing-chapter-0]', { timeout: 15000 }).catch(() => {});
  const line = ((await pg.locator('[data-testid=outing-chapter-line-0]').innerText().catch(() => '')) ?? '').trim();
  check((await pg.locator('[data-testid=outing-chapter-name-0]').innerText().catch(() => '')).trim() === TOWN && line === 'Books here. One stop.', `OJ5, OJ24, outing-journey audit 49: the town's chapter says what it holds and that it is one stop, and nothing of being new with no recorded outing to read that from (${line})`);
  check((await pg.locator('[data-testid=outing-maps-0]').count()) === 1 && (await pg.locator('[data-testid=outing-leave-0]').count()) === 1 && (await pg.locator('[data-testid=outing-leave-1]').count()) === 0, 'OJ26, OJ29: each town has Open in Maps; a town on the way can be left out, the destination\'s cannot');
  check((await pg.locator('[data-testid=outing-chapter-name-1]').innerText().catch(() => '')).trim() === END && (await pg.locator('[data-testid=outing-start-line]').innerText().catch(() => '')).trim() === 'Start records from here, toward North Scituate.' && (await pg.locator('[data-testid=outing-later-line]').innerText().catch(() => '')).trim() === '"When I get there" keeps North Scituate only.', 'OJ5, outing-journey audit 47, 48: the towns are chapters in order; beside Start the page says recording begins here, and what "When I get there" keeps');
  check((await pg.locator('[data-testid=outing-start]').count()) === 1 && (await pg.locator('[data-testid=outing-later]').count()) === 1, 'OJ28: far from the first town, Start is offered with "When I get there" beside it');
  const page = await pg.locator('[data-testid=outing]').innerText();
  check(!page.includes('Hollow Oak'), 'QC24: the shop is not named on the page before a tap');
  await shot(pg, '02-town');
  await pg.click('[data-testid=outing-start]');
  await pg.waitForSelector('[data-testid=journey-bar]', { timeout: 90000 }).catch(() => {});
  // The town is said as soon as the session opens; its distance follows the first fix, asked for again here as the walk journeys do.
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.waitForFunction(() => /away\.$/.test(document.querySelector('[data-testid=journey-next]')?.textContent ?? ''), null, { timeout: 60000 }).catch(() => {});
  const bar = ((await pg.locator('[data-testid=journey-next]').innerText().catch(() => '')) ?? '').trim();
  check(/^Toward North Scituate\. \d+(\.\d)? (km|mi) away\.$/.test(bar), `OJ28, OJ29: Start begins a session at once and its bar says the town it is headed toward and how far away (${bar})`);
  check((await pg.locator('[data-testid=journey-maps]').getAttribute('aria-label')) === 'Open in Maps' && (await pg.locator('[data-testid=journey-pass]').getAttribute('aria-label')) === 'Pass by' && ((await pg.locator('[data-testid=journey-pass]').innerText()) ?? '').trim() === 'Pass by' && (await pg.locator('[data-testid=nav-bar]').count()) === 0, 'OJ29-OJ31, outing-journey audit 33: the bar hands the road to Maps and lets the town be passed by, spoken as it is written; no way on foot was started for you');
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
    // Audit 39: at 320 px the bar and both its controls are inside the screen, on one row.
    const vp = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(500);
    const bb = await pg.locator('[data-testid=journey-bar]').boundingBox().catch(() => null);
    const m = await pg.locator('[data-testid=journey-maps]').boundingBox().catch(() => null);
    const ps = await pg.locator('[data-testid=journey-pass]').boundingBox().catch(() => null);
    await shot(pg, '03b-bar-320');
    check(!!bb && !!m && !!ps && bb.x >= 0 && bb.x + bb.width <= 320 && m.x >= bb.x && ps.x + ps.width <= bb.x + bb.width + 1 && Math.abs(m.y - ps.y) < 6, `outing-journey audit 39: at 320 px the bar and its controls fit on the screen in one row (${bb ? Math.round(bb.width) : 0} px)`);
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
