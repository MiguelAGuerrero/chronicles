// Plan an outing, destination first (OJ1-OJ4, OJ7, OJ9, OJ11, OJ14-OJ18, OJ21, OJ22, OJ25, OJ27, OJ35; QC1, QC8, QC14, QC17-QC22, QC24-QC25,
// QC27-QC29, QC41, QC42): one control on Explore opens a page that is the map; a field says where to, or "Nowhere in particular" stays
// around here; chips, shops and attractions alike; journeys by leaning; one opened shows its stops by kind, named only on a tap; Swap;
// Include chains; Start. Curio Row (harness) is one street with four antiques shops, so no loop can be made there and the journey is one
// way. E2E_ONLY=outing runs it alone.

const BANNED = /\b(minutes?|mins?|hours?|ETA|pace|brisk|quick(er|est)?|fast(er|est)?|shorter|longer|more|most|best|top|popular|rated|densest|less|than)\b|\d/i;
const NAMES = ['Brass Key Antiques', 'Dusty Attic', 'Grandma Trunk Antiques', 'Lamp and Ladder'];
const THRIFT = ['Helping Hands', 'Rag and Bone', 'Second Wind'];
const BOOKS = ['Marginalia Books', 'Folio and Fable', 'Spine and Page'];

async function run(h) {
  const { exploreUrl, at, check, freshPage, shot, places } = h;
  // The stores pack (chronicles-data's contract: layer `stores`, z12, flat properties name, id, src and what), served by this harness at
  // the e2e's places base with a manifest that lists it beside the places archive. Bookshops are only in the pack, so a Books proposal
  // proves the reader (QC14, QC29).
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');
  const packShops = [[-245.5, 'Marginalia Books', 1], [-241.5, 'Folio and Fable', 2], [-237.5, 'Spine and Page', 3]].map(([x, name, n]) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: at(x, -0.3) }, properties: { name, id: `s_000000000000000${n}`, src: 'osm', what: 'books' },
  }));
  const z12 = ([lon, lat]) => {
    const r = (lat * Math.PI) / 180;
    return [Math.floor(((lon + 180) / 360) * 2 ** 12), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** 12)];
  };
  const byTile = new Map();
  for (const f of packShops) {
    const [x, y] = z12(f.geometry.coordinates);
    byTile.set(`${x}/${y}`, [...(byTile.get(`${x}/${y}`) ?? []), f]);
  }
  const packTiles = [...byTile].map(([k, fs]) => {
    const [x, y] = k.split('/').map(Number);
    return { z: 12, x, y, data: encodeTile(fs, 12, x, y, () => ['stores']) };
  });
  const bounds = [-125, 24, -66.9, 49.4];
  const storesFile = 'stores-us-20261108.pmtiles';
  const placesFile = 'places-us-20261108.pmtiles';
  const [sx, sy] = z12(at(-240, 0));
  places.files[storesFile] = encodeArchive(packTiles, bounds);
  places.files[placesFile] = encodeArchive([{ z: 12, x: sx, y: sy, data: encodeTile([{ type: 'Feature', geometry: { type: 'Point', coordinates: at(-240, 5) }, properties: { name: 'Far Folly', class: 'folly', src: 'wd', id: 'p_0000000000900002' } }], 12, sx, sy, () => ['places']) }], bounds);
  const manifestFile = (file, bytes) => ({ file, version: '20261108', bytes, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds });
  places.manifest = JSON.stringify({ schema: 1, regions: [{ id: 'us', current: manifestFile(placesFile, places.files[placesFile].length), previous: [], stores: { current: manifestFile(storesFile, places.files[storesFile].length), previous: [] } }] });
  places.asked.length = 0;
  const packAsked = () => places.asked.filter((a) => a.name === storesFile);
  const { c, pg } = await freshPage('outing');
  const here = at(-248, 0);
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.goto(exploreUrl);
  // The first fix places Explore at Curio Row, as the planner's journey waits for its area.
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Curio Row"]', { timeout: 60000 }).catch(() => {});
  await shot(pg, '01-explore');
  const entry = pg.locator('[data-testid=outing-entry]');
  await entry.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
  // QC1, QC27: one control, worded, on Explore, with no badge or count.
  const entryText = (((await entry.textContent().catch(() => '')) ?? '').replace(/[^\x20-\x7e]/g, '')).trim();
  check((await entry.count()) === 1 && entryText === 'Plan an outing' && !/\d/.test(entryText), `QC1, QC27: Explore has one control worded "Plan an outing", no badge or count (${entryText})`);
  const eb = await entry.boundingBox().catch(() => null);
  check(!!eb && eb.height >= 43.5, 'QC1: the control is at least 44 px tall');
  await entry.click();
  await pg.waitForSelector('[data-testid=outing]', { timeout: 15000 }).catch(() => {});
  check((await pg.locator('[data-testid=outing]').count()) === 1, 'QC1: one tap opens the page');
  await shot(pg, '02-page-empty');
  // OJ1: the page is the map, with one field over it worded "Where to?"; nothing is proposed or read yet.
  const whereText = ((await pg.locator('[data-testid=outing-where-text]').innerText().catch(() => '')) ?? '').trim();
  const mapBox = await pg.locator('[data-testid=outing-map]').boundingBox().catch(() => null);
  const vp = pg.viewportSize() ?? { width: 0, height: 0 };
  check(whereText === 'Where to?' && !!mapBox && mapBox.height >= vp.height - 1, `OJ1: the page is the map, with a field worded "Where to?" over it (${whereText})`);
  check((await pg.locator('[data-testid=outing-nowhere]').innerText().catch(() => '')).trim() === 'Nowhere in particular', 'OJ7: with no destination the page offers "Nowhere in particular"');
  check((await pg.locator('[data-testid^=outing-want-]').count()) === 0 && (await pg.locator('[data-testid^=outing-journey-]').count()) === 0, 'OJ2: no chips and no journey before a place is given');
  // OJ1, OJ9, OJ22: the field opens Explore's own search; a town picked there is the destination, said with how far "away" it is.
  await pg.click('[data-testid=outing-where]');
  await pg.waitForSelector('[data-testid=atlas-search-field]', { timeout: 15000 }).catch(() => {});
  await pg.locator('[data-testid=atlas-search-field]').pressSequentially('Kutztown', { delay: 15 }).catch(() => {});
  await pg.waitForSelector('[data-testid=atlas-search-result]', { timeout: 60000 }).catch(() => {});
  await pg.locator('[data-testid=atlas-search-result]').first().click().catch(() => {});
  await pg.waitForSelector('[data-testid=outing-away]', { timeout: 15000 }).catch(() => {});
  const townText = ((await pg.locator('[data-testid=outing-where-text]').innerText().catch(() => '')) ?? '').trim();
  const awayText = ((await pg.locator('[data-testid=outing-away]').innerText().catch(() => '')) ?? '').trim();
  check(townText === 'Kutztown' && /^\d+(\.\d)? (km|mi|m|ft) away$/.test(awayText), `OJ1, OJ9: a town from the search is the destination, with its distance worded "away" (${townText}, ${awayText})`);
  check(!/\b(min|minutes|hours?|ETA)\b/i.test(await pg.locator('[data-testid=outing]').innerText()), 'OJ9: no time is said for a destination');
  await shot(pg, '02b-destination');
  // Around here, for the rest: Curio Row is where the harness's shops are.
  const only = async (ids) => {
    for (const el of await pg.locator('[data-testid^=outing-want-]').all()) {
      const id = ((await el.getAttribute('data-testid')) ?? '').replace('outing-want-', '');
      if (((await el.getAttribute('aria-pressed')) === 'true') !== ids.includes(id)) await el.click();
    }
    await pg.waitForTimeout(400);
  };
  const openJourney = async () => {
    await pg.waitForSelector('[data-testid=outing-see]', { timeout: 90000 }).catch(() => {});
    await pg.click('[data-testid=outing-see]').catch(() => {});
    await pg.waitForSelector('[data-testid=outing-slot-0]', { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(1500);
  };
  const backToChips = async () => {
    if ((await pg.locator('[data-testid=outing-back]').count()) > 0) await pg.click('[data-testid=outing-back]');
    await pg.waitForSelector('[data-testid=outing-want-antiques]', { timeout: 15000 }).catch(() => {});
  };
  const aroundHere = async () => {
    await pg.click('[data-testid=outing-nowhere]');
    await pg.waitForSelector('[data-testid=outing-want-antiques]', { timeout: 15000 }).catch(() => {});
  };
  await pg.click('[data-testid=outing-close]');
  await entry.click();
  await pg.waitForSelector('[data-testid=outing-nowhere]', { timeout: 15000 }).catch(() => {});
  await aroundHere();
  // OJ11, OJ15: one list of chips, shops and attractions alike, alphabetical.
  const chips = await pg.locator('[data-testid^=outing-want-]').evaluateAll((els) => els.map((e) => e.textContent));
  check(JSON.stringify(chips) === JSON.stringify(['Antiques', 'Art', 'Books', 'Culture', 'Green', 'History', 'Thrifting', 'Views']), `OJ11, OJ15: the chips are one alphabetical list (${chips.join(',')})`);
  // OJ12: shop chips start off.
  const pressed = async (id) => (await pg.locator(`[data-testid=outing-want-${id}]`).getAttribute('aria-pressed')) === 'true';
  check(!(await pressed('antiques')) && !(await pressed('books')) && !(await pressed('thrifting')) && (await pressed('history')), 'OJ12: shop chips start off; attractions follow "What I\'m into"');
  await only([]);
  check((await pg.locator('[data-testid=outing-pick]').count()) === 1 && (await pg.locator('[data-testid^=outing-journey-]').count()) === 0, 'OJ14: with no chip on the page proposes nothing and says one plain line');
  check((await pg.locator('[data-testid=outing-chains]').getAttribute('aria-checked')) === 'false', 'QC41: Include chains is off by default');
    await only(['antiques']);
  await pg.waitForSelector('[data-testid=outing-journey-0]', { timeout: 90000 }).catch(() => {});
  if (process.env.E2E_DEBUG) console.log('OUTING', (await pg.locator('[data-testid=outing]').innerText().catch(() => 'none')).replace(/\s+/g, ' ').slice(0, 600));
  // OJ17, OJ18, OJ21: one chip of one leaning gives one journey, named for its leaning, with its summary in words.
  const jcards = await pg.locator('[data-testid^=outing-journey-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
  check(jcards.length === 1 && /^Among the shops/.test(jcards[0]) && /Around here\. Antiques\. [\d.]+ (m|km|ft|mi) on foot\./.test(jcards[0]), `OJ17, OJ18, OJ21: one journey, named for its leaning, summarised in words (${jcards.join(' | ')})`);
  await shot(pg, '03-journeys');
  await openJourney();
  check(/One way\./.test(await pg.locator('[data-testid=outing-summary]').innerText().catch(() => '')), 'OJ7: where no loop can be made without retracing, the journey is one way and says so');
  await shot(pg, '03-proposal');
  {
    const sb = await pg.locator('[data-testid=outing-start]').boundingBox().catch(() => null);
    const vh = pg.viewportSize()?.height ?? 0;
    check(!!sb && sb.y + sb.height <= vh && sb.height >= 43.5 && !(await pg.locator('[data-testid=outing-start]').isDisabled()), 'quick-circuit ui 1: Start is on screen, ready and at least 44 px tall once a proposal is made');
    const open0 = pg.locator('[data-testid=outing-slot-open-0]');
    check(!!(await open0.getAttribute('aria-label').catch(() => null)) && (await pg.locator('[data-testid=outing-slot-chevron-0]').count()) === 1, 'quick-circuit ui 2: a slot shows a chevron, so it reads as something to open');
    const swapColor = await pg.locator('[data-testid=outing-swap-0] >> text=Swap this stop').evaluate((e) => getComputedStyle(e).color);
    const m = /rgba?\((\d+), (\d+), (\d+)/.exec(swapColor) ?? [];
    check(m.length > 0 && Number(m[1]) < 90 && Number(m[2]) < 90 && Number(m[3]) < 110, `quick-circuit ui 3: Swap this stop is in full ink, not a pale caption (${swapColor})`);
  }
  const slots = await pg.locator('[data-testid^=outing-slot-open-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/[^\x20-\x7e]/g, '').trim()));
  check(slots.length >= 2 && slots.length <= 3, `QC8: two or three stops (${slots.length})`);
  check(slots.every((s) => /^An antiques shop, (a short walk on|a little way on|some way on)$/.test(s ?? '')), `QC17: a slot says its kind and how far, in words (${slots.join(' | ')})`);
  const page = await pg.locator('[data-testid=outing]').innerText();
  check(!NAMES.some((n) => page.includes(n)), 'QC8, QC17, QC24: no shop is named on the page before a tap');
  const labels = await pg.locator('[data-testid=outing] [aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  check(!NAMES.some((n) => labels.some((l) => l && l.includes(n))), 'QC24: no accessible name holds a shop name');
  // The map's own scale bar ("100 m") is the map's, not the outing's words.
  check(!BANNED.test(page.replace(/Opening hours aren't known here\./, '').replace(/\b\d+(\.\d+)? ?(m|km|ft|mi)\b/g, '')), 'QC25, QC28: no digit, time, rank, count or superlative anywhere on the page');
  check((await pg.locator('[data-testid=outing-hours]').innerText().catch(() => '')) === "Opening hours aren't known here.", 'QC20: the hours line is one plain statement');
  // QC18: a tap names the shop on a card; nothing about hours on the card.
  await pg.click('[data-testid=outing-slot-open-0]');
  const card = await pg.locator('[data-testid=outing-card]').innerText().catch(() => '');
  check(NAMES.some((n) => card.includes(n)) && !/hour|open|closed|unknown/i.test(card), `QC18: a tap names the shop on a card and says nothing of hours (${card.replace(/\s+/g, ' ')})`);
  // QC21: Swap closes the card and the new slot is unnamed.
  await shot(pg, '04-card');
  const swapLabel = (await pg.locator('[data-testid=outing-swap-0]').innerText()).replace(/[^\x20-\x7e]/g, '').trim();
  await pg.click('[data-testid=outing-swap-0]');
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=outing-said]').innerText().catch(() => '')) === 'Swapped for another one.', 'quick-circuit ui 4: a swap says it swapped, in a plain line');
  const after = await pg.locator('[data-testid=outing]').innerText();
  check(swapLabel === 'Swap this stop' && (await pg.locator('[data-testid=outing-card]').count()) === 0 && !NAMES.some((n) => after.includes(n)), 'QC21: Swap is worded "Swap this stop", closes the card and leaves the new slot unnamed');
  await shot(pg, '05-after-swap');
  // QC21: a second Swap on the same slot never repeats a shop it offered and never wraps; with none left it says so and changes nothing.
  {
    const seen = [];
    let none = false;
    for (let k = 0; k < 8 && !none; k++) {
      await pg.click('[data-testid=outing-slot-open-0]');
      const name = ((await pg.locator('[data-testid=outing-card]').innerText().catch(() => '')) ?? '').trim();
      seen.push(NAMES.find((n) => name.includes(n)) ?? name);
      await pg.click('[data-testid=outing-swap-0]');
      await pg.waitForTimeout(300);
      none = (await pg.locator('[data-testid=outing-said]').innerText().catch(() => '')) === 'No other one within reach.';
    }
    check(none, `QC21: Swap runs out of other shops and says "No other one within reach." (${seen.join(' | ')})`);
    // A slot is a place in the order, not a shop (a swap replans the order), so the names at slot 0 may return; what the swaps never do is
    // go on for ever (no wrap): the four shops run out in a few. Not offering one twice to a slot is the unit test `swap.test.ts`.
    check(none && seen.length <= 5, `QC21: the swaps end rather than wrap (${seen.length} swaps)`);
    await pg.click('[data-testid=outing-slot-open-0]');
    const last = (await pg.locator('[data-testid=outing-card]').innerText().catch(() => '')) ?? '';
    check(seen.length >= 1 && NAMES.some((n) => last.includes(n)), 'QC21: with none left the proposal is as it was');
    await pg.click('[data-testid=outing-slot-open-0]');
  }
  // QC29: the pack was asked for only after the first pick, by byte ranges of its one file, with no cookie or referer.
  check(packAsked().length > 0 && packAsked().every((a) => /^bytes=\d+-\d+$/.test(a.range ?? '') && !a.cookie && !a.referer), `QC29: the stores pack is read by byte ranges after a pick (${packAsked().length} requests)`);
  check(places.asked.every((a) => a.name === 'manifest.json' || a.name === storesFile || a.name === placesFile), 'QC29: nothing else is asked of the host');
  // QC41: Include chains is kept across a reload.
  await backToChips();
  await pg.click('[data-testid=outing-chains]');
  check((await pg.locator('[data-testid=outing-chains]').getAttribute('aria-checked')) === 'true', 'QC41: Include chains turns on');
  await pg.waitForTimeout(500);
  const reopen = async () => {
    await pg.goto(exploreUrl);
    await pg.locator('[data-testid=outing-entry]').waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
    await pg.click('[data-testid=outing-entry]');
    await pg.waitForSelector('[data-testid=outing-nowhere]', { timeout: 15000 }).catch(() => {});
  };
  await backToChips();
  await pg.reload();
  const before = packAsked().length;
  await reopen();
  check(packAsked().length === before, 'OJ35: opening the page again reads no pack before a place is given');
  await aroundHere();
  await only([]);
  check((await pg.locator('[data-testid=outing-chains]').getAttribute('aria-checked')) === 'true', 'QC41: Include chains stays on after a reload');
  await pg.click('[data-testid=outing-chains]');
  await pg.waitForTimeout(500);
  await pg.reload();
  await reopen();
  await aroundHere();
  await only([]);
  check((await pg.locator('[data-testid=outing-chains]').getAttribute('aria-checked')) === 'false', 'QC41: and off stays off');
  // QC14: Books comes from the stores pack alone (the tiles have no bookshop).
  const cardName = async (i) => {
    await pg.click(`[data-testid=outing-slot-open-${i}]`);
    const t = ((await pg.locator('[data-testid=outing-card]').innerText().catch(() => '')) ?? '').trim();
    await pg.click(`[data-testid=outing-slot-open-${i}]`);
    return t;
  };
  const packBefore = packAsked().length;
  await only(['books']);
  await openJourney();
  const bookSlots = await pg.locator('[data-testid^=outing-slot-open-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/[^\x20-\x7e]/g, '').trim()));
  check(bookSlots.length >= 2 && bookSlots.every((t) => /^A bookshop, /.test(t)), `QC14: Books proposes bookshops from the pack (${bookSlots.join(' | ')})`);
  const bookCard = await cardName(0);
  check(BOOKS.some((n) => bookCard.includes(n)), `QC14, QC18: a tap names a bookshop from the pack (${bookCard.replace(/\s+/g, ' ')})`);
  check(packAsked().length >= packBefore && packAsked().length > 0, 'QC29: the pack is read once a place is given');
  await shot(pg, '06-books');
  // QC42: Thrifting matches second-hand shops (the tiles' charity shops) and antiques; Books is put down first.
  await backToChips();
  await only(['thrifting']);
  await openJourney();
  const thriftSlots = await pg.locator('[data-testid^=outing-slot-open-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/[^\x20-\x7e]/g, '').trim()));
  check(thriftSlots.length >= 2 && thriftSlots.every((t) => /^A thrift or antiques shop, /.test(t)), `QC42: Thrifting proposes second-hand and antiques shops (${thriftSlots.join(' | ')})`);
  const thriftNames = [];
  for (let i = 0; i < thriftSlots.length; i++) thriftNames.push(await cardName(i));
  check(thriftNames.every((t) => [...THRIFT, ...NAMES].some((n) => t.includes(n))) && thriftNames.some((t) => THRIFT.some((n) => t.includes(n))),
    `QC42: at least one stop is a charity shop from the tiles (${thriftNames.map((t) => t.replace(/\s+/g, ' ')).join(' | ')})`);
  await shot(pg, '07-thrifting');
  // Back to Antiques for Start.
  await backToChips();
  await only(['antiques']);
  await openJourney();
  // QC22: Start begins an ordinary walk with a destination, distance only.
  await pg.click('[data-testid=outing-start]');
  await pg.waitForSelector('[data-testid=nav-bar]', { timeout: 90000 }).catch(() => {});
  check((await pg.locator('[data-testid=nav-bar]').count()) === 1 && (await pg.locator('[data-testid=outing]').count()) === 0, 'QC22: Start begins a walk that follows the proposal');
  const nav = await pg.locator('[data-testid=nav-bar]').innerText().catch(() => '');
  check(!NAMES.some((n) => nav.includes(n)) && !/\b(min|minutes|hour|ETA)\b/i.test(nav), 'QC22, QC24: the walk names no shop and says no time');
  // QC19, QC26: at a stop the walk says its name once, as a line, looked up then; nothing else.
  let said = '';
  // Walked along the street at 25 m a second, as the walk journey does, so no fix is thrown away as a jump.
  for (let x = -248; x <= -234 && !said; x += 0.25) {
    const p = at(x, 0.15);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
    if ((await pg.locator('[data-testid=outing-arrival]').count()) > 0) said = await pg.locator('[data-testid=outing-arrival]').innerText();
  }
  check(NAMES.includes(said.trim()), `QC19: within reach of a stop the walk says its name (${said})`);
  await c.close();
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

module.exports = {
  name: 'outing',
  covers: [
    'src/lib/outing/**',
    'src/components/outing/**',
    'src/lib/presence/presence.ts',
    'src/app/(tabs)/explore.tsx',
  ],
  run,
};
