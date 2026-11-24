// Media editing (ME1-ME23): the editor opening by itself after a capture (decision 0240), every tool on a photo and a
// video, what is stored, what the viewer shows, and what Download saves. E2E_ONLY=edit runs it alone.

const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

async function run(h) {
  const { navUrl, BASE, page, start, at, check, shot, freshPage, scriptsDir, toStop } = h;
    const { c, pg } = await freshPage('edit');
    const fixtures = path.join(scriptsDir, 'fixtures');
    const step = async (name, fn) => {
      try {
        await fn();
      } catch (e) {
        const lines = String(e.message).split('\n');
        const why = lines.filter((l) => /Timeout|waiting for|locator/.test(l)).slice(0, 3).join(' | ') || lines.slice(0, 2).join(' | ');
        check(false, `step ${name}: ${why}`);
      }
    };
    const rowOf = (kind) => pg.evaluate((k) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
        g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).filter((x) => x.kind === k).sort((a, b) => b.t - a.t)[0] ?? null);
      };
    }), kind);
    const thumbSize = (ref) => pg.evaluate((ref) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const db = req.result;
        const stores = [...db.objectStoreNames].filter((n) => /media/.test(n));
        const m = db.transaction(stores[0], 'readonly').objectStore(stores[0]).get(ref);
        m.onsuccess = async () => {
          const blob = m.result instanceof Blob ? m.result : m.result?.blob;
          if (!blob) return resolve(null);
          const bmp = await createImageBitmap(blob);
          resolve({ w: bmp.width, h: bmp.height });
        };
        m.onerror = () => resolve(null);
      };
    }), ref);
    const photos = () => pg.locator('[data-testid=edited-photo]').count();
    const stage = () => pg.locator('[data-testid=edit-stage]').getAttribute('data-edit').then((v) => (v ? JSON.parse(v) : null));
    // A tool tab is selected; a choice among several (pens, colours, filters) is a checked radio.
    const selected = (id) => pg.locator(`[data-testid=${id}]`).evaluate((el) => el.getAttribute('aria-checked') ?? el.getAttribute('aria-selected'));
    // A mouse drag across a fraction of an element's box.
    const drag = async (sel, from, to, steps = 12) => {
      const b = await pg.locator(sel).boundingBox();
      await pg.mouse.move(b.x + b.width * from[0], b.y + b.height * from[1]);
      await pg.mouse.down();
      await pg.mouse.move(b.x + b.width * to[0], b.y + b.height * to[1], { steps });
      await pg.mouse.up();
      await pg.waitForTimeout(200);
    };
    const download = async (timeout) => {
      const d = await Promise.all([pg.waitForEvent('download', { timeout }), pg.click('[data-testid=viewer-save]')]).then(([d]) => d, () => null);
      if (!d) return null;
      const file = await d.path();
      return { name: d.suggestedFilename(), b64: fs.readFileSync(file).toString('base64') };
    };

    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.waitForTimeout(1500);

    // ME23 on Navigate, ready (decision 0240, fix edit-after-capture): once the photo is accepted, its editor opens by
    // itself on Crop, as its own Modal, with no Edit pill to tap first.
    await step('ME23 moment', async () => {
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
      await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
      // Once kept: from the camera's return the shot is held in the editor with its controls hidden (tend captures T62).
      const opened = await pg.waitForSelector('[data-testid=media-editor][data-held=false]', { timeout: 15000 }).then(() => true, () => false);
      check(opened, 'ME23 fix edit-after-capture: a moment\'s photo opens its editor by itself once accepted (Navigate, ready)');
      await pg.waitForTimeout(800);
      await shot(pg, 'edit-after-capture-ready');
      // fix edit-after-capture audit 1: the editor says the photo is kept, where the disabled Revert sat, and ✕ says it stays.
      const keptLine = await pg.locator('[data-testid=edit-kept]').innerText().catch(() => '');
      const closeName = await pg.locator('[data-testid=edit-close]').getAttribute('aria-label').catch(() => '');
      const revertAtOpen = await pg.locator('[data-testid=edit-revert]').count();
      check(keptLine === 'Photo kept' && closeName === 'Close, the photo stays as it is' && revertAtOpen === 0,
        `fix edit-after-capture audit 1: the editor after a capture says "Photo kept" and its ✕ "Close, the photo stays as it is" (${JSON.stringify({ keptLine, closeName, revertAtOpen })})`);
      check((await selected('edit-tool-crop')) === 'true', 'ME23: the editor opens on Crop (Navigate, ready)');
      await pg.click('[data-testid=edit-close]');
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 });
      check(true, 'ME2: Close with no change closes at once, the photo kept as taken');
      check((await pg.locator('[data-testid=capture-offer], [data-testid=capture-edit]').count()) === 0, 'ME23 fix edit-after-capture: no Edit pill is left after the editor closes');
      // media-editing audit 2: a moment edited as it is taken shows the edit on its own pin's viewer, and opens on it.
      const [ch2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
      await ch2.setFiles(path.join(fixtures, 'photo.jpg'));
      await pg.waitForSelector('[data-testid=media-editor][data-held=false]', { timeout: 15000 });
      await pg.click('[data-testid=edit-rotate]');
      // audit 1: after the first edit Revert takes the kept line's place.
      const swapped = (await pg.locator('[data-testid=edit-kept]').count()) === 0 && (await pg.locator('[data-testid=edit-revert]').count()) === 1;
      check(swapped, 'fix edit-after-capture audit 1: after the first edit Revert takes the kept line\'s place');
      await pg.click('[data-testid=edit-done]');
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 15000 });
      const momentPin = pg.locator('.maplibregl-map button[data-ids*=","]:not([data-testid=memory-pin]), .maplibregl-map [aria-label^="Photo, "][aria-label$=". Open"]');
      await momentPin.first().waitFor({ timeout: 20000 });
      await momentPin.first().click();
      // The pin may hold both moments: step through them all.
      const shownEdits = [];
      for (let k = 0; k < 4; k++) {
        await pg.waitForSelector('[data-testid=edited-photo]', { timeout: 10000 });
        await pg.waitForTimeout(600);
        shownEdits.push(await pg.locator('[data-testid=edited-photo]').first().getAttribute('data-edit'));
        const next = pg.locator('[aria-label="Next moment"]:not([aria-disabled=true]) >> visible=true');
        if (!(await next.count())) break;
        await next.first().click();
      }
      check(shownEdits.some((e) => e && JSON.parse(e).rotate === 90), `media-editing audit 2: a moment edited as it was taken shows its edit on its pin's viewer (${JSON.stringify(shownEdits)})`);
      await pg.locator('[data-testid=viewer-close] >> visible=true').first().click();
      await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 5000 }).catch(() => {});
      await shot(pg, 'edit-after-moment');
    });

    // A walk, for the walk screen's editor after a capture and the viewer on its pins.
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    // A fresh fix for the walk's watch, as the qol journey does after Start.
    await c.setGeolocation({ longitude: start[0], latitude: start[1] + 0.000002, accuracy: 6 });
    await pg.waitForSelector('[data-testid=walker-puck]', { timeout: 15000 }).catch(() => {});
    await pg.waitForTimeout(1500);

    let photoId = null;
    await step('ME1-ME13 photo', async () => {
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=cap-photo]')]);
      await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
      const opened = await pg.waitForSelector('[data-testid=media-editor][data-held=false]', { timeout: 15000 }).then(() => true, () => false);
      check(opened, 'ME23 fix edit-after-capture: the walk screen opens the photo\'s editor by itself once accepted');
      photoId = (await rowOf('photo'))?.id;
      // The pin's small copy before the edit (media-editing audit 3).
      const pinThumb = pg.locator('.maplibregl-map [aria-label^="Photo, "][aria-label$=". Open"] [data-testid=pin-thumb]');
      // Under the editor: the copy is made about a second after the photo is kept.
      await pinThumb.first().waitFor({ state: 'attached', timeout: 3500 }).catch(() => {});
      const thumbSrc = async () => ((await pinThumb.count())
        ? pinThumb.first().evaluate((el) => (el.tagName === 'IMG' ? el.src : el.querySelector('img')?.src ?? getComputedStyle(el).backgroundImage), null, { timeout: 1000 }).catch(() => null)
        : null);
      const srcBefore = await thumbSrc();
      const tools = await pg.locator('[data-testid^=edit-tool-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').slice(10)));
      check(tools.join(',') === 'crop,filter,draw,text', `ME1: a photo's tools are Crop, Filter, Draw, Text (${tools})`);
      // ME5: Rotate turns 90 clockwise. ME6: Square crops square.
      await pg.click('[data-testid=edit-rotate]');
      check((await stage()).rotate === 90, 'ME5: Rotate turns the picture 90° clockwise');
      await pg.click('[data-testid=edit-aspect-square]');
      const cropped = await stage();
      // photo.jpg is 800x600; turned it is 600x800; a square there is 600x600, so 0.75 of the original's width each way.
      check(cropped.crop && Math.abs(cropped.crop.w - 0.75) < 0.01 && Math.abs(cropped.crop.h - 1) < 0.01, `ME6, ME7: Square crops the turned picture square, kept against the original (${JSON.stringify(cropped.crop)})`);
      const frameBefore = await pg.locator('[data-testid=crop-frame]').boundingBox();
      await drag('[data-testid=crop-br]', [0.5, 0.5], [-1.5, -1.5], 6);
      const frameAfter = await pg.locator('[data-testid=crop-frame]').boundingBox();
      check(frameAfter.width < frameBefore.width && Math.abs(frameAfter.width - frameAfter.height) < 3, `ME6: a corner drag resizes the frame and keeps Square (${Math.round(frameBefore.width)} → ${Math.round(frameAfter.width)}×${Math.round(frameAfter.height)})`);
      await pg.click('[data-testid=edit-crop-reset]');
      check((await stage()).crop === null && (await selected('edit-aspect-free')) === 'true', 'media-editing audit 1: Reset after a crop leaves no crop');
      await pg.click('[data-testid=edit-aspect-square]');
      // ME8: the nine presets; Mono applies at once.
      await pg.click('[data-testid=edit-tool-filter]');
      const presets = await pg.locator('[data-testid^=edit-filter-]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
      check(presets.join(',') === 'Original,Vivid,Warm,Cool,Dramatic,Fade,Mono,Noir,Sepia', `ME8: the filter row holds the nine presets (${presets})`);
      await pg.click('[data-testid=edit-filter-mono]');
      check((await stage()).filter === 'mono' && (await selected('edit-filter-mono')) === 'true', 'ME8: a tap applies Mono and marks it selected');
      const monoRole = await pg.locator('[data-testid=edit-filter-mono]').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-checked')].join(':'));
      check(monoRole === 'radio:true', `media-editing audit 11: the chosen filter is a checked radio, so the web says so (${monoRole})`);
      // ME10: Markup's pen: Black first; Red, a line; the marker, a line; Undo, Redo; the eraser.
      await pg.click('[data-testid=edit-tool-draw]');
      check((await selected('edit-pen-pen')) === 'true' && (await selected('edit-color-black')) === 'true', 'ME10: Draw starts on the Pen in Black');
      const colors = await pg.locator('[data-testid^=edit-color-]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
      check(colors.join(',') === 'Black,White,Blue,Green,Yellow,Red', `ME10: Markup's swatches (${colors})`);
      await pg.click('[data-testid=edit-pen-pen]');
      check((await pg.locator('[data-testid^=edit-size-]').count()) === 3, 'ME10: tapping the selected Pen again offers three thicknesses');
      await pg.click('[data-testid=edit-size-2]');
      await pg.click('[data-testid=edit-color-red]');
      await drag('[data-testid=draw-layer]', [0.2, 0.15], [0.8, 0.2]);
      await pg.click('[data-testid=edit-pen-marker]');
      await drag('[data-testid=draw-layer]', [0.2, 0.3], [0.8, 0.3]);
      let strokes = (await stage()).strokes;
      check(strokes.length === 2 && strokes[0].tool === 'pen' && strokes[0].color === 'red' && strokes[1].tool === 'marker',
        `ME10: a drag draws a line in the chosen tool and colour (${strokes.map((x) => `${x.tool}/${x.color}`)})`);
      await pg.click('[data-testid=edit-undo]');
      const afterUndo = (await stage()).strokes.length;
      await pg.click('[data-testid=edit-redo]');
      check(afterUndo === 1 && (await stage()).strokes.length === 2, `ME10: Undo and Redo step through the lines (${afterUndo} after Undo)`);
      await pg.click('[data-testid=edit-pen-eraser]');
      await drag('[data-testid=draw-layer]', [0.5, 0.25], [0.5, 0.35], 4);
      strokes = (await stage()).strokes;
      check(strokes.length === 1 && strokes[0].tool === 'pen', `ME10: the eraser removes the whole line it touches (${strokes.map((x) => x.tool)})`);
      // ME13: Text goes straight to typing.
      await pg.click('[data-testid=edit-tool-text]');
      await pg.fill('[data-testid=caption-input]', 'Corner shop');
      {
        const ta = await pg.evaluate(() => ({ root: getComputedStyle(document.getElementById('root')).touchAction, input: parseFloat(getComputedStyle(document.querySelector('[data-testid=caption-input]')).fontSize) }));
        check(ta.root === 'manipulation' && ta.input >= 16, `fix editor-zoom audit 3: double-tap zoom is off and the caption field types at ${ta.input} px (>= 16)`);
      }
      await pg.locator('[data-testid=caption-input]').blur();
      await shot(pg, 'edit-photo');
      // ME22: every control has a name.
      const unnamed = await pg.locator('[data-testid=media-editor] [role=button]:not([aria-label]), [data-testid=media-editor] [role=tab]:not([aria-label])').count();
      check(unnamed === 0, `ME22: every editor control has a label (${unnamed} without)`);
      await pg.click('[data-testid=edit-done]');
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 15000 });
      const row = await rowOf('photo');
      const e = row?.edit;
      check(e && e.rotate === 90 && e.filter === 'mono' && e.strokes.length === 1 && e.crop && row.caption === 'Corner shop',
        `ME2, ME21: Done stores every change at once (${JSON.stringify({ rotate: e?.rotate, filter: e?.filter, lines: e?.strokes?.length, crop: !!e?.crop, caption: row?.caption })})`);
      // ME20: the small copy is remade from the edited photo: square now.
      let t = row?.thumb_path ? await thumbSize(row.thumb_path) : null;
      for (let i = 0; i < 20 && !(t && t.w === t.h); i++) {
        await pg.waitForTimeout(250);
        const r2 = await rowOf('photo');
        t = r2?.thumb_path ? await thumbSize(r2.thumb_path) : null;
      }
      check(t && t.w === t.h && t.w <= 240, `ME20: the small copy shows the edit (square: ${JSON.stringify(t)})`);
      let srcAfter = await thumbSrc();
      for (let i = 0; i < 20 && srcAfter === srcBefore; i++) {
        await pg.waitForTimeout(250);
        srcAfter = await thumbSrc();
      }
      await shot(pg, 'edit-after-done');
      const labels = await pg.locator('.maplibregl-map [aria-label$=". Open"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
      check(srcBefore && srcAfter && srcAfter !== srcBefore, `media-editing audit 3: after Done the open pin's picture is the edited copy (${String(srcBefore).slice(0, 40)} → ${String(srcAfter).slice(0, 40)}; pins ${JSON.stringify(labels)})`);
    });

    // A video on the same spot: the pin opens both.
    await step('ME1, ME12-ME15 video', async () => {
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=cap-photo]')]);
      await chooser.setFiles(path.join(fixtures, 'clip-4s.webm'));
      const opened = await pg.waitForSelector('[data-testid=media-editor][data-held=false]', { timeout: 15000 }).then(() => true, () => false);
      check(opened, 'ME23 fix edit-after-capture: the walk screen opens a video\'s editor by itself once accepted');
      // It opens as the camera closes now: measured after its fade, never mid-way (ME14's handles once read too early).
      await pg.waitForTimeout(800);
      const tools = await pg.locator('[data-testid^=edit-tool-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').slice(10)));
      check(tools.join(',') === 'crop,draw,text,trim', `ME1: a video's tools are Crop, Draw, Text, Trim (${tools})`);
      await pg.click('[data-testid=edit-tool-trim]');
      const before = await pg.locator('[data-testid=trim-label]').innerText();
      const track = await pg.locator('[data-testid=trim-end]').boundingBox();
      const startBox = await pg.locator('[data-testid=trim-start]').boundingBox();
      const width = track.x - startBox.x;
      await pg.mouse.move(track.x + track.width / 2, track.y + track.height / 2);
      await pg.mouse.down();
      await pg.mouse.move(track.x + track.width / 2 - width * 0.4, track.y + track.height / 2, { steps: 8 });
      await pg.mouse.up();
      const after = await pg.locator('[data-testid=trim-label]').innerText();
      check(before !== after && /^0:00 – 0:0[1-3]$/.test(after), `ME14: dragging the end handle changes the kept times ("${before}" → "${after}")`);
      await pg.click('[data-testid=edit-tool-draw]');
      await drag('[data-testid=draw-layer]', [0.2, 0.2], [0.8, 0.25]);
      await pg.click('[data-testid=edit-tool-text]');
      await pg.fill('[data-testid=caption-input]', 'Busker');
      await pg.locator('[data-testid=caption-input]').blur();
      await pg.click('[data-testid=edit-done]');
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 10000 });
      const v = await rowOf('video');
      check(v?.edit?.trim && v.edit.trim.start_ms === 0 && v.edit.trim.end_ms < 4000 && v.edit.trim.end_ms >= 1000 && v.edit.strokes.length === 1 && v.caption === 'Busker',
        `ME13, ME14, ME21: the video keeps its trim, line and text (${JSON.stringify({ trim: v?.edit?.trim, lines: v?.edit?.strokes?.length, caption: v?.caption })})`);
    });

    // ME4: the viewer shows the edits; ME3: the editor opens on them.
    await step('ME3, ME4, ME16 viewer', async () => {
      await pg.waitForTimeout(1500);
      const pin = pg.locator('.maplibregl-map button[data-ids*=","]:not([data-testid=memory-pin]), .maplibregl-map [aria-label^="Photo, "][aria-label$=". Open"]');
      await pin.first().click();
      await pg.waitForSelector('[data-testid=edited-photo]', { timeout: 10000 });
      await pg.waitForTimeout(1200);
      const size = await pg.locator('[data-testid=edited-photo]').getAttribute('data-size');
      const [w, h] = size.split('x').map(Number);
      check(Math.abs(w - h) <= 1 && (await pg.locator('[aria-label="Caption: Corner shop"]').count()) === 1, `ME4: the viewer shows the edited photo (square ${size}) and its caption`);
      // The photo viewer as a person sees it: the moment clear, Respond and Edit docked under it (decision 0114).
      await pg.waitForTimeout(800);
      await shot(pg, '45-photo-viewer');
      check(!(await pg.locator('[data-testid=viewer-remind]').isVisible().catch(() => false)) && (await pg.locator('[data-testid=viewer-more]').isVisible()), 'UC9: the photo viewer\'s top bar is Close and More');
      {
        const before = await pg.locator('[data-testid=edited-photo]').boundingBox();
        // The photo lets taps through to the viewer (pointerEvents none), so the tap goes to its place on screen.
        const tapPhoto = () => pg.mouse.click(before.x + before.width / 2, before.y + before.height / 2);
        await tapPhoto();
        await pg.waitForTimeout(500);
        const hidden = !(await pg.locator('[data-testid=viewer-toolbar]').isVisible().catch(() => false)) && !(await pg.locator('[data-testid=viewer-close]').isVisible().catch(() => false));
        const after = await pg.locator('[data-testid=edited-photo]').boundingBox();
        await shot(pg, '46-photo-bars-hidden');
        const still = before && after && Math.abs(after.y - before.y) < 2 && Math.abs(after.height - before.height) < 2;
        check(hidden && still, `UC7, ui-conformance audit 28: a tap hides the bars and the photo does not move (${JSON.stringify([before, after])})`);
        if (hidden) {
          await tapPhoto();
          await pg.waitForTimeout(500);
        }
        check(await pg.locator('[data-testid=viewer-toolbar]').isVisible().catch(() => false), 'UC7: another tap brings the bars back');
      }
      // UC9, ui-conformance audit 26: on the walk screen's viewer, Go here waits in More with Remind me here.
      await pg.click('[data-testid=viewer-more]');
      await pg.waitForTimeout(400);
      await shot(pg, '44-viewer-more-go');
      check(await pg.locator('[data-testid=viewer-menu] [data-testid=viewer-go]').isVisible().catch(() => false), 'ui-conformance audit 26: Go here is an item in More, not a button over the moment');
      {
        // The menu item draws its icon's glyph beside the words, so read the words, not the whole item.
        const goText = await pg.locator('[data-testid=viewer-menu] [data-testid=viewer-go]').innerText().catch(() => '');
        check(/Route here/.test(goText) && !/Go here/.test(goText), `OM13: the pin viewer's menu item says "Route here", not "Go here" (${JSON.stringify(goText)})`);
      }
      // A tap outside the menu closes it, as a menu does.
      await pg.mouse.click(20, 420);
      await pg.waitForSelector('[data-testid=viewer-menu]', { state: 'detached', timeout: 5000 });
      // OT27 as amended (ui-conformance audit 28, the owner's call): the photo is centred in the whole screen, still
      // whether the bars show or not, and the bars sit over its margins; no loose button sits over it.
      const photoBox = await pg.locator('[data-testid=edited-photo]').boundingBox();
      const vh = pg.viewportSize().height;
      check(photoBox && Math.abs(photoBox.y + photoBox.height / 2 - vh / 2) < 2, `owner-threads OT27: the photo is centred in the screen, the bars over its margins (${JSON.stringify(photoBox)})`);
      await pg.click('[data-testid=viewer-edit]');
      await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 });
      check((await stage()).filter === 'mono', 'ME3: the editor opens on the current edits');
      await pg.click('[data-testid=edit-tool-filter]');
      await pg.click('[data-testid=edit-filter-warm]');
      await pg.keyboard.press('Escape');
      const escAsked = await pg.waitForSelector('[data-testid=edit-discard]', { timeout: 3000 }).then(() => true, () => false);
      check(escAsked && (await pg.locator('[data-testid=media-editor]').count()) === 1, 'media-editing audit 5: Escape in the viewer\u2019s editor with changes asks first');
      if (escAsked) await pg.click('[data-testid=edit-keep]');
      await pg.click('[data-testid=edit-close]');
      const asked = await pg.waitForSelector('[data-testid=edit-discard]', { timeout: 3000 }).then(() => true, () => false);
      check(asked && (await pg.locator('text=Discard these edits?').count()) === 1, 'ME2: Close with changes asks "Discard these edits?"');
      await pg.click('[data-testid=edit-discard]');
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 });
      check((await rowOf('photo')).edit.filter === 'mono', 'ME2: Discard saves nothing');
      // Found building the slice: on the web, closing an editor drawn over the shown capture left a stale copy behind it.
      check((await photos()) === 1, `ME4: after the editor closes the capture shows once (${await photos()} copies)`);
      // ME16: Download is one JPEG with everything: square, grey where nothing is drawn.
      await pg.click('[data-testid=viewer-more]');
      const file = await download(20000);
      const img = file ? await pg.evaluate(async (b64) => {
        const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
        const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
        const cv = new OffscreenCanvas(bmp.width, bmp.height);
        const g = cv.getContext('2d');
        g.drawImage(bmp, 0, 0);
        const px = [...g.getImageData(Math.floor(bmp.width * 0.5), Math.floor(bmp.height * 0.9), 1, 1).data].slice(0, 3);
        return { w: bmp.width, h: bmp.height, px };
      }, file.b64) : null;
      check(img && Math.abs(img.w - img.h) <= 1 && Math.max(...img.px) - Math.min(...img.px) <= 4 && /\.jpg$/.test(file.name),
        `ME16: Download saves one JPEG with the crop and the filter (${file?.name}: ${JSON.stringify(img)})`);
    });

    await step('ME12, ME15, ME17, ME18 video in the viewer', async () => {
      // Two viewers' strips may be in the page (one beneath, hidden): the one in front.
      await pg.locator('[aria-label="Next moment"] >> visible=true').first().click({ timeout: 10000 });
      await pg.waitForSelector('[data-testid=edited-video]', { timeout: 10000 });
      await pg.waitForTimeout(1500);
      const v = await rowOf('video');
      const lines = await pg.locator('[data-testid=video-lines]').evaluate((el) => getComputedStyle(el).pointerEvents).catch(() => null);
      check(lines === 'none' && (await pg.locator('[aria-label="Caption: Busker"]').count()) === 1, `ME12, ME13: the video's line and text show and take no tap (pointer-events ${lines})`);
      // ME15: played, it stops at the trim's end.
      await pg.locator('[data-testid=edited-video] video').first().evaluate((el) => { el.muted = true; return el.play(); }).catch(() => {});
      await pg.waitForTimeout(v.edit.trim.end_ms + 1500);
      const at = await pg.locator('[data-testid=edited-video] video').first().evaluate((el) => ({ t: el.currentTime, paused: el.paused }));
      check(at.paused && Math.abs(at.t - v.edit.trim.end_ms / 1000) < 0.4, `ME15: a trimmed video stops at the kept part's end (${at.t.toFixed(2)} s, end ${(v.edit.trim.end_ms / 1000).toFixed(2)} s)`);
      // media-editing audit 6: Play from the end (the platform's own control) starts the kept part again.
      await pg.locator('[data-testid=edited-video] video').first().evaluate((el) => el.play()).catch(() => {});
      await pg.waitForTimeout(800);
      const again = await pg.locator('[data-testid=edited-video] video').first().evaluate((el) => ({ t: el.currentTime, paused: el.paused }));
      check(!again.paused && again.t < v.edit.trim.end_ms / 1000 - 0.3, `media-editing audit 6: Play after a trimmed end starts the kept part again (${again.t.toFixed(2)} s, ${again.paused ? 'paused' : 'playing'})`);
      await pg.locator('[data-testid=edited-video] video').first().evaluate((el) => el.pause());
      // ME17: Download re-records the kept part.
      await pg.click('[data-testid=viewer-more]');
      const saving = pg.waitForSelector('text=Saving…', { timeout: 3000 }).then(() => true, () => false);
      const file = await download(30000);
      check(await saving, 'ME18: the viewer says "Saving…" while the video is made');
      const meta = file ? await pg.evaluate(async ({ b64, name }) => {
        const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
        const el = document.createElement('video');
        el.muted = true;
        el.src = URL.createObjectURL(new Blob([bytes], { type: name.endsWith('.mp4') ? 'video/mp4' : 'video/webm' }));
        await new Promise((r) => { el.onloadedmetadata = r; el.onerror = r; });
        // MediaRecorder's WebM has no duration in its header: seek past the end to learn it.
        if (!Number.isFinite(el.duration)) {
          el.currentTime = 1e6;
          await new Promise((r) => { el.ondurationchange = r; setTimeout(r, 3000); });
        }
        return { d: el.duration, w: el.videoWidth, h: el.videoHeight };
      }, file) : null;
      check(meta && Math.abs(meta.d - v.edit.trim.end_ms / 1000) < 0.8 && /\.(webm|mp4)$/.test(file.name),
        `ME17: Download saves a video of the kept part (${file?.name}: ${JSON.stringify(meta)}, kept ${v.edit.trim.end_ms} ms)`);
      // media-editing audit 4: with sound refused (iOS: play() without a tap) and Web Audio never starting,
      // the export still ends: a silent copy, never "Saving…" for good.
      await pg.evaluate(() => {
        const P = HTMLMediaElement.prototype;
        window.__realPlay = P.play;
        P.play = function () { return this.muted ? window.__realPlay.call(this) : Promise.reject(new DOMException('no tap', 'NotAllowedError')); };
        window.__realResume = AudioContext.prototype.resume;
        AudioContext.prototype.resume = () => new Promise(() => {});
      });
      await pg.click('[data-testid=viewer-more]');
      const refused = await download(30000);
      await pg.evaluate(() => { HTMLMediaElement.prototype.play = window.__realPlay; AudioContext.prototype.resume = window.__realResume; });
      check(!!refused && /\.(webm|mp4)$/.test(refused.name), `media-editing audit 4: with play() refused the export still ends with a video (${refused?.name ?? 'none'})`);
      await pg.waitForTimeout(3500);
      // ME18: a failure says so, and nothing downloads.
      await pg.evaluate(() => { window.MediaRecorder = undefined; });
      await pg.click('[data-testid=viewer-more]');
      const saidP = pg.waitForSelector('text=The video could not be saved', { timeout: 6000 }).then(() => true, () => false);
      const none = await download(4000);
      const said = await saidP;
      check(!none && said, 'ME18: a video that cannot be made says "The video could not be saved" and downloads nothing');
      await pg.click('[data-testid=viewer-close]');
    });

    // ME23 on the recording bar: minimized, the bar's camera opens the editor by itself too (decision 0240).
    await step('ME23 recording bar', async () => {
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      // On Memories the band's camera takes the bar's place (decision 0112): the bar's own camera is on the other tabs.
      if (!(await pg.locator('[data-testid=bar-photo]').count())) await pg.click('[data-testid=tab-explore]');
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=bar-photo]')]);
      await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
      const opened = await pg.waitForSelector('[data-testid=media-editor][data-held=false]', { timeout: 15000 }).then(() => true, () => false);
      check(opened, 'ME23 fix edit-after-capture: the recording bar opens its photo\'s editor by itself once accepted');
      await pg.waitForTimeout(800);
      await shot(pg, 'edit-after-capture-bar');
      check((await selected('edit-tool-crop')) === 'true', 'ME23: the bar’s editor opens on Crop');
      await pg.click('[data-testid=edit-close]');
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 });
      check((await pg.locator('[data-testid=bar-edit-offer], [data-testid=capture-edit]').count()) === 0, 'ME23 fix edit-after-capture: no Edit pill above the bar after the editor closes');
    });

    // ME4: the replay's cards show the edits too (the edited photo's SVG picture, not the plain file).
    await step('ME4 replay', async () => {
      await pg.click('[data-testid=recording-return]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
      await pg.waitForTimeout(1000);
      await toStop(pg);
      const b = await pg.locator('[data-testid=stop]').boundingBox();
      await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await pg.mouse.down();
      await pg.waitForTimeout(1100);
      await pg.mouse.up();
      await pg.waitForURL(/replay/, { timeout: 30000 });
      const edited = await pg.waitForSelector('[data-testid=replay-card] svg image', { timeout: 45000 }).then(() => true, () => false);
      check(edited, 'ME4: the replay\u2019s card for an edited photo draws its edits');
      if (await pg.locator('[data-testid=skip]').count()) await pg.click('[data-testid=skip]').catch(() => {});
    });
    await c.close();
    await heldShot(h);
}

