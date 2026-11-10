// Moment stacks, round 1 (MS1-MS15, decision 0106): the Add to this moment pill on Navigate's ready screen, one
// moment everywhere, the viewer's pieces, deleting a piece. In a fresh browser with nothing kept. E2E_ONLY=stacks.

const path = require('path');

// Every moment record, as stored (the moment store holds each moment's pieces inside it).
const moments = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
    g.onsuccess = () => resolve(g.result.sort((a, b) => a.t - b.t));
  };
}));

async function run(h) {
  const { navUrl, check, shot, tabTo, freshPage, scriptsDir } = h;
  let geoAfter = 0;
  const fixtures = path.join(scriptsDir, 'fixtures');
  const { c, pg } = await freshPage('stacks');
  // Location reads, counted, so adding a piece is seen to take no fix (MS3, 0036).
  await c.addInitScript(() => {
    window.__geo = 0;
    const g = navigator.geolocation;
    const get = g.getCurrentPosition.bind(g);
    const watch = g.watchPosition.bind(g);
    g.getCurrentPosition = (...a) => { window.__geo++; return get(...a); };
    g.watchPosition = (...a) => { window.__geo++; return watch(...a); };
  });
  const there = (sel, timeout = 8000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const gone = (sel, timeout = 8000) => pg.waitForSelector(sel, { state: 'detached', timeout }).then(() => true, () => false);
  const note = async (open, words) => {
    await pg.click(open);
    await pg.fill('[data-testid=moment-note-input]', words);
    await pg.click('[data-testid=moment-note-save]');
    await pg.waitForTimeout(900);
  };

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=ready-bar]', { timeout: 30000 });
  await pg.waitForTimeout(1500);

  // A photo from the edge stack: one tap, a new moment, and the pill offers to add to it (MS1, MS2).
  const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
  await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
  const pill = await there('[data-testid=add-to-moment]');
  const names = pill ? await pg.$$eval('[data-testid=add-to-moment] [role=button]', (bs) => bs.map((b) => b.getAttribute('aria-label'))) : [];
  const ms2ok = pill && ['Add a photo to this moment', 'Add a voice memo to this moment', 'Add a note to this moment'].every((n) => names.includes(n));
  check(ms2ok, `MS2: after a capture, the pill offers camera, mic and note, each one tap, with spoken names (${names.join(', ')})`);
  const colour = pill ? await pg.$eval('[data-testid=add-to-moment]', (e) => getComputedStyle(e).color) : '';
  const label1 = pill ? await pg.$eval('[data-testid=add-to-moment]', (e) => e.innerText) : '';
  await shot(pg, '95-stacks-pill');

  // A note added from the pill joins the photo's moment, with its own time, and takes no fix (MS3).
  const geoBefore = await pg.evaluate(() => window.__geo);
  if (pill) await note('[data-testid=add-note]', 'Its painted back');
  let ms = await moments(pg);
  geoAfter = await pg.evaluate(() => window.__geo);
  const ms3ok = ms.length === 1 && ms[0].pieces.length === 2 && ms[0].pieces[1].t > ms[0].pieces[0].t && ms[0].pieces[1].kind === 'text';
  check(ms3ok, `MS3: the note joined the photo's moment as a second piece with its own time (${ms.map((m) => m.pieces.length).join(',')})`);
  check(geoAfter === geoBefore, `MS3: adding a piece read no location (${geoBefore} → ${geoAfter})`);
  const label2 = (await there('[data-testid=add-to-moment]', 3000)) ? await pg.$eval('[data-testid=add-to-moment]', (e) => e.innerText) : null;
  check(label2 === label1 && !/\d/.test(label1) && colour !== '', `MS6: the pill reads the same after a second piece, with no number (${JSON.stringify([label1, label2])})`);
  // A third piece, a photo, from the pill's camera.
  if (await there('[data-testid=add-photo]', 3000)) {
    const [ch2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=add-photo]')]);
    await ch2.setFiles(path.join(fixtures, 'photo.jpg'));
    await pg.waitForTimeout(1200);
  }

  // The edge stack still makes a new moment in one tap, and the pill moves to it (MS1, MS5).
  await note('[data-testid=moment-note]', 'A different thing entirely');
  ms = await moments(pg);
  check(ms.length === 2 && ms[0].pieces.length === 3 && ms[1].pieces.length === 1, `MS1, MS5: an edge tap made a new moment (${ms.map((m) => m.pieces.length).join(',')})`);
  // Dismissed, it goes and the next capture is a new moment (MS4).
  if (await there('[data-testid=add-dismiss]', 3000)) await pg.click('[data-testid=add-dismiss]');
  check(await gone('[data-testid=add-to-moment]', 3000), 'MS4: the pill goes when dismissed');

  // Chronicle: the stacked moment is one card, by its photo, with the quiet mark; no count anywhere (MS7, MS8, MS9).
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForTimeout(1500);
  const cards = await pg.locator('[data-testid=moment-card]').count();
  const marks = await pg.locator('[data-testid=stack-mark]').count();
  check(cards === 2 && marks === 1, `MS7, MS8: two moments, two cards, one marked as holding more (${cards} cards, ${marks} marks)`);
  const markLabel = marks ? await pg.locator('[data-testid=stack-mark]').first().getAttribute('aria-label') : null;
  check(markLabel === 'with more in this moment', `MS8: the mark is spoken in words (${markLabel})`);

  // The viewer, opened from a list of several: pieces in order by arrows and buttons, no position or total (MS9, MS10).
  await pg.locator('[data-testid=moment-card]:has([data-testid=stack-mark]) [data-testid=moment-open]').first().click();
  await there('[data-testid=viewer-close]');
  const seen = [];
  const texts = [];
  for (let i = 0; i < 3; i++) {
    seen.push(await pg.locator('[data-testid=piece-shown]').getAttribute('data-kind').catch(() => null));
    texts.push(await pg.locator('[data-testid=capture-viewer]').innerText().catch(() => ''));
    await pg.keyboard.press('ArrowRight');
    await pg.waitForTimeout(400);
  }
  check(JSON.stringify(seen) === JSON.stringify(['photo', 'text', 'photo']), `MS10: the arrow keys step through the pieces in capture order (${seen.join(', ')})`);
  const labels = await pg.$$eval('[data-testid=capture-viewer] [aria-label]', (es) => es.map((e) => e.getAttribute('aria-label')));
  const ms10ok = labels.includes('Next in this moment') && labels.includes('Previous in this moment') && !labels.some((l) => /piece/i.test(l ?? ''));
  check(ms10ok, `MS10: the piece buttons are spoken "in this moment", and "piece" is never said (${labels.filter((l) => /moment/i.test(l ?? '')).join(', ')})`);
  const ms9ok = texts.every((t) => !/\d+\s*of\s*\d+|\+\d/.test(t)) && labels.every((l) => !/\d+\s*of\s*\d+|\+\d/.test(l ?? ''));
  check(ms9ok, 'MS9: no position or total of a moment\'s pieces, in text or spoken labels');

  // What acts on the piece and what on the moment (MS11): an edit lands on the piece shown; a reminder on the moment.
  // Back to the first piece, the photo.
  await pg.keyboard.press('ArrowLeft');
  await pg.keyboard.press('ArrowLeft');
  await pg.waitForTimeout(400);
  const onPhoto = await pg.locator('[data-testid=piece-shown]').getAttribute('data-kind').catch(() => null);
  const edit = await pg.locator('[data-testid=capture-viewer] [aria-label="Edit"]').count();
  const remind = await pg.locator('[data-testid=capture-viewer] [data-testid=viewer-remind]').count();
  check(onPhoto === 'photo' && edit === 1 && remind === 1, `MS11: on the photo, Edit (the piece) and Remind me here (the moment) are both offered (${onPhoto}, edit ${edit}, remind ${remind})`);
  // On the note, Edit (a photo's) goes and Remind me here (the moment's) stays.
  await pg.keyboard.press('ArrowRight');
  await pg.waitForTimeout(400);
  check((await pg.locator('[data-testid=capture-viewer] [aria-label="Edit"]').count()) === 0
    && (await pg.locator('[data-testid=capture-viewer] [data-testid=viewer-remind]').count()) === 1, 'MS11: on the note, the photo\'s Edit goes and the moment\'s reminder stays');

  // The viewer adds only while the pill is open; dismissed, it offers Respond (MS12).
  const ms12ok = (await pg.locator('[data-testid=viewer-add]').count()) === 0 && (await pg.locator('[data-testid=respond-note]').count()) > 0;
  check(ms12ok, 'MS12: with the pill closed, the viewer offers Respond, not Add to this moment');

  // Deleting one piece keeps the rest (MS13), with words that name it by kind; Undo window then stored.
  await pg.click('[data-testid=capture-viewer] [aria-label="More"]');
  const delPiece = await there('[data-testid=menu-delete-piece]', 3000);
  const pieceText = delPiece ? await pg.locator('[data-testid=menu-delete-piece]').innerText() : '';
  const momentText = (await pg.locator('[data-testid=menu-delete]').count()) ? await pg.locator('[data-testid=menu-delete]').innerText() : '';
  check(/Delete this (photo|note)/.test(pieceText) && /Delete this moment/.test(momentText), `MS13: More offers the piece by its kind and the moment (${pieceText} / ${momentText})`);
  if (delPiece) {
    await pg.click('[data-testid=menu-delete-piece]');
    if (await there('[data-testid=confirm-delete]', 3000)) await pg.click('[data-testid=confirm-delete]');
    await pg.waitForTimeout(6500);
  }
  ms = await moments(pg);
  check(ms.length === 2 && ms[0].pieces.length === 2, `MS13: after the Undo window, one piece is gone and the moment stays (${ms.map((m) => m.pieces.length).join(',')})`);

  // Kept across a reload (MS15).
  await pg.reload();
  await pg.waitForTimeout(2500);
  ms = await moments(pg);
  check(ms.length === 2 && ms[0].pieces.length === 2, `MS15: the stacked moment survives a reload (${ms.map((m) => m.pieces.length).join(',')})`);

  // ---- Round 2 (MS16-MS21).
  // Split out (MS16): the stacked moment's note leaves it, shown at once as its own moment, stored after the window.
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForTimeout(1500);
  await pg.locator('[data-testid=moment-card]:has([data-testid=stack-mark]) [data-testid=moment-open]').first().click().catch(() => {});
  await there('[data-testid=viewer-close]');
  await pg.keyboard.press('ArrowRight');
  await pg.waitForTimeout(400);
  await pg.click('[data-testid=capture-viewer] [aria-label="More"]').catch(() => {});
  const splitText = (await there('[data-testid=menu-split]', 3000)) ? await pg.locator('[data-testid=menu-split]').innerText() : '';
  check(/Split this (note|photo) out/.test(splitText), `MS16: More offers Split out by kind on a piece that is not the first (${splitText})`);
  if (splitText) await pg.click('[data-testid=menu-split]');
  const shownAtOnce = await there('[data-testid=undo-toast]', 3000);
  const nextMoment = await pg.locator('[data-testid=capture-viewer] [aria-label="Next moment"]').count();
  check(shownAtOnce && nextMoment > 0, 'MS16: the split piece shows at once as its own moment, one Next moment away, with Undo');
  await pg.waitForTimeout(6500);
  ms = await moments(pg);
  check(ms.length === 3 && ms.every((m) => m.pieces.length >= 1), `MS16: after the window it is stored as a moment of its own (${ms.map((m) => m.pieces.length).join(',')})`);
  if (await pg.locator('[data-testid=viewer-close]').count()) await pg.click('[data-testid=viewer-close]');

  // The setting (MS18), then grouping by itself (MS19, MS21).
  await tabTo(pg, 'navigate');
  await pg.waitForSelector('[data-testid=ready-bar]', { timeout: 15000 });
  await h.drawerTo(pg, 'up');
  const sw = await there('[data-testid=group-captures]', 5000);
  const swOn = sw ? await pg.locator('[data-testid=group-captures]').getAttribute('aria-checked') : null;
  const swNote = sw ? await pg.locator('[data-testid=start-settings]').innerText() : '';
  check(sw && swOn === 'false' && /Captures join the moment just made/.test(swNote), `MS18: Walk settings offer Group captures into one moment, off, with its line (${swOn})`);
  if (sw) await pg.click('[data-testid=group-captures]');
  await h.drawerTo(pg, 'peek');
  const before = (await moments(pg)).length;
  await note('[data-testid=moment-note]', 'Grouped one');
  const adding = await there('[data-testid=adding-moment]', 3000);
  const addingText = adding ? await pg.locator('[data-testid=adding-moment]').innerText() : '';
  check(adding && /Adding to this moment/.test(addingText) && (await pg.locator('[data-testid=add-to-moment]').count()) === 0, `MS19, MS21: with grouping on, "Adding to this moment" and New moment show, and no pill (${addingText.replace(/\n/g, ' ')})`);
  await note('[data-testid=moment-note]', 'Grouped two');
  await pg.waitForTimeout(10_000);
  const addingLater = adding ? await pg.locator('[data-testid=adding-moment]').innerText().catch(() => '') : '';
  ms = await moments(pg);
  check(ms.length === before + 1 && ms.at(-1).pieces.length === 2 && addingLater === addingText, `MS19: two edge notes made one moment, and the words did not change (${ms.length - before}, ${ms.at(-1)?.pieces.length})`);
  if (adding) await pg.click('[data-testid=new-moment]');
  await note('[data-testid=moment-note]', 'A new one');
  ms = await moments(pg);
  check(ms.length === before + 2, `MS19: after New moment the next capture is a new moment (${ms.length - before})`);

  // The replay (MS17): a walk with a stacked moment of three photos and a memo shows one grid.
  await c.close();
  await replayGrid(h, check);
}

