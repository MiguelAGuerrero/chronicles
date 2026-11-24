// Chronicle journal, cut 1 (JN1-JN24, decision 0155): Memories is a journal page in book order, ending in an
// open line where writing, a photo or a voice note is the capture. Its own browser: an empty journal first,
// then seeded entries, then a walk minimized. E2E_ONLY=journal runs it alone.

const path = require('path');
const { heldKit } = require('./edit');

const DAY = 86400000;
const ACCENT = 'rgb(194, 65, 12)';

// Counts every location read (JN11, JN12), and can break the moments' read (JN9).
const INIT = () => {
  const g = navigator.geolocation;
  window.__geo = { reads: 0, watching: 0 };
  const get = g.getCurrentPosition.bind(g);
  const watch = g.watchPosition.bind(g);
  const clear = g.clearWatch.bind(g);
  g.getCurrentPosition = (...a) => { window.__geo.reads += 1; return get(...a); };
  g.watchPosition = (...a) => { window.__geo.reads += 1; window.__geo.watching += 1; return watch(...a); };
  g.clearWatch = (id) => { window.__geo.watching = Math.max(0, window.__geo.watching - 1); return clear(id); };
  const getAll = IDBIndex.prototype.getAll;
  IDBIndex.prototype.getAll = function (...a) {
    // `true` breaks every index read; a name breaks that index alone (the page's listing, not a delete's own reads).
    if (window.__breakReads === true || window.__breakReads === this.name) throw new DOMException('broken for the test', 'UnknownError');
    return getAll.apply(this, a);
  };
};

// Sixty notes over sixty days, three of them about the harbor (a thread), and one a year ago today (the slip).
const SEED = ({ now, day }) => {
  const note = (id, t, body) => ({ id, walk_id: null, t, lat: null, lon: null, segment_id: null, piece_ids: [id], pieces: [{ id, moment_id: id, t, kind: 'text', file_path: null, body }] });
  const rows = [];
  // The first few carry a reaction the owner chose (reactions, decision 0176): the journal draws its marks.
  const typed = (i, m) => { if (i < 6) reactions.push({ moment_id: m.id, family: 'thought', reaction: 'idea', set_at: m.t }); return m; };
  const reactions = [];
  for (let i = 0; i < 60; i++) rows.push(typed(i, note(`n${String(i).padStart(2, '0')}`, now - (i + 2) * day, `A quiet note from a walk around town, the ${i % 2 ? 'second' : 'first'} of its day.`)));
  rows.push(note('h1', now - 50 * day - 1000, 'The harbor at dusk.'), note('h2', now - 40 * day - 1000, 'Harbor lights again.'), note('h3', now - 20 * day - 1000, 'Out to the harbor early.'));
  rows.push(note('year', now - 365 * day, 'First frost on the allotment gate. Nobody about.'));
  const page = (id, t, body) => ({ id, walk_id: null, t, lat: null, lon: null, segment_id: null, piece_ids: [id], pieces: [{ id, moment_id: id, t, kind: 'text', file_path: null, body, body_format: 'md' }] });
  rows.push(page('pagenote', now - 4 * day - 1000, '# Bakery\n\nSmelled it **two** blocks *off*.\n\n- rye\n- warm\n\n- [ ] come back to @[h2|the lights]\n- [x] ask her name\n\nBack to @[h1|the harbor] soon.'));
  rows.push(page('pagelong', now - 5 * day - 1000, Array.from({ length: 30 }, (_, i) => `A paragraph of a lengthy page, the ${i % 2 ? 'even' : 'odd'} kind.`).join('\n\n')));
  rows.push(note('long', now - 3 * day - 1000, 'A long entry, to see how the page carries one: the market was closing and the stallholders were stacking crates, and a man with a trumpet case stood at the corner as if waiting for the square to empty before he would play.'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['moment', 'reaction'], 'readwrite');
      for (const r of rows) tx.objectStore('moment').put(r);
      for (const r of reactions) tx.objectStore('reaction').put(r);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

const stored = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const tx = req.result.transaction(['moment', 'walk'], 'readonly');
    const all = (n) => new Promise((r) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => r(g.result); });
    Promise.all(['moment', 'walk'].map(all)).then(([moments, walks]) => resolve({ moments, walks }));
  };
}));

const box = async (pg, sel) => {
  const b = await pg.locator(sel).filter({ visible: true }).first().boundingBox().catch(() => null);
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
};
const same = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