// tend captures T62 (the owner, Nov 24: "It'll jump straight back to the map for a little bit and then open up the
// editor… This happens on every moment capture. For camera or video."): from the camera's return the shot is held full
// screen and the editor's controls come over it once kept. Read frame by frame in the page, with the keep slowed in the
// journey only (the picked file's read held back), from the picker's files until Done can be clicked, then 500 ms on.
const SAMPLE = () => {
  const pts = [[0.5, 0.5], [0.1, 0.12], [0.9, 0.12], [0.1, 0.88], [0.9, 0.88]];
  const rect = (b) => ({ x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) });
  const opacity = (e) => { let o = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };
  const live = (e) => {
    if (!e) return false;
    const b = e.getBoundingClientRect();
    if (!b.width) return false;
    const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return !!hit && e.contains(hit) && opacity(e) > 0.5;
  };
  const t0 = performance.now();
  window.__t62 = { frames: [], on: true, t0, change: null };
  // The shutter as the page hears it: the picker's file input changing (tend captures audit 10 logs shutter to cover).
  // Once per page, read against the sampling under way (tend captures audit 10: a listener per capture kept the first
  // capture's clock, so later captures read a shutter from before their own start).
  if (!window.__t62Listens) {
    window.__t62Listens = true;
    document.addEventListener('change', (e) => {
      const w = window.__t62;
      if (w && w.on && w.change == null && e.target?.type === 'file') w.change = Math.round(performance.now() - w.t0);
    }, true);
  }
  const tick = () => {
    const w = window.__t62;
    if (!w.on) return;
    const hits = pts.map(([fx, fy]) => document.elementFromPoint(window.innerWidth * fx, window.innerHeight * fy));
    // The editor on screen: the one under the middle of the screen (a closed one's portal may linger, unseen), else the last.
    const eds = [...document.querySelectorAll('[data-testid=media-editor]')].filter((e) => e.getBoundingClientRect().width > 0);
    const ed = eds.find((e) => !!hits[0] && e.contains(hits[0])) ?? eds[eds.length - 1] ?? null;
    const st = ed?.querySelector('[data-testid=edit-stage]');
    // The picture on the stage: the held shot's box, or the stored picture's, whichever is drawn (they share one place).
    const pics = st ? [...st.children].filter((c) => c.querySelector('img, video, canvas, svg image')) : [];
    const pic = pics.length ? rect(pics[0].getBoundingClientRect()) : null;
    const done = ed?.querySelector('[data-testid=edit-done]');
    const close = ed?.querySelector('[data-testid=edit-close]');
    w.frames.push({
      t: Math.round(performance.now() - t0),
      ed: !!ed,
      held: ed?.getAttribute('data-held') ?? null,
      covered: !!ed && hits.every((x) => !!x && ed.contains(x)),
      map: hits.some((x) => !!x?.closest?.('.maplibregl-map')),
      op: ed ? Math.round(opacity(ed) * 100) / 100 : 0,
      pic,
      shot: !!ed?.querySelector('[data-testid=edit-shot]'),
      kept: !!ed && /\b(Photo|Video) kept\b/.test(ed.innerText),
      doneLive: live(done),
      closeLive: live(close),
      closeName: close?.getAttribute('aria-label') ?? null,
      // Drawn inside Memories' composer's Modal (beside the composer's sheet), not a Modal of its own (tend captures audit 17).
      composer: !!ed?.closest('[aria-modal=true]')?.querySelector('[data-testid=composer]'),
    });
    if (performance.now() - t0 < 20000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// The held shot read frame by frame (tend captures T62), for any surface that opens the editor after a capture: edit's
// own `heldShot`, and the other journeys' surfaces (tend captures audit 17: the ready screen's edge stack, Add to this
// moment, Memories' line and composer, the planner). `capture(button, file, label, slow, close)` picks the file with the
// keep held back `slow` ms, and reads it until the editor is up; `read` says what the frames show.
function heldKit(pg, { fixtures, shot, tag = 't62' }) {
  // The keep read held back once: the picked blob's fetch waits `ms` (in the journey only; the app is as it ships).
  const slowKeep = (ms) => pg.evaluate((d) => {
    if (!window.__fetchT62) window.__fetchT62 = window.fetch;
    window.__slowT62 = d;
    window.fetch = async (u, ...rest) => {
      if (window.__slowT62 && String(u?.url ?? u).startsWith('blob:')) {
        const wait = window.__slowT62;
        window.__slowT62 = 0;
        await new Promise((r) => setTimeout(r, wait));
      }
      return window.__fetchT62(u, ...rest);
    };
  }, ms);
  const closeEditor = async () => {
    await pg.click('[data-testid=edit-close]', { timeout: 8000 }).catch(() => {});
    await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
    await pg.waitForTimeout(600);
  };
  const stopSampling = () => pg.evaluate(() => { const w = window.__t62; if (w) w.on = false; return w ? w.frames : []; });
  // One capture read frame by frame: the shot held, its picture, then the editor once kept. Pictures of the first held
  // frame and of the editor once kept.
  const capture = async (button, file, label, slow = 2500, close = true) => {
    if (slow) await slowKeep(slow);
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click(button, { timeout: 10000 })]);
    await pg.evaluate(SAMPLE);
    await chooser.setFiles(typeof file === 'string' ? path.join(fixtures, file) : file);
    if (await pg.waitForSelector('[data-testid=media-editor][data-held=true] [data-testid=edit-shot]', { timeout: 4000 }).then(() => true, () => false)) await shot(pg, `${tag}-${label}-held`);
    // tend captures audit 12 (U2): while held, the editor's polite live region is in the page already, empty and read by
    // screen readers (no aria-hidden over it), so "Photo kept" is announced when it fills; stamped to find it again.
    const liveHeld = await pg.evaluate(() => {
      const ed = document.querySelector('[data-testid=media-editor][data-held=true]');
      const el = ed?.querySelector('[data-testid=edit-kept][aria-live=polite]') ?? null;
      if (el) el.dataset.stamp62 = 'held';
      return { held: !!ed, live: !!el, text: el?.textContent ?? null, hidden: !!el?.closest('[aria-hidden=true]') };
    }).catch(() => null);
    const up = await pg.waitForSelector('[data-testid=media-editor][data-held=false] [data-testid=edit-kept]', { timeout: 15000 }).then(() => true, () => false);
    const liveKept = await pg.evaluate(() => {
      const el = document.querySelector('[data-testid=media-editor][data-held=false] [data-testid=edit-kept]');
      return { live: el?.getAttribute('aria-live') ?? null, text: el?.textContent ?? null, same: el?.dataset.stamp62 === 'held', hidden: !!el?.closest('[aria-hidden=true]') };
    }).catch(() => null);
    await pg.waitForTimeout(700);
    await shot(pg, `${tag}-${label}-kept`);
    const frames = await stopSampling();
    const change = await pg.evaluate(() => window.__t62?.change ?? null);
    // Left open for a journey that goes on with the editor (tend captures audit 17).
    if (close) await closeEditor();
    return { up, frames, change, live: { held: liveHeld, kept: liveKept } };
  };
  // tend captures audit 12: the live region was there, empty and unhidden, while held, and the same node says it once kept.
  const spoken = (res, kind) => {
    const h = res.live?.held;
    const k = res.live?.kept;
    return !!h && h.held && h.live && h.text === '' && !h.hidden && !!k && k.live === 'polite' && k.text === `${kind === 'photo' ? 'Photo' : 'Video'} kept` && k.same && !k.hidden;
  };
  // What the frames say, from the first frame the editor's root shows to 500 ms after Done could first be pressed.
  // tend captures audit 10 (the orchestrator's ruling R3, finding A): react-native-web draws a new Modal's first frame
  // transparent (ModalAnimation's passive effect), so the span is read from the first opaque frame; only the mount frame
  // before it may be transparent, and the first opaque frame comes within 250 ms of the app's first sight of the picker's
  // answer (the editor's root in the page). Shutter (the file input's change) to cover is logged as data.
  // tend captures audit 11 (the owner's answer, 0263, "Say it stays"): the ✕ is named "Close, the photo stays as it is"
  // (or the video) from the start of the hold, as once kept.
  const read = ({ up, frames, change = null }, kind = 'photo') => {
    const first = frames.findIndex((f) => f.ed);
    const opaque = first < 0 ? -1 : frames.findIndex((f, i) => i >= first && f.ed && f.op === 1);
    const ready = frames.findIndex((f) => f.doneLive);
    const span = opaque < 0 || ready < 0 ? [] : frames.slice(opaque).filter((f) => f.t <= frames[ready].t + 500);
    const held = span.filter((f) => f.held === 'true');
    const picFrom = span.findIndex((f) => !!f.pic);
    const pics = picFrom < 0 ? [] : span.slice(picFrom);
    const p0 = pics[0]?.pic;
    const near = (a, b) => !!a && !!b && ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= 1);
    return {
      up,
      // From the files to the editor's first frame: the picker's read only, never the keep (held back 2.5 s).
      toCover: first < 0 ? null : frames[first].t,
      mountFrames: first < 0 || opaque < 0 ? null : opaque - first,
      toOpaque: first < 0 || opaque < 0 ? null : frames[opaque].t - frames[first].t,
      shutterToCover: change == null || opaque < 0 ? null : frames[opaque].t - change,
      toReady: ready < 0 ? null : frames[ready].t,
      frames: span.length,
      gone: span.filter((f) => !f.ed || !f.covered || f.map).length,
      firstOp: first < 0 ? null : frames[first].op,
      minOp: span.length ? Math.min(...span.map((f) => f.op)) : null,
      held: held.length,
      picWhileHeld: picFrom >= 0 && span[picFrom].held === 'true',
      moved: pics.filter((f) => !near(f.pic, p0)).length,
      blank: pics.filter((f) => !f.pic).length,
      pic: p0 ?? null,
      keptWhileHeld: held.filter((f) => f.kept).length,
      doneWhileHeld: held.filter((f) => f.doneLive).length,
      // The ✕ is read on the frames the editor is drawn opaque (a transparent one is the first check's to say).
      shownHeld: held.filter((f) => f.op === 1).length,
      closeWhileHeld: held.filter((f) => f.op === 1 && f.closeLive && f.closeName === `Close, the ${kind} stays as it is`).length,
      closeNames: [...new Set(span.map((f) => f.closeName))],
      keptAfter: span.some((f) => f.held === 'false' && f.kept),
      // tend captures audit 9: the camera's shot still on the stage on the last frame read (700 ms after the editor is up).
      shotAtEnd: frames.length ? frames[frames.length - 1].shot : null,
      composer: span.some((f) => f.composer),
    };
  };
  // tend captures audit 10: the mount's transparency is bounded by time, not by a count of sampled frames: headless
  // Chromium runs requestAnimationFrame more often than it paints (two samples in 14 ms on the first run), so
  // `mountFrames` is data; from the first opaque frame on, every frame is opaque, covered, no map.
  const whole = (r) => r.up && r.toCover != null && r.toCover < 1500 && r.toReady != null && r.toReady >= 2000 && r.frames > 10 && r.gone === 0
    && r.mountFrames != null && r.toOpaque != null && r.toOpaque <= 250 && r.minOp === 1;
  const steady = (r) => r.picWhileHeld && r.moved === 0 && r.blank === 0;
  const honest = (r) => r.held > 5 && r.keptWhileHeld === 0 && r.doneWhileHeld === 0 && r.shownHeld > 5 && r.closeWhileHeld === r.shownHeld && r.keptAfter;
  const say = (r) => JSON.stringify(r);
  return { slowKeep, closeEditor, stopSampling, capture, spoken, read, whole, steady, honest, say };
}

