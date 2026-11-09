// Resurfaced moments (RM1-RM25): Chronicle opens on Memories, the resurfaced moment, threads from the
// user's own words, Lately, "less like this", and the other sections as they were. Seeded straight into
// IndexedDB: moments made on other days, in a browser of its own. E2E_ONLY=resurface runs it alone.

const SEED = () => {
  const DAY = 86400000;
  const now = Date.now();
  const d = new Date(now);
  const yearAgo = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate(), 12).getTime();
  const walk = { id: 'w1', started_at: now - 40 * DAY, ended_at: now - 40 * DAY + 3600000, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
  const note = (id, t, body, walk_id) => ({ id, walk_id, t, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });
  const caps = [
    note('a1', yearAgo, 'The fox statue by the river looked like it was waiting for someone.', null),
    note('h1', now - 40 * DAY + 600000, 'The harbor at dusk.', 'w1'),
    note('h2', now - 30 * DAY, 'Harbor lights again.', null),
    note('h3', now - 20 * DAY, 'Out to the harbor early.', null),
    note('o1', now - 3 * DAY, 'Orchard blossoms everywhere.', null),
    note('r1', now - 3600000, 'Just now.', null),
    note('l1', now - 2 * DAY, 'quiet '.repeat(700).trim(), null),
  ];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'capture'], 'readwrite');
      tx.objectStore('walk').put(walk);
      for (const c of caps) tx.objectStore('capture').put(c);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

const prefsOf = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const g = req.result.transaction('meta', 'readonly').objectStore('meta').get('resurface_prefs');
    g.onsuccess = () => resolve(g.result ? JSON.parse(g.result.value) : null);
  };
}));


