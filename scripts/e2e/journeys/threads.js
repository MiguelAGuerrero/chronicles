// Owner threads (OT1-OT24, owner-threads audit): connect moments, respond, read a thread, name it, delete it with Undo, keep a Chronicle
// thread as one's own. Seeded straight into IndexedDB. E2E_ONLY=threads runs it alone.

const SEED = () => {
  const DAY = 86400000;
  const now = Date.now();
  const note = (id, t, body) => ({ id, walk_id: null, t, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });
  const caps = [
    note('s1', now - 60 * DAY, 'Someone said I looked strong at the pier.'),
    note('s2', now - 30 * DAY, 'Another kind word outside the bakery.'),
    note('s3', now - 10 * DAY, 'A stranger noticed my shoulders on the bridge.'),
    note('h1', now - 50 * DAY, 'The harbor at dusk.'),
    note('h2', now - 40 * DAY, 'Harbor lights again.'),
    note('h3', now - 20 * DAY, 'Out to the harbor early.'),
    note('o1', now - 5 * DAY, 'Orchard blossoms everywhere.'),
  ];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['moment'], 'readwrite');
      for (const c of caps) tx.objectStore('moment').put(((c) => ({ id: c.id, walk_id: c.walk_id ?? null, t: c.t, lat: c.lat ?? null, lon: c.lon ?? null, segment_id: c.segment_id ?? null, piece_ids: [c.id], pieces: [Object.fromEntries(Object.entries({ ...c, moment_id: c.id }).filter(([k]) => !['walk_id', 'lat', 'lon', 'segment_id'].includes(k)))] }))(c));
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
    Promise.all([all('thread'), all('thread_member'), all('moment_link'), all('moment')]).then(([threads, members, links, captures]) => resolve({ threads, members, links, captures }));
  };
}));