async function heldShot(h) {
  const { navUrl, BASE, start, check, shot, freshPage, scriptsDir } = h;
  // h.errors: the console errors the harness collects (tend captures audit 8 reads the ones a capture adds).
  const { c, pg } = await freshPage('edit-held');
  const fixtures = path.join(scriptsDir, 'fixtures');
  const SHOTS_TAG = 't62';
  const step = async (name, fn) => {
    try {
      await fn();
    } catch (e) {
      check(false, `step ${name}: ${String(e.message).split('\n').slice(0, 2).join(' | ')}`);
    }
  };
  const { slowKeep, closeEditor, stopSampling, capture, spoken, read, whole, steady, honest, say } = heldKit(pg, { fixtures, shot, tag: SHOTS_TAG });

  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await c.setGeolocation({ longitude: start[0], latitude: start[1] + 0.000002, accuracy: 6 });
  await pg.waitForSelector('[data-testid=walker-puck]', { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(1500);

  for (const [kind, file] of [['photo', 'photo.jpg'], ['video', 'clip-4s.webm']]) {
    await step(`T62 walk ${kind}`, async () => {
      const res = await capture('[data-testid=cap-photo]', file, `walk-${kind}-390`);
      const r = read(res, kind);
      check(spoken(res, kind), `tend captures audit 12: on the walk while the ${kind} is held its editor's polite live region is in the page, empty and not hidden, and the same node says "${kind === 'photo' ? 'Photo' : 'Video'} kept" once kept (${JSON.stringify(res.live)})`);
      check(whole(r), `tend captures T62: on the walk a ${kind} covers the map from the picker's return, opaque from the frame after its mount, until its editor is up, with the keep held back 2.5 s (${say(r)})`);
      check(steady(r), `tend captures T62: on the walk the ${kind}'s picture is there while it is held, and its box never moves until 500 ms after Done can be pressed (${say(r)})`);
      check(honest(r), `tend captures T62, audit 7, audit 11: on the walk while the ${kind} is held there is no "${kind === 'photo' ? 'Photo' : 'Video'} kept" and Done cannot be pressed, only ✕ named "Close, the ${kind} stays as it is"; once kept, the words and Done (${say(r)})`);
    });
  }
  // tend captures audit 10: a camera-sized photo (4032 x 3024 JPEG), made in the page from the 800 x 600 fixture (the loop
  // adds no file under scripts/ outside the journeys), handed to the picker as a file of its own.
  const cameraSized = async () => {
    const from = fs.readFileSync(path.join(fixtures, 'photo.jpg')).toString('base64');
    const b64 = await pg.evaluate(async (s) => {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${s}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 4032;
      c.height = 3024;
      c.getContext('2d').drawImage(img, 0, 0, 4032, 3024);
      const url = c.toDataURL('image/jpeg', 0.85);
      c.width = 0;
      c.height = 0;
      return url.split(',')[1];
    }, from);
    return { name: 'photo-4032.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') };
  };
  // tend captures audit 10: a camera-sized photo, the picker's read of it the slowest part of its return.
  await step('T62 walk photo camera-sized', async () => {
    const r = read(await capture('[data-testid=cap-photo]', await cameraSized(), 'walk-photo-4032-390'));
    check(whole(r) && steady(r), `tend captures audit 10: on the walk a 4032 x 3024 photo covers the map from its first opaque frame, only the mount frame before it, within 250 ms of the editor's first frame, and its box never moves (${say(r)})`);
  });
  await step('T62 walk photo 320', async () => {
    await pg.setViewportSize({ width: 320, height: 640 });
    await pg.waitForTimeout(900);
    const r = read(await capture('[data-testid=cap-photo]', 'photo.jpg', 'walk-photo-320'));
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForTimeout(900);
    check(whole(r), `tend captures T62: at 320 px on the walk the photo covers the map from the picker's return, opaque from the frame after its mount, until its editor is up (${say(r)})`);
    check(steady(r) && honest(r), `tend captures T62, audit 7: at 320 px on the walk the photo's box is still from while it is held, only ✕ shows until it is kept, then the editor's controls over it (${say(r)})`);
    // tend captures audit 9: an untouched photo's full-size shot goes once the stored copy is drawn, with no blank frame.
    check(r.shotAtEnd === false && r.blank === 0, `tend captures audit 9: at 320 px on the walk the camera's full-size photo leaves the stage once the stored one is drawn, and the picture never blinks (${say(r)})`);
  });

  // tend captures audit 8 (finding B): a video kept at full speed, the keep not held back. The keep revoked the picked blob
  // while the held shot's <video> was still to read it: "Failed to load resource: net::ERR_FILE_NOT_FOUND", and the stage
  // showed only the backdrop until the stored video was sized. Now the held shot owns the picked file until it leaves.
  await step('T62 walk video full speed', async () => {
    const errs0 = h.errors.length;
    const failed = [];
    const onFail = (q) => { if (q.url().startsWith('blob:')) failed.push(q.failure()?.errorText ?? 'failed'); };
    pg.on('requestfailed', onFail);
    const r = read(await capture('[data-testid=cap-photo]', 'clip-4s.webm', 'walk-video-fast-390', 0), 'video');
    await pg.waitForTimeout(1500);
    pg.off('requestfailed', onFail);
    const errs = h.errors.slice(errs0).filter((e) => /ERR_FILE_NOT_FOUND/.test(e));
    // A paused <video> cancels its own range loads (net::ERR_ABORTED, seen on the first run): not a failed read of the
    // file. A read of a revoked blob is ERR_FILE_NOT_FOUND (tend captures audit 8).
    const aborted = failed.filter((x) => /ERR_ABORTED/.test(x)).length;
    failed.splice(0, failed.length, ...failed.filter((x) => !/ERR_ABORTED/.test(x)));
    const fast = { up: r.up, held: r.held, picWhileHeld: r.picWhileHeld, blank: r.blank, gone: r.gone, moved: r.moved, pic: r.pic, toReady: r.toReady, errs, failed, aborted };
    // At full speed the hold can be a single frame, shorter than a video's first frame takes to decode: whether that frame
    // already has the picture is a race (true on one run, false on the next), so it is data; the shot's picture then
    // shows, never blank after, and the picked file is never read after it was let go.
    check(r.up && !!r.pic && r.blank === 0 && r.moved === 0 && !errs.length && !failed.length,
      `tend captures audit 8: on the walk a video kept at full speed shows its shot's picture, never blank after, and no read of the picked file fails (${JSON.stringify(fast)})`);
  });

  // tend captures T43 (decision 0233, the owner's "Keep it whole"): a 20 s web clip, past the 15 s the web once turned away,
  // goes the way of any video: held from the camera's return, kept whole with its length, then its editor, whose trim
  // runs the whole clip. Nothing says it was too long.
  await step('T43 walk long video', async () => {
    const res = await capture('[data-testid=cap-photo]', 'clip-20s.webm', 'walk-video-20s-390', 2500, false);
    const r = read(res, 'video');
    const notice = await pg.getByText(/Videos can be up to|That one was/).count();
    await pg.click('[data-testid=edit-tool-trim]').catch(() => {});
    await pg.waitForTimeout(400);
    const label = await pg.locator('[data-testid=trim-label]').innerText().catch(() => null);
    await closeEditor();
    // Its place may land a moment after the keep, from the next fix (`startLocating`): the mocked position stands still,
    // so a fix is sent again (a step of under a metre), as any capture here would need; then read for up to 6 s. The
    // T62 videos before it are stored with no place for the same reason (seen: one placed, one not).
    await c.setGeolocation({ longitude: start[0], latitude: start[1] + 0.000006, accuracy: 6 });
    const readRow = () => pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
        g.onsuccess = () => {
          const vs = g.result.flatMap((m) => m.pieces.map((p) => ({ ...p, lat: m.lat, lon: m.lon, t: m.t }))).filter((p) => p.kind === 'video').sort((a, b) => b.t - a.t);
          const v = vs[0];
          resolve(v ? { ms: Number(v.body), placed: v.lat != null && v.lon != null, t: v.t, othersPlaced: vs.slice(1).map((x) => x.lat != null) } : null);
        };
      };
    }));
    let row = await readRow();
    for (let i = 0; i < 12 && row && !row.placed; i++) {
      await pg.waitForTimeout(500);
      row = await readRow();
    }
    check(res.up && whole(r) && steady(r) && honest(r) && notice === 0,
      `tend captures T43: on the walk a 20 s web video is held from the camera's return and kept, then its editor, with no notice that it is too long (${JSON.stringify({ up: res.up, notice, r: say(r) })})`);
    check(!!row && row.ms >= 19000 && row.ms <= 21000 && row.placed && /^0:00 – 0:(19|20)$/.test(label ?? ''),
      `tend captures T43: the 20 s video is stored whole with its place and time, its trim the whole clip, its length said over the bar as any video's (${JSON.stringify({ row, label })})`);
  });

  // tend captures audit 7: ✕ while held closes the shot; it is still kept, and no editor opens for it once it is.
  await step('T62 walk close while held', async () => {
    const before = await pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => { const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll(); g.onsuccess = () => resolve(g.result.length); };
    }));
    await slowKeep(2500);
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click('[data-testid=cap-photo]', { timeout: 10000 })]);
    await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
    const held = await pg.waitForSelector('[data-testid=media-editor][data-held=true]', { timeout: 4000 }).then(() => true, () => false);
    await pg.click('[data-testid=edit-close]', { timeout: 2000 }).catch(() => {});
    const gone = await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 1500 }).then(() => true, () => false);
    await pg.evaluate(SAMPLE);
    await pg.waitForTimeout(4500);
    const frames = await stopSampling();
    const after = await pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => { const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll(); g.onsuccess = () => resolve(g.result.length); };
    }));
    const editorAfter = frames.filter((f) => f.ed).length;
    check(held && gone && editorAfter === 0 && after === before + 1,
      `tend captures audit 7: on the walk ✕ closes the held shot before its keep settles; the photo is kept and no editor opens for it (${JSON.stringify({ held, gone, editorAfter, before, after })})`);
  });

  // tend captures audit 13 (U3, S7, F6): while held, the keyboard reaches only ✕: Tab from it lands on nothing hidden, Enter
  // on a hidden tool changes nothing, and ✕ closes the shot in one press.
  await step('T62 walk keyboard while held', async () => {
    await slowKeep(2500);
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click('[data-testid=cap-photo]', { timeout: 10000 })]);
    await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
    const held = await pg.waitForSelector('[data-testid=media-editor][data-held=true]', { timeout: 4000 }).then(() => true, () => false);
    const stage = () => pg.evaluate(() => { const e = document.querySelector('[data-testid=media-editor][data-held=true] [data-testid=edit-stage]'); return e ? { tool: e.getAttribute('data-tool'), edit: e.getAttribute('data-edit') } : null; });
    const before = await stage();
    await pg.focus('[data-testid=media-editor] [data-testid=edit-close]').catch(() => {});
    const reached = [];
    for (let i = 0; i < 6; i++) {
      await pg.keyboard.press('Tab');
      reached.push(await pg.evaluate(() => {
        const a = document.activeElement;
        const ed = document.querySelector('[data-testid=media-editor]');
        if (!a || !ed || !ed.contains(a)) return null;
        return { id: a.getAttribute('data-testid'), hidden: !!a.closest('[aria-hidden=true]') || Number(getComputedStyle(a.closest('[style*=opacity]') ?? a).opacity) === 0 };
      }));
    }
    const reachedHidden = reached.filter((x) => x && x.id !== 'edit-close' && (x.hidden || /^edit-(tool|rotate|aspect|crop|done|revert)/.test(x.id ?? '')));
    // Enter on a hidden tool, focused by script (as a screen reader's cursor could): nothing changes. The hidden blocks are
    // `visibility: hidden` on the web (tend captures audit 13), so the tool may take no focus at all; Enter is then not
    // pressed, since it would land on ✕, which has the focus.
    const toolFocused = await pg.evaluate(() => {
      const t = document.querySelector('[data-testid=media-editor] [data-testid=edit-tool-filter]');
      t?.focus();
      return !!t && document.activeElement === t;
    });
    if (toolFocused) {
      await pg.keyboard.press('Enter');
      await pg.waitForTimeout(300);
    }
    const after = await stage();
    const stillHeld = (await pg.locator('[data-testid=media-editor][data-held=true]').count()) === 1;
    await pg.click('[data-testid=media-editor] [data-testid=edit-close]', { timeout: 2000 }).catch(() => {});
    const closedOnce = await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 1200 }).then(() => true, () => false);
    await pg.waitForTimeout(3500);
    const reopened = await pg.locator('[data-testid=media-editor]').count();
    const said = { held, reached, reachedHidden, toolFocused, before, after, stillHeld, closedOnce, reopened };
    check(held && reachedHidden.length === 0 && !!before && JSON.stringify(before) === JSON.stringify(after) && stillHeld && closedOnce && reopened === 0,
      `tend captures audit 13: while the photo is held Tab from ✕ reaches nothing hidden, Enter on a hidden tool changes nothing, and ✕ closes it in one press (${JSON.stringify(said)})`);
  });

  // No cover where no editor follows: the picker cancelled, and a photo taken mid-memo (T60: the editor waits for Save).
  await step('T62 walk no cover', async () => {
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click('[data-testid=cap-photo]', { timeout: 10000 })]);
    await pg.evaluate(SAMPLE);
    // The browser's own word for a dismissed picker (expo-image-picker's web picker answers it as cancelled).
    await (await chooser.element()).evaluate((el) => el.dispatchEvent(new Event('cancel')));
    await pg.waitForTimeout(2000);
    const cancelled = (await stopSampling()).filter((f) => f.ed).length;
    await pg.click('[data-testid=cap-voice]', { timeout: 8000 });
    await pg.waitForSelector('[data-testid=voice-save]', { timeout: 10000 });
    await pg.waitForTimeout(1200);
    const [ch2] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click('[data-testid=cap-photo]', { timeout: 10000 })]);
    await pg.evaluate(SAMPLE);
    await ch2.setFiles(path.join(fixtures, 'photo.jpg'));
    await pg.waitForTimeout(2500);
    const midMemo = (await stopSampling()).filter((f) => f.ed).length;
    await shot(pg, `${SHOTS_TAG}-walk-mid-memo-390`);
    await pg.evaluate(SAMPLE);
    await pg.click('[data-testid=voice-save]', { timeout: 8000 });
    const after = await pg.waitForSelector('[data-testid=media-editor][data-held=false]', { timeout: 10000 }).then(() => true, () => false);
    await pg.waitForTimeout(800);
    const fades = (await stopSampling()).filter((f) => f.ed);
    await closeEditor();
    check(cancelled === 0 && midMemo === 0, `tend captures T62: on the walk nothing covers the map when the picker is cancelled, or for a photo taken mid-memo (${JSON.stringify({ cancelled, midMemo })})`);
    check(after && fades.length > 0 && fades[0].op < 1 && !fades[0].shot,
      `tend captures T62: after the memo's Save the editor opens as before, fading in, with no held shot under it (${JSON.stringify({ after, firstOp: fades[0]?.op ?? null, shot: fades[0]?.shot ?? null })})`);
  });

  // The recording bar, on Explore.
  await pg.click('[data-testid=walk-minimize]');
  await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
  if (!(await pg.locator('[data-testid=bar-photo]').count())) await pg.click('[data-testid=tab-explore]');
  await pg.waitForTimeout(1200);
  for (const [kind, file] of [['photo', 'photo.jpg'], ['video', 'clip-4s.webm']]) {
    await step(`T62 bar ${kind}`, async () => {
      const r = read(await capture('[data-testid=bar-photo]', file, `bar-${kind}-390`), kind);
      check(whole(r), `tend captures T62: from the recording bar a ${kind} covers the map from the picker's return, opaque from the frame after its mount, until its editor is up (${say(r)})`);
      check(steady(r) && honest(r),
        `tend captures T62, audit 7: from the recording bar the ${kind}'s box is still from while it is held, with no "kept" and no Done, only ✕, until its editor's controls come over it (${say(r)})`);
    });
  }
  await c.close();
}

module.exports = {
  name: 'edit',
  // Media editing (ME1-ME23): the editor after a capture, its tools, the viewer, Download.
  covers: [
    'src/components/edit/**',
    'src/components/{Baker,Baker.native,Baker.web,Baker.types,Caption,CaptureView,MomentBar,RecordingBar}.{ts,tsx}',
    'src/lib/{mediaEdit,editSession,editOffer,captureBus,useCaptures,thumbPlan,thumbJob}.ts',
    'src/lib/{captureEdits,videoEdit,media,export}/**',
    'src/app/walk.tsx',
  ],
  run,
  heldKit,
};
