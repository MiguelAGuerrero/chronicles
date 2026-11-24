// What I'm into, its own page (specs/what-im-into-page WI1-WI16; decision 0192): the ready bar's settings and the walk's
// drawer each hold one row, "What I’m into" and a chevron, where the list was; it pushes a page of its own, the same from
// both, with each section's heading pinned while its rows scroll, and Back returns to the drawer it came from. The places
// archive brings a waterfall beside the walk, so a kind switched off on the page is gone from the walk's map (WI8).
// E2E_ONLY=into runs it alone.

const INTO = 'What I’m into';

async function run(h) {
  const { url, navUrl, BASE, at, check, drawerTo, openInto, closeInto, intoScrollTo, intoSettled, freshPage, places, shot, tabBarShown, switchLayer } = h;
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
  check(linked && linkedBack && new URL(pg.url()).pathname !== `${BASE}/into`, `WI16: a link straight to the page shows it, and Back leads to the screen beneath (${pg.url()})`);

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
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
    const desc = (r.getAttribute('aria-describedby') || '').split(' ').filter(Boolean).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ');
    return { h: b.height, text: r.innerText.trim(), role: r.getAttribute('role'), label: r.getAttribute('aria-label'), desc, color: leaf ? getComputedStyle(leaf).color : '', glyphs: r.innerText.replace(/[A-Za-z’' ]/g, '').length };
  });
  const inReady = await pg.locator('[data-testid=start-settings] [data-testid^=kind-], [data-testid=start-settings] [data-testid^=complex-kind-]').count();
  const ok1 = !!rowLook && inReady === 0 && (await pg.locator('[data-testid=start-settings] [data-testid=range-slider]').count()) === 1;
  check(ok1, `WI1, WI11: the ready bar's settings hold the row and the range, and no kind's switch (${JSON.stringify({ rowLook, inReady })})`);
  const ok2 = !!rowLook && rowLook.h >= 44 && rowLook.text.startsWith(INTO) && rowLook.color === 'rgb(29, 36, 48)' && rowLook.glyphs > 0;
  check(ok2, `WI2: the row is found: ink, its words, a chevron, at least 44 pt (${JSON.stringify(rowLook)})`);
  check(!!rowLook && rowLook.role === 'button' && rowLook.label === INTO, `WI14: the row is a button named "${INTO}" (${JSON.stringify(rowLook)})`);
  check(!!rowLook && !/\d/.test(rowLook.text), `WI12: the row says no count (${rowLook && rowLook.text})`);

  // what-im-into-page audit 4: the web announces what the row does (react-native-web drops accessibilityHint).
  check(!!rowLook && rowLook.desc === 'Opens its page', `what-im-into-page audit 4: on the web the row is described "Opens its page" (${JSON.stringify(rowLook && rowLook.desc)})`);
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
  check(ok3, `WI4: the page covers the screen edge to edge, titled, with Back at its top leading edge, over the tab bar (${JSON.stringify(cover)})`);
  check(cover.focus === INTO, `WI14: focus starts at the page's title (${JSON.stringify(cover.focus)})`);
  const readyBack = await pg.locator('[aria-label="Go back"]:visible').count();
  check(readyBack === 1 && (await pg.locator('[aria-label="Walk, back"]:visible').count()) === 0, `WI20: opened from the ready bar, Back stays as it was ("Go back") (${readyBack})`);
  const top = await pageOrder();
  const heads = top.filter((r) => r.id.startsWith('kind-heading-'));
  const ok4 = heads.length > 5 && heads.every((r) => r.role === 'heading') && heads[heads.length - 1].text === 'Complexes';
  check(ok4, `WI5, WI14: the five sections' headings and Complexes', each a header (${JSON.stringify(heads.map((r) => r.text))})`);
  const complexAt = top.findIndex((r) => r.id === 'kind-heading-complexes');
  const ok5 = complexAt > 0 && top.slice(complexAt + 1).length > 0 && top.slice(complexAt + 1).every((r) => r.id.startsWith('complex-kind-')) && top.slice(0, complexAt).every((r) => !r.id.startsWith('complex-kind-'));
  check(ok5, `WI15: Complexes' switches follow the five sections, under their own heading (${complexAt})`);
  check(top.every((r) => !/\d/.test(r.text)) && !/\d/.test(await pg.locator('[data-testid=into-page]').innerText().catch(() => '0')), 'WI12: no heading, row or the page carries a number');
  await shot(pg, 'into-page-top');

  // what-im-into-page audit 16: a kind row that follows a subtype stands a little apart from it, more than a kind from its
  // first subtype, so "Buildings and structures" never reads as one more child of the kind above.
  const spacing = await pg.evaluate(() => {
    const rows = [...document.querySelectorAll('[data-testid=into-page] [role=switch][data-testid^=kind-]')].filter((e) => e.getBoundingClientRect().height > 0);
    const left = (e) => e.getBoundingClientRect().left;
    const base = Math.min(...rows.map(left));
    const label = (e) => [...e.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || ''));
    const gap = (a, b) => label(b).getBoundingClientRect().top - label(a).getBoundingClientRect().bottom;
    const before = [];
    const under = [];
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1];
      const b = rows[i];
      if (left(a) > base + 4 && left(b) <= base + 4 && !a.querySelector('[data-testid$=-note]')) before.push(Math.round(gap(a, b)));
      if (left(a) <= base + 4 && left(b) > base + 4 && !a.querySelector('[data-testid$=-note]')) under.push(Math.round(gap(a, b)));
    }
    return { before: Math.min(...before), under: Math.max(...under), n: before.length };
  });
  check(spacing.n > 3 && spacing.before >= spacing.under + 6, `what-im-into-page audit 16: a kind row after a subtype has space above it (${JSON.stringify(spacing)})`);

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
  check(pinned.checked > 3 && pinned.bad.length === 0, `WI5: at every scroll position the pinned heading on its own ground is the section of the rows under it (${JSON.stringify(pinned)})`);

  // WI17, WI22, WI24: at every scroll position, an indented row first under the pinned heading has its kind named in the
  // heading's second line, and a kind's own row in full has none; no heading's words are partly covered by another (the
  // outgoing one is pushed out, those under it hidden); the pinned heading has a hairline under it only once rows pass
  // under it, and the heading keeps one height throughout.
  const levels = await pg.evaluate(async () => {
    const page = document.querySelector('[data-testid=into-page]');
    const first = page && page.querySelector('[data-testid^=kind-]:not([data-testid^=kind-heading-])');
    let sc = first && first.parentElement;
    while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (!sc) return { bad: ['no scroller'] };
    const box = sc.getBoundingClientRect();
    const rows = [...page.querySelectorAll('[role=switch][data-testid]')];
    const heads = [...page.querySelectorAll('[data-testid^=kind-heading-]')];
    const leftOf = (r) => r.getBoundingClientRect().left;
    const parentOf = (row) => {
      const i = rows.indexOf(row);
      for (let j = i - 1; j >= 0; j--) if (leftOf(rows[j]) < leftOf(row) - 4) return rows[j];
      return null;
    };
    const kindLine = (head) => {
      const k = head.querySelector('[data-testid=heading-kind]');
      return k && getComputedStyle(k).opacity !== '0' ? k.textContent.trim() : '';
    };
    const shown = (el) => {
      for (let e = el; e && e !== page; e = e.parentElement) if (getComputedStyle(e).opacity === '0') return false;
      return true;
    };
    const two = [];
    const partly = [];
    const lines = [];
    const heights = new Set();
    let named = 0;
    let checked = 0;
    for (let y = 0; y <= sc.scrollHeight - sc.clientHeight; y += 29) {
      sc.scrollTop = y;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 30));
      await new Promise((r) => requestAnimationFrame(r));
      const hit = document.elementFromPoint(box.x + 30, box.y + 2);
      const head = hit && hit.closest('[data-testid^=kind-heading-]');
      if (!head) continue;
      checked++;
      const hb = head.getBoundingClientRect();
      heights.add(Math.round(hb.height));
      // The first row showing 12 px under the heading (PIN_SLACK): a sliver of the row before it doesn't count.
      const under = document.elementFromPoint(box.x + box.width - 60, hb.bottom + 12);
      const row = under && under.closest('[role=switch][data-testid]');
      if (row && row.getBoundingClientRect().top >= hb.bottom - 2) {
        const parent = leftOf(row) > box.x + 20 ? parentOf(row) : null;
        const said = kindLine(head);
        if (parent) {
          named++;
          if (!said.includes(parent.getAttribute('aria-label'))) two.push({ y, row: row.getAttribute('data-testid'), said });
        } else if (said && row.getBoundingClientRect().top >= hb.bottom - 1) two.push({ y, row: row.getAttribute('data-testid'), said, want: '' });
      }
      // No heading's words partly covered: each shown label is wholly hit, or wholly outside the scroller.
      for (const h of heads) {
        const label = h.querySelector('[data-testid=heading-label]');
        if (!label || !shown(h)) continue;
        const lb = label.getBoundingClientRect();
        const pts = [lb.top + 2, lb.bottom - 2].filter((py) => py > box.top && py < box.bottom);
        const hits = pts.map((py) => (document.elementFromPoint(lb.left + 4, py) || document.body).closest('[data-testid^=kind-heading-]') === h);
        if (hits.length === 2 && hits[0] !== hits[1]) partly.push({ y, head: h.getAttribute('data-testid') });
        if (hits.length === 1 && !hits[0] && lb.bottom > box.top + 2) partly.push({ y, head: h.getAttribute('data-testid'), edge: true });
      }
      const border = parseFloat(getComputedStyle(head).borderBottomWidth) || 0;
      const atRest = y === 0;
      // what-im-into-page audit 12: a heading being pushed out has no hairline: it would sit on the incoming heading.
      const pushed = hb.top < box.top - 0.5;
      if (pushed ? border > 0 : atRest ? border > 0 : (hb.top <= box.top + 1 && border < 0.5)) lines.push({ y, head: head.getAttribute('data-testid'), border, pushed });
      // A heading still in the flow below the top has no hairline.
      for (const h of heads) {
        const b = h.getBoundingClientRect();
        if (b.top > box.top + 60 && b.top < box.bottom && (parseFloat(getComputedStyle(h).borderBottomWidth) || 0) > 0) lines.push({ y, inflow: h.getAttribute('data-testid') });
      }
    }
    sc.scrollTop = 0;
    return { two: two.slice(0, 6), named, partly: partly.slice(0, 6), lines: lines.slice(0, 6), heights: [...heights], checked };
  });
  check(levels.checked > 20 && levels.named > 10 && levels.two.length === 0 && levels.heights.length === 1, `WI17: an indented row under the pinned heading has its kind named there, a kind's own row none, at one height (${JSON.stringify(levels)})`);
  check(levels.checked > 20 && levels.partly.length === 0, `WI22: no heading's words show partly over or under another (${JSON.stringify(levels.partly)})`);
  check(levels.checked > 20 && levels.lines.length === 0, `WI24, what-im-into-page audit 12: a hairline under the pinned heading while rows pass under it, none at rest, in the flow or while pushed out (${JSON.stringify(levels.lines)})`);
  // WI23: Complexes' rows laid out as the kind rows: an icon, the label at the same start; a heading larger than a kind's label.
  const complexLook = await pg.evaluate(() => {
    const leaf = (sel, re) => {
      const r = document.querySelector(`[data-testid=into-page] [data-testid=${sel}]`);
      return r && [...r.querySelectorAll('*')].find((x) => x.childElementCount === 0 && re.test(x.textContent || ''));
    };
    const kind = leaf('kind-public_art', /Public art/);
    const heading = leaf('kind-heading-art', /Art/);
    const rows = ['shopping', 'markets', 'campuses', 'stations', 'civic'].map((k) => {
      const r = document.querySelector(`[data-testid=into-page] [data-testid=complex-kind-${k}]`);
      const l = r && [...r.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || '') && x.getBoundingClientRect().left > r.getBoundingClientRect().left + 8);
      const glyph = r && [...r.querySelectorAll('*')].find((x) => x.childElementCount === 0 && (x.textContent || '').length === 1 && x.textContent.charCodeAt(0) > 0xe000);
      return { k, left: l ? Math.round(l.getBoundingClientRect().left) : null, glyph: glyph ? glyph.textContent.charCodeAt(0) : null };
    });
    return {
      kindLeft: kind ? Math.round(kind.getBoundingClientRect().left) : null,
      kindSize: kind ? parseFloat(getComputedStyle(kind).fontSize) : 0,
      headSize: heading ? parseFloat(getComputedStyle(heading).fontSize) : 0,
      rows,
    };
  });
  const glyphs = complexLook.rows.map((r) => r.glyph);
  check(complexLook.rows.every((r) => r.left === complexLook.kindLeft && r.glyph) && new Set(glyphs).size === glyphs.length && complexLook.headSize > complexLook.kindSize, `WI23: Complexes' rows have an icon each and the kind rows' text start; a heading is larger than a kind's label (${JSON.stringify(complexLook)})`);

  // what-im-into-page audit 7: as installed, no kind row carries a line; switching a subtype against its default does.
  const notesAtFirst = await pg.locator('[data-testid=into-page] [data-testid$=-note]').count();
  for (const k of ['kind-plaques', 'kind-ghost_towns', 'kind-old_trees']) {
    await intoScrollTo(pg, k);
    await pg.locator(`[data-testid=into-page] [data-testid=${k}]`).click().catch(() => {});
    await pg.waitForTimeout(250);
  }
  const ghost = await pg.locator('[data-testid=into-page] [data-testid=kind-curiosities-note]').textContent().catch(() => null);
  check(notesAtFirst === 0 && ghost === 'Ghost towns on', `what-im-into-page audit 7: no line as installed; a subtype switched on is named "on" (${JSON.stringify({ notesAtFirst, ghost })})`);
  // WI18: a kind with some subtypes changed says which, muted, in words, and it is part of what the row is heard as.
  const offLook = await pg.evaluate(() => {
    const row = document.querySelector('[data-testid=into-page] [data-testid=kind-monuments]');
    const note = document.querySelector('[data-testid=into-page] [data-testid=kind-monuments-note]');
    const desc = row && row.getAttribute('aria-describedby');
    const described = desc ? desc.split(' ').map((id) => (document.getElementById(id) || {}).textContent || '').join(' ') : '';
    const allOn = document.querySelector('[data-testid=into-page] [data-testid=kind-attractions-note]');
    return { note: note ? note.textContent : null, color: note ? getComputedStyle(note).color : '', described, allOn: !!allOn };
  });
  check(offLook.note === 'Plaques on' && offLook.color === 'rgb(89, 98, 115)' && offLook.described.includes(offLook.note) && !offLook.allOn,
    `WI18: Monuments and memorials says which of its subtypes changed, muted, in words, heard with the row; a kind as installed says nothing (${JSON.stringify(offLook)})`);

  // what-im-into-page audit 4: on the web a subtype's row is described as part of its kind (react-native-web drops the hint).
  const partOf = await pg.evaluate(() => {
    const r = document.querySelector('[data-testid=into-page] [data-testid=kind-waterfalls]');
    return r ? (r.getAttribute('aria-describedby') || '').split(' ').filter(Boolean).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ') : null;
  });
  check(partOf === 'Part of Nature', `what-im-into-page audit 4: on the web Waterfalls is described "Part of Nature" (${JSON.stringify(partOf)})`);
  // The middle of the page, pinned, for the cold find (WI2: "turn on waterfalls") and the UI review.
  // WI25: each picture after its scroll has come to rest, every row in view showing its switch.
  const unsettled = [];
  for (const [id, name] of [['kind-nature', 'into-page-middle'], ['kind-curiosities', 'into-page-curiosities'], ['kind-amusement_parks', 'into-page-amusement'], ['complex-kind-civic', 'into-page-end']]) {
    await intoScrollTo(pg, id);
    unsettled.push(...(await intoSettled(pg)));
    await shot(pg, name);
  }
  check(unsettled.length === 0, `WI25: every row in view shows its switch in each picture (${JSON.stringify(unsettled)})`);

  // WI7: a kind's label heavier than its subtypes', at the same size.
  const kindLabel = await labelOf('kind-nature');
  const subLabel = await labelOf('kind-waterfalls');
  const ok6 = !!kindLabel && !!subLabel && kindLabel.weight >= 600 && subLabel.weight <= 400 && kindLabel.size === subLabel.size;
  check(ok6, `WI7: a kind's label is heavier than its subtype's, at the same size (${JSON.stringify({ kindLabel, subLabel })})`);

  // WI6: Nature off takes Waterfalls away at once; back on, it returns as it was.
  const fallsWas = await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').getAttribute('aria-checked').catch(() => null);
  await pg.locator('[data-testid=into-page] [data-testid=kind-nature]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const fallsGone = await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').count();
  await pg.locator('[data-testid=into-page] [data-testid=kind-nature]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const fallsBack = await pg.locator('[data-testid=into-page] [data-testid=kind-waterfalls]').getAttribute('aria-checked').catch(() => null);
  check(fallsWas != null && fallsGone === 0 && fallsBack === fallsWas, `WI6: Nature off takes Waterfalls' row away; on, it returns as it was (${JSON.stringify({ fallsWas, fallsGone, fallsBack })})`);
  // WI9: a switch never touches the range or the pocket alert.
  const rangeWas = await metaOf('explore_range');
  const hapticWas = await metaOf('explore_haptic');
  await pg.locator('[data-testid=into-page] [data-testid=kind-churches]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const churchesOff = /churches/.test(String(await metaOf('explore_hidden')));
  await pg.locator('[data-testid=into-page] [data-testid=kind-churches]').click().catch(() => {});
  await pg.waitForTimeout(300);
  const ok7 = churchesOff && rangeWas === '140' && (await metaOf('explore_range')) === '140' && (await metaOf('explore_haptic')) === hapticWas;
  check(ok7, `WI8, WI9: a switch saves as it changes, and never changes the range or the pocket alert (${JSON.stringify({ churchesOff, rangeWas, hapticWas })})`);
  const readyOrder = (await pageOrder()).map((r) => r.id);

  // WI4, WI14: Back returns to the raised settings, the row in view, focus on it.
  const backed = await closeInto(pg, 'back');
  const after = await pg.evaluate(() => {
    const r = document.querySelector('[data-testid=start-settings] [data-testid=into-row]');
    const b = r && r.getBoundingClientRect();
    return { row: !!b && b.height > 0 && b.top >= 0 && b.bottom <= innerHeight, focus: document.activeElement === r };
  });
  const ok8 = backed && (await pg.locator('[data-testid=start-settings]:visible').count()) === 1 && after.row;
  check(ok8, `WI4: Back returns to the ready bar still raised, the row in view (${JSON.stringify(after)})`);
  check(after.focus, 'WI14: Back returns focus to the row');
  // Escape on the web, the same; and only the page goes, the bar stays raised.
  await openInto(pg, 'ready');
  const escaped = await closeInto(pg, 'escape');
  check(escaped && (await pg.locator('[data-testid=start-settings]:visible').count()) === 1, 'WI4: Escape returns to the ready bar still raised');

  // what-im-into-page audit 5: back from the page, a range changed before the ready screen has read again never writes the
  // kinds it held before the page back over the page's change.
  {
    await openInto(pg, 'ready');
    await pg.locator('[data-testid=into-page] [data-testid=kind-churches]').click().catch(() => {});
    await pg.waitForTimeout(400);
    const offOnPage = /churches/.test(String(await metaOf('explore_hidden')));
    await pg.evaluate(() => {
      // The ready screen's read on its return is held back, as on a slow phone.
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
    await closeInto(pg, 'back');
    await pg.click('[data-testid=start-settings] [data-testid=range-plus]').catch(() => {});
    await pg.waitForTimeout(3000);
    const kept = /churches/.test(String(await metaOf('explore_hidden')));
    check(offOnPage && kept, `what-im-into-page audit 5: a range changed on the return keeps the kind switched off on the page (${JSON.stringify({ offOnPage, kept })})`);
    await pg.click('[data-testid=start-settings] [data-testid=range-minus]').catch(() => {});
    await openInto(pg, 'ready');
    await pg.locator('[data-testid=into-page] [data-testid=kind-churches]').click().catch(() => {});
    await pg.waitForTimeout(300);
    await closeInto(pg);
  }

  // what-im-into-page audit 6: in the ready bar too, with Places off and Sights on the row stays; with Sights off it goes.
  {
    // Raised again after the Layers button: the drag can miss once, so it is tried until the settings show.
    const raiseBar = async () => {
      for (let i = 0; i < 4; i++) {
        await drawerTo(pg, 'half');
        await pg.waitForTimeout(700);
        if (await pg.locator('[data-testid=start-settings]').isVisible().catch(() => false)) return;
      }
    };
    // The raised bar covers the Layers button: lower it, switch, raise it again.
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(500);
    await switchLayer(pg, 'places', false);
    await raiseBar();
    await pg.waitForTimeout(400);
    const quietSights = await pg.locator('[data-testid=start-settings] [data-testid=into-row]').count();
    await pg.click('[data-testid=start-settings] [data-testid=leaning-sights]');
    await pg.waitForTimeout(400);
    const quietNone = await pg.locator('[data-testid=start-settings] [data-testid=into-row]').count();
    await pg.click('[data-testid=start-settings] [data-testid=leaning-sights]');
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(500);
    await switchLayer(pg, 'places', true);
    await raiseBar();
    await pg.waitForTimeout(400);
    check(quietSights === 1 && quietNone === 0, `what-im-into-page audit 6: the ready bar's row shows with Places off and Sights on, and not with Sights off too (${quietSights}, ${quietNone})`);
  }

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
  await pg.locator('[data-testid=start-settings] [data-testid=into-row]').click({ timeout: 5000 }).catch(async (e) => console.log('# into-row click:', String(e).split('\n')[0].slice(0, 120), JSON.stringify({ settings: await pg.locator('[data-testid=start-settings]').count(), visible: await pg.locator('[data-testid=start-settings]').isVisible().catch(() => null), row: await pg.locator('[data-testid=into-row]').count(), rowVisible: await pg.locator('[data-testid=into-row]').first().isVisible().catch(() => null), bar: await pg.locator('[data-testid=ready-bar]').boundingBox().catch(() => null), panel: await pg.locator('[data-testid=layers-panel]').count() })));
  await pg.waitForSelector('[data-testid=into-page]', { state: 'visible', timeout: 2000 }).catch(() => {});
  const earlyShown = await pageShown();
  const early = await pg.locator('[data-testid=into-page] [data-testid^=kind-]').count();
  await pg.waitForSelector('[data-testid=into-page] [data-testid^=kind-]', { timeout: 8000 }).catch(() => {});
  const later = await pg.locator('[data-testid=into-page] [data-testid^=kind-]').count();
  const pageText = (await pg.locator('[data-testid=into-page]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
  check(earlyShown && early === 0 && later > 0 && (await metaOf('explore_hidden')) === hiddenWas, `WI9: no switch is drawn before the settings are read, and nothing is written (${early} then ${later}; shown ${earlyShown}; hidden ${(await metaOf('explore_hidden')) === hiddenWas}; page: ${pageText})`);
  await closeInto(pg);

  // A walk, exploring, to the waterfall.
  await drawerTo(pg, 'peek');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await switchLayer(pg, 'places');
  for (let k = 0; k <= 12; k++) {
    const p = at(-0.5 + k * 0.05, -0.5);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  const falls = async () => (await marksNow()).some((l) => /Bushkill Falls/.test(String(l)));
  const fallsBefore = await falls();

  // WI1, WI11: the walk's drawer with Places on: the row, Places in the key, the range; no kind's switch.
  await pg.click('[data-testid=walk-summary]');
  await pg.waitForSelector('[data-testid=options-card]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(700);
  const inDrawer = await pg.locator('[data-testid=options-card] [data-testid^=kind-], [data-testid=options-card] [data-testid^=complex-kind-]').count();
  const ok9 = (await pg.locator('[data-testid=options-card] [data-testid=into-row]').count()) === 1 && inDrawer === 0 && (await pg.locator('[data-testid=options-card] [data-testid=layer-legend-places]').count()) === 1 && (await pg.locator('[data-testid=options-card] [data-testid=range-slider]').count()) === 1;
  check(ok9, `WI1, WI11: the walk's drawer holds the row, Places in the layers key and the range, and no kind's switch (${inDrawer})`);
  await pg.locator('[data-testid=options-card] [data-testid=into-row]').scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(300);
  await shot(pg, 'into-walk-row');
  // WI19: the row's section is its own, after the walk's settings: the header above it is "Explore" (audit 13), not "This walk".
  const section = await pg.evaluate(() => {
    const card = document.querySelector('[data-testid=options-card]');
    const row = card && card.querySelector('[data-testid=into-row]');
    if (!row) return null;
    const all = [...card.querySelectorAll('[role=heading], [data-testid=into-row], [data-testid=share-gps-log]')];
    const before = all.slice(0, all.indexOf(row));
    const head = before.filter((e) => e.getAttribute('role') === 'heading').at(-1);
    return { head: head ? head.textContent.trim() : null, afterShare: before.some((e) => e.getAttribute('data-testid') === 'share-gps-log') };
  });
  check(!!section && section.head === 'Explore' && section.afterShare, `WI19, what-im-into-page audit 13: the walk's row sits in a section of its own, "Explore", after the walk's settings (${JSON.stringify(section)})`);

  // what-im-into-page audit 6: Sights (scenic routes) reads the kinds too: with Places off and Sights on the row stays;
  // with both off it goes.
  {
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForTimeout(500);
    await switchLayer(pg, 'places', false);
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForSelector('[data-testid=options-card]');
    await pg.waitForTimeout(400);
    const withSights = await pg.locator('[data-testid=options-card] [data-testid=into-row]').count();
    await pg.click('[data-testid=options-card] [data-testid=leaning-sights]');
    await pg.waitForTimeout(400);
    const neither = await pg.locator('[data-testid=options-card] [data-testid=into-row]').count();
    await pg.click('[data-testid=options-card] [data-testid=leaning-sights]');
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForTimeout(500);
    await switchLayer(pg, 'places', true);
    await pg.click('[data-testid=walk-summary]');
    await pg.waitForSelector('[data-testid=options-card]');
    await pg.waitForTimeout(400);
    check(withSights === 1 && neither === 0, `what-im-into-page audit 6: the walk's row shows with Sights on and Places off, and not with both off (${withSights}, ${neither})`);
  }

  // WI3: the same page from the walk's drawer, the same rows in the same order.
  const fromWalk = await openInto(pg, 'walk');
  // WI20: from the walk's drawer, Back reads "Walk", the arrow and the word, and is heard as "Walk, back".
  const backLook = await pg.evaluate(() => {
    const b = [...document.querySelectorAll('[aria-label="Walk, back"], [aria-label="Go back"]')].find((e) => e.getBoundingClientRect().width > 0);
    // The header keeps hidden copies of its labels for measuring: read the words drawn.
    const drawn = (e) => {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      for (let x = e; x && x !== b.parentElement; x = x.parentElement) {
        const cs = getComputedStyle(x);
        if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.position === 'absolute') return false;
      }
      return true;
    };
    const words = b ? [...b.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && /[A-Za-z]/.test(x.textContent || '') && drawn(x)).map((x) => x.textContent.trim()) : [];
    return b ? { label: b.getAttribute('aria-label'), text: words.join(' '), w: b.getBoundingClientRect().width } : null;
  });
  check(!!backLook && backLook.label === 'Walk, back' && backLook.text === 'Walk', `WI20: opened from the walk, Back reads "Walk" and is heard as "Walk, back" (${JSON.stringify(backLook)})`);
  await shot(pg, 'into-page-from-walk');
  const walkOrder = (await pageOrder()).map((r) => r.id);
  check(fromWalk && readyOrder.length > 0 && JSON.stringify(walkOrder) === JSON.stringify(readyOrder), `WI3: the walk's row opens the same page, the same rows in order (${readyOrder.length} vs ${walkOrder.length})`);
  check((await pg.locator('[data-testid=into-page] [data-testid=pocket-alert], [data-testid=into-page] [data-testid=range-slider]').count()) === 0, 'WI11: the range and the pocket alert are not on the page');

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
  // what-im-into-page audit 1: Escape on the page pops the page alone: the walk's drawer beneath stays raised, its
  // handler and those of the cards beneath the page being the screen's only while it is in front.
  const escapedWalk = await closeInto(pg, 'escape');
  check(escapedWalk && (await pg.locator('[data-testid=options-card]:visible').count()) === 1, 'what-im-into-page audit 1: Escape on the page pops it, and the walk\'s drawer beneath stays raised');
  const pointsAfter = await tracePoints();
  const ok10 = pointsAfter >= pointsBefore + 4 && (await pg.locator('[data-testid=walk-actions]').count()) === 1 && new URL(pg.url()).pathname === `${BASE}/walk`;
  check(ok10, `WI10: the fixes that came while the page was up are in the trace, on the one walk screen (${pointsBefore} → ${pointsAfter})`);
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
  check(fallsBefore && savedOff && !fallsOff && fallsOn, `WI8: Waterfalls off on the page takes the falls off the walk's map; on, they show (${JSON.stringify({ fallsBefore, savedOff, fallsOff, fallsOn })})`);

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
  check(ok11, `WI13: at 320 px the row's words and chevron are on one line (${JSON.stringify(rowNarrow)})`);
  await openInto(pg, 'walk');
  const wrapped = await wrappedIn('[data-testid=into-page] [data-testid^=kind-], [data-testid=into-page] [data-testid^=complex-kind-]');
  check((await pageShown()) && wrapped.length === 0, `WI13: at 320 px no heading or row's label wraps on the page (${JSON.stringify(wrapped)})`);

  // WI18: at 320 px each off line is one line.
  const offWrapped = await wrappedIn('[data-testid=into-page] [data-testid$=-note]');
  const offCount = await pg.locator('[data-testid=into-page] [data-testid$=-note]').count();
  check(offCount > 2 && offWrapped.length === 0, `WI18: at 320 px each kind's off line is one line (${offCount}; ${JSON.stringify(offWrapped)})`);
  // tend explore T49 (decision 0239): under each category's heading a muted line in words ("Parks, gardens and nature").
  const intoLines = await pg.evaluate(() => {
    // In document order, the headings, the rows and the lines: each line comes right after its own heading.
    const order = [...document.querySelectorAll('[data-testid=into-page] [data-testid^=kind-heading-], [data-testid=into-page] [data-testid^=kind-], [data-testid=into-page] [data-testid^=into-line-]')]
      .map((e) => e.getAttribute('data-testid')).filter((id, i, all) => all.indexOf(id) === i);
    return [...document.querySelectorAll('[data-testid=into-page] [data-testid^=into-line-]')].map((e) => {
      const leaf = [...e.querySelectorAll('*'), e].find((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || ''));
      const id = e.getAttribute('data-testid');
      return { id, text: leaf ? leaf.textContent : '', color: leaf ? getComputedStyle(leaf).color : '', after: order[order.indexOf(id) - 1] ?? null };
    });
  });
  // tend explore T49, audit 46 (decision 0264's amendment): the muted lines may wrap at 320 px (a layout call); each is
  // whole at 390 and 320: nothing clipped, no ellipsis, nothing hidden, its rendered height holding every line it takes.
  // The line count is logged, never asserted.
  const linesWhole = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=into-page] [data-testid^=into-line-]')].map((e) => {
    const cs = getComputedStyle(e);
    const range = document.createRange();
    range.selectNodeContents(e);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    const lines = new Set(rects.map((r) => Math.round(r.top))).size;
    const lineH = rects.length ? rects[0].height : 0;
    const box = e.getBoundingClientRect();
    const clipped = e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1;
    const ellipsis = /…$/.test(e.textContent || '') || cs.textOverflow === 'ellipsis' && /hidden|clip/.test(cs.overflowX + cs.overflow)
      || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
    const hidden = cs.visibility === 'hidden' || Number(cs.opacity) === 0 || box.width === 0 || box.right > window.innerWidth + 1;
    const tall = lines > 0 && box.height + 1 >= lines * lineH;
    return { id: e.getAttribute('data-testid'), text: e.textContent, lines, h: Math.round(box.height), lineH: Math.round(lineH), whole: !clipped && !ellipsis && !hidden && tall };
  }));
  const at320 = await linesWhole();
  await pg.setViewportSize({ width: 390, height: 700 });
  await pg.waitForTimeout(600);
  const at390 = await linesWhole();
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(600);
  check(intoLines.length === 5 && intoLines.every((l) => l.text && !/\d/.test(l.text) && l.color === 'rgb(89, 98, 115)' && l.after === `kind-heading-${l.id.slice('into-line-'.length)}`)
    && intoLines.some((l) => l.text === 'Parks, gardens and nature') && at320.length === 5 && at390.length === 5 && [...at320, ...at390].every((l) => l.whole),
    `tend explore T49: each category's heading has its muted line under it, in words, whole at 390 and 320 px, nothing clipped or hidden (${JSON.stringify(intoLines)}; 320: ${JSON.stringify(at320)}; 390: ${JSON.stringify(at390)})`);
  // tend explore audit 46 (decision 0264): History's line names its four kinds in the owner's words, whole at 390 and 320 px.
  const history = intoLines.find((l) => l.id === 'into-line-history');
  const h320 = at320.find((l) => l.id === 'into-line-history');
  const h390 = at390.find((l) => l.id === 'into-line-history');
  check(!!history && history.text === 'Monuments, buildings, places of worship and cemeteries' && !!h320 && h320.whole && !!h390 && h390.whole,
    `tend explore audit 46: History's muted line names its four kinds in the owner's words, whole at 390 and 320 px (lines: ${h390 && h390.lines} at 390, ${h320 && h320.lines} at 320; ${JSON.stringify({ history, h320, h390 })})`);
  await shot(pg, 'into-page-320');
  await closeInto(pg);
  await pg.setViewportSize({ width: 390, height: 844 });
  // 200% text: every label still all there, never cut off at the edge. The page is opened at 200%, as a reader whose
  // browser is zoomed opens it: a CSS zoom set on an open page halves its box (195 px) without a resize, which
  // react-native-web's onLayout never hears; a real zoom changes the window's width and is heard.
  await pg.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await pg.waitForTimeout(500);
  await openInto(pg, 'walk');
  const lost = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=into-page] [data-testid^=kind-], [data-testid=into-page] [data-testid^=complex-kind-]')]
    .filter((e) => e.getBoundingClientRect().height > 0)
    .flatMap((e) => [...e.querySelectorAll('*'), e].filter((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || ''))
      .filter((x) => x.scrollWidth > x.clientWidth + 1 || x.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
      .map((x) => x.textContent)));
  check(lost.length === 0, `WI13: at 200% every heading and label is whole (${JSON.stringify(lost)})`);

  // WI21: at 200% a label breaks only between words; a wrapped row stands clear of the next; the indent is smaller.
  const big = await pg.evaluate(() => {
    const split = [];
    const close = [];
    const rows = [...document.querySelectorAll('[data-testid=into-page] [role=switch]')].filter((e) => e.getBoundingClientRect().height > 0);
    let prevBottom = null;
    for (const r of rows) {
      const leaves = [...r.querySelectorAll('*')].filter((x) => x.childElementCount === 0 && /[A-Za-z]{3}/.test(x.textContent || '') && x.firstChild);
      for (const leaf of leaves) {
        const text = leaf.firstChild.textContent;
        let at = 0;
        for (const w of text.split(' ')) {
          const range = document.createRange();
          range.setStart(leaf.firstChild, at);
          range.setEnd(leaf.firstChild, at + w.length);
          if (w && new Set([...range.getClientRects()].map((x) => Math.round(x.top))).size > 1) split.push(w);
          at += w.length + 1;
        }
      }
      const tb = leaves.length ? leaves.map((l) => l.getBoundingClientRect()) : [];
      if (tb.length) {
        const top = Math.min(...tb.map((b) => b.top));
        if (prevBottom != null && top - prevBottom < 8) close.push(r.getAttribute('data-testid'));
        prevBottom = Math.max(...tb.map((b) => b.bottom));
      }
    }
    const indent = (id) => {
      const r = document.querySelector(`[data-testid=into-page] [data-testid=${id}]`);
      return r ? r.getBoundingClientRect().left : 0;
    };
    // Boxes are read zoomed: the indent in CSS px is half.
    return { split: split.slice(0, 8), close: close.slice(0, 8), indent: (indent('kind-statues') - indent('kind-public_art')) / 2 };
  });
  check(big.split.length === 0 && big.close.length === 0 && big.indent > 0 && big.indent < 28, `WI21: at 200% labels break only between words, rows stand apart, the indent is smaller (${JSON.stringify(big)})`);
  // what-im-into-page audit 12: at 200% the heading at rest has no blank band above a one-line category ("Art").
  const band = await pg.evaluate(() => {
    const h = document.querySelector('[data-testid=into-page] [data-testid=kind-heading-art]');
    const l = h && h.querySelector('[data-testid=heading-label]');
    return h && l ? (l.getBoundingClientRect().top - h.getBoundingClientRect().top) / 2 : null;
  });
  check(band != null && band <= 26, `what-im-into-page audit 12: at 200% the heading "Art" reserves no more above it than at the default size (${band} CSS px)`);
  await shot(pg, 'into-page-200');
  await pg.evaluate(() => { document.documentElement.style.zoom = ''; });
  await closeInto(pg);

  // WI16: a reload on the page with a walk open brings the walk back, as at launch (NV2).
  await openInto(pg, 'walk');
  await pg.reload();
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 }).catch(() => {});
  check(new URL(pg.url()).pathname === `${BASE}/walk` && !(await pageShown()), `WI16: a reload on the page with a walk open comes back to the walk (${pg.url()})`);

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
    'src/lib/{intoNav,intoGate,walkName}.ts',
    'src/lib/complexes/kindSwitches.ts',
  ],
  run,
};
