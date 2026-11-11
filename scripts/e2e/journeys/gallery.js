// Media gallery (MG1-MG22): Chronicle's Media section. Seeded straight into IndexedDB. E2E_ONLY=gallery runs it alone.
// MG3, MG5, MG6, MG9, MG12, MG14, MG15, MG18, MG22 are unit tests too (src/lib/__tests__/gallery/).

const SEED = () => {
  const DAY = 86400000;
  const today = new Date();
  const at = (daysAgo, h, m = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, h, m).getTime();
  const lastYear = new Date(today.getFullYear() - 1, 5, 2, 10).getTime();
  const piece = (id, mid, t, kind, o = {}) => ({ id, moment_id: mid, t, kind, file_path: kind === 'photo' ? 'g-photo' : kind === 'text' ? null : 'g-media', body: kind === 'text' ? 'A note never in the grid' : kind === 'photo' ? null : '42000', caption: null, caption_y: null, thumb_path: null, edit: null, ...o });
  const moment = (id, walk_id, pieces) => ({ id, walk_id, t: pieces[0].t, lat: null, lon: null, segment_id: null, piece_ids: pieces.map((p) => p.id), pieces });
  const walk = { id: 'w-alfama', started_at: at(1, 8), ended_at: at(1, 10), title: null, epilogue: null, open: false, area: 'Alfama', snapped_build: null };
  // A walk whose name wraps the day's place line to two lines (fix gallery-header).
  const longWalk = { id: 'w-long', started_at: at(2, 19), ended_at: at(2, 20), title: 'An evening along the river past the North Hall Street market and the old docks', epilogue: null, open: false, area: null, snapped_build: null };
  const moments = [
    moment('stack', 'w-alfama', [
      piece('stack', 'stack', at(1, 9), 'photo', { caption: 'A caption never on the tile', thumb_path: 'g-thumb' }),
      piece('stack.1', 'stack', at(1, 9, 1), 'photo'),
      piece('stack.2', 'stack', at(1, 9, 2), 'photo'),
    ]),
    moment('memo', null, [piece('memo', 'memo', at(0, 8), 'voice')]),
    moment('note', null, [piece('note', 'note', at(0, 7), 'text')]),
    moment('vid', null, [piece('vid', 'vid', at(2, 15), 'video', { body: '12000' })]),
    moment('river', 'w-long', [piece('river', 'river', at(2, 19, 30), 'photo')]),
    ...Array.from({ length: 30 }, (_, i) => moment(`many${i}`, null, [piece(`many${i}`, `many${i}`, at(3, 9, i), 'photo')])),
    moment('old', null, [piece('old', 'old', lastYear, 'photo')]),
  ];
  const blob = (w, h, fill) => new Promise((r) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = fill;
    g.fillRect(0, 0, w, h);
    cv.toBlob(r, 'image/png');
  });
  return Promise.all([blob(160, 90, '#3a5f7d'), blob(90, 90, '#7d3a3a')]).then(([photo, thumb]) => new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'moment', 'media'], 'readwrite');
      tx.objectStore('walk').put(walk);
      tx.objectStore('walk').put(longWalk);
      for (const m of moments) tx.objectStore('moment').put(m);
      tx.objectStore('media').put({ key: 'g-photo', blob: photo });
      tx.objectStore('media').put({ key: 'g-thumb', blob: thumb });
      tx.oncomplete = () => resolve(DAY);
      tx.onerror = () => reject(tx.error);
    };
  }));
};

