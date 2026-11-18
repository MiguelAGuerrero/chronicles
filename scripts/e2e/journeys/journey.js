// A journey carried by the session (OJ5, OJ24, OJ28, OJ29, OJ31, OJ48, OJ50; decision 0201): from Curio Row, a town a drive away is
// the destination; its one bookshop (from a stores pack this journey serves) is a chapter of one stop; Start begins a session at once
// and the walk screen's bar names the town ahead with Open in Maps and "Pass by". E2E_ONLY=journey runs it alone.

const TOWN = 'North Scituate';

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
  const [sx, sy] = z12(shopAt);
  const bounds = [-125, 24, -66.9, 49.4];
  const storesFile = 'stores-us-20261108.pmtiles';
  const feature = { type: 'Feature', geometry: { type: 'Point', coordinates: shopAt }, properties: { name: 'Hollow Oak Books', id: 's_0000000000000009', src: 'osm', what: 'books' } };
  places.files[storesFile] = encodeArchive([{ z: 12, x: sx, y: sy, data: encodeTile([feature], 12, sx, sy, () => ['stores']) }], bounds);
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
  await pg.click('[data-testid=outing-where]');
  await pg.waitForSelector('[data-testid=atlas-search-field]', { timeout: 15000 }).catch(() => {});
  await pg.locator('[data-testid=atlas-search-field]').pressSequentially(TOWN, { delay: 15 }).catch(() => {});
  await pg.waitForSelector('[data-testid=atlas-search-result]', { timeout: 60000 }).catch(() => {});
  await pg.locator('[data-testid=atlas-search-result]').first().click().catch(() => {});
  await pg.waitForSelector('[data-testid=outing-away]', { timeout: 15000 }).catch(() => {});
  for (const el of await pg.locator('[data-testid^=outing-want-]').all()) {
    const id = ((await el.getAttribute('data-testid')) ?? '').replace('outing-want-', '');
    if (((await el.getAttribute('aria-pressed')) === 'true') !== (id === 'books')) await el.click();
  }
  await pg.waitForSelector('[data-testid=outing-journey-0]', { timeout: 120000 }).catch(() => {});
  const card = ((await pg.locator('[data-testid=outing-journey-0]').innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  check(/^Among the shops North Scituate\. Books\.$/.test(card), `OJ20, OJ21: toward a town a drive away, the journey names the town and what it holds, with no distance on foot for a single stop (${card})`);
  await shot(pg, '01-toward');
  await pg.click('[data-testid=outing-see]');
  await pg.waitForSelector('[data-testid=outing-chapter-0]', { timeout: 15000 }).catch(() => {});
  const line = ((await pg.locator('[data-testid=outing-chapter-line-0]').innerText().catch(() => '')) ?? '').trim();
  check((await pg.locator('[data-testid=outing-chapter-name-0]').innerText().catch(() => '')).trim() === TOWN && line === 'New to you. Books here. One stop.', `OJ5, OJ24, OJ50: the town's chapter says it is new to you, what it holds and that it is one stop (${line})`);
  check((await pg.locator('[data-testid=outing-maps-0]').count()) === 1 && (await pg.locator('[data-testid=outing-leave-0]').count()) === 0, 'OJ26, OJ29: the town has Open in Maps, and the destination\'s town cannot be left out');
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
  check(/^North Scituate next\. \d+(\.\d)? (km|mi) away\.$/.test(bar), `OJ28, OJ29: Start begins a session at once and its bar names the town ahead and how far away (${bar})`);
  check((await pg.locator('[data-testid=journey-maps]').getAttribute('aria-label')) === 'Open in Maps' && (await pg.locator('[data-testid=journey-pass]').getAttribute('aria-label')) === 'Pass this town by', 'OJ29, OJ31: the bar hands the road to Maps and lets the town be passed by');
  const screen = await pg.locator('body').innerText();
  check(!screen.includes('Hollow Oak') && !/\b(min|minutes|ETA)\b/i.test(bar) && !/\bof \d|\d of\b/.test(bar), 'OJ31, OJ34: the bar names no stop, no time and no count');
  {
    const b = await pg.locator('[data-testid=journey-bar]').boundingBox().catch(() => null);
    const stack = await pg.locator('[data-testid=capture-photo], [data-testid=capture-stack]').first().boundingBox().catch(() => null);
    check(!!b && (!stack || b.y + b.height <= stack.y || stack.y + stack.height <= b.y), 'OJ33: the bar never covers the capture stack');
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
  // OJ31: passed by, the town is let go and nothing is said of it.
  await pg.click('[data-testid=journey-pass]');
  await pg.waitForTimeout(500);
  check((await pg.locator('[data-testid=journey-bar]').count()) === 0, 'OJ31: passed by, the town is let go; with none ahead the bar goes with no line');
  await c.close();
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

module.exports = {
  name: 'journey',
  covers: ['src/lib/outing/**', 'src/components/outing/**', 'src/app/walk.tsx'],
  run,
};
