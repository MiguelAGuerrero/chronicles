// Chronicle journal, cut 1 (JN1-JN24, decision 0155): Memories is a journal page in book order, ending in an
// open line where writing, a photo or a voice note is the capture. Its own browser: an empty journal first,
// then seeded entries, then a walk minimized. E2E_ONLY=journal runs it alone.

const path = require('path');

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
  // The first few carry a type the owner chose (note types, decision 0161): the journal draws its mark.
  const typed = (i, m) => { if (i < 6) m.pieces[0].note_type = 'idea'; return m; };
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
      const tx = req.result.transaction(['moment'], 'readwrite');
      for (const r of rows) tx.objectStore('moment').put(r);
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
  const line = '[data-testid=open-line]';
  const input = '[data-testid=line-input]';
  const entries = '[data-testid=journal-page] [data-testid=moment-card]';
  // On the page the bar's pen brings today's foot up and puts the caret there (JN29); where no page shows (a thread,
  // Hidden) the field is in the bar itself.
  // A pill above the bar (room left, the edit offer) can sit over the middle of the empty page: tap its first lines.
  const toLine = async () => {
    if (await pg.locator('[data-testid=line-write]').filter({ visible: true }).count()) await pg.click('[data-testid=line-write]', { position: { x: 40, y: 16 }, timeout: 5000, force: true }).catch(() => {});
    else await pg.click(input).catch(() => {});
  };
  const type = async (text) => {
    await toLine();
    await pg.keyboard.type(text, { delay: 15 });
  };
  const done = () => pg.click('[data-testid=line-done]').catch(() => {});
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
    line: await shown(line),
    // The empty page is itself the one thing to tap (JN32); nothing else on the sheet is a button.
    buttons: await pg.locator('[data-testid=journal-page] [role=button]:not([data-testid=line-write]), [data-testid=journal-page] button:not([data-testid=line-write])').filter({ visible: true }).count(),
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
    out.labels = ['line-write', 'band-photo', 'band-voice'].map((id) => {
      const e = document.querySelector(`[data-testid=${id}]`);
      const r = e?.getBoundingClientRect();
      // The empty page takes the finger; the field on it carries the spoken name, once (audit 44).
      const named = id === 'line-write' ? document.querySelector('[data-testid=line-input]') : e;
      return { id, label: named?.getAttribute('aria-label'), w: r ? Math.round(r.width) : 0, h: r ? Math.round(r.height) : 0, x: r ? Math.round(r.x) : -1 };
    });
    return out;
  }, { sel: line, accent: ACCENT });
  const notices = await pg.evaluate(() => (window.__notified ?? []).length);
  check(!!rest && rest.placeholder === '' && !rest.focused && rest.loud.length === 0 && !/[0-9?]/.test(rest.text) && notices === 0,
    `JN10: at rest the line has no hint, no accent, no number, no question, and the keyboard is not raised (${JSON.stringify(rest)})`);
  check(!!rest && rest.labels.every((l) => l.w >= 44 && l.h >= 44) && rest.labels.map((l) => l.label).join('|') === 'Write an entry|Add a photo or video|Record a voice note'
    && rest.labels[0].x < rest.labels[1].x && rest.labels[1].x < rest.labels[2].x,
    `JN10: the field, the camera and the mic, in that order, each a thumb's target with its spoken name (${JSON.stringify(rest?.labels)})`);
  // JN23: the contents button first, then the line, for a screen reader.
  let order = null;
  if (await shown('[data-testid=memories-menu]')) {
    await pg.focus('[data-testid=memories-menu]');
    await pg.keyboard.press('Tab');
    order = await pg.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    await pg.evaluate(() => document.activeElement?.blur?.());
  }
  check(order === 'band-photo', `JN23: after the contents button, the bar's camera comes next for a screen reader (${order})`);
  await shot(pg, 'journal-01-empty');

  // ui 5, ui 6: the line has a boundary that reads as a control's edge, and the contents button says what it is.
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

  // JN12, JN13: the first character begins an entry with one fix; it is kept as it is written; no walk starts.
  const lineAtRest = await box(pg, line);
  await type('A heron');
  const begun = await pg.waitForFunction(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => { const g = req.result.transaction('moment').objectStore('moment').getAll(); g.onsuccess = () => resolve(g.result.some((m) => /A heron/.test(m.pieces?.[0]?.body ?? ''))); };
  }), null, { timeout: 6000 }).then(() => true, () => false);
  const status = (await pg.locator('[data-testid=line-status]').filter({ visible: true }).first().innerText().catch(() => '')).trim();
  check(begun && status === 'Kept as you write' && (await shown('[data-testid=line-done]')),
    `JN13: what is typed is stored with no Save, and the line says "Kept as you write" beside Done (${JSON.stringify({ begun, status })})`);
  await pg.keyboard.type(' on the old pier.', { delay: 15 });
  await pg.waitForTimeout(1500);
  await pg.reload();
  await there('[data-testid=memories]', 20000);
  const afterReload = await pg.waitForFunction((sel) => [...document.querySelectorAll(sel)].some((e) => e.innerText.includes('A heron on the old pier.')), entries, { timeout: 10000 }).then(() => true, () => false);
  const lineAfterReload = await pg.locator(input).inputValue().catch(() => null);
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
  await pg.click(input).catch(() => {});
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
  // ui 4: an entry's More sits on its dateline's row, trailing.
  const headRow = await pg.locator(entries).last().evaluate((e) => {
    const d = e.querySelector('[data-testid=entry-dateline]').getBoundingClientRect();
    const m = e.querySelector('[data-testid=moment-more]').getBoundingClientRect();
    return { dateline: Math.round(d.y + d.height / 2), more: Math.round(m.y + m.height / 2), right: Math.round(m.right), w: Math.round(m.width), h: Math.round(m.height) };
  }).catch(() => null);
  check(!!headRow && Math.abs(headRow.dateline - headRow.more) <= 22 && headRow.w >= 44 && headRow.h >= 44,
    `chronicle-journal ui 4: More trails the dateline on the entry's first row, a thumb's target (${JSON.stringify(headRow)})`);

  // JN28-JN30: the words are written on the page, one bar at the foot, and the tabs fold away while writing.
  await pg.click('[data-testid=line-write]', { position: { x: 40, y: 16 }, timeout: 5000, force: true }).catch(() => {});
  await pg.keyboard.type('On the page itself.', { delay: 10 });
  await pg.waitForTimeout(900);
  const penOn = await pg.evaluate(() => {
    const f = document.querySelector('[data-testid=line-input]');
    const bar = document.querySelector('[data-testid=open-line]');
    const page = document.querySelector('[data-testid=journal-page]');
    if (!f || !bar || !page) return null;
    const cs = getComputedStyle(f);
    const r = f.getBoundingClientRect();
    const b = bar.getBoundingClientRect();
    const cards = [...page.querySelectorAll('[data-testid=moment-card]')];
    const last = cards[cards.length - 1];
    const row = [...bar.querySelectorAll('[data-testid=line-status], [data-testid=line-page], [data-testid=band-photo], [data-testid=band-voice], [data-testid=line-done]')].map((e) => { const x = e.getBoundingClientRect(); return { id: e.dataset.testid, y: Math.round(x.y + x.height / 2), w: Math.round(x.width), h: Math.round(x.height) }; });
    return {
      inPage: page.contains(f), inBar: bar.contains(f), focused: document.activeElement === f,
      width: Math.round(r.width), pageWidth: Math.round(page.getBoundingClientRect().width),
      outline: cs.outlineStyle, shadow: cs.boxShadow, border: parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth), font: cs.fontFamily,
      underEntry: !!last && r.top >= last.getBoundingClientRect().top, aboveBar: r.bottom <= b.top + 1,
      barH: Math.round(b.height), row,
      tabs: [...document.querySelectorAll('[data-testid=tab-bar-wrap]')].filter((e) => e.getBoundingClientRect().height > 1 && getComputedStyle(e).display !== 'none').length,
      barBottom: Math.round(window.innerHeight - b.bottom),
    };
  });
  check(!!penOn && penOn.inPage && !penOn.inBar && penOn.focused && penOn.width >= penOn.pageWidth - 60 && penOn.outline === 'none' && penOn.shadow === 'none' && penOn.border === 0 && /serif/.test((penOn.font ?? '').replace(/sans-serif/g, '')) && penOn.underEntry && penOn.aboveBar,
    `JN28: the words are written on the page: the field is the page's last line, full width, in the serif, with no box or focus frame (${JSON.stringify(penOn)})`);
  check(!!penOn && penOn.row.length === 5 && penOn.row.every((x) => Math.abs(x.y - penOn.row[0].y) <= 2) && penOn.row.filter((x) => x.id !== 'line-status').every((x) => x.w >= 44 && x.h >= 44) && penOn.barH <= 64,
    `JN29: while writing the bar is one row: the status, Open as a page, the camera, the mic and Done (${JSON.stringify(penOn?.row)}, ${penOn?.barH} px)`);
  check(!!penOn && penOn.tabs === 0 && penOn.barBottom <= 1, `JN30: while writing the tab bar folds away and the bar sits at the foot, on the keyboard (${JSON.stringify({ tabs: penOn?.tabs, barBottom: penOn?.barBottom })})`);
  await shot(pg, 'journal-16-writing-on-the-page');
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(500);
  const narrow = await pg.evaluate(() => { const bar = document.querySelector('[data-testid=open-line]'); return bar ? { h: Math.round(bar.getBoundingClientRect().height), over: bar.scrollWidth > bar.clientWidth + 1 } : null; });
  await shot(pg, 'journal-17-writing-320');
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(500);
  check(!!narrow && narrow.h <= 64 && !narrow.over, `JN29: at 320 px the bar is still one row, nothing cut (${JSON.stringify(narrow)})`);
  await done();
  await pg.waitForTimeout(900);
  const rest2 = await pg.evaluate(() => ({
    tabs: [...document.querySelectorAll('[data-testid=tab-bar-wrap]')].filter((e) => e.getBoundingClientRect().height > 1).length,
    write: (() => { const e = document.querySelector('[data-testid=line-write]'); const r = e?.getBoundingClientRect(); return e ? { label: document.querySelector('[data-testid=line-input]')?.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height) } : null; })(),
    status: document.querySelector('[data-testid=line-status]')?.innerText ?? '',
  }));
  check(rest2.tabs === 1 && !!rest2.write && rest2.write.label === 'Write an entry' && rest2.write.w >= 44 && rest2.write.h >= 44 && rest2.status.trim() === '',
    `JN29, JN30: at rest the tabs are back and the bar holds the camera and the mic (${JSON.stringify(rest2)})`);

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
  await pg.waitForSelector('[data-testid=open-line]', { timeout: 30000 });
  await pg.waitForTimeout(1500);
  const rest3 = await lay();
  const headBottom = rest3.head ? rest3.head.bottom : 0;
  check(!!rest3.head && rest3.head.top - rest3.pageTop < 60 && !!rest3.last && rest3.last.top >= headBottom - 2 && rest3.last.top - headBottom < 40
    && (!rest3.prev || rest3.prev.bottom <= headBottom + 2) && !!rest3.blank && rest3.blank.top >= rest3.last.bottom - 2 && rest3.blank.h >= rest3.vh * 0.3 && rest3.blank.bottom <= rest3.bar.top + 2,
    `JN31: at rest the last entry is on top under its date, nothing older shows, and the empty page fills the rest above the bar (${JSON.stringify(rest3)})`);
  await shot(pg, 'journal-18-at-rest-peek');
  const cam51 = [await box(pg, '[data-testid=band-photo]'), await box(pg, '[data-testid=band-voice]')];
  await pg.click('[data-testid=line-write]', { position: { x: 40, y: 16 }, timeout: 5000, force: true }).catch(() => {});
  await pg.waitForTimeout(900);
  const grown = await lay();
  check(grown.focused && !!grown.field && !!grown.last, `JN32: a tap on the empty page puts the caret on the page (${JSON.stringify(grown)})`);
  check(grown.focused && !!grown.last && Math.abs(grown.last.top - rest3.last.top) <= 2 && !!grown.field && grown.field.top >= grown.last.bottom - 2 && grown.field.top - grown.last.bottom < 80,
    `JN33: nothing slides away when writing begins: the last entry keeps its place and the caret is under it (${JSON.stringify({ rest: rest3.last, grown })})`);
  const cam51w = [await box(pg, '[data-testid=band-photo]'), await box(pg, '[data-testid=band-voice]')];
  check(!!cam51[0] && !!cam51w[0] && cam51[0].x === cam51w[0].x && cam51[1].x === cam51w[1].x, `chronicle-journal audit 51: the camera and the mic keep their places between rest and writing (${JSON.stringify({ rest: cam51.map((b) => b?.x), writing: cam51w.map((b) => b?.x) })})`);
  await shot(pg, 'journal-19-writing-under-the-last');
  await pg.keyboard.type('Stacked under the last.', { delay: 10 });
  await pg.waitForTimeout(1000);
  await done();
  await pg.waitForTimeout(1000);
  const after3 = await lay();
  check(/Stacked under the last\./.test(after3.lastText) && !!after3.prev && Math.abs(after3.prev.top - rest3.last.top) <= 2 && after3.last.top >= after3.prev.bottom - 2 && !!after3.blank && after3.blank.top >= after3.last.bottom - 2,
    `JN33: Done moves nothing: the new entry is under the one before, and the empty page under it (${JSON.stringify({ after3 })})`);
  // Enough entries to fill the page: the stack slides up and the line holds its place.
  const tops = [];
  for (let i = 0; i < 5; i++) {
    await toLine();
    await pg.keyboard.type(`Stack ${i + 1}, a line long enough to run over onto a second line of the page.`, { delay: 4 });
    await pg.waitForTimeout(700);
    tops.push((await lay()).field?.top ?? -1);
    await done();
    await pg.waitForTimeout(700);
  }
  await toLine();
  await pg.waitForTimeout(700);
  const tw = await lay();
  const roomTw = tw.bar.top - (tw.head ? tw.head.bottom : tw.pageTop);
  const lineUp = tw.bar.top - (tw.field ? tw.field.top : 0);
  check(tw.focused && !!tw.head && tw.head.top - tw.pageTop < 60 && lineUp > roomTw * 0.22 && lineUp < roomTw * 0.5 && !!tw.last && tw.last.bottom <= tw.field.top + 2
    && Math.abs(tops[4] - tops[3]) <= 30,
    `JN33: a full page slides up as it grows and the line holds a third of the way up from the bar (${JSON.stringify({ tw, tops, roomTw, lineUp })})`);
  check((await pg.locator('[data-testid=day-edge]').filter({ visible: true }).count()) >= 1, 'chronicle-journal audit 52: the held date has an edge that entries fade under');
  await shot(pg, 'journal-20-typewriter');
  // audit 40: the sheet knows the keyboard. With one up over a full stack, the line being written is above the bar.
  await kb(336);
  await pg.waitForTimeout(700);
  const up40 = await lay();
  check(up40.focused && !!up40.field && up40.bar.bottom <= up40.vh - 336 + 2 && up40.field.bottom <= up40.bar.top + 2 && up40.field.top > (up40.head ? up40.head.bottom : 0),
    `chronicle-journal audit 40: with a keyboard up and a full stack, the field is above the bar (${JSON.stringify(up40)})`);
  // audit 43: a reader who scrolled back while writing is left there when the keyboard goes.
  const back43 = await pg.evaluate(() => { const el = document.querySelector('[data-testid=journal-page]'); el.scrollTop = Math.max(0, el.scrollTop - 260); return el.scrollTop; });
  await pg.waitForTimeout(300);
  await kb(0);
  await pg.evaluate(() => document.activeElement?.blur?.());
  await pg.waitForTimeout(1100);
  const after43 = await pg.evaluate(() => document.querySelector('[data-testid=journal-page]').scrollTop);
  check(Math.abs(after43 - back43) <= 4, `chronicle-journal audit 43: blur while scrolled back leaves the reader where they were (${back43} -> ${after43})`);
  await pg.evaluate(() => { const el = document.querySelector('[data-testid=journal-page]'); el.scrollTop = el.scrollHeight; });
  await pg.waitForTimeout(600);
  // audit 45: the page directly under the last entry takes the tap.
  const under45 = await lay();
  await pg.mouse.click(60, under45.last.bottom + 20);
  await pg.waitForTimeout(600);
  check((await lay()).focused, `chronicle-journal audit 45: a tap 20 px under the last entry focuses the field (${JSON.stringify(under45.last)})`);
  // audit 44: one thing is named Write an entry to a screen reader, not the field and the page both.
  const named44 = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=journal-page] [aria-label="Write an entry"]')].filter((e) => !e.closest('[aria-hidden=true]')).length);
  check(named44 === 1, `chronicle-journal audit 44: one control on the page is named Write an entry (${named44})`);
  await pg.evaluate(() => document.activeElement?.blur?.());
  await pg.waitForTimeout(900);
  // audit 42: coming back to Memories opens on the last entry, not on the stack of the sitting before.
  await pg.click('[data-testid=tab-explore]');
  await pg.waitForTimeout(900);
  await pg.click('[data-testid=tab-chronicle]');
  await pg.waitForTimeout(1500);
  const again42 = await lay();
  check(!!again42.head && !!again42.last && again42.last.top - again42.head.bottom < 40 && again42.last.top >= again42.head.bottom - 2 && (!again42.prev || again42.prev.bottom <= again42.head.bottom + 2),
    `chronicle-journal audit 42: coming back to Memories opens on the last entry (${JSON.stringify(again42)})`);

  // NY18-NY25 (note types at capture, by choice): the slot in the corner of the entry being written, the bar as the
  // row of eight, the glyph on a kept entry, and Type in More.
  const typeOfNote = async (re) => (await stored(pg)).moments.flatMap((m) => m.pieces).find((x) => re.test(x.body ?? ''))?.note_type ?? null;
  const slotLabel = () => pg.locator('[data-testid=type-slot]').getAttribute('aria-label').catch(() => null);
  await toLine();
  await pg.waitForTimeout(500);
  const before18 = await pg.locator('[data-testid=type-slot], [data-testid=type-row]').filter({ visible: true }).count();
  check(before18 === 0, `NY18: nothing about a type is on screen before the first character (${before18})`);
  await pg.keyboard.type('Why is the bakery shut', { delay: 10 });
  await pg.waitForTimeout(1400);
  const label19 = await slotLabel();
  await pg.click('[data-testid=type-slot]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(500);
  const row19 = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=type-row] [data-testid^=type-pick-]')].map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.testid.slice(10), name: e.getAttribute('aria-label'), text: e.innerText.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }));
  const open19 = await pg.evaluate(() => ({ expanded: document.querySelector('[data-testid=type-slot]')?.getAttribute('aria-expanded'), bar: ['band-photo', 'band-voice', 'line-done'].filter((id) => { const r = document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect(); return !!r && r.width > 0; }).length }));
  await shot(pg, 'journal-22-type-row');
  await pg.setViewportSize({ width: 320, height: 844 });
  await pg.waitForTimeout(500);
  const row25 = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=type-row] [data-testid^=type-pick-]')].map((e) => { const r = e.getBoundingClientRect(); return { y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right) }; }));
  await shot(pg, 'journal-23-type-row-320');
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(500);
  check.todo(row25.length === 8 && new Set(row25.map((b) => b.y)).size === 2 && row25.every((b) => b.h >= 44 && b.w >= 44 && b.l >= 0 && b.r <= 320), `NY25: at 320 px the eight are two rows of four, nothing cut, each 44 px or more both ways (${JSON.stringify(row25)})`);
  await pg.click('[data-testid=type-pick-idea]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(900);
  const after19 = { row: await pg.locator('[data-testid=type-row]').count(), focus: await pg.evaluate(() => document.activeElement?.getAttribute('data-testid')), label: await slotLabel(), stored: await typeOfNote(/bakery shut/) };
  check(label19 === 'Type, No type' && row19.map((r) => r.id).join() === 'question,emphasis,idea,happy,neutral,sad,like,dislike' && row19.map((r) => r.name).join() === 'Question,Emphasis,Idea,Happy,Neutral,Sad,Like,Dislike'
    && after19.row === 0 && after19.focus === 'line-input' && after19.label === 'Type, Idea',
    `NY19: the slot opens the eight; one tap marks the note and the caret stays on the page (${JSON.stringify({ label19, row19: row19.map((r) => r.id), after19 })})`);
  check.todo(row19.every((r) => r.text === r.name) && open19.expanded === 'true' && open19.bar === 3,
    `NY19, NY20: each of the eight shows its name, the slot shows it is open, and the camera, the mic and Done stay in the bar (${JSON.stringify({ open19, texts: row19.map((r) => r.text) })})`);
  await pg.click('[data-testid=type-slot]').catch(() => {});
  await pg.waitForTimeout(400);
  await pg.click('[data-testid=type-pick-idea]').catch(() => {});
  await pg.waitForTimeout(900);
  const cleared19 = { label: await slotLabel(), stored: await typeOfNote(/bakery shut/) };
  check(cleared19.label === 'Type, No type' && cleared19.stored == null, `NY19: a tap on the marked one clears it (${JSON.stringify(cleared19)})`);
  await pg.click('[data-testid=type-slot]').catch(() => {});
  await pg.waitForTimeout(400);
  // The caret is still on the page: the next character is typed without another tap.
  await pg.keyboard.press('End');
  await pg.keyboard.type('?', { delay: 10 });
  await pg.waitForTimeout(1200);
  const typed20 = { row: await pg.locator('[data-testid=type-row]').count(), done: await pg.locator('[data-testid=line-done]').count(), cam: await pg.locator('[data-testid=band-photo]').count(), body: (await stored(pg)).moments.flatMap((m) => m.pieces).some((x) => x.body === 'Why is the bakery shut?') };
  check(typed20.row === 0 && typed20.done === 1 && typed20.cam === 1 && typed20.body, `NY20: the next character puts the bar back, and the words are kept as ever (${JSON.stringify(typed20)})`);
  await pg.click('[data-testid=type-slot]').catch(() => {});
  await pg.waitForTimeout(400);
  await pg.click('[data-testid=type-pick-question]').catch(() => {});
  await pg.waitForTimeout(900);
  const marked22 = await pg.locator('[data-testid=journal-page] [data-testid=moment-card]').last().locator('[data-testid=note-type-mark]').getAttribute('aria-label').catch(() => null);
  await done();
  await pg.waitForTimeout(1200);
  const kept22 = await pg.evaluate(() => { const cards = [...document.querySelectorAll('[data-testid=journal-page] [data-testid=moment-card]')]; const of = (c) => c?.querySelector('[data-testid=note-type-mark]')?.getAttribute('aria-label') ?? null; return { last: of(cards[cards.length - 1]), prev: of(cards[cards.length - 2]), slot: document.querySelectorAll('[data-testid=type-slot]').length }; });
  check.todo(kept22.last === 'Question' && kept22.prev == null && kept22.slot === 0 && marked22 === 'Question', `NY22: a typed note shows its glyph and name above its words, while it is written and once kept; one with none shows nothing (${JSON.stringify({ kept22, marked22 })})`);
  await shot(pg, 'journal-24-type-on-entry');
  await pg.reload();
  await pg.waitForSelector('[data-testid=open-line]', { timeout: 30000 });
  await pg.waitForTimeout(1500);
  const again21 = { stored: await typeOfNote(/bakery shut/), shown: await pg.locator('[data-testid=journal-page] [data-testid=moment-card]').last().locator('[data-testid=note-type-mark]').getAttribute('aria-label').catch(() => null) };
  check(again21.stored === 'question' && again21.shown === 'Question', `NY21: the type is kept at once and is there when the app is opened again (${JSON.stringify(again21)})`);
  await pg.locator('[data-testid=journal-page] [data-testid=moment-card]').last().locator('[data-testid=moment-more]').click();
  await pg.waitForTimeout(800);
  await pg.click('[data-testid=menu-type]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(500);
  const items23 = await pg.locator('[data-testid=memory-menu] [data-testid^=note-type-item-]').count();
  const alone23 = await pg.locator('[data-testid=memory-menu] [data-testid=menu-less], [data-testid=memory-menu] [data-testid=menu-hide]').count();
  await shot(pg, 'journal-25-type-in-more');
  await pg.click('[data-testid=note-type-item-sad]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  const more23 = { items: items23, menu: await pg.locator('[data-testid=memory-menu]').count(), stored: await typeOfNote(/bakery shut/), shown: await pg.locator('[data-testid=journal-page] [data-testid=moment-card]').last().locator('[data-testid=note-type-mark]').getAttribute('aria-label').catch(() => null) };
  check.todo(more23.items === 9 && alone23 === 0 && more23.menu === 0 && more23.stored === 'sad' && more23.shown === 'Sad', `NY23: More offers Type; the eight and No type take the sheet by themselves, and choosing keeps it (${JSON.stringify({ more23, alone23 })})`);
  // note-types audit 63: More opens on its list again after the eight were shown and the sheet was closed by another item.
  const lastMore = () => pg.locator('[data-testid=journal-page] [data-testid=moment-card]').last().locator('[data-testid=moment-more]');
  await lastMore().click();
  await pg.waitForTimeout(700);
  await pg.click('[data-testid=menu-type]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(400);
  await pg.click('[data-testid=menu-cancel]');
  await pg.waitForTimeout(700);
  await lastMore().click();
  await pg.waitForTimeout(700);
  const list63 = { type: await pg.locator('[data-testid=memory-menu] [data-testid=menu-type]').count(), grid: await pg.locator('[data-testid=memory-menu] [data-testid=note-type-menu]').count() };
  check.todo(list63.type === 1 && list63.grid === 0, `note-types audit 63: More reopens on its list (${JSON.stringify(list63)})`);
  await pg.click('[data-testid=menu-cancel]');
  await pg.waitForTimeout(700);
  // note-types audit 56: the eight go when Memories is no longer in front (a menu opens), and the bar is whole.
  await toLine();
  await pg.keyboard.type('Let go.', { delay: 10 });
  await pg.waitForTimeout(1300);
  await pg.click('[data-testid=type-slot]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(400);
  const up56 = await pg.locator('[data-testid=type-row]').count();
  await pg.locator('[data-testid=journal-page] [data-testid=moment-card]').first().locator('[data-testid=moment-more]').click({ force: true });
  await pg.waitForTimeout(700);
  await pg.click('[data-testid=menu-cancel]').catch(() => {});
  await pg.waitForTimeout(900);
  const gone56 = { row: await pg.locator('[data-testid=type-row]').count(), cam: await pg.locator('[data-testid=band-photo]').count(), mic: await pg.locator('[data-testid=band-voice]').count() };
  check.todo(up56 === 1 && gone56.row === 0 && gone56.cam === 1 && gone56.mic === 1, `note-types audit 56: the eight go when Memories loses focus, and the bar keeps the camera and the mic (${JSON.stringify({ up56, gone56 })})`);
  await pg.evaluate(() => document.activeElement?.blur?.());
  await done();
  await pg.waitForTimeout(900);
  // chronicle-journal audit 60: back from Threads with the page at its foot, the bar holds no pen.
  await pg.evaluate(() => { document.querySelector('[data-testid=journal-page]').scrollTop = 0; });
  await pg.waitForTimeout(700);
  const pen60 = await pg.locator('[data-testid=bar-write]').count();
  await toThreads(pg);
  await pg.waitForTimeout(600);
  await toJournal(pg);
  await pg.waitForTimeout(1200);
  const back60 = await pg.locator('[data-testid=bar-write]').count();
  check.todo(pen60 === 1 && back60 === 0, `chronicle-journal audit 60: back from Threads the page is at its foot and the bar holds no pen (${pen60} -> ${back60})`);

  // JN3, JN4: no card around an entry; the owner's words in a serif, the app's lines in its sans.
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
  const serif = (f) => !!f && /serif/i.test(f) && !/sans-serif/i.test(f.replace(/ui-serif|serif\b(?!-)/gi, '')) && /(ui-serif|Georgia|(^|,\s*)serif)/i.test(f);
  check(!!look && look.border === 0 && look.radius === 0 && look.image === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(look.bg),
    `JN3: an entry has no card, border or tile around it (${JSON.stringify(look)})`);
  check(!!look && serif(look.words) && serif(look.field) && !serif(look.dateline) && !serif(look.heading),
    `JN4: the owner's words and the open line are in the serif; the dateline and the day's heading are in the app's sans (${JSON.stringify(look)})`);
  await shot(pg, 'journal-02-two-entries');

  // JN14, JN15: a photo and the line typed under it are one entry; a memo's controls take only the mic's place.
  const before3 = (await stored(pg)).moments.length;
  const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), pg.click('[data-testid=band-photo]').catch(() => {})]);
  await chooser?.setFiles(path.join(h.scriptsDir, 'fixtures', 'photo.jpg'));
  const photoOn = await pg.waitForFunction((sel) => { const all = document.querySelectorAll(sel); const last = all[all.length - 1]; return !!last && !!last.querySelector('[data-testid=entry-piece-photo]'); }, entries, { timeout: 15000 }).then(() => true, () => false);
  await type('Same post as last week.');
  await pg.waitForTimeout(1500);
  const restBoxes = { field: await box(pg, input), photo: await box(pg, '[data-testid=band-photo]'), voice: await box(pg, '[data-testid=band-voice]') };
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await there('[data-testid=band-voice-save]', 8000);
  const rec = {
    field: await box(pg, input), photo: await box(pg, '[data-testid=band-photo]'), save: await box(pg, '[data-testid=band-voice-save]'),
    discard: await shown('[data-testid=band-voice-discard]'), timer: await shown('[data-testid=band-voice-timer]'), text: await pg.locator(input).inputValue().catch(() => null),
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
    digits: [...e.querySelectorAll('[data-testid=stack-mark]')].length,
  })).catch(() => null);
  check(s3.moments.length === before3 + 1 && kinds === 'photo,text,voice' && !!lastEntry && lastEntry.datelines === 1 && lastEntry.pieces.join(',') === 'photo,text,voice' && lastEntry.digits === 0,
    `JN15: a photo, the line under it and a voice note are one entry under one dateline, every piece shown, no count (${JSON.stringify({ kinds, lastEntry, moments: s3.moments.length - before3 })})`);
  check(!!lastEntry && lastEntry.pieces.length === 3, `JN3: a moment with several pieces is one entry with every piece shown (${JSON.stringify(lastEntry)})`);
  const memoGlyph = await pg.locator(entries).last().locator('[data-testid=entry-piece-voice]').innerText().then((t) => iconOf(t.trim()[0] ?? ''), () => '');
  check(!!memoGlyph && !/play/.test(memoGlyph), `chronicle-journal ui 2: a voice note's line wears a mic, not a play button it does not have (${memoGlyph})`);
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
  const lineEmpty = await pg.locator(input).inputValue().catch(() => null);
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
  const pillOver = { pill: await box(pg, '[data-testid=undo-toast]'), line: await box(pg, line) };
  check(!!pillOver.pill && !!pillOver.line && pillOver.pill.y + pillOver.pill.h <= pillOver.line.y, `fix journal-note-pages audit 1: a delete's Undo pill sits above the open line (${JSON.stringify(pillOver)})`);
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
  await pg.reload();
  await there('[data-testid=memories]', 20000);
  await pg.waitForSelector(entries, { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(2000);
  const opened = await pg.evaluate(({ sel, lineSel }) => {
    const cards = [...document.querySelectorAll(sel)];
    const lineBox = document.querySelector(lineSel)?.getBoundingClientRect();
    const last = cards[cards.length - 1]?.getBoundingClientRect();
    const ys = cards.map((e) => e.getBoundingClientRect().y);
    return { drawn: cards.length, lastTop: last ? Math.round(last.top) : null, lastBottom: last ? Math.round(last.bottom) : null, lineTop: lineBox ? Math.round(lineBox.top) : null, inOrder: ys.every((y, i) => i === 0 || y >= ys[i - 1]), lastText: cards[cards.length - 1]?.innerText ?? '' };
  }, { sel: entries, lineSel: line });
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
  const fixedAtFoot = await box(pg, line);
  const anchor = await pg.locator(entries).first().evaluate((e) => ({ text: e.innerText.slice(0, 60) }));
  const before = await pg.locator(entries).count();
  await scrollTo('top');
  await pg.waitForTimeout(1500);
  const after = await pg.locator(entries).count();
  const anchorVisible = await pg.locator(entries).evaluateAll((els, text) => els.some((e) => e.innerText.startsWith(text) && e.getBoundingClientRect().bottom > 0 && e.getBoundingClientRect().top < window.innerHeight), anchor.text);
  const fixedAtTop = await box(pg, line);
  check(after > before && anchorVisible, `JN1: reaching the top loads older entries above, and the entry that was on screen stays on screen (${before} → ${after}, anchor visible ${anchorVisible})`);
  check(same(fixedAtFoot, fixedAtTop) && same(lineAtRest, fixedAtFoot), `JN9: the open line keeps its box at the foot and scrolled back (${JSON.stringify({ lineAtRest, fixedAtFoot, fixedAtTop })})`);
  await shot(pg, 'journal-05-scrolled-back');
  const marks54 = await pg.locator('[data-testid=journal-page] [data-testid=note-type-mark]').count();
  check(marks54 >= 1, `chronicle-journal audit 54: a note's type shows on its entry in the journal (${marks54} marks)`);
  // JN9, JN11, audit 50: scrolled back, the empty page is out of view and the bar holds the pen: one tap brings
  // today's foot into view and the caret onto the page, with no scroll first.
  const pen50 = await box(pg, '[data-testid=bar-write]');
  check(!!pen50 && pen50.w >= 44 && pen50.h >= 44 && pen50.y < 844, `chronicle-journal audit 50: with the page pulled down the bar holds a pen (${JSON.stringify(pen50)})`);
  await pg.click('[data-testid=bar-write]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(900);
  const backAtFoot = await pg.evaluate(() => { const r = document.querySelector('[data-testid=line-input]')?.getBoundingClientRect(); return !!r && r.top > 0 && r.bottom <= window.innerHeight; });
  check(backAtFoot && (await pg.evaluate(() => document.activeElement?.getAttribute('data-testid'))) === 'line-input', 'JN11: the pen brings today\'s page to the foot, with the caret in it');
  await pg.evaluate(() => document.activeElement?.blur?.());
  await pg.waitForTimeout(900);
  check((await pg.locator('[data-testid=bar-write]').count()) === 0, 'chronicle-journal audit 50: with the empty page in view the bar holds no pen: the page is the pen');

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
  await placedEntry.locator('[data-testid=moment-more]').click().catch(() => {});
  await there('[data-testid=memory-menu]', 4000);
  const mapInMore = await pg.locator('[data-testid=menu-map]').count();
  await pg.locator('[data-testid=menu-cancel]').click().catch(() => {});
  await pg.locator(entries).filter({ hasText: 'A long entry' }).locator('[data-testid=moment-more]').click().catch(() => {});
  await there('[data-testid=memory-menu]', 4000);
  const mapForUnplaced = await pg.locator('[data-testid=menu-map]').count();
  await pg.locator('[data-testid=menu-cancel]').click().catch(() => {});
  await pg.waitForTimeout(400);
  check(mapInMore === 1 && mapForUnplaced === 0 && /location/.test(pinGlyph),
    `chronicle-journal ui 3: Show on the map is in a placed entry's More, and its dateline wears a pin (${JSON.stringify({ mapInMore, mapForUnplaced, pinGlyph })})`);
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
  // audit 15: writing from inside a thread goes back to the page at its foot, where the entry is seen.
  await pg.click(input).catch(() => {});
  await pg.keyboard.type('Written from inside a thread.', { delay: 10 });
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
  check(err && !!errBox && errBox.y + errBox.h <= lineWithErr.y && same(lineWithErr, lineAtRest),
    `JN18: a refused microphone is said above the line, which keeps its box (${JSON.stringify({ errBox, lineWithErr })})`);
  await pg.evaluate(() => {
    if (window.__gum) navigator.mediaDevices.getUserMedia = window.__gum;
    navigator.permissions.query = window.__pq;
  });
  await pg.waitForTimeout(6500);
  await pg.locator(entries).last().locator('[data-testid=moment-more]').click().catch(() => {});
  await pg.locator('[data-testid=menu-hide]').first().click({ timeout: 3000 }).catch(() => {});
  const undoBox = await pg.waitForSelector('[data-testid=memories-toast]', { timeout: 5000 }).then(() => box(pg, '[data-testid=memories-toast]'), () => null);
  check(!!undoBox && undoBox.y + undoBox.h <= lineAtRest.y && same(await box(pg, line), lineAtRest), `JN18: Undo for a hide sits above the line (${JSON.stringify({ undoBox, lineAtRest })})`);
  await pg.locator('[data-testid=memories-undo]').click({ timeout: 3000 }).catch(() => {});

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
  await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=walk-minimize]').catch(() => {});
  await there('[data-testid=recording-bar]', 10000);
  for (let i = 0; i < 6; i++) {
    await c.setGeolocation({ longitude: h.at(-1 + i * 0.12, -1.5)[0], latitude: h.at(-1 + i * 0.12, -1.5)[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  await tabTo(pg, 'chronicle', 'memories');
  await there(line, 8000);
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
  check(!barCam && !!lineBox && !!barBox && lineBox.y + lineBox.h <= barBox.y + 1, `JN24: the line sits above the recording bar, which shows no camera on Memories (${JSON.stringify({ barCam, lineBox, barBox })})`);
  await shot(pg, 'journal-11-walk-minimized');
  // audit 53: while writing with a walk recording, the bar says so (the recording bar is folded away).
  await toLine();
  await pg.waitForTimeout(700);
  const rec53 = await pg.evaluate(() => { const e = document.querySelector('[data-testid=line-recording]'); return e ? e.getAttribute('aria-label') : null; });
  check(rec53 === 'Walk recording', `chronicle-journal audit 53: writing on a walk, the bar keeps the recording's mark (${rec53})`);
  await shot(pg, 'journal-21-writing-on-a-walk');
  await pg.evaluate(() => document.activeElement?.blur?.());
  await pg.waitForTimeout(900);
  await pg.click('[data-testid=recording-return]').catch(() => {});
  await pg.waitForSelector('[data-testid=stop]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  // A capture's pin on the walk's map is labelled "... Open".
  const onWalkScreen = await pg.locator('[aria-label$=". Open"]').count();
  await pg.click('[data-testid=walk-minimize]').catch(() => {});
  await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 10000 }).catch(() => {});
  const sb = await pg.locator('[data-testid=bar-stop]').boundingBox().catch(() => null);
  if (sb) {
    await pg.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1100);
    await pg.mouse.up();
  }
  await pg.waitForURL(/replay/, { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(2500);
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