async function run(h) {
  const { url, BASE, check, shot, tabTo, iconOf } = h;
  const { c, pg } = await h.freshPage('journal', { permissions: ['geolocation', 'microphone'] });
  await c.addInitScript(INIT);
  const shown = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const there = (sel, timeout = 10000) => pg.waitForSelector(sel, { timeout, state: 'visible' }).then(() => true, () => false);
  // A new moment's photo or video opens its editor by itself once kept (ME23, decision 0240): closed, kept as taken.
  const closeEditor = async (p = pg, timeout = 8000) => {
    if (!(await p.waitForSelector('[data-testid=media-editor]', { timeout }).then(() => true, () => false))) return false;
    await p.click('[data-testid=edit-close]').catch(() => {});
    await p.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
    return true;
  };
  const line = '[data-testid=open-line]';
  const input = '[data-testid=line-input]';
  const entries = '[data-testid=journal-page] [data-testid=moment-card]';
  // On the page an entry is written in the composer (JN47, decision 0179): "What's on your mind?" opens it with the
  // caret in its field; where no page shows (a thread, Hidden) the field is in the bar itself.
  const toLine = async () => {
    if ((await pg.locator('[data-testid=composer]').count()) === 0 && (await pg.locator('[data-testid=bar-compose]').filter({ visible: true }).count()) > 0) {
      await pg.click('[data-testid=bar-compose]', { timeout: 8000 }).catch(() => {});
      await pg.waitForTimeout(500);
    }
    await pg.click(input, { timeout: 8000 }).catch(() => {});
  };
  const type = async (text) => {
    await toLine();
    await pg.keyboard.type(text, { delay: 15 });
  };
  const done = async () => {
    if ((await pg.locator('[data-testid=composer]').count()) > 0) await pg.click('[data-testid=line-done]').catch(() => {});
    else await pg.click('[data-testid=line-done]').catch(() => {});
  };
  const scrollTo = (where) => pg.evaluate((w) => {
    const root = document.querySelector('[data-testid=journal-page]');
    const s = root && [root, ...root.querySelectorAll('*')].find((x) => x.scrollHeight > x.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(x).overflowY));
    if (!s) return null;
    if (w === 'top') s.scrollTop = 0;
    else if (w === 'foot') s.scrollTop = s.scrollHeight;
    return { top: s.scrollTop, height: s.scrollHeight, client: s.clientHeight };
  }, where);

  // JN2, JN10, JN11: an empty journal is today's date and the open line; no location read, no keyboard, no prompt.
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await there('[data-testid=memories]', 20000);
  await pg.waitForTimeout(2500);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const empty = {
    path: new URL(pg.url()).pathname,
    headings: await pg.locator('[data-testid=day-heading]').filter({ visible: true }).allInnerTexts(),
    entries: await pg.locator(entries).count(),
    line: await shown('[data-testid=bar-compose]'),
    // The empty page is itself the one thing to tap (JN32); nothing else on the sheet is a button but the line's own
    // row, the camera and the mic (JN34).
    buttons: await pg.locator('[data-testid=journal-page] [role=button]:not([data-testid=line-write]):not([data-testid=line-row] *), [data-testid=journal-page] button:not([data-testid=line-write]):not([data-testid=line-row] *)').filter({ visible: true }).count(),
  };
  check(empty.path === `${BASE}/` && empty.headings.length === 1 && empty.headings[0] === today && empty.entries === 0 && empty.line && empty.buttons === 0,
    `JN2: a journal with nothing kept is today's date and the open line (${JSON.stringify(empty)})`);
  const geoAtLaunch = await pg.evaluate(() => window.__geo.reads);
  check(geoAtLaunch === 0, `JN11: opening the journal reads no location (${geoAtLaunch} reads)`);
  const rest = await pg.evaluate(({ sel, accent }) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const field = document.querySelector('[data-testid=line-input]');
    const out = { placeholder: field?.getAttribute('placeholder') ?? '', focused: document.activeElement === field, loud: [], text: root.innerText.trim() };
    for (const e of [root, ...root.querySelectorAll('*')]) {
      const cs = getComputedStyle(e);
      if ([cs.color, cs.backgroundColor, cs.borderTopColor].includes(accent)) out.loud.push(e.dataset.testid ?? e.tagName);
    }
    // The toolbar's field, camera and mic (JN41): the ways to make an entry, each named.
    out.labels = ['bar-compose', 'band-photo', 'band-voice'].map((id) => {
      const e = document.querySelector(`[data-testid=open-line] [data-testid=${id}]`);
      const r = e?.getBoundingClientRect();
      return { id, label: e?.getAttribute('aria-label'), w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0, x: r ? Math.round(r.x) : -1 };
    });
    return out;
  }, { sel: '[data-testid=empty-page]', accent: ACCENT });
  const notices = await pg.evaluate(() => (window.__notified ?? []).length);
  const hint10 = await pg.locator('[data-testid=bar-compose]').getAttribute('aria-label').catch(() => null);
  check(!!rest && rest.placeholder === '' && hint10 === 'What’s on your mind?' && !rest.focused && rest.loud.length === 0 && !/[0-9?]/.test(rest.text) && notices === 0,
    `JN10 (amended Nov 13, and by JN43): at rest the one hint is the toolbar's "What’s on your mind?", the page carries none; no accent, no number, no question on the page, and the keyboard is not raised (${JSON.stringify(rest)})`);
  check(!!rest && rest.labels.every((l) => l.w >= 44 && l.h >= 44) && rest.labels.map((l) => l.label).join('|') === 'What’s on your mind?|Add a photo or video|Record a voice note'
    && rest.labels[1].x < rest.labels[2].x,
    `JN10 (with JN41): the field, then the toolbar's camera and mic, each a thumb's target with its spoken name (${JSON.stringify(rest?.labels)})`);
  // JN23: the contents button first, then the line, for a screen reader.
  let order = null;
  if (await shown('[data-testid=memories-menu]')) {
    await pg.focus('[data-testid=memories-menu]');
    await pg.keyboard.press('Tab');
    order = await pg.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    await pg.evaluate(() => document.activeElement?.blur?.());
  }
  check(order === 'bar-compose', `JN23 (amended by JN41): after the contents button, the toolbar comes next for a screen reader, its field first (${order})`);
  await shot(pg, 'journal-01-empty');

  // ui 5, ui 6: the toolbar has a boundary that reads as a control's edge, and the contents button says what it is.
  const edge = await pg.locator(line).evaluate((e) => getComputedStyle(e).borderTopColor).catch(() => '');
  check(edge === 'rgb(138, 133, 125)', `chronicle-journal ui 5: the open line's boundary is the control edge colour, 3:1 on the ground (${edge})`);
  const contentsWord = (await pg.locator('[data-testid=memories-menu]').innerText().catch(() => '')).trim();
  check(contentsWord === 'Contents', `chronicle-journal ui 6: the contents button is labelled in words ("${contentsWord}")`);

  // chronicle-journal audit 1: the line rides above the keyboard. Headless has none: the visual viewport is made to
  // report one, as iOS Safari does, and the line must rise by what it covers above the tab bar.
  const kb = async (px) => {
    await pg.evaluate((k) => {
      const vv = window.visualViewport;
      Object.defineProperty(vv, 'height', { configurable: true, get: () => window.innerHeight - k });
      vv.dispatchEvent(new Event('resize'));
    }, px);
    await pg.waitForTimeout(300);
  };
  await pg.waitForTimeout(400);
  const down0 = await box(pg, line);
  await kb(336);
  const up = await box(pg, line);
  await kb(0);
  const down1 = await box(pg, line);
  const belowLine = down0 ? 844 - (down0.y + down0.h) : -1;
  check(!!down0 && !!up && up.y === down0.y - (336 - belowLine) && up.y + up.h === 844 - 336 && same(down0, down1),
    `chronicle-journal audit 1: with a keyboard up the line sits just above it, and comes back down (${JSON.stringify({ down0, up, down1, belowLine })})`);
  await pg.evaluate(() => document.activeElement?.blur?.());
  await pg.waitForTimeout(600);

  // JN12, JN13: the first character begins an entry with one fix; it is kept as it is written; no walk starts.
  let lineAtRest = null; // the bar's box above the tab bar, read once the page is pulled back (JN37)
  await type('A heron');
  // tend captures audit 4: polled from here, since an async predicate in waitForFunction is read once and its wait
  // resolves with that read's value: `begun` was true whatever the store held.
  let begun = false;
  for (let i = 0; i < 24 && !begun; i++) {
    begun = (await stored(pg).catch(() => ({ moments: [] }))).moments.some((m) => /A heron/.test(m.pieces?.[0]?.body ?? ''));
    if (!begun) await pg.waitForTimeout(250);
  }
  const status = (await pg.locator('[data-testid=line-status]').filter({ visible: true }).first().innerText().catch(() => '')).trim();
  check(begun && status === 'Kept as you write' && (await shown('[data-testid=line-done]')),
    `JN13 (with JN48; tend captures audit 4): what is typed is stored with no Save, polled from the test side, and the composer says "Kept as you write" beside Done (${JSON.stringify({ begun, status })})`);
  await pg.keyboard.type(' on the old pier.', { delay: 15 });
  await pg.waitForTimeout(1500);
  await pg.reload();
  await there('[data-testid=memories]', 20000);
  const afterReload = await pg.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((e) => e.innerText.includes('A heron on the old pier.')), entries, { timeout: 10000 }).then(() => true, () => false);
  // The composer does not survive a reload: the words are on the page, and no field is left holding them.
  const lineAfterReload = (await pg.locator(input).count()) === 0 ? '' : await pg.locator(input).inputValue().catch(() => null);
  check(afterReload && lineAfterReload === '', `JN13: after a reload mid-sentence the words sit on the page as an entry and the line is empty (${JSON.stringify({ afterReload, lineAfterReload })})`);
  await pg.waitForTimeout(6000);
  const geo1 = await pg.evaluate(() => ({ ...window.__geo }));
  const s1 = await stored(pg);
  check(s1.moments.length === 1 && s1.walks.length === 0, `JN12: writing began one entry and no walk (${s1.moments.length} moments, ${s1.walks.length} walks)`);

  // JN12: typing then deleting everything keeps nothing, and writing again in the same sitting asks no second fix.
  await pg.evaluate(() => { window.__geo.reads = 0; });
  await type('x');
  await pg.waitForTimeout(700);
  await pg.keyboard.press('Backspace');
  await pg.waitForTimeout(1200);
  const afterEmpty = (await stored(pg)).moments.length;
  await pg.keyboard.type('Second entry of the day.', { delay: 10 });
  await pg.waitForTimeout(1500);
  await done();
  await pg.waitForTimeout(6000);
  const geo2 = await pg.evaluate(() => ({ ...window.__geo }));
  const s2 = await stored(pg);
  check(afterEmpty === 1 && s2.moments.length === 2 && geo2.reads === 1 && geo2.watching === 0,
    `JN12: an emptied entry is not kept, one fix is read for the entry that is, and nothing watches after (${JSON.stringify({ afterEmpty, kept: s2.moments.length, geo1, geo2 })})`);
  const placed = s2.moments.every((m) => m.lat != null);
  const lines1 = await pg.locator('[data-testid=entry-dateline]').filter({ visible: true }).allInnerTexts();
  check(placed && lines1.length === 2 && lines1.every((l) => /^\d{1,2}:\d{2} this (morning|afternoon|evening)|^\d{1,2}:\d{2} tonight/.test(l)),
    `JN5: today's entries are dated by the time and part of the day, and gain their place by their one fix (${JSON.stringify(lines1)})`);

  // chronicle-journal audit 3: emptied and written again at once, the new words are kept in an entry of their own.
  const beforeQuick = (await stored(pg)).moments.length;
  await toLine();
  await pg.keyboard.type('q');
  await pg.keyboard.press('Backspace');
  await pg.keyboard.type('Quick again.', { delay: 5 });
  await pg.waitForTimeout(1500);
  const quickStatus = (await pg.locator('[data-testid=line-status]').filter({ visible: true }).first().innerText().catch(() => '')).trim();
  await done();
  await pg.waitForTimeout(800);
  const afterQuick = (await stored(pg)).moments;
  check(afterQuick.length === beforeQuick + 1 && afterQuick.some((m) => m.pieces.length === 1 && m.pieces[0].body === 'Quick again.') && quickStatus === 'Kept as you write',
    `chronicle-journal audit 3: words typed right after emptying the line are kept, in one new entry (${afterQuick.length - beforeQuick} new, "${quickStatus}")`);
  // SW19 (decision 0197): an entry's top line has no More and no sign of its own; Reaction is in the row under it.
  const topLine = await pg.locator(entries).last().evaluate((e) => ({ more: e.querySelectorAll('[data-testid=moment-more]').length, row: !!e.querySelector('[data-testid=quick-actions]'), react: !!e.querySelector('[data-testid=quick-react]') }));
  check(topLine.more === 0 && topLine.row && topLine.react, `SW19: an entry has no More; its row has Reaction (${JSON.stringify(topLine)})`);

  // JN28-JN30 are retired by the composer (decision 0179): their checks are JN47-JN51's.

  // JN31, JN32: at rest the last entry is on top under its date with the empty page below; a tap on the empty page
  // grows it into the new entry, and Done brings the page back with that entry on top.
  const lay = () => pg.evaluate(() => {
    const vh = window.innerHeight;
    const page = document.querySelector('[data-testid=journal-page]');
    const cards = [...page.querySelectorAll('[data-testid=moment-card]')];
    const r = (e) => { const x = e?.getBoundingClientRect(); return x ? { top: Math.round(x.top), bottom: Math.round(x.bottom), h: Math.round(x.height) } : null; };
    // The date's row, with its ground: what it covers at the top is not seen.
    const heads = [...page.querySelectorAll('[data-testid=day-heading]')].map((e) => ({ ...r(e.parentElement), text: e.innerText })).filter((h) => h.bottom > 0 && h.top < vh).sort((a, b) => a.top - b.top);
    const blank = document.querySelector('[data-testid=line-write]');
    const field = document.querySelector('[data-testid=line-input]');
    const bar = document.querySelector('[data-testid=open-line]');
    return {
      vh, pageTop: Math.round(page.getBoundingClientRect().top), head: heads[0] ?? null, last: r(cards[cards.length - 1]), lastText: cards[cards.length - 1]?.innerText ?? '',
      prev: r(cards[cards.length - 2]), blank: r(blank), field: r(field), bar: r(bar), focused: document.activeElement === field,
    };
  });
  // The page opens on the entry left off at: read it afresh.
  await pg.reload();
  await pg.waitForSelector('[data-testid=bar-compose]', { timeout: 30000 });
  await pg.waitForTimeout(1500);
  const rest3 = await lay();
  const headBottom = rest3.head ? rest3.head.bottom : 0;
  check(!!rest3.head && rest3.head.top - rest3.pageTop < 60 && !!rest3.last && rest3.last.top >= headBottom - 2 && rest3.last.top - headBottom < 40
    && (!rest3.prev || rest3.prev.bottom <= headBottom + 2) && !!rest3.blank && rest3.blank.top >= rest3.last.bottom - 2 && rest3.blank.h >= rest3.vh * 0.3 && !!rest3.bar && rest3.blank.bottom <= rest3.bar.top + 2,
    `JN31: at rest the last entry is on top under its date, nothing older shows, and the empty page fills the rest above the toolbar (JN41) (${JSON.stringify(rest3)})`);
  await shot(pg, 'journal-18-at-rest-peek');
  // JN32, JN33 (writing on the page) are retired by the composer (decision 0179). Entries are still made to fill the page:
  // NY27 below reads "Stack 5", and the held date's edge needs entries passing under it.
  for (let i = 0; i < 5; i++) {
    await toLine();
    await pg.keyboard.type(`Stack ${i + 1}, a line long enough to run over onto a second line of the page.`, { delay: 4 });
    await pg.waitForTimeout(700);
    await done();
    await pg.waitForTimeout(900);
  }
  check((await pg.locator('[data-testid=day-edge]').filter({ visible: true }).count()) >= 1, 'chronicle-journal audit 52: the held date has an edge that entries fade under');
  await shot(pg, 'journal-20-stack');
  // audit 42: coming back to Memories opens on the last entry, not on the stack of the sitting before.
  await pg.click('[data-testid=tab-explore]');
  await pg.waitForTimeout(900);
  await pg.click('[data-testid=tab-chronicle]');
  await pg.waitForTimeout(1500);
  const again42 = await lay();
  check(!!again42.head && !!again42.last && again42.last.top - again42.head.bottom < 40 && again42.last.top >= again42.head.bottom - 2 && (!again42.prev || again42.prev.bottom <= again42.head.bottom + 2),
    `chronicle-journal audit 42: coming back to Memories opens on the last entry (${JSON.stringify(again42)})`);

  // Reactions on the journal (RX6-RX10, RX14) are the `reactions` journey's; what stays here is how the sheet and the
  // panel behave around the rest of the page (note-types audit 56, 63, carried to reactions).
  // note-types audit 63 (More reopens on its list) went with More on entries (SW19, decision 0197).
  // note-types audit 56: the reactions go when Memories is no longer in front (a menu opens), and the bar is whole.
  await toLine();
  await pg.keyboard.type('Let go.', { delay: 10 });
  await pg.waitForTimeout(1300);
  await pg.click('[data-testid=reaction-slot]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(400);
  const up56 = await pg.locator('[data-testid=reaction-panel]').count();
  // With the composer (JN47) the page behind cannot be reached while the reactions are up: closing it is what lets go.
  await done();
  await pg.waitForTimeout(900);
  const gone56 = { row: await pg.locator('[data-testid=reaction-panel]').count(), cam: await pg.locator('[data-testid=band-photo]').count(), mic: await pg.locator('[data-testid=band-voice]').count() };
  check(up56 === 1 && gone56.row === 0 && gone56.cam === 1 && gone56.mic === 1, `note-types audit 56 (with JN48): the reactions go when the composer closes, and the toolbar keeps the camera and the mic (${JSON.stringify({ up56, gone56 })})`);
  await pg.evaluate(() => document.activeElement?.blur?.());
  await done();
  await pg.waitForTimeout(900);
  // chronicle-journal audit 60 (with JN47): back from Threads the page is at its foot, and the toolbar holds its field as ever.
  await pg.evaluate(() => { document.querySelector('[data-testid=journal-page]').scrollTop = 0; });
  await pg.waitForTimeout(700);
  const pen60 = await pg.locator('[data-testid=bar-compose]').count();
  await h.toThreads(pg);
  await pg.waitForTimeout(600);
  await h.toJournal(pg);
  await pg.waitForTimeout(1200);
  const back60 = await pg.locator('[data-testid=bar-compose]').count();
  const foot60 = await pg.evaluate(() => { const r = document.querySelector('[data-testid=journal-page] [data-testid=empty-page]')?.getBoundingClientRect(); return !!r && r.top > 0 && r.top < window.innerHeight; });
  check(pen60 === 1 && back60 === 1 && foot60, `chronicle-journal audit 60 (with JN47): back from Threads the page is at its foot and the toolbar keeps its field (${pen60} -> ${back60}, ${foot60})`);

  // JN3, JN4: no card around an entry; the owner's words in a serif, the app's lines in its sans.
  // The field is the composer's (JN47): opened to read its face, then closed with nothing typed.
  await pg.click('[data-testid=bar-compose]').catch(() => {});
  await pg.waitForTimeout(900);
  const look = await pg.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const cs = getComputedStyle(e);
    const words = e.querySelector('[data-testid=entry-words]');
    const dl = e.querySelector('[data-testid=entry-dateline]');
    const field = document.querySelector('[data-testid=line-input]');
    const head = document.querySelector('[data-testid=day-heading]');
    return {
      border: parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth), bg: cs.backgroundColor, radius: parseFloat(cs.borderTopLeftRadius), image: cs.backgroundImage,
      words: words ? getComputedStyle(words).fontFamily : null, dateline: dl ? getComputedStyle(dl).fontFamily : null,
      field: field ? getComputedStyle(field).fontFamily : null, heading: head ? getComputedStyle(head).fontFamily : null,
    };
  }, entries);
  await done();
  await pg.waitForTimeout(900);
  const serif = (f) => !!f && /serif/i.test(f) && !/sans-serif/i.test(f.replace(/ui-serif|serif\b(?!-)/gi, '')) && /(ui-serif|Georgia|(^|,\s*)serif)/i.test(f);
  check(!!look && look.border === 0 && look.radius === 0 && look.image === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(look.bg),
    `JN3: an entry has no card, border or tile around it (${JSON.stringify(look)})`);
  check(!!look && serif(look.words) && serif(look.field) && !serif(look.dateline) && !serif(look.heading),
    `JN4: the owner's words and the open line are in the serif; the dateline and the day's heading are in the app's sans (${JSON.stringify(look)})`);
  await shot(pg, 'journal-02-two-entries');

  // JN14, JN15: a photo and the line typed under it are one entry; a memo's controls take only the mic's place.
  const before3 = (await stored(pg)).moments.length;
  // tend captures audit 17 (the review's S6, the orchestrator's ruling R16): read frame by frame with the keep held back,
  // Memories' camera holds its shot full screen from the picker's return, and the editor comes over it.
  const kit = heldKit(pg, { fixtures: path.join(h.scriptsDir, 'fixtures'), shot, tag: 'journal' });
  const r17 = kit.read(await kit.capture('[data-testid=band-photo]', 'photo.jpg', 'band-390', 2500, false), 'photo');
  check(kit.whole(r17) && kit.steady(r17) && kit.honest(r17),
    `tend captures audit 17: on Memories a photo from the band covers the page from the frame after its mount until its editor is up, its box still, only ✕ while held (${kit.say(r17)})`);
  await closeEditor(pg, 15000);
  const photoOn = await pg.waitForFunction((sel) => { const all = document.querySelectorAll(sel); const last = all[all.length - 1]; return !!last && !!last.querySelector('[data-testid=entry-piece-photo]'); }, entries, { timeout: 15000 }).then(() => true, () => false);
  await type('Same post as last week.');
  await pg.waitForTimeout(1500);
  // In the composer (JN50): its camera and mic, Stop in the mic's place.
  const restBoxes = { field: await box(pg, input), photo: await box(pg, '[data-testid=band-photo]'), voice: await box(pg, '[data-testid=band-voice]') };
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await there('[data-testid=band-voice-save]', 8000);
  const rec = {
    field: await box(pg, input), photo: await box(pg, '[data-testid=band-photo]'), save: await box(pg, '[data-testid=band-voice-save]'),
    discard: await shown('[data-testid=composer] [data-testid=band-voice-discard]'), timer: await shown('[data-testid=composer] [data-testid=band-voice-timer]'), text: await pg.locator(input).inputValue().catch(() => null),
    onPage: await pg.locator(entries).last().locator('[data-testid=entry-words]').filter({ hasText: 'Same post as last week.' }).count(),
    camera: await pg.locator('[data-testid=band-photo]').getAttribute('aria-disabled').catch(() => 'missing'),
  };
  check(photoOn && !!rec.field && !!rec.photo && rec.photo.x === restBoxes.photo.x && rec.photo.w === restBoxes.photo.w && !!rec.save && rec.save.x === restBoxes.voice.x && rec.discard && rec.timer,
    `JN14: while a note records, only the mic's place changes: the field and the camera keep their boxes (${JSON.stringify({ restBoxes, rec })})`);
  check(rec.text === '' && rec.onPage === 1,
    `chronicle-journal audit 3: the words typed before the mic stand on the page as their own piece once the note starts, so emptying the line cannot remove the entry it records into (${JSON.stringify({ text: rec.text, onPage: rec.onPage })})`);
  check(rec.camera !== 'true', `chronicle-journal audit 14: mid-note the camera is still one tap, not dimmed (aria-disabled ${rec.camera})`);
  await pg.waitForTimeout(1600);
  await pg.click('[data-testid=band-voice-save]').catch(() => {});
  await pg.waitForTimeout(1500);
  await done();
  await pg.waitForTimeout(1200);
  const s3 = await stored(pg);
  const stack = s3.moments.find((m) => m.pieces.some((p) => p.kind === 'photo'));
  const kinds = stack ? stack.pieces.map((p) => p.kind).join(',') : '';
  const lastEntry = await pg.locator(entries).last().evaluate((e) => ({
    datelines: e.querySelectorAll('[data-testid=entry-dateline]').length,
    pieces: [...e.querySelectorAll('[data-testid^=entry-piece-]')].map((p) => p.dataset.testid.replace('entry-piece-', '')),
    marks: e.querySelectorAll('[data-testid=stack-mark]').length,
    kinds: (e.querySelector('[data-testid=stack-kinds]')?.textContent ?? '').trim(),
  })).catch(() => null);
  // Amended by decision 0197 (SW11): a stack shows its face, its words and voice note, the mark and a clause naming its kinds; Show all is only for media behind it, and there is none here.
  const toggles15 = await pg.locator(entries).last().locator('[data-testid=stack-toggle]').count();
  check(s3.moments.length === before3 + 1 && kinds === 'photo,text,voice' && !!lastEntry && lastEntry.datelines === 1 && lastEntry.pieces.join(',') === 'photo,text,voice' && lastEntry.marks === 1 && lastEntry.kinds === 'Holds a photo, a note and a voice note' && toggles15 === 0,
    `JN15: a photo, the line under it and a voice note are one entry under one dateline: its face, the mark and its kinds in words, and no Show all with no media behind it, no count (${JSON.stringify({ kinds, lastEntry, toggles15, moments: s3.moments.length - before3 })})`);
  check(!!lastEntry && lastEntry.pieces.length === 3, `JN3: a moment with several pieces is one entry with its words and voice notes shown, extra photos and videos behind Show all (${JSON.stringify(lastEntry)})`);
  // A voice note plays in line (the owner's call, Nov 13): a play button and a bar on the page, never the viewer.
  const memoRow = pg.locator(entries).last().locator('[data-testid=entry-piece-voice]');
  const hasPlay = await memoRow.locator('[data-testid=entry-voice-play]').count().then((n) => n === 1, () => false);
  const hasBar = await memoRow.locator('[data-testid=entry-voice-bar]').count().then((n) => n === 1, () => false);
  await memoRow.locator('[data-testid=entry-voice-play]').click().catch(() => {});
  await pg.waitForTimeout(1200);
  const viewerOpened = await shown('[data-testid=capture-viewer]');
  const pauseNow = await memoRow.locator('[data-testid=entry-voice-play]').getAttribute('aria-label').catch(() => '');
  check(hasPlay && hasBar && !viewerOpened,
    `journal voice note: it plays in line, with a play button and a progress bar, and pressing play does not open the viewer (${JSON.stringify({ hasPlay, hasBar, viewerOpened, label: pauseNow })})`);
  const memoBox = await memoRow.evaluate((r) => {
    const box = (sel) => { const b = r.querySelector(sel)?.getBoundingClientRect(); return b ? { w: Math.round(b.width), h: Math.round(b.height) } : null; };
    return { play: box('[data-testid=entry-voice-play]'), role: r.querySelector('[data-testid=entry-voice-bar]')?.getAttribute('role'), clock: r.querySelector('[data-testid=entry-voice-time]')?.textContent ?? '' };
  }).catch(() => null);
  check(!!memoBox && !!memoBox.play && memoBox.play.w >= 48 && memoBox.play.h >= 48 && memoBox.role === 'progressbar' && / \/ /.test(memoBox.clock),
    `journal voice audit 13, 14, 16: the play control is 48 pt, the bar is a progress bar, and the clock reads "a / b" while it plays (${JSON.stringify(memoBox)})`);
  await shot(pg, 'journal-20-voice-note-playing');
  // Pause it so the next steps run in silence.
  if (/Pause/.test(pauseNow || '')) await memoRow.locator('[data-testid=entry-voice-play]').click().catch(() => {});
  // JN15: after Done the next piece begins a new entry.
  await type('A new entry after Done.');
  await pg.waitForTimeout(1200);
  await done();
  await pg.waitForTimeout(800);
  const s3b = await stored(pg);
  check(s3b.moments.length === before3 + 2, `JN15: Done ends the entry, and the next words begin a new one (${s3b.moments.length - before3} since the photo)`);
  // JN14: a note under a second is dropped, and opening an entry mid-note saves it first.
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await there('[data-testid=band-voice-save]', 8000);
  await pg.click('[data-testid=band-voice-save]').catch(() => {});
  const short = await pg.waitForFunction(() => /Too short, not kept/.test(document.body.innerText), null, { timeout: 5000 }).then(() => true, () => false);
  const voices0 = (await stored(pg)).moments.flatMap((m) => m.pieces).filter((p) => p.kind === 'voice').length;
  await pg.waitForTimeout(4500);
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await there('[data-testid=band-voice-save]', 8000);
  await pg.waitForTimeout(1600);
  await pg.locator(`${entries} [data-testid=moment-open]`).first().click().catch(() => {});
  await pg.waitForTimeout(2500);
  const voices1 = (await stored(pg)).moments.flatMap((m) => m.pieces).filter((p) => p.kind === 'voice').length;
  check(short && voices1 === voices0 + 1 && !(await shown('[data-testid=band-voice-save]')),
    `JN14: a note under a second is dropped with "Too short, not kept", and opening an entry mid-note saves it first (${JSON.stringify({ short, voices0, voices1 })})`);
  await pg.locator('[data-testid=viewer-close]').click({ timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(600);
  await pg.evaluate(() => document.activeElement?.blur?.());

  // JN16: @ opens the moment picker; the reference is a card on the page; one delete removes it whole.
  await type('Back to ');
  await pg.keyboard.type('@');
  const picker = await there('[data-testid=moment-picker]', 5000);
  await pg.locator('[data-testid=moment-picker] [data-testid=moment-picker-row]').first().click().catch(() => {});
  await pg.waitForTimeout(800);
  const withRef = await pg.locator(input).inputValue().catch(() => '');
  // The picker leaves a space after the reference; one delete takes the space, the next the reference whole.
  await pg.keyboard.press('Backspace');
  await pg.keyboard.press('Backspace');
  await pg.waitForTimeout(300);
  const refGone = await pg.locator(input).inputValue().catch(() => '');
  await pg.keyboard.type('@');
  await there('[data-testid=moment-picker]', 5000);
  await pg.locator('[data-testid=moment-picker] [data-testid=moment-picker-row]').first().click().catch(() => {});
  await pg.waitForTimeout(1500);
  await done();
  await pg.waitForTimeout(1200);
  const refCard = await pg.locator(entries).last().locator('[data-testid=ref-card]').count();
  const refBody = (await stored(pg)).moments.flatMap((m) => m.pieces).some((p) => /Back to @\[[^\]]+\]/.test(p.body ?? ''));
  check(picker && /^Back to @.+/.test(withRef) && refGone === 'Back to ' && refCard === 1 && refBody,
    `JN16: @ opens the picker, the reference is one delete in the line, a card on the page and a token in the note (${JSON.stringify({ picker, withRef, refGone, refCard, refBody })})`);
  await shot(pg, 'journal-03-reference');

  // JN25: the line opens into a page on the same entry: what was typed is there, and what the page adds is the same moment's.
  const beforePage = (await stored(pg)).moments.length;
  await type('Starts in the line');
  await pg.waitForTimeout(1200);
  const pageBtn = await pg.locator('[data-testid=line-page]').filter({ visible: true }).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { label: e.getAttribute('aria-label'), text: e.innerText.trim(), w: Math.round(r.width), h: Math.round(r.height) }; }).catch(() => null);
  // fix journal-note-pages ui 1, ui 2 (as the bar is now, JN28, JN29): the field being written ends above the bar, and
  // Done is the bar's one word, beside icons.
  await shot(pg, 'journal-14-status-row');
  const tall = await pg.evaluate(({ lineSel }) => {
    const f = document.querySelector('[data-testid=line-input]')?.getBoundingClientRect();
    const l = document.querySelector(lineSel)?.getBoundingClientRect();
    const d = document.querySelector('[data-testid=line-done]');
    const t = d && (d.querySelector('[dir]') ?? d);
    return { fieldBottom: f ? Math.round(f.bottom) : null, lineTop: l ? Math.round(l.top) : null, done: t ? Number(getComputedStyle(t).fontWeight) : -1, pageText: document.querySelector('[data-testid=line-page]')?.innerText.replace(/[^A-Za-z]/g, '') ?? null };
  }, { lineSel: line });
  check(tall.fieldBottom != null && tall.fieldBottom <= tall.lineTop + 1, `fix journal-note-pages ui 1: the line being written ends above the bar, never under it (${JSON.stringify(tall)})`);
  check(tall.done >= 600 && tall.pageText === '', `fix journal-note-pages ui 2: Done is the bar's one word; Open as a page is an icon beside it (${JSON.stringify(tall)})`);
  await pg.click('[data-testid=line-page]').catch(() => {});
  const pageUp = await there('[data-testid=note-page] [data-testid=note-input]', 8000);
  await pg.waitForTimeout(800);
  const carried = (await pg.locator('[data-testid=note-page] [data-testid=note-input]').innerText().catch(() => '')).trim();
  await shot(pg, 'journal-13-line-as-page');
  await pg.locator('[data-testid=note-page] [data-testid=note-input]').click().catch(() => {});
  await pg.keyboard.press('Control+End');
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('- rye', { delay: 15 });
  await pg.keyboard.press('Enter');
  await pg.keyboard.type('warm', { delay: 15 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=note-done]').catch(() => {});
  await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  const afterPage = (await stored(pg)).moments;
  const paged = afterPage.find((m) => m.pieces.some((p) => /Starts in the line/.test(p.body ?? '')));
  const pagedPiece = paged?.pieces.find((p) => /Starts in the line/.test(p.body ?? ''));
  const onSheet = await pg.locator(entries).last().evaluate((e) => ({
    words: e.innerText.includes('Starts in the line'), bullets: e.querySelectorAll('[data-testid=entry-block-bullet]').length,
    inView: e.getBoundingClientRect().bottom <= window.innerHeight, raw: /(^|\n)- rye/.test(e.innerText),
  })).catch(() => null);
  // With the composer closed there is no field to hold words (JN49): that is an empty line.
  const lineEmpty = (await pg.locator(input).count()) === 0 ? '' : await pg.locator(input).inputValue().catch(() => null);
  check(!!pageBtn && pageBtn.label === 'Open as a page' && pageBtn.w >= 44 && pageBtn.h >= 44 && pageUp && carried === 'Starts in the line',
    `JN25: while writing, the line offers Open as a page, and the page opens with what was typed (${JSON.stringify({ pageBtn, pageUp, carried })})`);
  check(afterPage.length === beforePage + 1 && pagedPiece?.body_format === 'md' && /- rye/.test(pagedPiece?.body ?? '') && !!onSheet && onSheet.words && onSheet.bullets === 2 && onSheet.inView && !onSheet.raw && lineEmpty === '',
    `JN25: the page wrote on into the same entry, which is back on the sheet at its foot with its list drawn, and the line is empty (${JSON.stringify({ added: afterPage.length - beforePage, format: pagedPiece?.body_format, onSheet, lineEmpty })})`);
  // JN25: from an empty line the same control opens a new page, and an empty page keeps nothing.
  await done();
  await pg.waitForTimeout(600);
  const beforeEmpty = (await stored(pg)).moments.length;
  await toLine();
  await pg.waitForTimeout(300);
  await pg.click('[data-testid=line-page]').catch(() => {});
  const newPageUp = await there('[data-testid=note-page] [data-testid=note-input]', 8000);
  await pg.waitForTimeout(1200);
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(800);
  check(newPageUp && (await stored(pg)).moments.length === beforeEmpty, `JN25: from an empty line Open as a page opens a new page, and one left empty keeps nothing (${newPageUp})`);
  // fix journal-note-pages audit 1: an entry emptied on its page is removed, and words typed right after begin a new
  // entry: they never join the one that is going.
  await type('x');
  await pg.waitForTimeout(900);
  await pg.click('[data-testid=line-page]').catch(() => {});
  await there('[data-testid=note-page] [data-testid=note-input]', 8000);
  await pg.waitForTimeout(600);
  await pg.locator('[data-testid=note-page] [data-testid=note-input]').click().catch(() => {});
  await pg.keyboard.press('Control+A');
  await pg.keyboard.press('Backspace');
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=note-done]').catch(() => {});
  await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(900);
  // The delete's Undo pill waits above the line, never over it: the line can be written in while it is up.
  // With no bar at rest (JN35) the pill is at the foot and clear of the line's row (JN40).
  const pillOver = { pill: await box(pg, '[data-testid=undo-toast]'), line: await box(pg, line) };
  check(!!pillOver.pill && !!pillOver.line && pillOver.pill.y + pillOver.pill.h <= pillOver.line.y, `fix journal-note-pages audit 1: a delete's Undo pill sits above the toolbar (${JSON.stringify(pillOver)})`);
  await type('Second thought, kept.');
  await pg.waitForTimeout(1200);
  await done();
  await pg.waitForTimeout(800);
  await pg.locator('[data-testid=undo-dismiss]').first().click({ timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  const afterGone = (await stored(pg)).moments;
  const second = afterGone.find((m) => m.pieces.some((p) => p.body === 'Second thought, kept.'));
  const secondOnSheet = await pg.locator(entries).filter({ hasText: 'Second thought, kept.' }).count();
  check(!!second && second.pieces.length === 1 && secondOnSheet === 1 && !afterGone.some((m) => m.pieces.some((p) => p.body === 'x')),
    `fix journal-note-pages audit 1: words typed after an emptied page begin a new entry, which stays when the emptied one goes (${JSON.stringify({ kept: !!second, pieces: second?.pieces.length, secondOnSheet })})`);
  await pg.evaluate(() => document.activeElement?.blur?.());

  // JN1, JN2, JN9, JN20: a long journal opens at its foot in book order; the line is fixed; older entries load above.
  await pg.evaluate(SEED, { now: Date.now(), day: DAY });
  // fix entry-jitter: every frame of the launch records where the last entry is, while the sheet is visible at all.
  await c.addInitScript(() => {
    window.__seen = [];
    const t0 = performance.now();
    const tick = () => {
      const root = document.querySelector('[data-testid=journal-page]');
      const cards = root ? [...root.querySelectorAll('[data-testid=moment-card]')] : [];
      if (root && cards.length && Number(getComputedStyle(root).opacity) > 0) window.__seen.push(Math.round(cards[cards.length - 1].getBoundingClientRect().top));
      if (performance.now() - t0 < 8000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await pg.reload();
  await there('[data-testid=memories]', 20000);
  await pg.waitForSelector(entries, { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(2000);
  const seen = await pg.evaluate(() => window.__seen ?? []);
  check(seen.length > 3 && new Set(seen).size === 1,
    `fix entry-jitter 1: on launch the latest entry is first seen where it rests and does not move (${JSON.stringify([...new Set(seen)])} over ${seen.length} frames)`);
  const opened = await pg.evaluate(({ sel, lineSel }) => {
    const cards = [...document.querySelectorAll(sel)];
    const lineBox = document.querySelector(lineSel)?.getBoundingClientRect();
    const last = cards[cards.length - 1]?.getBoundingClientRect();
    const ys = cards.map((e) => e.getBoundingClientRect().y);
    return { drawn: cards.length, lastTop: last ? Math.round(last.top) : null, lastBottom: last ? Math.round(last.bottom) : null, lineTop: lineBox ? Math.round(lineBox.top) : null, inOrder: ys.every((y, i) => i === 0 || y >= ys[i - 1]), lastText: cards[cards.length - 1]?.innerText ?? '' };
  }, { sel: entries, lineSel: '[data-testid=empty-page]' });
  check(opened.drawn > 0 && opened.drawn <= 40 && opened.inOrder && /Second thought, kept\./.test(opened.lastText) && opened.lastTop != null && opened.lastTop > 0 && opened.lastTop < 320 && opened.lastBottom <= opened.lineTop + 1,
    `JN1: a long journal opens at rest on its latest entry, at the top, and draws only its latest page (${JSON.stringify(opened)})`);
  const heads = await pg.locator('[data-testid=day-heading]').allInnerTexts();
  check(heads.length >= 3 && heads.at(-1) === today && new Set(heads).size === heads.length && heads.every((x) => /^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}(, \d{4})?$/.test(x)),
    `JN2: each day with an entry has its date in full once, today's last, and no empty day appears (${heads.slice(-4).join(' | ')})`);
  // The slip is above today's entries, off the resting screen: brought to the middle, with today's date in its own place over it.
  await pg.locator('[data-testid=resurfaced]').evaluate((e) => e.scrollIntoView({ block: 'center' })).catch(() => {});
  await pg.waitForTimeout(500);
  const slip = await pg.evaluate(() => {
    const s = document.querySelector('[data-testid=resurfaced]');
    if (!s) return null;
    const heads = [...document.querySelectorAll('[data-testid=day-heading]')];
    const todayHead = heads[heads.length - 1];
    window.__slipGap = todayHead ? Math.round(s.getBoundingClientRect().top - todayHead.parentElement.getBoundingClientRect().bottom) : -1;
    const firstToday = [...document.querySelectorAll('[data-testid=moment-card]')].find((e) => todayHead && (todayHead.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING));
    return {
      afterHeading: !!todayHead && !!(todayHead.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING),
      beforeEntries: !firstToday || !!(s.compareDocumentPosition(firstToday) & Node.DOCUMENT_POSITION_FOLLOWING),
      label: s.querySelector('[data-testid=resurfaced-label]')?.innerText ?? '', buttons: s.querySelectorAll('[role=button], button').length, text: s.innerText,
      focused: document.activeElement?.getAttribute('data-testid') ?? null,
    };
  });
  check(!!slip && slip.afterHeading && slip.beforeEntries && slip.label.length > 0 && slip.buttons === 2 && slip.focused !== 'line-input',
    `JN20: the resurfaced moment is a slip under today's date, above today's entries, with one tap to open and More (${JSON.stringify(slip)})`);
  const slipGap = await pg.evaluate(() => window.__slipGap);
  check(slipGap >= 12, `chronicle-journal ui 10: the slip's rule stands clear of the date above it, not under it like an underline (${slipGap} px)`);
  await shot(pg, 'journal-04-long-foot');
  // Back to the foot from the slip (it was brought to the middle), where the row is in view.
  await scrollTo('foot');
  await pg.waitForTimeout(900);
  const fixedAtFoot = await box(pg, line);
  const anchor = await pg.locator(entries).first().evaluate((e) => ({ text: e.innerText.slice(0, 60) }));
  const before = await pg.locator(entries).count();
  await scrollTo('top');
  await pg.waitForTimeout(1500);
  const after = await pg.locator(entries).count();
  const anchorVisible = await pg.locator(entries).evaluateAll((els, text) => els.some((e) => e.innerText.startsWith(text) && e.getBoundingClientRect().bottom > 0 && e.getBoundingClientRect().top < window.innerHeight), anchor.text);
  const fixedAtTop = await box(pg, line);
  check(after > before && anchorVisible, `JN1: reaching the top loads older entries above, and the entry that was on screen stays on screen (${before} → ${after}, anchor visible ${anchorVisible})`);
  lineAtRest = fixedAtTop;
  check(!!fixedAtFoot && same(fixedAtFoot, fixedAtTop), `JN9 (with JN41): the toolbar keeps its box at the foot and scrolled back (${JSON.stringify({ fixedAtFoot, fixedAtTop })})`);
  await shot(pg, 'journal-05-scrolled-back');
  const marks54 = await pg.locator('[data-testid=journal-page] [data-testid=reaction-marks]').count();
  // RX9: scrolled back among earlier days, no entry offers the sign on its row.
  const old9 = await pg.evaluate(() => { const c = [...document.querySelectorAll('[data-testid=journal-page] [data-testid=moment-card]')].filter((x) => /A quiet note from a walk/.test(x.innerText)); return { olds: c.length, withSign: c.filter((x) => x.querySelector('[data-testid=reaction-sign]')).length }; });
  check(old9.olds > 0 && old9.withSign === 0, `RX9: an entry of an earlier day offers no sign on its row (${JSON.stringify(old9)})`);
  check(marks54 >= 1, `chronicle-journal audit 54, RX14: a moment's reactions show on its entry in the journal (${marks54} marks)`);
  // JN9, audit 50 (with JN47): scrolled back, the toolbar's field opens the composer in one tap, with no scroll first.
  const field50 = await box(pg, '[data-testid=bar-compose]');
  await pg.click('[data-testid=bar-compose]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(1000);
  const open50 = { composer: (await pg.locator('[data-testid=composer]').count()) === 1, focus: await pg.evaluate(() => document.activeElement?.getAttribute('data-testid')) };
  check(!!field50 && field50.h >= 44 && field50.y < 844 && open50.composer && open50.focus === 'line-input', `chronicle-journal audit 50 (with JN47): pulled back, the toolbar's field opens the composer with the caret in it (${JSON.stringify({ field50, open50 })})`);
  await done();
  await pg.waitForTimeout(900);

  // JN41-JN46 (decision 0178): the capture is a toolbar fixed at the foot: a grey "What's on your mind?" field, the
  // pen, the camera and the mic; the words are written on the page.
  await scrollTo('foot');
  await pg.waitForTimeout(900);
  const INK = 'rgb(29, 36, 48)';
  const inBarNow = (id) => pg.evaluate((id) => !!document.querySelector(`[data-testid=open-line] [data-testid=${id}]`), id);
  // tend chronicle 14: where the field sits in the bar (a thread, a lens), its hint holds one line beside the camera and
  // the mic, at the web's 16 px minimum and in the typed words' serif (ui-patterns, "Nothing wraps on a 320 px phone").
  // The placeholder is measured in the field's own font against the room the field leaves for words.
  const barHint = () => pg.evaluate(() => {
    const bar = document.querySelector('[data-testid=open-line]');
    const f = bar?.querySelector('[data-testid=line-input]');
    if (!f) return null;
    const cs = getComputedStyle(f);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const r = (e) => { const b = e?.getBoundingClientRect(); return b && b.width ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null; };
    const room = f.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return {
      hint: f.getAttribute('placeholder'), empty: f.value === '', size: parseFloat(cs.fontSize), font: cs.fontFamily,
      words: Math.ceil(ctx.measureText(f.getAttribute('placeholder') ?? '').width), room: Math.floor(room),
      field: r(f), photo: r(bar.querySelector('[data-testid=band-photo]')), voice: r(bar.querySelector('[data-testid=band-voice]')),
      over: bar.scrollWidth > bar.clientWidth + 1, vw: window.innerWidth,
    };
  });
  // The room is held to the widest phone serif too, not only this browser's: Android's Noto Serif sets the hint 168 px
  // wide at 16 px (Georgia's metrics, about 156), so at 320 px the field leaves at least 170.
  const hintHolds = (t) => !!t && t.hint === 'What’s on your mind?' && t.empty && t.size >= 16 && /serif/.test(t.font) && t.words <= t.room && t.room >= 170 && !t.over
    && !!t.photo && !!t.voice && t.field.x + t.field.w <= t.photo.x && t.voice.x + t.voice.w <= t.vw
    && [t.photo, t.voice].every((b) => Math.abs(b.y + b.h / 2 - (t.field.y + t.field.h / 2)) <= 4);
  // At 320 and 390 px, a picture of each (the after pictures for the review).
  const hintAt = async (name) => {
    const vp = pg.viewportSize();
    const out = {};
    await pg.evaluate(() => document.activeElement?.blur?.());
    for (const width of [320, 390]) {
      await pg.setViewportSize({ width, height: width === 320 ? 640 : 844 });
      await pg.waitForTimeout(800);
      out[width] = await barHint();
      await shot(pg, `tend-chronicle-14-${name}-${width}`);
    }
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(600);
    return out;
  };
  // tend chronicle audit 8: the bar while typing in it (a thread, the threads), at 320 and 390 px: the walk's mark, the
  // field, Open as a page, the camera, the mic and Done in one row, none over another, Done a 44 pt target.
  const typingRow = () => pg.evaluate(() => {
    const bar = document.querySelector('[data-testid=open-line]');
    const r = (id) => { const e = bar?.querySelector(`[data-testid=${id}]`); const b = e?.getBoundingClientRect(); return b && b.width ? { x: Math.round(b.x * 2) / 2, y: Math.round(b.y), w: Math.round(b.width * 2) / 2, h: Math.round(b.height) } : null; };
    const parts = { dot: r('line-recording'), field: r('line-input'), page: r('line-page'), photo: r('band-photo'), voice: r('band-voice'), done: r('line-done') };
    const row = Object.values(parts).filter(Boolean).sort((a, b) => a.x - b.x);
    return { ...parts, overlap: row.some((b, i) => i > 0 && row[i - 1].x + row[i - 1].w > b.x + 0.5), over: !!bar && bar.scrollWidth > bar.clientWidth + 1, vw: window.innerWidth };
  });
  const rowHolds = (t, { dot = false, tall = false } = {}) => !!t && !!t.field && !!t.page && !!t.photo && !!t.voice && !!t.done && !t.overlap && !t.over
    && t.done.w >= 44 && t.done.h >= 44 && t.done.x + t.done.w <= t.vw && (!dot || !!t.dot) && (!tall || t.field.h >= 120);
  const typingAt = async (name) => {
    const vp = pg.viewportSize();
    const out = {};
    for (const width of [320, 390]) {
      await pg.setViewportSize({ width, height: width === 320 ? 640 : 844 });
      await pg.waitForTimeout(800);
      out[width] = await typingRow();
      await shot(pg, `tend-chronicle-audit-8-${name}-${width}`);
    }
    await pg.setViewportSize(vp);
    await pg.waitForTimeout(600);
    return out;
  };
  const tool = () => pg.evaluate((ink) => {
    const bar = document.querySelector('[data-testid=open-line]');
    const r = (id) => { const e = bar?.querySelector(`[data-testid=${id}]`); const b = e?.getBoundingClientRect(); return b && b.width ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), label: e.getAttribute('aria-label'), ink: [e, ...e.querySelectorAll('*')].some((x) => getComputedStyle(x).color === ink) } : null; };
    const f = bar?.querySelector('[data-testid=bar-compose]');
    const t = f && [...f.querySelectorAll('*')].find((x) => x.childElementCount === 0 && x.textContent.trim());
    return {
      bar: bar ? { y: Math.round(bar.getBoundingClientRect().y), h: Math.round(bar.getBoundingClientRect().height) } : null,
      field: r('bar-compose'), pen: r('bar-write'), photo: r('band-photo'), voice: r('band-voice'), done: r('line-done'),
      text: t ? t.textContent.trim() : null, font: t ? getComputedStyle(t).fontFamily : '', cut: t ? t.scrollWidth > t.clientWidth + 1 : null,
      ground: f ? getComputedStyle(f).backgroundColor : null,
    };
  }, INK);
  const atFoot41 = await tool();
  await scrollTo('top');
  await pg.waitForTimeout(1200);
  const back41 = await tool();
  await shot(pg, 'journal-41-toolbar-pulled-back');
  await scrollTo('foot');
  await pg.waitForTimeout(1200);
  await shot(pg, 'journal-41-toolbar-at-rest');
  const sans = (f) => !/serif/.test(f.replace(/sans-serif/g, ''));
  check(!!atFoot41.field && !atFoot41.pen && !!atFoot41.photo && !!atFoot41.voice && atFoot41.text === 'What’s on your mind?' && sans(atFoot41.font)
    && atFoot41.ground !== 'rgba(0, 0, 0, 0)' && [atFoot41.photo, atFoot41.voice].every((b) => b.w >= 44 && b.h >= 44 && b.ink)
    && atFoot41.field.x < atFoot41.photo.x && atFoot41.photo.x < atFoot41.voice.x
    && atFoot41.field.label === 'What’s on your mind?' && !!back41.bar && same({ ...atFoot41.bar, x: 0, w: 0 }, { ...back41.bar, x: 0, w: 0 }),
    `JN41 (amended by JN47): one toolbar at the foot, the same at rest and pulled back: the grey field "What’s on your mind?" in the sans, then the camera and the mic (${JSON.stringify({ atFoot41, back41: back41.bar })})`);
  // JN43: the page has no placeholder, no "+" and no row of its own.
  const page43 = await pg.evaluate(() => ({ placeholder: document.querySelector('[data-testid=journal-page] [data-testid=line-input]')?.getAttribute('placeholder') ?? null, plus: document.querySelectorAll('[data-testid=line-plus]').length, row: document.querySelectorAll('[data-testid=line-row]').length }));
  check(!page43.placeholder && page43.plus === 0 && page43.row === 0, `JN43: the page carries no placeholder, "+" or row; the toolbar says it (${JSON.stringify(page43)})`);
  // JN42 is retired by the composer (decision 0179): JN47 opens it from the field.
  // JN45: a voice note from the toolbar: pen, timer and Discard lead, the camera keeps its place, Stop in the mic's, no Done.
  const before45 = await tool();
  await pg.click('[data-testid=open-line] [data-testid=band-voice]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  const rec45 = { pen: await inBarNow('bar-write'), timer: await inBarNow('band-voice-timer'), stop: await box(pg, '[data-testid=band-voice-save]'), cam: await box(pg, '[data-testid=open-line] [data-testid=band-photo]'), done: await pg.locator('[data-testid=line-done]').filter({ visible: true }).count() };
  await shot(pg, 'journal-45-recording');
  check(!rec45.pen && rec45.timer && !!rec45.stop && !!before45.voice && rec45.stop.x === before45.voice.x && !!rec45.cam && rec45.cam.x === before45.photo.x && rec45.done === 0,
    `JN45: a voice note records in the toolbar: the timer leads, the camera keeps its place, Stop takes the mic's, no Done (${JSON.stringify({ before45, rec45 })})`);
  await pg.click('[data-testid=band-voice-discard]').catch(() => {});
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=band-voice-undo-act]').catch(() => {});
  await pg.waitForTimeout(1200);
  // JN44: a photo from the toolbar leaves an entry open: Done follows the field; after Done the toolbar is the field,
  // the camera and the mic.
  // tend captures audit 17: the toolbar's camera too (in the composer when it is open, the editor drawn inside it).
  const r17b = kit.read(await kit.capture('[data-testid=open-line] [data-testid=band-photo]', 'photo.jpg', 'band-toolbar-390', 2500, false), 'photo');
  check(kit.whole(r17b) && kit.steady(r17b) && kit.honest(r17b),
    `tend captures audit 17: on Memories a photo from the toolbar (composer ${r17b.composer}) covers the page from the frame after its mount until its editor is up, its box still, only ✕ while held (${kit.say(r17b)})`);
  await closeEditor(pg, 2500);
  await pg.waitForTimeout(1000);
  const open44 = await tool();
  await shot(pg, 'journal-44-entry-open');
  await pg.click('[data-testid=open-line] [data-testid=line-done]').catch(() => {});
  await pg.waitForTimeout(1500);
  const closed44 = await tool();
  check(!!open44.done && !!open44.field && open44.done.x > open44.field.x && !closed44.done && !closed44.pen && !!closed44.field && !!closed44.photo,
    `JN44: with an entry open the toolbar offers Done after the field; after Done it is the field, the camera and the mic (${JSON.stringify({ open44, closed44 })})`);
  // JN46: at 320 px the field's words are whole and the toolbar is one row, at rest and while a note records.
  await pg.setViewportSize({ width: 320, height: 640 });
  await pg.waitForTimeout(1200);
  const narrowRest = await tool();
  await shot(pg, 'journal-46-toolbar-320');
  await pg.click('[data-testid=open-line] [data-testid=band-voice]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  const narrowRec = await pg.evaluate(() => { const b = document.querySelector('[data-testid=open-line]'); return b ? { h: Math.round(b.getBoundingClientRect().height), over: b.scrollWidth > b.clientWidth + 1 } : null; });
  await pg.click('[data-testid=band-voice-discard]').catch(() => {});
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=band-voice-undo-act]').catch(() => {});
  await pg.waitForTimeout(1200);
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(1200);
  const oneRow = (t) => !!t.bar && t.bar.h <= 64 && [t.field, t.photo, t.voice].every((b) => !!b && Math.abs(b.y + b.h / 2 - (t.field.y + t.field.h / 2)) <= 4);
  check(narrowRest.cut === false && oneRow(narrowRest) && !!narrowRec && narrowRec.h <= 64 && !narrowRec.over,
    `JN46: at 320 px "What’s on your mind?" is whole and the toolbar is one row, at rest and while a note records (${JSON.stringify({ narrowRest, narrowRec })})`);

  // tend tabs T61 (from T48 on the walk): the band's discarded note stays, with Undo and a 44 pt Close, until one is used;
  // its words a row with them at 390 px, a line above them at 320; Close keeps nothing.
  const bandPill = () => pg.evaluate(() => {
    const vis = (id) => [...document.querySelectorAll(`[data-testid=${id}]`)].find((e) => e.getBoundingClientRect().width > 0) ?? null;
    const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const pill = vis('band-voice-undo');
    const close = vis('band-voice-close');
    const text = pill ? [...pill.querySelectorAll('div[dir=auto]')].find((e) => /Voice note discarded/.test(e.textContent ?? '')) ?? null : null;
    let lines = 0;
    if (text) { const rg = document.createRange(); rg.selectNodeContents(text); lines = new Set([...rg.getClientRects()].filter((b) => b.width > 0).map((b) => Math.round(b.top))).size; }
    return { pill: r(pill), undo: r(vis('band-voice-undo-act')), close: r(close), text: r(text), lines, name: close?.getAttribute('aria-label') ?? null,
      said: pill?.textContent ?? '', vw: window.innerWidth, over: document.documentElement.scrollWidth - window.innerWidth };
  });
  {
    const inside = (a, b) => !!a && !!b && a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
    const mid = (b) => b.y + b.h / 2;
    const holds = (a) => !!a.pill && !!a.undo && !!a.close && a.close.w >= 44 && a.close.h >= 44 && inside(a.close, a.pill) && inside(a.undo, a.pill)
      && /Voice note discarded/.test(a.said) && a.name === 'Close, it stays discarded' && a.pill.x >= 0 && a.pill.x + a.pill.w <= a.vw && a.over <= 0 && a.lines === 1;
    const row = (a) => !!a.text && !!a.undo && !!a.close && Math.abs(mid(a.text) - mid(a.undo)) <= 3 && Math.abs(mid(a.close) - mid(a.undo)) <= 3;
    const stacked = (a) => !!a.text && !!a.undo && !!a.close && a.text.y + a.text.h <= Math.min(a.undo.y, a.close.y) + 0.5 && Math.abs(mid(a.close) - mid(a.undo)) <= 3;
    const voices = (await stored(pg)).moments.filter((m) => m.pieces.some((x) => x.kind === 'voice')).length;
    await pg.click('[data-testid=open-line] [data-testid=band-voice]').catch(() => {});
    await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    await pg.click('[data-testid=band-voice-discard]').catch(() => {});
    await there('[data-testid=band-voice-undo]', 4000);
    await pg.waitForTimeout(6000);
    const at390 = await bandPill();
    await shot(pg, 't61-band-pill-6s-390');
    await pg.setViewportSize({ width: 320, height: 640 });
    await pg.waitForTimeout(1200);
    const at320 = await bandPill();
    await shot(pg, 't61-band-pill-6s-320');
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForTimeout(1200);
    check(holds(at390) && holds(at320),
      `tend tabs T61: on the band, 6 s after a discard, "Voice note discarded" still has Undo and a 44 pt Close named "Close, it stays discarded" inside the pill, whole on screen at 390 and 320 px (${JSON.stringify({ at390, at320 })})`);
    check(row(at390) && stacked(at320),
      `tend tabs T61: on the band the words, Undo and Close are one row at 390 px, and at 320 px the words are a line above Undo and Close (${JSON.stringify({ at390, at320 })})`);
    const shownBefore = await pg.locator('[data-testid=band-voice-close]').filter({ visible: true }).count();
    await pg.click('[data-testid=band-voice-close]', { timeout: 5000 }).catch(() => {});
    const closed = await pg.waitForSelector('[data-testid=band-voice-undo]', { state: 'detached', timeout: 3000 }).then(() => true, () => false);
    await pg.waitForTimeout(1500);
    const after = (await stored(pg)).moments.filter((m) => m.pieces.some((x) => x.kind === 'voice')).length;
    check(shownBefore === 1 && closed && after === voices, `tend tabs T61: on the band Close takes the pill shown away, and no note is kept (${JSON.stringify({ shownBefore, closed, voices, after })})`);
    // tend tabs audit 72 (U6, the owner's "Stays; list scrolls clear", 0263): at 320 px, 6 s after a discard, the band's
    // staying pill covers no button of the page (the last entry's Reaction, Respond, Thread and Edit among them).
    await pg.setViewportSize({ width: 320, height: 640 });
    await pg.waitForTimeout(1500);
    await pg.click('[data-testid=open-line] [data-testid=band-voice]').catch(() => {});
    await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    await pg.click('[data-testid=band-voice-discard]').catch(() => {});
    await there('[data-testid=band-voice-undo]', 4000);
    await pg.waitForTimeout(6000);
    const covered = await pg.evaluate(() => {
      const p = [...document.querySelectorAll('[data-testid=band-voice-undo]')].find((e) => e.getBoundingClientRect().width > 0);
      const page = document.querySelector('[data-testid=journal-page]');
      if (!p || !page) return null;
      const a = p.getBoundingClientRect();
      const pb = page.getBoundingClientRect();
      const under = [...page.querySelectorAll('[role=button]')].map((b) => ({ b, r: b.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.bottom > pb.top && r.top < pb.bottom)
        .filter(({ r }) => r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top)
        .map(({ b, r }) => ({ name: b.getAttribute('aria-label') ?? b.textContent?.slice(0, 20), y: Math.round(r.y), h: Math.round(r.height) }));
      return { pill: { y: Math.round(a.y), h: Math.round(a.height) }, under };
    });
    await shot(pg, 't61-band-pill-6s-320-discarded-there');
    await pg.click('[data-testid=band-voice-close]', { timeout: 5000 }).catch(() => {});
    await pg.waitForTimeout(800);
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForTimeout(1200);
    check(!!covered && covered.under.length === 0, `tend tabs audit 72: at 320 px, 6 s after a discard, the band's pill covers no button of the page, the list scrolled clear of it (${JSON.stringify(covered)})`);
  }

  // JN47-JN51 (decision 0179): an entry is written in the composer, a sheet over the journal with room to type.
  const sheetState = () => pg.evaluate(() => {
    const c = document.querySelector('[data-testid=composer]');
    const r = (sel) => { const e = c?.querySelector(sel); const b = e?.getBoundingClientRect(); return b && b.width ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null; };
    const sheet = c?.querySelector('[data-testid=composer-sheet]')?.getBoundingClientRect();
    return {
      open: !!c, sheet: sheet ? { y: Math.round(sheet.y), h: Math.round(sheet.height) } : null, vh: window.innerHeight,
      title: c ? (c.innerText.match(/New entry/) ? 'New entry' : null) : null, done: r('[data-testid=line-done]'),
      focused: !!c && c.contains(document.activeElement) && document.activeElement?.getAttribute('data-testid') === 'line-input',
      photo: r('[data-testid=band-photo]'), voice: r('[data-testid=band-voice]'), page: r('[data-testid=line-page]'),
      status: c?.querySelector('[data-testid=line-status]')?.innerText.trim() ?? null,
    };
  });
  await pg.click('[data-testid=bar-compose]').catch(() => {});
  await pg.waitForTimeout(1200);
  const open47 = await sheetState();
  await shot(pg, 'journal-47-composer');
  const hint12 = await pg.locator('[data-testid=composer] [data-testid=line-input]').getAttribute('placeholder').catch(() => null);
  check(hint12 === 'What’s on your mind?', `chronicle-journal ui 12: the empty composer's field says where to write, muted (${hint12})`);
  check(open47.open && !!open47.sheet && open47.sheet.h >= open47.vh * 0.75 && open47.title === 'New entry' && !!open47.done && open47.focused && !!open47.photo && !!open47.voice && !!open47.page,
    `JN47: "What’s on your mind?" opens the composer, filling the room, with "New entry", Done, the caret in its field, the camera, the mic and Open as a page (${JSON.stringify(open47)})`);
  // JN48: kept as typed; Done closes; the entry is at the end of today.
  await pg.keyboard.type('Written in the composer.', { delay: 10 });
  await pg.waitForTimeout(1500);
  const typed48 = { status: (await sheetState()).status, kept: (await stored(pg)).moments.some((m) => m.pieces.some((p) => p.body === 'Written in the composer.')) };
  await shot(pg, 'journal-48-composer-writing');
  await pg.click('[data-testid=line-done]').catch(() => {});
  await pg.waitForTimeout(1500);
  const closed48 = { open: (await sheetState()).open, last: await pg.locator(entries).last().innerText().catch(() => '') };
  // A tap outside keeps and closes too.
  await pg.click('[data-testid=bar-compose]').catch(() => {});
  await pg.waitForTimeout(1000);
  await pg.keyboard.type('Kept by a tap outside.', { delay: 10 });
  await pg.waitForTimeout(800);
  await pg.mouse.click(195, 30);
  await pg.waitForTimeout(1500);
  const outside48 = { open: (await sheetState()).open, last: await pg.locator(entries).last().innerText().catch(() => '') };
  check(typed48.status === 'Kept as you write' && typed48.kept && !closed48.open && /Written in the composer\./.test(closed48.last) && !outside48.open && /Kept by a tap outside\./.test(outside48.last),
    `JN48: the composer keeps words as they are typed and says so; Done or a tap outside closes it, the entry at the end of today (${JSON.stringify({ typed48, closed48, outside48 })})`);
  // JN49: the page is for reading; a tap on the empty page opens the composer, never a caret on the page.
  const field49 = await pg.locator('[data-testid=journal-page] [data-testid=line-input]').count();
  await pg.click('[data-testid=line-write]', { position: { x: 40, y: 60 }, force: true }).catch(() => {});
  await pg.waitForTimeout(1200);
  const tap49 = await sheetState();
  check(field49 === 0 && tap49.open && tap49.focused, `JN49: the page has no field; a tap on the empty page opens the composer (${JSON.stringify({ field49, open: tap49.open, focused: tap49.focused })})`);
  // JN50: a voice note from the composer records there, Stop in the mic's place, the camera still working.
  const mic50 = tap49.voice;
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  const rec50 = { stop: await box(pg, '[data-testid=composer] [data-testid=band-voice-save]'), camOff: await pg.locator('[data-testid=band-photo]').getAttribute('aria-disabled').catch(() => 'missing') };
  await shot(pg, 'journal-50-composer-recording');
  check(!!mic50 && !!rec50.stop && rec50.stop.x === mic50.x && rec50.camOff !== 'true', `JN50: a voice note records in the composer, Stop where the mic was, the camera still working (${JSON.stringify({ mic50, rec50 })})`);
  await pg.click('[data-testid=composer] [data-testid=band-voice-discard]').catch(() => {});
  await pg.waitForTimeout(1200);
  // The discarded note's pill stays until Undo or Close (tend tabs T61): Close, so it is not left over the page.
  await pg.click('[data-testid=band-voice-close]', { timeout: 5000 }).catch(() => {});
  await pg.waitForTimeout(600);
  // JN51: Open as a page carries the words to the note's page; closing it returns to the journal.
  await pg.click(input).catch(() => {});
  await pg.keyboard.type('Long enough for a page.', { delay: 10 });
  await pg.waitForTimeout(1000);
  await pg.click('[data-testid=line-page]').catch(() => {});
  const page51 = await there('[data-testid=note-page] [data-testid=note-input]', 8000);
  await pg.waitForTimeout(800);
  const carried51 = (await pg.locator('[data-testid=note-page] [data-testid=note-input]').innerText().catch(() => '')).trim();
  await pg.click('[data-testid=note-done]').catch(() => {});
  await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  const back51 = { composer: (await sheetState()).open, journal: await shown('[data-testid=journal-page]') };
  check(page51 && carried51 === 'Long enough for a page.' && !back51.composer && back51.journal, `JN51: Open as a page carries the words to the note's page, and closing it returns to the journal (${JSON.stringify({ page51, carried51, back51 })})`);

  // JN26, JN27: an entry the page wrote is drawn in its own shape, natively, and a long one is cut with a line that says so.
  const pageEntry = pg.locator(entries).filter({ hasText: 'Smelled it two blocks off.' });
  await pageEntry.scrollIntoViewIfNeeded().catch(() => {});
  const shape = await pageEntry.evaluate((e) => ({
    heading: [...e.querySelectorAll('[data-testid=entry-block-heading]')].map((x) => x.innerText.trim()),
    bullets: [...e.querySelectorAll('[data-testid=entry-block-bullet]')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()),
    tasks: [...e.querySelectorAll('[data-testid=entry-block-task]')].map((x) => [x.getAttribute('aria-checked'), x.innerText.replace(/\s+/g, ' ').trim(), x.getAttribute('aria-label')]),
    refs: e.querySelectorAll('[data-testid=ref-card]').length,
    raw: /(^|\n)\s*(#|- \[|\*\*)/.test(e.innerText) || /@\[/.test(e.innerText),
    frames: e.querySelectorAll('iframe').length,
    headFont: getComputedStyle(e.querySelector('[data-testid=entry-block-heading] [dir]') ?? e).fontFamily,
    // A mention's card carries its moment's date; the entry's own blocks hold no number the app put there.
    digits: /[0-9]/.test([...e.querySelectorAll('[data-testid^=entry-block-]')].map((x) => { const c = x.cloneNode(true); c.querySelectorAll('[data-testid=ref-card]').forEach((r) => r.remove()); return c.textContent; }).join(' ')),
  })).catch(() => null);
  check(!!shape && shape.tasks.length === 2 && !/@\[/.test(shape.tasks[0][2] ?? '@[') && /come back to the lights/.test(shape.tasks[0][2] ?? ''),
    `fix journal-note-pages audit 7: a checkbox with a mention is spoken as its words, never the token ("${shape?.tasks?.[0]?.[2]}")`);
  await shot(pg, 'journal-15-page-shape');
  const fine = await pageEntry.evaluate((e) => {
    const b = [...e.querySelectorAll('[data-testid=entry-block-bullet]')].map((x) => x.getBoundingClientRect());
    const para = e.querySelector('[data-testid=entry-block-para]')?.getBoundingClientRect();
    const box = e.querySelector('[data-testid=entry-block-task] [dir]');
    return { listGap: b.length > 1 ? Math.round(b[1].top - b[0].bottom) : -1, paraGap: para && b[0] ? Math.round(b[0].top - para.bottom) : -1, box: box ? getComputedStyle(box).color : '' };
  }).catch(() => null);
  check(!!fine && fine.listGap >= 0 && fine.listGap < fine.paraGap && fine.box === 'rgb(89, 98, 115)',
    `fix journal-note-pages ui 6, ui 7: a list's lines sit closer than paragraphs, and a checkbox on the sheet is drawn muted, as something read, not pressed (${JSON.stringify(fine)})`);
  check(!!shape && shape.heading.join('|') === 'Bakery' && shape.bullets.length === 2 && /rye/.test(shape.bullets[0]) && shape.tasks.length === 2
    && shape.tasks[0][0] === 'false' && shape.tasks[1][0] === 'true' && /come back/.test(shape.tasks[0][1]) && shape.refs === 2 && !shape.raw && shape.frames === 0 && /serif/.test(shape.headFont.replace(/sans-serif/g, '')) && !shape.digits,
    `JN26: a page-written entry shows its heading, bullets and checkboxes as native text in the owner's serif, a mention as a card, no raw marks, no count and no web view (${JSON.stringify(shape)})`);
  const longEntry = pg.locator(entries).filter({ hasText: 'A paragraph of a lengthy page' });
  await longEntry.scrollIntoViewIfNeeded().catch(() => {});
  const cut = await longEntry.evaluate((e) => ({
    paras: e.querySelectorAll('[data-testid=entry-block-para]').length,
    more: e.querySelector('[data-testid=entry-goes-on]')?.innerText.trim() ?? null,
    moreFont: e.querySelector('[data-testid=entry-goes-on]') ? getComputedStyle(e.querySelector('[data-testid=entry-goes-on]')).fontFamily : '',
  })).catch(() => null);
  check(!!cut && cut.paras === 12 && cut.more === 'The entry goes on; open it to read the rest' && !/(^|,\s*)(ui-serif|Georgia|serif)/.test(cut.moreFont),
    `JN27: a long entry is cut on the sheet, with a line in the app's voice that it goes on (${JSON.stringify(cut)})`);
  await pg.locator('[data-testid=entry-goes-on]').scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(300);
  await shot(pg, 'journal-12-page-entry');

  // JN5: an earlier day's entry is dated by the clock, with "No location" when no fix ever came.
  const oldLine = await pg.locator(entries).filter({ hasText: 'A long entry' }).locator('[data-testid=entry-dateline]').innerText().catch(() => '');
  check(/^\d{1,2}:\d{2} (am|pm) · No location$/.test(oldLine), `JN5: an earlier day's entry gives the clock time, and "No location" when none was kept ("${oldLine}")`);

  // JN6, JN7: a placed entry's dateline opens Chronicle's Map; an unplaced one is not a button.
  const unplaced = await pg.locator(entries).filter({ hasText: 'A long entry' }).locator('[data-testid=entry-map]').count();
  const placedEntry = pg.locator(entries).filter({ hasText: 'Second entry of the day.' });
  // ui 3: the map is also in the entry's More, and a placed dateline wears a pin.
  const pinGlyph = await placedEntry.locator('[data-testid=entry-map]').innerText().then((t) => iconOf(t.trim()[0] ?? ''), () => '');
  check(/location/.test(pinGlyph), `chronicle-journal ui 3: a placed entry's dateline wears a pin and is the way to the map (${pinGlyph})`);
  await placedEntry.locator('[data-testid=entry-map]').click().catch(() => {});
  const onMap = await pg.waitForSelector('[data-testid=section-map][aria-selected=true]', { timeout: 6000 }).then(() => true, () => false);
  await pg.waitForTimeout(2500);
  const canvas = await pg.locator('canvas.maplibregl-canvas').count();
  check(unplaced === 0 && onMap && canvas === 1, `JN6: a placed entry's dateline shows it on Chronicle's Map; an unplaced entry offers none (${JSON.stringify({ unplaced, onMap, canvas })})`);
  await shot(pg, 'journal-06-on-the-map');
  await pg.click('[data-testid=section-memories]').catch(() => {});
  await there(line, 8000);

  // JN20: the slip's More holds Relive it, Another, Fewer like this and Hide; it stays when an entry is written.
  await pg.locator('[data-testid=resurfaced-more]').click().catch(() => {});
  await there('[data-testid=memory-menu]', 4000);
  await pg.waitForTimeout(800);
  const more = await pg.locator('[data-testid=memory-menu] [role=button]').allInnerTexts().catch(() => []);
  await shot(pg, 'journal-07-slip-more');
  await pg.locator('[data-testid=menu-cancel]').click().catch(() => {});
  await type('Written with the slip on the page.');
  await pg.waitForTimeout(1200);
  const slipStays = await shown('[data-testid=resurfaced]');
  await done();
  check(['Relive it', 'Another', 'Show less like this', 'Not this one'].every((w) => more.some((m) => m.includes(w))) && slipStays,
    `JN20: More holds Relive it, Another, fewer and hide, and the slip keeps its place while an entry is written (${JSON.stringify({ more: more.map((m) => m.split('\n')[0]), slipStays })})`);

  // JN21: the contents opens Threads, Your threads and Hidden, with a way back, and no count.
  await pg.click('[data-testid=memories-menu]').catch(() => {});
  await there('[data-testid=memories-menu-sheet]', 4000);
  await pg.waitForTimeout(800);
  const contents = (await pg.locator('[data-testid=memories-menu-sheet]').innerText().catch(() => '')).replace(/\s+/g, ' ');
  await shot(pg, 'journal-08-contents');
  // tend memories T53 (the owner's yes, Nov 21): the sheet is grouped, the views, the switch, Your data, then Forget my
  // choices set apart at the foot before Close; the switch is drawn as one; the button's spoken name covers Your data.
  const grouping = await pg.evaluate(() => {
    const sheet = document.querySelector('[data-testid=memories-menu-sheet]');
    if (!sheet) return null;
    const order = [...sheet.querySelectorAll('[data-testid^=menu-], [data-testid=memories-menu-divider]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((id) => !/-note$|-hint$/.test(id))
      .map((id) => (id === 'memories-menu-divider' ? '|' : id.replace(/^menu-/, '')));
    const sw = sheet.querySelector('[data-testid=menu-off]');
    const name = document.querySelector('[data-testid=memories-menu]')?.getAttribute('aria-label') ?? '';
    return { order: order.join(' '), drawnSwitch: !!sw?.querySelector('input[type=checkbox], [role=switch] [role=switch]'), name };
  });
  check(grouping?.order === 'threads reactions hidden | off | your-data | forget close' && grouping.drawnSwitch && /^Contents\b/.test(grouping.name) && /your data/i.test(grouping.name),
    `tend memories T53: Contents is grouped (the views, the switch drawn as one, Your data, Forget set apart before Close) and its spoken name covers Your data (${JSON.stringify(grouping)})`);
  // tend memories audit 4: on the web the switch row is the one stop; its drawn switch takes no focus and is not heard,
  // and nothing in the sheet that focus reaches is without a name (WCAG 2.2, 2.4.3 and 4.1.2).
  const stops = await pg.evaluate(() => {
    const sheet = document.querySelector('[data-testid=memories-menu-sheet]');
    if (!sheet) return null;
    const input = sheet.querySelector('[data-testid=menu-off] input');
    const nameless = [...sheet.querySelectorAll('[tabindex], input, button, a[href]')]
      .filter((e) => e.tabIndex >= 0 && !e.disabled)
      .filter((e) => !(e.getAttribute('aria-label') || e.innerText.trim()))
      .map((e) => e.outerHTML.slice(0, 60));
    return { inputTab: input?.tabIndex ?? null, inputHidden: input?.closest('[aria-hidden=true]') ? true : false, nameless };
  });
  check(stops?.inputTab === -1 && stops.inputHidden && stops.nameless.length === 0,
    `tend memories audit 4: Contents' switch is one stop on the web, its drawn switch neither focused nor heard, and every stop has a name (${JSON.stringify(stops)})`);
  // tend memories audit 6: at 200% (a 195 x 422 viewport) every row of the sheet can still be reached, Threads at its top.
  const vp53 = pg.viewportSize();
  await pg.setViewportSize({ width: 195, height: 422 });
  await pg.waitForTimeout(500);
  const reach = await pg.evaluate(() => {
    const t = document.querySelector('[data-testid=menu-threads]');
    const c = document.querySelector('[data-testid=menu-close]');
    if (!t || !c) return null;
    t.scrollIntoView({ block: 'nearest' });
    const top = t.getBoundingClientRect().top;
    c.scrollIntoView({ block: 'nearest' });
    const bottom = c.getBoundingClientRect().bottom;
    return { top: Math.round(top), bottom: Math.round(bottom), height: window.innerHeight };
  });
  await shot(pg, 'journal-08b-contents-200');
  await pg.setViewportSize(vp53);
  await pg.waitForTimeout(500);
  check(!!reach && reach.top >= 0 && reach.bottom <= reach.height + 1,
    `tend memories audit 6: at a 195 x 422 viewport Contents can still be scrolled to Threads at its top and Close at its foot (${JSON.stringify(reach)})`);
  await pg.click('[data-testid=menu-threads]').catch(() => {});
  const threadsUp = await there('[data-testid=threads-screen]', 5000);
  const rail = await shown('[data-testid=threads-rail]');
  const mine = await shown('[data-testid=my-threads]');
  const lineInThreads = same(await box(pg, line), lineAtRest);
  // fix journal-note-pages audit 10: a page opened from the threads and left empty changes nothing: the threads stay.
  await pg.click(input).catch(() => {});
  await pg.click('[data-testid=line-page]').catch(() => {});
  await there('[data-testid=note-page] [data-testid=note-input]', 8000);
  await pg.waitForTimeout(800);
  await pg.keyboard.press('Escape');
  await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(600);
  check(await shown('[data-testid=threads-screen]'), 'fix journal-note-pages audit 10: an empty page opened from the threads and left returns to the threads, not the journal');
  await pg.evaluate(() => document.activeElement?.blur?.());
  await pg.waitForTimeout(400);
  await shot(pg, 'journal-09-threads');
  await pg.locator('[data-testid=threads-rail] [role=button]').first().click().catch(() => {});
  const inThread = await there('[data-testid=thread-screen]', 5000);
  const lineInThread = same(await box(pg, line), lineAtRest);
  // audit 8: a moment's menu inside a thread never offers the slip's Another, even after the slip's More was open.
  await pg.locator('[data-testid=thread-screen] [data-testid=moment-more]').first().click().catch(() => {});
  await there('[data-testid=memory-menu]', 4000);
  const anotherInThread = await pg.locator('[data-testid=memory-menu] [data-testid=resurfaced-another], [data-testid=memory-menu] [data-testid=resurfaced-relive]').count();
  await pg.locator('[data-testid=menu-cancel]').click().catch(() => {});
  await pg.waitForTimeout(400);
  check(inThread && anotherInThread === 0, `chronicle-journal audit 8: a thread moment's menu has no Another or Relive it (${anotherInThread})`);
  const hintInThread = await hintAt('thread');
  check(hintHolds(hintInThread[320]) && hintHolds(hintInThread[390]), `tend chronicle 14: in a thread the toolbar's "What’s on your mind?" holds one line beside the camera and the mic, at 320 and 390 px (${JSON.stringify(hintInThread)})`);
  // audit 15: writing from inside a thread goes back to the page at its foot, where the entry is seen.
  await pg.click(input).catch(() => {});
  await pg.keyboard.type('Written from inside a thread.', { delay: 10 });
  await pg.waitForTimeout(1200);
  const typing8 = await typingAt('thread-typing');
  check(rowHolds(typing8[320]) && rowHolds(typing8[390]), `tend chronicle audit 8: typing in a thread, the bar's field, Open as a page, camera, mic and Done hold one row with Done a 44 pt target, at 320 and 390 px (${JSON.stringify(typing8)})`);
  await pg.keyboard.type(' And a long line after it, to grow the field in the bar to its tallest: the harbor, the lights, the bakery two blocks off, the bridge and the walk home in the rain.', { delay: 2 });
  await pg.waitForTimeout(1200);
  const tall8 = await typingAt('thread-long');
  check(rowHolds(tall8[320], { tall: true }) && rowHolds(tall8[390], { tall: true }) && tall8[320].field.h <= 132, `tend chronicle audit 8: a long line in the bar grows to its tallest and nothing in the row moves over another, at 320 and 390 px (${JSON.stringify(tall8)})`);
  await pg.fill(input, 'Written from inside a thread.').catch(() => {});
  await pg.waitForTimeout(1200);
  await done();
  await pg.waitForTimeout(1000);
  const seenAfterThread = await pg.locator(entries).last().evaluate((e) => { const r = e.getBoundingClientRect(); return e.innerText.includes('Written from inside a thread.') && r.top >= 0 && r.bottom <= window.innerHeight; }).catch(() => false);
  check(seenAfterThread && !(await shown('[data-testid=thread-screen]')), `chronicle-journal audit 15: an entry written from a thread is seen on the page, at its foot (${seenAfterThread})`);
  await pg.locator('[data-testid=thread-back]').click().catch(() => {});
  await pg.locator('[data-testid=threads-back]').click().catch(() => {});
  const backOnPage = await there('[data-testid=journal-page]', 5000);
  check(/Threads/.test(contents) && /Hidden/.test(contents) && !/[0-9]/.test(contents) && threadsUp && rail && mine && inThread && backOnPage,
    `JN21: the contents lists Threads and Hidden with no count; Threads holds the Chronicle's and yours, and Back returns to the page (${JSON.stringify({ contents, threadsUp, rail, mine, inThread, backOnPage })})`);
  check(lineInThreads && lineInThread, `JN9: the open line stays, unmoved, in the threads and in a thread (${JSON.stringify({ lineInThreads, lineInThread })})`);
  // tend chronicle 14: in a lens (the seed's Ideas) the same.
  await pg.click('[data-testid=memories-menu]').catch(() => {});
  await there('[data-testid=memories-menu-sheet]', 4000);
  await pg.waitForTimeout(800);
  await pg.click('[data-testid=menu-reactions]', { timeout: 3000 }).catch(() => {});
  await there('[data-testid=reactions-screen]', 5000);
  await pg.click('[data-testid=lens-row-idea]', { timeout: 3000 }).catch(() => {});
  const inLens = await there('[data-testid=lens-screen]', 5000);
  const hintInLens = await hintAt('lens');
  check(inLens && hintHolds(hintInLens[320]) && hintHolds(hintInLens[390]), `tend chronicle 14: in a lens the toolbar's "What’s on your mind?" holds one line beside the camera and the mic, at 320 and 390 px (${JSON.stringify({ inLens, hintInLens })})`);
  await pg.click('[data-testid=lens-back]').catch(() => {});
  await there('[data-testid=reactions-screen]', 4000);
  await pg.click('[data-testid=reactions-back]').catch(() => {});
  await there('[data-testid=journal-page]', 5000);

  // JN17: nothing inserts on a past page; a response lands at the end and says what it answers.
  // The one field on the page is its last line, after every entry (JN28): nothing writes into a past page.
  const inserts = await pg.locator('[data-testid=journal-page] [data-testid*=insert], [data-testid=journal-page] input, [data-testid=journal-page] textarea:not([data-testid=line-input])').count();
  const countBefore = (await stored(pg)).moments.length;
  await pg.locator(entries).filter({ hasText: 'A long entry' }).locator('[data-testid=moment-open]').click().catch(() => {});
  await there('[data-testid=viewer-close]', 5000);
  await pg.locator('[data-testid=viewer-respond]').click().catch(() => {});
  await pg.waitForSelector('[data-testid=respond-sheet]', { timeout: 4000 }).catch(() => {});
  await pg.click('[data-testid=respond-note]', { timeout: 3000 }).catch(() => {});
  // Respond → Note opens the note's page (note pages, decision 0151).
  await pg.waitForSelector('[data-testid=note-page] [data-testid=note-input]', { timeout: 6000 }).catch(() => {});
  await pg.fill('[data-testid=note-page] [data-testid=note-input]', 'He never did play.').catch(() => {});
  await pg.waitForTimeout(1200);
  await pg.click('[data-testid=note-done]').catch(() => {});
  await pg.waitForTimeout(1500);
  await pg.locator('[data-testid=viewer-close]').click({ timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  const lastNow = await pg.locator(entries).last().evaluate((e) => ({ text: e.innerText, answering: e.querySelector('[data-testid=moment-answering]')?.innerText ?? null })).catch(() => null);
  check(inserts === 0 && (await stored(pg)).moments.length === countBefore + 1 && !!lastNow && lastNow.text.includes('He never did play.') && !!lastNow.answering,
    `JN17: a past page has no way to insert, and a response is a new entry at the end that says what it answers (${JSON.stringify({ inserts, lastNow })})`);

  // JN18: a refused microphone says so above the line, and the line keeps its box; Undo sits above it too.
  await pg.evaluate(() => {
    const md = navigator.mediaDevices;
    window.__gum = md ? md.getUserMedia.bind(md) : null;
    window.__pq = navigator.permissions.query.bind(navigator.permissions);
    const no = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    if (md) md.getUserMedia = no;
    navigator.permissions.query = (d) => (d && d.name === 'microphone' ? Promise.resolve({ state: 'denied', onchange: null, addEventListener() {}, removeEventListener() {} }) : window.__pq(d));
  });
  await pg.click('[data-testid=band-voice]').catch(() => {});
  const err = await there('[data-testid=band-error]', 8000);
  const errBox = await box(pg, '[data-testid=band-error]');
  const lineWithErr = await box(pg, line);
  check(err && !!errBox && !!lineWithErr && errBox.y + errBox.h <= lineWithErr.y && same(lineWithErr, lineAtRest),
    `JN18: a refused microphone is said above the toolbar, which keeps its box (${JSON.stringify({ errBox, lineWithErr })})`);
  await pg.evaluate(() => {
    if (window.__gum) navigator.mediaDevices.getUserMedia = window.__gum;
    navigator.permissions.query = window.__pq;
  });
  await pg.waitForTimeout(6500);
  // JN18's Undo for a hide went with Not this one on entries (SW19, decision 0197).

  // JN22: no texture, no accent, and outside the owner's words only dates, times and a memo's length are digits.
  const restraint = await pg.evaluate(({ accent }) => {
    const root = document.querySelector('[data-testid=memories]');
    const out = { accent: [], image: [], digits: [] };
    if (!root) return out;
    for (const e of [root, ...root.querySelectorAll('*')]) {
      const cs = getComputedStyle(e);
      if ([cs.color, cs.backgroundColor, cs.borderTopColor].includes(accent)) out.accent.push(e.dataset.testid ?? e.tagName);
      if (cs.backgroundImage !== 'none' && !e.closest('[data-testid^=entry-piece-], [data-testid=ref-card], [data-testid=resurfaced]')) out.image.push(e.dataset.testid ?? e.tagName);
    }
    const own = '[data-testid=entry-words], [data-testid=ref-card], [data-testid=line-input], [data-testid=resurfaced]';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest(own)) continue;
      const t = n.nodeValue.replace(/\b\d{1,2}:\d{2}\b/g, '').replace(/\b[A-Z][a-z]+ \d{1,2}(, \d{4})?\b/g, '');
      if (/[0-9]/.test(t)) out.digits.push(n.nodeValue.trim());
    }
    return out;
  }, { accent: ACCENT });
  check(restraint.accent.length === 0 && restraint.image.length === 0 && restraint.digits.length === 0,
    `JN22: no accent colour, no texture, and only dates, times and a memo's length are digits (${JSON.stringify(restraint)})`);

  // JN23: an entry is spoken as its kind, its words and its dateline.
  const spoken = await pg.locator(entries).filter({ hasText: 'A long entry' }).locator('[data-testid=moment-open]').getAttribute('aria-label').catch(() => '');
  check(/^Note, A long entry, .+, \d{1,2}:\d{2} (am|pm) · No location\. Open$/.test(spoken ?? ''), `JN23: an entry is spoken as its kind, its words and its dateline ("${(spoken ?? '').slice(0, 40)}…${(spoken ?? '').slice(-40)}")`);

  // JN9: the line still keeps an entry when the page failed to read, and the entry is drawn there.
  await pg.evaluate(() => { window.__breakReads = 't'; });
  await tabTo(pg, 'explore');
  await tabTo(pg, 'chronicle', 'memories');
  const failed = await there('[data-testid=memories-failed]', 8000);
  // The reads stay broken while the entry is written (audit 6): the page must draw it whole from what the line told it.
  const cardsDown = await pg.locator('[data-testid=memories] [data-testid=moment-card]').count();
  await type('zz');
  await pg.waitForTimeout(800);
  await pg.keyboard.press('Backspace');
  await pg.keyboard.press('Backspace');
  await pg.waitForTimeout(1200);
  const emptiedLeft = (await pg.locator('[data-testid=memories] [data-testid=moment-card]').count()) - cardsDown;
  await type('Kept while the page was down.');
  await pg.waitForTimeout(1500);
  await done();
  await pg.waitForTimeout(1200);
  const stillFailed = await shown('[data-testid=memories-failed]');
  const keptDown = (await stored(pg)).moments.some((m) => m.pieces.some((p) => p.body === 'Kept while the page was down.'));
  const drawnDown = await pg.locator('[data-testid=memories] [data-testid=moment-card]').filter({ hasText: 'Kept while the page was down.' }).count();
  check(failed && (await pg.locator('[data-testid=band-photo]').filter({ visible: true }).count()) === 1, 'JN35: a page that failed to read opens with the camera and the mic one tap away');
  check(failed && keptDown && drawnDown === 1, `JN9: on the failed page the line keeps an entry, and it is drawn there (${JSON.stringify({ failed, keptDown, drawnDown })})`);
  check(stillFailed && drawnDown === 1 && emptiedLeft === 0,
    `chronicle-journal audit 6: with reads still failing, the entry drawn holds every word, and an emptied one leaves (${JSON.stringify({ stillFailed, drawnDown, emptiedLeft })})`);
  await pg.waitForTimeout(600);
  await shot(pg, 'journal-10-failed-page');
  // ui 8: read again, the page comes back whole and at its foot.
  await pg.evaluate(() => { window.__breakReads = false; });
  await pg.locator('[data-testid=memories-failed] [role=button]').click().catch(() => {});
  await pg.waitForSelector('[data-testid=memories-failed]', { state: 'detached', timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  const atFootAgain = await pg.locator(entries).last().evaluate((e) => { const r = e.getBoundingClientRect(); return e.innerText.includes('Kept while the page was down.') && r.bottom <= window.innerHeight && r.bottom > 0; }).catch(() => false);
  check(atFootAgain, `chronicle-journal ui 8: after Try again the page is back at its foot, on the latest entry (${atFootAgain})`);

  // JN24: the section bar and its other sections are as before; none shows the line.
  const sections = {};
  for (const s of ['walks', 'days', 'map', 'media']) {
    await pg.click(`[data-testid=section-${s}]`).catch(() => {});
    await pg.waitForTimeout(800);
    sections[s] = { selected: await pg.locator(`[data-testid=section-${s}][aria-selected=true]`).count(), line: await shown(line) };
  }
  await pg.click('[data-testid=section-memories]').catch(() => {});
  check(Object.values(sections).every((v) => v.selected === 1 && v.line === false), `JN24: Walks, Days, Map and Media open as before, without the open line (${JSON.stringify(sections)})`);

  // JN8, JN7: with a walk minimized, an entry written in the journal shows on the page at once, belongs to the
  // walk, and stays when the walk stops; then its "From ..." line opens the replay.
  await tabTo(pg, 'navigate');
  await pg.waitForSelector('[data-testid=start]', { timeout: 15000 });
  await pg.click('[data-testid=start]');
  await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 15000 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=walk-minimize]').catch(() => {});
  await there('[data-testid=recording-bar]', 10000);
  for (let i = 0; i < 6; i++) {
    await c.setGeolocation({ longitude: h.at(-1 + i * 0.12, -1.5)[0], latitude: h.at(-1 + i * 0.12, -1.5)[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  await tabTo(pg, 'chronicle', 'memories');
  await there('[data-testid=bar-compose]', 8000);
  const walk = await h.openWalk(pg);
  await pg.evaluate(() => { window.__geo.reads = 0; });
  await type('Written on the walk.');
  await pg.waitForTimeout(1500);
  await done();
  await pg.waitForTimeout(1500);
  const onPage = await pg.locator(entries).filter({ hasText: 'Written on the walk.' }).count();
  const walkRow = (await stored(pg)).moments.find((m) => m.pieces.some((p) => p.body === 'Written on the walk.'));
  const barCam = await shown('[data-testid=bar-photo]');
  const lineBox = await box(pg, line);
  const barBox = await box(pg, '[data-testid=recording-bar]');
  const toast = await shown('[data-testid=band-toast]');
  const geoOnWalk = await pg.evaluate(() => window.__geo.reads);
  const walkLine = await pg.locator(entries).filter({ hasText: 'Written on the walk.' }).locator('[data-testid=entry-dateline]').innerText().catch(() => '');
  check(geoOnWalk === 0 && !/No location/.test(walkLine), `chronicle-journal audit 7: an entry on an open walk asks for no fix and never says No location (${geoOnWalk} reads, "${walkLine}")`);
  check(onPage === 1 && !!walk && walkRow?.walk_id === walk.id && !toast,
    `JN8: an entry written with a walk minimized is on the page at once and is the walk's, with no toast (${JSON.stringify({ onPage, walk: walk?.id, row: walkRow?.walk_id, toast })})`);
  check(!barCam && !!lineBox && !!barBox && lineBox.y + lineBox.h <= barBox.y + 1, `JN24 (with JN41): the toolbar sits above the recording bar, which shows no camera on Memories (${JSON.stringify({ barCam, lineBox, barBox })})`);
  await shot(pg, 'journal-11-walk-minimized');
  // audit 53: while writing with a walk recording, the bar says so (the recording bar is folded away).
  await toLine();
  await pg.waitForTimeout(700);
  const rec53 = await pg.evaluate(() => { const e = document.querySelector('[data-testid=line-recording]'); return e ? e.getAttribute('aria-label') : null; });
  const head13 = await pg.evaluate(() => document.querySelector('[data-testid=composer] [role=heading]')?.textContent?.trim() ?? null);
  check(head13 === 'New entry, on a walk', `chronicle-journal ui 13: on a walk the composer says so in words beside its mark (${head13})`);
  check(rec53 === 'Walk recording', `chronicle-journal audit 53 (with JN47): writing on a walk, the composer keeps the recording's mark (${rec53})`);
  await shot(pg, 'journal-21-writing-on-a-walk');
  await done();
  await pg.waitForTimeout(900);
  // tend chronicle audit 8: on a walk, the bar's field in the threads shows the walk's mark while it has the caret.
  await h.toThreads(pg);
  await there('[data-testid=threads-screen]', 5000);
  await pg.click(input).catch(() => {});
  await pg.waitForTimeout(800);
  const walk8 = await typingAt('walk-typing');
  check(rowHolds(walk8[320], { dot: true }) && rowHolds(walk8[390], { dot: true }), `tend chronicle audit 8: on a walk the bar keeps the walk's mark beside the field, and the row holds, at 320 and 390 px (${JSON.stringify(walk8)})`);
  await pg.evaluate(() => document.activeElement?.blur?.());
  await pg.waitForTimeout(600);
  await h.toJournal(pg);
  await there('[data-testid=journal-page]', 5000);
  await pg.click('[data-testid=recording-return]').catch(() => {});
  await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  // A capture's pin on the walk's map is labelled "... Open".
  const onWalkScreen = await pg.locator('[aria-label$=". Open"]').count();
  await pg.click('[data-testid=walk-minimize]').catch(() => {});
  await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 10000 }).catch(() => {});
  // tend tabs T61: a note discarded on the band with the walk open, then the bar's Stop: the band's pill goes, and no
  // note lands in the ended walk.
  const walkVoices = async () => (await stored(pg)).moments.filter((m) => m.walk_id === walk?.id && m.pieces.some((x) => x.kind === 'voice')).length;
  const voicesT61 = await walkVoices();
  await pg.click('[data-testid=open-line] [data-testid=band-voice]', { timeout: 5000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=band-voice-discard]').catch(() => {});
  const pillT61 = await there('[data-testid=band-voice-undo]', 4000);
  // Read frame by frame from the hold on, since the replay may come over the page as the walk ends: the band's pill and the
  // journal page, each frame.
  await pg.evaluate(() => {
    window.__t61 = [];
    const t0 = performance.now();
    const tick = () => {
      window.__t61.push({ t: Math.round(performance.now() - t0), page: !!document.querySelector('[data-testid=journal-page]') && !/replay/.test(location.pathname),
        pill: [...document.querySelectorAll('[data-testid=band-voice-undo]')].some((e) => e.getBoundingClientRect().width > 0),
        // tend tabs audit 70: the bar's Stop under way (its spoken name while it stops).
        stopping: [...document.querySelectorAll('[data-testid=bar-stop]')].some((e) => e.getAttribute('aria-label') === 'Stopping…') });
      if (performance.now() - t0 < 15000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const sb = await pg.locator('[data-testid=bar-stop]').boundingBox().catch(() => null);
  if (sb) {
    await pg.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1100);
    await pg.mouse.up();
  }
  await pg.waitForURL(/replay/, { timeout: 30000 }).catch(() => {});
  // The pill went while the journal still showed (a frame with the page and no pill), not only with the page.
  const frames61 = await pg.evaluate(() => window.__t61 ?? []).catch(() => []);
  const lastPage = frames61.filter((f) => f.page).pop();
  const pillGone = frames61.find((f) => f.page && !f.pill) ?? null;
  const pillLeft = lastPage ? lastPage.pill : null;
  await pg.waitForURL(/replay/, { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  const voicesAfterT61 = await walkVoices();
  // tend tabs audit 70 (F4): from the first frame the bar's Stop is under way, the band shows no Undo.
  const stopFrom = frames61.findIndex((f) => f.stopping);
  const undoWhileStopping = stopFrom < 0 ? null : frames61.slice(stopFrom).filter((f) => f.page && f.pill).length;
  check(stopFrom >= 0 && undoWhileStopping === 0 && voicesAfterT61 === voicesT61,
    `tend tabs audit 70: a note discarded on the band, then the bar's Stop: from the frame the Stop is under way the band shows no Undo, and no note lands in the ended walk (${JSON.stringify({ stopAt: stopFrom < 0 ? null : frames61[stopFrom].t, undoWhileStopping, voicesT61, voicesAfterT61 })})`);
  check(pillT61 && !!pillGone && pillLeft === false && voicesAfterT61 === voicesT61,
    `tend tabs T61: a note discarded on the band, then the walk stopped from the bar: the band's pill goes as the walk ends, while the journal still shows, and the ended walk holds no discarded note (${JSON.stringify({ pillT61, pillGoneAt: pillGone?.t ?? null, pageLastAt: lastPage?.t ?? null, voicesT61, voicesAfterT61 })})`);
  await pg.goto(url);
  await there('[data-testid=memories]', 20000);
  await pg.waitForSelector(entries, { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  const walkEntry = pg.locator(entries).filter({ hasText: 'Written on the walk.' });
  const stays = await walkEntry.count();
  const from = await walkEntry.locator('[data-testid=moment-walk]').innerText().catch(() => '');
  const dl = await walkEntry.locator('[data-testid=entry-dateline]').innerText().catch(() => '');
  await walkEntry.locator('[data-testid=moment-walk]').click().catch(() => {});
  const replay = await pg.waitForURL(/\/replay\//, { timeout: 8000 }).then(() => true, () => false);
  check(stays === 1 && onWalkScreen >= 1, `JN8: the entry stays on the page when the walk stops, and showed on the walk screen (${JSON.stringify({ stays, onWalkScreen })})`);
  check(/^From /.test(from) && replay && /(At the start| in)\b/.test(dl), `JN7: an entry from a finished walk says how far in it was made and links to its walk's replay (${JSON.stringify({ from, dl, replay })})`);

  await c.close();
  await placesLoading(h);
}

// fix entry-jitter 2 (the owner's phone, Nov 14): a voice note at the foot jittered up and down on launch until its
// place was read. Every entry's place is read after the page opens, and an entry that grew pushed the one in view down
// on a browser with no scroll anchoring (iOS Safari), until the sheet was taken back to its end after the frame. The
// streets are on the device, so the places arrive at once, one by one; Chromium's anchoring is turned off.
async function placesLoading(h) {
  const { c, pg } = await h.freshPage('journal-places', { permissions: ['geolocation', 'microphone'] });
  const [lon, lat] = [-71.4, 41.82];
  await pg.goto(h.url);
  await pg.waitForSelector('[data-testid=memories]', { timeout: 30000 });
  await pg.waitForTimeout(1500);
  await pg.evaluate(({ lon, lat }) => new Promise((resolve, reject) => {
    // A street long enough to wrap a dateline at 390 px, in the tiles `getSegmentsIn` reads around the entries.
    const name = 'Wickenden Street by the old harbour steps where the ferry used to land on Sundays in summer';
    const segs = ['4942,6092', '4942,6093'].map((tile, i) => ({ id: `jit-seg${i}`, name, kind_detail: 'residential', length_m: 400, geometry: [[[lon - 0.003, lat], [lon + 0.003, lat]]], build: 'x', tile }));
    const now = Date.now();
    const mk = (id, t, kind, body) => ({ id, walk_id: null, t, lat: lat + 0.00002, lon, segment_id: null, piece_ids: [id], pieces: [{ id, moment_id: id, t, kind, file_path: kind === 'voice' ? `memo-${id}` : null, body, lat: lat + 0.00002, lon }] });
    const rows = Array.from({ length: 10 }, (_, i) => mk(`jit${i}`, now - (i + 1) * 0.4 * 86400000, 'text', `A note from around town, number ${i}.`));
    rows.push(mk('jit-voice', now - 60000, 'voice', '42000'));
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['moment', 'street_segment'], 'readwrite');
      for (const r of rows) tx.objectStore('moment').put(r);
      for (const g of segs) tx.objectStore('street_segment').put(g);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  }), { lon, lat });
  await c.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = '* { overflow-anchor: none !important; }';
      document.head.appendChild(st);
    });
    window.__seen = [];
    const t0 = performance.now();
    const tick = () => {
      const root = document.querySelector('[data-testid=journal-page]');
      const cards = root ? [...root.querySelectorAll('[data-testid=moment-card]')] : [];
      const last = cards[cards.length - 1];
      if (last && Number(getComputedStyle(root).opacity) > 0) {
        window.__seen.push({ top: Math.round(last.getBoundingClientRect().top), line: last.querySelector('[data-testid=entry-dateline]')?.textContent ?? '' });
      }
      if (performance.now() - t0 < 8000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await pg.reload();
  await pg.waitForSelector('[data-testid=journal-page] [data-testid=moment-card]', { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(4000);
  const seen = await pg.evaluate(() => window.__seen ?? []);
  const tops = [...new Set(seen.map((x) => x.top))];
  const placed = seen.some((x) => x.line.includes('Wickenden Street'));
  h.check(seen.length > 3 && placed && tops.length === 1,
    `fix entry-jitter 2: as the places are read on launch the voice note at the foot stays where it rests, its own place included (${JSON.stringify({ tops, placed, frames: seen.length })})`);
  await c.close();
}

module.exports = {
  name: 'journal',
  covers: [
    'src/components/journal/**',
    'src/lib/journal/**',
    'src/components/chronicle/MemoriesScreen.tsx',
    'src/components/chronicle/MemoriesMenu.tsx',
    'src/components/chronicle/MemoryMenu.tsx',
    'src/components/MomentBar.tsx',
    'src/components/walk/CaptureStack.tsx',
  ],
  run,
};
