// A place offered after the moment (specs/moment-assignment-fallback, PO1-PO12): a moment kept within 30 m of an unfound place,
// with Places on and nothing armed, brings one quiet line at the top of the map. Fox Point's Hessian Memorial is the one place;
// Two Spires (30 km west, the harness's) has two within 30 m and a third at 42 m. E2E_ONLY=placeoffer runs it alone.
const path = require('path');

async function run(h) {
  const { navUrl, BASE, at, check, freshPage, shot, switchLayer, scriptsDir } = h;
  const photoFile = path.join(scriptsDir, 'fixtures', 'photo.jpg');
  const LINE = '[data-testid=place-offer]';

  const helpers = (c, pg) => {
    const go = async (p, n = 3) => {
      for (let k = 0; k < n; k++) {
        await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
        await pg.waitForTimeout(1000);
      }
    };
    const photo = async () => {
      const [ch] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click('[data-testid=cap-photo]')]);
      await ch.setFiles(photoFile);
      // The photo is kept as the editor opens ("Photo kept"); closing it is the walker's next tap.
      if (await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 }).then(() => true, () => false)) {
        await pg.click('[data-testid=edit-close]').catch(() => {});
        await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
      }
      await pg.waitForTimeout(500);
    };
    const note = async (text) => {
      await pg.click('[data-testid=cap-note]');
      await pg.fill('[data-testid=note-input]', text);
      await pg.click('[data-testid=note-done]');
      await pg.waitForTimeout(500);
    };
    const lineText = async (timeout = 5000) => {
      const el = await pg.waitForSelector(LINE, { timeout }).catch(() => null);
      return el ? (await el.innerText()).replace(/\n/g, ' ') : null;
    };
    const lineGone = async (timeout = 5000) =>
      (await pg.waitForSelector(LINE, { state: 'detached', timeout }).then(() => true, () => false)) || (await pg.locator(LINE).count()) === 0;
    const pins = () => pg.locator('.maplibregl-map [data-testid=mark-pin]').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    const pin = (name) => pg.locator(`.maplibregl-map [data-testid=mark-pin][aria-label^="${name}"]`).first();
    const box = (sel) => pg.locator(sel).first().boundingBox().catch(() => null);
    const moments = () => pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['moment', 'find'], 'readonly');
        const ms = tx.objectStore('moment').getAll();
        const fs = tx.objectStore('find').getAll();
        tx.oncomplete = () => resolve({ moments: ms.result.length, finds: fs.result.map((f) => `${f.name}:${f.capture_id}`) });
      };
    }));
    return { go, photo, note, lineText, lineGone, pins, pin, box, moments };
  };

  // ---- One place: Fox Point's Hessian Memorial, 15 m from the photo.
  {
    const { c, pg } = await freshPage('placeoffer');
    const { go, photo, lineText, lineGone, pins, box, moments } = helpers(c, pg);
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await switchLayer(pg, 'places');
    for (let k = 0; k <= 23; k++) await go(at(-0.5 + k * 0.05, -0.5), 1);
    await go(at(0.65, -0.5));
    await pg.waitForSelector('.maplibregl-map [aria-label^="Hessian Memorial"]', { timeout: 30000 }).catch(() => {});
    const stackBefore = await Promise.all(['cap-photo', 'cap-voice', 'cap-note'].map((id) => box(`[data-testid=${id}]`)));
    // What a tap on the camera's middle lands on: null when it is the camera, else what covers it.
    const atCamera = () => pg.evaluate(() => {
      const cam = document.querySelector('[data-testid=cap-photo]');
      const b = cam?.getBoundingClientRect();
      if (!b) return 'no camera';
      const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      if (!hit || cam.contains(hit) || hit.contains(cam)) return null;
      const owner = hit.closest('[data-testid]');
      return `${owner?.getAttribute('data-testid') ?? ''}: ${(hit.textContent ?? '').slice(0, 60)}`;
    });
    const coveredBefore = await atCamera();

    await photo();
    const said = await lineText();
    await pg.waitForTimeout(400);
    await shot(pg, 'po-01-one-place');
    check(said?.startsWith('Was this photo about Hessian Memorial?') && /Yes/.test(said) && /Leave it/.test(said),
      `PO1: a photo 15 m from one unfound place brings its line, Yes and Leave it (${said})`);
    const lineBox = await box(LINE);
    const yesBox = await box('[data-testid=place-offer-yes]');
    const leaveBox = await box('[data-testid=place-offer-leave]');
    const live = await pg.locator(LINE).getAttribute('aria-live').catch(() => null);
    check(!!lineBox && lineBox.y < 200 && !!yesBox && !!leaveBox && yesBox.height >= 44 && leaveBox.height >= 44
      && Math.abs(yesBox.width - leaveBox.width) <= 1 && live === 'polite',
      `PO2: the line is at the top of the map, its two buttons 44 pt or more and of one size, said politely (${JSON.stringify({ lineBox, yesBox, leaveBox, live })})`);
    check((await pins()).some((l) => l === 'Hessian Memorial, History. Tie this photo to it'),
      `PO3: with one place, its pin is a choice too (${JSON.stringify(await pins())})`);
    const stackAfter = await Promise.all(['cap-photo', 'cap-voice', 'cap-note'].map((id) => box(`[data-testid=${id}]`)));
    const covered = await atCamera();
    const pill = (await pg.locator('[data-testid=add-to-moment]').filter({ visible: true }).count()) > 0;
    const still = JSON.stringify(stackBefore) === JSON.stringify(stackAfter);
    check(still && covered === coveredBefore && pill,
      `PO7: with the line up the capture stack has not moved and is not covered, and Add to this moment is there (${JSON.stringify({ still, covered, coveredBefore, pill })})`);

    await pg.click('[data-testid=place-offer-yes]').catch(() => {});
    const found = await pg.waitForSelector('[data-testid=found-line]', { timeout: 5000 }).then((e) => e.innerText(), () => '');
    check(/Found: Hessian Memorial/.test(found) && /Undo/.test(found) && (await lineGone()),
      `PO1: Yes ties it: "Found: Hessian Memorial" with Undo, and the line goes (${found.replace(/\n/g, ' ')})`);
    check((await pins()).includes('Found with a photo: Hessian Memorial, History'), 'PO9: the same find Capture here makes: the pin is found with the photo\'s glyph');
    await shot(pg, 'po-02-found-undo');
    const before = await moments();
    await pg.click('[data-testid=found-undo]').catch(() => {});
    await pg.waitForTimeout(800);
    const after = await moments();
    check(after.finds.length === 0 && after.moments === before.moments && (await pins()).includes('Hessian Memorial, History. Open') && (await lineGone(1000)),
      `PO12: Undo unties it and keeps the photo; the place is an ordinary mark again and the photo is not asked about again (${JSON.stringify({ before, after })})`);

    await photo();
    check(/Hessian Memorial/.test((await lineText()) ?? ''), 'PO6: a newer moment brings its own line');
    await pg.click('[data-testid=place-offer-leave]').catch(() => {});
    check((await lineGone()) && (await moments()).finds.length === 0 && (await pins()).includes('Hessian Memorial, History. Open'),
      'PO4: Leave it keeps the photo independent: no find, the pin as before');
    await photo();
    check((await lineText(3000)) === null, 'PO4: a place left with Leave it is not offered again on this walk');
    await pg.reload();
    await pg.waitForSelector('[data-testid=walk-actions]', { timeout: 30000 });
    await go(at(0.65, -0.5));
    check((await lineText(3000)) === null, 'PO4: after a reload no old moment is asked about');
    await photo();
    check((await lineText(3000)) === null, 'PO4: after a reload the left place is still not offered');
    await c.close();
  }

  // ---- Several places: Two Spires, North Spire 16 m and South Spire 18 m from the photo, Far Cross 42 m.
  {
    const { c, pg } = await freshPage('placeoffer-two');
    const { go, photo, note, lineText, lineGone, pins, pin, moments } = helpers(c, pg);
    const mid = at(-300, 0);
    await c.setGeolocation({ longitude: mid[0], latitude: mid[1], accuracy: 6 });
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await go(mid);

    // Places off: nothing is asked (PO5).
    await photo();
    check((await lineText(3000)) === null, 'PO5: with Places off a moment by two places is not asked about');
    await switchLayer(pg, 'places');
    await pg.waitForSelector('.maplibregl-map [aria-label^="North Spire"]', { timeout: 60000 }).catch(() => {});
    check((await lineText(2000)) === null, 'PO5: turning Places on asks nothing about a moment kept before');

    await photo();
    const said = await lineText();
    check(said?.startsWith('Was this photo about North Spire or South Spire? Tap it on the map.') && !/Yes/.test(said) && !/Far Cross/.test(said),
      `PO3: two places within 30 m are named nearest first; the one at 42 m is not (${said})`);
    const labels = await pins();
    check(labels.includes('North Spire, History. Tie this photo to it') && labels.includes('South Spire, History. Tie this photo to it')
      && labels.includes('Far Cross, History. Open'), `PO3: exactly the places in reach are choices (${JSON.stringify(labels)})`);
    check(!/\d/.test(said ?? '0'), 'PO8: the line counts nothing');
    // Each choice is what a tap on its head meets, above the moments' pins beside it (PO3).
    const onTop = await pg.evaluate(() => [...document.querySelectorAll('.maplibregl-map [data-testid=mark-pin]')]
      .filter((e) => /Tie this photo to it$/.test(e.getAttribute('aria-label') ?? ''))
      .map((e) => {
        const head = e.querySelector('[data-testid=mark-choice]')?.getBoundingClientRect();
        if (!head) return false;
        const hit = document.elementFromPoint(head.x + head.width / 2, head.y + head.height / 2);
        return !!hit && e.contains(hit);
      }));
    check(onTop.length === 2 && onTop.every(Boolean), `PO3: each choice stands over the moments' pins, so a tap meets it (${JSON.stringify(onTop)})`);
    await shot(pg, 'po-03-several');
    await pin('Far Cross').click().catch(() => {});
    const card = await pg.waitForSelector('[data-testid=mark-card]', { timeout: 5000 }).then(() => true, () => false);
    check(card && (await pg.locator(LINE).count()) === 1, 'PO3: a tap on a pin not offered opens its card as before, the line kept');
    await pg.click('[data-testid=mark-close]').catch(() => {});
    await pin('South Spire').click().catch(() => {});
    const found = await pg.waitForSelector('[data-testid=found-line]', { timeout: 5000 }).then((e) => e.innerText(), () => '');
    check(/Found: South Spire/.test(found) && !(await pg.locator('[data-testid=mark-card]').count()) && (await lineGone())
      && (await pins()).includes('North Spire, History. Open'), `PO3: a tap on a choice ties the photo to it, opens no card, and the other is ordinary again (${found})`);
    await shot(pg, 'po-04-several-found');
    await pg.click('[data-testid=found-dismiss]').catch(() => {});

    // Walking off: the line goes and nothing is tied (PO6).
    await photo();
    check(/^Was this photo about North Spire\?/.test((await lineText()) ?? ''), 'PO6: the next photo is asked about the place still unfound');
    await go(at(-300.7, 0), 4);
    check((await lineGone()) && (await moments()).finds.every((f) => !/North Spire/.test(f)), 'PO6: 70 m away the line goes, and nothing is tied');
    await go(mid, 4);

    // A note brings the line too, and a newer moment replaces it (PO10, PO6).
    await note('The two spires at dusk.');
    check(/^Was this note about North Spire\?/.test((await lineText()) ?? ''), 'PO10: a note kept by a place brings the line, said as a note');
    await photo();
    check(/^Was this photo about North Spire\?/.test((await lineText()) ?? ''), 'PO6: a newer moment replaces the line with its own');
    await pg.click('[data-testid=place-offer-leave]').catch(() => {});

    // Armed with Capture here: the photo finds the armed place and nothing is asked (PO5). North Spire was left, so Capture here.
    // North Spire is an ordinary mark again, under the moments' pins at this zoom: the click goes to the pin itself.
    await pin('North Spire').dispatchEvent('click').catch(() => {});
    await pg.click('[data-testid=mark-capture]').catch(() => {});
    const armedUp = await pg.waitForSelector('[data-testid=armed-line]', { timeout: 5000 }).then(() => true, () => false);
    check(armedUp, 'PO5: Capture here arms a place left earlier (the armed line is up)');
    await photo();
    await pg.waitForTimeout(1000);
    const armedFinds = (await moments()).finds;
    check(armedFinds.some((f) => /^North Spire:/.test(f)) && (await lineText(2000)) === null,
      `PO5: a place armed with Capture here is found by the photo, and nothing is asked (${JSON.stringify(armedFinds)})`);
    await c.close();
  }
}

module.exports = {
  name: 'placeoffer',
  covers: ['src/lib/explore/placeOffer.ts', 'src/lib/explore/offer/**', 'src/lib/explore/useExplore.ts'],
  run,
};
