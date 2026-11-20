// The replay journey's walk, written into storage and stopped: 480 m east along Transit Street with two photos, a
// video and a note at its end; 20 minutes with no fixes and the trace picking up 340 m on (a break crossed by a hop);
// 40 m more and a memo; 4 minutes with no fixes and the trace picking up 38 m on (a break too small to see at the
// walking zoom: a stand, replay ceremony RC20). One place passed without stopping, between the video and the note (the
// walk counts as exploring from its start), which the last view names (RC25). Shared by the `replay` journey
// (scripts/e2e/journeys/replay.js) and the replay's measurement harness (scripts/perf-replay.js), so both watch
// the same walk. Leaves the page on the walk's first replay (/replay/<id>), its reading beat or later.

async function seedReplayWalk(h, c, pg) {
  const { navUrl, BASE, at, metaOf, openWalk, toStop } = h;
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
  // 480 m east along Transit Street, a photo early on and a note at the end; 20 min with no fixes; 40 m more and a
  // memo; 4 min with no fixes; the last 2 m, ending where the walk is stopped.
  const first = along([-6, -0.5], [-1.2, -0.5], now - 50 * min);
  const second = along([2.2, -0.5], [2.6, -0.5], first.at(-1).t + 20 * min);
  const third = along([2.98, -0.5], [3.0, -0.5], second.at(-1).t + 4 * min);
  const capAt = (p, o) => ({ walk_id: walk.id, t: p.t, lat: p.lat, lon: p.lon, segment_id: null, caption: null, caption_y: null, ...o });
  const captures = [
    capAt(first[8], { id: 'rr-photo', kind: 'photo', file_path: 'rr-photo', body: null, caption: 'Blue door', caption_y: 0.8 }),
    capAt(first[25], { id: 'rr-photo-2', kind: 'photo', file_path: 'rr-photo', body: null, caption: 'Green gate', caption_y: 0.8 }),
    // The video 100 m short of the note: a stretch that short is told at the walking zoom, so the camera re-frames as
    // the walker leaves the video's card (replay ceremony RC12).
    capAt(first[54], { id: 'rr-video', kind: 'video', file_path: 'rr-video', body: '5000' }),
    capAt(first.at(-1), { id: 'rr-note', kind: 'text', file_path: null, body: 'Bought two plums. Ate one before I paid.' }),
    capAt(second[5], { id: 'rr-memo', kind: 'voice', file_path: 'rr-memo', body: '3000' }),
  ];
  // A place passed without stopping, 5 m off the way between the video and the note: whispered as the walker goes by,
  // named on the last view and on the card (E11, replay ceremony RC25).
  const passedAt = [first[60].lon, first[60].lat + 5 / 111320];
  const passed = { key: 'rr-passed', area_key: null, name: 'Hessian Memorial', category: 'history', kind: 'monuments', at: passedAt, generic: false, lat: passedAt[1] };
  await pg.evaluate(([id, startedAt, pts, caps, passedPlace]) => new Promise((resolve) => {
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
        const tx = req.result.transaction(['walk', 'trace_point', 'moment', 'media', 'meta', 'checklist_item'], 'readwrite');
        tx.objectStore('meta').put({ key: `explored:${id}`, value: '1' });
        tx.objectStore('checklist_item').put(passedPlace);
        const w = tx.objectStore('walk').get(id);
        w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
        for (const p of pts) tx.objectStore('trace_point').add(p);
        for (const cap of caps) tx.objectStore('moment').put(((c) => ({ id: c.id, walk_id: c.walk_id ?? null, t: c.t, lat: c.lat ?? null, lon: c.lon ?? null, segment_id: c.segment_id ?? null, piece_ids: [c.id], pieces: [Object.fromEntries(Object.entries({ ...c, moment_id: c.id }).filter(([k]) => !['walk_id', 'lat', 'lon', 'segment_id'].includes(k)))] }))(cap));
        tx.objectStore('media').put({ key: 'rr-photo', blob });
        tx.objectStore('media').put({ key: 'rr-video', blob: video });
        tx.oncomplete = () => resolve(true);
      };
    }, 'image/png'));
  }), [walk.id, first[0].t - 1000, [...first, ...second, ...third], captures, passed]);
  await pg.reload();
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.waitForTimeout(2000);
  // Stop shows only while paused (decision 0220).
  await toStop(pg);
  const b = await pg.locator('[data-testid=stop]').boundingBox();
  await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 });
  // Where each card's moment was made, by the card's name: the journey reads its pin against its card (replay ceremony RC14).
  const places = { 'Blue door': [first[8].lon, first[8].lat], 'Green gate': [first[25].lon, first[25].lat], Video: [first[54].lon, first[54].lat] };
  return { walk, here, places, passed: passedAt };
}

/**
 * A walk of `n` photos, each a stop of its own 50 m on from the last, written into storage and stopped: more moments
 * with a picture than a small phone's stack holds (replay ceremony RC30). Uses the `rr-photo` picture the walk above
 * stored, so it follows it in the same browser. `passedAt` (a share of the way along) adds one place passed without
 * stopping there, 5 m off the way, so the last view names it (replay ceremony RC25). Leaves the page on the walk's
 * first replay.
 */
