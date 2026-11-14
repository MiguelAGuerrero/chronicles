// Reactions (specs/reactions, RX1-RX36, decision 0176): any moment carries reactions, at most one per family; the
// journal's sign and More, the viewer's More, marks under a dateline and the viewer's info line, bubbles on a single
// moment's pin, and the lenses in the journal's contents. Its own browser. E2E_ONLY=reactions runs it alone.

const INK = 'rgb(29, 36, 48)';
const DAY = 86400000;

// A photo and a note from today, two older notes reacted to as ideas, and an older one with none. All placed near the
// harness's start, apart enough to be pins of their own on Chronicle's Map.
const SEED = ({ now, at, day }) => new Promise((resolve, reject) => {
  const m = (id, t, kind, p, extra = {}) => ({ id, walk_id: null, t, lat: p[1], lon: p[0], segment_id: null, piece_ids: [id], pieces: [{ id, moment_id: id, t, kind, file_path: kind === 'photo' ? id : null, body: kind === 'text' ? extra.body : null, caption: null, caption_y: null }] });
  const rows = [
    m('rx-photo', now - 30 * 60000, 'photo', at[0]),
    m('rx-today', now - 20 * 60000, 'text', at[1], { body: 'The bench by the fountain is new.' }),
    m('rx-idea-1', now - 5 * day, 'text', at[2], { body: 'Map the alleys behind the market.' }),
    m('rx-idea-2', now - 3 * day, 'text', at[3], { body: 'Come back when the bakery opens.' }),
    m('rx-plain', now - 2 * day, 'text', at[4], { body: 'Nothing much on the way home.' }),
  ];
  const reactions = [
    { moment_id: 'rx-idea-1', family: 'thought', reaction: 'idea', set_at: now - 5 * day },
    { moment_id: 'rx-idea-2', family: 'thought', reaction: 'idea', set_at: now - 3 * day },
    { moment_id: 'rx-idea-2', family: 'feeling', reaction: 'happy', set_at: now - 3 * day },
  ];
  const cv = document.createElement('canvas');
  cv.width = 160;
  cv.height = 200;
  const g = cv.getContext('2d');
  g.fillStyle = '#2f5f8f';
  g.fillRect(0, 0, 160, 200);
  cv.toBlob((blob) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['moment', 'media', 'reaction'], 'readwrite');
      for (const r of rows) tx.objectStore('moment').put(r);
      for (const r of reactions) tx.objectStore('reaction').put(r);
      tx.objectStore('media').put({ key: 'rx-photo', blob });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
});

const reactionsOf = (pg, id) => pg.evaluate((momentId) => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    let g;
    try { g = req.result.transaction('reaction', 'readonly').objectStore('reaction').getAll(); } catch { resolve(null); return; }
    g.onsuccess = () => resolve(Object.fromEntries(g.result.filter((r) => r.moment_id === momentId).map((r) => [r.family, r.reaction])));
  };
  req.onerror = () => resolve(null);
}), id);