async function run(h) {
  const { url, check, shot, tabTo, freshPage } = h;
  const { c, pg } = await freshPage('gallery', { touch: true });
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  const visible = (sel) => pg.locator(sel).filter({ visible: true });
  const has = async (sel) => (await visible(sel).count()) > 0;
  const there = (sel, timeout = 8000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const menu = async () => {
    await pg.click('[data-testid=gallery-view-menu]');
    await pg.waitForSelector('[data-testid=gallery-menu]', { timeout: 5000 });
    await pg.waitForTimeout(400);
  };
  const done = async () => {
    await pg.click('[data-testid=gallery-menu-done]');
    await pg.waitForSelector('[data-testid=gallery-menu]', { state: 'detached', timeout: 5000 }).catch(() => {});
  };
  const tilesNow = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=gallery-tile]')].filter((e) => !e.closest('[aria-hidden=true]')).map((e) => ({ piece: e.dataset.piece, kind: e.dataset.kind, moment: e.dataset.moment, ref: e.dataset.ref, label: e.getAttribute('aria-label'), text: e.innerText.replace(/[\uE000-\uF8FF]/g, '').trim(), w: e.getBoundingClientRect().width })));
  // What a screen reader and the eye get on Media: every text and every label (MG7).
  const words = () => pg.evaluate(() => {
    const root = document.querySelector('[data-testid=media-screen]');
    const menuEl = document.querySelector('[data-testid=gallery-menu]');
    const out = [];
    for (const el of [root, menuEl]) {
      if (!el) continue;
      out.push(el.innerText);
      for (const n of el.querySelectorAll('[aria-label]')) out.push(n.getAttribute('aria-label'));
    }
    return out.join('\n');
  });
  // The only digits: dates, years, times of day and lengths.
  const tally = (text) => {
    const rest = text
      .replace(/\b\d{1,2}:\d{2}(:\d{2})?(\s?[AP]M)?/gi, '')
      .replace(/\b(19|20)\d{2}\b/g, '')
      .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}\b/g, '');
    return /\d/.test(rest) || / of \d/.test(text) || /\bitems?\b/i.test(text.replace(/All Items/g, ''));
  };

  // MG1: Media is the fifth section. MG10: with nothing kept, one line.
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=chronicle-sections]', { timeout: 15000 });
  const labels = await pg.locator('[data-testid=chronicle-sections] [role=tab]').allInnerTexts();
  await pg.click('[data-testid=section-media]');
  const mediaUp = await there('[data-testid=media-screen]');
  const emptyLine = (await there('[data-testid=gallery-empty]', 10000)) ? await pg.locator('[data-testid=gallery-empty]').innerText() : '';
  check(mediaUp && labels.join('|') === 'Memories|Walks|Days|Map|Media', `MG1: Chronicle's bar reads ${labels.join(' | ')} and Media shows the gallery`);
  check(emptyLine === 'Photos, videos and voice memos you keep show here.', `MG10: with nothing kept, one line in words (${emptyLine})`);
  await shot(pg, '95-gallery-empty');

  // MG2: at 320 px the five labels sit in one row, none wrapped or cut, each 44 tall.
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(400);
  const fit = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=chronicle-sections] [role=tab]')].map((t) => {
    const r = t.getBoundingClientRect();
    const label = t.querySelector('div[dir], div') || t;
    return { top: Math.round(r.top), h: r.height, right: r.right, cut: label.scrollWidth > label.clientWidth + 1, lines: Math.round(label.getBoundingClientRect().height / 17) };
  }));
  check(fit.length === 5 && new Set(fit.map((f) => f.top)).size === 1 && fit.every((f) => f.h >= 44 && !f.cut && f.lines <= 1 && f.right <= 320),
    `MG2: five labels in one row at 320 px (${JSON.stringify(fit)})`);
  await shot(pg, '95-gallery-bar-320');
  await pg.setViewportSize({ width: 390, height: 844 });

  // Seed and show.
  await pg.evaluate(SEED);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.click('[data-testid=section-media]');
  await pg.waitForSelector('[data-testid=gallery-tile]', { timeout: 20000 });
  await pg.waitForTimeout(1200);
  await shot(pg, '96-gallery-days');

  // MG17: Media is not a capture screen.
  check(!(await has('[data-testid=media-screen] [data-testid=band-photo]')) && !(await has('[data-testid=band-photo]')), 'MG17: no capture stack on Media');

  // MG4, MG11, MG15: bare tiles, small copies, spoken by their own place.
  let tiles = await tilesNow();
  const first = tiles.slice(0, 12);
  const kinds = new Set(tiles.map((t) => t.kind));
  const bare = tiles.every((t) => t.text === '' || /^\d+:\d{2}$/.test(t.text));
  const pageText = await pg.locator('[data-testid=media-screen]').innerText();
  check(bare && !/A caption never on the tile|A note never in the grid/.test(pageText) && !kinds.has('text') && first.length >= 9,
    `MG4: tiles are bare: no caption, note or words, a memo or video its length (${first.map((t) => t.text || t.kind).join(',')})`);
  const memo = tiles.find((t) => t.piece === 'memo');
  check(memo && memo.text === '0:42', `MG4: a memo tile is a mic and its length (${memo && memo.text})`);
  const withCopy = tiles.find((t) => t.piece === 'stack');
  check(withCopy && withCopy.ref === 'g-thumb', `MG11: a photo tile loads its small copy, never the full file (${withCopy && withCopy.ref})`);
  check(tiles.every((t) => /^(Photo|Video|Voice memo), .+, .+$/.test(t.label)) && /a morning walk in Alfama$/.test(tiles.find((t) => t.piece === 'stack.1')?.label ?? '') && /not on a walk$/.test(memo?.label ?? ''),
    `MG15: tiles are buttons spoken by kind, time and their own place (${tiles.find((t) => t.piece === 'stack.1')?.label}; ${memo?.label})`);
  const roles = await pg.evaluate(() => ({ headers: document.querySelectorAll('[data-testid=gallery-day-title][role=heading]').length, tabs: document.querySelectorAll('[data-testid=gallery-zoom] [role=tab][aria-selected=true]').length }));
  check(roles.headers > 0 && roles.tabs === 1, `MG15: day titles are headings and Years, Months, Days are tabs (${JSON.stringify(roles)})`);
  const dayLines = await pg.locator('[data-testid=gallery-day-line]').allInnerTexts();
  // fix gallery-header (audit 1, 4): no header's or block's title or line is cut: a title holds its text, a line is a
  // whole number of its line heights (a squeezed one is not), and both stay inside their row.
  const cutIn = () => pg.evaluate(() => [...document.querySelectorAll('[data-testid=gallery-day], [data-testid=gallery-block]')].filter((h) => !h.closest('[aria-hidden=true]')).flatMap((h) => {
    const box = h.getBoundingClientRect();
    return [...h.querySelectorAll('[data-testid$=-title], [data-testid$=-line]')].filter((t) => {
      const r = t.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(t).lineHeight);
      const squeezed = t.getAttribute('data-testid').endsWith('title') ? t.scrollHeight > t.clientHeight + 1 : !(lh > 0) || t.clientHeight < lh - 0.5 || Math.abs(t.clientHeight / lh - Math.round(t.clientHeight / lh)) > 0.05;
      return squeezed || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5;
    }).map((t) => `${t.getAttribute('data-testid')}: ${t.innerText} (${t.clientHeight}/${t.scrollHeight})`);
  }));
  const cut = await cutIn();
  const twoLines = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=gallery-day-line]')].some((l) => l.getBoundingClientRect().height > 30));
  check(cut.length === 0 && twoLines, `fix gallery-header: no header text is cut, a two-line place line included (${cut.join('; ') || 'none cut'}; two lines: ${twoLines})`);
  check(dayLines.includes('A morning walk in Alfama') && dayLines.includes('Not on a walk'), `MG6: each day says where (${dayLines.join(' / ')})`);

  // MG8: a tile opens its moment at its piece, with its context; steps follow the gallery; Close keeps the scroll.
  const listBox = await pg.locator('[data-testid=gallery-list]').boundingBox();
  const scroller = '[data-testid=gallery-list]';
  await pg.locator(scroller).evaluate((el) => {
    const s = [el, ...el.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 10);
    if (s) s.scrollTop = 60;
  });
  await pg.waitForTimeout(500);
  const scrollOf = () => pg.locator(scroller).evaluate((el) => {
    const s = [el, ...el.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 10);
    return s ? Math.round(s.scrollTop) : -1;
  });
  const before = await scrollOf();
  await pg.locator('[data-testid=gallery-tile][data-piece="stack.1"]').click();
  await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 });
  await pg.waitForTimeout(900);
  const shown = await pg.locator('[data-testid=piece-shown]').first().getAttribute('data-piece').catch(() => null);
  const meta = (await pg.locator('[data-testid=capture-meta]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
  await shot(pg, '97-gallery-viewer');
  check(shown === 'stack.1', `MG8: the tile opens its moment at its own piece (${shown})`);
  check(/Alfama/.test(meta) && !/ of \d/.test(meta), `MG8, MG7: the info line carries the moment's place and walk and no "i of n" (${meta})`);
  const pieceButtons = await has('[data-testid=piece-next]');
  check(pieceButtons, 'MG8: the viewer shows every piece of the moment, whatever the filter');
  await pg.locator('[aria-label="Next moment"]').first().click();
  await pg.waitForTimeout(700);
  const next = await pg.locator('[data-testid=piece-shown]').first().getAttribute('data-piece').catch(() => null);
  check(next === 'river', `MG8: Next goes to the gallery's next moment in its order (${next})`);
  await pg.click('[data-testid=viewer-close]');
  await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 5000 }).catch(() => {});
  await pg.waitForTimeout(600);
  const after = await scrollOf();
  check(Math.abs(after - before) <= 2 && (await has('[data-testid=section-media][aria-selected=true]')), `MG8, MG1: Close returns to the gallery where it was, still on Media (${before} -> ${after})`);

  // MG16: the day's header stays pinned while its tiles scroll.
  await pg.locator(scroller).evaluate((el) => {
    const s = [el, ...el.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 10);
    if (s) s.scrollTop = 900;
  });
  await pg.waitForTimeout(800);
  const pinned = await pg.evaluate((top) => {
    const hs = [...document.querySelectorAll('[data-testid=gallery-day]')].filter((e) => !e.closest('[aria-hidden=true]'));
    return hs.some((e) => Math.abs(e.getBoundingClientRect().top - top) < 3);
  }, listBox.y);
  await shot(pg, '96-gallery-scrolled');
  check(pinned, "MG16: a day's header is pinned at the top while its tiles scroll");

  // MG7: nothing counts, in Days.
  const daysWords = await words();
  check(!tally(daysWords), `MG7: no count in Days (${daysWords.replace(/\s+/g, ' ').slice(0, 200)})`);

  // MG20: Zoom Out from the menu shows more, smaller tiles; Zoom In back. A pinch does the same.
  const w0 = (await tilesNow())[0]?.w ?? 0;
  await menu();
  await shot(pg, '98-gallery-menu');
  const menuWords = await words();
  await pg.click('[data-testid=gallery-menu-zoom-out]');
  await pg.waitForTimeout(300);
  await done();
  await pg.waitForTimeout(600);
  const w1 = (await tilesNow())[0]?.w ?? 0;
  await shot(pg, '98-gallery-smaller');
  check(w1 > 44 && w1 < w0 * 0.7, `MG20: Zoom Out shows five across (${Math.round(w0)} -> ${Math.round(w1)} px)`);
  const cdp = await c.newCDPSession(pg);
  const box = await pg.locator('[data-testid=gallery-list]').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const touch = (type, d) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }] });
  await touch('touchStart', 40);
  for (const d of [50, 60, 70, 80]) await touch('touchMove', d);
  await touch('touchEnd', 0);
  await pg.waitForTimeout(700);
  const w2 = (await tilesNow())[0]?.w ?? 0;
  check(w2 > w1 * 1.3, `MG20: a pinch out shows fewer, larger tiles (${Math.round(w1)} -> ${Math.round(w2)} px)`);
  check(!tally(menuWords), 'MG7: no count in the View menu');

  // MG21: Aspect Ratio Grid shows a photo whole in its square cell.
  await menu();
  await pg.click('[data-testid=gallery-menu-shape-aspect]');
  await done();
  await pg.waitForTimeout(600);
  const sizes = await pg.evaluate(() => {
    const img = [...document.querySelectorAll('[data-testid=gallery-img]')].find((e) => !e.closest('[aria-hidden=true]'));
    const tile = img && img.closest('[data-testid=gallery-tile]');
    const bg = img && [img, ...img.querySelectorAll('div')].map((d) => getComputedStyle(d).backgroundSize).find((s) => s && s !== 'auto');
    const r = tile && tile.getBoundingClientRect();
    return { bg, w: r && Math.round(r.width), h: r && Math.round(r.height) };
  });
  await shot(pg, '98-gallery-aspect');
  check(sizes.bg === 'contain' && sizes.w === sizes.h, `MG21: the photo shows whole in a cell that stays square (${JSON.stringify(sizes)})`);
  await menu();
  await pg.click('[data-testid=gallery-menu-shape-square]');
  await done();

  // MG9, MG7: a kind chosen shows only its tiles, in words on the bar.
  await menu();
  await pg.click('[data-testid=gallery-menu-show-voice]');
  await done();
  await pg.waitForTimeout(600);
  tiles = await tilesNow();
  const only = (await has('[data-testid=gallery-only]')) ? await pg.locator('[data-testid=gallery-only]').innerText() : '';
  await shot(pg, '99-gallery-memos');
  check(only === 'Memos only' && tiles.length === 1 && tiles[0].kind === 'voice', `MG9: Memos only shows the memo alone (${only}; ${tiles.map((t) => t.kind).join(',')})`);
  check(!tally(await words()), 'MG7: no count with a kind chosen');

  // MG13: a delete from the viewer leaves at once; Undo brings it back.
  await pg.locator('[data-testid=gallery-tile][data-piece=memo]').click();
  await pg.waitForSelector('[data-testid=viewer-more]', { timeout: 10000 });
  await pg.waitForTimeout(800);
  await pg.click('[data-testid=viewer-more]');
  await pg.click('[data-testid=viewer-delete]');
  await pg.waitForTimeout(600);
  if (await has('[data-testid=viewer-close]')) await pg.click('[data-testid=viewer-close]');
  await pg.waitForTimeout(600);
  const gone = !(await has('[data-testid=gallery-tile][data-piece=memo]'));
  const emptyKind = (await has('[data-testid=gallery-empty]')) ? await pg.locator('[data-testid=gallery-empty]').innerText() : '';
  await pg.click('[data-testid=undo]').catch(() => {});
  const back = await there('[data-testid=gallery-tile][data-piece=memo]', 5000);
  check(gone && back, `MG13: a delete leaves the gallery at once and Undo brings it back (${gone}, ${back})`);
  check(emptyKind === 'No voice memos kept yet.', `MG10: a kind with nothing says so in words (${emptyKind})`);
  await pg.click('[data-testid=gallery-show-all]');
  await pg.waitForTimeout(500);

  // MG19: months, then a month opens its days; MG7 in Months and Years.
  await pg.click('[data-testid=gallery-zoom-months]');
  await pg.waitForSelector('[data-testid=gallery-block]', { timeout: 5000 });
  await pg.waitForTimeout(600);
  await shot(pg, '99-gallery-months');
  const blocks = await pg.locator('[data-testid=gallery-block-title]').allInnerTexts();
  const cutMonths = await cutIn();
  const monthsWords = await words();
  const lastYear = String(new Date().getFullYear() - 1);
  const oldBlock = pg.locator(`[data-testid=gallery-block]:has-text("${lastYear}")`).first();
  await oldBlock.scrollIntoViewIfNeeded().catch(() => {});
  await oldBlock.click();
  await pg.waitForSelector('[data-testid=gallery-day]', { timeout: 5000 });
  await pg.waitForTimeout(800);
  // The month's first day is in view after the jump: at the top, or as far as a short library scrolls (sticky
  // headers stack at the top on the web; the last one drawn is the one seen).
  const landed = await pg.evaluate(([top, key]) => {
    const list = document.querySelector('[data-testid=gallery-list]');
    const bottom = list.getBoundingClientRect().bottom;
    const hs = [...document.querySelectorAll('[data-testid=gallery-day]')].filter((e) => !e.closest('[aria-hidden=true]'));
    const h = hs.find((e) => e.dataset.day.startsWith(key));
    const r = h && h.getBoundingClientRect();
    return r ? { inView: r.top >= top - 2 && r.bottom <= bottom + 2, text: h.innerText } : { inView: false, text: '' };
  }, [listBox.y, lastYear]);
  const topDay = landed.inView ? landed.text : '';
  check(blocks.length >= 2 && topDay.includes(lastYear) && (await has('[data-testid=gallery-zoom-days][aria-selected=true]')), `MG19: months, and a month opens Days at its first day (${blocks.join(', ')}; ${topDay.replace(/\s+/g, ' ')})`);
  await pg.click('[data-testid=gallery-zoom-years]');
  await pg.waitForSelector('[data-testid=gallery-block]', { timeout: 5000 });
  await pg.waitForTimeout(500);
  await shot(pg, '99-gallery-years');
  const cutYears = await cutIn();
  check(cutMonths.length === 0 && cutYears.length === 0 && blocks.length > 0, `fix gallery-header audit 1: no month or year block text is cut (${[...cutMonths, ...cutYears].join('; ') || 'none'})`);
  check(!tally(monthsWords) && !tally(await words()), 'MG7: no count in Months or Years');

  // MG1: leaving Chronicle and coming back is Memories again; Media is All Items and Days again (MG9, MG19).
  await tabTo(pg, 'explore');
  await pg.waitForTimeout(500);
  await pg.click('[data-testid=tab-chronicle]');
  await pg.waitForTimeout(800);
  const onMemories = await has('[data-testid=section-memories][aria-selected=true]');
  await pg.click('[data-testid=section-media]');
  await pg.waitForTimeout(800);
  check(onMemories && (await has('[data-testid=gallery-zoom-days][aria-selected=true]')), 'MG1: Media resets to Memories on a new open of Chronicle, and Media opens on Days');
  await c.close();
}

module.exports = {
  name: 'gallery',
  covers: ['src/components/gallery/**', 'src/lib/gallery/**', 'src/components/chronicle/SectionBar.tsx'],
  run,
};
