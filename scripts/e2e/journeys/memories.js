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
    check(true, 'the reminder opens its capture');
    // Flagged again here, mid-walk, every visit: it waits for the next walk, not two seconds (audit).
    await page.click('[data-testid=viewer-more]');
    await page.click('[data-testid=viewer-remind]');
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
