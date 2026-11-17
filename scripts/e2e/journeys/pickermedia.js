// Picker media (MP1-MP19): the gallery's grid inside the two moment pickers, Add to a thread's "A new thread" and Mention
// a moment. Seeded straight into IndexedDB. E2E_ONLY=pickermedia runs it alone. MP4, MP6, MP8, MP9, MP14, MP16 are unit
// tests too (src/lib/__tests__/threads/pickerMedia.test.ts).

const SEED = (onlyNotes) => {
  const today = new Date();
  const at = (daysAgo, h, m = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, h, m).getTime();
  const piece = (id, mid, t, kind, o = {}) => ({ id, moment_id: mid, t, kind, file_path: kind === 'photo' ? 'p-photo' : kind === 'text' ? null : 'p-media', body: kind === 'text' ? 'A note with words' : kind === 'photo' ? null : '42000', caption: null, caption_y: null, thumb_path: null, edit: null, ...o });
  const moment = (id, walk_id, pieces) => ({ id, walk_id, t: pieces[0].t, lat: null, lon: null, segment_id: null, piece_ids: pieces.map((p) => p.id), pieces });
  const walk = { id: 'w-alfama', started_at: at(1, 8), ended_at: at(1, 10), title: null, epilogue: null, open: false, area: 'Alfama', snapped_build: null };
  const moments = [
    moment('anchor', null, [piece('anchor', 'anchor', at(1, 22), 'text', { body: 'The anchor note I connect from' })]),
    moment('stack', 'w-alfama', [
      piece('stack', 'stack', at(1, 9), 'photo', { caption: 'The harbor at dusk', thumb_path: 'p-thumb' }),
      piece('stack.1', 'stack', at(1, 9, 1), 'photo'),
    ]),
    // Yesterday, never today: before 8 am today's times are still to come.
    moment('memo', null, [piece('memo', 'memo', at(1, 7), 'voice')]),
    moment('vid', null, [piece('vid', 'vid', at(2, 15), 'video', { body: '12000' })]),
    moment('mentions', null, [piece('mentions', 'mentions', at(1, 20), 'text', { body: 'Like the @[vid|a video] again' })]),
    moment('mentions2', null, [piece('mentions2', 'mentions2', at(1, 21), 'text', { body: 'And the @[vid|a video] once more' })]),
    ...Array.from({ length: 24 }, (_, i) => moment(`many${i}`, null, [piece(`many${i}`, `many${i}`, at(3, 9, i), 'photo')])),
    moment('old', null, [piece('old', 'old', new Date(today.getFullYear() - 1, 5, 2, 10).getTime(), 'photo')]),
  ];
  if (onlyNotes) moments.splice(0, moments.length, ...moments.filter((m) => m.pieces.every((p) => p.kind === 'text')));
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
      for (const m of moments) tx.objectStore('moment').put(m);
      tx.objectStore('media').put({ key: 'p-photo', blob: photo });
      tx.objectStore('media').put({ key: 'p-thumb', blob: thumb });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  }));
};

const writes = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const tx = req.result.transaction(['meta', 'thread', 'thread_member', 'moment_link'], 'readonly');
    const all = (n) => new Promise((r) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => r(g.result); });
    Promise.all([all('meta'), all('thread'), all('thread_member'), all('moment_link')]).then(([meta, threads, members, links]) => resolve({ meta, threads, members, links }));
  };
}));

