// The replay journey's walk, written into storage and stopped: 600 m east along Transit Street with two photos, a
// video and a note at its end, 20 minutes with no fixes, then 80 m more and a memo. Shared by the `replay` journey
// (scripts/e2e/journeys/replay.js) and the replay's measurement harness (scripts/perf-replay.js), so both watch
// the same walk. Leaves the page on the walk's first replay (/replay/<id>), its reading beat or later.

async function seedReplayWalk(h, c, pg) {
  const { navUrl, BASE, at, metaOf, openWalk } = h;
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
  return { walk, here };
}

module.exports = { seedReplayWalk };