/** A walk seeded with a stacked moment, stopped so its replay plays: one grid, a cell per photo, no count (MS17). */
async function replayGrid(h, check) {
  const { navUrl, BASE, start, at, freshPage } = h;
  const { c, pg } = await freshPage('stacks-replay');
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  // The walk is stored a moment after Start: wait for it.
  let walk = null;
  for (let k = 0; k < 30 && !walk; k++) {
    walk = await h.openWalk(pg);
    if (!walk) await pg.waitForTimeout(500);
  }
  if (!walk) {
    check(false, 'MS17: a walk to replay (none was open after Start)');
    await c.close();
    return;
  }
  const now = Date.now();
  const pts = Array.from({ length: 40 }, (_, i) => { const p = at(-1 + i * 0.05, -0.5); return { walk_id: walk.id, t: now - 600_000 + i * 15_000, lat: p[1], lon: p[0], accuracy_m: 5, speed: 1.2, course: null }; });
  const mid = pts[12];
  const piece = (id, t, kind, file_path, body) => ({ id, moment_id: 'grid-m', t, kind, file_path, body, caption: null, caption_y: null, thumb_path: null, edit: null });
  const moment = {
    id: 'grid-m', walk_id: walk.id, t: mid.t, lat: mid.lat, lon: mid.lon, segment_id: null, piece_ids: ['grid-m', 'grid-2', 'grid-3', 'grid-memo'],
    pieces: [piece('grid-m', mid.t, 'photo', 'g-photo', null), piece('grid-2', mid.t + 10_000, 'photo', 'g-photo', null), piece('grid-3', mid.t + 20_000, 'photo', 'g-photo', null), piece('grid-memo', mid.t + 30_000, 'voice', null, '2000')],
  };
  await pg.evaluate(([id, startedAt, pts, m]) => new Promise((resolve) => {
    const cv = document.createElement('canvas');
    cv.width = 120; cv.height = 120;
    cv.getContext('2d').fillRect(0, 0, 120, 120);
    cv.toBlob((blob) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['walk', 'trace_point', 'moment', 'media'], 'readwrite');
        const w = tx.objectStore('walk').get(id);
        w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
        for (const p of pts) tx.objectStore('trace_point').add(p);
        tx.objectStore('moment').put(m);
        tx.objectStore('media').put({ key: 'g-photo', blob });
        tx.oncomplete = () => resolve(true);
      };
    }, 'image/png');
  }), [walk.id, pts[0].t - 1000, pts, moment]);
  await pg.reload();
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await c.setGeolocation({ longitude: start[0], latitude: start[1], accuracy: 6 });
  await pg.waitForTimeout(2000);
  const b = await pg.locator('[data-testid=stop]').boundingBox();
  await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 60000 }).catch(() => {});
  const seen = await pg.waitForSelector('[data-testid=replay-grid]', { timeout: 40000 }).then(() => true, () => false);
  const cells = seen ? await pg.locator('[data-testid=replay-grid] [data-testid=grid-cell]').count() : 0;
  const text = seen ? await pg.locator('[data-testid=replay-grid]').innerText() : '';
  check(seen && cells === 3, `MS17: the stacked moment comes up as one grid, a cell for each of its photos (${cells})`);
  check(seen && !/\d/.test(text) && (await pg.locator('[data-testid=replay-grid] [role=progressbar]').count()) === 0, 'MS17: the grid has no dots, numbers or progress bar');
  await c.close();
}

module.exports = {
  name: 'stacks',
  covers: [
    'src/components/walk/AddToMomentPill.tsx',
    'src/lib/openMoment.ts',
    'src/lib/momentPill/**',
    'src/lib/pieceStamp.ts',
    'src/components/CaptureView.tsx',
    'src/components/chronicle/{MomentCard,MomentPicture}.tsx',
    'src/components/StackMark.tsx',
    'src/lib/deletion/pieces.ts',
    'src/lib/split/**',
    'src/lib/splitPlace.ts',
    'src/lib/ceremony/grid.ts',
    'src/components/ceremony/Grid.tsx',
  ],
  run,
};
