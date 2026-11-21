// Thread a moment as it is kept (specs/threading-at-capture, TK1-TK11, decision 0253): Thread on the Add to this moment
// pill, the card on "Last added to", this walk's moments with their pictures, an optional name. On the walk screen, three
// murals made one thread from the pill without leaving the walk. In a fresh browser. E2E_ONLY=capthread.
const path = require('path');

async function run(h) {
  const { navUrl, BASE, check, freshPage, shot, drawerTo, scriptsDir } = h;
  const photoFile = path.join(scriptsDir, 'fixtures', 'photo.jpg');
  const { c, pg } = await freshPage('capthread');
  const there = (sel, timeout = 8000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const gone = (sel, timeout = 8000) => pg.waitForSelector(sel, { state: 'detached', timeout }).then(() => true, () => false);
  const stored = () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction(['thread', 'thread_member', 'moment'], 'readonly');
      const all = (n) => new Promise((r) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => r(g.result); });
      Promise.all([all('thread'), all('thread_member'), all('moment')]).then(([threads, members, moments]) => resolve({ threads, members, moments }));
    };
  }));
  const photo = async (button) => {
    const [ch] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click(`[data-testid=${button}]`)]);
    await ch.setFiles(photoFile);
    // Its editor opens by itself once kept (decision 0240); closed, the photo is kept as taken.
    if (await there('[data-testid=media-editor]', 10000)) {
      await pg.click('[data-testid=edit-close]').catch(() => {});
      await gone('[data-testid=media-editor]', 5000);
    }
    await pg.waitForTimeout(700);
  };
  const names = (sel) => pg.$$eval(`${sel} [role=button]`, (bs) => bs.map((b) => b.getAttribute('aria-label'))).catch(() => []);
  const stack = () => Promise.all(['cap-photo', 'cap-voice', 'cap-note'].map((id) => pg.locator(`[data-testid=${id}]`).boundingBox().catch(() => null)));

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=ready-bar]', { timeout: 30000 });
  await pg.waitForTimeout(1500);

  // ---- TK2: with Group captures on, "Adding to this moment" carries Thread beside New moment (Navigate, ready).
  await drawerTo(pg, 'up');
  if (await there('[data-testid=group-captures]', 5000)) await pg.click('[data-testid=group-captures]');
  await drawerTo(pg, 'peek');
  await pg.click('[data-testid=moment-note]');
  await pg.fill('[data-testid=note-input]', 'A grouped note');
  await pg.click('[data-testid=note-done]');
  await pg.waitForTimeout(900);
  const adding = await there('[data-testid=adding-moment]', 4000);
  const addingNames = adding ? await names('[data-testid=adding-moment]') : [];
  const addingText = adding ? await pg.locator('[data-testid=adding-moment]').innerText() : '';
  check(adding && addingNames.includes('Add this moment to a thread') && addingNames.includes('Start a new moment') && /^Adding to this moment/.test(addingText.trim()),
    `TK2: with Group captures on, "Adding to this moment" offers Thread beside New moment (${JSON.stringify(addingNames)})`);
  await shot(pg, 'capthread-01-grouping');
  // Off again: the walk below makes a new moment from the edge each time.
  await drawerTo(pg, 'up');
  if (await there('[data-testid=group-captures]', 5000)) await pg.click('[data-testid=group-captures]');
  await drawerTo(pg, 'peek');

  // ---- The walk: the first mural.
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await pg.waitForTimeout(1500);
  await photo('cap-photo');
  const pill = await there('[data-testid=add-to-moment]', 5000);
  const pillNames = pill ? await names('[data-testid=add-to-moment]') : [];
  // The first line: the buttons' glyphs follow it in innerText.
  const pillText = pill ? (await pg.locator('[data-testid=add-to-moment]').innerText()).split('\n')[0].trim() : '';
  check(pill && JSON.stringify(pillNames) === JSON.stringify(['Add a photo to this moment', 'Add a voice memo to this moment', 'Add a note to this moment', 'Add this moment to a thread', 'Not now']) && pillText === 'Add to this moment',
    `TK1: after a capture the pill offers Thread, before ×, one tap, its words unchanged (${JSON.stringify(pillNames)}, "${pillText}")`);
  const pillBox = await pg.locator('[data-testid=add-to-moment]').boundingBox().catch(() => null);
  await shot(pg, 'capthread-02-pill');
  await pg.setViewportSize({ width: 320, height: 640 });
  await pg.waitForTimeout(600);
  await shot(pg, 'capthread-03-pill-320');
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(600);

  // ---- The second mural, threaded with the first from the pill (TK3, TK6, TK7, TK8).
  await photo('cap-photo');
  const stackBefore = await stack();
  await pg.click('[data-testid=add-thread]').catch(() => {});
  const card = await there('[data-testid=add-to-thread]', 5000);
  const focused = card ? await pg.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null) : 'no card';
  const lastNone = (await pg.locator('[data-testid=last-added]').count()) === 0;
  check(card && focused !== 'add-search' && lastNone, `TK3, TK5: Thread opens Add to a thread over the walk, the search not focused, no "Last added to" with no thread yet (${focused})`);
  await pg.waitForTimeout(800); // after the Modal's fade (captures-and-media.md)
  await shot(pg, 'capthread-04-card-first');
  check.todo((await pg.locator('[data-testid=add-to-thread] [data-testid=add-search-mark]').count()) === 1,
    'threading-at-capture ui 1: the threads step\'s search field carries the search mark, as drawn');
  await pg.click('[data-testid=add-new-thread]').catch(() => {});
  await pg.waitForTimeout(600);
  const rows = await pg.locator('[data-testid=add-moment-row]').evaluateAll((es) => es.map((e) => ({ text: e.innerText.replace(/\n/g, ' | '), img: !!e.querySelector('img') })));
  check(rows.length >= 1 && /^Photo \| /.test(rows[0].text) && rows[0].img,
    `TK6, TK7: mid-walk the first mural is offered, newest first, with its picture beside its words and line (${JSON.stringify(rows.slice(0, 2))})`);
  await shot(pg, 'capthread-05-moments');
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(400);
  const backed = (await pg.locator('[data-testid=add-new-thread]').count()) === 1 && (await pg.locator('[data-testid=add-to-thread]').count()) === 1;
  check.todo(backed, 'threading-at-capture ui 2: Escape on "Join it with another moment" goes back to the threads, the card still up');
  if (backed) await pg.click('[data-testid=add-new-thread]');
  await pg.waitForTimeout(400);
  // A double tap makes one thread (threading-at-capture audit 2).
  if (rows.length) await pg.locator('[data-testid=add-moment-row]').first().dblclick();
  const named = await there('[data-testid=thread-name]', 5000);
  const nameText = named ? await pg.locator('[data-testid=add-to-thread]').innerText() : '';
  check(named && /Connected/.test(nameText) && /The two moments are a thread now\./.test(nameText) && /Leave it unnamed/.test(nameText),
    `TK8: once two are a thread the card offers an optional name (${nameText.replace(/\n/g, ' | ')})`);
  await shot(pg, 'capthread-06-name');
  if (named) {
    await pg.fill('[data-testid=thread-name]', 'Murals');
    await pg.click('[data-testid=thread-name-done]');
  }
  await gone('[data-testid=add-to-thread]', 5000);
  await pg.waitForTimeout(500);
  let s = await stored();
  const murals = s.threads.find((t) => t.name === 'Murals');
  check.todo(s.threads.length === 1, `threading-at-capture audit 2: a double tap on a moment row makes one thread (${s.threads.length})`);
  check(!!murals && s.members.filter((m) => m.thread_id === murals.id).length === 2,
    `TK8: Done saved the name the owner typed; the two murals are its members (${JSON.stringify(s.threads.map((t) => t.name))})`);
  const stackAfter = await stack();
  const stillPill = await there('[data-testid=add-to-moment]', 2000);
  const connectedSaid = await pg.locator('text=Connected').count();
  check(stillPill && JSON.stringify(stackAfter) === JSON.stringify(stackBefore) && connectedSaid === 0,
    `TK3, TK9: closed, the pill and the stack are as they were, and "Connected" is not said a second time (${connectedSaid})`);

  // ---- The third mural joins with two taps: Thread, "Last added to" (TK4, TK9, TK10).
  await photo('cap-photo');
  await pg.click('[data-testid=add-thread]').catch(() => {});
  await there('[data-testid=add-to-thread]', 5000);
  const last = await there('[data-testid=last-added]', 3000);
  const lastText = last ? (await pg.locator('[data-testid=last-added]').innerText()).replace(/\n/g, ' | ') : '';
  check(last && /^Last added to/i.test(lastText) && /Murals/.test(lastText), `TK4: the thread last added to is first, under "Last added to" (${lastText})`);
  await pg.waitForTimeout(800); // after the Modal's fade (captures-and-media.md)
  await shot(pg, 'capthread-07-last');
  if (last) await pg.locator('[data-testid=last-added] [data-testid=add-thread-row]').click();
  await gone('[data-testid=add-to-thread]', 5000);
  const toast = await pg.locator('[data-testid=walk-toast]').innerText().catch(() => '');
  s = await stored();
  check(/^Connected$/.test(toast.trim()) && !/\d/.test(toast), `TK9: the walk says "Connected" once, with no count ("${toast}")`);
  check(!!murals && s.members.filter((m) => m.thread_id === murals.id).length === 3 && s.threads.length === 1,
    `TK10: three murals, one thread, made from the pill without leaving the walk (${s.members.length} members, ${s.threads.length} threads)`);

  // ---- The same moment again: the thread holding it is disabled; the search (TK5, TK9); Escape closes (TK3).
  await pg.click('[data-testid=add-thread]').catch(() => {});
  await there('[data-testid=add-to-thread]', 5000);
  const inIt = await pg.locator('[data-testid=add-thread-row][aria-disabled=true]').innerText().catch(() => '');
  const inItOpacity = await pg.locator('[data-testid=add-thread-row][aria-disabled=true] [data-testid=add-thread-line]').evaluate((e) => {
    let o = 1;
    for (let n = e; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  }).catch(() => 0);
  check.todo(inItOpacity === 1, `threading-at-capture ui 3: "This moment is in it" is not dimmed (opacity ${inItOpacity})`);
  check(/This moment is in it/.test(inIt), `TK9: a thread holding the moment is shown disabled, "This moment is in it" (${inIt.replace(/\n/g, ' | ')})`);
  await pg.fill('[data-testid=add-search]', 'mur');
  await pg.waitForTimeout(400);
  const found = await pg.locator('[data-testid=add-to-thread]').innerText();
  await shot(pg, 'capthread-08-search');
  await pg.fill('[data-testid=add-search]', 'zzzqqq');
  await pg.waitForTimeout(400);
  const none = await pg.locator('[data-testid=add-to-thread]').innerText();
  check(/Threads/i.test(found) && /Murals/.test(found) && /Nothing matches\./.test(none), `TK5: "mur" finds the thread by its name; a search that finds nothing says so (${found.replace(/\n/g, ' | ').slice(0, 160)})`);
  await pg.keyboard.press('Escape');
  const closed = await gone('[data-testid=add-to-thread]', 4000);
  check(closed && (await there('[data-testid=add-to-moment]', 2000)) && !!pillBox, 'TK3: Escape closes the card; the pill is still there');
  await c.close();
}

module.exports = {
  name: 'capthread',
  covers: [
    'src/components/walk/AddToMomentPill.tsx',
    'src/components/threads/AddToThread.tsx',
    'src/components/threads/ThreadFromPill.tsx',
    'src/lib/threads/capThread.ts',
    'src/lib/threads/picker.ts',
  ],
  run,
};
