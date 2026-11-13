// Media editing (ME1-ME23): the Edit offer on all three capture places, every tool on a photo and a
// video, what is stored, what the viewer shows, and what Download saves. E2E_ONLY=edit runs it alone.

const fs = require('fs');
const path = require('path');

async function run(h) {
  const { navUrl, BASE, page, start, at, check, shot, freshPage, scriptsDir } = h;
    const { c, pg } = await freshPage('edit');
    const fixtures = path.join(scriptsDir, 'fixtures');
    const step = async (name, fn) => {
      try {
        await fn();
      } catch (e) {
        const lines = String(e.message).split('\n');
        const why = lines.filter((l) => /Timeout|waiting for|locator/.test(l)).slice(0, 3).join(' | ') || lines.slice(0, 2).join(' | ');
        check(false, `${name}: ${why}`);
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

    // ME23 on Navigate, ready: a moment's photo offers Edit, which opens the editor on Crop as its own Modal.
    await step('ME23 moment', async () => {
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
      await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
      const offer = await pg.waitForSelector('[data-testid=capture-offer]', { timeout: 15000 }).then((e) => e.innerText(), () => '');
      check(/Photo saved/.test(offer) && (await pg.locator('[data-testid=capture-edit]').count()) === 1, `ME23: a moment's photo offers Edit ("${offer.replace(/\n/g, ' ')}")`);
      await pg.click('[data-testid=capture-edit]');
      await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 });
      check((await selected('edit-tool-crop')) === 'true', 'ME23: Edit opens the editor on Crop (Navigate, ready)');
      await pg.click('[data-testid=edit-close]');
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 });
      check(true, 'ME2: Close with no change closes at once');
      // media-editing audit 2: a moment edited from the offer shows the edit on its own pin's viewer, and opens on it.
      const offer2 = await pg.waitForSelector('[data-testid=capture-offer]', { timeout: 2000 }).then(() => true, () => false);
      if (!offer2) {
        const [ch2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=moment-photo]')]);
        await ch2.setFiles(path.join(fixtures, 'photo.jpg'));
        await pg.waitForSelector('[data-testid=capture-offer]', { timeout: 15000 });
      }
      await pg.click('[data-testid=capture-edit]');
      await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 });
      await pg.click('[data-testid=edit-rotate]');
      await pg.click('[data-testid=edit-done]');
      await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 15000 });
      const momentPin = pg.locator('.maplibregl-map [aria-label$=" captures here. Open"], .maplibregl-map [aria-label="Photo. Open"]');
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
      check(shownEdits.some((e) => e && JSON.parse(e).rotate === 90), `media-editing audit 2: a moment edited from the ready offer shows its edit on its pin's viewer (${JSON.stringify(shownEdits)})`);
      await pg.locator('[data-testid=viewer-close] >> visible=true').first().click();
      await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 5000 }).catch(() => {});
      await shot(pg, 'edit-after-moment');
    });

    // A walk, for the walk screen's offer and the viewer on its pins.
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
      const offer = await pg.waitForSelector('[data-testid=capture-offer]', { timeout: 15000 }).then((e) => e.innerText(), () => '');
      check(/Photo saved here/.test(offer), `ME23: the walk screen offers Edit after a photo ("${offer.replace(/\n/g, ' ')}")`);
      photoId = (await rowOf('photo'))?.id;
      // The pin's small copy before the edit (media-editing audit 3).
      const pinThumb = pg.locator('.maplibregl-map [aria-label="Photo. Open"] [data-testid=pin-thumb]');
      // Within the offer's 6 s: the copy is made about a second after the photo is kept.
      await pinThumb.first().waitFor({ timeout: 3500 }).catch(() => {});
      // Read at once, never waited on: the offer only lasts 6 s.
      const thumbSrc = async () => ((await pinThumb.count())
        ? pinThumb.first().evaluate((el) => (el.tagName === 'IMG' ? el.src : el.querySelector('img')?.src ?? getComputedStyle(el).backgroundImage), null, { timeout: 1000 }).catch(() => null)
        : null);
      const srcBefore = await thumbSrc();
      await pg.click('[data-testid=capture-edit]');
      await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 });
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
      const offer = await pg.waitForSelector('text=Video saved here', { timeout: 15000 }).then(() => true, () => false);
      check(offer, 'ME23: the walk screen offers Edit after a video');
      await pg.click('[data-testid=capture-edit]');
      await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 });
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
      const pin = pg.locator('.maplibregl-map [aria-label$=" captures here. Open"], .maplibregl-map [aria-label="Photo. Open"]');
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

    // ME23 on the recording bar: minimized, the bar's camera offers Edit too.
    await step('ME23 recording bar', async () => {
      await pg.click('[data-testid=walk-minimize]');
      await pg.waitForSelector('[data-testid=recording-bar]', { timeout: 10000 });
      // On Memories the band's camera takes the bar's place (decision 0112): the bar's own camera is on the other tabs.
      if (!(await pg.locator('[data-testid=bar-photo]').count())) await pg.click('[data-testid=tab-explore]');
      const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-testid=bar-photo]')]);
      await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
      // Since T12 (decision 0149) the bar's offer is a pill above it that waits for Edit, Close or the next capture.
      const said = await pg.waitForSelector('[data-testid=bar-edit-offer]', { timeout: 10000 })
        .then((e) => e.evaluate((n) => n.firstElementChild?.textContent ?? ''), () => '');
      const edit = await pg.waitForSelector('[data-testid=bar-edit-offer] [data-testid=capture-edit]', { timeout: 5000 }).then(() => true, () => false);
      check(said === 'Photo saved to your walk' && edit, `ME23: the recording bar offers Edit after its photo ("${said}")`);
      await pg.click('[data-testid=bar-edit-offer] [data-testid=capture-edit]');
      await pg.waitForSelector('[data-testid=media-editor]', { timeout: 10000 });
      check((await selected('edit-tool-crop')) === 'true', 'ME23: the bar’s Edit opens the editor on Crop');
      check((await pg.locator('[data-testid=bar-edit-offer]').count()) === 0, 'tend tabs T12: the bar’s Edit ends its offer');
      await pg.click('[data-testid=edit-close]');
    });

    // ME4: the replay's cards show the edits too (the edited photo's SVG picture, not the plain file).
    await step('ME4 replay', async () => {
      await pg.click('[data-testid=recording-return]');
      await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
      await pg.waitForTimeout(1000);
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
}

module.exports = {
  name: 'edit',
  // Media editing (ME1-ME23): the Edit offer, the editor's tools, the viewer, Download.
  covers: [
    'src/components/edit/**',
    'src/components/{Baker,Baker.native,Baker.web,Baker.types,Caption,CaptureView,MomentBar,RecordingBar}.{ts,tsx}',
    'src/lib/{mediaEdit,editSession,editOffer,captureBus,useCaptures,thumbPlan,thumbJob}.ts',
    'src/lib/{captureEdits,videoEdit,media,export}/**',
    'src/app/walk.tsx',
  ],
  run,
};
