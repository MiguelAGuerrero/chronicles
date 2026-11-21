// Places on the ready map (RQ1-RQ18, specs/ready-map-places): on Navigate before Start, with Places on (its default
// there), the "?" within your range around you, as a walk draws them; a tap opens the place's card with "Set as
// destination" and Open in Maps; the walk to it keeps that one place. The owner saw none in Capitol Square (Nov 21).
// Written first as todos (48e039b), each failing until its code. E2E_ONLY=readyplaces runs it alone.

async function run(h) {
  const { navUrl, BASE, at, check, freshPage, drawerTo, toStop, shot, switchLayer, scriptsDir } = h;
  const path = require('path');
  const { c, pg } = await freshPage('readyplaces');
  // The ready map is the first `.maplibregl-map` while no walk is open; its pins are read there.
  const pins = () => pg.locator('.maplibregl-map').last().locator('[data-testid=mark-pin]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const until = async (f, ms = 30000) => {
    const end = Date.now() + ms;
    let v = await f();
    while (!v && Date.now() < end) {
      await pg.waitForTimeout(500);
      v = await f();
    }
    return v;
  };
  // Stand 38 m from Hessian Memorial (named within 60 m) and 113 m from Fox Point's unnamed artwork.
  const P1 = at(0.3, -0.2);
  await c.setGeolocation({ longitude: P1[0], latitude: P1[1], accuracy: 6 });
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');

  // RQ1, RQ2, RQ5: the area is read once from the ready map, then the "?" within the range (100 m) are drawn around you:
  // the memorial, named; the artwork, past the range, not yet.
  const first = (await until(async () => ((await pins()).length ? pins() : null), 45000)) ?? [];
  await shot(pg, 'readyplaces-1-ready-map');
  check(first.some((l) => /^Hessian Memorial, /.test(l)) && !first.some((l) => /^A place to find/.test(l)),
    `RQ1, RQ2: on Navigate before Start, with Places on, the places within the range around you are drawn, named within 60 m (${JSON.stringify(first)})`);
  // RQ12: each is a button with a spoken name.
  const role = await pg.locator('[data-testid=mark-pin]').first().evaluate((e) => e.tagName).catch(() => '');
  check(role === 'BUTTON', 'RQ12: a "?" on the ready map is a button with a spoken name');
  // RQ11: nothing says how many or what is left.
  check(!/left to find|still to find|nearby to find|remaining/i.test(await pg.locator('body').innerText()), 'RQ11: no copy on the ready map says how many or what is left');

  // RQ17's row, for the UI review: the panel open, the Places row saying its range in words.
  await pg.click('[data-testid=layers]').catch(() => {});
  await pg.waitForTimeout(600);
  await shot(pg, 'readyplaces-1b-layers-panel');
  const row = await pg.locator('[data-testid=layer-status-places]').innerText().catch(() => '');
  check(/^Shows places within 100[ \u00a0]m\./.test(row), `RQ17: once read, the ready map's Places row says its range in words, no count (${JSON.stringify(row)})`);
  await pg.click('[data-testid=layers]').catch(() => {});
  // RQ4: Places off takes them away; on brings them back. Found by its names: the Layers button, the Places switch (RQ1).
  await switchLayer(pg, 'places', false);
  await pg.waitForTimeout(1200);
  const off = (await pins()).length;
  await switchLayer(pg, 'places', true);
  const back = (await until(async () => ((await pins()).length ? pins() : null), 15000)) ?? [];
  check(off === 0 && back.length > 0, `RQ4: with Places off the ready map draws no "?"; on again, they are back (${off}, ${back.length})`);

  // RQ3: the range moves the "?" with it: at 200 m the artwork comes in, unnamed.
  await drawerTo(pg, 'half');
  await pg.waitForSelector('[data-testid=range-plus]');
  for (let k = 0; k < 5; k++) {
    await pg.click('[data-testid=range-plus]');
    await pg.waitForTimeout(200);
  }
  const wide = (await until(async () => ((await pins()).some((l) => /^A place to find/.test(l)) ? pins() : null), 8000)) ?? (await pins());
  await shot(pg, 'readyplaces-2-range-200');
  // RQ10: with the bar up, the capture stack and Locate are still what a finger meets.
  const topmost = async (sel) => pg.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  }, sel);
  // RQ10: with the bar up, the "?" stay under it: at the settings' middle, the topmost element is never a pin.
  const underBar = await pg.evaluate(() => {
    const el = document.querySelector('[data-testid=start-settings]');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(r.height / 2, 60));
    return !!hit && !hit.closest('[data-testid=mark-pin]');
  });
  check(wide.some((l) => /^A place to find/.test(l)) && wide.some((l) => /^Hessian Memorial/.test(l)) && underBar,
    `RQ3, RQ10: at 200 m the farther place is drawn too, unnamed; with the bar up the pins stay under it (${JSON.stringify(wide)}, ${underBar})`);
  // ready-map-places audit 4: with the bar up, a tap on a "?" opens no card (it would open under the bar, unseen).
  await pg.locator('[data-testid=mark-pin]').first().dispatchEvent('click').catch(() => {});
  await pg.waitForTimeout(600);
  check((await pg.locator('[data-testid=ready-place-card]').count()) === 0, 'ready-map-places audit 4: with the bar up, a "?" opens no card');
  await pg.click('[data-testid=ready-place-close]').catch(() => {});
  await drawerTo(pg, 'peek');
  await pg.waitForTimeout(500);
  // RQ10: with the bar down and the pins drawn, the capture stack and Locate are still what a finger meets.
  const stackClear = (await topmost('[data-testid=moment-photo]')) && (await topmost('[data-testid=moment-voice]')) && (await topmost('[data-testid=moment-note]')) && (await topmost('[data-testid=locate]'));
  check(stackClear && (await pins()).length > 0, `RQ10: with the "?" drawn, every capture button and Locate is still on top (${stackClear})`);

  // RQ6, RQ12, RQ15: a tap on the memorial opens its card in the walk's card place: name and kind, distance, Set as
  // destination and Open in Maps, no capture row; the stack and Locate stay one tap.
  await pg.locator('[data-testid=mark-pin][aria-label^="Hessian Memorial"]').first().click().catch(() => {});
  await pg.waitForSelector('[data-testid=ready-place-card]', { timeout: 5000 }).catch(() => {});
  await pg.waitForTimeout(500);
  await shot(pg, 'readyplaces-3-card-named');
  const card = pg.locator('[data-testid=ready-place-card]');
  const cardText = await card.innerText().catch(() => '');
  // A dialog by role and name, never aria-modal: the capture stack beside it stays reachable (RQ15).
  const dialog = [await card.getAttribute('role').catch(() => null), await card.getAttribute('aria-modal').catch(() => null)].join(',');
  const cardOk = /Hessian Memorial/.test(cardText) && /\bm away\./.test(cardText.replace(/\u00a0/g, ' ')) && (await pg.locator('[data-testid=ready-place-dest]').count()) === 1
    && /Set as destination/.test(await pg.locator('[data-testid=ready-place-dest]').innerText().catch(() => '')) && (await card.locator('[data-testid=ready-place-maps]').count()) === 1
    && (await pg.locator('[data-testid=mark-camera]').count()) === 0;
  // The id beside its call, so `check:test-first` reads it (it looks one line back; the todo at 48e039b sat three lines down).
  check(cardOk, `RQ6: a tap opens the place's card: its name, how far, Set as destination, Open in Maps, no capture row (${JSON.stringify(cardText)})`);
  check(dialog === 'dialog,', `RQ12: the card is announced as a dialog, the stack beside it still reachable (${dialog})`);
  // ready-map-places ui 1: the close X sits in the title's row, and the two actions are stacked, each the card's width and
  // at least 44 px tall, never side by side or wrapped.
  {
    const box = async (sel) => pg.locator(sel).first().boundingBox().catch(() => null);
    const [c, x, d, m] = [await box('[data-testid=ready-place-card]'), await box('[data-testid=ready-place-close]'), await box('[data-testid=ready-place-dest]'), await box('[data-testid=ready-place-maps]')];
    const ok = !!c && !!x && !!d && !!m && x.y < c.y + 24 && x.x + x.width > c.x + c.width - 24 && m.y >= d.y + d.height
      && Math.abs(d.width - m.width) < 2 && d.width > c.width - 40 && d.height >= 44 && m.height >= 44;
    check(ok, `ready-map-places ui 1: the card's X is top right and its two actions are stacked, full width, 44 px or more (${JSON.stringify({ c, x, d, m })})`);
  }
  const clear = (await topmost('[data-testid=moment-photo]')) && (await topmost('[data-testid=moment-voice]')) && (await topmost('[data-testid=moment-note]')) && (await topmost('[data-testid=locate]'));
  check(clear, 'RQ15: with the ready card open, every capture button and Locate is still what a finger meets');
  // ready-map-places audit 6: one accent on the screen: Start's; Set as destination is not filled with it (OM8).
  const fills = await pg.evaluate(() => ['ready-place-dest', 'start'].map((id) => getComputedStyle(document.querySelector(`[data-testid=${id}]`)).backgroundColor));
  check(fills[0] !== fills[1], `ready-map-places audit 6: with the card open, Start is the one accent (${JSON.stringify(fills)})`);
  // ready-map-places audit 5: a tap on the bare map closes the card, as it closes the Layers panel.
  await pg.mouse.click(60, 250);
  await pg.waitForTimeout(500);
  check((await pg.locator('[data-testid=ready-place-card]').count()) === 0, 'ready-map-places audit 5: a tap on the map closes the ready card');
  await pg.click('[data-testid=ready-place-close]').catch(() => {});
  await pg.waitForTimeout(400);

  // RQ16: past the grid's east end, Fox Point Museum's card says it may not be reachable. Locate there moves the ready map.
  {
    const P2 = at(4.35, 1.65);
    await c.setGeolocation({ longitude: P2[0], latitude: P2[1], accuracy: 6 });
    await pg.click('[data-testid=locate]').catch(() => {});
    await until(async () => (await pins()).some((l) => /Fox Point Museum/.test(l)), 15000);
    await pg.locator('[data-testid=mark-pin][aria-label^="Fox Point Museum"]').first().click().catch(() => {});
    await pg.waitForSelector('[data-testid=mark-reach]', { timeout: 5000 }).catch(() => {});
    const said = await pg.locator('[data-testid=ready-place-card] [data-testid=mark-reach]').innerText().catch(() => '');
    await shot(pg, 'readyplaces-4-card-reach');
    check(!!said, `RQ16: the ready card says when a place may not be reachable (${JSON.stringify(said)})`);
    await pg.click('[data-testid=ready-place-close]').catch(() => {});
    await c.setGeolocation({ longitude: P1[0], latitude: P1[1], accuracy: 6 });
    await pg.click('[data-testid=locate]').catch(() => {});
    await pg.waitForTimeout(1500);
  }

  // RQ13: a found place's ready card lists "Moments here". The find is seeded (a walk's find of the memorial), then the page reloaded.
  {
    const seeded = await pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['checklist_item', 'find'], 'readwrite');
        const g = tx.objectStore('checklist_item').getAll();
        g.onsuccess = () => {
          const it = g.result.find((x) => x.name === 'Hessian Memorial');
          if (it) tx.objectStore('find').put({ ...it, walk_id: 'seed-walk', capture_id: 'seed-capture', found_at: Date.now() - 86400000 });
          tx.oncomplete = () => resolve(!!it);
        };
      };
    }));
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await until(async () => (await pins()).some((l) => /Hessian Memorial/.test(l)), 30000);
    await pg.locator('[data-testid=mark-pin][aria-label*="Hessian Memorial"]').first().click().catch(() => {});
    await pg.waitForSelector('[data-testid=mark-moments]', { timeout: 5000 }).catch(() => {});
    const head = await pg.locator('[data-testid=ready-place-card] [data-testid=mark-moments]').innerText().catch(() => '');
    await shot(pg, 'readyplaces-5-card-found');
    check(seeded && /Moments here/.test(head) && !/\d+ moments?/.test(head), `RQ13: a found place's ready card lists Moments here, never counted (${JSON.stringify(head)})`);
    await pg.click('[data-testid=ready-place-close]').catch(() => {});
    await pg.waitForTimeout(400);
  }

  // RQ7, RQ14: Set as destination on the unnamed "?" sets the place itself: the bar says "A place to find", and Start
  // walks there.
  await drawerTo(pg, 'half');
  for (let k = 0; k < 5; k++) await pg.click('[data-testid=range-plus]').catch(() => {});
  await drawerTo(pg, 'peek');
  await until(async () => (await pins()).some((l) => /^A place to find/.test(l)), 10000);
  await pg.locator('[data-testid=mark-pin][aria-label^="A place to find"]').first().click().catch(() => {});
  await pg.waitForSelector('[data-testid=ready-place-card]', { timeout: 5000 }).catch(() => {});
  const unnamed = await pg.locator('[data-testid=ready-place-card]').innerText().catch(() => '');
  check(/A place to find/.test(unnamed) && (await pg.locator('[data-testid=ready-place-maps]').count()) === 0, 'ready-map-places audit 11: an unnamed "?" card offers no Open in Maps');
  await pg.click('[data-testid=ready-place-dest]').catch(() => {});
  await pg.waitForTimeout(600);
  const destLine = await pg.locator('[data-testid=ready-dest]').innerText().catch(() => '');
  await shot(pg, 'readyplaces-6-destination');
  check(/^To a place to find · /.test(destLine), `ready-map-places audit 10: the ready bar reads "To a place to find" (${JSON.stringify(destLine)})`);
  check(/A place to find/.test(unnamed) && /^To a place to find/i.test(destLine) && (await pg.locator('[data-testid=ready-place-card]').count()) === 0,
    `RQ7, RQ14: Set as destination closes the card and sets the place as the destination, unnamed as it is (${JSON.stringify(destLine)})`);

  // RQ9, RQ18: on the walk to it, every layer is off, and only that one place is drawn; its card has the capture row.
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await pg.waitForTimeout(3000);
  const onWalk = (await until(async () => ((await pins()).length ? pins() : null), 15000)) ?? [];
  const placesSwitch = await (async () => {
    await pg.click('[data-testid=layers]').catch(() => {});
    const v = await pg.locator('[data-testid=layer-places]').getAttribute('aria-checked').catch(() => null);
    await pg.click('[data-testid=layers]').catch(() => {});
    return v;
  })();
  await shot(pg, 'readyplaces-7-walk-to-place');
  check(placesSwitch === 'false' && onWalk.length === 1 && /^A place to find/.test(onWalk[0]),
    `RQ9, RQ18: the walk starts with Places off, and draws only the place it walks to (${placesSwitch}, ${JSON.stringify(onWalk)})`);
  await pg.locator('[data-testid=mark-pin]').first().click().catch(() => {});
  await pg.waitForSelector('[data-testid=mark-card]', { timeout: 5000 }).catch(() => {});
  check((await pg.locator('[data-testid=mark-card] [data-testid=mark-camera]').count()) === 1, 'RQ18: the walked-to place\'s card has its capture row with Places off');
  await pg.click('[data-testid=mark-close]').catch(() => {});
  // RQ14: within 60 m it is named on the way's bar.
  // At walking pace (about 5 m a second): faster reads as a ride, on which nothing is named (R12). It stops 42 m short of
  // the artwork, within 60 m but before arriving, which ends the way and its bar.
  for (let k = 1; k <= 14; k++) {
    const p = at(0.3 + (0.5 * k) / 14, -0.2 + (0.5 * k) / 14);
    await c.setGeolocation({ longitude: p[0], latitude: p[1], accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  await pg.waitForTimeout(1500);
  const navText = await pg.locator('[data-testid=nav-bar]').innerText().catch(() => '');
  check(/Public art/.test(navText), `RQ14: the walk to it names it once within 60 m (${JSON.stringify(navText)})`);
  // ready-map-places audit 3: a photo kept from the walked-to place's card, Places still off, finds it, and that is said.
  await pg.locator('[data-testid=mark-pin]').first().click().catch(() => {});
  await pg.waitForSelector('[data-testid=mark-camera]', { timeout: 5000 }).catch(() => {});
  const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), pg.click('[data-testid=mark-camera]').catch(() => {})]);
  if (chooser) await chooser.setFiles(path.join(scriptsDir, 'fixtures', 'photo.jpg'));
  await pg.waitForSelector('[data-testid=media-editor]', { timeout: 30000 }).catch(() => {});
  await pg.click('[data-testid=edit-close]').catch(() => {});
  const said = await pg.waitForSelector('text=/^Found: Public art/', { timeout: 10000 }).then(() => true, () => false);
  check(said, 'ready-map-places audit 3: a find of the walked-to place with Places off says "Found:"');
  // ready-map-places audit 9: after the walk, the found place's ready card lists that photo in words, and it opens.
  await toStop(pg).catch(() => {});
  {
    const b = await pg.locator('[data-testid=stop]').boundingBox().catch(() => null);
    if (b) {
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      await pg.waitForURL(/replay/, { timeout: 30000 }).catch(() => {});
    }
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    // The artwork the photo found (the memorial was found earlier by the seeded find, RQ13).
    await until(async () => (await pins()).some((l) => /^Found.*Public art/.test(l)), 30000);
    await pg.locator('[data-testid=mark-pin][aria-label^="Found"][aria-label*="Public art"]').first().click().catch(() => {});
    await pg.waitForSelector('[data-testid=mark-moment]', { timeout: 8000 }).catch(() => {});
    const line = await pg.locator('[data-testid=ready-place-card] [data-testid=mark-moment]').first().innerText().catch(() => '');
    await shot(pg, 'readyplaces-8-card-found-moment');
    await pg.locator('[data-testid=ready-place-card] [data-testid=mark-moment]').first().click().catch(() => {});
    const opened = await pg.waitForSelector('[data-testid=capture-viewer]', { timeout: 8000 }).then(() => true, () => false);
    check(/photo/i.test(line) && opened, `ready-map-places audit 9: the found place's ready card lists the moment that found it, in words, and it opens (${JSON.stringify(line)}, ${opened})`);
  }
  await c.close();
}

module.exports = {
  name: 'readyplaces',
  covers: [
    'src/components/walk/useReady.tsx',
    'src/components/walk/ReadyPlaceCard.tsx',
    'src/lib/explore/useExplore.ts',
    'src/lib/explore/explore.ts',
    'src/lib/layers/notes.ts',
    'src/app/walk.tsx',
  ],
  run,
};
