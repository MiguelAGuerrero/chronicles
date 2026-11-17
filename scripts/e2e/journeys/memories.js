// Memories on revisit: Walk here from a star (N11), a quiet walk back along the first route, the reminder
// firing once (R6, R9), memory pins and previews (MR3, MR4), a cold-open notice, then a bus ride (R6).
// Starts on Chronicle with the first walk starred; ends on the ride walk's card.

// Standing alone after the walk journey, the page is on the first walk's card: name it and return to
// Chronicle with its star, as the chronicle journey does. In the full flow the page is already there, so
// this does nothing.
async function arrive(h) {
  const { page, routed } = h;
  if (await page.locator('[data-testid=to-name]').count()) {
    await page.click('[data-testid=to-name]');
    await page.click('[data-testid=save]');
    await h.mapUp(page);
    await page.waitForSelector('[data-testid=home-sheet]');
    await page.waitForSelector('[aria-label^="Fox Point,"]', { timeout: 15000 });
  }
}

async function checks(h) {
  const { url, ctx, page, at, check, shot, glyph, walkMap, walkMarks, walkRoute, walkPts, routed } = h;
  await arrive(h);
    // The first walk's route, from the harness (the walk journey walked it).
    const route = walkRoute;
    const pts = walkPts;
    // From the home, a star's Walk here starts a walk navigating there (N11),
    // even when the phone has no position yet: it routes on the first fix (audit).
    await page.evaluate(() => {
      const g = navigator.geolocation;
      const watch = g.watchPosition.bind(g);
      g.watchPosition = (ok, err, o) => {
        const t0 = Date.now();
        return watch((p) => Date.now() - t0 > 4000 && ok(p), err, o);
      };
    });
    await page.click('[aria-label^="Fox Point,"]');
    await page.waitForSelector('[data-testid=place-go]');
    await page.click('[data-testid=place-go]');
    await page.waitForURL(/\/walk/, { timeout: 30000 });
    check(await page.waitForSelector('text=Walk started · recording', { timeout: 10000 }).then(() => true, () => false), 'a walk started from the home says it is recording');
    await page.waitForTimeout(5000);
    await ctx.setGeolocation({ longitude: route[0][0], latitude: route[0][1] + 0.00002, accuracy: 6 });
    await routed(page, 40000);
    check(/\/walk(\?|$)/.test(page.url()) && /Fox Point/.test(await page.locator('[data-testid=nav-bar]').innerText()), 'a star\u2019s Walk here starts a walk navigating there, once there is a fix');
    await shot(page, '12-home-go');
    // A walk from a star starts quiet (E1); reminders still come back on a quiet walk (the owner's call, after the audit).
    check((await walkMarks().count()) === 0, 'a new walk starts quiet');
    // A later walk passing the flagged capture brings it back, in front (R2, R3, R4).
    // At a walking pace: a jump would be dropped as a GPS glitch.
    for (let j = 1; j <= 26; j++) {
      const f = j / 26;
      await ctx.setGeolocation({ longitude: route[0][0] + (pts[25][0] - route[0][0]) * f, latitude: route[0][1] + (pts[25][1] - route[0][1]) * f, accuracy: 6 });
      await page.waitForTimeout(1000);
      if (await page.locator('[data-testid=reminder]').count()) break;
    }
    const reminded = await page.waitForSelector('[data-testid=reminder]', { timeout: 15000 }).then(() => true, () => false);
    check(reminded && /memor|note/i.test(await page.locator('[data-testid=reminder]').innerText()), 'a later walk passing a flagged capture brings it back');
    // tend explore 23: one full stop before Open, though the note ends its own sentence.
    const noteName = reminded ? await page.locator('[data-testid=reminder-open]').getAttribute('aria-label') : null;
    check(noteName === 'A note from here: The bakery smelled of cardamom. Open', `tend explore 23: the note's reminder names itself with one full stop ("${noteName}")`);
    await shot(page, '13-reminder');
    // Memories on revisit: the first walk's captures nearby show as faint pins on this quiet walk
    // (MR1, MR6), but not the one whose reminder card is up (MR7).
    const captureRows = () => page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
        g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })));
      };
    }));
    const memoryPins = () => walkMap().locator('[data-testid=memory-pin]');
    await page.waitForSelector('[data-testid=memory-pin]', { timeout: 15000 }).catch(() => null);
    const flaggedNote = (await captureRows()).find((c) => /cardamom/.test(c.body ?? ''));
    const shownIds = (await memoryPins().evaluateAll((els) => els.map((e) => e.dataset.ids))).join(',');
    check((await memoryPins().count()) >= 1 && !shownIds.includes(flaggedNote.id),
      `a later walk shows the earlier walk's captures nearby as memory pins, minus the one being reminded (MR1, MR6, MR7: ${await memoryPins().count()} pins)`);
    // Read by place, never the whole store (audit 2).
    const indexed = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => resolve([...req.result.transaction('moment', 'readonly').objectStore('moment').indexNames]);
    }));
    check(indexed.includes('lat'), `captures are read by latitude, not with getAll over the store (audit 2: ${indexed.join(', ')})`);
    const recallRows = () => page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const r = req.result.transaction('recall', 'readonly').objectStore('recall').getAll();
        r.onsuccess = () => resolve(r.result);
      };
    }));
    // Once: the flag clears on its first fire (R6, R9).
    const left = (await recallRows()).length;
    check(left === 0, `a "once" reminder clears when it fires (${left} left)`);
    await page.click('[data-testid=reminder-open]');
    await page.waitForSelector('[data-testid=viewer-more]');
    // tend explore audit 7: a check that can fail, the flagged note's own words in the viewer.
    check(await page.waitForSelector('text=The bakery smelled of cardamom. >> visible=true', { timeout: 10000 }).then(() => true, () => false),
      'the reminder opens its capture (tend explore audit 7: the flagged note shows in the viewer)');
    // Flagged again here, mid-walk, every visit: it waits for the next walk, not two seconds (audit).
    await page.click('[data-testid=viewer-more]');
    await page.click('[data-testid=viewer-remind]');
    await page.click('[data-testid=remind-often]');
    await page.click('[data-testid=remind-visit]');
    await page.click('[data-testid=remind-save]');
    await page.waitForSelector('[data-testid=capture-meta] >> text=/Reminder set/');
    await page.click('[aria-label="Close"]');
    for (let j = 1; j <= 4; j++) {
      await ctx.setGeolocation({ longitude: pts[25][0], latitude: pts[25][1] + j * 0.00005, accuracy: 6 });
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);
    const again = await recallRows();
    check((await page.locator('[data-testid=reminder]').count()) === 0 && again.length === 1 && again[0].fired_count === 0,
      'a capture flagged mid-walk doesn’t come back in that walk');
    // Flagged again, its memory pin wears the bell top left and keeps its clock top right, both solid (RB4, RB5).
    const noteMemory = page.locator(`[data-testid=memory-pin][data-ids*="${flaggedNote.id}"]`);
    await page.waitForSelector(`[data-testid=memory-pin][data-ids*="${flaggedNote.id}"] [data-testid=pin-reminder]`, { timeout: 10000 }).catch(() => null);
    const corners = (await noteMemory.count()) ? await noteMemory.first().evaluate((el) => {
      const bell = el.querySelector('[data-testid=pin-reminder]');
      const clock = el.querySelector('[data-testid=memory-badge]');
      if (!bell || !clock) return null;
      // The opacity it is seen at: its own times every ancestor's (reminder-bell audit 6: its own alone is always 1).
      const seen = (n) => { let o = 1; for (let e = n; e && e !== el; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
      const b = bell.getBoundingClientRect();
      const c = clock.getBoundingClientRect();
      return { bell: b.left, clock: c.left, opacity: seen(bell), clockOpacity: seen(clock), size: Math.round(b.width), clockSize: Math.round(c.width), label: el.getAttribute('aria-label') };
    }) : null;
    check(!!corners && corners.bell < corners.clock && corners.opacity === 1 && corners.clockOpacity === 1 && corners.size === corners.clockSize && /reminder set/.test(corners.label),
      `a memory pin with a reminder shows the bell left of its clock, both solid and the same size, and says so (RB4, RB7, reminder-bell audit 6: ${JSON.stringify(corners)})`);
    await shot(page, '13b-memory-bell');
    // A memory pin: faded and smaller than a capture pin (MR3); a tap previews it (MR4), and the preview
    // opens the viewer with every memory from that spot (MR5).
    await page.waitForSelector('[data-testid=memory-pin]', { timeout: 15000 });
    // The faded pin itself; its clock badge stays solid (MR3, MR10).
    const look = await memoryPins().first().evaluate((el) => ({
      opacity: Math.min(...[...el.querySelectorAll('*')].map((e) => Number(getComputedStyle(e).opacity))),
      badge: Number(getComputedStyle(el.querySelector('[data-testid=memory-badge]')).opacity),
      label: el.getAttribute('aria-label'),
    }));
    check(look.opacity < 0.7 && look.badge === 1 && /memor/i.test(look.label), `memory pins are faint, their clock solid, and named as memories (MR3, MR10: opacity ${look.opacity}, badge ${look.badge}, "${look.label}")`);
    check((await memoryPins().first().locator('[data-testid=memory-badge]').count()) === 1 && (await walkMap().locator('[data-testid=mark-pin] [data-testid=memory-badge]').count()) === 0,
      'a memory pin carries a clock badge, and nothing else does (MR10)');
    // Under this walk's own pins, never over them (audit 6).
    const z = await memoryPins().first().evaluate((el) => getComputedStyle(el).zIndex);
    check(z === '0', `memory pins sit under capture pins (audit 6: z-index ${z})`);
    // The tapped pin's own capture leads the preview (audit 3).
    const tappedIds = (await memoryPins().first().getAttribute('data-ids')).split(',');
    const tappedFirst = (await captureRows()).find((c) => c.id === tappedIds[0]);
    // ✕ and Escape close it (MR4).
    await memoryPins().first().click();
    await page.waitForSelector('[data-testid=memory-preview]');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const goneEsc = (await page.locator('[data-testid=memory-preview]').count()) === 0;
    await memoryPins().first().click();
    await page.waitForSelector('[data-testid=memory-preview]');
    await page.click('[data-testid=memory-close]');
    await page.waitForTimeout(200);
    check(goneEsc && (await page.locator('[data-testid=memory-preview]').count()) === 0, 'Escape and ✕ close the preview (MR4)');
    await memoryPins().first().click();
    await page.waitForSelector('[data-testid=memory-preview]');
    const preview = await page.locator('[data-testid=memory-preview]').innerText();
    const kindWord = { photo: /Photo|\w/, video: /Video/, voice: /Voice memo/, text: /\w/ }[tappedFirst.kind];
    // The first line with words: the kind's icon is a glyph on its own line.
    const firstLine = preview.split('\n').map((l) => l.trim()).find((l) => /[A-Za-z0-9]/.test(l)) ?? '';
    check(kindWord.test(firstLine) && (tappedFirst.kind !== 'text' || firstLine === (tappedFirst.body ?? '').split('\n')[0]),
      `the preview shows the tapped pin's own capture (audit 3: ${tappedFirst.kind}, "${firstLine}")`);
    check(/20\d\d|Nov|Oct/.test(preview) && /Fox Point|Cardamom/.test(preview), `a tap previews the memory with its date and walk (MR4: ${preview.replace(/\s+/g, ' ').slice(0, 80)})`);
    check((await page.locator('[data-testid=reminder]').count()) === 0, 'opening a memory never brings a card or a buzz of its own');
    await page.click('[data-testid=memory-open]');
    await page.waitForSelector('text=Memories here');
    const viewerMemories = await page.locator('text=Memories here').count();
    check((await page.locator('[data-testid=memory-preview]').count()) === 0, 'the preview opens the viewer with the memories from that spot (MR5)');
    // MR9: all of it on the web build: faint pins on a later walk, the preview, and the viewer from it.
    check(shownIds.length > 0 && /Fox Point|Cardamom/.test(preview) && viewerMemories === 1 && (await page.locator('[data-testid=viewer-close]').count()) >= 1,
      `MR9: on the web build, a later walk shows memory pins, previews one and opens its spot's memories (pins ${shownIds}, viewer ${viewerMemories})`);
    await page.click('[data-testid=viewer-close]');
    // tend memories T30 (decision 0170, "All in words"): a memory pin of several previews the rest in words, shown and
    // said, whole at 390 and 320 px.
    const groupPin = page.locator('[data-testid=memory-pin][data-ids*=","]');
    if (await groupPin.count()) {
      const n = (await groupPin.first().getAttribute('data-ids')).split(',').length;
      await groupPin.first().click();
      await page.waitForSelector('[data-testid=memory-preview]');
      for (const w of [390, 320]) {
        await page.setViewportSize({ width: w, height: 844 });
        await page.waitForTimeout(400);
        const more = await page.evaluate(() => {
          const e = document.querySelector('[data-testid=memory-more]');
          const r = e?.getBoundingClientRect();
          // One line: a wrapped line is "whole" by its widths too (tend memories audit 3).
          let lines = 0;
          if (e) {
            const range = document.createRange();
            range.selectNodeContents(e);
            lines = new Set([...range.getClientRects()].filter((b) => b.width > 0).map((b) => Math.round(b.top))).size;
          }
          return { text: e?.textContent ?? null, lines, name: document.querySelector('[data-testid=memory-open]')?.getAttribute('aria-label') ?? null, whole: !!e && e.scrollWidth <= e.clientWidth + 1 && r.right <= window.innerWidth };
        });
        check(more.lines === 1, `tend memories audit 3: at ${w} px "${more.text}" holds one line (${more.lines} lines)`);
        check(/^and [a-z-]+ more here$/.test(more.text ?? '') && !/\d/.test(more.text) && more.name?.includes(`, ${more.text}. Open`) && more.whole,
          `tend memories T30: at ${w} px a memory preview of ${n} says the rest in words, shown and to a screen reader (${JSON.stringify(more)})`);
        await shot(page, `15c-memory-preview-several-${w}`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.click('[data-testid=memory-close]');
      await page.waitForTimeout(200);
    } else {
      check(false, `tend memories T30: a later walk shows a memory pin of several (${shownIds})`);
    }
    // A tapped reminder notification opens its capture, playing (NT8). First with the walk screen in front:
    // the service worker's message reaches the page's listener, and the capture opens at once (audit 1).
    const noteId = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
        g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).find((c) => /cardamom/.test(c.body ?? ''))?.id ?? null);
      };
    }));
    const tap = { type: 'notice-response', id: 'recall-x', data: { captureIds: [noteId] }, action: null };
    await page.evaluate((m) => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: m })), tap);
    check(await page.waitForSelector('text=The bakery smelled of cardamom. >> visible=true', { timeout: 10000 }).then(() => true, () => false),
      'a reminder tapped with the walk in front opens its capture at once');
    await page.click('[data-testid=viewer-close]');
    // Then a cold open: no window was open, so the service worker opened one carrying the tap. With the
    // walk still open, the home sends it on to the walk, which opens the capture (audit 2).
    await page.goto(`${url}?notice=${encodeURIComponent(JSON.stringify(tap))}`);
    check(await page.waitForSelector('text=The bakery smelled of cardamom. >> visible=true', { timeout: 20000 }).then(() => true, () => false)
      && !page.url().includes('notice='), 'a tap that opened the app opens its capture on the walk, and leaves the URL clean');
    await page.waitForTimeout(800);
    const viewers = await page.locator('[data-testid=viewer-close]').count();
    check(viewers === 1, `it opens once, on the walk: the home beneath doesn't open it too (${viewers} viewers)`);
    await page.click('[data-testid=viewer-close]');

    // tend explore T29 (decision 0164): a reminder of several says its count in words, and its kinds in the pins'
    // words. The two of the first walk's moments nearest here are flagged once, then the page is read again (the
    // flags are kept in memory between checks) and the walker moves on a few steps, so both come due together.
    // tend explore audit 7: the step checks its own setup, reads the card once it has settled, clears its flags
    // whatever happens, and walks back to the spot at a walking pace. Then the same two again with the walk
    // minimized, so the recording bar's line is pictured too (the T29 review's auditor 5).
    const spot = pts[25];
    const several = await page.evaluate(([noteKey, lon, lat]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
        g.onsuccess = () => {
          const note = g.result.find((m) => m.id === noteKey);
          const metres = (m) => Math.hypot((m.lon - lon) * 111320 * Math.cos((lat * Math.PI) / 180), (m.lat - lat) * 111320);
          resolve(g.result.filter((m) => m.id !== noteKey && m.walk_id === note?.walk_id && m.lat != null && m.lon != null)
            .sort((a, b) => metres(a) - metres(b)).slice(0, 2).map((m) => ({ id: m.id, kind: m.pieces[0].kind, m: Math.round(metres(m)) })));
        };
      };
    }), [noteId, spot[0], spot[1]]);
    // 50 m or less, so the 22 m the minimized leg may walk past the spot keeps both inside a reminder's 75 m reach.
    check(several.length === 2 && several.every((s) => s.m <= 50),
      `tend explore audit 7: the two moments flagged lie within 50 m of the spot, inside a reminder's 75 m reach however the step walks (${JSON.stringify(several)})`);
    const ids = several.map((s) => s.id);
    const flags = (put) => page.evaluate(([list, add]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction('recall', 'readwrite');
        for (const id of list) {
          if (add) tx.objectStore('recall').put({ capture_id: id, frequency: 'once', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
          else tx.objectStore('recall').delete(id);
        }
        tx.oncomplete = () => resolve(true);
      };
    }), [ids, put]);
    // The words a reminder shows once two reads 300 ms apart agree (a fire can merge into it a moment later).
    const settled = async (sel) => {
      let last = null;
      for (let i = 0; i < 10; i++) {
        const now = (await page.locator(sel).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        if (now && now === last) return now;
        last = now;
        await page.waitForTimeout(300);
      }
      return last ?? '';
    };
    let north = 0;
    // How many of the two are still flagged: a "once" flag clears as it fires.
    const stillFlagged = () => page.evaluate((list) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('recall', 'readonly').objectStore('recall').getAll();
        g.onsuccess = () => resolve(g.result.filter((r) => list.includes(r.capture_id)).length);
      };
    }), ids);
    // North of the spot at a walking pace, past the 75 m reach of both, before they are flagged and the page read again:
    // a check on the way could read the new rows and fire while the walk screen is in front.
    const outOfReach = async () => {
      while (north < 24) {
        north += 1;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + north * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
    };
    try {
      await flags(true);
      await page.goto(url);
      await page.waitForSelector('[data-testid=recording-return], [data-testid=stop]', { timeout: 20000 });
      if (await page.locator('[data-testid=recording-return]').count()) await page.click('[data-testid=recording-return]');
      await page.waitForSelector('[data-testid=stop]', { timeout: 15000 });
      for (let j = 1; j <= 6 && !(await page.locator('[data-testid=reminder]').count()); j++) {
        north = j;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + j * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
      const severalUp = await page.waitForSelector('[data-testid=reminder]', { timeout: 15000 }).then(() => true, () => false);
      // The card's text, its clock and ✕ glyphs (the icon font's) at its ends.
      const severalSaid = severalUp ? await settled('[data-testid=reminder]') : '';
      const severalName = severalUp ? await page.locator('[data-testid=reminder-open]').getAttribute('aria-label') : '';
      check(severalUp && /(^|[^A-Za-z])Two memories here [A-Z]/.test(severalSaid) && /\b(photo|video|voice memo|note)s?\b/i.test(severalSaid) && !/\d/.test(severalSaid)
        && /^Two memories here: [A-Z][a-z ,]+\. Open$/.test(severalName ?? ''),
        `tend explore T29: a reminder of several says its count and kinds in words, the pins' words, on the card and to a screen reader (${JSON.stringify(several)}: "${severalSaid}", "${severalName}")`);
      await shot(page, '15-reminder-several');
      await page.setViewportSize({ width: 320, height: 844 });
      await page.waitForTimeout(400);
      await shot(page, '15b-reminder-several-320');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);
      if (severalUp) await page.click('[data-testid=reminder-dismiss]');
      // The same two again ("once" cleared them as they fired), with the walk minimized: the bar takes the fire (NV8).
      // Read again, as above: a bell's refresh after the fire reloads the flags held in memory, and a row written
      // here goes round `saveRecall`, which would drop them.
      // Out of their reach first (tend explore 21): read again at the spot, a fire could come while the walk screen is
      // still in front as the page opens, before the step minimizes it.
      await outOfReach();
      await flags(true);
      await page.goto(url);
      await page.waitForSelector('[data-testid=recording-return], [data-testid=walk-minimize]', { timeout: 20000 });
      if (!(await page.locator('[data-testid=recording-return]').count())) await page.click('[data-testid=walk-minimize]');
      await page.waitForSelector('[data-testid=recording-return]', { timeout: 10000 });
      const cardAt = north;
      // On until both have fired: coming in from the north, one may come into reach a step before the other, and the
      // bar merges the second into what it holds.
      for (let j = north - 1; j >= -4 && (await stillFlagged()) > 0; j--) {
        north = j;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + j * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
      const barUp = await page.waitForSelector('[data-testid=recording-reminder]', { timeout: 15000 }).then(() => true, () => false);
      // Where the fire went, if not to the bar: the flags left, a card on the walk beneath, a notification.
      const went = barUp ? null : await page.evaluate((list) => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('recall', 'readonly').objectStore('recall').getAll();
          g.onsuccess = async () => {
            const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
            const notes = reg ? (await reg.getNotifications()).map((n) => n.title) : null;
            resolve({ left: g.result.filter((r) => list.includes(r.capture_id)).length, cards: document.querySelectorAll('[data-testid=reminder]').length, notes, path: location.pathname });
          };
        };
      }), ids);
      const barSaid = barUp ? await settled('[data-testid=recording-reminder]') : '';
      const barName = barUp ? await page.locator('[data-testid=recording-reminder]').getAttribute('aria-label') : '';
      // tend explore 21: after a reload the walk screen (mounted as the app opens, NR3) and the bar both listen for a
      // fire; the walk screen, kept behind the tabs, never takes it out of sight, so the bar has it every time.
      check(barUp, `tend explore 21: minimized after a reload, the fire reaches the recording bar, not the walk screen out of sight (steps ${cardAt} to ${north}; ${JSON.stringify(went)})`);
      check(barUp && /(^|[^A-Za-z])Two memories here See\b/.test(barSaid) && !/\d/.test(barSaid) && barName === 'Two memories here. Return to the walk to see it',
        `tend explore audit 7: minimized, the recording bar says the reminder of two in words (NV8; "${barSaid}", "${barName}"; steps ${cardAt} to ${north})`);
      if (barUp) {
        await shot(page, '16-bar-reminder-several');
        await page.setViewportSize({ width: 320, height: 844 });
        await page.waitForTimeout(400);
        await shot(page, '16b-bar-reminder-several-320');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
      }
      // tend explore 22: the same two again with the bars folded away (the journal's line has the keys, JN30, as the
      // area card or the planner fold them): the bar holds the fire out of sight past its half-minute, and shows it
      // once unfolded. Marked fired as it came, it was dropped unseen after 30 s before.
      // Out of their reach before they are flagged and the page read again, so the fire comes only once the bars fold.
      await outOfReach();
      await flags(true);
      await page.goto(url);
      await page.waitForSelector('[data-testid=recording-return], [data-testid=walk-minimize]', { timeout: 20000 });
      if (!(await page.locator('[data-testid=recording-return]').count())) await page.click('[data-testid=walk-minimize]');
      await page.waitForSelector('[data-testid=recording-return]', { timeout: 10000 });
      // Memories' "What's on your mind?" opens the composer with the caret in its field (JN47): the bars fold under it.
      if (!(await page.locator('[data-testid=bar-compose] >> visible=true').count())) {
        await page.click('[data-testid=tab-chronicle]');
        await page.click('[data-testid=section-memories]').catch(() => {});
      }
      await page.click('[data-testid=bar-compose] >> visible=true', { timeout: 10000 });
      await page.waitForTimeout(500);
      if (!(await page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'line-input'))) await page.click('[data-testid=line-input] >> visible=true', { timeout: 8000 });
      const wrapH = () => page.evaluate(() => Math.round(document.querySelector('[data-testid=tab-bar-wrap]')?.getBoundingClientRect().height ?? -1));
      await page.waitForTimeout(400);
      const foldedH = await wrapH();
      const flaggedFolded = await stillFlagged();
      const foldFrom = north;
      for (let j = north - 1; j >= -4 && (await stillFlagged()) > 0; j--) {
        north = j;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + j * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
      const firedFolded = (await stillFlagged()) === 0;
      const heldAt = Date.now();
      // Past the half-minute, still folded.
      await page.waitForTimeout(32000);
      const held = { flaggedFolded, firedFolded, foldedH, stillH: await wrapH(), bars: await page.locator('[data-testid=recording-reminder]').count(), steps: `${foldFrom} to ${north}` };
      // Escape closes the composer, keeping nothing (it is empty), and the bars unfold.
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => (document.querySelector('[data-testid=tab-bar-wrap]')?.getBoundingClientRect().height ?? 0) > 0, null, { timeout: 5000 }).catch(() => {});
      const seen = await page.locator('[data-testid=recording-reminder]').boundingBox().catch(() => null);
      check(held.flaggedFolded === 2 && held.firedFolded && held.foldedH === 0 && held.stillH === 0 && held.bars === 1 && !!seen && seen.height >= 44 && seen.y + seen.height <= 844,
        `tend explore 22: a reminder fired with the bars folded waits on the bar past its half-minute, and is seen once they unfold (${JSON.stringify({ ...held, waited: Date.now() - heldAt, seen })})`);
      await shot(page, '16c-bar-reminder-after-fold');
      await page.setViewportSize({ width: 320, height: 844 });
      await page.waitForTimeout(400);
      await shot(page, '16d-bar-reminder-after-fold-320');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);

      // tend explore audit 25: the same two under a moment's viewer on Memories, the tabs not folded: the Modal alone
      // keeps the bar out of sight (`modalsUp`), past its half-minute, and the bar's line is seen once the viewer closes.
      await outOfReach();
      await flags(true);
      await page.goto(url);
      await page.waitForSelector('[data-testid=recording-return], [data-testid=walk-minimize]', { timeout: 20000 });
      if (!(await page.locator('[data-testid=recording-return]').count())) await page.click('[data-testid=walk-minimize]');
      await page.waitForSelector('[data-testid=recording-return]', { timeout: 10000 });
      if (!(await page.locator('[data-testid=moment-open] >> visible=true').count())) {
        await page.click('[data-testid=tab-chronicle]');
        await page.click('[data-testid=section-memories]').catch(() => {});
      }
      await page.waitForSelector('[data-testid=moment-open] >> visible=true', { timeout: 10000 }).catch(() => {});
      await page.locator('[data-testid=moment-open] >> visible=true').first().click().catch(() => {});
      let viewerUp = await page.waitForSelector('[data-testid=viewer-close]', { timeout: 8000 }).then(() => true, () => false);
      if (!viewerUp) {
        await page.locator('[data-testid=moment-open] >> visible=true').first().click().catch(() => {});
        viewerUp = await page.waitForSelector('[data-testid=viewer-close]', { timeout: 8000 }).then(() => true, () => false);
      }
      if (!viewerUp) await shot(page, '16f-no-viewer');
      await page.waitForTimeout(400);
      const underViewer = { viewerUp, wrapH: await wrapH(), flagged: await stillFlagged() };
      const viewerFrom = north;
      for (let j = north - 1; j >= -4 && viewerUp && (await stillFlagged()) > 0; j--) {
        north = j;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + j * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
      underViewer.fired = (await stillFlagged()) === 0;
      await page.waitForTimeout(32000);
      underViewer.bars = await page.locator('[data-testid=recording-reminder]').count();
      await page.click('[data-testid=viewer-close]').catch(() => {});
      await page.waitForTimeout(600);
      const afterViewer = await page.locator('[data-testid=recording-reminder]').boundingBox().catch(() => null);
      check(underViewer.viewerUp && underViewer.wrapH > 0 && underViewer.flagged === 2 && underViewer.fired && underViewer.bars === 1 && !!afterViewer && afterViewer.height >= 44,
        `tend explore audit 25: a reminder fired under a viewer, the tabs unfolded, waits on the bar past its half-minute and is seen once the viewer closes (${JSON.stringify({ ...underViewer, steps: `${viewerFrom} to ${north}`, afterViewer })})`);

      // tend explore audit 23: the bars folded under an area's card, a fire, then the card's Walk to, which leaves the
      // tabs for the walk screen: the bar goes with what it held unseen, and hands it on to the walk screen's card.
      await outOfReach();
      await flags(true);
      await page.goto(url);
      await page.waitForSelector('[data-testid=recording-return], [data-testid=walk-minimize]', { timeout: 20000 });
      if (!(await page.locator('[data-testid=recording-return]').count())) await page.click('[data-testid=walk-minimize]');
      await page.waitForSelector('[data-testid=recording-return]', { timeout: 10000 });
      await page.click('[data-testid=tab-explore]');
      await h.areaTile(page, 'Fox Point', 40000);
      const hoods = await page.locator('[data-testid=atlas-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));
      // An area whose card offers a Walk to (the area's own, a storefront street's or a complex's: the one the walker is in
      // has none of its own).
      const walkSel = '[data-testid=atlas-walk], [data-testid=atlas-storefront-walk], [data-testid=atlas-complex-walk]';
      let walkTo = null;
      for (const name of [...hoods.filter((n) => n !== 'Fox Point'), 'Fox Point']) {
        const tile = page.locator(`[data-testid=atlas-tile][data-name="${name}"]`).first();
        if (!(await tile.count())) continue;
        // A first tap may only select it (EC11), and the row may still be settling: a few tries.
        let opened = false;
        for (let k = 0; k < 4 && !opened; k++) {
          await tile.click().catch(() => {});
          opened = await page.waitForSelector('[data-testid=atlas-card]', { timeout: 4000 }).then(() => true, () => false);
        }
        if (!opened) continue;
        if (await page.locator(walkSel).count()) {
          walkTo = name;
          break;
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(800);
      }
      const cardFold = { area: walkTo, hoods, wrapH: await wrapH(), flagged: await stillFlagged() };
      const handFrom = north;
      for (let j = north - 1; j >= -4 && walkTo && (await stillFlagged()) > 0; j--) {
        north = j;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + j * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
      const firedUnderCard = (await stillFlagged()) === 0;
      if (walkTo) {
        await page.locator(walkSel).first().scrollIntoViewIfNeeded().catch(() => {});
        await page.locator(walkSel).first().click();
        if (await page.waitForSelector('[data-testid=atlas-walk-now]', { timeout: 1500 }).then(() => true, () => false)) await page.click('[data-testid=atlas-walk-now]');
      }
      await page.waitForSelector('[data-testid=stop]', { timeout: 15000 }).catch(() => {});
      const handed = await page.waitForSelector('[data-testid=reminder]', { timeout: 8000 }).then(() => true, () => false);
      const handedSaid = handed ? await settled('[data-testid=reminder]') : '';
      check(!!walkTo && cardFold.wrapH === 0 && cardFold.flagged === 2 && firedUnderCard && handed && /Two memories here/.test(handedSaid),
        `tend explore audit 23: a reminder fired under an area's card reaches the walk screen's card when Walk to leaves the tabs (${JSON.stringify({ ...cardFold, firedUnderCard, handed, handedSaid, steps: `${handFrom} to ${north}` })})`);
      if (handed) await shot(page, '16e-reminder-handed-on');
      if (!(await page.locator('[data-testid=stop]').count())) await page.click('[data-testid=recording-return]');
      await page.waitForSelector('[data-testid=stop]', { timeout: 15000 });
      // The walk goes on without the way Walk to set, as the steps after this one expect.
      if (await page.waitForSelector('[data-testid=nav-end]', { timeout: 5000 }).then(() => true, () => false)) await page.click('[data-testid=nav-end]');
    } finally {
      await flags(false);
      // Back to the spot at a walking pace, from wherever the step stopped, north or south of it.
      while (north !== 0) {
        north += north > 0 ? -1 : 1;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + north * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
    }

    // tend explore 16 (decision 0172, O11, "Many sooner"): a reminder of thirteen says "Many memories here", its one line
    // whole at 390 and 320 px. Eleven notes are added beside the two above, in the same earlier walk, all flagged once;
    // the step takes them out again whatever happens.
    const extra = Array.from({ length: 11 }, (_, i) => `o11-${i}`);
    const many = [...ids, ...extra];
    const seedMany = (add) => page.evaluate(([list, keep, lon, lat, add]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['moment', 'recall'], 'readwrite');
        const g = tx.objectStore('moment').get(keep);
        g.onsuccess = () => {
          const walkId = g.result?.walk_id ?? null;
          list.forEach((id, i) => {
            if (!add) { tx.objectStore('moment').delete(id); return; }
            const t = (g.result?.t ?? Date.now()) + (i + 1) * 1000;
            tx.objectStore('moment').put({ id, walk_id: walkId, t, lat: lat + (i % 3) * 0.00001, lon: lon + Math.floor(i / 3) * 0.00001, segment_id: null, piece_ids: [id], pieces: [{ id, moment_id: id, kind: 'text', file_path: null, body: `A note kept here, ${id}.`, t, caption: null, caption_y: null }] });
          });
        };
        tx.oncomplete = () => resolve(true);
      };
    }), [extra, ids[0], spot[0], spot[1], add]);
    const flagMany = (put) => page.evaluate(([list, add]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction('recall', 'readwrite');
        for (const id of list) {
          if (add) tx.objectStore('recall').put({ capture_id: id, frequency: 'once', until: null, last_fired_at: null, fired_count: 0, last_walk_id: null });
          else tx.objectStore('recall').delete(id);
        }
        tx.oncomplete = () => resolve(true);
      };
    }), [many, put]);
    try {
      await seedMany(true);
      await flagMany(true);
      await page.goto(url);
      await page.waitForSelector('[data-testid=recording-return], [data-testid=stop]', { timeout: 20000 });
      if (await page.locator('[data-testid=recording-return]').count()) await page.click('[data-testid=recording-return]');
      await page.waitForSelector('[data-testid=stop]', { timeout: 15000 });
      for (let j = 1; j <= 6 && !(await page.locator('[data-testid=reminder]').count()); j++) {
        north = j;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + j * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
      const manyUp = await page.waitForSelector('[data-testid=reminder]', { timeout: 15000 }).then(() => true, () => false);
      if (manyUp) await settled('[data-testid=reminder]');
      for (const w of [390, 320]) {
        await page.setViewportSize({ width: w, height: 844 });
        await page.waitForTimeout(500);
        const card = await page.evaluate(() => {
          const open = document.querySelector('[data-testid=reminder-open]');
          const title = open && [...open.querySelectorAll('div, span')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && /memories here/.test(n.textContent)));
          const r = title?.getBoundingClientRect();
          return { title: title?.textContent ?? null, whole: !!title && title.scrollWidth <= title.clientWidth + 1, right: r ? Math.round(r.right) : null, name: open?.getAttribute('aria-label') ?? null };
        });
        check(manyUp && card.title === 'Many memories here' && card.whole && card.right <= w && /^Many memories here: [A-Z][a-z ,-]+\. Open$/.test(card.name ?? ''),
          `tend explore 16: at ${w} px a reminder of thirteen says "Many memories here", its one line whole, and its name says so (${JSON.stringify(card)})`);
        await shot(page, `15c-reminder-thirteen-${w}`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);
      if (manyUp) await page.click('[data-testid=reminder-dismiss]');
    } finally {
      await flagMany(false);
      await seedMany(false);
      while (north !== 0) {
        north += north > 0 ? -1 : 1;
        await ctx.setGeolocation({ longitude: spot[0], latitude: spot[1] + north * 0.00005, accuracy: 6 });
        await page.waitForTimeout(1000);
      }
    }

    // Rides (R5, R6, R11): a bus leg at 12 m/s, one fix a second, is drawn dashed and reads "On a ride",
    // never "Weak GPS" (the bug, Nov 1: a bus kept its first fix and showed Weak GPS); the card shows
    // walked and ridden distance apart.
    const busFrom = pts[25];
    for (let j = 0; j < 4; j++) {
      await ctx.setGeolocation({ longitude: busFrom[0], latitude: busFrom[1] + j * 0.00001, accuracy: 6 });
      await page.waitForTimeout(1000);
    }
    const busStep = 12 / (111320 * Math.cos((busFrom[1] * Math.PI) / 180));
    let rideChip = false;
    let weakSeen = false;
    for (let j = 1; j <= 45; j++) {
      await ctx.setGeolocation({ longitude: busFrom[0] + j * busStep, latitude: busFrom[1] + 0.00003, accuracy: 6 });
      await page.waitForTimeout(1000);
      if (await page.getByText('Weak GPS').count()) weakSeen = true;
      if (j >= 30 && !rideChip) rideChip = (await page.getByText('On a ride').count()) > 0;
    }
    await page.waitForTimeout(2200);
    await shot(page, '14-ride');
    check(rideChip, 'a bus leg reads "On a ride" (R11)');
    check(!weakSeen, 'a bus leg never reads "Weak GPS" (R11)');
    const rides = await page.locator('[data-rides]').last().getAttribute('data-rides');
    check(Number(rides?.split(':')[0]) === 1 && Number(rides?.split(':')[1]) > 30, `the ride is drawn as its own dashed line (R5: ${rides})`);
    const stats = await page.locator('[data-testid=walk-stats]').innerText();
    check(/^\d+:\d\d · \d+ m\n\+ \d+ m ride$/.test(stats), `the walk's distance shows the ride apart, on its own line (R6: "${stats}")`);
    const holdBox = await page.locator('[data-testid=stop]').boundingBox();
    await page.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    await page.waitForURL(/replay/, { timeout: 30000 });
    await page.waitForSelector('[data-testid=skip]', { timeout: 60000 });
    await page.click('[data-testid=skip]');
    await page.waitForSelector('[data-testid=card-ride]', { timeout: 60000 });
    const cardDistance = await page.locator('[data-testid=card-distance]').innerText();
    const cardRide = await page.locator('[data-testid=card-ride]').innerText();
    await shot(page, '14b-ride-card');
    // The bus leg is 45 s at 12 m/s: about 540 m, with no jog from the stop (the audit's run-up, Nov 1).
    const rideMetres = Number(/\+ (\d+) m by ride/.exec(cardRide)?.[1]);
    check(/^\d+ m$/.test(cardDistance) && rideMetres > 480 && rideMetres < 600, `the card shows walked, and the ride on its own line (R6: "${cardDistance}", "${cardRide}")`);
}

// Alone: the walk journey first (the first walk, with its captures), then this.
async function run(h) {
  await require('./walk').run(h);
  await checks(h);
}

module.exports = {
  name: 'memories',
  covers: [
    'src/lib/memories.ts',
    'src/components/{MemoryPreview,ReminderCard,RemindEditor,Enter}.tsx',
    'src/lib/{useReminded,enter}.ts',
    'src/lib/discovery/recall*.ts',
  ],
  run,
  checks,
};
