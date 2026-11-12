// Replay rhythm (RR6-RR16, RR19): a walk seeded with a captioned photo, a note, a memo, a 20-minute
// gap and a long stretch, watched with no taps but the ones it checks; then its day. E2E_ONLY=replay runs it alone.

async function run(h) {
  const { navUrl, BASE, page, start, at, check, shot, metaOf, freshPage, openWalk, errors } = h;
    const { c, pg } = await freshPage('replay');
    // Media calls are recorded; a video's sound is refused unless a tap came just before, as iOS does.
    await c.addInitScript(() => {
      window.__media = [];
      window.__tap = 0;
      // Only a tap on Tap for sound counts, so the test's other taps never let a video's sound through early.
      document.addEventListener('pointerdown', (e) => { if (e.target.closest?.('[data-testid=video-sound]')) window.__tap = Date.now(); }, true);
      const P = HTMLMediaElement.prototype;
      const play = P.play;
      const pause = P.pause;
      P.play = function () {
        window.__media.push([this.tagName, 'play', this.muted]);
        // Once a tap has let an element's sound through, it plays with sound from then on (iOS keeps it per element).
        if (this.tagName === 'VIDEO' && !this.muted && Date.now() - window.__tap <= 1000) this.__soundOk = true;
        if (this.tagName === 'VIDEO' && !this.muted && !this.__soundOk) return Promise.reject(new DOMException('refused', 'NotAllowedError'));
        return play.call(this);
      };
      P.pause = function () {
        window.__media.push([this.tagName, 'pause']);
        return pause.call(this);
      };
      // Media events don't bubble; the capture phase still sees them.
      document.addEventListener('ended', (e) => window.__media.push([e.target.tagName, 'ended']), true);
      // The screen's wake lock, recorded: how many held now, and every request and release (RR24).
      window.__wake = { held: 0, log: [] };
      const lock = () => {
        const s = { released: false, type: 'screen', release: async () => { if (!s.released) { s.released = true; window.__wake.held--; window.__wake.log.push('release'); } }, addEventListener() {}, removeEventListener() {} };
        return s;
      };
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { window.__wake.held++; window.__wake.log.push('request'); return lock(); } } });
    });
    const here = at(3.0, -0.5);
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    for (let k = 0; k < 3; k++) {
      await c.setGeolocation({ longitude: here[0], latitude: here[1] + k * 0.000001, accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    for (let k = 0; k < 15 && !(await metaOf(pg, 'tile_url')); k++) await pg.waitForTimeout(1000);
    const walk = await openWalk(pg);
    const now = Date.now();
    const min = 60_000;
    const along = (from, to, t0) => {
      const pts = [];
      const d = Math.hypot((to[0] - from[0]) * 100, (to[1] - from[1]) * 100);
      const n = Math.max(1, Math.round(d / 7));
      for (let k = 0; k <= n; k++) {
        const p = at(from[0] + ((to[0] - from[0]) * k) / n, from[1] + ((to[1] - from[1]) * k) / n);
        pts.push({ walk_id: walk.id, t: t0 + k * 5000, lon: p[0], lat: p[1], accuracy_m: 6, speed: 1.4, course: null });
      }
      return pts;
    };
    // 600 m east along Transit Street, a photo early on and a note at the end; 20 min with no fixes; 80 m more and a memo.
    const first = along([-6, -0.5], [-1.2, -0.5], now - 50 * min);
    const second = along([2.2, -0.5], [3.0, -0.5], first.at(-1).t + 20 * min);
    const capAt = (p, o) => ({ walk_id: walk.id, t: p.t, lat: p.lat, lon: p.lon, segment_id: null, caption: null, caption_y: null, ...o });
    const captures = [
      capAt(first[8], { id: 'rr-photo', kind: 'photo', file_path: 'rr-photo', body: null, caption: 'Blue door', caption_y: 0.8 }),
      capAt(first[25], { id: 'rr-photo-2', kind: 'photo', file_path: 'rr-photo', body: null, caption: 'Green gate', caption_y: 0.8 }),
      capAt(first[45], { id: 'rr-video', kind: 'video', file_path: 'rr-video', body: '5000' }),
      capAt(first.at(-1), { id: 'rr-note', kind: 'text', file_path: null, body: 'Bought two plums. Ate one before I paid.' }),
      capAt(second[6], { id: 'rr-memo', kind: 'voice', file_path: 'rr-memo', body: '3000' }),
    ];
    await pg.evaluate(([id, startedAt, pts, caps]) => new Promise((resolve) => {
      const cv = document.createElement('canvas');
      cv.width = 160;
      cv.height = 200;
      const g = cv.getContext('2d');
      g.fillStyle = '#2f5f8f';
      g.fillRect(0, 0, 160, 200);
      // A 5 s video, recorded from a canvas.
      const rec = new MediaRecorder(cv.captureStream(10), { mimeType: 'video/webm' });
      const parts = [];
      let frame = 0;
      const paint = setInterval(() => {
        g.fillStyle = frame++ % 2 ? '#2f5f8f' : '#c0392b';
        g.fillRect(0, 0, 160, 200);
      }, 100);
      rec.ondataavailable = (e) => parts.push(e.data);
      const recorded = new Promise((r) => { rec.onstop = () => { clearInterval(paint); r(new Blob(parts, { type: 'video/webm' })); }; });
      rec.start();
      setTimeout(() => rec.stop(), 5200);
      recorded.then((video) => cv.toBlob((blob) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const tx = req.result.transaction(['walk', 'trace_point', 'moment', 'media'], 'readwrite');
          const w = tx.objectStore('walk').get(id);
          w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
          for (const p of pts) tx.objectStore('trace_point').add(p);
          for (const cap of caps) tx.objectStore('moment').put(((c) => ({ id: c.id, walk_id: c.walk_id ?? null, t: c.t, lat: c.lat ?? null, lon: c.lon ?? null, segment_id: c.segment_id ?? null, piece_ids: [c.id], pieces: [Object.fromEntries(Object.entries({ ...c, moment_id: c.id }).filter(([k]) => !['walk_id', 'lat', 'lon', 'segment_id'].includes(k)))] }))(cap));
          tx.objectStore('media').put({ key: 'rr-photo', blob });
          tx.objectStore('media').put({ key: 'rr-video', blob: video });
          tx.oncomplete = () => resolve(true);
        };
      }, 'image/png'));
    }), [walk.id, first[0].t - 1000, [...first, ...second], captures]);
    await pg.reload();
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    await pg.waitForTimeout(2000);
    const b = await pg.locator('[data-testid=stop]').boundingBox();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1100);
    await pg.mouse.up();
    await pg.waitForURL(/replay/, { timeout: 30000 });
    // The reading beat can be shorter than a poll with the streets already read: pictured when it shows.
    if (await pg.waitForSelector('[data-testid=replay-reading]', { timeout: 3000 }).then(() => true, () => false)) await shot(pg, 'rr-reading');
    await pg.waitForSelector('[data-testid=replay-headline], [data-testid=replay-clock]', { timeout: 60000 }).catch(() => {});
    if (await pg.locator('[data-testid=replay-headline]').count()) await shot(pg, 'rr-fog');
    await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 60000 });
    // What the stage shows, recorded in the page every 50 ms: a card is up for about 2 s, quicker than a poll.
    await pg.evaluate(() => {
      window.__rrSeen = { cards: [], later: [], notes: [], counted: [], memoPlay: null, videoEndedInCard: false, videoSkeleton: false, memoSkeleton: false, awakeOnPath: false, ends: [] };
      const add = (list, v) => v && !list.includes(v) && list.push(v);
      window.__rrTimer = setInterval(() => {
        document.querySelectorAll('[data-testid=replay-card]').forEach((e) => add(window.__rrSeen.cards, e.getAttribute('aria-label')));
        document.querySelectorAll('[data-testid=replay-later]').forEach((e) => add(window.__rrSeen.later, e.textContent));
        document.querySelectorAll('[data-testid=replay-note]').forEach((e) => add(window.__rrSeen.notes, e.textContent));
        const mp = document.querySelector('[data-testid=memo-play]');
        if (mp) {
          const b = mp.getBoundingClientRect();
          window.__rrSeen.memoPlay = [Math.round(b.width), Math.round(b.height)];
        }
        // A skeleton stands where a medium will be while it loads (RR23); the screen is held awake (RR24).
        if (document.querySelector('[data-testid=replay-card] [data-testid=media-skeleton]') && document.querySelector('[data-testid=replay-card] video')) window.__rrSeen.videoSkeleton = true;
        if (document.querySelector('[data-testid=memo-skeleton]')) window.__rrSeen.memoSkeleton = true;
        if (window.__wake.held > 0) window.__rrSeen.awakeOnPath = true;
        // Where the end marker sits while the path is told (tend replay 2).
        const ends = document.querySelector('[data-ends]')?.getAttribute('data-ends');
        if (ends != null && document.querySelector('[data-testid=replay-clock]')) add(window.__rrSeen.ends, ends.split('|')[1] || 'none');
        // The video reached its end while its card was still up (audit 20).
        const v = document.querySelector('[data-testid=replay-card] video');
        if (v && v.ended) window.__rrSeen.videoEndedInCard = true;
        // The viewer (the pile opened) has its own "1 of 2"; the path itself counts nothing.
        const m = document.querySelector('[data-testid=viewer-close]') ? null : /\b\d+ of \d+\b/.exec(document.body.innerText);
        if (m) add(window.__rrSeen.counted, m[0]);
      }, 50);
    });

    const clockNow = () => pg.locator('[data-testid=replay-clock]').getAttribute('aria-label').catch(() => null);
    const clocks = new Set();
    const seen = { note: false, card: false, later: '', counted: '' };
    let holdChecked = false;
    let tapChecked = false;
    let pileChecked = false;
    let soundChecked = false;
    let afterViewer = -1;
    for (let k = 0; k < 400 && !(await pg.locator('[data-testid=to-name]').count()); k++) {
      if ([2, 5, 9, 14, 20].includes(k)) await shot(pg, `rr-path-${k}`);
      const ck = await clockNow();
      if (ck) clocks.add(ck);
      if (!holdChecked && ck) {
        // Hold holds everything, and reads Play while held (RR7): past the intro, the walker itself stands still.
        await pg.waitForTimeout(1000);
        await pg.click('[data-testid=hold]');
        const walkerAt = () => pg.locator('[data-walker]').first().getAttribute('data-walker');
        const a = [await clockNow(), await walkerAt()].join(' @ ');
        await pg.waitForTimeout(1200);
        const bb = [await clockNow(), await walkerAt()].join(' @ ');
        const label = await pg.locator('[data-testid=hold]').innerText();
        const pill = await pg.locator('[data-testid=replay-held]').count();
        check(a === bb && label.trim() === 'Play' && pill === 1, `RR7: Hold holds the replay and reads Play (${a} → ${bb}, "${label.trim()}", pill ${pill})`);
        await pg.click('[data-testid=hold]');
        holdChecked = true;
        continue;
      }
      if (holdChecked && !tapChecked) {
        // A tap on the map holds it too, and another goes on (RR7).
        await pg.mouse.click(195, 330);
        await pg.waitForTimeout(300);
        const held = await pg.locator('[data-testid=replay-held]').count();
        await pg.mouse.click(195, 330);
        await pg.waitForTimeout(300);
        const after = await pg.locator('[data-testid=replay-held]').count();
        check(held === 1 && after === 0, `RR7: a tap on the map holds the replay, another goes on (${held}, ${after})`);
        tapChecked = true;
      }
      if (!pileChecked && (await pg.locator('[data-testid=replay-pile] img').count()) >= 2 && !(await pg.locator('[data-testid=replay-card]').count())) {
        const pileText = await pg.locator('[data-testid=replay-pile]').innerText();
        check(!/\d/.test(pileText), `RR19: the pile shows no count ("${pileText}")`);
        await shot(pg, 'rr-pile');
        // The pile opens the viewer at its latest photo, and the replay holds until it closes (RR13, replay-rhythm audit 7).
        await pg.click('[data-testid=replay-pile]');
        const open = await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 5000 }).then(() => true, () => false);
        const latest = await pg.waitForSelector('[aria-label="Caption: Green gate"]', { timeout: 3000 }).then(() => true, () => false);
        const a = [await clockNow(), await pg.locator('[data-walker]').first().getAttribute('data-walker')].join(' @ ');
        await pg.waitForTimeout(1200);
        const bb = [await clockNow(), await pg.locator('[data-walker]').first().getAttribute('data-walker')].join(' @ ');
        check(open && a === bb, `RR13: the pile opens the viewer and the replay holds (${open}, ${a} → ${bb})`);
        check(latest, 'replay-rhythm audit 7: the pile opens at its latest photo');
        await pg.click('[data-testid=viewer-close]').catch(() => {});
        pileChecked = true;
      }
      if (!soundChecked && (await pg.locator('[data-testid=video-sound]').count())) {
        // A 44 px target on a solid ground, its words at 13 px or more, spoken as shown (tend replay 6).
        await shot(pg, 'rr-sound');
        const chip = await pg.evaluate(() => {
          const e = document.querySelector('[data-testid=video-sound]');
          const b = e.getBoundingClientRect();
          const bg = getComputedStyle(e).backgroundColor;
          const alpha = /rgba\([^)]*,\s*([\d.]+)\)/.exec(bg);
          const text = [...e.querySelectorAll('*')].find((n) => n.childElementCount === 0 && /Tap for sound/.test(n.textContent));
          return { w: Math.round(b.width), h: Math.round(b.height), opaque: !alpha || Number(alpha[1]) === 1, font: text ? parseFloat(getComputedStyle(text).fontSize) : 0, name: e.getAttribute('aria-label') };
        });
        check(chip.w >= 44 && chip.h >= 44 && chip.opaque && chip.font >= 13 && /Tap for sound/.test(chip.name ?? ''), `tend replay 6: a video card's Tap for sound is a 44 px target on a solid ground, 13 px or more, named as it reads (${JSON.stringify(chip)})`);
        // Sound refused: the video plays muted, and its "Tap for sound" can be tapped (replay-rhythm audit 3).
        const tapped = await pg.click('[data-testid=video-sound]', { timeout: 2000 }).then(() => true, () => false);
        await pg.waitForTimeout(300);
        const sound = await pg.evaluate(() => {
          const v = document.querySelector('[data-testid=replay-card] video');
          return !!v && !v.muted && !v.paused;
        });
        check(tapped && sound, `replay-rhythm audit 3: a refused video's Tap for sound turns the sound on (${tapped}, ${sound})`);
        soundChecked = true;
        // Opening the pile mid-video pauses the video too, not only the clock (replay-rhythm audit 4).
        const before = await pg.evaluate(() => window.__media.length);
        await pg.click('[data-testid=replay-pile]');
        await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 5000 }).catch(() => {});
        await pg.waitForTimeout(400);
        const ops = await pg.evaluate((n) => window.__media.slice(n), before);
        const paused = ops.some(([tag, op]) => tag === 'VIDEO' && op === 'pause');
        const v = await pg.evaluate(() => document.querySelector('[data-testid=replay-card] video')?.paused ?? null);
        check(paused && v === true, `replay-rhythm audit 4: opening the viewer pauses the card's video (${JSON.stringify(ops)}, paused ${v})`);
        await pg.click('[data-testid=viewer-close]').catch(() => {});
        afterViewer = await pg.evaluate(() => window.__media.length);
      }
      await pg.waitForTimeout(150);
    }
    const rec = await pg.evaluate(() => {
      clearInterval(window.__rrTimer);
      return window.__rrSeen;
    });
    seen.note = rec.notes.some((n) => /Bought two plums/.test(n));
    seen.card = rec.cards.some((l) => /^Blue door/.test(l));
    seen.later = rec.later.join(' | ');
    seen.counted = rec.counted.join(' | ');
    const onCard = (await pg.locator('[data-testid=to-name]').count()) === 1;
    // The end marker stands where the whole trace ends through the path, as on the card: never on the walker (tend replay 2, QL2).
    const cardEnd = ((await pg.locator('[data-ends]').first().getAttribute('data-ends')) ?? '').split('|')[1];
    check(cardEnd && rec.ends.length === 1 && rec.ends[0] === cardEnd, `tend replay 2: through the path the end marker stays at the trace's last point (${rec.ends.length} places: ${rec.ends.slice(0, 4).join(' ; ')}; the card's ${cardEnd})`);
    // The screen reader's steps (the only Continue) never mount on the web, so "no Continue" proved nothing here
    // (tend replay 14); reaching the card with no tap but the checks' own is the claim.
    check(onCard, `RR6: the replay reaches its card by itself (${onCard})`);
    check(clocks.size >= 3, `RR8: the clock rolls through the walk (${[...clocks].join(', ')})`);
    check((await pg.locator('[data-testid=replay-clock]').count()) === 0, 'RR8: the clock goes when the card comes');
    check(seen.note, 'RR9: the note shows in a bubble');
    check(seen.card, `RR11: the photo grows into a card with its caption (${rec.cards.join(' | ')})`);
    check(pileChecked, 'RR11: the photo tucks into the pile');
    check(/^20 min later$/.test(seen.later), `RR4: the gap is a cut, "20 min later" ("${seen.later}")`);
    check(!seen.counted, `RR19: nothing during the path counts ("${seen.counted}")`);
    check(soundChecked, 'replay-rhythm audit 3: the video came up muted with Tap for sound');
    check(rec.videoEndedInCard, 'replay-rhythm audit 20: the card\u2019s video plays to its end before it tucks away');
    // From the viewer closing to its end, the video is never paused: not at its slot's edge either (audit 34).
    const tail = await pg.evaluate((n) => window.__media.slice(n).filter(([tag]) => tag === 'VIDEO'), afterViewer);
    const endAt = tail.findIndex(([, op]) => op === 'ended');
    check(afterViewer >= 0 && endAt >= 0 && !tail.slice(0, endAt).some(([, op]) => op === 'pause'), `replay-rhythm audit 34: the card's video plays on to its end with no pause (${JSON.stringify(tail)})`);
    check(rec.videoSkeleton, 'RR23: a skeleton stands in the video\u2019s card until it plays');
    check(rec.memoSkeleton, 'RR23: a skeleton waveform stands in the memo\u2019s bubble while it loads');
    check((await pg.locator('[data-testid=media-skeleton], [data-testid=memo-skeleton]').count()) === 0, 'RR23: no skeleton is left on the card');
    const wake = await pg.evaluate(() => window.__wake);
    check(rec.awakeOnPath && wake.held === 0, `RR24: the screen is held awake through the replay and let go on the card (${JSON.stringify(wake)})`);
    check(rec.memoPlay && rec.memoPlay[0] >= 44 && rec.memoPlay[1] >= 44, `RR10, replay-rhythm audit 27: the memo's bubble shows, its play button 44 px (${JSON.stringify(rec.memoPlay)})`);

    // Escape (web) is Back's sibling (tend replay 5): from the name step back to the card, the name typed kept; with a
    // viewer open from a pin it leaves nothing (the web's viewer takes no Escape itself: captures-and-media.md).
    await pg.waitForTimeout(800);
    await shot(pg, 'rr-card');
    await pg.click('[data-testid=to-name]');
    await pg.fill('[data-testid=title-input]', 'Plums by the bridge');
    await shot(pg, 'rr-name');
    await pg.keyboard.press('Escape');
    const backOnCard = await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).then(() => true, () => false);
    await pg.click('[data-testid=to-name]').catch(() => {});
    const kept = await pg.inputValue('[data-testid=title-input]').catch(() => null);
    await pg.keyboard.press('Escape');
    await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).catch(() => {});
    check(backOnCard && kept === 'Plums by the bridge', `tend replay 5: Escape on the name step returns to the card, the name typed kept (${backOnCard}, "${kept}")`);
    // A held Escape stops at the card: its repeats never leave the replay with the words unsaved (tend replay audit 4).
    await pg.click('[data-testid=to-name]');
    await pg.waitForSelector('[data-testid=title-input]', { timeout: 3000 }).catch(() => {});
    await pg.keyboard.down('Escape');
    await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).catch(() => {});
    await pg.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', repeat: true, bubbles: true })));
    await pg.keyboard.up('Escape');
    await pg.waitForTimeout(800);
    const heldStays = /\/replay\//.test(new URL(pg.url()).pathname) && (await pg.locator('[data-testid=to-name]').count()) === 1;
    check(heldStays, `tend replay audit 4: a held Escape on the name step stops at the card (${new URL(pg.url()).pathname})`);
    await pg.getByRole('button', { name: /\. Open$/ }).first().click();
    const viewerUp = await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 5000 }).then(() => true, () => false);
    await pg.keyboard.press('Escape');
    await pg.waitForTimeout(800);
    const stayed = /\/replay\//.test(new URL(pg.url()).pathname) && (await pg.locator('[data-testid=to-name]').count()) === 1;
    check(viewerUp && stayed, `tend replay 5: Escape with a viewer open from a pin leaves neither the replay nor its card (${viewerUp}, ${stayed}, ${new URL(pg.url()).pathname})`);
    await pg.click('[data-testid=viewer-close]').catch(() => {});
    await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 3000 }).catch(() => {});

    // A landscape phone: the card stands between the top row and the corner, clear of the buttons (replay-rhythm audit 13).
    await pg.setViewportSize({ width: 844, height: 390 });
    await pg.getByText('Watch again').click();
    const card = await pg.waitForSelector('[data-testid=replay-card]', { timeout: 30000 }).then(() => true, () => false);
    await pg.waitForTimeout(500);
    const cb = await pg.locator('[data-testid=replay-card]').first().boundingBox().catch(() => null);
    const hb = await pg.locator('[data-testid=hold]').boundingBox().catch(() => null);
    const sb = await pg.locator('[data-testid=skip]').boundingBox().catch(() => null);
    // Hold and Skip must be there to be cleared (tend replay 11: a missing button let this pass).
    const clear = (r) => !!r && !!cb && (cb.x + cb.width <= r.x || r.x + r.width <= cb.x || cb.y + cb.height <= r.y || r.y + r.height <= cb.y);
    check(card && cb && cb.y >= 0 && cb.y + cb.height <= 390 && clear(hb) && clear(sb), `replay-rhythm audit 13: the card fits a landscape phone, clear of Hold and Skip (${JSON.stringify(cb)})`);
    // Under all the top can show: the clock, "N min later" and "Held" (tend replay 11).
    check(cb && cb.y >= 118, `tend replay 11: on a landscape phone the card stands under the clock's line and the Held pill (${JSON.stringify(cb)})`);
    // Held with the card up, the Held pill (and "N min later", when a cut is up) stand clear of the card: measured, not
    // a sum of heights (tend replay audit 5).
    await pg.click('[data-testid=hold]');
    await pg.waitForTimeout(300);
    const pills = await pg.evaluate(() => {
      const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
      return { card: r('[data-testid=replay-card]'), held: r('[data-testid=replay-held]'), later: r('[data-testid=replay-later]'), clock: r('[data-testid=replay-clock]') };
    });
    const meets = (a, b) => !!a && !!b && !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
    check(pills.card && pills.held && !meets(pills.card, pills.held) && !meets(pills.card, pills.later) && !meets(pills.card, pills.clock),
      `tend replay audit 5: on a landscape phone, held, the clock, Held and any "N min later" never meet the card (${JSON.stringify(pills)})`);
    await shot(pg, 'rr-landscape-held');
    await pg.click('[data-testid=skip]');
    await pg.waitForSelector('[data-testid=to-name]', { timeout: 15000 });
    await pg.setViewportSize({ width: 390, height: 844 });

    // The fog's headline stands below the top row, clear of Skip, 16 px in from each edge, at 390 and at 320 (tend replay 1).
    const boxOf = (sel) => pg.locator(sel).first().boundingBox().catch(() => null);
    const apart = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
    for (const [w, ht] of [[390, 844], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.getByText('Watch again').click();
      const shown = await pg.waitForSelector('[data-testid=replay-headline]', { timeout: 15000 }).then(() => true, () => false);
      await pg.waitForTimeout(400);
      const hb = await boxOf('[data-testid=replay-headline]');
      const sb = await boxOf('[data-testid=skip]');
      check(shown && hb && sb && apart(hb, sb) && hb.x >= 16 && hb.x + hb.width <= w - 16,
        `tend replay 1: at ${w} px the fog's headline clears Skip and keeps 16 px from each edge (${JSON.stringify(hb)}, Skip ${JSON.stringify(sb)})`);
      await shot(pg, `rr-fog-${w}`);
      await pg.click('[data-testid=skip]');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 15000 });
    }
    // On a 375 or 320 px phone a card stands above a note's bubble in the corner, under the top row (tend replay 7).
    for (const [w, ht] of [[375, 667], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.getByText('Watch again').click();
      const up = await pg.waitForSelector('[data-testid=replay-card]', { timeout: 30000 }).then(() => true, () => false);
      await pg.waitForTimeout(1200);
      const cb = await boxOf('[data-testid=replay-card]');
      check(up && cb && cb.y + cb.height <= ht - 44 - 160 && cb.y >= 64, `tend replay 7: at ${w}x${ht} the card stands clear of the bubbles' corner and the top row (${JSON.stringify(cb)})`);
      await shot(pg, `rr-card-${w}`);
      if (w === 320) {
        // The memo's bubble keeps its time whole at 320 px; its label gives way first (tend replay 8).
        const memo = await pg.waitForSelector('[data-testid=memo-play]', { timeout: 60000 }).then(() => true, () => false);
        await pg.waitForTimeout(600);
        const time = await pg.evaluate(() => {
          const e = document.querySelector('[data-testid=memo-time]');
          return e ? { text: e.textContent, whole: e.scrollWidth <= e.clientWidth + 1, right: Math.round(e.getBoundingClientRect().right) } : null;
        });
        check(memo && time && time.whole && /\d\d(\s?[AP]M)?$/.test(time.text) && time.right <= w, `tend replay 8: at 320 px the memo's bubble shows its time whole (${JSON.stringify(time)})`);
        // On one line, inside its bubble: a wrapped "5:38 / PM" was "whole" too (tend replay audit 2).
        const line = await pg.evaluate(() => {
          const e = document.querySelector('[data-testid=memo-time]');
          if (!e) return null;
          const r = document.createRange();
          r.selectNodeContents(e);
          const tops = new Set([...r.getClientRects()].filter((b) => b.width > 0).map((b) => Math.round(b.top)));
          const bubble = e.closest('[data-testid=memo-bubble]')?.getBoundingClientRect();
          return { lines: tops.size, right: Math.round(e.getBoundingClientRect().right), bubbleRight: bubble ? Math.round(bubble.right) : null };
        });
        check(line && line.lines === 1 && line.bubbleRight != null && line.right <= line.bubbleRight, `tend replay audit 2: at 320 px the memo's time is one line inside its bubble (${JSON.stringify(line)})`);
        await shot(pg, 'rr-memo-320');
      }
      await pg.click('[data-testid=skip]');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 15000 });
    }
    await pg.setViewportSize({ width: 390, height: 844 });

    // The day (RR16): its replay reaches the day's card with no taps, the note on the way.
    const wakesBefore = (await pg.evaluate(() => window.__wake.log.length));
    await pg.click('[data-testid=not-now]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 });
    await h.mapUp(pg);
    await pg.click('[data-testid=sheet-days]');
    await pg.click('[data-testid=day-row]');
    await pg.click('[data-testid=day-replay]');
    await pg.waitForURL(/\/day\//, { timeout: 15000 });
    let dayNote = false;
    for (let k = 0; k < 400 && !(await pg.locator('[data-testid=day-card]').count()); k++) {
      if (await pg.getByText('Bought two plums').count()) dayNote = true;
      await pg.waitForTimeout(150);
    }
    // As in the walk's replay, no Continue ever mounts on the web (tend replay 14).
    check((await pg.locator('[data-testid=day-card]').count()) === 1 && dayNote, `RR16: the day's replay reaches its card by itself, its note on the way (${dayNote})`);
    const dayWake = await pg.evaluate(() => window.__wake);
    check(dayWake.log.length > wakesBefore && dayWake.held === 0, `RR24: the day's replay holds the screen awake too, and lets it go on its card (${JSON.stringify(dayWake)})`);
    // The day framed above its card once the fit has settled.
    await pg.waitForTimeout(1200);
    await shot(pg, 'rr-day-card');
    // The day's card is as quiet as the walk's (tend replay 12, tabs audit U13): its line set as the walk card's, no
    // large or accent text in it.
    const quiet = await pg.evaluate(() => {
      const card = document.querySelector('[data-testid=day-card]');
      const line = document.querySelector('[data-testid=day-card-line]');
      const cs = line && getComputedStyle(line);
      const loud = [...card.querySelectorAll('div, span')]
        .filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
        .filter((e) => { const s = getComputedStyle(e); return parseFloat(s.fontSize) >= 28 || s.color === 'rgb(194, 65, 12)'; })
        .map((e) => e.textContent.trim());
      return { size: cs ? parseFloat(cs.fontSize) : null, weight: cs ? Number(cs.fontWeight) : null, loud };
    });
    check(quiet.size === 16 && quiet.weight < 600 && quiet.loud.length === 0, `tend replay 12: the day card's line is set as the walk card's, nothing large or in the accent (${JSON.stringify(quiet)})`);
    // Escape leaves the day's replay as Done does (tend replay 5).
    await pg.keyboard.press('Escape');
    const leftDay = await pg.waitForURL((u) => !u.pathname.includes('/day/'), { timeout: 5000 }).then(() => true, () => false);
    check(leftDay, `tend replay 5: Escape leaves the day's replay from its card (${new URL(pg.url()).pathname})`);
    await c.close();
    // The scenario refuses a video's sound on purpose; expo-video lets that refusal go unhandled.
    for (let i = errors.length - 1; i >= 0; i--) if (/NotAllowedError: refused/.test(errors[i])) errors.splice(i, 1);
}

module.exports = {
  name: 'replay',
  covers: [
    'src/app/replay/**',
    'src/app/day/**',
    'src/components/ceremony/**',
    'src/lib/ceremony/**',
    'src/lib/{replay,days,summary,motionTokens}.ts',
    'src/lib/explore/explore.ts',
    'src/components/ui.tsx',
    'src/components/map/WalkMap.web.tsx',
  ],
  run,
};
