// Clearing walks and moments (D1-D11): the ride walk's card has More with Delete walk and the GPS log;
// a moment, then the first walk, deleted with undo; what is left, and later walks' new streets (D7).
// Starts on the ride walk's card, where the memories journey ends, with two walks before it.

async function checks(h) {
  const { page, at, names, check, shot } = h;
    // Clearing walks and moments (D1-D11): on the first walk, which holds a photo, a memo, a video and a note.
    {
      const all = (name) => page.evaluate((n) => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction(n, 'readonly').objectStore(n).getAll();
          g.onsuccess = () => resolve(g.result);
        };
      }), name);
      const mediaKeys = () => page.evaluate(() => new Promise((resolve) => {
        const req = indexedDB.open('chronicles');
        req.onsuccess = () => {
          const g = req.result.transaction('media', 'readonly').objectStore('media').getAllKeys();
          g.onsuccess = () => resolve(g.result);
        };
      }));
      const toast = () => page.locator('[data-testid=undo-toast]').innerText().catch(() => '');
      const past = () => page.waitForTimeout(5800);
      // Close on the pill: the delete stands and is stored now (UC2); Undo never ends on a timer (UC1).
      const closePill = async () => {
        await page.click('[data-testid=undo-dismiss]');
        await page.waitForTimeout(800);
      };
      // The ride walk's card has More, with Delete walk (D1); Escape closes it, nothing changed.
      await page.click('[data-testid=card-more]');
      await page.waitForSelector('[data-testid=action-delete]');
      await shot(page, '24-walk-actions');
      // A finished walk shares its GPS log from More, every raw reading, the ride's too (the owner, Nov 3:
      // a gap that wasn't filled could not be looked into once the walk had ended).
      await page.evaluate(() => { window.__shared = null; navigator.share = (d) => { window.__shared = d; return Promise.resolve(); }; });
      await page.waitForSelector('[data-testid=action-gps-log]', { timeout: 5000 }).catch(() => {});
      await page.click('[data-testid=action-gps-log]').catch(() => {});
      const sharedEnded = await page.waitForFunction(() => window.__shared, null, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => null);
      const endedRows = (sharedEnded?.text ?? '').split('\n');
      check(endedRows[0]?.startsWith('# Chronicles GPS log') && endedRows.filter((r) => /^\d+\.\d,/.test(r)).length >= 20,
        `a finished walk's More shares its GPS log (${endedRows.length} lines)`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('[data-testid=walk-actions]', { state: 'detached', timeout: 5000 });
      check(true, 'the replay card offers the walk’s actions, and Escape closes them (D1)');
      await page.click('[data-testid=to-name]');
      await page.click('[data-testid=save]');
      await h.mapUp(page);
      await page.waitForSelector('[data-testid=home-sheet]');

      const first = (await all('walk')).sort((a, b) => a.started_at - b.started_at)[0];
      const capsOf = async () => (await all('capture')).filter((c) => c.walk_id === first.id);
      const sumOf = async () => (await all('walk_summary')).find((x) => x.walk_id === first.id);
      const findsBefore = (await all('find')).filter((f) => f.walk_id === first.id).length;
      await page.click('[data-testid=sheet-walks]');
      await page.waitForSelector('[data-testid=walk-row]');
      const rowsBefore = await page.locator('[data-testid=walk-row]').count();
      // Newest first: the first walk is the last row.
      await page.locator('[data-testid=walk-row]').nth(rowsBefore - 1).click();
      await page.waitForSelector('[data-testid=skip]', { timeout: 60000 });
      await page.click('[data-testid=skip]');
      await page.waitForSelector('[data-testid=done]', { timeout: 60000 });

      // D3: a moment from the card's viewer. The note is flagged to come back, so its reminder goes too.
      const noteCap = (await capsOf()).find((c) => /cardamom/.test(c.body ?? ''));
      const notesBefore = (await sumOf()).notes;
      const openNote = async () => {
        const pins = page.locator('[aria-label$=". Open"]');
        await pins.nth((await pins.count()) - 1).click();
        for (let k = 0; k < 6 && !(await page.getByText('The bakery smelled of cardamom.').count()); k++) {
          await page.click('[aria-label="Next capture"]');
          await page.waitForTimeout(300);
        }
        await page.waitForSelector('text=The bakery smelled of cardamom. >> visible=true');
      };
      await openNote();
      await page.click('[data-testid=viewer-more]');
      await page.click('[data-testid=viewer-delete]');
      await page.waitForTimeout(400);
      check((await page.locator('[data-testid=confirm]').count()) === 0 && (await page.locator('[data-testid=undo-toast]').count()) === 1, 'UC4: deleting a moment acts at once, with no card first, and the pill with Undo follows');
      check(/Note deleted/.test(await toast()) && (await page.getByText('The bakery smelled of cardamom.').count()) === 0,
        'a deleted moment leaves at once, with Undo (D3, D5)');
      {
        const u = await page.locator('[data-testid=undo]').boundingBox();
        // Never wait on a button that may not be there: the delete is stored when the window ends.
        const x = (await page.locator('[data-testid=undo-dismiss]').count()) ? await page.locator('[data-testid=undo-dismiss]').boundingBox() : null;
        check(!!(u && x && u.height >= 44 && x.height >= 44 && x.width >= 44 && Math.abs(x.x - (u.x + u.width)) >= 8) && x !== null && (await page.locator('[data-testid=undo-dismiss]').getAttribute('aria-label')) === 'Close, it stays deleted',
          'UC3: the pill has Undo and a Close, each 44 px, 8 px apart, Close named for what it does');
      }
      await shot(page, '26-undo-moment');
      await past();
      check((await capsOf()).some((c) => c.id === noteCap.id) && (await page.locator('[data-testid=undo-toast]').count()) === 1, 'UC1: nothing is stored while the pill waits, and it is still up after the old 5 s (D5 amended)');
      await page.click('[data-testid=undo]');
      await page.waitForTimeout(300);
      if (await page.locator('[data-testid=viewer-close]').count()) await page.click('[data-testid=viewer-close]');
      check((await capsOf()).some((c) => c.id === noteCap.id) && (await page.locator('[data-testid=undo-toast]').count()) === 0, 'Undo brings the moment back as it was (D5)');
      await openNote();
      check(true, 'the moment is back on the map after Undo');
      await page.click('[data-testid=viewer-more]');
      await page.click('[data-testid=viewer-delete]');
      await page.waitForSelector('[data-testid=undo-toast]');
      await closePill();
      if (await page.locator('[data-testid=viewer-close]').count()) await page.click('[data-testid=viewer-close]');
      const recallsLeft = (await all('recall')).filter((r) => r.capture_id === noteCap.id).length;
      check(!(await capsOf()).some((c) => c.id === noteCap.id) && recallsLeft === 0, `once the pill is closed the moment and its reminder are gone (D3, UC2: ${recallsLeft} reminders)`);
      check((await sumOf()).notes === notesBefore - 1, `the walk's counts follow (D9: notes ${notesBefore} → ${(await sumOf()).notes})`);

      // D2: the walk's photos, videos and memos go; the walk, its notes and its finds stay.
      const media = (await capsOf()).filter((c) => c.kind !== 'text');
      const mediaRefs = media.flatMap((c) => [c.file_path, c.thumb_path]).filter((r) => r && r !== 'none');
      check(media.length >= 3 && mediaRefs.every(Boolean), `the walk has media to remove (${media.map((c) => c.kind).join(', ')})`);
      await page.click('[data-testid=card-more]');
      await page.click('[data-testid=action-media]');
      await page.waitForSelector('[data-testid=confirm]');
      const askMedia = await page.locator('[data-testid=confirm]').innerText();
      check(/Remove photos, videos and memos\?/.test(askMedia) && /photo/.test(askMedia) && /stay/.test(askMedia), `removing media says what goes and what stays (D4: ${askMedia.replace(/\n/g, ' · ')})`);
      await page.click('[data-testid=confirm-delete]');
      await page.waitForSelector('[data-testid=undo-toast]');
      check(/Photos, videos and memos removed/.test(await toast()), 'the pill names what went (D5)');
      check((await page.locator('[data-testid=confirm]').count()) === 0 && /Remove photos, videos and memos\?/.test(askMedia), 'UC5: removing a walk\'s media asked first and said what goes, then the pill');
      await past();
      check((await page.locator('[data-testid=undo-toast]').count()) === 1, 'UC1: the pill is still up after the old 5 s: it waits for Undo, Close or another delete');
      await closePill();
      const keysNow = new Set(await mediaKeys());
      const capsNow = await capsOf();
      const s2 = await sumOf();
      // Its one note went in the D3 check above, so nothing may be left but notes, if any.
      check(capsNow.every((c) => c.kind === 'text'), `only notes are left (D2: ${capsNow.length} left, ${capsNow.map((c) => c.kind).join(', ') || 'none'})`);
      check(mediaRefs.every((r) => !keysNow.has(r)), 'their files and thumbnails are gone from storage (D2)');
      check((await all('find')).filter((f) => f.walk_id === first.id).length === findsBefore, 'places they found stay found (D2)');
      check(s2.photos === 0 && (s2.videos ?? 0) === 0 && s2.voices === 0 && s2.distance_m > 0, 'the counts drop to the notes, the walk stays (D9)');
      await page.click('[data-testid=done]');
      await page.waitForSelector('[data-testid=walk-row]');

      // D1: the walk itself, from its row. Undo first, then for good.
      const deleteFirst = async () => {
        await page.locator('[data-testid=walk-more]').nth(rowsBefore - 1).click();
        await page.click('[data-testid=action-delete]');
        await page.waitForSelector('[data-testid=confirm]');
        const t = await page.locator('[data-testid=confirm]').innerText();
        await page.click('[data-testid=confirm-delete]');
        return t;
      };
      const askWalk = await deleteFirst();
      check(/Delete this walk\?/.test(askWalk) && /Its trace/.test(askWalk), `deleting a walk says what goes (D4: ${askWalk.replace(/\n/g, ' · ')})`);
      await page.waitForSelector('[data-testid=undo-toast]');
      check((await page.locator('[data-testid=walk-row]').count()) === rowsBefore - 1 && /Walk deleted/.test(await toast()), 'the walk leaves the list at once, with Undo (D1, D5)');
      await page.click('[data-testid=undo]');
      await page.waitForTimeout(300);
      check((await page.locator('[data-testid=walk-row]').count()) === rowsBefore, 'Undo brings the walk back (D5)');
      check(/Delete this walk\?/.test(askWalk), 'UC5: deleting a whole walk still asks first, then the pill');
      await deleteFirst();
      await page.waitForSelector('[data-testid=undo-toast]');
      await closePill();
      const left = {
        walk: (await all('walk')).filter((w) => w.id === first.id).length,
        trace: (await all('trace_point')).filter((x) => x.walk_id === first.id).length,
        captures: (await capsOf()).length,
        visited: (await all('visited_segment')).filter((x) => x.walk_id === first.id).length,
        areas: (await all('walk_area')).filter((x) => x.walk_id === first.id).length,
        finds: (await all('find')).filter((x) => x.walk_id === first.id).length,
        summary: (await all('walk_summary')).filter((x) => x.walk_id === first.id).length,
        files: (await mediaKeys()).filter((k) => String(k).startsWith(`walks/${first.id}/`)).length,
      };
      check(Object.values(left).every((n) => n === 0), `the walk and everything tied to it are gone (D1: ${JSON.stringify(left)})`);
      check((await page.locator('[data-testid=walk-row]').count()) === rowsBefore - 1, 'it stays gone from the list (D8)');
      // D7: every later walk's new streets are counted again without it.
      const walksLeft = (await all('walk')).sort((a, b) => a.started_at - b.started_at);
      const visited = await all('visited_segment');
      const seen = new Set();
      const wrong = [];
      for (const w of walksLeft) {
        // Named streets only, as a snap counts them (audit 1).
        const keys = new Set(visited.filter((v) => v.walk_id === w.id && v.street_key.startsWith('name:')).map((v) => v.street_key));
        const fresh = [...keys].filter((k) => !seen.has(k)).length;
        keys.forEach((k) => seen.add(k));
        const sm = (await all('walk_summary')).find((x) => x.walk_id === w.id);
        if (sm && sm.new_streets !== fresh) wrong.push(`${w.id}: ${sm.new_streets} ≠ ${fresh}`);
      }
      check(wrong.length === 0, `later walks' new streets are counted again without it (D7${wrong.length ? `: ${wrong.join('; ')}` : ''})`);
    }
}

// Alone: the walk journey, then the memories checks (the second and the ride walks), then this.
async function run(h) {
  await require('./walk').run(h);
  await require('./memories').checks(h);
  await checks(h);
}

module.exports = {
  name: 'deletion',
  covers: [
    // It shares a walk's GPS log from the walk's options (lib/shareLog).
    'src/lib/shareLog/**',
    'src/lib/deletion/**',
    'src/components/{WalkActions,UndoToast}.tsx',
  ],
  run,
  checks,
};
