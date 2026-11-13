// Video thumbnails (VT1-VT9): a video's still in every preview. A real WebM is recorded in the page (a second of red,
// a second of green, a second of blue), so a still's colour says which frame it is. Seeded straight into IndexedDB.
// E2E_ONLY=videothumbs runs it alone. VT2, VT5, VT7 and VT9 are unit tests (captures/, deletion/, map/).

// Records the clip and seeds: a loose video at the start point (no still yet), a video-only month last year (its
// still seeded), and a finished walk with a video moment (its still seeded) for the replay's pile.
const SEED = async ([lon, lat]) => {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 90;
  const g = canvas.getContext('2d');
  const paint = (c) => { g.fillStyle = c; g.fillRect(0, 0, 160, 90); };
  paint('#ff0000');
  const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm' });
  const parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start(100);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const tick = () => {
      const s = (performance.now() - t0) / 1000;
      paint(s < 1 ? '#ff0000' : s < 2 ? '#00c000' : '#0000ff');
      if (s < 3.1) requestAnimationFrame(tick);
      else resolve();
    };
    tick();
  });
  rec.stop();
  await done;
  const video = new Blob(parts, { type: 'video/webm' });
  const jpeg = (fill) => new Promise((r) => { const c = document.createElement('canvas'); c.width = 160; c.height = 90; const x = c.getContext('2d'); x.fillStyle = fill; x.fillRect(0, 0, 160, 90); c.toBlob(r, 'image/jpeg', 0.9); });
  const still = await jpeg('#c08000');
  const DAY = 86400000;
  const now = Date.now();
  const lastYear = new Date(new Date().getFullYear() - 1, 5, 2, 10).getTime();
  const piece = (id, mid, t, o = {}) => ({ id, moment_id: mid, t, kind: 'video', file_path: 'v-clip', body: '3000', caption: null, caption_y: null, thumb_path: null, edit: null, ...o });
  const moment = (id, walk_id, t, o = {}, at = [null, null]) => ({ id, walk_id, t, lat: at[1], lon: at[0], segment_id: null, piece_ids: [id], pieces: [piece(id, id, t, o)] });
  const walk = { id: 'w-rep', started_at: now - 2 * DAY, ended_at: now - 2 * DAY + 600_000, title: 'A replay with a video', epilogue: null, open: false, area: null, snapped_build: null };
  const pts = Array.from({ length: 30 }, (_, i) => ({ walk_id: 'w-rep', t: walk.started_at + i * 20_000, lat: lat + i * 0.0001, lon, accuracy_m: 5, speed: 1.2, course: null }));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'trace_point', 'moment', 'media'], 'readwrite');
      tx.objectStore('media').put({ key: 'v-clip', blob: video });
      tx.objectStore('media').put({ key: 'v-still', blob: still });
      tx.objectStore('moment').put(moment('vid', null, now - DAY, {}, [lon, lat]));
      tx.objectStore('moment').put(moment('vold', null, lastYear, { thumb_path: 'v-still' }));
      tx.objectStore('walk').put(walk);
      for (const p of pts) tx.objectStore('trace_point').add(p);
      tx.objectStore('moment').put(moment('vrep', 'w-rep', pts[15].t, { thumb_path: 'v-still' }, [pts[15].lon, pts[15].lat]));
      tx.oncomplete = () => resolve(video.size);
      tx.onerror = () => reject(tx.error);
    };
  });
};

// The stored piece, and its still's middle colour.
const pieceOf = (pg, id) => pg.evaluate((pid) => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const g = req.result.transaction('moment', 'readonly').objectStore('moment').get(pid);
    g.onsuccess = () => resolve(g.result ? g.result.pieces[0] : null);
  };
}), id);
const colourOf = (pg, key) => pg.evaluate((k) => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const g = req.result.transaction('media', 'readonly').objectStore('media').get(k);
    g.onsuccess = async () => {
      if (!g.result) return resolve(null);
      const bmp = await createImageBitmap(g.result.blob);
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      const x = c.getContext('2d');
      x.drawImage(bmp, 0, 0);
      const [r, gr, b] = x.getImageData(bmp.width >> 1, bmp.height >> 1, 1, 1).data;
      resolve({ r, g: gr, b, w: bmp.width, h: bmp.height });
    };
  };
}), key);
const reddest = (c) => c && c.r > 150 && c.g < 100 && c.b < 100;
const greenest = (c) => c && c.g > 120 && c.r < 100 && c.b < 100;