// Memories in context (MC1-MC16): a street cache, a walk with a pause, and moments at known minutes.
const SEED_CONTEXT = () => {
  const DAY = 86400000;
  const now = Date.now();
  const lat = 41.8;
  const lon = -71.4;
  const z = 2 ** 14;
  const tile = `${Math.floor(((lon + 180) / 360) * z)},${Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * z)}`;
  const day = (back, h, m = 0) => { const d = new Date(now - back * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
  const start = day(3, 18);
  const walk = { id: 'w2', started_at: start, ended_at: start + 3600000, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
  const note = (id, t, body, walk_id, fix = true, seg = null) => ({ id, walk_id, t, lat: fix ? lat : null, lon: fix ? lon : null, kind: 'text', file_path: null, body, segment_id: seg });
  const year = new Date(now); year.setFullYear(year.getFullYear() - 1); year.setHours(12, 0, 0, 0);
  const caps = [
    note('c1', start + 5 * 60000, 'harbor bench', 'w2', true, 's1'),
    note('c2', start + 40 * 60000, 'orchard blossoms', 'w2', true, 's1'),
    note('c3', day(2, 10), 'loose near hope', null, true, null),
    note('c4', day(5, 9), 'loose and unplaced', null, false, null),
    { id: 'c5', walk_id: null, t: year.getTime(), lat: null, lon: null, kind: 'voice', file_path: 'x', body: '42000', segment_id: null },
  ];
  const segment = { id: 's1', name: 'Hope Street', kind_detail: 'residential', length_m: 100, geometry: [[[lon - 0.001, lat], [lon + 0.001, lat]]], build: 'b', tile };
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'capture', 'street_segment', 'pause'], 'readwrite');
      tx.objectStore('walk').put(walk);
      for (const c of caps) tx.objectStore('capture').put(c);
      tx.objectStore('street_segment').put(segment);
      tx.objectStore('pause').put({ walk_id: 'w2', started_at: start + 20 * 60000, ended_at: start + 30 * 60000 });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

// Each step is a todo until its code lands; a step that throws is false, never a crash.
const attempt = async (fn) => { try { return !!(await fn()); } catch { return false; } };

async function contextRun(h) {
  const { url, check, tabTo, freshPage } = h;
  const { c, pg } = await freshPage('resurface-context');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  // The app clears derived caches such as streets when it starts on a fresh database, so the street cache is
  // seeded once it is running and Memories reads it as the tab comes to the front.
  await pg.waitForTimeout(1500);
  await pg.evaluate(SEED_CONTEXT);
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=moment-card]', { timeout: 20000 });
  const cardOf = (words) => pg.locator(`[data-testid=moment-card]:has-text("${words}")`).first();
  const textOf = async (words) => (await cardOf(words).innerText()).replace(/\s+/g, ' ');

  const placeOk = await attempt(async () => /Hope Street, Fox Point/.test(await textOf('harbor bench')) && /Hope Street/.test(await textOf('loose near hope')) && !/Fox Point/.test(await textOf('loose near hope')) && /No place kept/.test(await textOf('loose and unplaced')));
  check(placeOk, 'MC1: a card shows its street and town, the street alone outside a walk, else "No place kept"');
  const minutesOk = await attempt(async () => /Five minutes in/.test(await textOf('harbor bench')) && /Thirty minutes in/.test(await textOf('orchard blossoms')) && /On its own/.test(await textOf('loose near hope')));
  check(minutesOk, 'MC3: a card says how far into the walk it was, pauses not counted, or "On its own"');
  const dayOk = await attempt(async () => /evening/.test(await textOf('harbor bench')));
  check(dayOk, 'MC4: a card says the time of day in words');
  const noDigit = await attempt(async () => !/\d/.test(await textOf('harbor bench')));
  check(noDigit, 'MC7: a card context line holds no digit');

  // Audit 18: the top card's context is short and does not repeat the walk. Audit 17: a street found by nearness is "Near".
  const heroShort = await attempt(async () => {
    const t = (await pg.locator('[data-testid=resurfaced-context]').innerText()).trim();
    return !/From/.test(t) && t.split(' · ').length <= 3;
  });
  check(heroShort, 'memories-context audit 18: the top card holds no "From" and at most three segments');
  const nearOk = await attempt(async () => /Near Hope Street/.test(await textOf('loose near hope')) && !/Near/.test(await textOf('harbor bench')));
  check(nearOk, 'memories-context audit 17: a street found by nearness reads "Near", the snapped one bare');
  const footOk = await attempt(async () => !/Fox Point/.test(await cardOf('harbor bench').locator('[data-testid=moment-walk]').innerText()));
  check(footOk, 'memories-context audit 3: the foot line names the walk without its town');

  // MC15: the owner's words are italic; the app's placeholder is upright.
  const italic = (sel) => pg.locator(sel).first().evaluate((e) => getComputedStyle(e).fontStyle);
  const italicOk = await attempt(async () => (await italic('[data-testid=moment-card] >> text=harbor bench')) === 'italic' && (await italic('[data-testid=resurfaced] >> text=A voice memo')) === 'normal');
  check(italicOk, "MC15: your words are italic and the app's placeholder is upright");

  // MC8-MC10: the header menu.
  const menu = async (item) => { await pg.click('[data-testid=memories-menu]'); await pg.click(`[data-testid=${item}]`); };
  const hiddenOk = await attempt(async () => {
    await pg.click('[data-testid=resurfaced-more]');
    await pg.click('[data-testid=menu-hide]');
    await menu('menu-hidden');
    const row = pg.locator('[data-testid=hidden-row]').first();
    const text = await row.innerText();
    const noPicture = (await row.locator('img').count()) === 0;
    await pg.click('[data-testid=hidden-bring-back]');
    return noPicture && /voice memo/i.test(text) && (await pg.locator('[data-testid=hidden-row]').count()) === 0;
  });
  check(hiddenOk, 'MC8: Hidden lists what was hidden by kind and context, with no picture, and Bring back restores it');
  const offOk = await attempt(async () => {
    await pg.click('[data-testid=hidden-back]');
    await menu('menu-off');
    const line = await pg.locator('[data-testid=resurfaced-off]').innerText();
    return /Bringing moments back is off/.test(line) && (await pg.locator('[data-testid=resurfaced]').count()) === 0 && (await pg.locator('[data-testid=resurfaced-another]').count()) === 0 && (await pg.locator('[data-testid=moment-card]').count()) > 0;
  });
  check(offOk, 'MC9: with the switch off, a quiet line replaces the top card and Another, and Lately stays');
  const forgetOk = await attempt(async () => {
    await menu('menu-forget');
    const said = await pg.locator('[data-testid=forget-confirm-text]').innerText();
    await pg.click('[data-testid=forget-confirm]');
    return /offered again/.test(said) && (await pg.locator('[data-testid=resurfaced-off]').count()) === 1;
  });
  check(forgetOk, 'MC10: Forget my choices asks once, says what returns, and keeps the switch off');
  const toastOk = await attempt(async () => {
    await menu('menu-off');
    await pg.click('[data-testid=resurfaced-more]');
    await pg.click('[data-testid=menu-hide]');
    // An earlier toast may still be up: wait for this choice's own.
    await pg.waitForFunction(() => /Hidden\./.test(document.querySelector('[data-testid=memories-toast]')?.textContent ?? ''), null, { timeout: 5000 });
    return /Hidden\. It stays in Lately and in its walk\./.test(await pg.locator('[data-testid=memories-toast]').innerText());
  });
  check(toastOk, 'MC14: the toast states a fact, Hidden. It stays in Lately and in its walk.');
  // Audit 7: the toast names the word as the owner wrote it, and Undo takes it back.
  const fewerOk = await attempt(async () => {
    await cardOf('harbor bench').locator('[data-testid=moment-more]').click();
    await pg.click('[data-testid=menu-less]');
    // The earlier toast may still be up: wait for this one.
    await pg.waitForFunction(() => /Fewer like this/.test(document.querySelector('[data-testid=memories-toast]')?.textContent ?? ''), null, { timeout: 5000 });
    const said = await pg.locator('[data-testid=memories-toast]').innerText();
    await pg.click('[data-testid=memories-undo]');
    return /Fewer like this: harbor/.test(said);
  });
  check(fewerOk, 'memories-context audit 7: Show less like this names the word as written');
  // Audit 5: Forget leaves a toast with Undo that brings back what it cleared.
  const forgetUndoOk = await attempt(async () => {
    await cardOf('loose near hope').locator('[data-testid=moment-more]').click();
    await pg.click('[data-testid=menu-hide]');
    await pg.waitForTimeout(400);
    const hiddenBefore = (await prefsOf(pg)).hidden.length;
    await menu('menu-forget');
    await pg.click('[data-testid=forget-confirm]');
    await pg.waitForFunction(() => /Choices forgotten/.test(document.querySelector('[data-testid=memories-toast]')?.textContent ?? ''), null, { timeout: 5000 });
    const said = await pg.locator('[data-testid=memories-toast]').innerText();
    await pg.waitForTimeout(400);
    const cleared = (await prefsOf(pg)).hidden.length === 0;
    await pg.click('[data-testid=memories-undo]');
    await pg.waitForTimeout(400);
    const back = hiddenBefore >= 1 && (await prefsOf(pg)).hidden.length === hiddenBefore;
    return /Choices forgotten\./.test(said) && cleared && back;
  });
  check(forgetUndoOk, 'memories-context audit 5: Forget says so, and Undo restores what it cleared');
  // Audit 15: the switch survives a reload.
  const offKeptOk = await attempt(async () => {
    await menu('menu-off');
    // The choice is kept a moment after the tap: reload once it has landed.
    for (let i = 0; i < 30 && !((await prefsOf(pg)) ?? {}).off; i++) await pg.waitForTimeout(100);
    await pg.reload();
    await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
    await tabTo(pg, 'chronicle', 'memories');
    await pg.waitForSelector('[data-testid=resurfaced-off]', { timeout: 15000 });
    return true;
  });
  check(offKeptOk, 'memories-context audit 15: the switch stays off after a reload');
  await c.close();

  const empty = await freshPage('resurface-context-empty');
  await empty.pg.goto(url);
  await empty.pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(empty.pg, 'chronicle', 'memories');
  const emptyOk = await attempt(async () => {
    const said = await empty.pg.locator('[data-testid=memories-empty]').innerText();
    return said.trim().startsWith('Nothing kept yet.') && !/walk somewhere/i.test(said);
  });
  check(emptyOk, 'MC14: the empty state reads Nothing kept yet. and gives no instruction');
  await empty.c.close();
}

async function run(h) {
  const { url, check, shot, tabTo, freshPage } = h;
  const { c, pg } = await freshPage('resurface');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=resurfaced]', { timeout: 20000 });
  const has = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const label = () => pg.locator('[data-testid=resurfaced-label]').textContent();

  // RM1: it opens on Memories, with four sections and no map.
  check((await pg.locator('[data-testid=chronicle-sections] [role=tab]').count()) === 4
    && (await pg.locator('[data-testid=section-memories][aria-selected=true]').count()) === 1
    && !(await has('[data-testid=home-sheet]')), 'RM1: Chronicle opens on Memories, with Memories, Walks, Days and Map, and no map');

  // RM5, RM6: the resurfaced moment leads with the user's own words, and says why it is here.
  check((await label()) === 'A year ago today' && /waiting for someone/.test(await pg.locator('[data-testid=resurfaced]').innerText()),
    'RM5, RM6: the top card is the moment from a year ago today, in its own words');
  check(!(await has('[data-testid=resurfaced]:has-text("Just now")')), 'RM7: a moment from the last day is not resurfaced');

  // RM22: no number is a score; nothing on Memories holds a digit here.
  const text = await pg.locator('[data-testid=memories]').innerText();
  check(!/\d/.test(text), `RM22: Memories shows no digit (${text.replace(/\s+/g, ' ').slice(0, 120)})`);
  // RM25: the top card reads as one named button, and Another, Relive it and More are named buttons; the rail is a list.
  const named = async (name) => (await pg.getByRole('button', { name }).filter({ visible: true }).count()) > 0;
  check((await named(/Open$/)) && (await named('Relive it')) && (await named('Another')) && (await named('More about this moment'))
    && (await pg.locator('[data-testid=threads-rail] [role=list]').count()) === 1, 'RM25: the top card, Relive it, Another and More are named buttons, and the rail is a list');
  await shot(pg, '60-memories');

  // RM14: the threads rail, a tile with a line in words.
  const tile = await pg.locator('[data-testid=thread-tile]').allInnerTexts();
  check(tile.length === 1 && /^\W*Harbor\b/.test(tile[0]) && /Just beginning/.test(tile[0]), `RM14: one thread, Harbor, with a line in words (${tile.join('|').replace(/\n/g, ' ')})`);

  // RM17, RM18: Lately lists every moment, a card opens the viewer.
  check((await pg.locator('[data-testid=moment-card]').count()) === 7, 'RM17: Lately lists the seven moments, the top card among them');
  // Audit 12: a very long note leaves its card's buttons on screen. Audit 13: the rail is a list, the targets are 44 px.
  const longCard = pg.locator('[data-testid=moment-card]:has-text("quiet quiet")').first();
  await longCard.scrollIntoViewIfNeeded();
  const lb = await longCard.boundingBox();
  const mb = await longCard.locator('[data-testid=moment-more]').boundingBox();
  check(lb && mb && lb.height < 600 && mb.x + mb.width <= 390 && mb.y + mb.height <= lb.y + lb.height + 1, `audit 12: a 4,000-character note keeps its card short and its More button in view (${Math.round(lb?.height ?? 0)} px)`);
  await pg.locator('[data-testid=memories-list]').evaluate((e) => e.scrollTo?.(0, 0)).catch(() => {});
  const sb = await pg.locator('[data-testid=section-memories]').boundingBox();
  check((await pg.locator('[data-testid=threads-rail] [role=listitem]').count()) === 1 && sb && sb.height >= 44, 'audit 13: the threads rail is a list, and the section tabs are 44 px tall');
  await pg.locator('[data-testid=moment-open]').first().click();
  check(await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 10000 }).then(() => true, () => false), 'RM18: a card opens the moment in the viewer');
  await pg.click('[data-testid=viewer-close]');
  await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 10000 }).catch(() => {});

  // RM8: Another shows a different moment, and says it is a thread.
  await pg.click('[data-testid=resurfaced-another]');
  check(/You keep coming back to harbor/.test(await label()), 'RM8: Another steps to a moment in the harbor thread, and says so');

  // RM20, RM21: Show less like this, kept, with Undo.
  await pg.click('[data-testid=resurfaced-more]');
  await pg.click('[data-testid=menu-less]');
  await pg.waitForSelector('[data-testid=memories-toast]');
  await pg.waitForTimeout(300);
  const ub = await pg.locator('[data-testid=memories-undo]').boundingBox();
  check(ub && ub.width >= 44 && ub.height >= 44, `audit 13: Undo is a 44 px target (${Math.round(ub?.width ?? 0)}x${Math.round(ub?.height ?? 0)})`);
  let prefs = await prefsOf(pg);
  check(prefs && prefs.less.includes('harbor') && prefs.dim.length === 1, 'RM20, RM21: Show less like this is kept in meta (the term and the moment)');
  await pg.click('[data-testid=memories-undo]');
  await pg.waitForTimeout(300);
  prefs = await prefsOf(pg);
  check(prefs && prefs.less.length === 0 && prefs.dim.length === 0, 'RM20: Undo puts the choice back, in meta too');

  // RM20: Not this one never resurfaces it, and leaves it in Lately.
  const was = await pg.locator('[data-testid=resurfaced]').innerText();
  await pg.click('[data-testid=resurfaced-more]');
  await pg.click('[data-testid=menu-hide]');
  await pg.waitForTimeout(300);
  prefs = await prefsOf(pg);
  check(prefs && prefs.hidden.length === 1 && (await pg.locator('[data-testid=resurfaced]').innerText()) !== was && (await pg.locator('[data-testid=moment-card]').count()) === 7,
    'RM20: Not this one is kept, the top card moves on, and the moment stays in Lately');

  // RM9: Relive it opens the day of a moment made outside a walk.
  await pg.click('[data-testid=resurfaced-relive]');
  const lived = await pg.waitForURL(/\/(day|replay)\//, { timeout: 15000 }).then(() => true, () => false);
  check(lived, 'RM9: Relive it opens the replay of its day (or its walk)');
  await pg.goBack();
  await pg.waitForSelector('[data-testid=resurfaced]', { timeout: 20000 });

  // RM15, RM16: a thread's screen; rename and Not a thread are kept.
  await pg.click('[data-testid=thread-tile]');
  await pg.waitForSelector('[data-testid=thread-screen]');
  check((await pg.locator('[data-testid=thread-title]').innerText()) === 'Harbor' && (await pg.locator('[data-testid=thread-quote]').count()) === 2
    && (await pg.locator('[data-testid=thread-screen] [data-testid=moment-card]').count()) === 3, 'RM15: the thread shows its name, two of the user\'s own sentences, and its three moments');
  await pg.click('[data-testid=thread-rename]');
  await pg.fill('[data-testid=thread-name]', 'The harbor');
  await pg.click('[data-testid=thread-save]');
  check((await pg.locator('[data-testid=thread-title]').innerText()) === 'The harbor', 'RM16: Rename shows the new name');
  await pg.click('[data-testid=thread-back]');
  await pg.waitForSelector('[data-testid=thread-tile]');
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=thread-tile]', { timeout: 20000 });
  check(/The harbor/.test(await pg.locator('[data-testid=thread-tile]').first().innerText()), 'RM16, RM21: the rename survives a reload');
  await pg.click('[data-testid=thread-tile]');
  await pg.click('[data-testid=thread-remove]');
  await pg.waitForSelector('[data-testid=threads-hint]');
  check(!(await has('[data-testid=threads-rail]')), 'RM14, RM16: Not a thread takes the rail away, and a quiet line says threads appear when you keep coming back');

  // RM2: the other sections, as they were.
  await pg.click('[data-testid=section-walks]');
  check(await pg.waitForSelector('[data-testid=home-sheet]', { timeout: 15000 }).then(() => true, () => false), 'RM2: Walks shows the home sheet\'s walks list');
  await pg.click('[data-testid=section-days]');
  check(await pg.waitForSelector('[data-testid=day-row]', { timeout: 15000 }).then(() => true, () => false), 'RM2: Days lists the days');
  await pg.click('[data-testid=section-map]');
  check(await pg.waitForSelector('[data-testid=sheet-days]', { timeout: 15000 }).then(() => true, () => false), 'RM2: Map shows the sheet at rest');

  // RM1: leaving for another tab puts Chronicle back on Memories.
  await pg.click('[data-testid=tab-explore]');
  await pg.waitForTimeout(500);
  await tabTo(pg, 'chronicle', 'memories');
  check(await pg.waitForSelector('[data-testid=section-memories][aria-selected=true]', { timeout: 10000 }).then(() => true, () => false), 'RM1: coming back from another tab opens Memories again');
  await c.close();

  // RM4: nothing kept yet.
  const empty = await freshPage('resurface-empty');
  await empty.pg.goto(url);
  await empty.pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await tabTo(empty.pg, 'chronicle', 'memories');
  check(await empty.pg.waitForSelector('[data-testid=memories-empty]', { timeout: 15000 }).then(() => true, () => false)
    && (await empty.pg.locator('[data-testid=memories-navigate]').count()) === 1
    && (await empty.pg.locator('[data-testid=resurfaced]').count()) === 0 && (await empty.pg.locator('[data-testid=threads-rail]').count()) === 0,
    'RM4: with nothing kept, one quiet line and a Navigate button, and no card or rail');
  await empty.c.close();
  await contextRun(h);
}

module.exports = {
  name: 'resurface',
  covers: [
    'src/components/chronicle/**',
    'src/lib/resurface/**',
  ],
  run,
};
