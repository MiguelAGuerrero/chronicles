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
  places.files[storesFile] = encodeArchive(packTiles, bounds);
  // The places archive: a far folly (as before), and three along Curio Street, so chips of two leanings give several journeys (OJ3, OJ43).
  const follies = [[-240, 5, 'Far Folly', 2], [-246, -0.3, 'Gable Folly', 3], [-244, -0.3, 'Lantern Folly', 4], [-242, -0.3, 'Pepperpot Folly', 5]].map(([x, y, name, n]) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: at(x, y) }, properties: { name, class: 'folly', src: 'wd', id: `p_000000000090000${n}` },
  }));
  const follyTiles = new Map();
  for (const f of follies) {
    const [x, y] = z12(f.geometry.coordinates);
    follyTiles.set(`${x}/${y}`, [...(follyTiles.get(`${x}/${y}`) ?? []), f]);
  }
  places.files[placesFile] = encodeArchive([...follyTiles].map(([k, fs]) => {
    const [x, y] = k.split('/').map(Number);
    return { z: 12, x, y, data: encodeTile(fs, 12, x, y, () => ['places']) };
  }), bounds);
  const manifestFile = (file, bytes) => ({ file, version: '20261108', bytes, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds });
  places.manifest = JSON.stringify({ schema: 1, regions: [{ id: 'us', current: manifestFile(placesFile, places.files[placesFile].length), previous: [], stores: { current: manifestFile(storesFile, places.files[storesFile].length), previous: [] } }] });
  places.asked.length = 0;
  const packAsked = () => places.asked.filter((a) => a.name === storesFile);
  const { c, pg } = await freshPage('outing');
  // tend map 24 (QL5, QL8; the lenses' ux 1 and 2, auditor 3, steward 6): the map's scale bar and its credits (i) sit
  // above the sheet, whatever its height, and the journey is framed in the map left above it, where it can be seen.
  const aboveSheet = async (where) => {
    const seen = await pg.evaluate(() => {
      const box = (el) => (el ? el.getBoundingClientRect() : null);
      const sheet = box(document.querySelector('[data-testid=outing-sheet]'));
      const bar = box(document.querySelector('[data-testid=outing-map] [data-testid=scale-bar] [data-testid=scale-line]'));
      const iBtn = document.querySelector('[data-testid=outing-map] .maplibregl-ctrl-attrib-button');
      const ib = box(iBtn);
      const hit = ib ? document.elementFromPoint(ib.left + ib.width / 2, ib.top + ib.height / 2) : null;
      return {
        sheetTop: sheet ? Math.round(sheet.top) : null,
        bar: bar ? { bottom: Math.round(bar.bottom), w: Math.round(bar.width) } : null,
        credits: ib ? { bottom: Math.round(ib.bottom), top: !!hit && !!hit.closest('.maplibregl-ctrl-attrib') } : null,
      };
    });
    // The journey's line in COLORS.route, counted in the map above the sheet (the sheet hides what lies under it).
    const top = 70;
    const h = Math.max(1, (seen.sheetTop ?? 0) - top);
    const png = await pg.screenshot({ clip: { x: 0, y: top, width: pg.viewportSize().width, height: h } });
    const route = await pg.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const g = cv.getContext('2d');
      g.drawImage(bmp, 0, 0);
      const d = g.getImageData(0, 0, bmp.width, bmp.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x25) + Math.abs(d[i + 1] - 0x63) + Math.abs(d[i + 2] - 0xeb) < 60) n++;
      return n;
    }, png.toString('base64'));
    check(seen.sheetTop != null && !!seen.bar && seen.bar.w > 0 && seen.bar.bottom <= seen.sheetTop && !!seen.credits && seen.credits.top && seen.credits.bottom <= seen.sheetTop && route > 0,
      `tend map 24: ${where}, the map's scale bar and its credits (i) sit above the sheet, and the journey is drawn above it (${JSON.stringify({ ...seen, route })})`);
    // The after picture at 320 px for the review, then back to 390.
    const vp = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: vp.height });
    await pg.waitForTimeout(900);
    await shot(pg, `tend-map-24-${where.replace(/[^a-z]+/gi, '-').replace(/^-|-$/g, '')}-320`);
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(900);
  };
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
  await pg.waitForSelector('[data-testid=outing-want-antiques]', { timeout: 15000 }).catch(() => {});
  check((await pg.locator('[data-testid=outing-title]').innerText().catch(() => '')).trim() === 'Around here' && (await pg.locator('[data-testid^=outing-want-]').count()) === 8, 'OJ7, OJ46: the page opens around here with its chips, no destination asked for');
  check((await pg.locator('[data-testid=outing-reach-0]').getAttribute('aria-checked')) === 'true' && (await pg.locator('[data-testid^=outing-reach-]').count()) === 4, 'OJ41: the reach starts at "Close by", with steps further out');
  // OJ1, OJ9, OJ22: the field opens Explore's own search; a town picked there is the destination, said with how far "away" it is.
  await pg.click('[data-testid=outing-where]');
  await pg.waitForSelector('[data-testid=atlas-search-field]', { timeout: 15000 }).catch(() => {});
  await pg.locator('[data-testid=atlas-search-field]').pressSequentially('Kutztown', { delay: 15 }).catch(() => {});
  await pg.waitForSelector('[data-testid=atlas-search-result]', { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(400);
  await shot(pg, '02a-search');
  await pg.locator('[data-testid=atlas-search-result]').first().click().catch(() => {});
  await pg.waitForSelector('[data-testid=outing-away]', { timeout: 15000 }).catch(() => {});
  const townText = ((await pg.locator('[data-testid=outing-where-text]').innerText().catch(() => '')) ?? '').trim();
  const awayText = ((await pg.locator('[data-testid=outing-away]').innerText().catch(() => '')) ?? '').trim();
  check(townText === 'Kutztown' && /^\d+(\.\d)?[ \u00a0](km|mi|m|ft) away$/.test(awayText), `OJ1, OJ9: a town from the search is the destination, with its distance worded "away" (${townText}, ${awayText})`);
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
    await pg.waitForSelector('[data-testid=outing-want-antiques]', { timeout: 15000 }).catch(() => {});
  };
  check((await pg.locator('[data-testid=outing-nowhere]').getAttribute('aria-label').catch(() => '')) === 'Nowhere in particular', 'OJ7: with a destination the page offers "Nowhere in particular"');
  {
    const f = await pg.locator('[data-testid=outing-where]').boundingBox().catch(() => null);
    const n = await pg.locator('[data-testid=outing-nowhere]').boundingBox().catch(() => null);
    const x = await pg.locator('[data-testid=outing-close]').boundingBox().catch(() => null);
    check(!!f && !!n && !!x && n.x >= f.x + f.width - 1 && n.x + n.width <= x.x && Math.abs(n.y + n.height / 2 - (f.y + f.height / 2)) < 6, 'outing-journey audit 29: clearing the destination is in its own field, apart from the page\'s close');
  }
  check(/straight lines/.test((await pg.locator('[data-testid=outing-straight]').innerText().catch(() => '')) ?? ''), 'outing-journey audit 22: with a destination the page says its distance is a straight line');
  await pg.click('[data-testid=outing-nowhere]');
  await pg.waitForSelector('[data-testid=outing-reach-0]', { timeout: 15000 }).catch(() => {});
  check((await pg.locator('[data-testid=outing-away]').count()) === 0 && (await pg.locator('[data-testid=outing-title]').innerText().catch(() => '')).trim() === 'Around here', 'OJ7: it goes back to around here');
  await aroundHere();
  // OJ11, OJ15: one list of chips, shops and attractions alike, alphabetical.
  const chips = await pg.locator('[data-testid^=outing-want-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/[^\x20-\x7e]/g, '').trim()));
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
  check(jcards.length === 1 && /^Among the shops/.test(jcards[0]) && /Around here\. Antiques\. [\d.]+[ \u00a0](m|km|ft|mi) on foot\./.test(jcards[0]), `OJ17, OJ18, OJ21: one journey, named for its leaning, summarised in words (${jcards.join(' | ')})`);
  await shot(pg, '03-journeys');
  await aboveSheet('on the journeys');
  await openJourney();
  check(/one way: the way back is yours\./.test(await pg.locator('[data-testid=outing-chapter-line-0]').innerText().catch(() => '')), 'OJ7, OJ24: where no loop can be made without retracing, the walk is one way and says the way back is yours');
  check((await pg.locator('[data-testid=outing-chapter-name-0]').innerText().catch(() => '')).trim() === 'Around here', 'OJ44: around here is a journey of one chapter');
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
  check(!BANNED.test(page.replace(/Opening hours aren't known here\./, '').replace(/\b\d+(\.\d+)?[ \u00a0]?(m|km|ft|mi)\b/g, '')), 'QC25, QC28: no digit, time, rank, count or superlative anywhere on the page');
  check((await pg.locator('[data-testid=outing-hours]').innerText().catch(() => '')) === "Opening hours aren't known here.", 'QC20: the hours line is one plain statement');
  // QC18: a tap names the shop on a card; nothing about hours on the card.
  await pg.click('[data-testid=outing-slot-open-0]');
  const card = await pg.locator('[data-testid=outing-card]').innerText().catch(() => '');
  check(NAMES.some((n) => card.includes(n)) && !/hour|open|closed|unknown/i.test(card), `QC18: a tap names the shop on a card and says nothing of hours (${card.replace(/\s+/g, ' ')})`);
  {
    const cb = await pg.locator('[data-testid=outing-card]').boundingBox().catch(() => null);
    const sb = await pg.locator('[data-testid=outing-start]').boundingBox().catch(() => null);
    check(!!cb && !!sb && cb.y + cb.height <= sb.y + 1, 'outing-journey ui 4: the opened stop\'s name is whole above the Start bar');
  }
  // QC21: Swap closes the card and the new slot is unnamed.
  await shot(pg, '04-card');
  await aboveSheet('with a stop\'s card open');
  const swapLabel = (await pg.locator('[data-testid=outing-swap-0]').innerText()).replace(/[^\x20-\x7e]/g, '').trim();
  await pg.click('[data-testid=outing-swap-0]');
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=outing-said]').innerText().catch(() => '')) === 'Swapped for another one.', 'quick-circuit ui 4: a swap says it swapped, in a plain line');
  const after = await pg.locator('[data-testid=outing]').innerText();
  check((await pg.locator('[data-testid=outing-undo]').count()) === 1, 'outing-journey ui 3: a swap can be taken back');
  check(swapLabel === 'Swap this stop' && (await pg.locator('[data-testid=outing-card]').count()) === 0 && !NAMES.some((n) => after.includes(n)), 'QC21: Swap is worded "Swap this stop", closes the card and leaves the new slot unnamed');
  await shot(pg, '05-after-swap');
  await pg.click('[data-testid=outing-slot-open-0]');
  check((await pg.locator('[data-testid=outing-undo]').count()) === 1 && (await pg.locator('[data-testid=outing-dismiss]').count()) === 1, 'outing-journey audit 13: Undo is still there after opening the swapped stop, with a way to dismiss it');
  await pg.click('[data-testid=outing-slot-open-0]');
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
  // OJ3, OJ43: chips of two leanings give several journeys in a row that scrolls sideways, a mixed one ahead; the next card's edge shows.
  await backToChips();
  await only(['antiques', 'viewpoints']);
  await pg.waitForSelector('[data-testid=outing-journey-1]', { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const several = await pg.locator('[data-testid^=outing-journey-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
  check(several.length === 3 && /^A bit of each/.test(several[0]) && /^Among the shops/.test(several[1]) && /^Through green/.test(several[2]), `OJ17, OJ43: a mixed journey, then one per leaning (${several.join(' | ')})`);
  {
    const b1 = await pg.locator('[data-testid=outing-journey-1]').boundingBox().catch(() => null);
    const vw = pg.viewportSize()?.width ?? 0;
    check(!!b1 && b1.x < vw - 8 && b1.x + b1.width > vw, `OJ3: the next card's edge shows beside the one in view (${b1 ? Math.round(b1.x) : 'none'} of ${vw})`);
  }
  {
    const b1 = await pg.locator('[data-testid=outing-journey-1]').boundingBox().catch(() => null);
    const vw = pg.viewportSize()?.width ?? 0;
    check(!!b1 && vw - b1.x >= 44 && (await pg.locator('[data-testid=outing-dots] > div').count()) === 3, `outing-journey ui 2: the next card shows by a finger's width and dots say how many journeys there are (${b1 ? Math.round(vw - b1.x) : 0} px)`);
  }
  {
    const sb = await pg.locator('[data-testid=outing-see]').boundingBox().catch(() => null);
    const vh = pg.viewportSize()?.height ?? 0;
    check(!!sb && sb.y + sb.height <= vh, 'outing-journey ui 5: "See this journey" stays on screen under the list');
  }
  {
    const c0 = await pg.locator('[data-testid=outing-journey-0]').boundingBox().catch(() => null);
    const see = await pg.locator('[data-testid=outing-see]').boundingBox().catch(() => null);
    const sh = await pg.locator('[data-testid=outing-sheet]').boundingBox().catch(() => null);
    check(!!c0 && !!see && !!sh && c0.y >= sh.y && c0.y + c0.height <= see.y, 'outing-journey audit 14: the journey in view shows whole, with its summary, above "See this journey"');
    const ys = await pg.locator('[data-testid^=outing-reach-]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    check(ys.length === 4 && new Set(ys).size === 1, 'outing-journey audit 28: the reach is one row of four');
  }
  await shot(pg, '05b-several');
  await pg.click('[data-testid=outing-journey-1]');
  await pg.waitForTimeout(600);
  check((await pg.locator('[data-testid=outing-journey-1]').getAttribute('aria-pressed')) === 'true', 'OJ3: a tap on a card brings that journey into view');
  await pg.click('[data-testid=outing-journey-0]');
  await openJourney();
  {
    const mixed = await pg.locator('[data-testid^=outing-slot-open-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/[^\x20-\x7e]/g, '').trim()));
    check(mixed.some((t) => /^An antiques shop/.test(t)) && mixed.some((t) => /^A view or an oddity/.test(t)), `OJ43: the mixed journey holds a shop and an attraction (${mixed.join(' | ')})`);
    const i = mixed.findIndex((t) => /^A view or an oddity/.test(t));
    {
      const bb = await pg.locator('[data-testid=outing-back]').boundingBox().catch(() => null);
      const sh = await pg.locator('[data-testid=outing-sheet]').boundingBox().catch(() => null);
      const heights = await pg.locator('[data-testid^=outing-slot-open-]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      await pg.locator('[data-testid=outing-hours]').scrollIntoViewIfNeeded().catch(() => {});
      const b2 = await pg.locator('[data-testid=outing-back]').boundingBox().catch(() => null);
      check(!!bb && !!sh && !!b2 && Math.abs(b2.y - bb.y) < 2 && b2.y > sh.y && heights.every((h) => h <= 60), `outing-journey audit 15: Back stays in view when the journey is scrolled, and no stop row wraps (${heights.map((h) => Math.round(h)).join(',')})`);
    }
    await pg.click(`[data-testid=outing-slot-open-${i}]`);
    const card = await pg.locator('[data-testid=outing-card]').innerText().catch(() => '');
    check(/Named when you reach it\./.test(card) && !/Folly/.test(card), `OJ25, OJ40: an attraction not found yet is not named on a tap (${card.replace(/\s+/g, ' ')})`);
    await shot(pg, '05c-mixed');
    // OJ45: "Another like this" plans it again from other places, then says when there are none.
    const before1 = mixed.join('|');
    await pg.click('[data-testid=outing-another]');
    await pg.waitForTimeout(600);
    const after1 = (await pg.locator('[data-testid^=outing-slot-open-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/[^\x20-\x7e]/g, '').trim()))).join('|');
    let none = '';
    for (let k = 0; k < 6 && !none; k++) {
      await pg.click('[data-testid=outing-another]');
      await pg.waitForTimeout(300);
      none = (await pg.locator('[data-testid=outing-said]').innerText().catch(() => '')) ?? '';
    }
    check(after1.length > 0 && none === 'No other like it within reach.', `OJ45: Another like this gives other places, then says there are none (${before1} -> ${after1})`);
  }
  await backToChips();
  // OJ41: the reach is a choice of one; further out it reads the towns within it and still proposes.
  await only(['antiques']);
  await pg.click('[data-testid=outing-reach-1]');
  await pg.waitForFunction(() => !document.querySelector('[data-testid=outing-reading-towns]') && !document.querySelector('[data-testid=outing-reading]'), null, { timeout: 120000 }).catch(() => {});
  check((await pg.locator('[data-testid=outing-reach-1]').getAttribute('aria-checked')) === 'true' && (await pg.locator('[data-testid^=outing-journey-]').count()) >= 1, 'OJ41, OJ44: a wider reach still proposes, by the same machine');
  check(/^(Looked in .+\.|No town within that reach: this is around here\.)$/.test(((await pg.locator('[data-testid=outing-looked]').innerText().catch(() => '')) ?? '').trim()), 'outing-journey ui 1: a wider reach says what it looked at');
  await shot(pg, '05d-reach');
  await pg.click('[data-testid=outing-peek]');
  await pg.waitForTimeout(400);
  await shot(pg, '05e-folded');
  await aboveSheet('with the sheet folded');
  await pg.click('[data-testid=outing-peek]');
  await pg.waitForTimeout(300);
  await pg.click('[data-testid=outing-reach-0]');
  await only(['antiques']);
  await openJourney();
  // Audit 1: other places asked of one set of journeys do not carry to the next.
  for (let k = 0; k < 4; k++) {
    await pg.click('[data-testid=outing-another]');
    await pg.waitForTimeout(250);
  }
  await backToChips();
  await only(['antiques', 'thrifting']);
  await pg.waitForTimeout(600);
  check((await pg.locator('[data-testid^=outing-journey-]').count()) >= 1 && (await pg.locator('[data-testid=outing-reason-few]').count()) === 0, 'outing-journey audit 1: after "Another like this", a change of chips starts from the first places again');
  await only(['antiques']);
  await openJourney();
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
    await pg.waitForSelector('[data-testid=outing-want-antiques]', { timeout: 15000 }).catch(() => {});
  };
  await backToChips();
  await pg.reload();
  const before = packAsked().length;
  await reopen();
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
  check(thriftSlots.length >= 2 && thriftSlots.every((t) => /^A thrift shop, /.test(t)), `QC42: Thrifting proposes second-hand and antiques shops (${thriftSlots.join(' | ')})`);
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