async function run(h) {
  const { url, check, shot, tabTo, freshPage, toJournal } = h;
  let { c, pg } = await freshPage('pickermedia', { touch: true });
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  const vis = (sel) => pg.locator(sel).filter({ visible: true });
  const has = async (sel) => (await vis(sel).count()) > 0;
  const there = (sel, timeout = 8000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const gone = (sel) => pg.waitForSelector(sel, { state: 'detached', timeout: 8000 }).then(() => true, () => false);
  const P = '[data-testid=picker-media]';
  const openAnchor = async () => {
    await toJournal(pg);
    await pg.locator('[data-testid=moment-card]:has-text("The anchor note")').first().scrollIntoViewIfNeeded();
    await pg.locator('[data-testid=moment-card]:has-text("The anchor note") [data-testid=moment-open]').first().click({ position: { x: 12, y: 12 } });
    await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 });
  };
  const openJoin = async () => {
    await pg.click('[data-testid=viewer-more]');
    await pg.click('[data-testid=viewer-add-thread]');
    await pg.waitForSelector('[data-testid=add-to-thread]');
    await pg.click('[data-testid=add-new-thread]');
  };
  const tiles = () => pg.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-testid=gallery-tile]`)].filter((e) => !e.closest('[aria-hidden=true]')).map((e) => ({ piece: e.dataset.piece, kind: e.dataset.kind, moment: e.dataset.moment, ref: e.dataset.ref, label: e.getAttribute('aria-label'), text: e.innerText.replace(/[-]/g, '').trim(), selected: e.getAttribute('aria-selected') === 'true', w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })), P);
  const words = () => pg.evaluate((sel) => {
    const root = document.querySelector(sel)?.closest('[data-testid=add-to-thread], [data-testid=moment-picker]');
    if (!root) return '';
    const out = [root.innerText];
    for (const n of root.querySelectorAll('[aria-label]')) out.push(n.getAttribute('aria-label'));
    return out.join('\n');
  }, P);
  const countFree = (text) => {
    const rest = text.replace(/\b\d{1,2}:\d{2}(:\d{2})?(\s?[AP]M)?/gi, '').replace(/\b(19|20)\d{2}\b/g, '').replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}\b/g, '');
    return !/\d/.test(rest) && !/ of \d/.test(text);
  };

  // MP1, MP3: Add to a thread, A new thread: List and Media directly under the title, List first with its search.
  await openAnchor();
  await openJoin();
  const tabsBox = await pg.locator('[data-testid=add-to-thread] [data-testid=picker-tabs]').boundingBox().catch(() => null);
  const titleBox = await pg.locator('[data-testid=add-to-thread] [role=heading]').first().boundingBox().catch(() => null);
  const tabWords = await pg.locator('[data-testid=add-to-thread] [data-testid=picker-tabs] [role=tab]').allInnerTexts().catch(() => []);
  check(tabWords.join('|') === 'List|Media' && tabsBox && titleBox && tabsBox.y >= titleBox.y + titleBox.height - 2 && tabsBox.y - (titleBox.y + titleBox.height) < 60 && (await has('[data-testid=add-search]')),
    'MP1, MP3: Join it with another moment opens on List with its search, and List and Media sit directly under the title, in words');
  await shot(pg, '110-picker-list');
  await vis('[data-testid=picker-tab-media]').first().click().catch(() => {});
  const mediaUp = await there(P, 5000);
  await pg.waitForTimeout(1200);
  await shot(pg, '111-picker-media');
  let ts = await tiles();
  check(mediaUp && !(await has('[data-testid=add-search]')) && ts.length >= 5 && !ts.some((t) => t.kind === 'text') && !ts.some((t) => t.moment === 'anchor'),
    'MP3, MP4: Media drops the search and shows a tile for every photo, video and memo but the moment in hand, and no note');

  // MP5, MP7, MP11, MP14: bare tiles, headers with where, no counts, small copies, tabs.
  const pageText = await pg.locator(P).innerText().catch(() => '');
  const copy = ts.find((t) => t.piece === 'stack');
  check(ts.length > 0 && ts.every((t) => t.text === '' || /^\d+:\d{2}$/.test(t.text)) && !/The harbor at dusk/.test(pageText) && (await has(`${P} [data-testid=gallery-day-title]`)) && (await has(`${P} [data-testid=gallery-day-line]`)) && copy && copy.ref === 'p-thumb',
    'MP5, MP14: tiles are bare, each day has a header saying where, and a photo loads its small copy');
  check(ts.length > 0 && countFree(await words()), 'MP7: no count in any visible text or accessibility name');
  const tabRoles = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=add-to-thread] [data-testid=picker-tabs] [role=tab]')].map((e) => e.getAttribute('aria-selected')));
  check(tabRoles.join() === 'false,true' && ts.every((t) => /^(Photo|Video|Voice memo), /.test(t.label ?? '')), 'MP11: the switch is tabs with Media selected, and a tile is spoken by its kind');

  // MP6: a kind row.
  await vis('[data-testid=picker-kind-video]').first().click().catch(() => {});
  await pg.waitForTimeout(500);
  const vids = await tiles();
  check(vids.length === 1 && vids[0].kind === 'video' && (await has('[data-testid=picker-only]')) && /Videos only/.test(await pg.locator('[data-testid=picker-only]').innerText().catch(() => '')),
    'MP6: Videos shows only videos and says "Videos only"');
  await vis('[data-testid=picker-kind-all]').first().click().catch(() => {});
  await pg.waitForTimeout(500);

  // MP9: a tap marks the moment, the bar names it, nothing is written until Connect.
  const before = await writes(pg);
  await vis(`${P} [data-testid=gallery-tile][data-piece=stack]`).first().click().catch(() => {});
  await pg.waitForTimeout(400);
  const marked = await tiles();
  const bar = await pg.locator('[data-testid=picker-bar]').innerText().catch(() => '');
  const after = await writes(pg);
  check(marked.filter((t) => t.selected).map((t) => t.piece).sort().join() === 'stack,stack.1' && /The harbor at dusk/.test(bar) && /Alfama/.test(bar) && /\d{1,2}:\d{2}/.test(bar) && (await has('[data-testid=picker-action]'))
    && (await pg.locator('[data-testid=picker-action]').innerText().catch(() => '')) === 'Connect' && JSON.stringify(before.threads) === JSON.stringify(after.threads) && after.members.length === 0,
    'MP9: a tap marks every tile of its moment, the bar names its words, place, time and walk, and nothing is connected yet');
  await shot(pg, '112-picker-marked');

  // MP15, MP16-MP19: view controls, local.
  const metaBefore = JSON.stringify((await writes(pg)).meta);
  await vis('[data-testid=picker-zoom-months]').first().click().catch(() => {});
  await pg.waitForTimeout(500);
  const blocks = await pg.locator(`${P} [data-testid=gallery-block]`).count().catch(() => 0);
  check(blocks >= 2 && (await pg.locator(`${P} [data-testid=gallery-tile]`).count()) === 0, 'MP16: Months shows a block per month, and no tile to pick');
  await vis('[data-testid=picker-zoom-days]').first().click().catch(() => {});
  await pg.waitForTimeout(500);
  const wide = (await tiles())[0]?.w ?? 0;
  await vis('[data-testid=picker-view-menu]').first().click().catch(() => {});
  const menuUp = await there('[data-testid=picker-menu]', 4000);
  const dialogs = await pg.locator('[role=dialog], [aria-modal=true]').count();
  await pg.click('[data-testid=picker-menu-zoom-out]').catch(() => {});
  await pg.click('[data-testid=picker-menu-order-oldest]').catch(() => {});
  await pg.waitForTimeout(500);
  await shot(pg, '113-picker-menu');
  await pg.click('[data-testid=picker-menu-done]').catch(() => {});
  await pg.waitForTimeout(400);
  const small = (await tiles())[0]?.w ?? 99999;
  const firstDay = await pg.locator(`${P} [data-testid=gallery-day-title]`).first().innerText().catch(() => '');
  check(menuUp && small < wide && dialogs <= 2 && /^\w+, \w+ \d+, \d{4}$|^\w+, \w+ \d+$/.test(firstDay), `MP17: the View menu opens inside the card, Zoom Out makes smaller tiles, Oldest First starts at the oldest day (${firstDay})`);
  check(JSON.stringify((await writes(pg)).meta) === metaBefore, 'MP15: using the menu and the zoom writes nothing to the device');
  const cdp = await c.newCDPSession(pg);
  const box = await pg.locator('[data-testid=picker-list]').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const touch = (type, d) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }] });
  await touch('touchStart', 40);
  for (const d of [50, 60, 70, 80]) await touch('touchMove', d);
  await touch('touchEnd', 0);
  await pg.waitForTimeout(700);
  const pinched = (await tiles())[0]?.w ?? 0;
  check(pinched > small * 1.3 && (await tiles()).every((t) => t.w >= 44), `MP18: a pinch out shows fewer, larger tiles, none under 44 px (${Math.round(small)} -> ${Math.round(pinched)})`);

  // MP13, MP19: one dialog, targets, 320 px.
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(500);
  const fit = await pg.evaluate(() => {
    const rows = (sel) => [...document.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), h: r.height, right: r.right, cut: e.scrollWidth > e.clientWidth + 1 }; });
    return { tabs: rows('[data-testid=picker-tabs] [role=tab]'), zoom: rows('[data-testid=picker-zoom] [role=tab]'), kind: rows('[data-testid=picker-kind] [role=tab]'), menu: rows('[data-testid=picker-view-menu]') };
  });
  const oneRow = (a) => a.length > 0 && new Set(a.map((x) => x.top)).size === 1 && a.every((x) => x.h >= 44 && x.right <= 320 && !x.cut);
  check(oneRow(fit.tabs) && oneRow(fit.zoom) && oneRow(fit.kind) && fit.menu.every((x) => x.h >= 44), `MP13, MP19: at 320 px the switch, the zoom bar and the kind row are each one row, 44 px or more (${JSON.stringify(fit)})`);
  await shot(pg, '114-picker-320');
  await pg.setViewportSize({ width: 390, height: 844 });

  // MP10: Connect makes the thread.
  await vis(`${P} [data-testid=gallery-tile][data-piece=stack]`).first().click().catch(() => {});
  await pg.click('[data-testid=picker-action]').catch(() => {});
  await gone('[data-testid=add-to-thread]');
  const done = await writes(pg);
  check(done.threads.length === 1 && done.members.map((m) => m.moment_id).sort().join() === 'anchor,stack', 'MP10: Connect makes the thread of the two moments, as a row does');
  await pg.click('[data-testid=undo-dismiss]').catch(() => {});
  await pg.click('[data-testid=viewer-close]').catch(() => {});

  // MP8: closing writes nothing, and (MP2) Mention a moment has the same switch.
  await openAnchor();
  await pg.click('[data-testid=viewer-respond]');
  await pg.click('[data-testid=respond-note]');
  await pg.waitForSelector('[data-testid=note-input]');
  await pg.click('[data-testid=note-input]');
  await pg.keyboard.type('See the ');
  await pg.keyboard.type('@');
  const mp = await there('[data-testid=moment-picker]', 5000);
  const mTabs = await pg.locator('[data-testid=moment-picker] [data-testid=picker-tabs] [role=tab]').allInnerTexts().catch(() => []);
  await vis('[data-testid=moment-picker] [data-testid=picker-tab-media]').first().click().catch(() => {});
  await pg.waitForTimeout(800);
  await vis('[data-testid=moment-picker] [data-testid=gallery-tile][data-piece=memo]').first().click().catch(() => {});
  const mAction = await pg.locator('[data-testid=picker-action]').innerText().catch(() => '');
  await shot(pg, '115-mention-media');
  await pg.click('[data-testid=picker-action]').catch(() => {});
  await gone('[data-testid=moment-picker]');
  const typed = (await pg.locator('[data-testid=note-input]').innerText().catch(() => '')).trim();
  check(mp && mTabs.join('|') === 'List|Media' && mAction === 'Mention' && /^See the @\S/.test(typed) && !typed.includes('@['),
    `MP2, MP10: Mention a moment has the same switch and grid, and Mention puts the reference in the note ("${typed}")`);
  await pg.click('[data-testid=note-done]').catch(() => {});
  await pg.click('[data-testid=viewer-close]').catch(() => {});

  // MP12: Notes that mention it has no switch and no grid (two notes mention the video, so it is a picker, not one note).
  await tabTo(pg, 'chronicle', 'memories');
  await pg.click('[data-testid=section-media]');
  await pg.waitForSelector('[data-testid=media-screen] [data-testid=gallery-tile]', { timeout: 15000 });
  await vis('[data-testid=media-screen] [data-testid=gallery-tile][data-piece=vid]').first().click().catch(() => {});
  await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 8000 }).catch(() => {});
  await pg.click('[data-testid=viewer-more]').catch(() => {});
  await pg.click('[data-testid=viewer-open-note]').catch(() => {});
  const listed = await there('[data-testid=moment-picker]', 4000);
  const rowsN = await pg.locator('[data-testid=moment-picker-row]').count();
  await shot(pg, '116-mentioned-by');
  check(listed && rowsN === 2 && !(await has('[data-testid=picker-tabs]')) && !(await has(P)), `MP12: Notes that mention it has no switch and no grid (${JSON.stringify({ listed, rowsN })})`);
  await pg.click('[data-testid=moment-picker-close]').catch(() => {});
  await pg.click('[data-testid=viewer-close]').catch(() => {});
  await c.close();

  // MP8: with nothing kept but the moment in hand (a fresh page, no media), one line in words.
  ({ c, pg } = await freshPage('pickermedia-empty', { touch: true }));
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED, true);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await openAnchor();
  await openJoin();
  await vis('[data-testid=picker-tab-media]').first().click().catch(() => {});
  await there('[data-testid=picker-empty]', 5000);
  const emptyLine = await pg.locator('[data-testid=picker-empty]').innerText().catch(() => '');
  await vis('[data-testid=picker-kind-video]').first().click().catch(() => {});
  const kindLine = await pg.locator('[data-testid=picker-empty]').innerText().catch(() => '');
  check(emptyLine === 'Photos, videos and voice memos you keep show here.' && kindLine === 'No videos kept yet.', `MP8: with nothing kept, Media is one line in words, and a kind with none its own (${emptyLine} / ${kindLine})`);
  await c.close();
}

module.exports = {
  name: 'pickermedia',
  covers: [
    'src/components/threads/{PickerMedia,MomentPicker,AddToThread}.tsx',
    'src/components/threads/useMomentPool.ts',
    'src/components/gallery/{GalleryTile,GalleryBar,ViewMenu}.tsx',
    'src/lib/threads/pickerMedia.ts',
  ],
  run,
};