async function run(h) {
  const { url, check, freshPage, shot, start } = h;
  const { c, pg } = await freshPage('reactions', { permissions: ['geolocation', 'microphone'] });
  const there = (sel, timeout = 8000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const entries = '[data-testid=journal-page] [data-testid=moment-card]';
  const entry = (words) => pg.locator(entries).filter({ hasText: words }).last();
  const photoEntry = () => pg.locator(entries).filter({ has: pg.locator('img') }).last();
  // Off the start, where an entry written in the journey is placed (its own pin).
  const at = [1, 2, 3, 4, 5].map((k) => [start[0] + k * 0.004, start[1] + k * 0.002]);

  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await there('[data-testid=open-line]', 20000);
  const seeded = await pg.evaluate(SEED, { now: Date.now(), at, day: DAY }).catch((e) => String(e).slice(0, 300));
  await pg.reload();
  await there(entries, 20000);
  await pg.waitForTimeout(1500);

  // RX1, RX9: the photo's entry today offers the sign; one tap opens the reactions, and a choice is kept.
  await shot(pg, 'reactions-00-journal');
  // reactions audit 3 (the cold find): nothing lies over the sign's plus (the held date's edge bands washed it out).
  const ui3a = await pg.evaluate(() => {
    // The plus nearest the top of the sheet, just under the held date: where the date's edge would lie over it.
    const foot = document.querySelector('[data-testid=open-line]')?.getBoundingClientRect().top ?? window.innerHeight;
    const adds = [...document.querySelectorAll('[data-testid=reaction-sign-add]')].filter((e) => { const r = e.getBoundingClientRect(); return r.top > 0 && r.bottom < foot; });
    const add = adds[0];
    if (!add) return null;
    const r = add.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const sign = add.closest('[data-testid=reaction-sign]');
    return { top: !!hit && (add.contains(hit) || hit === sign), hit: hit?.closest('[data-testid]')?.getAttribute('data-testid') ?? hit?.tagName, y: Math.round(r.top) };
  });
  check(!!ui3a && ui3a.top, `reactions audit 3: nothing lies over the sign's plus (${JSON.stringify(ui3a)})`);
  // RL8: at rest (the page at its end), nothing lies over the entry right under the held date: the date's edge (drawn
  // without pointer events, so measured, not hit-tested) ends above the sign's face and the dateline's words, at 390
  // and at 320.
  const clearOf = () => pg.evaluate(() => {
    const edges = [...document.querySelectorAll('[data-testid=journal-page] [data-testid=day-edge]')].map((e) => e.getBoundingClientRect()).filter((r) => r.top >= 0);
    const edge = edges.sort((a, b) => a.top - b.top)[0];
    if (!edge) return ['no edge'];
    const card = [...document.querySelectorAll('[data-testid=journal-page] [data-testid=moment-card]')]
      .filter((c) => c.getBoundingClientRect().bottom > edge.bottom).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
    if (!card) return ['no entry'];
    const marks = ['reaction-sign-face', 'entry-dateline'].map((id) => card.querySelector(`[data-testid=${id}]`)).filter(Boolean);
    return marks.map((m) => { const t = Math.round(m.getBoundingClientRect().top); return t >= Math.round(edge.bottom) || `${m.getAttribute('data-testid') ?? m.textContent.trim()}@${t}<${Math.round(edge.bottom)}`; });
  });
  const rl8 = { at390: await clearOf() };
  await pg.setViewportSize({ width: 320, height: 720 });
  await pg.waitForTimeout(900);
  rl8.at320 = await clearOf();
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(700);
  check(rl8.at390.length === 2 && rl8.at390.every((x) => x === true) && rl8.at320.length === 2 && rl8.at320.every((x) => x === true), `RL8: nothing lies over the first entry's dateline or sign at rest, at 390 and 320 (${JSON.stringify(rl8)})`);
  const sign = photoEntry().locator('[data-testid=reaction-sign]');
  const sign9 = { count: await sign.count(), label: await sign.getAttribute('aria-label').catch(() => null) };
  await sign.click({ timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(600);
  const families = await pg.locator('[data-testid=reaction-panel] [data-testid^=reaction-family-]').allInnerTexts().catch(() => []);
  await shot(pg, 'reactions-01-on-a-photo');
  await pg.click('[data-testid=reaction-panel] [data-testid=reaction-pick-happy]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(1000);
  const kept1 = await reactionsOf(pg, 'rx-photo');
  check(seeded === true && sign9.count === 1 && kept1?.feeling === 'happy',
    `RX1: a photo's entry today offers the face with a plus, and a tap on a reaction there keeps it (${JSON.stringify({ seeded, sign9, kept1 })})`);
  check(families.length === 3 && /^Feeling/.test(families[0]) && /^Taste/.test(families[1]) && /^Thought/.test(families[2]),
    `RX9: the sign opens the three families by themselves (${JSON.stringify(families)})`);
  await pg.click('[data-testid=reaction-done]', { timeout: 1500 }).catch(() => {});
  await pg.waitForTimeout(700);
  const marked9 = await photoEntry().locator('[data-testid=reaction-sign]').getAttribute('aria-label').catch(() => null);
  // RX14: the entry shows its reactions under its dateline, glyph and name, in the families' order.
  const marks14 = await photoEntry().locator('[data-testid=reaction-marks] [data-testid=reaction-name]').allInnerTexts().catch(() => []);
  check(marked9 === 'Reaction, Happy' && marks14.join() === 'Happy',
    `RX9, RX14: marked, the sign is the first reaction's glyph; the entry spells its reactions under the dateline (${JSON.stringify({ marked9, marks14 })})`);
  // reactions ui 2 (the cold find): the sign's plus reads as ink, not a faint grey badge: an ink disc of 16 px or more.
  const ui2 = await pg.evaluate(() => {
    const add = document.querySelector('[data-testid=reaction-sign-add]');
    if (!add) return null;
    const r = add.getBoundingClientRect();
    return { w: Math.round(r.width), bg: getComputedStyle(add).backgroundColor };
  });
  check(!!ui2 && ui2.w >= 16 && ui2.bg === INK, `reactions ui 2: the sign's plus is an ink disc of 16 px or more (${JSON.stringify(ui2)})`);
  const old9 = await entry('Nothing much on the way home').locator('[data-testid=reaction-sign]').count();
  check(old9 === 0, `RX9: an entry of an earlier day shows no sign on its row (${old9})`);

  // RX10: every entry's More offers Reaction, which shows the three families in the same sheet and stays for another.
  await entry('Nothing much on the way home').locator('[data-testid=moment-more]').click().catch(() => {});
  await pg.waitForTimeout(600);
  await pg.click('[data-testid=menu-reaction]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(500);
  const alone10 = await pg.locator('[data-testid=memory-menu] [data-testid=menu-less], [data-testid=memory-menu] [data-testid=menu-hide]').count();
  await pg.click('[data-testid=reaction-pick-sad]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(700);
  await pg.click('[data-testid=reaction-pick-question]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(700);
  const open10 = await pg.locator('[data-testid=memory-menu] [data-testid=reaction-panel]').count();
  await shot(pg, 'reactions-02-in-more');
  // reactions ui 3: a chosen reaction is marked by a check beside its name, never a rule under it like a tab.
  const ui3 = await pg.evaluate(() => {
    const on = [...document.querySelectorAll('[data-testid=memory-menu] [data-testid^=reaction-pick-][aria-checked=true]')];
    return on.map((e) => ({ check: !!e.querySelector('[data-testid=reaction-check]'), rule: getComputedStyle(e).borderBottomWidth }));
  });
  check(ui3.length === 2 && ui3.every((x) => x.check && (x.rule === '0px' || x.rule === '')), `reactions ui 3: a chosen reaction has a check, and no rule under it (${JSON.stringify(ui3)})`);
  // reactions ui 4: the sheet's way out is one word in ink at its top right, as the viewer's.
  const ui4 = await pg.evaluate(() => {
    const d = document.querySelector('[data-testid=memory-menu] [data-testid=reaction-done]');
    const sheet = document.querySelector('[data-testid=memory-menu]')?.getBoundingClientRect();
    if (!d || !sheet) return null;
    const r = d.getBoundingClientRect();
    const t = [...d.querySelectorAll('*')].find((x) => x.children.length === 0 && x.textContent.trim()) ?? d;
    return { word: d.innerText.trim(), ink: getComputedStyle(t).color, right: Math.round(sheet.right - r.right), top: Math.round(r.top - sheet.top) };
  });
  check(!!ui4 && ui4.word === 'Done' && ui4.ink === INK && ui4.right < 40 && ui4.top < 60, `reactions ui 4: the reactions sheet closes by Done, in ink, at its top right (${JSON.stringify(ui4)})`);
  // reactions ui 5: the three rows share three columns, Taste's two in the first two.
  const ui5 = await pg.evaluate(() => {
    const x = (id) => Math.round(document.querySelector(`[data-testid=memory-menu] [data-testid=reaction-pick-${id}]`)?.getBoundingClientRect().left ?? -1);
    return { happy: x('happy'), like: x('like'), question: x('question'), neutral: x('neutral'), dislike: x('dislike'), emphasis: x('emphasis') };
  });
  check(ui5.happy === ui5.like && ui5.like === ui5.question && ui5.neutral === ui5.dislike && ui5.dislike === ui5.emphasis, `reactions ui 5: Like and Dislike sit in the first two of the three columns (${JSON.stringify(ui5)})`);
  await pg.click('[data-testid=reaction-done]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const kept10 = await reactionsOf(pg, 'rx-plain');
  check(alone10 === 0 && open10 === 1 && kept10?.feeling === 'sad' && kept10?.thought === 'question',
    `RX10: More's Reaction shows the families by themselves and stays open for a second family (${JSON.stringify({ alone10, open10, kept10 })})`);

  // RX6-RX8: the entry being written: nothing before its first character, then the sign; the panel above the composer's
  // tools keeps writing, the camera, the mic and Done; a choice keeps it open; the next character closes it.
  // The entry is written in the composer (chronicle-journal JN47, decision 0179): the toolbar's field opens it.
  await pg.click('[data-testid=bar-compose]', { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(600);
  await pg.click('[data-testid=line-input]', { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(400);
  const before6 = await pg.locator('[data-testid=reaction-slot]').filter({ visible: true }).count();
  await pg.keyboard.type('Why is the square so quiet', { delay: 10 });
  await pg.waitForTimeout(1300);
  await pg.click('[data-testid=reaction-slot]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(500);
  const rows6 = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=reaction-panel] [data-testid^=reaction-family-]')].map((f) => ({ name: f.querySelector('[data-testid=reaction-group-name]')?.textContent, picks: [...f.querySelectorAll('[data-testid^=reaction-pick-]')].map((b) => b.querySelector('[data-testid=reaction-name]')?.textContent ?? '') })));
  const bar7 = await pg.evaluate(() => ['band-photo', 'band-voice', 'line-done'].filter((id) => { const r = document.querySelector(`[data-testid=${id}]`)?.getBoundingClientRect(); return !!r && r.width > 0; }).length);
  await shot(pg, 'reactions-03-while-writing');
  await pg.click('[data-testid=reaction-pick-idea]').catch(() => {});
  await pg.waitForTimeout(600);
  await pg.click('[data-testid=reaction-pick-neutral]').catch(() => {});
  await pg.waitForTimeout(800);
  const still7 = await pg.locator('[data-testid=reaction-panel]').count();
  const chosen6 = await pg.locator('[data-testid=reaction-pick-idea]').getAttribute('aria-checked').catch(() => null);
  await pg.click('[data-testid=line-input]').catch(() => {});
  await pg.keyboard.press('End');
  await pg.keyboard.type('?', { delay: 10 });
  await pg.waitForTimeout(800);
  const closed7 = await pg.locator('[data-testid=reaction-panel]').count();
  check(before6 === 0 && rows6.map((r) => r.name).join() === 'Feeling,Taste,Thought' && rows6.map((r) => r.picks.join('/')).join('|') === 'Happy/Neutral/Sad|Like/Dislike|Question/Emphasis/Idea' && chosen6 === 'true',
    `RX6: nothing before the first character; then the sign opens three rows under their words, each reaction with its name, chosen ones shown chosen (${JSON.stringify({ before6, rows6, chosen6 })})`);
  check(bar7 === 3 && still7 === 1 && closed7 === 0, `RX7: the camera, the mic and Done stay; a choice keeps the panel open; the next character closes it (${JSON.stringify({ bar7, still7, closed7 })})`);
  await pg.click('[data-testid=line-done]').catch(() => {});
  await pg.waitForTimeout(1200);
  await pg.reload();
  await there(entries, 20000);
  await pg.waitForTimeout(1200);
  const idOf = await pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => { const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll(); g.onsuccess = () => resolve(g.result.find((m) => m.pieces.some((p) => /square so quiet/.test(p.body ?? '')))?.id ?? null); };
  }));
  const kept8 = idOf ? await reactionsOf(pg, idOf) : null;
  check(kept8?.thought === 'idea' && kept8?.feeling === 'neutral', `RX8: what was chosen while writing is on the moment after Done and a reload (${JSON.stringify(kept8)})`);

  // RX34, RX36: at 320 px every reaction shows its name, nothing cut, 44 px targets, ink only, spoken with its family.
  await pg.setViewportSize({ width: 320, height: 720 });
  await pg.waitForTimeout(500);
  await photoEntry().locator('[data-testid=reaction-sign]').click({ timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(600);
  const at320 = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=reaction-panel] [data-testid^=reaction-pick-]')].map((e) => { const r = e.getBoundingClientRect(); const g = e.querySelector('[data-testid^=reaction-glyph-]'); return { label: e.getAttribute('aria-label'), text: e.querySelector('[data-testid=reaction-name]')?.textContent ?? '', w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right), ink: g ? getComputedStyle(g).color : null, bg: getComputedStyle(e).backgroundColor, cut: e.scrollWidth > e.clientWidth + 1 }; }));
  await shot(pg, 'reactions-04-panel-320');
  await pg.click('[data-testid=reaction-done]', { timeout: 1500 }).catch(() => {});
  await pg.setViewportSize({ width: 390, height: 844 });
  await pg.waitForTimeout(500);
  check(at320.length === 8 && at320.every((b) => b.w >= 44 && b.h >= 44 && b.l >= 0 && b.r <= 320 && !b.cut && b.text.length > 0) && at320.some((b) => b.label === 'Idea, Thought'),
    `RX34: at 320 px every reaction shows its name, nothing cut, each 44 px or more, spoken with its family (${JSON.stringify(at320.map((b) => [b.label, b.w, b.h]))})`);
  check(at320.length === 8 && at320.every((b) => b.ink === INK && /rgba\(0, 0, 0, 0\)|transparent/.test(b.bg)), `RX36: every glyph in the one ink colour, and no tint, chosen or not (${JSON.stringify(at320.map((b) => [b.ink, b.bg]))})`);

  // RX11, RX15: the viewer's More offers Reaction for a photo; its reactions show under the info line.
  await photoEntry().locator('[data-testid=moment-open]').click().catch(() => {});
  await there('[data-testid=capture-viewer]');
  await pg.click('[data-testid=viewer-more]', { timeout: 3000 }).catch(() => {});
  await pg.click('[data-testid=viewer-reaction]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(500);
  await pg.click('[data-testid=reaction-pick-like]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(500);
  await pg.click('[data-testid=reaction-pick-idea]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(800);
  await shot(pg, 'reactions-05a-viewer-panel');
  await pg.click('[data-testid=reaction-done]').catch(() => {});
  await pg.waitForTimeout(500);
  const marks15 = await pg.locator('[data-testid=capture-viewer] [data-testid=reaction-marks] [data-testid=reaction-name]').allInnerTexts().catch(() => []);
  await shot(pg, 'reactions-05-viewer');
  check(marks15.join() === 'Happy,Like,Idea', `RX11, RX15: the viewer's More sets a photo's reactions, and they show under its info line at once (${JSON.stringify(marks15)})`);
  await pg.click('[data-testid=viewer-close]').catch(() => {});
  await pg.waitForTimeout(600);

  // RX2, RX22-RX25: the contents hold Reactions; Ideas gathers every moment with Idea, oldest first, in context, no numbers.
  await pg.click('[data-testid=memories-menu]').catch(() => {});
  await pg.waitForTimeout(500);
  await pg.waitForTimeout(400);
  await shot(pg, 'reactions-05b-contents');
  const items22 = await pg.locator('[data-testid=memories-menu-sheet] [role=button]').allInnerTexts().catch(() => []);
  await pg.click('[data-testid=menu-reactions]', { timeout: 3000 }).catch(() => {});
  await there('[data-testid=reactions-screen]');
  await pg.waitForTimeout(600);
  const list23 = await pg.locator('[data-testid=reactions-screen]').innerText().catch(() => '');
  const rows23 = await pg.locator('[data-testid=reactions-screen] [data-testid^=lens-row-]').evaluateAll((es) => es.map((e) => e.dataset.testid.slice(9)));
  await shot(pg, 'reactions-06-the-lenses');
  check(items22.findIndex((t) => /^Reactions/.test(t)) === items22.findIndex((t) => /^Threads/.test(t)) + 1 && items22.some((t) => /Moments gathered by how you reacted/.test(t)),
    `RX22: the contents list Reactions after Threads, with its line (${JSON.stringify(items22)})`);
  check(rows23.join() === 'happy,neutral,sad,like,question,idea' && !/\d/.test(list23),
    `RX23: one row per reaction a moment has, in the set's order, and no number anywhere (${JSON.stringify({ rows23, list23 })})`);
  await pg.click('[data-testid=lens-row-idea]', { timeout: 3000 }).catch(() => {});
  await there('[data-testid=lens-screen]');
  await pg.waitForTimeout(800);
  const lens24 = await pg.locator('[data-testid=lens-screen] [data-testid=moment-open]').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
  const title24 = await pg.locator('[data-testid=lens-title]').innerText().catch(() => '');
  await shot(pg, 'reactions-07-ideas');
  const backWordList = await pg.locator('[data-testid=lens-back]').innerText().catch(() => null);
  check(backWordList === 'Reactions', `reaction-links live 1: a lens opened from the Reactions list says Back to Reactions (${backWordList})`);
  check(title24 === 'Ideas' && lens24.length === 4 && /alleys/.test(lens24[0]) && /bakery/.test(lens24[1]) && lens24.every((l) => /(ago|day|morning|afternoon|evening|night|today|yesterday)/i.test(l)),
    `RX2, RX24: Ideas shows every moment with Idea, oldest first, each in its context (${JSON.stringify({ title24, lens24 })})`);
  await pg.locator('[data-testid=lens-screen] [data-testid=moment-open]').first().click().catch(() => {});
  await there('[data-testid=capture-viewer]');
  await pg.waitForTimeout(600);
  const info25 = await pg.locator('[data-testid=capture-viewer]').innerText().catch(() => '');
  await pg.locator('[data-testid=capture-viewer] [aria-label="Next moment"]').first().click().catch(() => {});
  await pg.waitForTimeout(600);
  const next25 = await pg.locator('[data-testid=capture-viewer]').innerText().catch(() => '');
  await pg.click('[data-testid=viewer-close]').catch(() => {});
  await pg.waitForTimeout(600);
  const back25 = await pg.locator('[data-testid=lens-screen]').count();
  check(/alleys/.test(info25) && /bakery/.test(next25) && !/\b\d+ of \d+\b/.test(info25 + next25) && back25 === 1,
    `RX25: a moment opens in the viewer, which steps through the lens with no position; Back returns to the lens (${JSON.stringify({ back25, info25: info25.slice(0, 200), next25: next25.slice(0, 200) })})`);

  // RX26: a cleared reaction leaves its lens when it is next shown.
  await pg.locator('[data-testid=lens-screen] [data-testid=moment-open]').first().click().catch(() => {});
  await there('[data-testid=capture-viewer]');
  await pg.click('[data-testid=viewer-more]', { timeout: 3000 }).catch(() => {});
  await pg.click('[data-testid=viewer-reaction]', { timeout: 3000 }).catch(() => {});
  await pg.click('[data-testid=reaction-pick-idea]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(600);
  await pg.click('[data-testid=reaction-done]').catch(() => {});
  await pg.click('[data-testid=viewer-close]').catch(() => {});
  await pg.waitForTimeout(800);
  const lens26 = await pg.locator('[data-testid=lens-screen] [data-testid=moment-open]').count();
  check(lens26 === 3, `RX26: a moment whose reaction is cleared leaves its lens (${lens26})`);
  await pg.click('[data-testid=lens-back]').catch(() => {});
  await pg.click('[data-testid=reactions-back]').catch(() => {});
  await pg.waitForTimeout(500);

  // RX3, RX17-RX21: on Chronicle's Map the photo's pin wears its reactions as bubbles at its bottom-left, in order, ink
  // discs, the head still the photo; a change shows on the same pin at once.
  await pg.click('[data-testid=section-map]').catch(() => {});
  await there('canvas.maplibregl-canvas', 15000);
  await pg.waitForTimeout(3000);
  const pin = '[data-ids="rx-photo"]';
  const pin17 = await pg.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const head = el.querySelector('[data-testid=pin-head]')?.getBoundingClientRect() ?? el.getBoundingClientRect();
    const bubbles = [...el.querySelectorAll('[data-testid=pin-reaction]')].map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.reaction, x: Math.round(r.x), cy: Math.round(r.y + r.height / 2), w: Math.round(r.width), bg: getComputedStyle(b).backgroundColor }; });
    return { label: el.getAttribute('aria-label'), head: { x: Math.round(head.x), cx: Math.round(head.x + head.width / 2), cy: Math.round(head.y + head.height / 2) }, bubbles, photo: !!el.querySelector('img') };
  }, pin);
  await shot(pg, 'reactions-08-pin');
  check(!!pin17 && pin17.bubbles.map((b) => b.id).join() === 'happy,like,idea' && pin17.bubbles.every((b) => b.bg === INK && b.cy > pin17.head.cy) && pin17.bubbles[0].x < pin17.head.cx && pin17.photo,
    `RX3, RX17, RX18: the photo's pin wears its reactions as ink bubbles from its bottom-left, and its head is still the photo (${JSON.stringify(pin17)})`);
  check(!!pin17 && /^Photo, happy, like, idea/.test(pin17.label ?? ''), `RX21: the pin says its reactions after its kind (${pin17?.label})`);
  const several19 = await pg.evaluate(() => [...document.querySelectorAll('[data-ids*=","]')].map((e) => e.querySelectorAll('[data-testid=pin-reaction]').length));
  check(several19.every((n) => n === 0), `RX19: a pin of several wears no bubbles (${JSON.stringify(several19)})`);
  const box20 = await pg.evaluate((sel) => {
    const el = document.querySelector(sel);
    const r = (q) => { const b = el?.querySelector(q)?.getBoundingClientRect(); return b ? [b.left, b.top, b.right, b.bottom] : null; };
    const bubbles = [...(el?.querySelectorAll('[data-testid=pin-reaction]') ?? [])].map((b) => { const q = b.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom]; });
    return { bubbles, bell: r('[data-testid=pin-reminder]'), clock: r('[data-testid=memory-clock]'), video: r('[data-testid=pin-video-mark]') };
  }, pin);
  const overlaps = (a, b) => !!a && !!b && a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  check(box20.bubbles.length === 3 && box20.bubbles.every((b) => ![box20.bell, box20.clock, box20.video].some((o) => overlaps(b, o))),
    `RX20: the bubbles never cover the bell, the clock or the video mark (${JSON.stringify(box20)})`);
  // reactions ui 1 (the cold find): every bubble touches its own head, and none lies over another pin's head.
  const ui1 = await pg.evaluate(() => {
    const box = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; };
    const meets = (a, b, pad = 0) => a[0] < b[2] + pad && b[0] < a[2] + pad && a[1] < b[3] + pad && b[1] < a[3] + pad;
    const pins = [...document.querySelectorAll('[data-ids]')].map((el) => ({ el, head: el.querySelector('[data-testid=pin-head]') }));
    const rows = pins.filter((p) => p.el.querySelector('[data-testid=pin-reaction]')).map((p) => {
      const bubbles = [...p.el.querySelectorAll('[data-testid=pin-reaction]')].map(box);
      const head = box(p.head);
      const others = pins.filter((o) => o !== p && o.head).map((o) => box(o.head));
      return { touch: bubbles.every((b) => meets(b, head)), over: bubbles.some((b) => others.some((o) => meets(b, o))) };
    });
    return { rows: rows.length, apart: rows.filter((r) => !r.touch).length, over: rows.filter((r) => r.over).length };
  });
  check(ui1.rows >= 2 && ui1.apart === 0 && ui1.over === 0, `reactions ui 1: every bubble touches its own pin's head, and none lies over another pin's head (${JSON.stringify(ui1)})`);
  const handle = await pg.$(pin);
  await pg.click(pin).catch(() => {});
  await there('[data-testid=capture-viewer]');
  await pg.click('[data-testid=viewer-more]', { timeout: 3000 }).catch(() => {});
  await pg.click('[data-testid=viewer-reaction]', { timeout: 3000 }).catch(() => {});
  await pg.click('[data-testid=reaction-pick-like]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(800);
  const plain4 = await pg.locator('[data-testid=capture-viewer] [data-testid^=reaction-link-]').count();
  const marks4 = await pg.locator('[data-testid=capture-viewer] [data-testid=reaction-marks]').count();
  check(plain4 === 0 && marks4 === 1, `RL4: a viewer opened from Chronicle's Map shows the reactions as plain words (${JSON.stringify({ plain4, marks4 })})`);
  const behind21 = handle ? await handle.evaluate((e) => ({ connected: e.isConnected, n: e.querySelectorAll('[data-testid=pin-reaction]').length })).catch(() => null) : null;
  await pg.click('[data-testid=reaction-done]').catch(() => {});
  await pg.click('[data-testid=viewer-close]').catch(() => {});
  check(!!behind21 && behind21.connected && behind21.n === 2, `RX21: a change of reaction shows on the same pin behind the viewer at once (${JSON.stringify(behind21)})`);

  // Reaction links (specs/reaction-links, RL1-RL3, RL5, RL6, RL9).
  await pg.click('[data-testid=section-memories]').catch(() => {});
  await there(entries, 15000);
  await pg.waitForTimeout(1500);
  // RL6: once marked, the sign is still the face with a plus at the same size, and says all that is chosen.
  const sign6 = await pg.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid=journal-page] [data-testid=moment-card]')];
    const marked = cards.find((c) => c.querySelector('img') && c.querySelector('[data-testid=reaction-sign]'));
    const plain = cards.find((c) => !c.querySelector('[data-testid=reaction-marks]') && c.querySelector('[data-testid=reaction-sign]'));
    const box = (c) => { const g = c?.querySelector('[data-testid=reaction-sign-face]')?.getBoundingClientRect(); return g ? [Math.round(g.width), Math.round(g.height)] : null; };
    return { label: marked?.querySelector('[data-testid=reaction-sign]')?.getAttribute('aria-label'), plus: !!marked?.querySelector('[data-testid=reaction-sign-add]'), size: box(marked), plainSize: box(plain) };
  });
  check(sign6.label === 'Reaction, Happy, Idea' && sign6.plus && !!sign6.size && JSON.stringify(sign6.size) === JSON.stringify(sign6.plainSize),
    `RL6: a marked entry's sign is still the face with a plus at the same size, and says what is chosen (${JSON.stringify(sign6)})`);
  // RL1, RL2, RL5: "Idea" under the photo's entry is a link to Ideas; Back returns to the journal.
  const link5 = await photoEntry().locator('[data-testid=reaction-link-idea]').evaluate((e) => { const r = e.getBoundingClientRect(); return { role: e.getAttribute('role'), label: e.getAttribute('aria-label'), h: Math.round(r.height) }; }).catch(() => null);
  check(!!link5 && link5.role === 'link' && link5.label === 'Ideas' && link5.h >= 44, `RL5: a reaction under an entry is a link named for its lens, 44 px tall (${JSON.stringify(link5)})`);
  // reaction-links ui 1 (the cold find, U1): a link's word is underlined in ink; a plain mark's is not.
  const ui1l = await pg.evaluate(() => {
    const deco = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).textDecorationLine : null; };
    return { link: deco('[data-testid=reaction-link-idea] [data-testid=reaction-name]'), plain: deco('[data-testid=lens-screen] [data-testid=reaction-name]') };
  });
  check(ui1l.link === 'underline', `reaction-links ui 1: a reaction that is a link has its word underlined in ink (${JSON.stringify(ui1l)})`);
  await shot(pg, 'reactions-09-links-under-entry');
  await photoEntry().locator('[data-testid=reaction-link-idea]').click().catch(() => {});
  const lens2 = await there('[data-testid=lens-screen]');
  const title2 = await pg.locator('[data-testid=lens-title]').innerText().catch(() => '');
  const count2 = await pg.locator('[data-testid=lens-screen] [data-testid=moment-open]').count();
  // reaction-links live 1 (the deploy's live check): Back names where it goes; from an entry, the journal.
  const backWord2 = { text: await pg.locator('[data-testid=lens-back]').innerText().catch(() => null), label: await pg.locator('[data-testid=lens-back]').getAttribute('aria-label').catch(() => null) };
  check(backWord2.text === 'Journal' && backWord2.label === 'Back to the journal', `reaction-links live 1: a lens opened from an entry says Back to the journal (${JSON.stringify(backWord2)})`);
  await pg.click('[data-testid=lens-back]').catch(() => {});
  await pg.waitForTimeout(800);
  const back2 = { journal: await pg.locator('[data-testid=journal-page]').count(), list: await pg.locator('[data-testid=reactions-screen]').count() };
  check(lens2 && title2 === 'Ideas' && count2 >= 3 && back2.journal === 1 && back2.list === 0,
    `RL1, RL2: "Idea" under an entry opens the whole Ideas lens, and Back returns to the journal (${JSON.stringify({ lens2, title2, count2, back2 })})`);
  // RL3: in the viewer opened from an entry, "Happy" is a link: the viewer closes, Happy moments opens; Back, the journal.
  await photoEntry().locator('[data-testid=moment-open]').click().catch(() => {});
  await there('[data-testid=capture-viewer]');
  await pg.waitForTimeout(800);
  await pg.locator('[data-testid=capture-viewer] [data-testid=reaction-link-happy]').click().catch(() => {});
  await pg.waitForTimeout(1000);
  const viewer3 = await pg.locator('[data-testid=capture-viewer]').count();
  const title3 = await pg.locator('[data-testid=lens-title]').innerText().catch(() => '');
  await pg.click('[data-testid=lens-back]').catch(() => {});
  await pg.waitForTimeout(800);
  const back3 = await pg.locator('[data-testid=journal-page]').count();
  check(viewer3 === 0 && title3 === 'Happy moments' && back3 === 1, `RL3: a reaction in the viewer opened from an entry closes it and opens its lens; Back, the journal (${JSON.stringify({ viewer3, title3, back3 })})`);
  // RL9: a reaction that cannot be kept is not shown as chosen, and the panel says "Not kept yet".
  await pg.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    window.__unbreak = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function (...a) { if (this.name === 'reaction') throw new DOMException('broken for the test', 'UnknownError'); return put.apply(this, a); };
  });
  await entry('Nothing much on the way home').locator('[data-testid=moment-more]').click().catch(() => {});
  await pg.click('[data-testid=menu-reaction]', { timeout: 3000 }).catch(() => {});
  await pg.click('[data-testid=reaction-pick-like]', { timeout: 3000 }).catch(() => {});
  await pg.waitForTimeout(900);
  const fail9 = { line: await pg.locator('[data-testid=reaction-not-kept]').innerText().catch(() => null), chosen: await pg.locator('[data-testid=reaction-pick-like]').getAttribute('aria-checked').catch(() => null) };
  // reaction-links ui 2 (U2): the line is in ink, at the panel's top, above the first family.
  const ui2k = await pg.evaluate(() => {
    const line = document.querySelector('[data-testid=reaction-not-kept]');
    const fam = document.querySelector('[data-testid=reaction-family-feeling]');
    if (!line || !fam) return null;
    return { above: line.getBoundingClientRect().bottom <= fam.getBoundingClientRect().top + 1, color: getComputedStyle(line).color };
  });
  check(!!ui2k && ui2k.above && ui2k.color === 'rgb(29, 36, 48)', `reaction-links ui 2: "Not kept yet" is in ink at the panel's top (${JSON.stringify(ui2k)})`);
  await shot(pg, 'reactions-10-not-kept');
  await pg.evaluate(() => window.__unbreak?.());
  await pg.click('[data-testid=reaction-done]').catch(() => {});
  await pg.waitForTimeout(600);
  check(fail9.line === 'Not kept yet' && fail9.chosen === 'false', `RL9: a reaction not kept is not shown as chosen, and the panel says so in words (${JSON.stringify(fail9)})`);

  await c.close();
}

module.exports = {
  name: 'reactions',
  covers: [
    'src/lib/reactions/**',
    'src/components/reactions/**',
    'src/components/chronicle/MemoriesMenu.tsx',
  ],
  run,
};
