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
  // The moment's record as seeded (decision 0106): its own fields, and its one piece.
  const s1 = db.captures.find((x) => x.id === 's1');
  check(JSON.stringify(s1) === JSON.stringify({ id: 's1', walk_id: null, t: s1.t, lat: null, lon: null, segment_id: null, piece_ids: ['s1'], pieces: [{ id: 's1', t: s1.t, kind: 'text', file_path: null, body: 'Someone said I looked strong at the pier.', moment_id: 's1' }] }),
    'OT18: linking left the moment\'s own row as it was');

  // OT11: the viewer says "in a thread", without the thread's name.
  await closeViewer();
  await openCard('looked strong at the pier');
  const chip1 = (await pg.locator('[data-testid=viewer-in-thread]').innerText()).replace(/[^\x20-\x7e]/g, '').trim();
  check(chip1 === 'In a thread', `OT11: the viewer says "In a thread" and no name (${chip1})`);

  // OT1: Respond is on the viewer's face, three kinds, one tap each, none behind a menu.
  const faceKinds = await Promise.all(['respond-photo', 'respond-voice', 'respond-note'].map((id) => has(`[data-testid=${id}]`)));
  check(faceKinds.every(Boolean) && !(await has('[data-testid=viewer-menu]')), 'OT1: Respond shows photo, voice and note on the viewer\'s face, with no menu open');
  check((await has('[data-testid=viewer-edit-note]')) === false, 'OT22: the viewer\'s own menu items wait in More, as before');

  // OT2, OT4: a note reply is kept as a moment of its own, linked to what it answers, in its thread.
  await pg.click('[data-testid=respond-note]');
  await pg.fill('[data-testid=respond-note-input]', 'Same again today, at the same pier.');
  await pg.click('[data-testid=respond-note-save]');
  check(await there('[data-testid=respond-message]'), 'OT1: a reply is kept (Reply kept)');
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
  const order = await pg.locator('[data-testid=own-thread] [data-testid=moment-card]').allInnerTexts();
  check(order.length === 3 && /pier/.test(order[0]) && /Same again/.test(order[1]) && /bakery/.test(order[2])
    && (await pg.locator('[data-testid=own-thread-reply]').count()) === 1 && /^answering /.test(await pg.locator('[data-testid=own-thread-answering]').innerText()),
    `OT9, OT4: oldest first, the reply under the moment it answers, saying so (${order.map((t) => t.slice(0, 18)).join(' | ')})`);
  const line = await pg.locator('[data-testid=own-thread-line]').innerText();
  check(/a few moments, since /.test(line) && !/\b(three|four|five|six)\b/.test(line), `OT10: the size is a phrase from the fixed set (${line})`);
  check(!/^Compliments/.test(await pg.locator('[data-testid=own-thread-title]').innerText()), 'OT13: an unnamed thread is headed by its place and date, not a name made up for it');
  await pg.click('[data-testid=own-thread-rename]');
  await pg.fill('[data-testid=own-thread-name]', 'Compliments');
  await pg.click('[data-testid=own-thread-save]');
  await there('[data-testid=own-thread-title]:has-text("Compliments")');
  check((await pg.locator('[data-testid=own-thread-title]').innerText()) === 'Compliments', 'OT13: the name the owner types is the heading');

  // OT11, OT3: opened from the thread, the viewer names it and a reply goes into it.
  await pg.locator('[data-testid=own-thread] [data-testid=moment-card]:has-text("bakery") [data-testid=moment-open]').click();
  await pg.waitForSelector('[data-testid=viewer-close]');
  const chip2 = (await pg.locator('[data-testid=viewer-in-thread]').innerText()).replace(/[^\x20-\x7e]/g, '').trim();
  check(chip2 === 'In a thread: Compliments', `OT11, OT3: opened from its thread, the viewer names the thread (${chip2})`);
  await pg.click('[data-testid=respond-note]');
  await pg.fill('[data-testid=respond-note-input]', 'And a third, on the bridge.');
  await pg.click('[data-testid=respond-note-save]');
  await there('[data-testid=respond-message]');
  await pg.waitForTimeout(800);
  db = await stored(pg);
  check(db.threads.length === 1 && db.members.filter((m) => m.thread_id === db.threads[0].id).length === 4, 'OT3: the reply made from the thread joined that thread');
  await closeViewer();

  // owner-threads audit 9: the note being written closes on its own, not the viewer.
  await pg.locator('[data-testid=own-thread] [data-testid=moment-card]:has-text("pier") [data-testid=moment-open]').first().click();
  await pg.waitForSelector('[data-testid=respond-note]');
  await pg.click('[data-testid=respond-note]');
  await pg.fill('[data-testid=respond-note-input]', 'half a thought');
  // The web's viewer takes no Escape; native's Back goes through the same composeFor first (NATIVE_UNVERIFIED).
  await pg.click('[data-testid=respond-note-cancel]');
  await pg.waitForTimeout(300);
  check(!(await has('[data-testid=respond-note-input]')) && (await has('[data-testid=viewer-close]')) && (await has('[data-testid=respond-note]')), 'owner-threads audit 9: Cancel closes the note being written, leaves the viewer open and Respond ready');
  await closeViewer();

  // OT8: Remove from this thread keeps the moment.
  await pg.locator('[data-testid=own-thread] [data-testid=moment-card]:has-text("And a third") [data-testid=moment-more]').click();
  await pg.click('[data-testid=thread-menu-remove]');
  await pg.waitForTimeout(500);
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
  check(db.threads.length === 2 && (await pg.locator('[data-testid=own-thread] [data-testid=moment-card]').count()) === chronicleCards && chronicleCards === 3,
    'OT19: Keep as my thread makes a thread of the owner\'s with the same three moments');
  await pg.click('[data-testid=own-thread-back]');
  await pg.waitForSelector('[data-testid=thread-tile]');
  check((await pg.locator('[data-testid=thread-tile]').count()) === 1 && (await pg.locator('[data-testid=my-thread-row]').count()) === 2,
    'OT19: the Chronicle\'s thread is still there beside the owner\'s two');

  // OT14, OT15: Delete this thread asks, waits for Undo, takes the thread and no moment.
  await pg.locator('[data-testid=my-thread-row]:has-text("Compliments")').click();
  await pg.waitForSelector('[data-testid=own-thread]');
  const before = (await stored(pg)).captures.length;
  await pg.click('[data-testid=own-thread-delete]');
  await pg.waitForSelector('[data-testid=confirm]');
  check(/moments stay kept/.test(await pg.locator('[data-testid=confirm]').innerText()), 'OT14: Delete this thread asks once, in words, and says the moments stay');
  await pg.click('[data-testid=confirm-delete]');
  check((await there('[data-testid=undo-toast]')) && /Thread deleted/.test(await pg.locator('[data-testid=undo-toast]').innerText()), 'OT14: a pill says Thread deleted, with Undo');
  await pg.click('[data-testid=undo]');
  await pg.waitForTimeout(300);
  check((await pg.locator('[data-testid=my-thread-row]:has-text("Compliments")').count()) === 1 && (await stored(pg)).threads.length === 2, 'OT15: Undo brings the thread back, name and members');
  await pg.locator('[data-testid=my-thread-row]:has-text("Compliments")').click();
  await pg.click('[data-testid=own-thread-delete]');
  await pg.click('[data-testid=confirm-delete]');
  await pg.waitForTimeout(5800);
  db = await stored(pg);
  check(db.threads.length === 1 && db.captures.length === before && (await pg.locator('[data-testid=my-thread-row]:has-text("Compliments")').count()) === 0,
    'OT14: after the Undo window the thread and its memberships are gone, and every moment is kept');
  await shot(pg, '72-threads-after');

  // OT16: deleting a moment takes only its membership; a thread left with one moment dissolves (OT15).
  await openCard('Harbor lights again');
  await pg.click('[data-testid=viewer-more]');
  await pg.click('[data-testid=viewer-delete]');
  await pg.click('[data-testid=confirm-delete]');
  await pg.waitForTimeout(5800);
  db = await stored(pg);
  check(db.threads.length === 1 && db.members.length === 2 && !db.captures.some((x) => x.id === 'h2'), 'OT16: deleting a moment removed its membership only; the thread kept its two others');

  // OT21: all of it survives a reload.
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=my-threads]', { timeout: 20000 });
  check((await there('[data-testid=my-thread-row]', 15000)) && (await pg.locator('[data-testid=my-thread-row]').count()) === 1, 'OT21: the owner\'s thread is still there after a reload');

  // owner-threads audit 5: Remove asks first when it would end the thread; Cancel keeps it, Remove ends it, the moments stay.
  await pg.locator('[data-testid=my-thread-row]').first().click();
  await pg.waitForSelector('[data-testid=own-thread]');
  const kept = (await stored(pg)).captures.length;
  await pg.locator('[data-testid=own-thread] [data-testid=moment-card] [data-testid=moment-more]').first().click();
  await pg.click('[data-testid=thread-menu-remove]');
  check(await there('[data-testid=confirm-remove]', 5000), 'owner-threads audit 5: Remove asks first when it would end the thread');
  await pg.click('[data-testid=confirm-remove] [data-testid=confirm-cancel]');
  check((await stored(pg)).threads.length === 1, 'owner-threads audit 5: Cancel keeps the thread');
  await pg.locator('[data-testid=own-thread] [data-testid=moment-card] [data-testid=moment-more]').first().click();
  await pg.click('[data-testid=thread-menu-remove]');
  await pg.click('[data-testid=confirm-remove] [data-testid=confirm-delete]');
  await pg.waitForTimeout(600);
  db = await stored(pg);
  check(db.threads.length === 0 && db.members.length === 0 && db.captures.length === kept, 'owner-threads audit 5: confirmed, the thread ends and every moment stays kept');
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
