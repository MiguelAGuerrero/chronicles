// Thread a moment as it is kept (specs/thread-at-capture CT1-CT10, decision 0253): Thread on the Add to this moment
// pill on Navigate's ready screen and on a walk, the card's "Last added to", its search, its pictures, the walk being
// made, the name of a new thread, and Thread on the grouping line. In a fresh browser with nothing kept.
// E2E_ONLY=capthread.

const path = require('path');

// The owner's threads and memberships, as stored.
const stored = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const tx = req.result.transaction(['thread', 'thread_member'], 'readonly');
    const t = tx.objectStore('thread').getAll();
    const m = tx.objectStore('thread_member').getAll();
    tx.oncomplete = () => resolve({ threads: t.result, members: m.result });
  };
}));

async function run(h) {
  const { navUrl, BASE, check, shot, freshPage, scriptsDir } = h;
  const photoFile = path.join(scriptsDir, 'fixtures', 'photo.jpg');
  const { c, pg } = await freshPage('capthread');
  const there = (sel, timeout = 8000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const gone = (sel, timeout = 8000) => pg.waitForSelector(sel, { state: 'detached', timeout }).then(() => true, () => false);
  // A photo from the edge stack, its editor closed as taken (decision 0240), the pill up after it.
  const photo = async (button) => {
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click(button)]);
    await chooser.setFiles(photoFile);
    await pg.waitForSelector('[data-testid=media-editor]', { timeout: 15000 }).catch(() => {});
    await pg.click('[data-testid=edit-close]').catch(() => {});
    await gone('[data-testid=media-editor]', 5000);
    return there('[data-testid=add-to-moment]', 5000);
  };
  const names = (sel) => pg.$$eval(sel, (bs) => bs.map((b) => b.getAttribute('aria-label')));
  const box = (sel) => pg.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }).catch(() => null);

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=ready-bar]', { timeout: 30000 });
  await pg.waitForTimeout(1500);

  // Before a moment is kept nothing about threads is drawn, and the stack is as it was (CT11).
  const stack = await names('[data-testid=moment-photo], [data-testid=moment-voice], [data-testid=moment-note]');
  check((await pg.locator('[data-testid=add-thread], [data-testid=add-to-thread]').count()) === 0 && stack.length === 3,
    `CT11: before a capture no Thread and no card are drawn, the stack's three in place (${stack.join(', ')})`);

  // The first mural: the pill now carries Thread, before ×, one row at 390 px (CT1).
  const pill1 = await photo('[data-testid=moment-photo]');
  const labels = pill1 ? await names('[data-testid=add-to-moment] [role=button]') : [];
  check(pill1 && labels.join('|') === 'Add a photo to this moment|Add a voice memo to this moment|Add a note to this moment|Add this moment to a thread|Not now',
    `CT1: after a capture the pill offers camera, mic, note, Thread and ×, in that order (${labels.join(', ')})`);
  // Its words are the first line; the icons' glyphs follow in innerText.
  const label = pill1 ? (await pg.$eval('[data-testid=add-to-moment]', (e) => e.innerText)).split('\n')[0].trim() : '';
  const tBox = await box('[data-testid=add-thread]');
  const xBox = await box('[data-testid=add-dismiss]');
  check(label === 'Add to this moment' && !!tBox && !!xBox && Math.abs(tBox.y - xBox.y) < 2 && tBox.w >= 44 && tBox.h >= 44,
    `CT1: the pill's words are unchanged and its five 44 pt buttons sit in one row at 390 px (${JSON.stringify([label, tBox, xBox])})`);
  await shot(pg, 'ct-01-pill-390');
  // A first mural cannot be threaded alone (OT6): the card offers only A new thread, and its list has nothing else yet.
  await pg.click('[data-testid=add-dismiss]').catch(() => {});

  // The second mural, threaded with the first from the pill (CT3, CT7, CT8).
  await photo('[data-testid=moment-photo]');
  await pg.click('[data-testid=add-thread]').catch(() => {});
  const card = await there('[data-testid=add-to-thread]', 5000);
  const keysClosed = card ? await pg.evaluate(() => document.activeElement?.getAttribute('data-testid') !== 'add-thread-search') : false;
  check(card && keysClosed && (await pg.locator('[data-testid=add-new-thread]').count()) === 1,
    'CT3, CT5: Thread opens Add to a thread over the screen, its search closed, A new thread first with no thread yet');
  await pg.waitForTimeout(800);
  await shot(pg, 'ct-02-card-empty');
  await pg.click('[data-testid=add-new-thread]').catch(() => {});
  await pg.waitForTimeout(600);
  const rows = await pg.locator('[data-testid=add-moment-row]').count();
  const pic = await pg.locator('[data-testid=add-moment-row] [data-testid=row-picture]').count();
  const rowText = rows ? await pg.locator('[data-testid=add-moment-row]').first().innerText() : '';
  check(rows === 1 && pic === 1 && /Photo/.test(rowText) && /[A-Z][a-z]{2} \d/.test(rowText),
    `CT7: the other mural is offered with its small picture beside "Photo" and its date line (${rows}, ${pic}, ${JSON.stringify(rowText)})`);
  await shot(pg, 'ct-03-new-thread');
  // thread-at-capture audit 2: a double tap on the row makes one thread, not two.
  if (rows) await pg.locator('[data-testid=add-moment-row]').first().dblclick();
  const named = await there('[data-testid=new-thread-name]', 5000);
  const said = named ? await pg.locator('[data-testid=add-to-thread]').innerText() : '';
  // thread-at-capture audit 4: the name is capped as a rename is (40), its field its own.
  const cap = named ? await pg.getAttribute('[data-testid=new-thread-name]', 'maxlength') : null;
  check(cap === '40', `thread-at-capture audit 4: the new thread's name field takes 40 characters at most (${cap})`);
  check(named && /Connected/.test(said) && /The two moments are a thread now\./.test(said) && (await pg.locator('[data-testid=thread-name-skip]').count()) === 1,
    `CT8: once two are joined the card says so and offers an optional name, Leave it unnamed beside Done (${JSON.stringify(said.slice(0, 120))})`);
  if (named) {
    await pg.fill('[data-testid=new-thread-name]', 'Murals');
    await shot(pg, 'ct-04-name');
    await pg.click('[data-testid=thread-name-done]');
  }
  await gone('[data-testid=add-to-thread]', 5000);
  const toast1 = await there('text=Added to a thread', 4000);
  let s = await stored(pg);
  check(s.threads.length === 1, `thread-at-capture audit 2: two taps on a row made one thread (${s.threads.length})`);
  check(s.threads.length === 1 && s.threads[0].name === 'Murals' && s.members.length === 2,
    `CT8, CT10: a thread of the two murals, named Murals as typed (${JSON.stringify(s.threads.map((t) => t.name))}, ${s.members.length})`);
  check(toast1 && (await pg.locator('text=Added to a thread').count()) === 1, 'CT9: "Added to a thread" is said once, with no count');
  check(await there('[data-testid=add-to-moment]', 3000) && (await pg.locator('[data-testid=moment-photo]:not([aria-disabled=true])').count()) === 1,
    'CT3: once the card is gone the pill and the shutter are back as they were');

  // The third mural: Thread, then "Last added to" (two taps, CT4).
  await photo('[data-testid=moment-photo]');
  await pg.click('[data-testid=add-thread]').catch(() => {});
  await there('[data-testid=add-to-thread]', 5000);
  const lastHead = await there('text=Last added to', 3000);
  const lastName = lastHead ? await pg.locator('[data-testid=add-last-thread]').innerText().catch(() => '') : '';
  check(lastHead && /Murals/.test(lastName) && /moments, since/.test(lastName) && !/\d/.test(lastName), `CT4: the card opens on "Last added to", the Murals thread first, its size in words (${JSON.stringify(lastName)})`);
  await pg.waitForTimeout(800);
  await shot(pg, 'ct-05-last-added');
  // The search, typed into, finds the thread by its name and a moment by its words (CT5).
  await pg.click('[data-testid=add-thread-search]').catch(() => {});
  // thread-at-capture ui 1 (the cold find): focused, the search shows one ink edge on its own box (the approved
  // drawing), never a ring drawn inside it that cuts the magnifier off.
  const ring = await pg.$eval('[data-testid=add-thread-search]', (e) => {
    const box = e.parentElement;
    return { inner: getComputedStyle(e).outlineStyle, edge: box ? getComputedStyle(box).borderTopWidth : '', color: box ? getComputedStyle(box).borderTopColor : '' };
  }).catch(() => null);
  check(!!ring && ring.inner === 'none' && ring.edge === '2px' && ring.color === 'rgb(29, 36, 48)', `thread-at-capture ui 1: the focused search has one ink edge and no inner ring (${JSON.stringify(ring)})`);
  await pg.fill('[data-testid=add-thread-search]', 'mur');
  await pg.waitForTimeout(300);
  const foundThreads = await pg.locator('[data-testid=add-thread-row]').count();
  const noLast = (await pg.locator('text=Last added to').count()) === 0;
  check(foundThreads === 1 && noLast && (await there('text=Threads', 1000)), `CT5: "mur" finds the Murals thread under Threads, no "Last added to" while searching (${foundThreads})`);
  await pg.fill('[data-testid=add-thread-search]', 'zzzz');
  await pg.waitForTimeout(300);
  check(await there('text=Nothing matches.', 2000), 'CT5: a search that finds nothing says so in words');
  await shot(pg, 'ct-06-search-none');
  await pg.fill('[data-testid=add-thread-search]', '');
  await pg.waitForTimeout(300);
  if (await there('[data-testid=add-last-thread]', 2000)) await pg.click('[data-testid=add-last-thread]');
  await gone('[data-testid=add-to-thread]', 5000);
  s = await stored(pg);
  check(s.threads.length === 1 && s.members.length === 3, `CT4, CT10: the third mural joined Murals in two taps (${s.members.length})`);
  // Thread again on the same moment: the thread holding it is shown and cannot be tapped (CT4, CT9).
  await pg.click('[data-testid=add-thread]').catch(() => {});
  await there('[data-testid=add-to-thread]', 5000);
  // The rows come once the moments are read: wait for the row, not only the card.
  await there('[data-testid=add-last-thread]', 5000);
  const inIt = await pg.locator('[data-testid=add-last-thread][aria-disabled=true]').count();
  const inItText = inIt ? await pg.locator('[data-testid=add-last-thread]').innerText() : '';
  check(inIt === 1 && /This moment is in it/.test(inItText), `CT4: a thread the moment is in says so and cannot be tapped (${JSON.stringify(inItText)})`);
  await pg.click('[data-testid=add-to-thread-close]').catch(() => {});
  await gone('[data-testid=add-to-thread]', 3000);

  // 320 px: three, then two (CT1).
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(500);
  const t320 = await box('[data-testid=add-thread]');
  const p320 = await box('[data-testid=add-photo]');
  check(!!t320 && !!p320 && t320.y > p320.y + 20 && t320.w >= 44, `CT1: at 320 px Thread wraps below the first three (${JSON.stringify([p320, t320])})`);
  await shot(pg, 'ct-07-pill-320');
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(300);
  await pg.click('[data-testid=add-dismiss]').catch(() => {});

  // On a walk: two photos, the second threaded with the first while the walk is still open (CT6).
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await pg.waitForSelector('[data-testid=cap-photo]', { timeout: 15000 });
  await pg.waitForTimeout(1500);
  await photo('[data-testid=cap-photo]');
  await pg.click('[data-testid=add-dismiss]').catch(() => {});
  await photo('[data-testid=cap-photo]');
  await pg.click('[data-testid=add-thread]').catch(() => {});
  await there('[data-testid=add-to-thread]', 5000);
  await pg.click('[data-testid=add-new-thread]').catch(() => {});
  await pg.waitForTimeout(600);
  const walkRows = await pg.locator('[data-testid=add-moment-row]').count();
  const firstWalkRow = walkRows ? await pg.locator('[data-testid=add-moment-row]').first().innerText() : '';
  check(walkRows === 4 && /From /.test(firstWalkRow), `CT6: the walk being made is offered, newest first, its photo first and from its walk (${walkRows}, ${JSON.stringify(firstWalkRow)})`);
  await pg.waitForTimeout(800);
  await shot(pg, 'ct-08-walk-moments');
  if (walkRows) await pg.locator('[data-testid=add-moment-row]').first().click();
  // thread-at-capture audit 3: a name typed, then Escape: the thread keeps the name.
  if (await there('[data-testid=new-thread-name]', 4000)) {
    await pg.fill('[data-testid=new-thread-name]', 'Walk wall');
    await pg.keyboard.press('Escape');
  }
  await gone('[data-testid=add-to-thread]', 5000);
  await pg.waitForTimeout(800);
  s = await stored(pg);
  check(s.threads.length === 2, `CT6: a second thread of the walk's two photos (${s.threads.length})`);
  check(s.threads.some((t) => t.name === 'Walk wall'), `thread-at-capture audit 3: Escape on the name step keeps the typed name (${JSON.stringify(s.threads.map((t) => t.name))})`);
  // Its thread is listed while the walk is open: Thread on the second photo shows it as the one last added to.
  await pg.click('[data-testid=add-thread]').catch(() => {});
  await there('[data-testid=add-to-thread]', 5000);
  const walkLast = await pg.locator('[data-testid=add-last-thread]').innerText().catch(() => '');
  check(/This moment is in it/.test(walkLast), `CT6: a thread made of the open walk's moments is listed (${JSON.stringify(walkLast)})`);
  await pg.click('[data-testid=add-to-thread-close]').catch(() => {});
  await c.close();

  // Group captures on (CT2): the "Adding to this moment" line carries Thread beside New moment.
  const g = await freshPage('capthread-group');
  const gp = g.pg;
  await gp.goto(navUrl);
  await gp.waitForSelector('[data-testid=ready-bar]', { timeout: 30000 });
  await h.drawerTo(gp, 'up');
  if (await gp.waitForSelector('[data-testid=group-captures]', { timeout: 5000 }).then(() => true, () => false)) await gp.click('[data-testid=group-captures]');
  await h.drawerTo(gp, 'peek');
  await gp.click('[data-testid=moment-note]');
  await gp.fill('[data-testid=note-input]', 'A wall of tiles');
  await gp.click('[data-testid=note-done]');
  const line = await gp.waitForSelector('[data-testid=adding-moment]', { timeout: 5000 }).then(() => true, () => false);
  const lineNames = line ? await gp.$$eval('[data-testid=adding-moment] [role=button]', (bs) => bs.map((b) => b.getAttribute('aria-label'))) : [];
  check(line && lineNames.join('|') === 'Add this moment to a thread|Start a new moment', `CT2: with grouping on, the line offers Thread, then New moment (${lineNames.join(', ')})`);
  // The words on one line above Thread and New moment (the owner's call while building, Nov 21; the canvas's GroupStacked).
  const lines = line ? await gp.$eval('[data-testid=adding-moment] > div', (e) => { const r = e.getBoundingClientRect(); return Math.round(r.height / (parseFloat(getComputedStyle(e).lineHeight) || 19)); }).catch(() => 0) : 0;
  const tY = line ? await gp.$eval('[data-testid=adding-moment] [data-testid=add-thread]', (e) => ({ y: e.getBoundingClientRect().y })).catch(() => null) : null;
  const wY = line ? await gp.$eval('[data-testid=adding-moment] > div', (e) => e.getBoundingClientRect().bottom).catch(() => null) : null;
  check(lines === 1 && !!tY && wY != null && tY.y >= wY, `CT2: "Adding to this moment" is one line, above Thread and New moment (${lines}, ${JSON.stringify([wY, tY])})`);
  await gp.waitForTimeout(800);
  await shot(gp, 'ct-09-grouping');
  await g.c.close();
}

module.exports = {
  name: 'capthread',
  covers: [
    'src/components/walk/AddToMomentPill.tsx',
    'src/components/threads/AddToThread.tsx',
    'src/lib/threads/picker.ts',
    'src/lib/momentPill/row.ts',
  ],
  run,
};
