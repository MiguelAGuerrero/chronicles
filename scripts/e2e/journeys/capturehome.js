// Capture from Chronicle (HC1-HC15, decision 0106): the app opens on Chronicle's Memories, which keeps a
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

const SEED = (now, day) => {
  const note = (id, t, body) => ({ id, walk_id: null, t, lat: null, lon: null, kind: 'text', file_path: null, body, segment_id: null });
  const caps = [];
  for (let i = 0; i < 14; i++) caps.push(note(`n${i}`, now - (i + 2) * day, `A quiet note from a walk around town, number ${String.fromCharCode(97 + i)}.`));
  caps.push(note('h1', now - 50 * day, 'The harbor at dusk.'), note('h2', now - 40 * day, 'Harbor lights again.'), note('h3', now - 20 * day, 'Out to the harbor early.'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['capture'], 'readwrite');
      for (const c of caps) tx.objectStore('capture').put(c);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

const stored = (pg) => pg.evaluate(() => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const names = ['capture', 'walk', 'thread_member'];
    const tx = req.result.transaction(names, 'readonly');
    const all = (n) => new Promise((r) => { const g = tx.objectStore(n).getAll(); g.onsuccess = () => r(g.result); });
    Promise.all(names.map(all)).then(([captures, walks, members]) => resolve({ captures, walks, members }));
  };
}));

