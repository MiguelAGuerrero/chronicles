// Capture from Chronicle (HC1-HC15, decision 0112): the app opens on Chronicle's Memories, which keeps a
// moment in one tap from a band at its foot. Its own browser: an empty app first, then seeded moments, then
// a walk minimized. E2E_ONLY=capturehome runs it alone.

const DAY = 86400000;

// Counts every location read, so a launch that reads none and a moment that reads one fix can be told (HC9, HC14).
const COUNT_GEO = () => {
  const g = navigator.geolocation;
  window.__geo = { reads: 0, watching: 0 };
  const get = g.getCurrentPosition.bind(g);
  const watch = g.watchPosition.bind(g);
  const clear = g.clearWatch.bind(g);
  g.getCurrentPosition = (...a) => { window.__geo.reads += 1; return get(...a); };
  g.watchPosition = (...a) => { window.__geo.reads += 1; window.__geo.watching += 1; return watch(...a); };
  g.clearWatch = (id) => { window.__geo.watching = Math.max(0, window.__geo.watching - 1); return clear(id); };
  // HC6: a read of the moments can be made to fail, as a broken store would.
  const getAll = IDBIndex.prototype.getAll;
  IDBIndex.prototype.getAll = function (...a) {
    if (window.__breakReads) throw new DOMException('broken for the test', 'UnknownError');
    return getAll.apply(this, a);
  };
};

const SEED = ({ now, day }) => {
  const note = (id, t, body) => ({ id, walk_id: null, t, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });
  const caps = [];
  for (let i = 0; i < 14; i++) caps.push(note(`n${i}`, now - (i + 2) * day, `A quiet note from a walk around town, number ${String.fromCharCode(97 + i)}.`));
  caps.push(note('h1', now - 50 * day, 'The harbor at dusk.'), note('h2', now - 40 * day, 'Harbor lights again.'), note('h3', now - 20 * day, 'Out to the harbor early.'));
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
    const names = ['moment', 'walk', 'thread_member'];
    const tx = req.result.transaction(names, 'readonly');
    const all = (n) => new Promise((r) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => r(g.result); });
    // Each moment read back as its one piece with the moment's own fields (decision 0123).
    Promise.all(names.map(all)).then(([moments, walks, members]) => resolve({ captures: moments.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })), walks, members }));
  };
}));

