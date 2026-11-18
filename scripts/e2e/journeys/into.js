// What I'm into, its own page (specs/what-im-into-page WI1-WI16; decision 0192): the ready bar's settings and the walk's
// drawer each hold one row, "What I’m into" and a chevron, where the list was; it pushes a page of its own, the same from
// both, with each section's heading pinned while its rows scroll, and Back returns to the drawer it came from. The places
// archive brings a waterfall beside the walk, so a kind switched off on the page is gone from the walk's map (WI8).
// E2E_ONLY=into runs it alone.

const INTO = 'What I’m into';

async function run(h) {
  const { url, navUrl, BASE, at, check, drawerTo, openInto, closeInto, freshPage, places, shot, tabBarShown } = h;
  const { encodeTile } = await import('../../mvt-encode.mjs');
  const { encodeArchive } = await import('../../pmtiles-encode.mjs');
  const fallsAt = at(0.1, -0.48);
  const z = 12;
  const tileOf = ([lon, lat]) => {
    const r = (lat * Math.PI) / 180;
    return [Math.floor(((lon + 180) / 360) * 2 ** z), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z)];
  };
  const [x, y] = tileOf(fallsAt);
  const feat = (p, name, cls, id) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { name, class: cls, src: 'wd', id } });
  const archive = encodeArchive([{ z, x, y, data: encodeTile([feat(fallsAt, 'Bushkill Falls', 'waterfall', 'p_0000000000c00001')], z, x, y, () => ['places']) }], [-125, 24, -66.9, 49.4]);
  const file = 'places-us-20261118.pmtiles';
  places.files[file] = archive;
  places.manifest = JSON.stringify({
    schema: 1,
    regions: [{ id: 'us', current: { file, version: '20261118', bytes: archive.length, sha256: 'e2e', minzoom: 12, maxzoom: 12, bounds: [-125, 24, -66.9, 49.4] } }],
  });

  const { c, pg } = await freshPage('into');
  const setMeta = (k, v) => pg.evaluate(([key, value]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key, value });
      tx.oncomplete = () => resolve(true);
    };
  }), [k, v]);
  const metaOf = (k) => pg.evaluate((key) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('meta', 'readonly').objectStore('meta').get(key);
      g.onsuccess = () => resolve(g.result?.value ?? null);
    };
  }), k);
  const tracePoints = () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('trace_point', 'readonly').objectStore('trace_point').count();
      g.onsuccess = () => resolve(g.result);
    };
  }));
  const marksNow = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const pageShown = async () => (await pg.locator('[data-testid=into-page]:visible').count()) === 1;
  /** The page's headings and rows, top to bottom, as drawn. */
  const pageOrder = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=into-page] [data-testid^=kind-heading-], [data-testid=into-page] [data-testid^=kind-], [data-testid=into-page] [data-testid^=complex-kind-]')]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .map((e) => ({ id: e.getAttribute('data-testid'), text: e.innerText.trim(), role: e.getAttribute('role') })));
  /** A switch row's label: its text leaf. */
  const labelOf = (id) => pg.evaluate((tid) => {
    const row = document.querySelector(`[data-testid=into-page] [data-testid=${tid}]`);
    const leaf = row && [...row.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || ''));
    if (!leaf) return null;
    const cs = getComputedStyle(leaf);
    return { weight: Number(cs.fontWeight), size: parseFloat(cs.fontSize), text: leaf.textContent };
  }, id);
  /** The labels that wrap to a second line, among `sel`'s text leaves (one line each at 320 px, WI13). */
  const wrappedIn = (sel) => pg.evaluate((s) => [...document.querySelectorAll(s)]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .map((e) => {
      const leaf = [...e.querySelectorAll('*'), e].find((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || ''));
      if (!leaf || !leaf.firstChild) return null;
      const range = document.createRange();
      range.selectNodeContents(leaf);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      return tops.size > 1 ? `${e.getAttribute('data-testid')} (${leaf.textContent})` : null;
    })
    .filter(Boolean), sel);

  // WI16: a link straight to the page, with no walk open: the page, with Back to the screen beneath it.
  await pg.goto(`${url}into`);
  const linked = await pg.waitForSelector('[data-testid=into-page]', { state: 'visible', timeout: 15000 }).then(() => true, () => false);
  await pg.waitForTimeout(800);
  const linkedBack = await closeInto(pg);
  check.todo(linked && linkedBack && new URL(pg.url()).pathname !== `${BASE}/into`, `WI16: a link straight to the page shows it, and Back leads to the screen beneath (${pg.url()})`);

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await setMeta('start_mode', 'explore');
  await setMeta('explore_range', '140');
  await pg.reload();
  await pg.waitForSelector('[data-testid=start]');

  // WI1, WI2, WI11, WI12: the ready bar's settings with Explore chosen: one row, in ink, its words and a chevron, a full
  // target; the range and the pocket alert stay; no kind's switch.
  await drawerTo(pg, 'half');
  await pg.waitForTimeout(600);
  const readyRow = pg.locator('[data-testid=start-settings] [data-testid=into-row]');
  await readyRow.scrollIntoViewIfNeeded().catch(() => {});
  const rowLook = await pg.evaluate(() => {
    const r = document.querySelector('[data-testid=start-settings] [data-testid=into-row]');
    if (!r) return null;
    const b = r.getBoundingClientRect();
    const leaf = [...r.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /What/.test(x.textContent || ''));
    return { h: b.height, text: r.innerText.trim(), role: r.getAttribute('role'), label: r.getAttribute('aria-label'), color: leaf ? getComputedStyle(leaf).color : '', glyphs: r.innerText.replace(/[A-Za-z’' ]/g, '').length };
  });
  const inReady = await pg.locator('[data-testid=start-settings] [data-testid^=kind-], [data-testid=start-settings] [data-testid^=complex-kind-]').count();
  const ok1 = !!rowLook && inReady === 0 && (await pg.locator('[data-testid=start-settings] [data-testid=range-slider]').count()) === 1;
  check.todo(ok1, `WI1, WI11: the ready bar's settings hold the row and the range, and no kind's switch (${JSON.stringify({ rowLook, inReady })})`);
  const ok2 = !!rowLook && rowLook.h >= 44 && rowLook.text.startsWith(INTO) && rowLook.color === 'rgb(29, 36, 48)' && rowLook.glyphs > 0;
  check.todo(ok2, `WI2: the row is found: ink, its words, a chevron, at least 44 pt (${JSON.stringify(rowLook)})`);
  check.todo(!!rowLook && rowLook.role === 'button' && rowLook.label === INTO, `WI14: the row is a button named "${INTO}" (${JSON.stringify(rowLook)})`);
  check.todo(!!rowLook && !/\d/.test(rowLook.text), `WI12: the row says no count (${rowLook && rowLook.text})`);
  await shot(pg, 'into-ready-row');

  // WI4, WI14: the page covers the screen, its title at the top, Back at the leading edge; focus starts at the title.
  const fromReady = await openInto(pg, 'ready');
  const cover = await pg.evaluate(() => {
    const p = document.querySelector('[data-testid=into-page]');
    const b = p ? p.getBoundingClientRect() : null;
    const back = [...document.querySelectorAll('[aria-label="Go back"]')].find((e) => e.getBoundingClientRect().width > 0);
    const bb = back ? back.getBoundingClientRect() : null;
    const title = [...document.querySelectorAll('[role=heading]')].find((e) => e.getBoundingClientRect().width > 0 && e.textContent.trim() === 'What I’m into');
    const tb = title ? title.getBoundingClientRect() : null;
    return { page: b && { x: b.x, w: b.width }, back: bb && { x: bb.x, y: bb.y }, title: tb && { y: tb.y }, focus: (document.activeElement && document.activeElement.textContent || '').trim(), vw: innerWidth };
  });
  const ok3 = fromReady && !!cover.page && cover.page.x === 0 && cover.page.w === cover.vw && !!cover.title && cover.title.y < 80 && !!cover.back && cover.back.x < 40 && !(await tabBarShown(pg));
  check.todo(ok3, `WI4: the page covers the screen edge to edge, titled, with Back at its top leading edge, over the tab bar (${JSON.stringify(cover)})`);
  check.todo(cover.focus === INTO, `WI14: focus starts at the page's title (${JSON.stringify(cover.focus)})`);
  const top = await pageOrder();
  const heads = top.filter((r) => r.id.startsWith('kind-heading-'));
  const ok4 = heads.length > 5 && heads.every((r) => r.role === 'heading') && heads[heads.length - 1].text === 'Complexes';
  check.todo(ok4, `WI5, WI14: the five sections' headings and Complexes', each a header (${JSON.stringify(heads.map((r) => r.text))})`);
  const complexAt = top.findIndex((r) => r.id === 'kind-heading-complexes');
  const ok5 = complexAt > 0 && top.slice(complexAt + 1).length > 0 && top.slice(complexAt + 1).every((r) => r.id.startsWith('complex-kind-')) && top.slice(0, complexAt).every((r) => !r.id.startsWith('complex-kind-'));
  check.todo(ok5, `WI15: Complexes' switches follow the five sections, under their own heading (${complexAt})`);
  check.todo(top.every((r) => !/\d/.test(r.text)) && !/\d/.test(await pg.locator('[data-testid=into-page]').innerText().catch(() => '0')), 'WI12: no heading, row or the page carries a number');
  await shot(pg, 'into-page-top');

  // WI5: at every scroll position, the heading at the page's top is the section of the first row shown under it, on its
  // own ground, the rows passing under it.
  const pinned = await pg.evaluate(async () => {
    const page = document.querySelector('[data-testid=into-page]');
    const first = page && page.querySelector('[data-testid^=kind-]:not([data-testid^=kind-heading-])');
    let sc = first && first.parentElement;
    while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (!sc) return { bad: ['no scroller'] };
    const all = [...page.querySelectorAll('[data-testid^=kind-], [data-testid^=complex-kind-]')];
    const sectionOf = (el) => {
      let head = null;
      for (const e of all) {
        if (e === el) break;
        if (e.getAttribute('data-testid').startsWith('kind-heading-')) head = e.getAttribute('data-testid');
      }
      return head;
    };
    const bad = [];
    let checked = 0;
    const box = sc.getBoundingClientRect();
    for (let y = 0; y <= sc.scrollHeight - sc.clientHeight; y += 97) {
      sc.scrollTop = y;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const hit = document.elementFromPoint(box.x + 30, box.y + 4);
      const head = hit && hit.closest('[data-testid^=kind-heading-]');
      const hb = head && head.getBoundingClientRect();
      const under = hb && document.elementFromPoint(box.x + 30, hb.bottom + 6);
      const row = under && under.closest('[data-testid^=kind-], [data-testid^=complex-kind-]');
      const rowSection = row && (row.getAttribute('data-testid').startsWith('kind-heading-') ? row.getAttribute('data-testid') : sectionOf(row));
      // A heading arriving under the pinned one is the next section taking its place.
      const ok = !!head && (!row || rowSection === head.getAttribute('data-testid') || row.getAttribute('data-testid').startsWith('kind-heading-'));
      const ground = head ? getComputedStyle(head).backgroundColor : '';
      if (!ok || !ground || ground === 'rgba(0, 0, 0, 0)') bad.push({ y, head: head && head.getAttribute('data-testid'), row: row && row.getAttribute('data-testid'), rowSection, ground });
      checked++;
    }
    sc.scrollTop = 0;
    return { bad, checked };
  });
  check.todo(pinned.checked > 3 && pinned.bad.length === 0, `WI5: at every scroll position the pinned heading on its own ground is the section of the rows under it (${JSON.stringify(pinned)})`);
  // The middle of the page, pinned, for the cold find (WI2: "turn on waterfalls") and the UI review.
  await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(300);
  await shot(pg, 'into-page-middle');
  await pg.locator('[data-testid=into-page] [data-testid=kind-ghost_towns]').scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(300);
  await shot(pg, 'into-page-curiosities');
  await pg.locator('[data-testid=into-page] [data-testid=complex-kind-civic]').scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(300);
  await shot(pg, 'into-page-end');

  // WI7: a kind's label heavier than its subtypes', at the same size.
  const kindLabel = await labelOf('kind-nature');
  const subLabel = await labelOf('kind-waterfalls');
  const ok6 = !!kindLabel && !!subLabel && kindLabel.weight >= 600 && subLabel.weight <= 400 && kindLabel.size === subLabel.size;
  check.todo(ok6, `WI7: a kind's label is heavier than its subtype's, at the same size (${JSON.stringify({ kindLabel, subLabel })})`);

  // WI6: Nature off takes Waterfalls away at once; back on, it returns as it was.
  const fallsWas = await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').getAttribute('aria-checked').catch(() => null);
  await pg.locator('[data-testid=into-page] [data-testid=kind-nature]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const fallsGone = await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').count();
  await pg.locator('[data-testid=into-page] [data-testid=kind-nature]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const fallsBack = await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').getAttribute('aria-checked').catch(() => null);
  check.todo(fallsWas != null && fallsGone === 0 && fallsBack === fallsWas, `WI6: Nature off takes Waterfalls' row away; on, it returns as it was (${JSON.stringify({ fallsWas, fallsGone, fallsBack })})`);
  // WI9: a switch never touches the range or the pocket alert.
  const rangeWas = await metaOf('explore_range');
  const hapticWas = await metaOf('explore_haptic');
  await pg.locator('[data-testid=into-page] [data-testid=kind-churches]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const churchesOff = /churches/.test(String(await metaOf('explore_hidden')));
  await pg.locator('[data-testid=into-page] [data-testid=kind-churches]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const ok7 = churchesOff && rangeWas === '140' && (await metaOf('explore_range')) === '140' && (await metaOf('explore_haptic')) === hapticWas;
  check.todo(ok7, `WI8, WI9: a switch saves as it changes, and never changes the range or the pocket alert (${JSON.stringify({ churchesOff, rangeWas, hapticWas })})`);
  const readyOrder = (await pageOrder()).map((r) => r.id);

  // WI4, WI14: Back returns to the raised settings, the row in view, focus on it.
  const backed = await closeInto(pg, 'back');
  const after = await pg.evaluate(() => {
    const r = document.querySelector('[data-testid=start-settings] [data-testid=into-row]');
    const b = r && r.getBoundingClientRect();
    return { row: !!b && b.height > 0 && b.top >= 0 && b.bottom <= innerHeight, focus: document.activeElement === r };
  });
  const ok8 = backed && (await pg.locator('[data-testid=start-settings]:visible').count()) === 1 && after.row;
  check.todo(ok8, `WI4: Back returns to the ready bar still raised, the row in view (${JSON.stringify(after)})`);
  check.todo(after.focus, 'WI14: Back returns focus to the row');
  // Escape on the web, the same; and only the page goes, the bar stays raised.
  await openInto(pg, 'ready');
  const escaped = await closeInto(pg, 'escape');
  check.todo(escaped && (await pg.locator('[data-testid=start-settings]:visible').count()) === 1, 'WI4: Escape returns to the ready bar still raised');

  // WI9: while the settings are being read the page draws no switch, and nothing is written.
  const hiddenWas = await metaOf('explore_hidden');
  await pg.evaluate(() => {
    // A readwrite transaction on meta kept busy holds every read of it back, the app's included.
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      const until = performance.now() + 2500;
      const spin = () => {
        if (performance.now() < until) store.get('start_mode').onsuccess = spin;
      };
      spin();
    };
  });
  await pg.waitForTimeout(100);
  await pg.locator('[data-testid=start-settings] [data-testid=into-row]').click().catch(() => {});
  await pg.waitForSelector('[data-testid=into-page]', { state: 'visible', timeout: 2000 }).catch(() => {});
  const early = await pg.locator('[data-testid=into-page] [data-testid^=kind-]').count();
  await pg.waitForSelector('[data-testid=into-page] [data-testid^=kind-]', { timeout: 8000 }).catch(() => {});
  const later = await pg.locator('[data-testid=into-page] [data-testid^=kind-]').count();
  check.todo(early === 0 && later > 0 && (await metaOf('explore_hidden')) === hiddenWas, `WI9: no switch is drawn before the settings are read, and nothing is written (${early} then ${later})`);
  await closeInto(pg);

  // A walk, exploring, to the waterfall.
  await drawerTo(pg, 'peek');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  for (let k = 0; k <= 12; k++) {
    const p = at(-0.5 + k * 0.05, -0.5);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  const falls = async () => (await marksNow()).some((l) => /Bushkill Falls/.test(String(l)));
  const fallsBefore = await falls();

  // WI1, WI11: the walk's drawer with Explore on: the row, the Explore switch, the range; no kind's switch.
  await pg.click('[data-testid=walk-summary]');
  await pg.waitForSelector('[data-testid=options-card]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(700);
  const inDrawer = await pg.locator('[data-testid=options-card] [data-testid^=kind-], [data-testid=options-card] [data-testid^=complex-kind-]').count();
  const ok9 = (await pg.locator('[data-testid=options-card] [data-testid=into-row]').count()) === 1 && inDrawer === 0 && (await pg.locator('[data-testid=options-card] [data-testid=explore-walk]').count()) === 1 && (await pg.locator('[data-testid=options-card] [data-testid=range-slider]').count()) === 1;
  check.todo(ok9, `WI1, WI11: the walk's drawer holds the row, the Explore switch and the range, and no kind's switch (${inDrawer})`);
  await pg.locator('[data-testid=options-card] [data-testid=into-row]').scrollIntoViewIfNeeded().catch(() => {});
  await shot(pg, 'into-walk-row');

  // WI3: the same page from the walk's drawer, the same rows in the same order.
  const fromWalk = await openInto(pg, 'walk');
  const walkOrder = (await pageOrder()).map((r) => r.id);
  check.todo(fromWalk && readyOrder.length > 0 && JSON.stringify(walkOrder) === JSON.stringify(readyOrder), `WI3: the walk's row opens the same page, the same rows in order (${readyOrder.length} vs ${walkOrder.length})`);
  check.todo((await pg.locator('[data-testid=into-page] [data-testid=pocket-alert], [data-testid=into-page] [data-testid=range-slider]').count()) === 0, 'WI11: the range and the pocket alert are not on the page');

  // WI10: the walk goes on under the page: fixes sent while it is up are in the trace after Back, and one walk screen.
  const pointsBefore = await tracePoints();
  for (let k = 13; k <= 18; k++) {
    const p = at(-0.5 + k * 0.05, -0.5);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  // WI8: Waterfalls off on the page, saved at once, with no Save.
  await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const savedOff = /waterfalls/.test(String(await metaOf('explore_hidden')));
  await closeInto(pg);
  const pointsAfter = await tracePoints();
  const ok10 = pointsAfter >= pointsBefore + 4 && (await pg.locator('[data-testid=stop]').count()) === 1 && new URL(pg.url()).pathname === `${BASE}/walk`;
  check.todo(ok10, `WI10: the fixes that came while the page was up are in the trace, on the one walk screen (${pointsBefore} → ${pointsAfter})`);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(1500);
  const fallsOff = await falls();
  await openInto(pg, 'walk');
  await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').click().catch(() => {});
  await pg.waitForTimeout(300);
  await closeInto(pg);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(1500);
  const fallsOn = await falls();
  check.todo(fallsBefore && savedOff && !fallsOff && fallsOn, `WI8: Waterfalls off on the page takes the falls off the walk's map; on, they show (${JSON.stringify({ fallsBefore, savedOff, fallsOff, fallsOn })})`);

  // WI13: at 320 px the row is one line, words and chevron; on the page no label wraps; at 200% nothing is lost.
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.click('[data-testid=walk-summary]');
  await pg.waitForSelector('[data-testid=options-card]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(700);
  const rowNarrow = await pg.evaluate(() => {
    const r = document.querySelector('[data-testid=options-card] [data-testid=into-row]');
    if (!r) return null;
    const leaves = [...r.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && (x.textContent || '').trim());
    const tops = new Set(leaves.map((l) => {
      const b = l.getBoundingClientRect();
      return Math.round(b.top + b.height / 2);
    }));
    const word = leaves.find((l) => /What/.test(l.textContent));
    const range = document.createRange();
    if (word) range.selectNodeContents(word);
    return { lines: word ? new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size : 0, centres: [...tops], leaves: leaves.length };
  });
  const ok11 = !!rowNarrow && rowNarrow.lines === 1 && rowNarrow.leaves >= 2 && Math.max(...rowNarrow.centres) - Math.min(...rowNarrow.centres) < 12;
  check.todo(ok11, `WI13: at 320 px the row's words and chevron are on one line (${JSON.stringify(rowNarrow)})`);
  await openInto(pg, 'walk');
  const wrapped = await wrappedIn('[data-testid=into-page] [data-testid^=kind-], [data-testid=into-page] [data-testid^=complex-kind-]');
  check.todo((await pageShown()) && wrapped.length === 0, `WI13: at 320 px no heading or row's label wraps on the page (${JSON.stringify(wrapped)})`);
  await shot(pg, 'into-page-320');
  await pg.setViewportSize({ width: 390, height: 844 });
  // 200% text: every label still all there, never cut off at the edge.
  await pg.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await pg.waitForTimeout(500);
  const lost = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=into-page] [data-testid^=kind-], [data-testid=into-page] [data-testid^=complex-kind-]')]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .flatMap((e) => [...e.querySelectorAll('*'), e].filter((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || ''))
      .filter((x) => x.scrollWidth > x.clientWidth + 1 || x.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
      .map((x) => x.textContent)));
  check.todo(lost.length === 0, `WI13: at 200% every heading and label is whole (${JSON.stringify(lost)})`);
  await shot(pg, 'into-page-200');
  await pg.evaluate(() => { document.documentElement.style.zoom = ''; });
  await closeInto(pg);

  // WI16: a reload on the page with a walk open brings the walk back, as at launch (NV2).
  await openInto(pg, 'walk');
  await pg.reload();
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 }).catch(() => {});
  check.todo(new URL(pg.url()).pathname === `${BASE}/walk` && !(await pageShown()), `WI16: a reload on the page with a walk open comes back to the walk (${pg.url()})`);

  await c.close();
  places.files = {};
  places.manifest = JSON.stringify({ schema: 1, regions: [] });
}

module.exports = {
  name: 'into',
  covers: [
    'src/app/into.tsx',
    'src/components/IntoPage.tsx',
    'src/components/IntoRow.tsx',
    'src/lib/explore/{intoPage,settingsChange,useExploreSettings}.ts',
    'src/lib/intoNav.ts',
  ],
  run,
};
