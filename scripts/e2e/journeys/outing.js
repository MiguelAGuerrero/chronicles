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
    await pg.waitForTimeout(1800);
    // tend map audit 50 (the diff review's ux U1): no stop, and not you, lies under the scale bar or the credits (i).
    {
      const shops = [-247, -243, -239, -235].map((x) => at(x, 0.3));
      const under = await pg.evaluate(([pts, you]) => {
        const box = (sel) => document.querySelector(sel)?.getBoundingClientRect() ?? null;
        const bar = box('[data-testid=outing-map] [data-testid=scale-bar]');
        const iB = box('[data-testid=outing-map] .maplibregl-ctrl-attrib-button');
        const inside = (r, [x, y]) => !!r && x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
        return [...pts, you].map((p) => window.__project(p)).filter((xy) => inside(bar, xy) || inside(iB, xy)).map((xy) => xy.map(Math.round));
      }, [shops, here]);
      check(under.length === 0, `tend map audit 50: ${where} at 320, no stop and not you lie under the scale bar or the credits (i) (${JSON.stringify(under)})`);
    }
    await shot(pg, `tend-map-24-${where.replace(/[^a-z]+/gi, '-').replace(/^-|-$/g, '')}-320`);
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(900);
  };
  const here = at(-248, 0);
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  // The map's projection for the checks below (`window.__project`), defined only when the page asks for perf counts.
  await c.addInitScript(() => { window.__perf = {}; });
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
  // tend map audit 51 (the diff review's ux U2): with nothing chosen yet, the map already shows its credits (i) above the sheet.
  {
    // The sheet grows as the chips arrive: the (i) follows it, so it is read once it has caught up (or after 6 s). The page is
    // brought to the front first: react-native-web measures a layout in an animation frame, which a page behind another
    // never gets, so a sheet that grew while the shot was taken was never measured.
    await pg.bringToFront();
    // The page reads its own fix as it opens (fix outing-current-position), so the journeys around here come a beat later and
    // the sheet grows then: read once it has, or the (i) is caught in the half second before the sheet's next measure.
    await pg.waitForSelector('[data-testid=outing-journey-0], [data-testid^=outing-reason-]', { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(1200);
    await pg.waitForFunction(() => {
      const b = document.querySelector('[data-testid=outing-map] .maplibregl-ctrl-attrib-button')?.getBoundingClientRect();
      const sheet = document.querySelector('[data-testid=outing-sheet]')?.getBoundingClientRect();
      return !!b && !!sheet && b.width > 0 && b.bottom <= sheet.top;
    }, null, { timeout: 6000 }).catch(() => {});
    const seen = await pg.evaluate(() => {
      const b = document.querySelector('[data-testid=outing-map] .maplibregl-ctrl-attrib-button')?.getBoundingClientRect();
      const sheet = document.querySelector('[data-testid=outing-sheet]')?.getBoundingClientRect();
      const hit = b ? document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) : null;
      const ctl = document.querySelector('[data-testid=outing-map] .maplibregl-ctrl-attrib');
      const bar = document.querySelector('[data-testid=outing-map] [data-testid=scale-bar]')?.getBoundingClientRect();
      return { i: b ? Math.round(b.bottom) : null, sheetTop: sheet ? Math.round(sheet.top) : null, top: !!hit && !!hit.closest('.maplibregl-ctrl-attrib'),
        margin: ctl ? getComputedStyle(ctl).marginBottom : null, bar: bar ? Math.round(bar.bottom) : null };
    });
    check(seen.i != null && seen.sheetTop != null && seen.i <= seen.sheetTop && seen.top,
      `tend map audit 51: with nothing chosen yet, the outing map shows its credits (i) above the sheet (${JSON.stringify(seen)})`);
  }
  // tend map audit 52 (the diff review's ux U3): with no journey yet, the map frames where you are in the band above the sheet.
  {
    await pg.waitForTimeout(1500);
    const at0 = await pg.evaluate((p) => (window.__project ? window.__project(p) : null), here);
    const band = await pg.evaluate(() => {
      const sheet = document.querySelector('[data-testid=outing-sheet]')?.getBoundingClientRect();
      const field = document.querySelector('[data-testid=outing-where]')?.getBoundingClientRect();
      const bar = document.querySelector('[data-testid=outing-map] [data-testid=scale-bar]')?.getBoundingClientRect();
      return { top: field ? Math.round(field.bottom) : null, bottom: bar ? Math.round(bar.top) : sheet ? Math.round(sheet.top) : null };
    });
    check(!!at0 && band.top != null && band.bottom != null && at0[1] > band.top && at0[1] < band.bottom && at0[0] > 0 && at0[0] < (pg.viewportSize()?.width ?? 0),
      `tend map audit 52: with no journey yet, the outing map shows where you are between the field and the scale row (${JSON.stringify({ at: at0 && at0.map(Math.round), band })})`);
  }
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
  check(JSON.stringify(chips) === JSON.stringify(['Antiques', 'Art', 'Books', 'Culture', 'Green', 'History', 'Thrifting', 'Views & oddities']), `OJ11, OJ15: the chips are one alphabetical list (${chips.join(',')})`);
  // tend explore T63 (decisions 0239, 0264): the attraction chips say the one table's names, "Views & oddities" the longest; on and off,
  // at 390 and 320 px, every chip is whole: one line, nothing cut, inside the page, none over another, all one height.
  {
    const { categoryOf } = require('tsx/cjs/api').require('../../../src/lib/discovery/categories.ts', __filename);
    const named = await pg.locator('[data-testid^=outing-want-]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-testid').slice('outing-want-'.length), e.getAttribute('aria-label')]));
    const kinds = named.filter(([id]) => ['art', 'culture', 'history', 'parks', 'viewpoints'].includes(id));
    check(kinds.length === 5 && kinds.every(([id, said]) => said === categoryOf(id).label) && kinds.some(([id, said]) => id === 'viewpoints' && said === 'Views & oddities'),
      `tend explore T63: the attraction chips say the one table's names, "Views & oddities" among them (${JSON.stringify(kinds)})`);
    const measure = () => pg.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const boxes = [...document.querySelectorAll('[data-testid^=outing-want-]')].map((c) => {
        const r = c.getBoundingClientRect();
        const leaf = [...c.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]/.test(x.textContent || ''));
        const range = document.createRange();
        if (leaf) range.selectNodeContents(leaf);
        const t = leaf ? range.getBoundingClientRect() : null;
        return {
          id: c.getAttribute('data-testid').slice('outing-want-'.length), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width),
          lines: leaf ? new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size : 0, cut: !leaf || leaf.scrollWidth > leaf.clientWidth + 1,
          inChip: !!t && t.left >= r.left - 0.5 && t.right <= r.right + 0.5, pressed: c.getAttribute('aria-pressed') === 'true',
        };
      });
      const overlap = boxes.some((a, i) => boxes.some((b, j) => j > i && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
      return { vw, boxes, overlap, rows: new Set(boxes.map((b) => b.top)).size };
    });
    const whole = (m) => m.boxes.length === 8 && !m.overlap && m.boxes.every((b) => b.lines === 1 && !b.cut && b.inChip && b.left >= 16 && b.right <= m.vw - 16 && b.h >= 44 && b.h === m.boxes[0].h);
    const vp = pg.viewportSize();
    for (const width of [390, 320]) {
      await pg.setViewportSize({ width, height: vp.height });
      await pg.waitForTimeout(600);
      for (const turn of [false, true]) {
        if (turn) {
          await pg.click('[data-testid=outing-want-viewpoints]');
          await pg.waitForTimeout(400);
        }
        const m = await measure();
        const v = m.boxes.find((b) => b.id === 'viewpoints');
        check(whole(m), `tend explore T63: at ${width} px, "Views & oddities" ${v && v.pressed ? 'on' : 'off'}, every chip is whole, one line, inside the page and none over another (${JSON.stringify({ vw: m.vw, rows: m.rows, overlap: m.overlap, chips: m.boxes.map((b) => `${b.id} ${b.left}-${b.right}x${b.top} h${b.h} l${b.lines}${b.cut ? ' cut' : ''}${b.inChip ? '' : ' out'}${b.pressed ? ' on' : ''}`) })})`);
        await shot(pg, `tend-explore-T63-chips-${width}-${v && v.pressed ? 'on' : 'off'}`);
      }
      await pg.click('[data-testid=outing-want-viewpoints]');
      await pg.waitForTimeout(400);
    }
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(600);
  }
  // OJ12: shop chips start off.
  const pressed = async (id) => (await pg.locator(`[data-testid=outing-want-${id}]`).getAttribute('aria-pressed')) === 'true';
  check(!(await pressed('antiques')) && !(await pressed('books')) && !(await pressed('thrifting')) && (await pressed('history')), 'OJ12: shop chips start off; attractions follow "What I\'m into"');
  // tend explore T63 (decision 0264: sentences keep the noun): with "Views & oddities" on, a card's summary and the town line say
  // "Views", never the chip's name with its "&", at 390 and 320 px.
  {
    const vp = pg.viewportSize();
    await only(['viewpoints']);
    for (const width of [390, 320]) {
      await pg.setViewportSize({ width, height: vp.height });
      await pg.waitForSelector('[data-testid=outing-journey-0]', { timeout: 90000 }).catch(() => {});
      await pg.waitForTimeout(600);
      const card = (await pg.locator('[data-testid=outing-journey-0]').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      await openJourney();
      const town = (await pg.locator('[data-testid=outing-chapter-line-0]').innerText().catch(() => '')).trim();
      check(/\bViews\./.test(card) && /^Views here\./.test(town) && !/&|oddities/.test(card + town),
        `tend explore T63: at ${width} px a card's summary and the town line keep the noun, "Views" (${JSON.stringify({ card, town })})`);
      await shot(pg, `tend-explore-T63-town-${width}`);
      await backToChips();
    }
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(600);
  }
  // tend outing T64 (the owner's yes in person, 2026-11-25): the leaning over parks and views is named "Through green and views",
  // the longest leaning name; at 390 and 320 px it is whole on its card and as the opened journey's title: one line, nothing cut,
  // inside its card and the page, the card above "See this journey", the title beside Back and not over it.
  {
    const NAME = 'Through green and views';
    const measure = (sel) => pg.evaluate(([s]) => {
      const vw = document.documentElement.clientWidth;
      const el = document.querySelector(s);
      if (!el) return null;
      const leaf = el.childElementCount === 0 ? el : [...el.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]/.test(x.textContent || ''));
      const box = el.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(leaf);
      const t = range.getBoundingClientRect();
      const cs = getComputedStyle(leaf);
      return {
        vw, text: (leaf.textContent || '').trim(), lines: new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size,
        cut: leaf.scrollWidth > leaf.clientWidth + 1 || (cs.textOverflow === 'ellipsis' && t.right > leaf.getBoundingClientRect().right + 0.5),
        textW: Math.round(t.width), leafL: Math.round(leaf.getBoundingClientRect().left), leafR: Math.round(leaf.getBoundingClientRect().right),
        left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom), h: Math.round(box.height),
        inBox: t.left >= box.left - 0.5 && t.right <= box.right + 0.5,
      };
    }, [sel]);
    const vp = pg.viewportSize();
    await only(['viewpoints']);
    for (const width of [390, 320]) {
      await pg.setViewportSize({ width, height: vp.height });
      await pg.waitForSelector('[data-testid=outing-journey-0]', { timeout: 90000 }).catch(() => {});
      await pg.waitForTimeout(600);
      const card = await measure('[data-testid=outing-journey-0]');
      const said = ((await pg.locator('[data-testid=outing-journey-0]').textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
      const name = await pg.evaluate(() => {
        const el = document.querySelector('[data-testid=outing-journey-0]');
        const leaf = el && [...el.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]/.test(x.textContent || ''));
        if (!leaf) return null;
        const r = document.createRange();
        r.selectNodeContents(leaf);
        const t = r.getBoundingClientRect();
        const c = el.getBoundingClientRect();
        return { text: leaf.textContent.trim(), lines: new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size, cut: leaf.scrollWidth > leaf.clientWidth + 1, inCard: t.left >= c.left - 0.5 && t.right <= c.right + 0.5, w: Math.round(t.width), cardW: Math.round(c.width) };
      });
      const see = await pg.locator('[data-testid=outing-see]').boundingBox().catch(() => null);
      check(!!card && !!name && !!see && name.text === NAME && name.lines === 1 && !name.cut && name.inCard && card.left >= 0 && card.bottom <= see.y + 0.5 && said.startsWith(NAME) && /\bViews\./.test(said),
        `tend outing T64: at ${width} px the journey card reads "${NAME}" whole, one line, inside its card, the card above "See this journey" (${JSON.stringify({ name, card: card && { left: card.left, right: card.right, top: card.top, bottom: card.bottom }, see: see && Math.round(see.y), said })})`);
      await shot(pg, `tend-outing-T64-card-${width}`);
      await openJourney();
      const title = await measure('[data-testid=outing-journey-name]');
      const back = await pg.locator('[data-testid=outing-back]').boundingBox().catch(() => null);
      check(!!title && !!back && title.text === NAME && title.lines === 1 && !title.cut && title.inBox && title.leafL >= back.x + back.width - 0.5 && title.right <= title.vw,
        `tend outing T64: at ${width} px the opened journey's title reads "${NAME}" whole, one line, beside Back and inside the page (${JSON.stringify({ title, back: back && { x: Math.round(back.x), r: Math.round(back.x + back.width) } })})`);
      await shot(pg, `tend-outing-T64-title-${width}`);
      await backToChips();
    }
    // With the shops too, three cards: the last, "Through green and views", whole when brought into view at 320 px.
    await only(['antiques', 'viewpoints']);
    await pg.setViewportSize({ width: 320, height: vp.height });
    await pg.waitForSelector('[data-testid=outing-journey-2]', { timeout: 90000 }).catch(() => {});
    await pg.waitForTimeout(600);
    await pg.click('[data-testid=outing-journey-2]').catch(() => {});
    await pg.waitForTimeout(900);
    const third = await pg.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const el = document.querySelector('[data-testid=outing-journey-2]');
      const leaf = el && [...el.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]/.test(x.textContent || ''));
      if (!leaf) return null;
      const r = document.createRange();
      r.selectNodeContents(leaf);
      const t = r.getBoundingClientRect();
      const c = el.getBoundingClientRect();
      return { vw, text: leaf.textContent.trim(), lines: new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size, cut: leaf.scrollWidth > leaf.clientWidth + 1, inCard: t.left >= c.left - 0.5 && t.right <= c.right + 0.5, inPage: t.left >= 0 && t.right <= vw, h: Math.round(c.height), heights: [...document.querySelectorAll('[data-testid^=outing-journey-]')].map((x) => Math.round(x.getBoundingClientRect().height)) };
    });
    check(!!third && third.text === NAME && third.lines === 1 && !third.cut && third.inCard && third.inPage,
      `tend outing T64: at 320 px, among three journeys, the card "${NAME}" in view is whole, one line, inside its card and the page (${JSON.stringify(third)})`);
    await shot(pg, 'tend-outing-T64-three-320');
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(600);
  }
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
  // tend map audit 49 (the diff review's auditor 3), last before the chips, since the hand's move is kept for this journey:
  // on a tall screen the sheet is under its cap, so opening a stop's row makes it taller; after the person moved the map,
  // that never frames the journey again over their move.
  {
    await pg.setViewportSize({ width: 390, height: 1400 });
    await pg.waitForTimeout(1500);
    const center = () => pg.evaluate(() => document.querySelector('[data-testid=outing-map] [data-center]')?.getAttribute('data-center') ?? null);
    const sheetTop = () => pg.evaluate(() => Math.round(document.querySelector('[data-testid=outing-sheet]')?.getBoundingClientRect().top ?? -1));
    await pg.mouse.move(195, 200);
    await pg.mouse.down();
    await pg.mouse.move(275, 240, { steps: 8 });
    await pg.mouse.up();
    await pg.waitForTimeout(1500);
    const c0 = await center();
    const t0 = await sheetTop();
    await pg.click('[data-testid=outing-slot-open-1]').catch(() => {});
    await pg.waitForTimeout(2000);
    const c1 = await center();
    const t1 = await sheetTop();
    const ll = (s) => (s ? s.split(',').map(Number) : null);
    const [a, b] = [ll(c0), ll(c1)];
    const off = a && b ? Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 110540) : null;
    check(t1 !== t0 && off != null && off < 2,
      `tend map audit 49: under the sheet's cap, a stop's row opened after a pan keeps the map where the hand left it (sheet top ${t0} -> ${t1}, centre moved ${off == null ? '-' : off.toFixed(1)} m)`);
    await pg.click('[data-testid=outing-slot-open-1]').catch(() => {});
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForTimeout(1500);
  }
  // OJ3, OJ43: chips of two leanings give several journeys in a row that scrolls sideways, a mixed one ahead; the next card's edge shows.
  await backToChips();
  await only(['antiques', 'viewpoints']);
  await pg.waitForSelector('[data-testid=outing-journey-1]', { timeout: 90000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const several = await pg.locator('[data-testid^=outing-journey-]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
  check(several.length === 3 && /^A bit of each/.test(several[0]) && /^Among the shops/.test(several[1]) && /^Through green and views/.test(several[2]), `OJ17, OJ43: a mixed journey, then one per leaning (${several.join(' | ')})`);
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
  // tend outing audit 1 (the T64 review's A1-A3, U1; the owner in person, 2026-11-25: "Keep words, allow wrapping (Recommended)";
  // decision 0265): while a walk records, the capture stack narrows the sheet; "Through green and views" is whole on its card and
  // as the opened journey's title at 390 and 320 px, never cut: either may wrap (the line count logged), Back level with the
  // title's first line, and the card inside the page.
  {
    await pg.click('[data-testid=walk-minimize]').catch(() => {});
    await pg.waitForSelector('[data-testid=tab-explore]', { timeout: 15000 }).catch(() => {});
    await pg.click('[data-testid=tab-explore]').catch(() => {});
    await pg.locator('[data-testid=outing-entry]').waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
    await pg.waitForTimeout(1000);
    await pg.click('[data-testid=outing-entry]').catch(() => {});
    await pg.waitForSelector('[data-testid=outing-want-viewpoints]', { timeout: 30000 }).catch(() => {});
    await backToChips();
    await only(['viewpoints']);
    const NAME = 'Through green and views';
    const whole = (sel) => pg.evaluate(([s]) => {
      const vw = document.documentElement.clientWidth;
      const el = document.querySelector(s);
      const leaf = el && (el.childElementCount === 0 ? el : [...el.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]/.test(x.textContent || '')));
      if (!leaf) return null;
      const r = document.createRange();
      r.selectNodeContents(leaf);
      const t = r.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const lb = leaf.getBoundingClientRect();
      const cs = getComputedStyle(leaf);
      const rects = [...r.getClientRects()];
      const first = rects[0];
      return {
        vw, text: (leaf.textContent || '').trim(), lines: new Set(rects.map((x) => Math.round(x.top))).size,
        cut: leaf.scrollWidth > leaf.clientWidth + 1 || leaf.scrollHeight > leaf.clientHeight + 1 || (cs.textOverflow === 'ellipsis' && t.right > lb.right + 0.5),
        inBox: t.left >= b.left - 0.5 && t.right <= b.right + 0.5 && t.top >= b.top - 0.5 && t.bottom <= b.bottom + 0.5,
        left: Math.round(b.left), right: Math.round(b.right), firstMid: first ? Math.round(first.top + first.height / 2) : null, textW: Math.round(t.width), slot: Math.round(lb.width),
      };
    }, [sel]);
    const vp = pg.viewportSize();
    for (const width of [390, 320]) {
      await pg.setViewportSize({ width, height: vp.height });
      await pg.waitForSelector('[data-testid=outing-journey-0]', { timeout: 90000 }).catch(() => {});
      await pg.waitForTimeout(800);
      const stack = (await pg.locator('[data-testid=plan-cap-photo]').count()) === 1;
      const card = await whole('[data-testid=outing-journey-0]');
      check(stack && !!card && card.text === NAME && !card.cut && card.inBox && card.left >= 0 && card.right <= card.vw,
        `tend outing audit 1: at ${width} px while a walk records, the card reads "${NAME}" whole, nothing cut, inside its card, the card inside the page (${JSON.stringify({ stack, card })})`);
      await shot(pg, `tend-outing-audit-1-recording-card-${width}`);
      await openJourney();
      const title = await whole('[data-testid=outing-journey-name]');
      const back = await pg.locator('[data-testid=outing-back]').boundingBox().catch(() => null);
      const level = !!back && !!title && title.firstMid != null && Math.abs(back.y + back.height / 2 - title.firstMid) <= 3;
      check(!!title && title.text === NAME && !title.cut && title.inBox && title.right <= title.vw && !!back && title.left >= back.x + back.width - 0.5 && level,
        `tend outing audit 1: at ${width} px while a walk records, the opened journey's title reads "${NAME}" whole, nothing cut, beside Back and level with its first line (${JSON.stringify({ title, back: back && { x: Math.round(back.x), r: Math.round(back.x + back.width), mid: Math.round(back.y + back.height / 2) } })})`);
      console.log(`tend outing audit 1: at ${width} px while recording, the card's name takes ${card?.lines} line(s), the title ${title?.lines}`);
      await shot(pg, `tend-outing-audit-1-recording-title-${width}`);
      await backToChips();
    }
    await pg.setViewportSize(vp);
  }
  await c.close();
  await ownPosition(h);
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

/**
 * fix outing-current-position (decision 0273; OJ10, QC30): the page reads one fresh fix of its own as it opens, never Explore's
 * launch fix. Launched at Curio Row, the phone moves 4 km: the page is where the phone is now. With no fresh fix in time (the
 * browser's watch made to hang) the launch fix stands in while under thirty minutes old, said in a line, and never past that.
 * Refused after a reload: the page says it needs your location, that location is off, and draws no dot.
 */
async function ownPosition(h) {
  const { exploreUrl, at, check, freshPage, shot } = h;
  const { c, pg } = await freshPage('outing-position');
  // A clock that can be moved on, and a watch that can be made never to answer, for the fallback's two sides.
  await c.addInitScript(() => {
    window.__clockShift = 0;
    window.__geoHang = false;
    const now = Date.now;
    Date.now = () => now() + window.__clockShift;
    const g = navigator.geolocation;
    const watch = g.watchPosition.bind(g);
    let hung = 1e6;
    g.watchPosition = (ok, err, o) => (window.__geoHang ? ++hung : watch(ok, err, o));
  });
  const curio = at(-248, 0);
  const moved = at(-208, 0);
  const near = (s, p) => !!s && s.split(',').map(Number).every((v, i) => Math.abs(v - p[i]) < 1e-5);
  const walker = () => pg.evaluate(() => document.querySelector('[data-testid=outing] [data-walker]')?.getAttribute('data-walker') ?? null);
  const line = async () => ((await pg.locator('[data-testid=outing-position]').innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
  const sheet = async () => ((await pg.locator('[data-testid=outing-sheet]').innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
  const open = async () => {
    await pg.locator('[data-testid=outing-entry]').waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
    await pg.click('[data-testid=outing-entry]').catch(() => {});
    await pg.waitForSelector('[data-testid=outing]', { timeout: 15000 }).catch(() => {});
  };
  const close = async () => {
    await pg.click('[data-testid=outing-close]').catch(() => {});
    await pg.waitForSelector('[data-testid=outing]', { state: 'detached', timeout: 10000 }).catch(() => {});
  };
  const until = async (ok, ms) => {
    for (const end = Date.now() + ms; Date.now() < end; await pg.waitForTimeout(250)) if (await ok()) return true;
    return false;
  };
  const shots = async (name) => {
    const vp = pg.viewportSize();
    await shot(pg, `${name}-390`);
    await pg.setViewportSize({ width: 320, height: vp.height });
    await pg.waitForTimeout(900);
    await shot(pg, `${name}-320`);
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(400);
  };
  await c.setGeolocation({ longitude: curio[0], latitude: curio[1], accuracy: 6 });
  await pg.goto(exploreUrl);
  await pg.waitForSelector('[data-testid=atlas-tile][data-name="Curio Row"]', { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  // 1. Moved 4 km since Explore's launch fix.
  await c.setGeolocation({ longitude: moved[0], latitude: moved[1], accuracy: 6 });
  await open();
  await until(async () => near(await walker(), moved), 15000);
  const w1 = await walker();
  check(near(w1, moved) && !near(w1, curio), `fix outing-current-position: OJ10, QC30: moved 4 km since Explore's launch fix, the page is where the phone is now, not where Explore read it (${w1}; ${await sheet()})`);
  await pg.waitForTimeout(2500);
  await shots('fix-outing-current-position-moved');
  await close();
  // 2. No fresh fix within the wait, the launch fix twenty minutes old: it stands in, and is said.
  await pg.evaluate(() => { window.__geoHang = true; window.__clockShift = 20 * 60_000; });
  await open();
  await until(async () => /^From where you were/.test(await line()), 25000);
  await pg.waitForSelector('[data-testid=outing-journey-0]', { timeout: 60000 }).catch(() => {});
  const l2 = await line();
  const w2 = await walker();
  check(l2 === 'From where you were twenty minutes ago.' && near(w2, curio) && (await pg.locator('[data-testid=outing-journey-0]').count()) === 1,
    `fix outing-current-position: with no fresh fix in time, a fix twenty minutes old is used and said ("${l2}", ${w2})`);
  await pg.waitForTimeout(1500);
  await shots('fix-outing-current-position-earlier');
  await close();
  // 3. The same, the launch fix over thirty minutes old: no position, nothing proposed.
  await pg.evaluate(() => { window.__clockShift = 31 * 60_000; });
  await open();
  await until(async () => (await pg.locator('[data-testid=outing-reason-noPosition]').count()) === 1 && !/^Finding/.test(await line()), 25000);
  await pg.waitForTimeout(1500);
  const w3 = await walker();
  check((await pg.locator('[data-testid=outing-reason-noPosition]').count()) === 1 && (await pg.locator('[data-testid=outing-journey-0]').count()) === 0 && !w3 && !/From where you were/.test(await sheet()),
    `fix outing-current-position: OJ10: a fix over thirty minutes old is never used: the page needs your location and proposes nothing (${w3}; ${await sheet()})`);
  await close();
  // 4. Refused, after a reload (no fix in memory; Explore falls back to the area it last listed).
  await c.clearPermissions();
  await pg.reload();
  await pg.waitForSelector('[data-testid=atlas-tile]', { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  await open();
  await until(async () => (await pg.locator('[data-testid=outing-reason-noPosition]').count()) === 1 && /Location is off/.test(await line()), 20000);
  await pg.waitForTimeout(1500);
  const w4 = await walker();
  const l4 = await line();
  check((await pg.locator('[data-testid=outing-reason-noPosition]').count()) === 1 && /^Location is off for this site\./.test(l4) && (await pg.locator('[data-testid=outing-journey-0]').count()) === 0 && !w4,
    `fix outing-current-position: OJ10, QC30: location refused, the page says it needs your location and that location is off, proposes nothing and draws no dot ("${l4}", ${w4}; ${await sheet()})`);
  await shots('fix-outing-current-position-refused');
  await c.close();
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
