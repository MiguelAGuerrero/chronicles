// Hide a kind of place from its card (specs/poi-hide-from-card HK1-HK10, decision 0254): the places archive brings a
// plaque with a long name and a war memorial beside it, a mill 80 m off (a "?"), and a clock tower beside a water tower.
// On the walk at 390 x 844 with Places on, a plaque's card has More; its sheet, "Show on the map", turns Plaques off (the
// war memorial stays) and the kind off and back; Done, the dimmed map and Escape close it; closed with Plaques off, the card
// goes; What I'm into opens from it at Monuments and memorials, Back reading "Walk", and brings the plaques back; a clock
// tower's sheet turns clock towers off and leaves the water tower; a "?" card's sheet names its kind, never the place.
// Pictures at 390 and 320 for the review. E2E_ONLY=hidekind runs it alone.

const PLAQUE = 'The Reverend Ebenezer Worthington-Smythe Memorial Plaque';
const MEMORIAL = 'Battle Green War Memorial';
const MILL = 'Old Grist Mill';
const CLOCK = 'Town Hall Clock Tower';
const WATER = 'Hilltop Water Tower';
/** The subtypes off by default, and the towers' rows: known, so the plaques start on (parseHidden, SP7). */
/** What I'm into's sentence for a failed read (`INTO_UNREAD`), which the sheet says too (poi-hide-from-card audit 7). */
const UNREAD = 'Your choices couldn’t be read just now. Go back and open this page again.';
const KNOWN = ['fountains', 'plaques', 'small_memorials', 'old_stones', 'wayside_shrines', 'old_trees', 'ghost_towns', 'survey_marks', 'clock_towers', 'water_towers'];