async function run(h) {
  const { url, check, shot, tabTo, freshPage, start } = h;
  const { c, pg } = await freshPage('videothumbs');
  const outside = [];
  pg.on('request', (r) => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol) && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') outside.push(u.host); });
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await pg.evaluate(SEED, start);
  await pg.reload();
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  const has = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
  const there = (sel, timeout = 15000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);

  // VT1, VT3, VT4, VT8: the gallery makes the loose video's still on the web; the tile draws it under its mark.
  await tabTo(pg, 'chronicle', 'memories');
  outside.length = 0;
  await pg.click('[data-testid=section-media]');
  const tileSel = '[data-testid=gallery-tile][data-piece=vid]';
  await pg.waitForSelector(tileSel, { timeout: 20000 });
  const made = await pg.waitForFunction((sel) => {
    const t = document.querySelector(sel);
    return t && t.dataset.ref && t.querySelector('[data-testid=gallery-img]') ? t.dataset.ref : null;
  }, tileSel, { timeout: 30000 }).then((x) => x.jsonValue(), () => null);
  const stored = await pieceOf(pg, 'vid');
  const first = stored && stored.thumb_path ? await colourOf(pg, stored.thumb_path) : null;
  check(!!made && stored?.thumb_path === made && reddest(first) && Math.max(first.w, first.h) <= 720,
    `VT1: a video kept on the web gets its first frame as its still, stored on the piece (${made}; ${JSON.stringify(first)})`);
  check(outside.length === 0, `VT8: making the still sends nothing anywhere (${outside.join(', ') || 'none'})`);
  const tileMark = await has(`${tileSel} [data-testid=video-mark]`);
  const tileLen = await pg.locator(`${tileSel} [data-testid=gallery-length]`).innerText().catch(() => '');
  const photoMarks = await pg.locator('[data-testid=gallery-tile][data-kind=photo] [data-testid=video-mark]').count();
  const ground = await pg.locator(`${tileSel} [data-testid=video-mark]`).evaluate((e) => getComputedStyle(e).backgroundColor).catch(() => '');
  await pg.waitForTimeout(500);
  await shot(pg, 'vt-01-gallery');
  check(tileMark && tileLen === '0:03' && photoMarks === 0 && /rgb\(29, 36, 48\)/.test(ground), `VT3, VT4: the tile shows the still with its play mark and length on an ink ground (${tileLen}; ${ground})`);

  // VT3, VT4: a video-only month's cover is its still, marked.
  await pg.click('[data-testid=gallery-zoom-months]');
  await pg.waitForSelector('[data-testid=gallery-block]', { timeout: 5000 });
  const cover = pg.locator(`[data-testid=gallery-block][data-cover=vold]`);
  await cover.scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(800);
  const coverImg = await cover.locator('img, [style*="background-image"]').count().catch(() => 0);
  const coverMark = await cover.locator('[data-testid=video-mark]').count().catch(() => 0);
  await shot(pg, 'vt-02-months');
  check(coverImg > 0 && coverMark === 1, `VT3, VT4: a video-only month's cover is its still under the play mark (${coverImg}, ${coverMark})`);
  await pg.click('[data-testid=gallery-zoom-days]');

  // VT6: a trim from the gallery's viewer makes the still again, from the new start (green), under a new name.
  await pg.locator(tileSel).click();
  await pg.waitForSelector('[data-testid=viewer-edit]', { timeout: 10000 });
  await pg.waitForTimeout(800);
  await pg.click('[data-testid=viewer-edit]');
  await pg.waitForSelector('[data-testid=edit-tool-trim]', { timeout: 10000 });
  await pg.click('[data-testid=edit-tool-trim]');
  const startBox = await pg.locator('[data-testid=trim-start]').boundingBox();
  const endBox = await pg.locator('[data-testid=trim-end]').boundingBox();
  const span = endBox.x - startBox.x;
  await pg.mouse.move(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
  await pg.mouse.down();
  await pg.mouse.move(startBox.x + startBox.width / 2 + span * 0.45, startBox.y + startBox.height / 2, { steps: 8 });
  await pg.mouse.up();
  await pg.click('[data-testid=edit-done]');
  // Polled from here: an async predicate in waitForFunction resolves at once with its pending promise.
  let renamed = null;
  for (let i = 0; i < 60 && !renamed; i++) {
    const p = await pieceOf(pg, 'vid');
    if (p && p.thumb_path && p.thumb_path !== made && p.edit && p.edit.trim) renamed = p;
    else await pg.waitForTimeout(500);
  }
  const second = renamed ? await colourOf(pg, renamed.thumb_path) : null;
  check(!!renamed && renamed.edit.trim.start_ms >= 1100 && greenest(second), `VT6: a trim makes a new still from the kept part's start (${renamed?.thumb_path}; ${renamed?.edit?.trim?.start_ms} ms; ${JSON.stringify(second)})`);
  if (await has('[data-testid=viewer-close]')) await pg.click('[data-testid=viewer-close]');
  await pg.waitForTimeout(600);

  // VT3, VT4: Memories' Lately card shows the still, marked.
  await pg.click('[data-testid=section-memories]');
  const card = '[data-testid=moment-card]';
  await there(card, 15000);
  const cardMark = await pg.waitForSelector(`${card} [data-testid=video-mark]`, { timeout: 15000 }).then(() => true, () => false);
  await shot(pg, 'vt-03-memories');
  check(cardMark, 'VT3, VT4: a Lately card shows the video\'s still under its play mark');

  // VT3, VT4: Navigate, ready: the loose video's pin (one video) shows its still with pin-video-mark, labelled Video.
  await tabTo(pg, 'navigate');
  const pinMark = await pg.waitForSelector('[data-testid=pin-video-mark]', { timeout: 30000 }).then(() => true, () => false);
  const pinLabel = pinMark ? await pg.locator('[data-testid=pin-video-mark]').first().evaluate((e) => e.closest('[aria-label]')?.getAttribute('aria-label') ?? '') : '';
  await shot(pg, 'vt-04-pin');
  check(pinMark && /^Video/.test(pinLabel), `VT3, VT4: a one-video pin shows its still, marked, and is labelled Video (${pinLabel})`);

  // VT3, VT4: on a walk, the earlier video is a memory pin whose preview shows the still, marked.
  await pg.click('[data-testid=start]');
  // A fixed position never refreshes the walk's last fix in the headless browser (moments-and-days.md): step a few metres.
  for (let i = 1; i <= 6 && !(await has('[data-testid=memory-pin]')); i++) {
    await c.setGeolocation({ longitude: start[0] + i * 0.00002, latitude: start[1] + i * 0.00002, accuracy: 6 });
    await pg.waitForTimeout(2000);
  }
  const memoryPin = await there('[data-testid=memory-pin]', 20000);
  let previewMark = false;
  if (memoryPin) {
    await pg.locator('[data-testid=memory-pin]').first().click();
    previewMark = await pg.waitForSelector('[data-testid=memory-preview] [data-testid=video-mark]', { timeout: 15000 }).then(() => true, () => false);
    await shot(pg, 'vt-05-memory-preview');
  }
  check(memoryPin && previewMark, `VT3, VT4: a walk's memory preview shows the video's still under its play mark (${memoryPin}, ${previewMark})`);
  await c.close();

  // VT3, VT4: the replay's pile shows the walk's video as its still, marked.
  const { c: c2, pg: rp } = await freshPage('videothumbs-replay');
  await rp.goto(url);
  await rp.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await rp.evaluate(SEED, start);
  await rp.goto(`${url}replay/w-rep?ceremony=0`);
  const pileMark = await rp.waitForSelector('[data-testid=replay-pile] [data-testid=video-mark]', { timeout: 90000 }).then(() => true, () => false);
  await shot(rp, 'vt-06-pile');
  check(pileMark, "VT3, VT4: the replay's pile shows a video as its still under the play mark");
  await c2.close();
}

module.exports = {
  name: 'videothumbs',
  covers: [
    'src/lib/thumbPlan.ts', 'src/lib/thumbJob.ts', 'src/lib/media/thumb.ts', 'src/lib/media/index.web.ts', 'src/lib/thumbs/**',
    'src/components/VideoMark.tsx', 'src/components/gallery/{GalleryTile,PeriodBlock}.tsx', 'src/components/chronicle/MomentPicture.tsx',
    'src/components/MemoryPreview.tsx', 'src/components/ceremony/Pile.tsx', 'src/components/CapturePinView.tsx',
  ],
  run,
};
