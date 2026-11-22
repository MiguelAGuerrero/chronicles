// The recording bar keeps a memo and a note (specs/recording-bar-captures, BC1-BC10, from T11): with a walk minimized,
// the bar on every tab but Memories holds a camera, a mic and a pencil beside its Stop; the mic records in place, the
// pencil opens the note's page over the tab, and what they keep joins the open walk. E2E_ONLY=barcaptures runs it alone.

// Every moment of a walk, read back as its first piece's kind (decision 0123); bounded, so a stuck read never hangs.
const momentsOf = (pg, walkId) => pg.evaluate((id) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve([]), 5000);
  const req = indexedDB.open('chronicles');
  req.onerror = () => { clearTimeout(timer); resolve([]); };
  req.onsuccess = () => {
    const conn = req.result;
    const g = conn.transaction('moment', 'readonly').objectStore('moment').getAll();
    g.onsuccess = () => {
      clearTimeout(timer);
      conn.close();
      resolve(g.result.filter((m) => m.walk_id === id).map((m) => ({ id: m.id, kind: m.pieces?.[0]?.kind ?? null, body: m.pieces?.[0]?.body ?? null })));
    };
    g.onerror = () => { clearTimeout(timer); conn.close(); resolve([]); };
  };
}), walkId);

async function run(h) {
  const { navUrl, BASE, check, shot, tabTo, freshPage, openWalk } = h;
  const { c, pg } = await freshPage('barcaptures', { permissions: ['geolocation', 'microphone'] });
  const shown = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const there = (sel, timeout = 8000) => pg.waitForSelector(sel, { timeout, state: 'visible' }).then(() => true, () => false);
  const box = async (sel) => {
    const b = await pg.locator(sel).filter({ visible: true }).first().boundingBox().catch(() => null);
    return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const path = () => new URL(pg.url()).pathname.slice(BASE.length - 1);
  // The URL is watched for the whole run: no capture from the bar ever opens the walk screen (BC2, BC8).
  const urls = [];
  pg.on('framenavigated', (f) => { if (f === pg.mainFrame()) urls.push(new URL(f.url()).pathname); });
  const walkUrlSince = (from) => urls.slice(from).some((u) => /\/walk$/.test(u));
  // A step that throws is said, and the run goes on to the next.
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      check(false, `The step ${name} ran to its end (${String(e).split('\n')[0]})`);
    }
  };
  const kinds = async () => (await momentsOf(pg, walk?.id)).map((m) => m.kind);
  const count = async (kind) => (await kinds()).filter((k) => k === kind).length;
  const settle = async (kind, before, timeout = 8000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if ((await count(kind)) > before) return true;
      await pg.waitForTimeout(300);
    }
    return false;
  };
  const memo = async (ms = 1800) => {
    await pg.click('[data-testid=bar-voice]', { timeout: 5000 });
    await there('[data-testid=bar-voice-timer]', 5000);
    await pg.waitForTimeout(ms);
  };
  const hold = async (sel, ms = 1100) => {
    const b = await box(sel);
    if (!b) return;
    await pg.mouse.move(b.x + b.w / 2, b.y + b.h / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(ms);
    await pg.mouse.up();
  };
  const minimize = async () => {
    await pg.click('[data-testid=walk-minimize]');
    await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
    await pg.waitForTimeout(600);
  };

  // A walk started and minimized to Explore.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=start]');
  await pg.waitForSelector('[data-testid=walk-minimize]', { timeout: 20000 });
  await pg.waitForTimeout(1500);
  const walk = await openWalk(pg);
  await minimize();
  await tabTo(pg, 'explore');
  await pg.waitForTimeout(1200);
  const ids = ['bar-photo', 'bar-voice', 'bar-note', 'bar-stop'];
  const row = async () => {
    const boxes = await Promise.all(ids.map((id) => box(`[data-testid=recording-bar] [data-testid=${id}]`)));
    const names = await Promise.all(ids.map((id) => pg.locator(`[data-testid=recording-bar] [data-testid=${id}]`).first().getAttribute('aria-label').catch(() => null)));
    return { boxes, names };
  };

  await step('BC1', async () => {
    const r = await row();
    const ordered = r.boxes.every((b, i) => !!b && (i === 0 || b.x > r.boxes[i - 1].x));
    const sized = r.boxes.every((b) => b && b.w >= 44 && b.h >= 44);
    await shot(pg, 'bc-01-explore-390');
    check(ordered && sized && r.names[1] === 'Add to your walk: record a voice memo' && r.names[2] === 'Add to your walk: write a note',
      `BC1: on Explore the bar holds the camera, the mic, the pencil and Stop in that order, each 44 px, the mic and the pencil named (${JSON.stringify(r)})`);
  });

  // BC6: one row at 390 and 320, the time alone, the chevron from 360 px; the distance in the spoken name.
  const line = () => pg.evaluate(() => {
    const q = (id) => document.querySelector(`[data-testid=recording-bar] [data-testid=${id}]`);
    const mid = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? Math.round(r.y + r.height / 2) : null; };
    const n = q('recording-numbers');
    return {
      words: n?.textContent ?? null,
      whole: !!n && n.scrollWidth <= n.clientWidth + 1,
      name: n?.getAttribute('aria-label') ?? q('recording-return')?.getAttribute('aria-label') ?? null,
      chevron: !!q('recording-go'),
      mids: ['recording-return', 'bar-photo', 'bar-voice', 'bar-note', 'bar-stop'].map((id) => mid(q(id))),
      wide: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  await step('BC6', async () => {
    const at390 = await line();
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(1000);
    const at320 = await line();
    await shot(pg, 'bc-02-explore-320');
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForTimeout(800);
    const oneRow = (l) => l.mids.every((m) => m != null && Math.abs(m - l.mids[0]) <= 2);
    check(oneRow(at390) && oneRow(at320) && at390.whole && at320.whole && at390.wide && at320.wide
      && /^(< 1|\d+) min$/.test(at390.words ?? '') && at390.chevron && !at320.chevron && /walked in/.test(at390.name ?? ''),
      `BC6: at 390 and 320 px the dot, the time alone, camera, mic, pencil and Stop share one row, the chevron only at 390, the distance in the spoken name (${JSON.stringify({ at390, at320 })})`);
  });

  // BC10: the bar's words on a line of their own above the buttons, the buttons unmoved.
  await step('BC10', async () => {
    await pg.setViewportSize({ width: 320, height: 700 });
    await pg.waitForTimeout(800);
    const before = await row();
    await pg.click('[data-testid=bar-stop]');
    const said = await there('[data-testid=recording-said]', 4000);
    const words = await box('[data-testid=recording-said]');
    const after = await row();
    const text = await pg.locator('[data-testid=recording-said]').innerText().catch(() => '');
    await shot(pg, 'bc-03-said-320');
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForTimeout(3500);
    const xs = (r) => r.boxes.map((b) => b && b.x);
    check(said && /Hold to stop/.test(text) && !!words && after.boxes.every((b) => b && words.y + words.h <= b.y + 0.5)
      && JSON.stringify(xs(before)) === JSON.stringify(xs(after)),
      `BC10: at 320 px "Hold to stop" stands on its own line above the bar's buttons, which do not move (${JSON.stringify({ text, words, before: xs(before), after: xs(after) })})`);
  });

  // BC2: the memo records in place and joins the walk; the walk screen never opens.
  await step('BC2', async () => {
    const from = urls.length;
    const before = await row();
    const voices = await count('voice');
    await memo();
    const timer = await shown('[data-testid=recording-bar] [data-testid=bar-voice-timer]');
    const discard = await box('[data-testid=bar-voice-discard]');
    const save = await box('[data-testid=bar-voice-save]');
    const stop = await box('[data-testid=recording-bar] [data-testid=bar-stop]');
    const noPencil = !(await shown('[data-testid=recording-bar] [data-testid=bar-note]'));
    // recording-bar-captures ui 2 (the UI review's U4): the memo's red dot has the idle dot's white ring, 3:1 on the bar.
    const ring = await pg.locator('[data-testid=bar-voice-dot]').evaluate((e) => { const st = getComputedStyle(e); return { w: st.borderTopWidth, c: st.borderTopColor }; }).catch(() => null);
    check(!!ring && parseFloat(ring.w) >= 1 && ring.c === 'rgb(255, 255, 255)', `recording-bar-captures ui 2: the memo's red dot has a white ring (${JSON.stringify(ring)})`);
    await shot(pg, 'bc-04-memo-390');
    await pg.click('[data-testid=bar-voice-save]');
    const kept = await settle('voice', voices);
    const [b0, b1, , b3] = before.boxes;
    check(timer && !!discard && !!save && !!stop && noPencil && Math.abs(discard.x + discard.w / 2 - (b0.x + b0.w / 2)) <= 2
      && Math.abs(save.x + save.w / 2 - (b1.x + b1.w / 2)) <= 2 && stop.x === b3.x && kept && !walkUrlSince(from) && !/\/walk$/.test(path()),
      `BC2: the mic records on Explore: the memo's time in the line, Discard in the camera's place, Save in the mic's, Stop unmoved; saved, the memo is in the walk and the walk screen never opened (${JSON.stringify({ timer, discard, save, stop, before: before.boxes, kept })})`);
    // Saved at once, a memo under a second is not kept, and the bar says so.
    const n = await count('voice');
    await pg.click('[data-testid=bar-voice]');
    await there('[data-testid=bar-voice-save]', 4000);
    await pg.click('[data-testid=bar-voice-save]');
    const short = await there('[data-testid=recording-said]:has-text("Too short, not kept")', 4000);
    await pg.waitForTimeout(1500);
    check(short && (await count('voice')) === n, `BC2: a memo saved at once is not kept, and the bar says "Too short, not kept" (${short})`);
    await pg.waitForTimeout(3000);
  });

  // BC7: a memo or a note kept says nothing on the bar; nothing in the accent colour.
  await step('BC7', async () => {
    const voices = await count('voice');
    await memo();
    await pg.click('[data-testid=bar-voice-save]');
    await settle('voice', voices);
    await pg.waitForTimeout(400);
    const said = await shown('[data-testid=recording-said]');
    const accent = await pg.evaluate(() => [...document.querySelectorAll('[data-testid=recording-bar] *')].some((e) => {
      const s = getComputedStyle(e);
      return [s.color, s.backgroundColor, s.borderColor].some((v) => v === 'rgb(194, 65, 12)');
    }));
    const digitsOnly = await pg.locator('[data-testid=recording-bar]').innerText().catch(() => '');
    check(!said && !accent && !/\b\d+ (memos?|notes?|photos?)\b/i.test(digitsOnly),
      `BC7: a memo kept says nothing on the bar, which has no accent colour and no count (${JSON.stringify({ said, accent, digitsOnly })})`);
  });

  // BC9: Discard sets the memo aside with the walk screen's pill above the bar; Undo keeps it.
  await step('BC9', async () => {
    const voices = await count('voice');
    await memo();
    await pg.click('[data-testid=bar-voice-discard]');
    const pill = await there('[data-testid=bar-voice-undo]', 4000);
    const pillBox = await box('[data-testid=bar-voice-undo]');
    const barBox = await box('[data-testid=recording-bar]');
    const words = await pg.locator('[data-testid=bar-discarded]').innerText().catch(() => '');
    await shot(pg, 'bc-05-discarded-390');
    await pg.click('[data-testid=bar-voice-undo]');
    const kept = await settle('voice', voices);
    check(pill && /Voice memo discarded/.test(words) && !!pillBox && !!barBox && pillBox.y + pillBox.h <= barBox.y + 0.5 && kept,
      `BC9: Discard shows "Voice memo discarded" with Undo just above the bar, and Undo keeps the memo in the walk (${JSON.stringify({ words, pillBox, barBox, kept })})`);
  });

  // BC4: the pencil opens the note's page over the tab; words kept join the walk; an empty page keeps nothing.
  await step('BC4', async () => {
    const from = urls.length;
    const notes = await count('text');
    await pg.click('[data-testid=bar-note]');
    const page = await there('[data-testid=note-page] [data-testid=note-input]', 8000);
    await pg.waitForTimeout(600);
    await shot(pg, 'bc-06-note-390');
    await pg.locator('[data-testid=note-page] [data-testid=note-input] [contenteditable=true]').first().fill('A line from the bar.').catch(async () => {
      await pg.keyboard.type('A line from the bar.', { delay: 10 });
    });
    await pg.waitForTimeout(1500);
    await pg.click('[data-testid=note-done]');
    await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
    const kept = await settle('text', notes);
    const n = await count('text');
    await pg.click('[data-testid=bar-note]');
    await there('[data-testid=note-page] [data-testid=note-input]', 8000);
    await pg.waitForTimeout(800);
    await pg.click('[data-testid=note-done]');
    await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    const emptyKept = (await count('text')) > n;
    check(page && kept && !emptyKept && !walkUrlSince(from) && (await shown('[data-testid=recording-bar]')),
      `BC4: the pencil opens the note's page over Explore; Done with words keeps a note in the walk, an empty page keeps nothing, the walk screen never opens (${JSON.stringify({ page, kept, emptyKept })})`);
  });

  // BC3: leaving the tab mid-memo saves it; the web warns before a reload; the line saves, then returns; Stop refuses.
  await step('BC3', async () => {
    let voices = await count('voice');
    await memo();
    const warns = await pg.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
    await hold('[data-testid=recording-bar] [data-testid=bar-stop]');
    const refused = await there('[data-testid=recording-said]:has-text("A voice memo is recording. Save it first.")', 4000);
    const refusedBox = await box('[data-testid=recording-said]');
    const stillWalking = !!(await openWalk(pg));
    await tabTo(pg, 'chronicle', 'walks');
    const savedByTab = await settle('voice', voices);
    voices = await count('voice');
    await pg.waitForTimeout(800);
    await memo();
    await pg.click('[data-testid=recording-return]');
    const back = await there('[data-testid=walk-actions]', 10000);
    const savedByLine = await settle('voice', voices);
    check(warns && refused && !!refusedBox && stillWalking && savedByTab && back && savedByLine,
      `BC3: mid-memo the web warns before a reload, Stop refuses ("A voice memo is recording. Save it first."), a change of tab saves the memo, and the line saves it, then opens the walk (${JSON.stringify({ warns, refused, stillWalking, savedByTab, back, savedByLine })})`);
    await minimize();
  });

  // BC8 (E-tabs-9): from Chronicle's Walks, the photo, the memo and the note each one tap from the bar, each kept in the
  // open walk, the URL never /walk.
  await step('BC8', async () => {
    await tabTo(pg, 'chronicle', 'walks');
    await pg.waitForTimeout(1000);
    const from = urls.length;
    const before = { photo: await count('photo'), voice: await count('voice'), text: await count('text') };
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), pg.click('[data-testid=bar-photo]')]);
    await chooser?.setFiles(require('path').join(h.scriptsDir, 'fixtures', 'photo.jpg'));
    if (await there('[data-testid=media-editor]', 8000)) {
      await pg.click('[data-testid=edit-close]').catch(() => {});
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
    }
    const photo = await settle('photo', before.photo);
    await memo();
    await pg.click('[data-testid=bar-voice-save]');
    const voice = await settle('voice', before.voice);
    await pg.click('[data-testid=bar-note]');
    await there('[data-testid=note-page] [data-testid=note-input]', 8000);
    await pg.waitForTimeout(500);
    await pg.keyboard.type('From the walks list.', { delay: 10 });
    await pg.waitForTimeout(1500);
    await pg.click('[data-testid=note-done]');
    await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
    const text = await settle('text', before.text);
    await shot(pg, 'bc-07-walks-390');
    check(photo && voice && text && !walkUrlSince(from),
      `BC8: from Chronicle's Walks the bar's photo, memo and note are each kept in the open walk, the URL never /walk (${JSON.stringify({ photo, voice, text })})`);
  });

  // BC1 on Memories: none of the three, as today (decision 0112).
  await step('BC1 Memories', async () => {
    await tabTo(pg, 'chronicle', 'memories');
    // tabTo leaves Chronicle on the section it was last on; Memories is chosen by its own button.
    if (await shown('[data-testid=section-memories]')) await pg.click('[data-testid=section-memories]');
    await pg.waitForTimeout(1500);
    const none = !(await shown('[data-testid=recording-bar] [data-testid=bar-photo]')) && !(await shown('[data-testid=recording-bar] [data-testid=bar-voice]'))
      && !(await shown('[data-testid=recording-bar] [data-testid=bar-note]'));
    check(none && (await shown('[data-testid=recording-bar] [data-testid=bar-stop]')), `BC1: on Memories the bar holds no camera, mic or pencil, only Stop (${none})`);
  });

  // BC5: paused, the bar's memo and note join the walk.
  await step('BC5', async () => {
    await tabTo(pg, 'explore');
    await pg.waitForTimeout(800);
    await pg.click('[data-testid=recording-return]');
    await pg.waitForSelector('[data-testid=pause-walk]', { timeout: 10000 });
    await pg.click('[data-testid=pause-walk]');
    await pg.waitForSelector('[data-testid=resume-walk]', { timeout: 10000 });
    await minimize();
    // recording-bar-captures ui 1 (the UI review's U2): paused, the time and " · Paused" keep their space between them.
    const gap = await pg.evaluate(() => {
      const n = document.querySelector('[data-testid=recording-bar] [data-testid=recording-numbers]');
      const w = document.querySelector('[data-testid=recording-bar] [data-testid=recording-word]');
      if (!n || !w) return null;
      const r = document.createRange();
      r.selectNodeContents(w);
      const first = [...r.getClientRects()][0];
      return first ? Math.round(first.left - n.getBoundingClientRect().right) : null;
    });
    const dotAt = await pg.evaluate(() => {
      const w = document.querySelector('[data-testid=recording-bar] [data-testid=recording-word]');
      if (!w || !w.firstChild) return null;
      // Where the separator's dot is drawn, measured from the time's end.
      const t = w.firstChild;
      const i = t.textContent.indexOf('·');
      const r = document.createRange();
      r.setStart(t, i);
      r.setEnd(t, i + 1);
      const n = document.querySelector('[data-testid=recording-bar] [data-testid=recording-numbers]').getBoundingClientRect();
      return Math.round(r.getBoundingClientRect().left - n.right);
    });
    await shot(pg, 'bc-09-paused-line-390');
    check(gap != null && dotAt != null && dotAt >= 3, `recording-bar-captures ui 1: paused, a space stands between the time and " · Paused" (${JSON.stringify({ gap, dotAt })})`);
    const before = { voice: await count('voice'), text: await count('text') };
    await memo();
    await pg.click('[data-testid=bar-voice-save]');
    const voice = await settle('voice', before.voice);
    await pg.click('[data-testid=bar-note]');
    await there('[data-testid=note-page] [data-testid=note-input]', 8000);
    await pg.waitForTimeout(500);
    await pg.keyboard.type('Paused here.', { delay: 10 });
    await pg.waitForTimeout(1500);
    await pg.click('[data-testid=note-done]');
    await pg.waitForSelector('[data-testid=note-page]', { state: 'detached', timeout: 8000 }).catch(() => {});
    const text = await settle('text', before.text);
    await shot(pg, 'bc-08-paused-390');
    check(voice && text, `BC5: with the walk paused, the bar's memo and note join the walk (${JSON.stringify({ voice, text })})`);
  });

  // The diff review's regressions (Nov 22).
  await step('audit 1', async () => {
    await tabTo(pg, 'explore');
    await pg.waitForTimeout(1000);
    const voices = await count('voice');
    await memo();
    await pg.click('[data-testid=outing-entry]');
    await there('[data-testid=outing]', 8000);
    const saved = await settle('voice', voices);
    const stillOn = await pg.evaluate(() => !!document.querySelector('[data-testid=bar-voice-timer]'));
    await pg.keyboard.press('Escape');
    await pg.waitForSelector('[data-testid=outing]', { state: 'detached', timeout: 8000 }).catch(() => {});
    await pg.waitForTimeout(800);
    check(saved && !stillOn, `recording-bar-captures audit 1: a memo recording when Plan an outing opens over Explore is saved, the mic not left on under it (${JSON.stringify({ saved, stillOn })})`);
  });
  await step('audit 2', async () => {
    await tabTo(pg, 'chronicle', 'walks');
    await pg.waitForTimeout(1000);
    const voices = await count('voice');
    await memo();
    await pg.click('[data-testid=section-days]');
    await pg.waitForTimeout(1500);
    const still = await shown('[data-testid=recording-bar] [data-testid=bar-voice-timer]');
    const early = (await count('voice')) > voices;
    if (still) await pg.click('[data-testid=bar-voice-save]');
    const saved = await settle('voice', voices);
    check(still && !early && saved, `recording-bar-captures audit 2: from Walks to Days mid-memo the memo keeps recording, then saves whole (${JSON.stringify({ still, early, saved })})`);
  });

  await c.close();
}

module.exports = {
  name: 'barcaptures',
  covers: [
    'src/components/RecordingBar.tsx',
    'src/lib/recordingBar.ts',
    'src/lib/captureBand.ts',
  ],
  run,
};