async function run(h) {
  const { navUrl, BASE, at, check, freshPage, places, shot, switchLayer, closeInto, intoSettled } = h;
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');
  const plaqueAt = at(0.1, -0.49);
  const memorialAt = at(0.13, -0.51);
  const millAt = at(0.1, 0.3);
  const clockAt = at(0.55, -0.49);
  const waterAt = at(0.58, -0.51);
  const z = 12;
  const tileOf = ([lon, lat]) => {
    const r = (lat * Math.PI) / 180;
    return [Math.floor(((lon + 180) / 360) * 2 ** z), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)];
  };
  const [x, y] = tileOf(plaqueAt);
  const feat = (p, name, cls, id) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { name, class: cls, src: 'osm', id } });
  const archive = encodeArchive([{ z, x, y, data: encodeTile([
    feat(plaqueAt, PLAQUE, 'plaque', 'p_0000000000c00001'),
    feat(memorialAt, MEMORIAL, 'war_memorial', 'p_0000000000c00002'),
    feat(millAt, MILL, 'mill', 'p_0000000000c00003'),
    feat(clockAt, CLOCK, 'clock_tower', 'p_0000000000c00004'),
    feat(waterAt, WATER, 'water_tower', 'p_0000000000c00005'),
  ], z, x, y, () => ['places']) }], [-125, 24, -66.9, 49.4]);
  const file = 'places-us-20261125.pmtiles';
  places.files[file] = archive;
  places.manifest = JSON.stringify({
    schema: 1,
    regions: [{ id: 'us', current: { file, version: '20261125', bytes: archive.length, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] } }],
  });

  const { c, pg } = await freshPage('hidekind');
  // poi-hide-from-card audit 7: the reader's choices refused on cue (`window.__failKinds`), nothing else of IndexedDB.
  await c.addInitScript(() => {
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === 'meta' && key === 'explore_hidden' && window.__failKinds) throw new DOMException('refused', 'UnknownError');
      return get.call(this, key);
    };
  });
  const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key, value });
      tx.oncomplete = () => resolve(true);
    };
  }), [k, v]);
  const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const shown = async (name) => (await marksNow()).some((l) => String(l).includes(name));
  const standAt = async (p) => {
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  };
  const walkTo = async (fromX, toX) => {
    for (let k = 0; fromX + k * 0.05 <= toX + 1e-9; k++) await standAt(at(fromX + k * 0.05, -0.5));
  };
  const openCard = async (label) => {
    // Pins near one another are spread and overlap: the pin is pressed itself, as a screen reader's activation would.
    await pg.locator(`.maplibregl-map [data-testid=mark-pin][aria-label^="${label}"]`).first().evaluate((e) => e.click()).catch(() => {});
    return pg.waitForSelector('[data-testid=mark-card]', { timeout: 5000 }).then(() => true, () => false);
  };
  const openSheet = async () => {
    await pg.click('[data-testid=mark-more]', { timeout: 5000 }).catch(() => {});
    const up = await pg.waitForSelector('[data-testid=kinds-sheet]', { timeout: 5000 }).then(() => true, () => false);
    await pg.waitForSelector('[data-testid^=kind-sheet-]', { timeout: 5000 }).catch(() => {});
    await pg.waitForTimeout(800);
    return up;
  };
  const sheetGone = () => pg.waitForSelector('[data-testid=kinds-sheet]', { state: 'detached', timeout: 5000 }).then(() => true, () => false);
  const rowOf = async (id) => pg.locator(`[data-testid=kind-sheet-${id}]`).evaluate((e) => ({
    on: e.getAttribute('aria-checked'), disabled: e.getAttribute('aria-disabled'), label: e.getAttribute('aria-label'), left: e.getBoundingClientRect().left,
  })).catch(() => null);
  /** The kind line as drawn, line by line (each character's top), and its words with no-break spaces as spaces. */
  const kindLines = () => pg.evaluate(() => {
    const el = document.querySelector('[data-testid=mark-kinds]');
    const text = el?.firstChild?.nodeType === 3 ? el.firstChild : [...(el?.childNodes ?? [])].find((n) => n.nodeType === 3) ?? null;
    if (!text) return null;
    const lines = [];
    let top = null;
    for (let i = 0; i < text.textContent.length; i++) {
      const r = document.createRange();
      r.setStart(text, i);
      r.setEnd(text, i + 1);
      const t = Math.round(r.getClientRects()[0]?.top ?? -1);
      if (top === null || Math.abs(t - top) > 3) {
        lines.push('');
        top = t;
      }
      lines[lines.length - 1] += text.textContent[i];
    }
    return lines.map((l) => l.replace(/\u00a0/g, ' ').trim());
  });
  /** poi-hide-from-card audit 12: a line ends only after a dot, or inside a name longer than KIND_NAME_KEEP (20). */
  const breaksOk = (lines) => !!lines && lines.slice(0, -1).every((l, i) => {
    if (l.endsWith('·')) return true;
    const names = lines.join(' ').split(' · ');
    const end = lines.slice(0, i + 1).join(' ').length;
    let at = 0;
    for (const n of names) {
      if (end > at && end < at + n.length) return n.length > 20;
      at += n.length + 3;
    }
    return false;
  });
  const at320 = async (name) => {
    const was = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(800);
    await shot(pg, name);
    const cut = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=mark-card] div[dir=auto], [data-testid=kinds-sheet] div[dir=auto]')]
      .filter((e) => e.childElementCount === 0 && e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
    if (was) await pg.setViewportSize(was);
    await pg.waitForTimeout(800);
    return cut;
  };

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await setMeta('explore_hidden', '[]');
  await setMeta('explore_kinds_known', JSON.stringify(KNOWN));
  await pg.reload();
  await pg.waitForSelector('[data-testid=start]');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await switchLayer(pg, 'places');
  await walkTo(-0.3, 0.1);
  await pg.waitForTimeout(1500);

  // HK4: the mill, 80 m off, is a "?": its card's head reads "A place to find" alone; its sheet names its kind, never it.
  const qOpen = await openCard('A place to find. Open');
  const qHead = await pg.locator('[data-testid=mark-card]').innerText().catch(() => '');
  const qAlign = await pg.evaluate(() => {
    const t = document.querySelector('[data-testid=mark-card] [role=heading]')?.getBoundingClientRect();
    const m = document.querySelector('[data-testid=mark-more]')?.getBoundingClientRect();
    return t && m ? { title: Math.round(t.top + t.height / 2), more: Math.round(m.top + m.height / 2) } : null;
  });
  check.todo(!!qAlign && Math.abs(qAlign.title - qAlign.more) <= 2, `poi-hide-from-card audit 15: a ? card's one-line head is centred against More (${JSON.stringify(qAlign)})`);
  check(qOpen && /^A place to find/.test(qHead) && !(await pg.locator('[data-testid=mark-kinds]').count()) && (await pg.locator('[data-testid=mark-more]').count()) === 1,
    `poi-hide-from-card audit 1: a ? card's head reads A place to find alone, with More (${JSON.stringify(qHead.slice(0, 80))})`);
  await openSheet();
  const qSaid = await pg.locator('[data-testid=kinds-sheet]').innerText().catch(() => '');
  await shot(pg, 'hidekind-unnamed-sheet');
  const qCut = await at320('hidekind-unnamed-sheet-320');
  check(/Buildings and structures/.test(qSaid) && /Mills/.test(qSaid) && !qSaid.includes(MILL) && !qSaid.includes('Grist') && qCut.length === 0,
    `HK4: a ? card's sheet names its kind and subtype, never the place (${JSON.stringify({ qSaid, qCut })})`);
  await pg.click('[data-testid=kinds-sheet-done]').catch(() => {});
  await sheetGone();
  await pg.click('[data-testid=mark-close]').catch(() => {});

  // HK1: the plaque's card: More at its top right, 44 pt, in ink, spoken More; the kind line under the name.
  const pOpen = await openCard(PLAQUE);
  await pg.waitForTimeout(800);
  const head = await pg.evaluate(() => {
    const card = document.querySelector('[data-testid=mark-card]')?.getBoundingClientRect();
    const more = document.querySelector('[data-testid=mark-more]');
    const b = more?.getBoundingClientRect();
    const glyph = more ? [...more.querySelectorAll('*')].find((e) => e.childElementCount === 0) : null;
    return {
      card: card && { top: card.top, right: card.right }, more: b && { w: b.width, h: b.height, top: b.top, right: b.right },
      label: more?.getAttribute('aria-label'), ink: glyph ? getComputedStyle(glyph).color : null,
      kinds: document.querySelector('[data-testid=mark-kinds]')?.textContent?.replace(/\u00a0/g, ' ') ?? null,
      kindsColor: document.querySelector('[data-testid=mark-kinds]') ? getComputedStyle(document.querySelector('[data-testid=mark-kinds]')).color : null,
    };
  });
  await shot(pg, 'hidekind-card');
  check(pOpen && !!head.more && head.more.w >= 44 && head.more.h >= 44 && head.label === 'More' && head.ink === 'rgb(29, 36, 48)'
    && head.more.right >= head.card.right - 24 && head.more.top <= head.card.top + 24 && head.kinds === 'Monuments and memorials · Plaques',
    `HK1: a plaque's card has More at its top right, 44 pt, in ink, spoken More, the kind line under the name (${JSON.stringify(head)})`);
  const lines390 = await kindLines();
  const cardCut = await at320('hidekind-card-320');
  check.todo(head.more?.w >= 48 && head.more?.h >= 48, `poi-hide-from-card audit 16: More is 48 (the owner, "48 everywhere") (${JSON.stringify(head.more)})`);
  check(cardCut.length === 0, `HK1: the card's words whole at 320 px, the long name wrapping, never cut (${JSON.stringify(cardCut)})`);
  {
    const was = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(600);
    const lines320 = await kindLines();
    if (was) await pg.setViewportSize(was);
    await pg.waitForTimeout(600);
    check.todo(breaksOk(lines390) && breaksOk(lines320),
      `poi-hide-from-card audit 12: the plaque's kind line breaks at its dot, never inside a name that fits alone, at 390 and 320 (${JSON.stringify({ lines390, lines320 })})`);
  }
  // HK10, poi-hide-from-card audit 7: the reader's choices refused, the sheet says What I'm into's sentence, no switch.
  await pg.evaluate(() => {
    window.__failKinds = true;
  });
  await openSheet();
  const unread = { line: await pg.locator('[data-testid=kinds-sheet-unread]').innerText().catch(() => null), rows: await pg.locator('[data-testid^=kind-sheet-]').count() };
  await pg.evaluate(() => {
    window.__failKinds = false;
  });
  await pg.click('[data-testid=kinds-sheet-done]').catch(() => {});
  await sheetGone();
  check(unread.line === UNREAD && unread.rows === 0, `HK10, poi-hide-from-card audit 7: a failed read says What I’m into’s sentence in the sheet and draws no switch (${JSON.stringify(unread)})`);

  // HK2: More opens Show on the map with Done, the kind, its subtype indented, then What I'm into.
  const up = await openSheet();
  const sheet = await pg.evaluate(() => {
    const s = document.querySelector('[data-testid=kinds-sheet]');
    return { text: s?.innerText ?? '', rows: [...(s?.querySelectorAll('[data-testid^=kind-sheet-]') ?? [])].map((e) => e.getAttribute('data-testid')) };
  });
  const mon = await rowOf('monuments');
  const plq = await rowOf('plaques');
  await shot(pg, 'hidekind-sheet');
  check(up && /^Show on the map/.test(sheet.text) && /Done/.test(sheet.text) && JSON.stringify(sheet.rows) === '["kind-sheet-monuments","kind-sheet-plaques"]'
    && mon?.on === 'true' && plq?.on === 'true' && plq.left > mon.left && /What I’m into/.test(sheet.text) && sheet.text.indexOf('What I’m into') > sheet.text.indexOf('Plaques'),
    `HK2: More opens Show on the map with Done, Monuments and memorials, Plaques indented, then What I’m into (${JSON.stringify({ sheet, mon, plq })})`);
  // HK8: no digit in the sheet, no icon in its rows; the capture row first and unchanged under it.
  // poi-hide-from-card audit 5: an icon on the web is an Ionicons glyph, a text in its own font: none in the rows.
  const icons = await pg.evaluate(() => [...document.querySelectorAll('[data-testid^=kind-sheet-] *')].filter((e) => /ionicons/i.test(getComputedStyle(e).fontFamily)).length);
  const sizes = await pg.evaluate(() => {
    const box = (sel) => document.querySelector(sel)?.getBoundingClientRect();
    const font = (sel) => {
      const e = [...(document.querySelector(sel)?.querySelectorAll('*') ?? [])].find((x) => x.childElementCount === 0 && x.textContent.trim());
      return e ? getComputedStyle(e).fontSize : null;
    };
    const done = box('[data-testid=kinds-sheet-done]');
    return {
      done: done && { w: Math.round(done.width), h: Math.round(done.height) },
      rows: ['[data-testid=kind-sheet-monuments]', '[data-testid=kind-sheet-plaques]', '[data-testid=kinds-sheet-into]'].map((s) => ({ h: Math.round(box(s)?.height ?? 0), font: font(s) })),
    };
  });
  check.todo(sizes.done?.w >= 48 && sizes.done?.h >= 48, `poi-hide-from-card audit 16: Done is 48 (${JSON.stringify(sizes.done)})`);
  // The owner, Nov 25, "Shared rows' sizes": SwitchRow's and PageRow's own (15 px, 48 tall), not the drawing's 16 and 52.
  check(sizes.rows.every((r) => r.h >= 48 && r.font === '15px'),
    `poi-hide-from-card audit 17: the sheet's rows are the house rows' sizes, SwitchRow's and PageRow's 15 px, each 48 or taller (${JSON.stringify(sizes.rows)})`);
  const capture = await pg.evaluate(() => {
    const b = (id) => document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect();
    const cam = b('mark-camera'), go = b('mark-go');
    return { cam: !!cam, first: !!cam && !!go && cam.bottom <= go.top + 1 };
  });
  check(!/\d/.test(sheet.text) && icons === 0 && capture.cam && capture.first,
    `HK8, poi-hide-from-card audit 4, 5: no digit and no icon in the sheet; the capture row first (${JSON.stringify({ icons, capture })})`);
  const sheetCut = await at320('hidekind-sheet-320');
  check(sheetCut.length === 0, `HK2: the sheet's words whole at 320 px (${JSON.stringify(sheetCut)})`);

  // HK3: Plaques off takes the plaque off the map at once, the memorial stays, the sheet up; on brings it back.
  await pg.click('[data-testid=kind-sheet-plaques]');
  await pg.waitForTimeout(1200);
  const offP = { plaque: await shown(PLAQUE), memorial: await shown(MEMORIAL), up: (await pg.locator('[data-testid=kinds-sheet]').count()) === 1, on: (await rowOf('plaques'))?.on };
  await shot(pg, 'hidekind-plaques-off');
  await at320('hidekind-plaques-off-320');
  await pg.click('[data-testid=kind-sheet-plaques]');
  await pg.waitForTimeout(1200);
  const backP = await shown(PLAQUE);
  check(!offP.plaque && offP.memorial && offP.up && offP.on === 'false' && backP,
    `HK3: Plaques off takes the plaque off the map at once, the war memorial stays, the sheet up; on brings it back (${JSON.stringify({ offP, backP })})`);
  // HK3, audit 6: the kind off takes the memorial too; its subtype's row stays, off and dimmed, and a tap does nothing.
  await pg.click('[data-testid=kind-sheet-monuments]');
  await pg.waitForTimeout(1200);
  const offK = { plaque: await shown(PLAQUE), memorial: await shown(MEMORIAL), row: await rowOf('plaques') };
  await shot(pg, 'hidekind-kind-off');
  await pg.click('[data-testid=kind-sheet-plaques]', { force: true }).catch(() => {});
  await pg.waitForTimeout(600);
  const tapped = await rowOf('plaques');
  check(!offK.plaque && !offK.memorial, `HK3: the kind off takes the war memorial too (${JSON.stringify(offK)})`);
  check(!!offK.row && offK.row.on === 'false' && offK.row.disabled === 'true' && tapped?.on === 'false',
    `poi-hide-from-card audit 6: with the kind off, Plaques stays in place, off and dimmed, and a tap does nothing (${JSON.stringify({ offK, tapped })})`);
  await pg.click('[data-testid=kind-sheet-monuments]');
  await pg.waitForTimeout(1200);

  // poi-hide-from-card audit 14: at 320, What I'm into from the plaque's sheet opens at History's top: its heading, its
  // muted line whole, then Monuments and memorials; never a fragment of the line under the pinned heading.
  {
    const was = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(600);
    await pg.click('[data-testid=kinds-sheet-into]').catch(() => {});
    await pg.waitForSelector('[data-testid=into-page]', { timeout: 8000 }).catch(() => {});
    await intoSettled(pg);
    const top = await pg.evaluate(() => {
      const b = (sel) => document.querySelector(sel)?.getBoundingClientRect();
      const head = b('[data-testid=kind-heading-history]'), line = b('[data-testid=into-line-history]'), row = b('[data-testid=kind-monuments]');
      return head && line && row ? { head: Math.round(head.bottom), line: [Math.round(line.top), Math.round(line.bottom)], row: Math.round(row.top) } : null;
    });
    await shot(pg, 'hidekind-into-first-row-320');
    await closeInto(pg);
    if (was) await pg.setViewportSize(was);
    await pg.waitForTimeout(600);
    check.todo(!!top && top.line[0] >= top.head - 1 && top.row >= top.line[1] - 1 && top.row - top.line[1] <= 16,
      `poi-hide-from-card audit 14: at 320 the first row of its section opens under its heading and muted line, whole (${JSON.stringify(top)})`);
  }

  // HK7: Done, the dimmed map and Escape each close the sheet, the card staying.
  await openCard(PLAQUE);
  await openSheet();
  await pg.click('[data-testid=kinds-sheet-done]').catch(() => {});
  const byDone = (await sheetGone()) && (await pg.locator('[data-testid=mark-card]').count()) === 1;
  await openSheet();
  await pg.mouse.click(195, 60);
  const byMap = (await sheetGone()) && (await pg.locator('[data-testid=mark-card]').count()) === 1;
  await openSheet();
  await pg.keyboard.press('Escape');
  const byEscape = (await sheetGone()) && (await pg.locator('[data-testid=mark-card]').count()) === 1;
  check(byDone && byMap && byEscape, `HK7: Done, the dimmed map and Escape each close the sheet, the card staying (${JSON.stringify({ byDone, byMap, byEscape })})`);

  // HK10: closed with Plaques off, the sheet leaves no card (its place is off the map).
  await openSheet();
  await pg.click('[data-testid=kind-sheet-plaques]');
  await pg.waitForTimeout(600);
  await pg.click('[data-testid=kinds-sheet-done]').catch(() => {});
  await sheetGone();
  await pg.waitForTimeout(600);
  check((await pg.locator('[data-testid=mark-card]').count()) === 0 && !(await shown(PLAQUE)),
    'HK10: closed with the plaque\'s kind off, the sheet leaves no card');

  // HK6: What I'm into from the memorial's sheet opens the page at Monuments and memorials, Back reading "Walk"; Plaques
  // turned on there brings the plaque back (audit 3).
  await openCard(MEMORIAL);
  await openSheet();
  await pg.click('[data-testid=kinds-sheet-into]').catch(() => {});
  const page = await pg.waitForSelector('[data-testid=into-page]', { timeout: 8000 }).then(() => true, () => false);
  await intoSettled(pg);
  const where = await pg.evaluate(() => {
    const row = document.querySelector('[data-testid=kind-monuments]')?.getBoundingClientRect();
    const head = document.querySelector('[data-testid=kind-heading-history]')?.getBoundingClientRect();
    // Since audit 14 the section's first row stands under its heading's muted line.
    const line = document.querySelector('[data-testid=into-line-history]')?.getBoundingClientRect();
    return { row: row && Math.round(row.top), head: head && Math.round(Math.max(head.bottom, line?.bottom ?? 0)), url: location.search, sheet: !!document.querySelector('[data-testid=kinds-sheet]') };
  });
  const back = await pg.locator('[aria-label="Walk, back"]:visible').count();
  await shot(pg, 'hidekind-into');
  {
    const was = pg.viewportSize();
    await pg.setViewportSize({ width: 320, height: 700 });
    await intoSettled(pg);
    await shot(pg, 'hidekind-into-320');
    if (was) await pg.setViewportSize(was);
    await pg.waitForTimeout(500);
  }
  check(page && !where.sheet && back === 1 && where.row != null && where.head != null && Math.abs(where.row - where.head) <= 16 && /at=monuments/.test(where.url),
    `HK6: What I’m into from the sheet opens the page at Monuments and memorials, Back reads Walk (${JSON.stringify({ where, back })})`);
  await pg.locator('[data-testid=kind-plaques]').click().catch(() => {});
  await pg.locator('[data-testid=kind-war_memorials]').click().catch(() => {});
  await closeInto(pg);
  await pg.waitForTimeout(1500);
  check(await shown(PLAQUE), 'poi-hide-from-card audit 3: Plaques turned back on in What I’m into brings the plaque back on the map');
  const afterPage = { card: await pg.locator('[data-testid=mark-card]').count(), memorial: await shown(MEMORIAL) };
  check.todo(afterPage.card === 0 && !afterPage.memorial,
    `poi-hide-from-card audit 8: War memorials turned off on What I’m into opened from the memorial's sheet leaves no card on return (${JSON.stringify(afterPage)})`);

  // HK9: a clock tower's sheet turns clock towers off; the water tower's pin stays.
  await walkTo(0.15, 0.55);
  await pg.waitForTimeout(1500);
  await openCard(CLOCK);
  const towerKinds = (await pg.locator('[data-testid=mark-kinds]').innerText().catch(() => '')).replace(/\u00a0/g, ' ').replace(/\s*\n\s*/g, ' ');
  const towerLines = await kindLines();
  check.todo(breaksOk(towerLines) && !towerLines.some((l) => /^towers$|Clock$/.test(l)), `poi-hide-from-card audit 12: "Clock towers" is never split (${JSON.stringify(towerLines)})`);
  await openSheet();
  const towerRows = await pg.evaluate(() => [...document.querySelectorAll('[data-testid^=kind-sheet-]')].map((e) => e.getAttribute('aria-label')));
  await shot(pg, 'hidekind-clock-sheet');
  await at320('hidekind-clock-sheet-320');
  await pg.click('[data-testid=kind-sheet-clock_towers]').catch(() => {});
  await pg.waitForTimeout(1200);
  const towers = { clock: await shown(CLOCK), water: await shown(WATER) };
  await shot(pg, 'hidekind-clock-off');
  await at320('hidekind-clock-off-320');
  check(towerKinds === 'Buildings and structures · Clock towers' && JSON.stringify(towerRows) === '["Buildings and structures","Clock towers"]' && !towers.clock && towers.water,
    `HK9: a clock tower's sheet turns clock towers off; the water tower's pin stays (${JSON.stringify({ towerKinds, towerRows, towers })})`);
  await pg.click('[data-testid=kinds-sheet-done]').catch(() => {});
  await sheetGone();
  await c.close();
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

module.exports = {
  name: 'hidekind',
  covers: [
    'src/app/walk.tsx',
    'src/components/walk/PlaceKinds.tsx',
    'src/lib/explore/placeCard.ts',
    'src/components/IntoPage.tsx',
    'src/app/into.tsx',
    'src/lib/intoNav.ts',
    'src/lib/intoGate.ts',
    'src/lib/discovery/subtypes.ts',
  ],
  run,
};