const box = async (pg, sel) => {
  const b = await pg.locator(sel).filter({ visible: true }).first().boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
};
const same = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

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
  check.todo(opened.path === `${BASE}/` && opened.chronicle === 1 && opened.memories && opened.bars === 1 && opened.maps === 0,
    `HC1: the app opens on Memories at /, one tab bar, no live map (${JSON.stringify(opened)})`);
  const geoAtLaunch = await pg.evaluate(() => window.__geo.reads);
  check.todo(geoAtLaunch === 0, `HC14: opening on Chronicle reads no location (${geoAtLaunch} reads)`);

  // HC3: Chronicle, Explore, Navigate.
  const tabs = await pg.locator('[data-testid^=tab-]').filter({ hasNot: pg.locator('[data-testid=tab-bar-wrap]') }).evaluateAll((els) =>
    els.filter((e) => /^tab-(chronicle|explore|navigate)$/.test(e.dataset.testid)).map((e) => e.innerText.replace(/[^A-Za-z]/g, '')));
  check.todo(tabs.join(',') === 'Chronicle,Explore,Navigate', `HC3: the tabs read Chronicle, Explore, Navigate (${tabs.join(', ')})`);

  // HC13: nothing kept is one line and the band, no other button, no accent.
  const empty = await shown('[data-testid=memories-empty]') ? await pg.locator('[data-testid=memories-empty]').evaluate((e) => ({
    text: e.innerText.trim(),
    buttons: e.querySelectorAll('[role=button], button').length,
  })) : null;
  check.todo(!!empty && empty.text === 'Nothing kept yet.' && empty.buttons === 0 && (await shown(band)),
    `HC13: empty Memories is "Nothing kept yet." and the band (${JSON.stringify(empty)})`);

  // HC6, HC8: three buttons, camera, mic, note, left to right, each a thumb's target, named for a screen reader.
  const buttons = await pg.locator(`${band} [data-testid^=band-]`).filter({ visible: true }).evaluateAll((els) => els
    .filter((e) => /^band-(photo|voice|note)$/.test(e.dataset.testid))
    .map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.testid, x: r.x, w: r.width, h: r.height, label: e.getAttribute('aria-label'), text: e.innerText }; })
    .sort((a, b) => a.x - b.x));
  check.todo(buttons.map((b) => b.id).join(',') === 'band-photo,band-voice,band-note',
    `HC6: the band holds the camera, the mic and the note, in that order (${buttons.map((b) => b.id).join(', ')})`);
  check.todo(buttons.length === 3 && [glyph('camera'), glyph('mic'), glyph('document-text')].every((g, i) => (buttons[i].text ?? '').includes(g)),
    `HC6: with the walk screen's glyphs (${buttons.map((b) => iconOf((b.text ?? '').trim()[0] ?? '')).join(', ')})`);
  check.todo(buttons.length === 3 && buttons.every((b) => b.w >= 44 && b.h >= 44)
    && buttons[0].label === 'Keep a moment: take a photo or video' && buttons[1].label === 'Keep a moment: record a voice memo' && buttons[2].label === 'Keep a moment: write a note',
    `HC8: each a thumb's target, named for a screen reader (${JSON.stringify(buttons.map((b) => [b.w, b.h, b.label]))})`);
  // HC8: in screen-reader order the band comes right after the Memories options button.
  let next = null;
  if (await shown('[data-testid=memories-menu]')) {
    await pg.focus('[data-testid=memories-menu]');
    await pg.keyboard.press('Tab');
    next = await pg.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  }
  check.todo(next === 'band-photo', `HC8: Tab from the options button reaches the camera next (${next})`);
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
  check.todo(loud.length === 0, `HC12: no accent colour, number or prompt copy at rest (${loud.join('; ')})`);
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
  check.todo(headed && (await pg.locator('[data-testid=tab-chronicle][aria-selected=true]').count()) === 1,
    'HC9: a note kept from the band heads Lately at once, without leaving Memories');
  const toast = await pg.waitForSelector('[data-testid=band-toast]', { timeout: 15000 }).then((e) => e.innerText(), () => null);
  check.todo(toast === 'Note kept here', `HC15: the toast says, in words, where the note went ("${toast}")`);
  const toastBox = await box(pg, '[data-testid=band-toast]');
  const bandWithToast = await box(pg, band);
  check.todo(!!toastBox && !!bandWithToast && toastBox.y + toastBox.h <= bandWithToast.y && same(bandAtRest, bandWithToast),
    `HC15: the toast sits above the band, and the band keeps its box (${JSON.stringify({ toastBox, bandWithToast, bandAtRest })})`);
  const placed = await pg.waitForFunction(() => {
    const first = document.querySelector('[data-testid=memories-list] [data-testid=moment-card]');
    return !!first && /Fox Point|Providence|College Hill|Wayland/.test(first.innerText) || window.__geo.watching === 0;
  }, null, { timeout: 15000 }).then(() => true, () => false);
  const geo1 = await pg.evaluate(() => ({ ...window.__geo }));
  await pg.waitForTimeout(4000);
  const geo2 = await pg.evaluate(() => ({ ...window.__geo }));
  check.todo(placed && geo1.reads >= 1 && geo2.reads === geo1.reads && geo2.watching === 0,
    `HC9: the moment read one fix, and nothing reads a location after it (${JSON.stringify({ geo1, geo2 })})`);
  // Memories' own toast (Undo) sits above the band too.
  const first = pg.locator('[data-testid=memories-list] [data-testid=moment-card]').first();
  await first.locator('[data-testid=moment-more]').click().catch(() => {});
  await pg.locator('[data-testid=memory-menu-hide], [data-testid=menu-hide]').first().click({ timeout: 3000 }).catch(() => {});
  const undoBox = await pg.waitForSelector('[data-testid=memories-toast]', { timeout: 5000 }).then(() => box(pg, '[data-testid=memories-toast]'), () => null);
  const bandWithUndo = await box(pg, band);
  check.todo(!!undoBox && !!bandWithUndo && undoBox.y + undoBox.h <= bandWithUndo.y && same(bandAtRest, bandWithUndo),
    `HC15: Memories' Undo toast sits above the band (${JSON.stringify({ undoBox, bandWithUndo })})`);
  await pg.locator('[data-testid=memories-undo]').click({ timeout: 3000 }).catch(() => {});

  // HC7: with many moments, the band stays put while Lately scrolls, and the last card clears it.
  await pg.evaluate(SEED, Date.now(), DAY);
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
  check.todo(same(beforeScroll, afterScroll) && !!lastCard && !!afterScroll && lastCard.y + lastCard.height <= afterScroll.y + 0.5,
    `HC7: the band stays put as Lately scrolls, and the last card clears it (${JSON.stringify({ beforeScroll, afterScroll, last: lastCard && Math.round(lastCard.y + lastCard.height) })})`);
  await shot(pg, '91-capturehome-scrolled');

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
  check.todo(inThread && same(beforeScroll, bandInThread),
    `HC7: the band is there, unmoved, while a thread is open (${JSON.stringify({ inThread, bandInThread })})`);
  check.todo(inThread && afterThread.members.length === membersBefore
    && (await pg.locator('[data-testid=thread-screen] [data-testid=moment-card]').count()) === threadCards
    && afterThread.captures.some((x) => x.body === 'Kept while reading a thread.' && x.walk_id == null),
    'HC8: a note kept while a thread is open is kept, and joins no thread');
  if (inThread) await pg.locator('[data-testid=thread-back]').click().catch(() => {});

  // HC6: Walks, Days and Map show no band.
  const sections = {};
  for (const s of ['walks', 'days', 'map']) {
    await pg.click(`[data-testid=section-${s}]`);
    await pg.waitForTimeout(700);
    sections[s] = await shown(band);
  }
  await pg.click('[data-testid=section-memories]');
  check.todo(Object.values(sections).every((v) => v === false), `HC6: Walks, Days and Map show no band (${JSON.stringify(sections)})`);

  // HC11: mid-memo the band's buttons keep their places, and leaving Memories saves the memo.
  await pg.waitForSelector(band, { timeout: 5000 }).catch(() => {});
  const restBoxes = { photo: await box(pg, '[data-testid=band-photo]'), voice: await box(pg, '[data-testid=band-voice]'), note: await box(pg, '[data-testid=band-note]') };
  const voicesBefore = (await stored(pg)).captures.filter((x) => x.kind === 'voice').length;
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
  const recBoxes = { discard: await box(pg, '[data-testid=band-voice-discard]'), save: await box(pg, '[data-testid=band-voice-save]'), timer: await box(pg, '[data-testid=band-voice-timer]') };
  const centre = (b) => b && { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const near = (a, b) => !!a && !!b && Math.abs(centre(a).x - centre(b).x) <= 1 && Math.abs(centre(a).y - centre(b).y) <= 1;
  check.todo(near(restBoxes.photo, recBoxes.discard) && near(restBoxes.voice, recBoxes.save) && near(restBoxes.note, recBoxes.timer),
    `HC11: mid-memo, Discard, Stop & save and the timer take the camera's, mic's and note's places (${JSON.stringify({ restBoxes, recBoxes })})`);
  await pg.waitForTimeout(1600);
  await pg.click('[data-testid=section-walks]');
  await pg.waitForTimeout(2000);
  const voicesAfter = (await stored(pg)).captures.filter((x) => x.kind === 'voice').length;
  check.todo(voicesAfter === voicesBefore + 1, `HC11: leaving Memories mid-memo saves the memo (${voicesBefore} → ${voicesAfter})`);
  await pg.click('[data-testid=section-memories]');

  // HC11: mid-memo, opening a moment saves the memo first, and nothing plays over it.
  await pg.waitForSelector(band, { timeout: 5000 }).catch(() => {});
  await pg.click('[data-testid=band-voice]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1600);
  await pg.locator('[data-testid=memories-list] [data-testid=moment-open]').first().click().catch(() => {});
  await pg.waitForTimeout(2000);
  const voicesOpened = (await stored(pg)).captures.filter((x) => x.kind === 'voice').length;
  check.todo(voicesOpened === voicesAfter + 1 && !(await shown('[data-testid=band-voice-save]')),
    `HC11: opening a moment mid-memo saves the memo first (${voicesAfter} → ${voicesOpened})`);
  await pg.locator('[data-testid=viewer-close]').click({ timeout: 3000 }).catch(() => {});

  // HC6: the band still keeps a moment when Memories failed to read.
  await pg.evaluate(() => { window.__breakReads = true; });
  await tabTo(pg, 'explore');
  await tabTo(pg, 'chronicle', 'memories');
  const failed = await there('[data-testid=memories-failed]', 8000);
  await pg.evaluate(() => { window.__breakReads = false; });
  await pg.click('[data-testid=band-note]').catch(() => {});
  await pg.fill('[data-testid=band-note-input]', 'Kept while the list was down.').catch(() => {});
  await pg.click('[data-testid=band-note-save]').catch(() => {});
  await pg.waitForTimeout(1200);
  check.todo(failed && (await stored(pg)).captures.some((x) => x.body === 'Kept while the list was down.'),
    `HC6: the band keeps a moment while Memories shows it failed to read (failed: ${failed})`);

  // HC10, HC7, HC15: with a walk minimized, the band files into the walk, sits above the recording bar,
  // and the bar shows no camera on Memories (decision 0106).
  await tabTo(pg, 'navigate');
  await pg.waitForSelector('[data-testid=start]', { timeout: 15000 });
  await pg.click('[data-testid=start]');
  await pg.waitForSelector('[data-testid=stop]', { timeout: 15000 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
  await tabTo(pg, 'chronicle', 'memories');
  await pg.waitForSelector(band, { timeout: 10000 }).catch(() => {});
  const walkBand = await box(pg, band);
  const barBox = await box(pg, '[data-testid=recording-bar]');
  check.todo(!!walkBand && !!barBox && walkBand.y + walkBand.h <= barBox.y + 0.5 && !(await shown('[data-testid=bar-photo]')),
    `HC7: with a walk minimized, the band sits above the recording bar, which shows no camera on Memories (${JSON.stringify({ walkBand, barBox })})`);
  const walkLabel = await pg.locator('[data-testid=band-note]').getAttribute('aria-label').catch(() => null);
  check.todo(walkLabel === 'Add to your walk: write a note', `HC8: with a walk open, the band is named for the walk ("${walkLabel}")`);
  await pg.click('[data-testid=band-note]').catch(() => {});
  await pg.fill('[data-testid=band-note-input]', 'Kept on the walk, from Memories.').catch(() => {});
  await pg.click('[data-testid=band-note-save]').catch(() => {});
  const walkToast = await pg.waitForSelector('[data-testid=band-toast]', { timeout: 8000 }).then((e) => e.innerText(), () => null);
  const db = await stored(pg);
  const open = db.walks.find((w) => w.ended_at == null);
  const kept = db.captures.find((x) => x.body === 'Kept on the walk, from Memories.');
  check.todo(!!open && !!kept && kept.walk_id === open.id && walkToast === 'Note saved to your walk',
    `HC10: a note from Memories with a walk minimized belongs to the walk, and says so ("${walkToast}", ${kept && kept.walk_id} vs ${open && open.id})`);
  await pg.click('[data-testid=recording-return]');
  await pg.waitForSelector('[data-testid=stop]', { timeout: 10000 });
  await pg.waitForTimeout(1200);
  check.todo((await pg.locator('[data-testid=cap-note]').count()) > 0 && (await stored(pg)).captures.filter((x) => x.walk_id === open?.id).length >= 1,
    'HC10: the note is the walk\'s own when the walk screen opens');
  await shot(pg, '92-capturehome-walk');

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
  check.todo(before === 0 && after >= 1, `HC14: Explore reads its fix on its first focus, not at launch (${before} → ${after})`);
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