async function run(h) {
  const { url, check, shot, tabTo, freshPage } = h;
  const { c, pg } = await freshPage('threads');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=my-threads]', { timeout: 20000 });
  const has = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const gone = (sel) => pg.waitForSelector(sel, { state: 'detached', timeout: 10000 }).then(() => true, () => false);
  const there = (sel, timeout = 10000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const openCard = async (text) => {
    await pg.locator(`[data-testid=moment-card]:has-text("${text}")`).first().scrollIntoViewIfNeeded();
    await pg.locator(`[data-testid=moment-card]:has-text("${text}") [data-testid=moment-open]`).first().click();
    await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 });
  };
  // In the owner's thread a note is a bubble read in place (fix thread-log); More's "Open the moment" opens the viewer.
  const bubble = (text) => `[data-testid=own-thread] [data-testid=note-bubble]:has-text("${text}")`;
  const openInThread = async (text) => {
    await pg.locator(`${bubble(text)} [data-testid=moment-more]`).first().click();
    await pg.click('[data-testid=thread-menu-open]');
    await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 });
  };
  const meta = async () => (await pg.locator('[data-testid=capture-meta]').first().innerText()).replace(/[^\x20-\x7e]/g, '').trim();
  const replyNote = async (text) => {
    await pg.click('[data-testid=viewer-respond]');
    await pg.waitForSelector('[data-testid=respond-sheet]');
    await pg.click('[data-testid=respond-note]');
    await pg.waitForSelector('[data-testid=note-edit-input]');
    await pg.fill('[data-testid=note-edit-input]', text);
    await pg.click('[data-testid=note-edit-save]');
  };
  // Close on the Undo pill: the delete stands and is stored now (UC2).
  const closePill = async () => {
    await pg.click('[data-testid=undo-dismiss]');
    await pg.waitForTimeout(800);
  };
  const closeViewer = async () => {
    await pg.click('[data-testid=viewer-close]');
    await gone('[data-testid=viewer-close]');
  };

  // OT12, OT25: the owner's threads are a block of their own beside the Chronicle's, both headed Threads, told apart by a mark.
  const mine0 = await pg.locator('[data-testid=my-threads]').innerText();
  check((await has('[data-testid=my-threads-hint]')) && (await pg.locator('[data-testid=my-thread-row]').count()) === 0
    && /^\W*Threads\b/.test(mine0) && !/Threads you made/.test(mine0) && /latest first/.test(mine0)
    && (await pg.locator('[data-testid=threads-rail]').count()) === 1,
    'OT12: the owner\'s threads are headed Threads, say their order, and have a hint, beside the Chronicle\'s own threads');
  check((await pg.locator('[data-testid=my-threads] [data-testid=thread-mark-made]').count()) >= 1
    && (await pg.locator('[data-testid=threads-rail] [data-testid=thread-mark-found]').count()) >= 1
    && (await pg.locator('[data-testid=thread-mark-made]').first().getAttribute('aria-label')) === 'connected by you'
    && (await pg.locator('[data-testid=thread-mark-found]').first().getAttribute('aria-label')) === 'found for you',
    'OT25: a mark tells the owner\'s threads from the Chronicle\'s, with a spoken name');
  await shot(pg, '70-threads-empty');

  // OT5, OT6: a thread is made from a moment and a second kept moment, nothing else.
  await openCard('looked strong at the pier');
  await pg.click('[data-testid=viewer-more]');
  await pg.click('[data-testid=viewer-add-thread]');
  await pg.waitForSelector('[data-testid=add-to-thread]');
  check((await pg.locator('[data-testid=add-thread-row]').count()) === 0 && (await has('[data-testid=add-new-thread]')),
    'OT5: Add to a thread offers A new thread, and no thread yet');
  await pg.click('[data-testid=add-new-thread]');
  await pg.fill('[data-testid=add-search]', 'bakery');
  check((await pg.locator('[data-testid=add-moment-row]').count()) === 1 && /Oct|Sep|Aug|Nov|Jan|Feb|Mar|Apr|May|Jun|Jul|Dec/.test(await pg.locator('[data-testid=add-moment-row]').first().innerText()),
    'OT5, OT9: the moment picker searches the words in the moments, and each row carries its date');
  await pg.click('[data-testid=add-moment-row]');
  await gone('[data-testid=add-to-thread]');
  check(await there('text=Connected', 5000), 'owner-threads audit 19: the pill says Connected, nothing warmer');
  let db = await stored(pg);
  check(db.threads.length === 1 && db.threads[0].name === null && db.members.length === 2, 'OT5, OT6: the thread is made of the two moments, unnamed');
  // The moment's record as seeded (decision 0123): its own fields, and its one piece.
  const s1 = db.captures.find((x) => x.id === 's1');
  check(JSON.stringify(s1) === JSON.stringify({ id: 's1', walk_id: null, t: s1.t, lat: null, lon: null, segment_id: null, piece_ids: ['s1'], pieces: [{ id: 's1', t: s1.t, kind: 'text', file_path: null, body: 'Someone said I looked strong at the pier.', moment_id: 's1' }] }),
    'OT18: linking left the moment\'s own row as it was');

  // OT11: the viewer says "in a thread", without the thread's name.
  await closeViewer();
  await openCard('looked strong at the pier');
  const live = await pg.locator('[data-testid=capture-meta]').first().getAttribute('aria-live');
  check(live === 'polite', 'ui-conformance audit 8: the info line is a live region, so what it says is announced on the web');
  const line1 = await meta();
  check(/In a thread$/.test(line1) && !/In a thread:/.test(line1), `OT11: the info line says "In a thread" and no name (${line1})`);

  // OT1, OT11, OT27 (decision 0114): the viewer's actions are a docked toolbar and a menu, nothing over the moment.
  const overMoment = () => pg.evaluate(() => {
    const card = document.querySelector('[data-testid=capture-card], [data-testid=edited-photo]');
    if (!card) return null;
    const c = card.getBoundingClientRect();
    // Only the viewer's own buttons: the screen under its Modal is not on screen.
    const root = card.closest('[aria-modal=true], [role=dialog]') || document;
    return [...root.querySelectorAll('[role=button]')].filter((b) => {
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height || b.closest('[aria-hidden=true]') || card.contains(b)) return false;
      return r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top;
    }).map((b) => b.getAttribute('aria-label') || b.textContent);
  });
  check((await has('[data-testid=viewer-toolbar] [data-testid=viewer-respond]')) && !(await has('[data-testid=respond-sheet]')) && !(await has('[data-testid=respond-bar]')),
    'OT1: Respond sits in the toolbar docked under the moment, and no row of kinds is on its face');
  const over = await overMoment();
  check(Array.isArray(over) && over.length === 0, `OT27: no button sits over the moment (${JSON.stringify(over)})`);
  check((await pg.locator('[data-testid=viewer-in-thread]').count()) === 0 && /In a thread/.test(await pg.locator('[data-testid=capture-meta]').first().innerText().catch(() => '')),
    'OT11: "In a thread" is said in the moment\'s info line, not as a chip over it');

  // OT1: Respond opens a pull-down menu of kinds from its button; a tap outside closes it.
  await pg.click('[data-testid=viewer-respond]');
  const kinds = await Promise.all(['respond-photo', 'respond-voice', 'respond-note'].map((id) => has(`[data-testid=respond-sheet] [data-testid=${id}]`)));
  const menuBox = await pg.locator('[data-testid=respond-sheet]').boundingBox();
  const btnBox = await pg.locator('[data-testid=viewer-respond]').boundingBox();
  check(kinds.every(Boolean) && menuBox && btnBox && menuBox.y + menuBox.height <= btnBox.y && menuBox.width < 390, 'OT1: Respond opens a menu of Photo or video, Voice memo and Note, just above its button');
  await pg.waitForTimeout(300);
  await shot(pg, '74-respond-menu');
  await pg.mouse.click(200, 120);
  await pg.waitForTimeout(300);
  check(!(await has('[data-testid=respond-sheet]')) && (await has('[data-testid=viewer-respond]')), 'OT1: a tap outside closes the menu and leaves the viewer');
  // OT22: Edit is the toolbar's; Save, Open in Maps, Add to a thread and Delete wait in More.
  check((await has('[data-testid=viewer-toolbar] [data-testid=viewer-edit-note]')) && !(await has('[data-testid=viewer-delete]')), 'OT22: Edit is in the toolbar; Delete and the rest wait in More');
  const toolbarBox = await pg.locator('[data-testid=viewer-toolbar]').boundingBox();
  const respondBox = await pg.locator('[data-testid=viewer-respond]').boundingBox();
  const editBox = await pg.locator('[data-testid=viewer-edit-note]').boundingBox();
  check(toolbarBox && respondBox && editBox && Math.abs(respondBox.y - editBox.y) < 2 && respondBox.height >= 44, 'OT27: the toolbar\'s actions sit on one row, 44 px tall');
  await pg.waitForTimeout(800);
  await shot(pg, '73-viewer-toolbar');

  // OT2, OT4: a note reply is kept as a moment of its own, linked to what it answers, in its thread.
  await replyNote('Same again today, at the same pier.');
  check(await there('text=Reply kept'), 'OT1: a reply is kept (Reply kept)');
  check(/Reply kept/.test(await meta()) && (await pg.locator('[data-testid=viewer-pill]').count()) === 0, 'UC10: a kept reply says so in the info line, with no pill');
  check((await has('[data-testid=viewer-respond]')) && (await has('[data-testid=viewer-edit-note]')), 'UC11: the toolbar\'s Respond and Edit are as they were');
  await pg.waitForTimeout(800);
  db = await stored(pg);
  const reply = db.captures.find((x) => x.pieces[0].body === 'Same again today, at the same pier.');
  check(reply && reply.walk_id === null && db.links.length === 1 && db.links[0].from_id === reply.id && db.links[0].to_id === 's1'
    && db.members.some((m) => m.moment_id === reply.id && m.thread_id === db.threads[0].id) && db.threads.length === 1,
    'OT2: the reply is its own moment, linked to the one it answers, and joins its thread');
  await closeViewer();

  // OT4: the reply is in Lately like any moment.
  check((await pg.locator('[data-testid=moment-card]:has-text("Same again today")').count()) >= 1, 'OT4: the reply appears in Lately as a moment');
  const lately = await pg.locator('[data-testid=moment-card]:has-text("Same again today") [data-testid=moment-answering]').allInnerTexts();
  check(lately.length === 1 && /^answering /.test(lately[0]), `owner-threads audit 1: the reply in Lately says what it answers (${lately.join('|')})`);

  // OT12, OT10: the thread is listed under Threads, a line in words.
  const row = pg.locator('[data-testid=my-thread-row]');
  check((await row.count()) === 1 && /a few moments, since /.test(await row.first().innerText()), `OT12, OT10: Your threads lists it, its size in words (${(await row.first().innerText()).replace(/\n/g, ' | ')})`);
  check((await row.first().locator('[data-testid=thread-mark-made]').count()) === 1, 'OT25: a thread the owner made wears the made mark in its row');
  await shot(pg, '71-threads-row');

  // OT9, OT13: opened, the thread reads oldest first, the reply under what it answers; naming is the owner's.
  await row.first().click();
  await pg.waitForSelector('[data-testid=own-thread]');
  check((await pg.locator('[data-testid=own-thread] [data-testid=thread-mark-made]').count()) === 1, 'OT25: the thread\'s own screen carries the made mark');
  const order = await pg.locator('[data-testid=own-thread] [data-testid=note-bubble]').allInnerTexts();
  check(order.length === 3 && /pier/.test(order[0]) && /Same again/.test(order[1]) && /bakery/.test(order[2])
    && (await pg.locator('[data-testid=own-thread-reply]').count()) === 1 && /^answering /.test(await pg.locator('[data-testid=own-thread-answering]').innerText()),
    `OT9, OT4: oldest first, the reply under the moment it answers, saying so (${order.map((t) => t.slice(0, 18)).join(' | ')})`);
  // fix thread-log: notes read in place as bubbles with their time; a tap on the words opens nothing.
  check((await pg.locator('[data-testid=own-thread] [data-testid=moment-card]').count()) === 0
    && (await pg.locator(`${bubble('looked strong at the pier')} [data-testid=moment-context]`).count()) === 1,
    'fix thread-log: a note in the thread is a bubble with its time and More, not a card that opens full screen');
  await pg.locator(bubble('looked strong at the pier')).locator('text=looked strong at the pier').click();
  await pg.waitForTimeout(500);
  check(!(await has('[data-testid=viewer-close]')), 'fix thread-log: a tap on a note in the thread opens no viewer');
  {
    const xs = await pg.locator('[data-testid=own-thread] [data-testid=note-bubble] [data-testid=moment-more]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().right)));
    const ownX = (await pg.locator('[data-testid=own-thread]').boundingBox()) ?? { x: 0, width: 0 };
    check(xs.length === 3 && xs.every((x) => x === xs[0]) && Math.abs(xs[0] - (ownX.x + ownX.width)) <= 2, `fix thread-log audit 4: every note's More is at the row's end, in one column (${xs.join(', ')})`);
    // Read from the accessibility tree, not an attribute (audit 7): the note's words and its time are inside one named group.
    const tree = await pg.locator(bubble('looked strong at the pier')).ariaSnapshot();
    check(/group "Note, Someone said I looked strong at the pier\., In September"/.test(tree) && !/- text: In September/.test(tree.split('group')[0]),
      `fix thread-log audit 2, 7, 9: a plain note is one named group with its words and time, said once (${tree.split('\n')[0]})`);
  }
  await shot(pg, '79-thread-log');
  const line = await pg.locator('[data-testid=own-thread-line]').innerText();
  check(/a few moments, since /.test(line) && !/\b(three|four|five|six)\b/.test(line), `OT10: the size is a phrase from the fixed set (${line})`);
  check(!/^Compliments/.test(await pg.locator('[data-testid=own-thread-title]').innerText()), 'OT13: an unnamed thread is headed by its place and date, not a name made up for it');
  await pg.click('[data-testid=own-thread-rename]');
  await pg.fill('[data-testid=own-thread-name]', 'Compliments');
  await pg.click('[data-testid=own-thread-save]');
  await there('[data-testid=own-thread-title]:has-text("Compliments")');
  check((await pg.locator('[data-testid=own-thread-title]').innerText()) === 'Compliments', 'OT13: the name the owner types is the heading');

  // OT11, OT3: opened from the thread, the viewer names it and a reply goes into it.
  await openInThread('bakery');
  const line2 = await meta();
  check(/In a thread: Compliments$/.test(line2), `OT11, OT3: opened from its thread, the info line names the thread (${line2})`);
  await replyNote('And a third, on the bridge.');
  await there('text=Reply kept');
  await pg.waitForTimeout(800);
  db = await stored(pg);
  check(db.threads.length === 1 && db.members.filter((m) => m.thread_id === db.threads[0].id).length === 4, 'OT3: the reply made from the thread joined that thread');
  await closeViewer();

  // owner-threads audit 9: the note being written closes on its own, not the viewer.
  await openInThread('pier');
  await pg.waitForSelector('[data-testid=viewer-respond]');
  await pg.click('[data-testid=viewer-respond]');
  await pg.click('[data-testid=respond-note]');
  await pg.fill('[data-testid=note-edit-input]', 'half a thought');
  // fix respond-bottom audit 3, on the note editor: a keyboard 300 px tall (the visual viewport shrinks) leaves Save in view.
  const kbTop = await pg.evaluate(() => {
    const vv = window.visualViewport;
    const h = window.innerHeight - 300;
    Object.defineProperty(vv, 'height', { configurable: true, get: () => h });
    vv.dispatchEvent(new Event('resize'));
    return h;
  });
  await pg.waitForTimeout(300);
  const keep = await pg.locator('[data-testid=note-edit-save]').boundingBox();
  const input = await pg.locator('[data-testid=note-edit-input]').boundingBox();
  check(!!keep && !!input && keep.y + keep.height <= kbTop && input.y >= 0, `fix respond-bottom audit 3: with the keyboard up, the note being written and Save stay above it (${keep && Math.round(keep.y + keep.height)} <= ${kbTop})`);
  await pg.evaluate(() => {
    delete window.visualViewport.height;
    window.visualViewport.dispatchEvent(new Event('resize'));
  });
  // The web's viewer takes no Escape; native's Back goes through the same composeFor first (NATIVE_UNVERIFIED).
  await pg.locator('[data-testid=note-editor] >> text=Cancel').click();
  await pg.waitForTimeout(300);
  check(!(await has('[data-testid=note-edit-input]')) && (await has('[data-testid=viewer-close]')) && (await has('[data-testid=viewer-respond]')), 'owner-threads audit 9: Cancel closes the note being written, leaves the viewer open and Respond ready');
  await closeViewer();

  // OT8: Remove from this thread keeps the moment.
  await pg.locator('[data-testid=own-thread] [data-testid=note-bubble]:has-text("And a third") [data-testid=moment-more]').click();
  await pg.click('[data-testid=thread-menu-remove]');
  check((await there('[data-testid=undo-toast]')) && /Removed from the thread/.test(await pg.locator('[data-testid=undo-toast]').innerText()), 'UC6: Remove acts at once, with Undo');
  await pg.waitForTimeout(800);
  await shot(pg, '75-removed-pill');
  {
    const pill = await pg.locator('[data-testid=undo-toast]').boundingBox();
    const back = await pg.locator('[data-testid=own-thread-back]').boundingBox();
    const clear = pill && back && (pill.y >= back.y + back.height || pill.y + pill.height <= back.y);
    check(!!clear, 'ui-conformance audit 6: the waiting pill never covers the thread\'s Back');
  }
  await closePill();
  db = await stored(pg);
  check(db.members.length === 3 && db.captures.some((x) => x.pieces[0].body === 'And a third, on the bridge.'), 'OT8: Remove from this thread keeps the moment kept');

  // OT20, OT23: the thread's name appears nowhere but its own places.
  await pg.click('[data-testid=own-thread-back]');
  await pg.waitForSelector('[data-testid=my-threads]');
  const cards = (await pg.locator('[data-testid=moment-card]').allInnerTexts()).join(' ');
  const hero = (await has('[data-testid=resurfaced]')) ? await pg.locator('[data-testid=resurfaced]').innerText() : '';
  check(!/Compliments/.test(cards + hero), 'OT20, OT23: neither the resurfaced card nor Lately shows the thread\'s name');

  // OT19: Keep as my thread copies the Chronicle's thread; the Chronicle's own is untouched.
  await pg.click('[data-testid=thread-tile]');
  await pg.waitForSelector('[data-testid=thread-screen]');
  check((await pg.locator('[data-testid=thread-screen] [data-testid=thread-mark-found]').count()) === 1 && (await pg.locator('[data-testid=thread-screen] [data-testid=thread-mark-made]').count()) === 0, 'OT25: the Chronicle\'s thread screen carries the found mark, not the made one');
  const chronicleCards = await pg.locator('[data-testid=thread-screen] [data-testid=moment-card]').count();
  await pg.click('[data-testid=thread-keep]');
  await pg.waitForSelector('[data-testid=own-thread]');
  db = await stored(pg);
  check(db.threads.every((t) => t.name !== 'Harbor'), 'owner-threads audit 13: Keep as my thread stores no name the owner did not give');
  await pg.click('[data-testid=own-thread-rename]');
  check(/Harbor/.test((await pg.locator('[data-testid=own-thread-name]').getAttribute('placeholder')) ?? ''), 'owner-threads audit 13: the Chronicle\'s name is only a suggestion in the name field');
  await pg.click('text=Cancel');
  check(db.threads.length === 2 && (await pg.locator('[data-testid=own-thread] [data-testid=note-bubble]').count()) === chronicleCards && chronicleCards === 3,
    'OT19: Keep as my thread makes a thread of the owner\'s with the same three moments');
  await pg.click('[data-testid=own-thread-back]');
  await pg.waitForSelector('[data-testid=thread-tile]');
  check((await pg.locator('[data-testid=thread-tile]').count()) === 1 && (await pg.locator('[data-testid=my-thread-row]').count()) === 2,
    'OT19: the Chronicle\'s thread is still there beside the owner\'s two');

  // OT14, OT15, UC4: Delete this thread acts at once, waits for Undo, takes the thread and no moment.
  await pg.locator('[data-testid=my-thread-row]:has-text("Compliments")').click();
  await pg.waitForSelector('[data-testid=own-thread]');
  const before = (await stored(pg)).captures.length;
  await pg.click('[data-testid=own-thread-delete]');
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=confirm]').count()) === 0 && (await there('[data-testid=undo-toast]')) && /Thread deleted/.test(await pg.locator('[data-testid=undo-toast]').innerText()),
    'UC4, OT14: Delete this thread acts at once, with no card, and a pill says Thread deleted, with Undo');
  await pg.click('[data-testid=undo]');
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=my-thread-row]:has-text("Compliments")').count()) === 1 && (await stored(pg)).threads.length === 2, 'OT15: Undo brings the thread back, name and members');
  await pg.locator('[data-testid=my-thread-row]:has-text("Compliments")').click();
  await pg.click('[data-testid=own-thread-delete]');
  await pg.waitForSelector('[data-testid=undo-toast]');
  await closePill();
  db = await stored(pg);
  check(db.threads.length === 1 && db.captures.length === before && (await pg.locator('[data-testid=my-thread-row]:has-text("Compliments")').count()) === 0,
    'OT14: once the pill is closed the thread and its memberships are gone, and every moment is kept');
  await shot(pg, '72-threads-after');

  // OT16: deleting a moment takes only its membership; a thread left with one moment dissolves (OT15).
  await openCard('Harbor lights again');
  await pg.click('[data-testid=viewer-more]');
  await pg.click('[data-testid=viewer-delete]');
  await pg.waitForSelector('[data-testid=undo-toast]');
  await closePill();
  db = await stored(pg);
  check(db.threads.length === 1 && db.members.length === 2 && !db.captures.some((x) => x.id === 'h2'), 'OT16: deleting a moment removed its membership only; the thread kept its two others');

  // OT21: all of it survives a reload.
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=my-threads]', { timeout: 20000 });
  check((await there('[data-testid=my-thread-row]', 15000)) && (await pg.locator('[data-testid=my-thread-row]').count()) === 1, 'OT21: the owner\'s thread is still there after a reload');

  // UC6 (replaces owner-threads audit 5's confirm): Remove that ends the thread acts at once with Undo; Undo brings it back, Close ends it.
  await pg.locator('[data-testid=my-thread-row]').first().click();
  await pg.waitForSelector('[data-testid=own-thread]');
  const kept = (await stored(pg)).captures.length;
  await pg.locator('[data-testid=own-thread] [data-testid=note-bubble] [data-testid=moment-more]').first().click();
  await pg.click('[data-testid=thread-menu-remove]');
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=confirm-remove], [data-testid=confirm]').count()) === 0 && (await pg.locator('[data-testid=my-thread-row]').count()) === 0
    && /Removed from the thread/.test(await pg.locator('[data-testid=undo-toast]').innerText()), 'UC6: Remove that ends the thread acts at once: the thread leaves, with Undo');
  await pg.click('[data-testid=undo]');
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=my-thread-row]').count()) === 1 && (await stored(pg)).threads.length === 1, 'UC6: Undo brings the thread back');
  await pg.locator('[data-testid=my-thread-row]').first().click();
  await pg.locator('[data-testid=own-thread] [data-testid=note-bubble] [data-testid=moment-more]').first().click();
  await pg.click('[data-testid=thread-menu-remove]');
  await pg.waitForSelector('[data-testid=undo-toast]');
  // Leaving the screen stores what waits there (ui-conformance audit 6, the owner's call).
  await tabTo(pg, 'explore');
  await pg.waitForTimeout(800);
  db = await stored(pg);
  check(db.threads.length === 0 && db.members.length === 0 && db.captures.length === kept, 'UC6, ui-conformance audit 6: leaving the screen stores the removal: the thread ends and every moment stays kept');

  // Moment references (RF1-RF8, decision 0125): a note mentions another moment with @.
  await tabTo(pg, 'chronicle', 'memories');
  await openCard('Orchard blossoms');
  await pg.click('[data-testid=viewer-respond]');
  await pg.click('[data-testid=respond-note]');
  await pg.waitForSelector('[data-testid=note-edit-input]');
  await pg.click('[data-testid=note-edit-input]');
  await pg.keyboard.type('Like the ');
  await pg.keyboard.type('@');
  const picker = await there('[data-testid=ref-palette]', 5000);
  await pg.waitForTimeout(800);
  await shot(pg, '76-mention-picker');
  await pg.fill('[data-testid=moment-picker-search]', 'harbor at dusk');
  await pg.waitForTimeout(300);
  await pg.locator('[data-testid=moment-picker-row]').first().click();
  await gone('[data-testid=ref-palette]');
  const typed = await pg.locator('[data-testid=note-edit-input]').inputValue();
  check(picker && /^Like the @\S/.test(typed) && !typed.includes('@['), `RF1: typing @ in a note opens the palette, and a moment pick puts a reference at that point ("${typed}")`);
  await pg.keyboard.type('again.');
  await pg.click('[data-testid=note-edit-save]');
  await gone('[data-testid=note-editor]');
  await closeViewer();
  await pg.waitForTimeout(800);
  db = await stored(pg);
  const refNote = db.captures.find((m) => (m.pieces[0].body ?? '').startsWith('Like the @[h1'));
  check(!!refNote && db.links.filter((l) => l.from_id === refNote.id).every((l) => l.to_id === 'o1'), `RF2: the reference is a token in the note's text, and links only what Respond links (${refNote?.pieces[0].body})`);
  const cardText = await pg.locator('[data-testid=moment-card]:has-text("Like the")').first().innerText().catch(() => '');
  check(cardText && !cardText.includes('@['), `RF6: Lately reads the reference as words, never a token (${cardText.replace(/\n/g, ' · ')})`);
  await openCard('Like the');
  const refCard = pg.locator('[data-testid=ref-card]').first();
  const refLabel = await refCard.getAttribute('aria-label').catch(() => null);
  await pg.waitForTimeout(800);
  await shot(pg, '77-note-ref-card');
  check(!!refLabel && /harbor at dusk/i.test(refLabel) && /not on a walk/.test(refLabel), `RF4: the viewer draws a reference as a card of its moment, with its kind, date, place and walk (${refLabel})`);
  await refCard.click();
  await pg.waitForTimeout(500);
  const opened = (await pg.locator('[data-testid=capture-card]').last().innerText()).includes('The harbor at dusk');
  const backLabel = await pg.locator('[data-testid=viewer-close]').getAttribute('aria-label');
  check(opened && backLabel === 'Back to the note', `RF4: a tap opens it, with Back to the note (${backLabel})`);
  const mentionedLine = await meta();
  await pg.click('[data-testid=viewer-more]');
  const openNote = await there('[data-testid=viewer-open-note]', 3000);
  await pg.waitForTimeout(400);
  await shot(pg, '78-mentioned-more');
  check(/Mentioned in a note/.test(mentionedLine) && openNote && !/\d+ notes?/.test(mentionedLine), `RF7: the referenced moment says Mentioned in a note, and More opens the note (${mentionedLine})`);
  await pg.mouse.click(20, 420);
  await pg.click('[data-testid=viewer-close]');
  await pg.waitForTimeout(400);
  check((await pg.locator('[data-testid=capture-card]').last().innerText()).includes('Like the'), 'RF4: Back returns to the note');
  await closeViewer();
  // Reference keywords (RK1-RK20): the palette a note's @ opens, beside the moments.
  await openCard('Orchard blossoms');
  await pg.click('[data-testid=viewer-respond]');
  await pg.click('[data-testid=respond-note]');
  await pg.waitForSelector('[data-testid=note-edit-input]');
  await pg.click('[data-testid=note-edit-input]');
  await pg.keyboard.type('Back @');
  const palette = await there('[data-testid=ref-palette]', 5000);
  await pg.waitForTimeout(800);
  await shot(pg, '79-ref-palette');
  const chips = await pg.locator('[data-testid^=ref-time-]').count();
  check(palette && (await has('[data-testid=ref-key-there]')) && chips >= 8 && (await has('[data-testid=moment-picker-search]')) && (await pg.locator('[data-testid=moment-picker-row]').count()) > 0,
    `RK1: @ in a note opens one palette: where, when and the moments (${chips} time words)`);
  const rowText = await pg.locator('[data-testid=moment-picker-row]').first().innerText();
  check(/[A-Z][a-z]{2} \d{1,2}/.test(rowText), `RK8: a moment row in the palette carries its date (${rowText.replace(/\n/g, ' · ')})`);
  await pg.click('[data-testid=ref-key-there]');
  const resolve = await there('[data-testid=ref-resolve]', 3000);
  const mapOffered = await has('[data-testid=ref-choose-map]');
  await pg.waitForTimeout(400);
  await shot(pg, '80-ref-resolve');
  const rows = await pg.locator('[data-testid=ref-resolve-row]').count();
  const rowsText = rows ? (await pg.locator('[data-testid=ref-resolve-row]').allInnerTexts()).join(' ') : '';
  check(resolve && mapOffered && !/\d/.test(rowsText) && !/closest|nearest|best|top/i.test(rowsText), `RK18: over there lists places by distance in words and always offers Choose on the map (${rows} places)`);
  await pg.click('[data-testid=ref-resolve-close]');
  await gone('[data-testid=ref-resolve]');
  const stillTyping = (await pg.locator('[data-testid=note-edit-input]').inputValue()) === 'Back @';
  await pg.click('[data-testid=ref-palette-close]');
  await gone('[data-testid=ref-palette]');
  check(stillTyping && (await pg.locator('[data-testid=note-edit-input]').inputValue()) === 'Back @', 'RK1, RK14: dismissing the palette leaves the @ as typed, and typing was never held up');
  await pg.keyboard.type(' @');
  await there('[data-testid=ref-palette]', 5000);
  await pg.click('[data-testid=ref-time-tomorrow]');
  await gone('[data-testid=ref-palette]');
  const withKey = await pg.locator('[data-testid=note-edit-input]').inputValue();
  check(/^Back @ @tomorrow \([A-Z][a-z]{2} \d{1,2}\) $/.test(withKey), `RK2: the chosen keyword is in the note and the other words are as typed ("${withKey}")`);
  // Over there: a spot picked on the map and named (RK18).
  await pg.keyboard.type('@');
  await there('[data-testid=ref-palette]', 5000);
  await pg.click('[data-testid=ref-key-there]');
  await there('[data-testid=ref-resolve]', 3000);
  await pg.click('[data-testid=ref-choose-map]');
  const mapIn = await there('[data-testid=ref-map]', 5000);
  await pg.waitForTimeout(1500);
  await pg.locator('[data-testid=ref-map]').click();
  await pg.fill('[data-testid=ref-map-name]', 'the old pier');
  await pg.click('[data-testid=ref-map-use]');
  await gone('[data-testid=ref-palette]');
  const both = await pg.locator('[data-testid=note-edit-input]').inputValue();
  check(mapIn && /@over there \(the old pier\) $/.test(both), `RK18: over there by a spot on the map, named, goes in as a keyword ("${both}")`);
  await pg.keyboard.type('is when.');
  await pg.click('[data-testid=note-edit-save]');
  await gone('[data-testid=note-editor]');
  await closeViewer();
  await pg.waitForTimeout(800);
  db = await stored(pg);
  const keyNote = db.captures.find((m) => (m.pieces[0].body ?? '').startsWith('Back @ @{time|tomorrow|'));
  const kb = keyNote?.pieces[0].body ?? '';
  check(!!keyNote && /@\{there\|over there\|the old pier\|-?\d+\.\d+,-?\d+\.\d+\}/.test(kb) && !/@\[/.test(kb), `RK3: each keyword is a token with its value and payload in the note's own text (${kb})`);
  await openCard('is when');
  const kws = await pg.locator('[data-testid=ref-keyword]').allInnerTexts();
  await pg.waitForTimeout(500);
  await shot(pg, '81-ref-keyword');
  check(kws.length === 2 && /^tomorrow \([A-Z][a-z]{2} \d{1,2}\)$/.test(kws[0]) && kws[1] === 'over there (the old pier)', `RK9: the viewer shows each word with its value in parentheses by default (${kws.join(' | ')})`);
  await pg.locator('[data-testid=ref-keyword]').nth(1).click();
  const fixing = await there('[data-testid=ref-resolve]', 3000);
  await pg.click('[data-testid=ref-choose-map]');
  const mapUp = await there('[data-testid=ref-map]', 5000);
  await pg.waitForTimeout(1500);
  await pg.locator('[data-testid=ref-map]').click();
  await pg.fill('[data-testid=ref-map-name]', 'the old mill');
  await pg.click('[data-testid=ref-map-use]');
  await gone('[data-testid=ref-resolve]');
  await pg.waitForTimeout(800);
  const kw2 = await pg.locator('[data-testid=ref-keyword]').nth(1).innerText().catch(() => '');
  db = await stored(pg);
  const fixed = db.captures.find((m) => /@\{there\|over there\|the old mill\|/.test(m.pieces[0].body ?? '') && /@\{time\|tomorrow\|/.test(m.pieces[0].body ?? ''));
  check(fixing && mapUp && kw2 === 'over there (the old mill)' && !!fixed, `RK10: a tap on a place reference opens the resolution picker, and a pick replaces its value and keeps its word and the rest of the note ("${kw2}")`);
  await closeViewer();
  await c.close();
}

module.exports = {
  name: 'threads',
  covers: [
    'src/components/threads/**',
    'src/components/chronicle/{MemoriesScreen,ThreadScreen}.tsx',
    'src/components/CaptureView.tsx',
    'src/lib/threads/**',
    'src/lib/useCaptures.ts',
  ],
  run,
};