const box = async (pg, sel) => {
  const b = await pg.locator(sel).filter({ visible: true }).first().boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
};
const same = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function run(h) {
  const { url, BASE, check, shot, glyph, iconOf, tabTo } = h;
  const { c, pg } = await h.freshPage('capturehome', { permissions: ['geolocation', 'microphone'] });
  await c.addInitScript(COUNT_GEO);
  const shown = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const there = (sel, timeout = 10000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const band = '[data-testid=capture-band]';

  // HC1, HC14: an empty app opens on Memories, at /, with one tab bar, no map, and no location read.
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await there('[data-testid=memories]', 20000);
  await pg.waitForTimeout(2500);
  const opened = {
    path: new URL(pg.url()).pathname,
    chronicle: await pg.locator('[data-testid=tab-chronicle][aria-selected=true]').count(),
    memories: await shown('[data-testid=memories]'),
    bars: await pg.locator('[data-testid=tab-bar-wrap]').count(),
    maps: await pg.locator('canvas.maplibregl-canvas').count(),
  };
  check(opened.path === `${BASE}/` && opened.chronicle === 1 && opened.memories && opened.bars === 1 && opened.maps === 0,
    `HC1: the app opens on Memories at /, one tab bar, no live map (${JSON.stringify(opened)})`);
  const geoAtLaunch = await pg.evaluate(() => window.__geo.reads);
  check(geoAtLaunch === 0, `HC14: opening on Chronicle reads no location (${geoAtLaunch} reads)`);

  // HC3: Chronicle, Explore, Navigate.
  const tabs = await pg.locator('[data-testid^=tab-]').filter({ hasNot: pg.locator('[data-testid=tab-bar-wrap]') }).evaluateAll((els) =>
    els.filter((e) => /^tab-(chronicle|explore|navigate)$/.test(e.dataset.testid)).map((e) => e.innerText.replace(/[^A-Za-z]/g, '')));
  check(tabs.join(',') === 'Chronicle,Explore,Navigate', `HC3: the tabs read Chronicle, Explore, Navigate (${tabs.join(', ')})`);

  // HC13: nothing kept is one line and the band, no other button, no accent.
  const empty = await shown('[data-testid=memories-empty]') ? await pg.locator('[data-testid=memories-empty]').evaluate((e) => ({
    text: e.innerText.trim(),
    buttons: e.querySelectorAll('[role=button], button').length,
  })) : null;
  const emptyOk = !!empty && empty.text === 'Nothing kept yet.' && empty.buttons === 0 && (await shown(band));
  check(emptyOk, `HC13: empty Memories is "Nothing kept yet." and the band (${JSON.stringify(empty)})`);

  // HC6, HC8: three buttons, camera, mic, note, left to right, each a thumb's target, named for a screen reader.
  const buttons = await pg.locator(`${band} [data-testid^=band-]`).filter({ visible: true }).evaluateAll((els) => els
    .filter((e) => /^band-(photo|voice|note)$/.test(e.dataset.testid))
    .map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.testid, x: r.x, w: r.width, h: r.height, label: e.getAttribute('aria-label'), text: e.innerText }; })
    .sort((a, b) => a.x - b.x));
  check(buttons.map((b) => b.id).join(',') === 'band-photo,band-voice,band-note',
    `HC6: the band holds the camera, the mic and the note, in that order (${buttons.map((b) => b.id).join(', ')})`);
  check(buttons.length === 3 && [glyph('camera'), glyph('mic'), glyph('document-text')].every((g, i) => (buttons[i].text ?? '').includes(g)),
    `HC6: with the walk screen's glyphs (${buttons.map((b) => iconOf((b.text ?? '').trim()[0] ?? '')).join(', ')})`);
  check(buttons.length === 3 && buttons.every((b) => b.w >= 44 && b.h >= 44)
    && buttons[0].label === 'Keep a moment: take a photo or video' && buttons[1].label === 'Keep a moment: record a voice memo' && buttons[2].label === 'Keep a moment: write a note',
    `HC8: each a thumb's target, named for a screen reader (${JSON.stringify(buttons.map((b) => [b.w, b.h, b.label]))})`);
  // HC8: in screen-reader order the band comes right after the Memories options button.
  let next = null;
  if (await shown('[data-testid=memories-menu]')) {
    await pg.focus('[data-testid=memories-menu]');
    await pg.keyboard.press('Tab');
    next = await pg.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  }
  check(next === 'band-photo', `HC8: Tab from the options button reaches the camera next (${next})`);
  // HC12: at rest, no accent colour, digit or prompt copy in the band or the empty state.
  const loud = await pg.evaluate((sels) => {
    const accent = 'rgb(194, 65, 12)';
    const out = [];
    for (const s of sels) for (const root of document.querySelectorAll(s)) {
      for (const e of [root, ...root.querySelectorAll('*')]) {
        const cs = getComputedStyle(e);
        if ([cs.color, cs.backgroundColor, cs.borderTopColor].includes(accent)) out.push(`accent:${e.dataset.testid ?? e.tagName}`);
      }
      if (/[0-9]/.test(root.innerText)) out.push(`digit:${root.innerText}`);
      if (/\b(capture|start|try|don'?t forget|remember to)\b/i.test(root.innerText)) out.push(`prompt:${root.innerText}`);
    }
    return out;
  }, [band, '[data-testid=memories-empty]']);
  check(loud.length === 0, `HC12: no accent colour, number or prompt copy at rest (${loud.join('; ')})`);
  await shot(pg, '90-capturehome-empty');

  // HC9, HC15: a note heads Lately at once, then its toast says where it went; one fix, nothing after.
  const bandAtRest = await box(pg, band);
  await pg.click('[data-testid=band-note]');
  await pg.waitForSelector('[data-testid=band-note-input]', { timeout: 5000 }).catch(() => {});
  await pg.fill('[data-testid=band-note-input]', 'A heron on the old pier.').catch(() => {});
  await pg.click('[data-testid=band-note-save]').catch(() => {});
  const headed = await pg.waitForFunction(() => {
    const first = document.querySelector('[data-testid=memories-list] [data-testid=moment-card]');
    return !!first && first.innerText.includes('A heron on the old pier.');
  }, null, { timeout: 8000 }).then(() => true, () => false);
  check(headed && (await pg.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1,
    'HC9: a note kept from the band heads Lately at once, without leaving Memories');
  const toast = await pg.waitForSelector('[data-testid=band-toast]', { timeout: 15000 }).then((e) => e.innerText(), () => null);
  check(toast === 'Note kept here', `HC15: the toast says, in words, where the note went ("${toast}")`);
  const toastBox = await box(pg, '[data-testid=band-toast]');
  const bandWithToast = await box(pg, band);
  check(!!toastBox && !!bandWithToast && toastBox.y + toastBox.h <= bandWithToast.y && same(bandAtRest, bandWithToast),
    `HC15: the toast sits above the band, and the band keeps its box (${JSON.stringify({ toastBox, bandWithToast, bandAtRest })})`);
  const placed = await pg.waitForFunction(() => {
    const first = document.querySelector('[data-testid=memories-list] [data-testid=moment-card]');
    return !!first && /Fox Point|Providence|College Hill|Wayland/.test(first.innerText) || window.__geo.watching === 0;
  }, null, { timeout: 15000 }).then(() => true, () => false);
  const geo1 = await pg.evaluate(() => ({ ...window.__geo }));
  await pg.waitForTimeout(4000);
  const geo2 = await pg.evaluate(() => ({ ...window.__geo }));
  check(placed && geo1.reads >= 1 && geo2.reads === geo1.reads && geo2.watching === 0,
    `HC9: the moment read one fix, and nothing reads a location after it (${JSON.stringify({ geo1, geo2 })})`);
  // Memories' own toast (Undo) sits above the band too.
  const first = pg.locator('[data-testid=memories-list] [data-testid=moment-card]').first();
  await first.locator('[data-testid=moment-more]').click().catch(() => {});
  await pg.locator('[data-testid=memory-menu-hide], [data-testid=menu-hide]').first().click({ timeout: 3000 }).catch(() => {});
  const undoBox = await pg.waitForSelector('[data-testid=memories-toast]', { timeout: 5000 }).then(() => box(pg, '[data-testid=memories-toast]'), () => null);
  const bandWithUndo = await box(pg, band);
  check(!!undoBox && !!bandWithUndo && undoBox.y + undoBox.h <= bandWithUndo.y && same(bandAtRest, bandWithUndo),
    `HC15: Memories' Undo toast sits above the band (${JSON.stringify({ undoBox, bandWithUndo })})`);
  await pg.locator('[data-testid=memories-undo]').click({ timeout: 3000 }).catch(() => {});

  // capture-from-chronicle audit 2: a moment's toast and Memories' Undo at once stack, never overlap, and Undo stays tappable.
  await pg.click('[data-testid=band-note]').catch(() => {});
  await pg.fill('[data-testid=band-note-input]', 'Kept while an Undo was up.').catch(() => {});
  await pg.click('[data-testid=band-note-save]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-toast]', { timeout: 15000 }).catch(() => {});
  await pg.locator('[data-testid=memories-list] [data-testid=moment-card]').nth(1).locator('[data-testid=moment-more]').click().catch(() => {});
  await pg.locator('[data-testid=memory-menu-hide], [data-testid=menu-hide]').first().click({ timeout: 3000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=memories-toast]', { timeout: 5000 }).catch(() => {});
  const both = { band: await box(pg, '[data-testid=band-toast]'), undo: await box(pg, '[data-testid=memories-toast]'), row: await box(pg, band) };
  const undoHit = await pg.evaluate(() => {
    const u = document.querySelector('[data-testid=memories-undo]');
    if (!u) return false;
    const r = u.getBoundingClientRect();
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!at && (at === u || u.contains(at));
  });
  check(!!both.band && !!both.undo && !overlap(both.band, both.undo) && both.undo.y + both.undo.h <= both.row.y && both.band.y + both.band.h <= both.row.y && undoHit,
    `capture-from-chronicle audit 2: the moment's toast and Memories' Undo stack above the band, and Undo is tappable (${JSON.stringify(both)}, hit ${undoHit})`);
  await pg.locator('[data-testid=memories-undo]').click({ timeout: 3000 }).catch(() => {});

  // HC7: with many moments, the band stays put while Lately scrolls, and the last card clears it.
  await pg.evaluate(SEED, { now: Date.now(), day: DAY });
  await tabTo(pg, 'explore');
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector('[data-testid=memories-list] [data-testid=moment-card]', { timeout: 15000 });
  const beforeScroll = await box(pg, band);
  const list = pg.locator('[data-testid=memories-list]');
  for (let i = 0; i < 12; i++) await list.evaluate((e) => {
    const s = [e, ...e.querySelectorAll('*')].find((x) => x.scrollHeight > x.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(x).overflowY));
    if (s) s.scrollTop = s.scrollHeight;
  });
  await pg.waitForTimeout(800);
  const afterScroll = await box(pg, band);
  const lastCard = await pg.locator('[data-testid=memories-list] [data-testid=moment-card]').last().boundingBox();
  check(same(beforeScroll, afterScroll) && !!lastCard && !!afterScroll && lastCard.y + lastCard.height <= afterScroll.y + 0.5,
    `HC7: the band stays put as Lately scrolls, and the last card clears it (${JSON.stringify({ beforeScroll, afterScroll, last: lastCard && Math.round(lastCard.y + lastCard.height) })})`);
  await shot(pg, '91-capturehome-scrolled');

  // capture-from-chronicle audit 5: a tap on the band between its buttons opens nothing scrolled beneath it.
  await list.evaluate((e) => {
    const sc = [e, ...e.querySelectorAll('*')].find((x) => x.scrollHeight > x.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(x).overflowY));
    if (sc) sc.scrollTop = Math.round((sc.scrollHeight - sc.clientHeight) / 2);
  });
  await pg.waitForTimeout(600);
  const b0 = await box(pg, '[data-testid=band-photo]');
  const b1 = await box(pg, '[data-testid=band-voice]');
  const gapAt = b0 && b1 ? { x: Math.round((b0.x + b0.w + b1.x) / 2), y: Math.round(b0.y + b0.h / 2) } : null;
  const beneath = gapAt ? await pg.evaluate(({ x, y }) => {
    // What lies under the band at that point: the band itself must take it.
    const at = document.elementFromPoint(x, y);
    return at ? (at.closest('[data-testid=capture-band]') ? 'band' : (at.closest('[data-testid=moment-card]') ? 'card' : at.tagName)) : null;
  }, gapAt) : null;
  if (gapAt) await pg.mouse.click(gapAt.x, gapAt.y);
  await pg.waitForTimeout(800);
  const gapOpened = await shown('[data-testid=viewer-close]');
  check(beneath === 'band' && !gapOpened, `capture-from-chronicle audit 5: a tap between the band's buttons is the band's, and opens nothing beneath (${beneath}, viewer ${gapOpened})`);
  if (gapOpened) await pg.locator('[data-testid=viewer-close]').click().catch(() => {});

  // HC7, HC8: inside a Chronicle thread the band is still there, and a note kept there joins no thread.
  let inThread = false;
  if (await there('[data-testid=threads-rail] [role=button]', 5000)) {
    await pg.locator('[data-testid=threads-rail] [role=button]').first().click();
    inThread = await there('[data-testid=thread-screen]', 5000);
  }
  const threadCards = inThread ? await pg.locator('[data-testid=thread-screen] [data-testid=moment-card]').count() : -1;
  const membersBefore = (await stored(pg)).members.length;
  const bandInThread = await box(pg, band);
  await pg.click('[data-testid=band-note]').catch(() => {});
  await pg.fill('[data-testid=band-note-input]', 'Kept while reading a thread.').catch(() => {});
  await pg.click('[data-testid=band-note-save]').catch(() => {});
  await pg.waitForTimeout(1200);
  const afterThread = await stored(pg);
  check(inThread && same(beforeScroll, bandInThread),
    `HC7: the band is there, unmoved, while a thread is open (${JSON.stringify({ inThread, bandInThread })})`);
  check(inThread && afterThread.members.length === membersBefore
    && (await pg.locator('[data-testid=thread-screen] [data-testid=moment-card]').count()) === threadCards
    && afterThread.captures.some((x) => x.body === 'Kept while reading a thread.' && x.walk_id == null),
    'HC8: a note kept while a thread is open is kept, and joins no thread');
  // capture-from-chronicle audit 9: in a thread, its Back and heading come before the band for a screen reader.
  const backFirst = inThread && await pg.evaluate(() => {
    const back = document.querySelector('[data-testid=thread-back]');
    const cam = document.querySelector('[data-testid=band-photo]');
    return !!back && !!cam && !!(back.compareDocumentPosition(cam) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  check(backFirst, 'capture-from-chronicle audit 9: in a thread, Back comes before the band in reading order');
  if (inThread) await pg.locator('[data-testid=thread-back]').click().catch(() => {});

  // HC6: Walks, Days and Map show no band.
  const sections = {};
  for (const s of ['walks', 'days', 'map']) {
    await pg.click(`[data-testid=section-${s}]`);
    await pg.waitForTimeout(700);
    sections[s] = await shown(band);
  }
  await pg.click('[data-testid=section-memories]');
  check(Object.values(sections).every((v) => v === false), `HC6: Walks, Days and Map show no band (${JSON.stringify(sections)})`);

  // HC11: mid-memo the band's buttons keep their places, and leaving Memories saves the memo.
  await pg.waitForSelector(band, { timeout: 5000 }).catch(() => {});
  const restBoxes = { photo: await box(pg, '[data-testid=band-photo]'), voice: await box(pg, '[data-testid=band-voice]'), note: await box(pg, '[data-testid=band-note]') };
  const voicesBefore = (await stored(pg)).captures.filter((x) => x.kind === 'voice').length;
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
  const recBoxes = { discard: await box(pg, '[data-testid=band-voice-discard]'), save: await box(pg, '[data-testid=band-voice-save]'), timer: await box(pg, '[data-testid=band-voice-timer]') };
  const centre = (b) => b && { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const near = (a, b) => !!a && !!b && Math.abs(centre(a).x - centre(b).x) <= 1 && Math.abs(centre(a).y - centre(b).y) <= 1;
  check(near(restBoxes.photo, recBoxes.discard) && near(restBoxes.voice, recBoxes.save) && near(restBoxes.note, recBoxes.timer),
    `HC11: mid-memo, Discard, Stop & save and the timer take the camera's, mic's and note's places (${JSON.stringify({ restBoxes, recBoxes })})`);
  await pg.waitForTimeout(1600);
  await pg.click('[data-testid=section-walks]');
  await pg.waitForTimeout(2000);
  const voicesAfter = (await stored(pg)).captures.filter((x) => x.kind === 'voice').length;
  check(voicesAfter === voicesBefore + 1, `HC11: leaving Memories mid-memo saves the memo (${voicesBefore} → ${voicesAfter})`);
  await pg.click('[data-testid=section-memories]');

  // HC11: mid-memo, opening a moment saves the memo first, and nothing plays over it.
  await pg.waitForSelector(band, { timeout: 5000 }).catch(() => {});
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1600);
  await pg.evaluate(() => {
    // Every frame for two seconds: a viewer and a recording memo never on screen together (audit 8).
    window.__both = false;
    const t0 = performance.now();
    const tick = () => {
      if (document.querySelector('[data-testid=viewer-close]') && document.querySelector('[data-testid=band-voice-save]')) window.__both = true;
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await pg.locator('[data-testid=memories-list] [data-testid=moment-open]').first().click().catch(() => {});
  await pg.waitForTimeout(2000);
  const together = await pg.evaluate(() => window.__both);
  check(!together, 'capture-from-chronicle audit 8: a moment opened mid-memo shows only once the memo has stopped, so nothing plays over it');
  const voicesOpened = (await stored(pg)).captures.filter((x) => x.kind === 'voice').length;
  check(voicesOpened === voicesAfter + 1 && !(await shown('[data-testid=band-voice-save]')),
    `HC11: opening a moment mid-memo saves the memo first (${voicesAfter} → ${voicesOpened})`);
  await pg.locator('[data-testid=viewer-close]').click({ timeout: 3000 }).catch(() => {});

  // HC6: the band still keeps a moment when Memories failed to read.
  await pg.evaluate(() => { window.__breakReads = true; });
  await tabTo(pg, 'explore');
  await tabTo(pg, 'chronicle', 'memories');
  const failed = await there('[data-testid=memories-failed]', 8000);
  const failedAccent = failed && await pg.evaluate(() => [...document.querySelectorAll('[data-testid=memories-failed], [data-testid=memories-failed] *')]
    .some((e) => { const cs = getComputedStyle(e); return [cs.color, cs.backgroundColor, cs.borderTopColor].includes('rgb(194, 65, 12)'); }));
  check(failed && !failedAccent, `capture-from-chronicle audit 11: Memories' failed state, now on the launch screen, uses no accent colour (${failedAccent})`);
  await pg.evaluate(() => { window.__breakReads = false; });
  await pg.click('[data-testid=band-note]').catch(() => {});
  await pg.fill('[data-testid=band-note-input]', 'Kept while the list was down.').catch(() => {});
  await pg.click('[data-testid=band-note-save]').catch(() => {});
  await pg.waitForTimeout(1200);
  check(failed && (await stored(pg)).captures.some((x) => x.body === 'Kept while the list was down.'),
    `HC6: the band keeps a moment while Memories shows it failed to read (failed: ${failed})`);

  // HC10, HC7, HC15: with a walk minimized, the band files into the walk, sits above the recording bar,
  // and the bar shows no camera on Memories (decision 0112).
  await tabTo(pg, 'navigate');
  await pg.waitForSelector('[data-testid=start]', { timeout: 15000 });
  await pg.click('[data-testid=start]');
  await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
  // A few steps along Wickenden Street, so the walk has a trace and a fresh fix to place by.
  const step = async (i) => {
    await c.setGeolocation({ longitude: h.at(-1 + i * 0.12, -1.5)[0], latitude: h.at(-1 + i * 0.12, -1.5)[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  };
  for (let i = 0; i < 6; i++) await step(i);
  // tend tabs audit 21: a photo from the bar on Explore leaves its Edit pill up (T12), and it follows to Memories.
  await tabTo(pg, 'explore');
  await pg.waitForSelector('[data-testid=bar-photo]', { timeout: 10000 }).catch(() => {});
  const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), pg.click('[data-testid=bar-photo]').catch(() => {})]);
  await chooser?.setFiles(require('path').join(h.scriptsDir, 'fixtures', 'photo.jpg'));
  const pillUp = await pg.waitForSelector('[data-testid=bar-edit-offer]', { timeout: 10000 }).then(() => true, () => false);
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector(band, { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(600);
  const pillOnMemories = await shown('[data-testid=bar-edit-offer]');
  await shot(pg, 'tabs-T12-pill-on-memories');
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(500);
  await shot(pg, 'tabs-T12-pill-on-memories-320');
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(500);
  const walkBand = await box(pg, band);
  const barBox = await box(pg, '[data-testid=recording-bar]');
  check(!!walkBand && !!barBox && walkBand.y + walkBand.h <= barBox.y + 0.5 && !(await shown('[data-testid=bar-photo]')),
    `HC7: with a walk minimized, the band sits above the recording bar, which shows no camera on Memories (${JSON.stringify({ walkBand, barBox })})`);
  const walkLabel = await pg.locator('[data-testid=band-note]').getAttribute('aria-label').catch(() => null);
  check(walkLabel === 'Add to your walk: write a note', `HC8: with a walk open, the band is named for the walk ("${walkLabel}")`);
  await pg.click('[data-testid=band-note]').catch(() => {});
  await pg.fill('[data-testid=band-note-input]', 'Kept on the walk, from Memories.').catch(() => {});
  await pg.click('[data-testid=band-note-save]').catch(() => {});
  const walkToast = await pg.waitForSelector('[data-testid=band-toast]', { timeout: 8000 }).then((e) => e.innerText(), () => null);
  for (let i = 6; i < 10; i++) await step(i);
  const db = await stored(pg);
  const open = db.walks.find((w) => w.ended_at == null);
  const kept = db.captures.find((x) => x.body === 'Kept on the walk, from Memories.');
  check(!!open && !!kept && kept.walk_id === open.id && walkToast === 'Note saved to your walk',
    `HC10: a note from Memories with a walk minimized belongs to the walk, and says so ("${walkToast}", ${kept && kept.walk_id} vs ${open && open.id})`);
  const pillAfterNote = await pg.locator('[data-testid=bar-edit-offer]').count();
  check(pillUp && pillOnMemories && pillAfterNote === 0,
    `tend tabs audit 21: the bar's Edit pill, up on Memories after a bar photo, ends with the next capture, a note from Memories' band (${pillUp}, ${pillOnMemories}, ${pillAfterNote})`);
  await pg.click('[data-testid=recording-return]');
  await pg.waitForSelector('[data-testid=stop]', { timeout: 10000 });
  await pg.waitForTimeout(1200);
  await shot(pg, '92-capturehome-walk');
  // Stopped from the bar, the walk places the note as it places its own captures (here, at stop), and its
  // replay plays it.
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForSelector('[data-testid=bar-stop]', { timeout: 10000 });
  const sb = await pg.locator('[data-testid=bar-stop]').boundingBox();
  await pg.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 }).catch(() => {});
  const placedNote = await pg.waitForFunction(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction(['moment'], 'readonly').objectStore('moment').getAll();
      g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).find((x) => x.body === 'Kept on the walk, from Memories.' && x.lat != null) ?? null);
    };
  }), null, { timeout: 15000, polling: 500 }).then((v) => v.jsonValue(), () => null);
  check(!!placedNote && placedNote.walk_id === open?.id, `HC10: the stopped walk placed the note as its own capture (${placedNote && [placedNote.lat, placedNote.lon]})`);
  const played = await pg.waitForSelector('text=Kept on the walk, from Memories.', { timeout: 60000 }).then(() => true, () => false);
  check(played, 'HC10: the walk\'s replay plays the note kept from Memories');

  // capture-from-chronicle audit 3, 4: a denied mic on the web says so above the band, with no Settings button
  // (the web has no settings to open), and the error and a moment's toast stack without covering each other.
  {
    const { c: c3, pg: p3 } = await h.freshPage('capturehome-mic', { permissions: ['geolocation'] });
    await c3.addInitScript(() => {
      const no = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = no;
      const q = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = (d) => (d && d.name === 'microphone' ? Promise.resolve({ state: 'denied', onchange: null, addEventListener() {}, removeEventListener() {} }) : q(d));
    });
    await p3.goto(url);
    await p3.waitForSelector('[data-testid=band-voice]', { timeout: 30000 });
    await p3.click('[data-testid=band-voice]');
    const err = await p3.waitForSelector('[data-testid=band-error]', { timeout: 8000 }).then(() => true, () => false);
    const settingsBtn = err ? await p3.locator('[data-testid=band-error] [role=button]').count() : -1;
    check(err && settingsBtn === 0, `capture-from-chronicle audit 4: on the web a denied mic is said above the band, with no Settings button (${err}, ${settingsBtn})`);
    await p3.click('[data-testid=band-note]').catch(() => {});
    await p3.fill('[data-testid=band-note-input]', 'Kept beside an error.').catch(() => {});
    await p3.click('[data-testid=band-note-save]').catch(() => {});
    await p3.waitForSelector('[data-testid=band-toast]', { timeout: 15000 }).catch(() => {});
    const pair = { err: await box(p3, '[data-testid=band-error]'), toast: await box(p3, '[data-testid=band-toast]') };
    check(!!pair.err && !!pair.toast && !overlap(pair.err, pair.toast),
      `capture-from-chronicle audit 3: an error above the band and a moment's toast stack, never covering each other (${JSON.stringify(pair)})`);
    await c3.close();
  }

  // HC14: Explore reads its one fix the first time it comes to the front.
  await pg.click('[data-testid=walk-minimize]').catch(() => {});
  const { c: c2, pg: p2 } = await h.freshPage('capturehome-explore');
  await c2.addInitScript(COUNT_GEO);
  await p2.goto(url);
  await p2.waitForSelector('[data-testid=tab-explore]', { timeout: 30000 });
  await p2.waitForTimeout(1500);
  const before = await p2.evaluate(() => window.__geo.reads);
  await p2.click('[data-testid=tab-explore]');
  await p2.waitForTimeout(4000);
  const after = await p2.evaluate(() => window.__geo.reads);
  check(before === 0 && after >= 1, `HC14: Explore reads its fix on its first focus, not at launch (${before} → ${after})`);
  await c2.close();
  await c.close();
}

module.exports = {
  name: 'capturehome',
  covers: [
    'src/components/chronicle/MemoriesScreen.tsx',
    'src/components/MomentBar.tsx',
    'src/components/walk/CaptureStack.tsx',
    'src/components/RecordingBar.tsx',
    'src/lib/captureBand.ts',
    'src/app/(tabs)/{_layout,index,explore}.tsx',
    'src/app/chronicle.tsx',
    'src/lib/startPlan.ts',
  ],
  run,
};
