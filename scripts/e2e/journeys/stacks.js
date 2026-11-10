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
  const fixtures = path.join(scriptsDir, 'e2e', 'fixtures');
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
  check.todo(ms2ok, `MS2: after a capture, the pill offers camera, mic and note, each one tap, with spoken names (${names.join(', ')})`);
  const colour = pill ? await pg.$eval('[data-testid=add-to-moment]', (e) => getComputedStyle(e).color) : '';
  const label1 = pill ? await pg.$eval('[data-testid=add-to-moment]', (e) => e.innerText) : '';
  await shot(pg, '95-stacks-pill');

  // A note added from the pill joins the photo's moment, with its own time, and takes no fix (MS3).
  const geoBefore = await pg.evaluate(() => window.__geo);
  if (pill) await note('[data-testid=add-note]', 'Its painted back');
  let ms = await moments(pg);
  const geoAfter = await pg.evaluate(() => window.__geo);
  const ms3ok = ms.length === 1 && ms[0].pieces.length === 2 && ms[0].pieces[1].t > ms[0].pieces[0].t && ms[0].pieces[1].kind === 'text';
  check.todo(ms3ok, `MS3: the note joined the photo's moment as a second piece with its own time (${ms.map((m) => m.pieces.length).join(',')})`);
  check.todo(geoAfter === geoBefore, `MS3: adding a piece read no location (${geoBefore} → ${geoAfter})`);
  const label2 = (await there('[data-testid=add-to-moment]', 3000)) ? await pg.$eval('[data-testid=add-to-moment]', (e) => e.innerText) : null;
  check.todo(label2 === label1 && !/\d/.test(label1) && colour !== '', `MS6: the pill reads the same after a second piece, with no number (${JSON.stringify([label1, label2])})`);
  // A third piece, a photo, from the pill's camera.
  if (await there('[data-testid=add-photo]', 3000)) {
    const [ch2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=add-photo]')]);
    await ch2.setFiles(path.join(fixtures, 'photo.jpg'));
    await pg.waitForTimeout(1200);
  }

  // The edge stack still makes a new moment in one tap, and the pill moves to it (MS1, MS5).
  await note('[data-testid=moment-note]', 'A different thing entirely');
  ms = await moments(pg);
  check.todo(ms.length === 2 && ms[0].pieces.length === 3 && ms[1].pieces.length === 1, `MS1, MS5: an edge tap made a new moment (${ms.map((m) => m.pieces.length).join(',')})`);
  // Dismissed, it goes and the next capture is a new moment (MS4).
  if (await there('[data-testid=add-dismiss]', 3000)) await pg.click('[data-testid=add-dismiss]');
  check.todo(await gone('[data-testid=add-to-moment]', 3000), 'MS4: the pill goes when dismissed');

  // Chronicle: the stacked moment is one card, by its photo, with the quiet mark; no count anywhere (MS7, MS8, MS9).
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForTimeout(1500);
  const cards = await pg.locator('[data-testid=moment-card]').count();
  const marks = await pg.locator('[data-testid=stack-mark]').count();
  check.todo(cards === 2 && marks === 1, `MS7, MS8: two moments, two cards, one marked as holding more (${cards} cards, ${marks} marks)`);
  const markLabel = marks ? await pg.locator('[data-testid=stack-mark]').first().getAttribute('aria-label') : null;
  check.todo(markLabel === 'with more in this moment', `MS8: the mark is spoken in words (${markLabel})`);

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
  check.todo(JSON.stringify(seen) === JSON.stringify(['photo', 'text', 'photo']), `MS10: the arrow keys step through the pieces in capture order (${seen.join(', ')})`);
  const labels = await pg.$$eval('[data-testid=capture-viewer] [aria-label]', (es) => es.map((e) => e.getAttribute('aria-label')));
  const ms10ok = labels.includes('Next in this moment') && labels.includes('Previous in this moment') && !labels.some((l) => /piece/i.test(l ?? ''));
  check.todo(ms10ok, `MS10: the piece buttons are spoken "in this moment", and "piece" is never said (${labels.filter((l) => /moment/i.test(l ?? '')).join(', ')})`);
  const ms9ok = texts.every((t) => !/\d+\s*of\s*\d+|\+\d/.test(t)) && labels.every((l) => !/\d+\s*of\s*\d+|\+\d/.test(l ?? ''));
  check.todo(ms9ok, 'MS9: no position or total of a moment\'s pieces, in text or spoken labels');

  // What acts on the piece and what on the moment (MS11): an edit lands on the piece shown; a reminder on the moment.
  await pg.keyboard.press('ArrowLeft');
  await pg.waitForTimeout(400);
  const ms11ok = (await pg.locator('[data-testid=capture-viewer] [aria-label="Edit"]').count()) === 1 && (await pg.locator('[data-testid=capture-viewer] [aria-label="Remind me here"]').count()) === 1;
  check.todo(ms11ok, 'MS11: Edit (the piece) and Remind me here (the moment) are both offered');

  // The viewer adds only while the pill is open; dismissed, it offers Respond (MS12).
  const ms12ok = (await pg.locator('[data-testid=viewer-add]').count()) === 0 && (await pg.locator('[data-testid=respond-note]').count()) > 0;
  check.todo(ms12ok, 'MS12: with the pill closed, the viewer offers Respond, not Add to this moment');

  // Deleting one piece keeps the rest (MS13), with words that name it by kind; Undo window then stored.
  await pg.click('[data-testid=capture-viewer] [aria-label="More"]');
  const delPiece = await there('[data-testid=menu-delete-piece]', 3000);
  const pieceText = delPiece ? await pg.locator('[data-testid=menu-delete-piece]').innerText() : '';
  const momentText = (await pg.locator('[data-testid=menu-delete]').count()) ? await pg.locator('[data-testid=menu-delete]').innerText() : '';
  check.todo(/Delete this (photo|note)/.test(pieceText) && /Delete this moment/.test(momentText), `MS13: More offers the piece by its kind and the moment (${pieceText} / ${momentText})`);
  if (delPiece) {
    await pg.click('[data-testid=menu-delete-piece]');
    if (await there('[data-testid=confirm-delete]', 3000)) await pg.click('[data-testid=confirm-delete]');
    await pg.waitForTimeout(6500);
  }
  ms = await moments(pg);
  check.todo(ms.length === 2 && ms[0].pieces.length === 2, `MS13: after the Undo window, one piece is gone and the moment stays (${ms.map((m) => m.pieces.length).join(',')})`);

  // Kept across a reload (MS15).
  await pg.reload();
  await pg.waitForTimeout(2500);
  ms = await moments(pg);
  check.todo(ms.length === 2 && ms[0].pieces.length === 2, `MS15: the stacked moment survives a reload (${ms.map((m) => m.pieces.length).join(',')})`);
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
    'src/components/chronicle/{MomentCard,MomentPicture,StackMark}.tsx',
    'src/lib/deletion/pieces.ts',
  ],
  run,
};
