// Response thread (RT1-RT12, decision 0131): a moment's responses in a sheet over the viewer. Seeded straight into
// IndexedDB. E2E_ONLY=responses runs it alone. RT4, RT9, RT13 and RT14 are unit tests (threads/responses.test.ts).

const SEED = () => {
  const DAY = 86400000;
  const now = Date.now();
  const note = (id, t, body) => ({ id, walk_id: null, t, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });
  const caps = [
    note('m', now - 3 * DAY, 'The fig tree on Hope Street is fruiting.'),
    note('r1', now - 2 * DAY, 'Went back, the figs were gone.'),
    note('r2', now - 1 * DAY, 'Someone had picked them all, I think.'),
    note('z', now - 4 * DAY, 'A quiet lane with no answer yet.'),
  ];
  const links = [{ from_id: 'r1', to_id: 'm', created_at: now - 2 * DAY }, { from_id: 'r2', to_id: 'r1', created_at: now - DAY }];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['moment', 'thread', 'thread_member', 'moment_link'], 'readwrite');
      for (const c of caps) tx.objectStore('moment').put({ id: c.id, walk_id: null, t: c.t, lat: null, lon: null, segment_id: null, piece_ids: [c.id], pieces: [{ id: c.id, moment_id: c.id, t: c.t, kind: c.kind, file_path: null, body: c.body }] });
      // A moment of two notes (a stack, MS10): a swipe across steps its pieces.
      tx.objectStore('moment').put({ id: 'st', walk_id: null, t: now - 5 * DAY, lat: null, lon: null, segment_id: null, piece_ids: ['st', 'st2'], pieces: [{ id: 'st', moment_id: 'st', t: now - 5 * DAY, kind: 'text', file_path: null, body: 'Two notes in one moment, the first.' }, { id: 'st2', moment_id: 'st', t: now - 5 * DAY + 1000, kind: 'text', file_path: null, body: 'And the second.' }] });
      tx.objectStore('thread').put({ id: 'fig', name: null, created_at: now - 2 * DAY });
      for (const id of ['m', 'r1', 'r2']) tx.objectStore('thread_member').put({ thread_id: 'fig', moment_id: id, added_at: now - 2 * DAY });
      for (const l of links) tx.objectStore('moment_link').put(l);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

const stored = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const tx = req.result.transaction(['thread', 'thread_member', 'moment_link', 'moment'], 'readonly');
    const all = (n) => new Promise((r) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => r(g.result); });
    Promise.all([all('thread'), all('thread_member'), all('moment_link'), all('moment')]).then(([threads, members, links, moments]) => resolve({ threads, members, links, moments }));
  };
}));