async function seedPhotoWalk(h, c, pg, n, { passedAt = null } = {}) {
  const { navUrl, BASE, at, openWalk, toStop } = h;
  const here = at(-4 + n * 0.5 + 0.2, 1.5);
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  for (let k = 0; k < 3; k++) {
    await c.setGeolocation({ longitude: here[0], latitude: here[1] + k * 0.000001, accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  const walk = await openWalk(pg);
  const t0 = Date.now() - 40 * 60_000;
  const steps = Math.round(((n * 0.5 + 0.2) * 100) / 7);
  const pts = Array.from({ length: steps + 1 }, (_, k) => {
    const p = at(-4 + ((n * 0.5 + 0.2) * k) / steps, 1.5);
    return { walk_id: walk.id, t: t0 + k * 5000, lon: p[0], lat: p[1], accuracy_m: 6, speed: 1.4, course: null };
  });
  const ids = Array.from({ length: n }, (_, k) => `ph-${k}`);
  const caps = ids.map((id, k) => {
    const p = pts[Math.min(pts.length - 1, Math.round(((k + 0.4) * 50) / 7))];
    return { id, walk_id: walk.id, t: p.t, lat: p.lat, lon: p.lon, segment_id: null, piece_ids: [id], pieces: [{ id, moment_id: id, t: p.t, kind: 'photo', file_path: 'rr-photo', body: null, caption: null, caption_y: null }] };
  });
  const near = passedAt == null ? null : pts[Math.round(passedAt * steps)];
  const passedPlace = near && { key: 'ph-passed', area_key: null, name: 'Old Mill', category: 'history', kind: 'monuments', at: [near.lon, near.lat + 5 / 111320], generic: false, lat: near.lat + 5 / 111320 };
  await pg.evaluate(([id, startedAt, points, moments, place]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'trace_point', 'moment', 'meta', 'checklist_item'], 'readwrite');
      if (place) {
        tx.objectStore('meta').put({ key: `explored:${id}`, value: '1' });
        tx.objectStore('checklist_item').put(place);
      }
      const w = tx.objectStore('walk').get(id);
      w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
      for (const p of points) tx.objectStore('trace_point').add(p);
      for (const m of moments) tx.objectStore('moment').put(m);
      tx.oncomplete = () => resolve(true);
    };
  }), [walk.id, pts[0].t - 1000, pts, caps, passedPlace]);
  await pg.reload();
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.waitForTimeout(2000);
  await toStop(pg);
  const b = await pg.locator('[data-testid=stop]').boundingBox();
  await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 });
  return { walk, ids };
}

/**
 * A walk 380 m north up one street (the grid's street at x 2.5: no place of the harness's world stands near it, nor
 * the places the two walks above passed), written into storage and stopped: a photo 60 m in
 * (the `rr-photo` picture the first walk stored, so it follows it in the same browser), and two places passed without
 * stopping 70 m apart, each 5 m east of the way. The way runs up the screen, so a whisper stands beside the line
 * (`replay-ceremony ui 13`), and the two come close enough together that the second replaces the first (ui 12).
 * Leaves the page on the walk's first replay.
 */
async function seedNorthWalk(h, c, pg) {
  const { navUrl, BASE, at, openWalk, toStop } = h;
  const here = at(2.5, 1.9);
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  await pg.click('[data-testid=start]');
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  for (let k = 0; k < 3; k++) {
    await c.setGeolocation({ longitude: here[0], latitude: here[1] + k * 0.000001, accuracy: 6 });
    await pg.waitForTimeout(1000);
  }
  const walk = await openWalk(pg);
  const t0 = Date.now() - 30 * 60_000;
  const steps = Math.round(380 / 7);
  const pts = Array.from({ length: steps + 1 }, (_, k) => {
    const p = at(2.5, -1.9 + (3.8 * k) / steps);
    return { walk_id: walk.id, t: t0 + k * 5000, lon: p[0], lat: p[1], accuracy_m: 6, speed: 1.4, course: null };
  });
  const photoAt = pts[9];
  const photo = { id: 'nw-photo', walk_id: walk.id, t: photoAt.t, lat: photoAt.lat, lon: photoAt.lon, segment_id: null, piece_ids: ['nw-photo'], pieces: [{ id: 'nw-photo', moment_id: 'nw-photo', t: photoAt.t, kind: 'photo', file_path: 'rr-photo', body: null, caption: null, caption_y: null }] };
  const east = 5 / (111320 * Math.cos((photoAt.lat * Math.PI) / 180));
  const placeAt = (k, key, name) => ({ key, area_key: null, name, category: 'history', kind: 'monuments', at: [pts[k].lon + east, pts[k].lat], generic: false, lat: pts[k].lat });
  const places = [placeAt(26, 'nw-passed-1', 'Sun Inn'), placeAt(36, 'nw-passed-2', 'Kemerer Museum')];
  await pg.evaluate(([id, startedAt, points, moment, passedPlaces]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'trace_point', 'moment', 'meta', 'checklist_item'], 'readwrite');
      tx.objectStore('meta').put({ key: `explored:${id}`, value: '1' });
      for (const place of passedPlaces) tx.objectStore('checklist_item').put(place);
      const w = tx.objectStore('walk').get(id);
      w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
      for (const p of points) tx.objectStore('trace_point').add(p);
      tx.objectStore('moment').put(moment);
      tx.oncomplete = () => resolve(true);
    };
  }), [walk.id, pts[0].t - 1000, pts, photo, places]);
  await pg.reload();
  await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
  await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
  await pg.waitForTimeout(2000);
  await toStop(pg);
  const b = await pg.locator('[data-testid=stop]').boundingBox();
  await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await pg.mouse.down();
  await pg.waitForTimeout(1100);
  await pg.mouse.up();
  await pg.waitForURL(/replay/, { timeout: 30000 });
  return { walk, places: places.map((x) => x.at) };
}

module.exports = { seedReplayWalk, seedPhotoWalk, seedNorthWalk };