async function run(h) {
  const { url, check, shot, tabTo, freshPage } = h;
  const { c, pg } = await freshPage('responses', { touch: true });
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=moment-card]', { timeout: 20000 });
  const vp = pg.viewportSize();
  const has = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const there = (sel, timeout = 8000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const gone = (sel, timeout = 8000) => pg.waitForSelector(sel, { state: 'detached', timeout }).then(() => true, () => false);
  const open = async (text) => {
    const card = pg.locator(`[data-testid=moment-card]:has-text("${text}")`).first();
    await card.scrollIntoViewIfNeeded();
    await card.locator('[data-testid=moment-open]').click();
    await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 });
    await pg.waitForTimeout(800);
  };
  const closeViewer = async () => {
    await pg.click('[data-testid=viewer-close]');
    await gone('[data-testid=capture-viewer]');
  };
  const words = async () => pg.locator('[data-testid=responses-sheet] [data-testid=response-words]').allInnerTexts();
  // A finger's pull through CDP touch events, as the repo drags sheets (a mouse drag on a moving element reads as a tap).
  const pull = async (x, y0, y1) => {
    const cdp = await c.newCDPSession(pg);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 10 }] });
      await pg.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await pg.waitForTimeout(700);
  };
  const before = JSON.stringify(await stored(pg));

  // RT1: the moment answered says so, in words, in its info line and in More; the one never answered says nothing.
  await open('The fig tree on Hope Street');
  const meta = await pg.locator('[data-testid=capture-meta]').first().innerText();
  const link = (await pg.locator('[data-testid=viewer-responses-link]').count()) ? await pg.locator('[data-testid=viewer-responses-link]').innerText() : '';
  await pg.click('[data-testid=viewer-more]');
  const inMore = await there('[data-testid=viewer-responses]', 3000);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(300);
  await shot(pg, '90-responses-viewer');
  // RT11: nothing interactive over the moment's card; the toolbar's controls on one row.
  const tools = await pg.locator('[data-testid=viewer-toolbar] [role=button]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  const card = await pg.locator('[data-testid=capture-card]').boundingBox();
  const over = await pg.evaluate(({ x, y, w, hgt }) => {
    const hits = [];
    for (const [fx, fy] of [[0.3, 0.3], [0.7, 0.3], [0.5, 0.5]]) {
      const el = document.elementFromPoint(x + w * fx, y + hgt * fy);
      const btn = el && el.closest('[role=button]');
      if (btn && !btn.closest('[data-testid=capture-card]')) hits.push(btn.getAttribute('data-testid'));
    }
    return hits;
  }, { x: card.x, y: card.y, w: card.width, hgt: card.height });
  check(link === 'a couple of responses' && meta.endsWith('a couple of responses') && /In a thread/.test(meta) && inMore,
    `RT1: More has Responses and the info line names them in words, last (${meta.replace(/\s+/g, ' ')})`);
  check(over.length === 0 && new Set(tools).size <= 1, `RT11: nothing interactive over the moment, one row of tools (${over.join(',')}; ${tools.join(',')})`);
  await closeViewer();
  await open('A quiet lane');
  const zMeta = await pg.locator('[data-testid=capture-meta]').first().innerText();
  await pg.click('[data-testid=viewer-more]');
  const zMore = await there('[data-testid=viewer-responses]', 1500);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(300);
  // RT2: a swipe up on a moment with none does nothing.
  const zCard = await pg.locator('[data-testid=capture-card]').boundingBox();
  await pull(zCard.x + zCard.width / 2, zCard.y + zCard.height / 2, zCard.y + zCard.height / 2 - 200);
  const zSheet = await has('[data-testid=responses-sheet]');
  check(!zMore && !/response/.test(zMeta) && (await pg.locator('[data-testid=viewer-responses-link]').count()) === 0, `RT1: a moment never answered has no Responses (${zMeta})`);
  await closeViewer();

  // RT2, RT3: a swipe up opens the sheet, inside the viewer, at half.
  await open('The fig tree on Hope Street');
  const mCard = await pg.locator('[data-testid=capture-card]').boundingBox();
  await pull(mCard.x + mCard.width / 2, mCard.y + mCard.height / 2, mCard.y + mCard.height / 2 - 200);
  const swiped = await there('[data-testid=responses-sheet]', 3000);
  check(swiped && !zSheet, 'RT2: a swipe up opens the sheet on a moment with responses and does nothing on one without');
  await shot(pg, '91-responses-half');
  const dialogs = await pg.evaluate(() => document.querySelectorAll('[aria-modal=true]').length);
  const half = await pg.locator('[data-testid=responses-sheet]').boundingBox();
  const grip = await pg.locator('[data-testid=responses-grip]').boundingBox();
  await pull(grip.x + grip.width / 2, grip.y + 10, 60);
  const full = await pg.locator('[data-testid=responses-sheet]').boundingBox();
  await shot(pg, '92-responses-full');
  await pg.keyboard.press('Escape');
  const escClosed = await gone('[data-testid=responses-sheet]', 3000);
  const viewerStays = await has('[data-testid=capture-viewer]');
  await pg.click('[data-testid=viewer-responses-link]');
  await there('[data-testid=responses-sheet]');
  await pg.click('[data-testid=responses-close]');
  const closeClosed = await gone('[data-testid=responses-sheet]', 3000);
  await pg.click('[data-testid=viewer-more]');
  await pg.click('[data-testid=viewer-responses]');
  await there('[data-testid=responses-sheet]');
  await pg.waitForTimeout(700);
  const grip2 = await pg.locator('[data-testid=responses-grip]').boundingBox();
  await pull(grip2.x + grip2.width / 2, grip2.y + 10, vp.height - 20);
  const dragClosed = await gone('[data-testid=responses-sheet]', 3000);
  check(dialogs === 1 && half && Math.abs(half.height - (vp.height - 60) / 2) < vp.height * 0.12 && full && full.height > half.height * 1.5 && escClosed && viewerStays && closeClosed && dragClosed,
    `RT3: one dialog; opens at half (${half && Math.round(half.height)}), drags to full (${full && Math.round(full.height)}), closes with Escape, Close and a drag down, the viewer left as it was`);

  // RT5, RT10: the entries, oldest first, each with its time, place and walk in words; plain ink, one alignment.
  await pg.click('[data-testid=viewer-responses-link]');
  await there('[data-testid=responses-sheet]');
  await pg.waitForTimeout(700);
  const lines = await pg.locator('[data-testid=responses-sheet] [data-testid=response-line]').allInnerTexts();
  const said = await words();
  const answering = await pg.locator('[data-testid=responses-sheet] [data-testid=response-answering]').allInnerTexts();
  check(said.length === 3 && /fig tree/.test(said[0]) && /figs were gone/.test(said[1]) && /picked them/.test(said[2]) && answering.length === 1
    && lines.every((l) => /\d{1,2}:\d{2}/.test(l) && /No place kept/.test(l) && /not on a walk/.test(l)),
    `RT5: every entry shows its date and time, its place in words and its walk line, and its words (${lines[1]})`);
  const looks = await pg.locator('[data-testid=responses-sheet] [data-testid=response-entry], [data-testid=responses-sheet] [data-testid=response-first]').evaluateAll((els) => els.map((e) => {
    const w = e.querySelector('[data-testid=response-words]');
    return `${Math.round(e.getBoundingClientRect().left)}|${w ? getComputedStyle(w).color : ''}|${getComputedStyle(e).backgroundColor}`;
  }));
  const sheetText = await pg.locator('[data-testid=responses-sheet]').innerText();
  const noDigits = sheetText.split('\n').filter((l) => !/\d{1,2}:\d{2}|[A-Z][a-z]{2} \d{1,2}/.test(l)).every((l) => !/\d/.test(l));
  check(new Set(looks).size === 1 && noDigits && !/unread|new|seen|delivered/i.test(sheetText) && (await pg.locator('[data-testid=responses-sheet] [data-testid=thread-mark]').count()) === 0,
    `RT10: plain ink, one alignment, no marks and no digit but dates and times (${[...new Set(looks)].join(' / ')})`);

  // RT6: a response opens alone; Back returns to the sheet.
  await pg.locator('[data-testid=responses-sheet] [data-testid=response-entry]:has-text("figs were gone")').click();
  await pg.waitForTimeout(800);
  const opened = (await pg.locator('[data-testid=capture-card]').last().innerText()).includes('figs were gone');
  const sheetHidden = !(await has('[data-testid=responses-sheet]'));
  const back = await pg.locator('[data-testid=viewer-close]').getAttribute('aria-label');
  await pg.click('[data-testid=viewer-close]');
  const backOnSheet = await there('[data-testid=responses-sheet]', 3000);
  check(opened && sheetHidden && back === 'Back to the responses' && backOnSheet, `RT6: an entry opens alone in the viewer, and Back (${back}) returns to the sheet`);
  check(JSON.stringify(await stored(pg)) === before, 'RT12: opening, reading and closing the sheet wrote nothing');

  // RT7: a note kept from the sheet's Respond answers the sheet's moment and comes in at the end.
  await pg.click('[data-testid=viewer-respond]');
  await pg.waitForSelector('[data-testid=respond-sheet]');
  await pg.click('[data-testid=respond-note]');
  await pg.waitForSelector('[data-testid=note-input]');
  const sheetUnder = await has('[data-testid=responses-sheet]');
  const respondTypeRow = await pg.locator('[data-testid=note-reaction-tool]').count();
  await pg.fill('[data-testid=note-input]', 'A new tree two doors down.');
  await pg.click('[data-testid=note-done]');
  await pg.waitForTimeout(1500);
  const after = await words();
  const s1 = await stored(pg);
  const kept = s1.moments.find((x) => x.pieces?.[0]?.body === 'A new tree two doors down.');
  const linked = kept && s1.links.some((l) => l.from_id === kept.id && l.to_id === 'm');
  const toast = await pg.locator('[data-testid=viewer-pill]').count();
  await shot(pg, '93-responses-kept');
  check(respondTypeRow === 0 && !!kept, `RX13: a response's page offers no Reaction tool (${respondTypeRow})`);
  check(sheetUnder && linked && after.length === 4 && /two doors down/.test(after[3]) && toast === 0,
    `RT7: a note from the sheet's Respond answers its moment and arrives at the end, no pill (${after.length})`);

  // RT8: delete a response from its own viewer: it leaves the sheet at once; Undo brings it back.
  await pg.locator('[data-testid=responses-sheet] [data-testid=response-entry]:has-text("two doors down")').click();
  await pg.waitForTimeout(800);
  await pg.click('[data-testid=viewer-more]');
  await pg.click('[data-testid=viewer-delete]');
  await pg.waitForTimeout(800);
  const left = await words();
  await pg.click('[data-testid=undo]');
  await pg.waitForTimeout(1200);
  const back2 = await words();
  check(left.length === 3 && !left.some((w) => /two doors/.test(w)) && back2.length === 4, `RT8: a deleted response leaves the sheet at once (${left.length}) and Undo brings it back (${back2.length})`);
  await pg.click('[data-testid=responses-close]');
  await closeViewer();

  // RT2: a swipe across still steps a stack's pieces (the swipe up shares its touch, MS10).
  await open('Two notes in one moment');
  const piece = () => pg.locator('[data-testid=piece-shown]').getAttribute('data-piece');
  const p0 = await piece();
  const sCard = await pg.locator('[data-testid=capture-card]').boundingBox();
  const cdp = await c.newCDPSession(pg);
  const y = sCard.y + sCard.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sCard.x + sCard.width * 0.8, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sCard.x + sCard.width * (0.8 - 0.6 * i / 8), y }] });
    await pg.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await pg.waitForTimeout(600);
  const p1 = await piece();
  check(p0 === 'st' && p1 === 'st2' && !(await has('[data-testid=responses-sheet]')), `RT2: a swipe across still steps a stack's pieces (${p0} -> ${p1})`);
  await closeViewer();

  // RT11: on a 320 px phone, with In a thread shown, the info line takes two lines at most, its responses' words last.
  await pg.setViewportSize({ width: 320, height: 640 });
  await open('The fig tree on Hope Street');
  const box = await pg.locator('[data-testid=capture-meta]').first().evaluate((e) => ({ h: e.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.2 }));
  const toolsNarrow = await pg.locator('[data-testid=viewer-toolbar] [role=button]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  await shot(pg, '94-responses-320');
  check(Math.round(box.h / box.lh) <= 2 && new Set(toolsNarrow).size <= 1, `RT11: at 320 px the info line keeps to two lines (${Math.round(box.h)}/${Math.round(box.lh)}) and the toolbar to one row`);
  await closeViewer();
  await c.close();
}

module.exports = {
  name: 'responses',
  covers: [
    'src/components/threads/{ResponsesSheet,ResponseEntry}.tsx',
    'src/components/threads/useMomentPool.ts',
    'src/components/CaptureView.tsx',
    'src/lib/threads/{responses,lines}.ts',
  ],
  run,
};
