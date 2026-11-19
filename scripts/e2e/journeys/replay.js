// Replay rhythm (RR6-RR16, RR19): a walk seeded with a captioned photo, a note, a memo, a 20-minute
// gap and a 4-minute one too small to see, watched with no taps but the ones it checks; then its day. E2E_ONLY=replay
// runs it alone.

const { seedReplayWalk, seedPhotoWalk } = require('../replayWalk');

// Replay ceremony, the engine and the camera (RC1-RC3, RC7, RC9, RC10, RC12, RC14): what the page's own frames saw.
// `recordFrames` turns the app's counters on (window.__perf) and notes, every display frame, where the map says the
// dot, the camera (where it is, `centre`, and where its frame put it, `cam`) and the revealed line's end are, the
// renders and sends counted so far, and what is on the stage.
const recordFrames = (pg) => pg.evaluate(() => {
  window.__perf = window.__perf || {};
  const E = (window.__eng = { frames: [], on: true });
  const has = (id) => !!document.querySelector(`[data-testid=${id}]`);
  const tick = (t) => {
    if (!E.on) return;
    const map = [...document.querySelectorAll('[data-walker]')].filter((e) => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().width > 0).pop();
    const card = document.querySelector('[data-testid=replay-card]');
    const cb = card && card.getBoundingClientRect();
    const note = document.querySelector('[data-testid=replay-note]');
    const p = window.__perf;
    let sends = 0;
    for (const k in p) if (k.startsWith('setData:')) sends += p[k];
    // Anything with a ground of its own laid over the map at its left edge, a third of the way down, where no card,
    // bubble or control stands (replay ceremony RC17: a break never dims the map).
    let veil = '';
    for (const e of document.elementsFromPoint(6, Math.round(window.innerHeight / 3))) {
      if (e.closest('.maplibregl-map') || e === document.body || e === document.documentElement) break;
      // The dim under a card is read apart (`scrim`, RC35): a break must show none of it either.
      if (e.getAttribute('data-testid') === 'replay-scrim') continue;
      const st = getComputedStyle(e);
      if (!/rgba\(0, 0, 0, 0\)|transparent/.test(st.backgroundColor) && Number(st.opacity) > 0.02 && e.getBoundingClientRect().height > window.innerHeight / 2) veil = `${e.tagName} ${st.backgroundColor} at ${st.opacity}`;
    }
    const later = document.querySelector('[data-testid=replay-later]');
    const fade = document.querySelector('[data-testid=replay-clock-fade]');
    // What stays behind and a moment on screen (replay ceremony RC28-RC36): the stack and its entries, the pictures
    // standing on the map, the dim under a card, a held photo's own scale, and the map's pins of pictured moments.
    const rect = (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map((x) => Math.round(x * 10) / 10).join(','); };
    const stackEl = document.querySelector('[data-testid=replay-stack]');
    const scrim = document.querySelector('[data-testid=replay-scrim]');
    const photo = document.querySelector('[data-testid=card-photo]');
    const scaleOf = (e) => { const m = /scale\(([\d.]+)\)/.exec(e.style.transform || ''); return m ? Number(m[1]) : 1; };
    E.frames.push({
      stack: stackEl ? rect(stackEl) : '', stackText: stackEl ? stackEl.innerText.trim() : '',
      entries: [...document.querySelectorAll('[data-testid=stack-entry]')].map((e) => `${e.getAttribute('data-key')}:${rect(e)}@${e.style.opacity || 1}`).join('|'),
      pics: [...document.querySelectorAll('[data-testid=replay-picture]')].map((e) => `${e.getAttribute('data-key')}:${rect(e)}@${e.style.opacity || 1}@${e.querySelector('[data-testid=picture-edge]')?.style.opacity || 0}`).join('|'),
      scrim: scrim ? Number(scrim.style.opacity || 0) : null, drift: photo ? scaleOf(photo) : null,
      pictured: [...document.querySelectorAll('.maplibregl-map [data-ids]')].filter((e) => /rr-photo|rr-video/.test(e.getAttribute('data-ids'))).length,
      bubbles: [...document.querySelectorAll('[data-testid=replay-note], [data-testid=memo-bubble]')].map(rect).join('|'), laterBox: later ? rect(later) : '',
      hops: map?.getAttribute('data-hops') ?? '', later: later?.textContent ?? '', veil, clockFade: fade ? Number(getComputedStyle(fade).opacity) : null,
      t, busy: !!card || !!note || has('memo-bubble') || has('replay-whisper') || has('replay-later'),
      walker: map?.getAttribute('data-walker') ?? '', centre: map?.getAttribute('data-center') ?? '', zoom: Number(map?.getAttribute('data-zoom')), end: map?.getAttribute('data-reveal-end') ?? '',
      cam: map?.getAttribute('data-cam') ?? '', held: has('replay-held'), w: window.innerWidth, h: window.innerHeight,
      screen: (p['render:replay'] ?? 0) + (p['render:day'] ?? 0), map: p['render:map'] ?? 0, sends, commits: window.__commits?.[0] ?? 0, engine: p['replay:frame'] ?? 0,
      card: cb ? `${cb.x.toFixed(1)},${cb.y.toFixed(1)},${cb.width.toFixed(1)},${cb.height.toFixed(1)}` : '', cardName: card?.getAttribute('aria-label') ?? '', note: note ? getComputedStyle(note.parentElement).opacity : '',
      clock: document.querySelector('[data-testid=replay-clock]')?.getAttribute('aria-label') ?? '', puck: !!document.querySelector('[data-testid=walker-puck]'),
      // The opening (replay-ceremony ui 7): how strongly the walker's dot shows (null with none drawn) and the opacity the
      // map's whole trace is drawn at; and the white edge under a hop's dots (ui 6). Both written only when measuring.
      puckFade: (() => { const e = document.querySelector('[data-testid=walker-puck]'); return e && e.style.display !== 'none' ? Number(e.style.opacity || 1) : null; })(),
      traceShown: map?.getAttribute('data-trace-shown') ?? '', hopEdge: map?.getAttribute('data-hop-edge') ?? '',
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const stopFrames = (pg) => pg.evaluate(() => {
  const E = window.__eng;
  if (!E) return [];
  E.on = false;
  return E.frames;
});
const lonLat = (s) => (s ? s.split(',').map(Number) : null);
/** Pixels between two places at a zoom (512 px tiles, as maplibre counts zoom). */
const pxApart = (a, b, zoom) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * 111320) * ((512 * 2 ** zoom) / (40075016.686 * Math.cos((a[1] * Math.PI) / 180)));
/** A place on a screen under a camera, as a map lays it out (Web Mercator, 512 px tiles). */
const world = (p) => [p[0] / 360 + 0.5, 0.5 - Math.log(Math.tan(Math.PI / 4 + (p[1] * Math.PI) / 360)) / (2 * Math.PI)];
function screenAt(cam, p, w, h) {
  const s = 512 * 2 ** cam[2];
  const c = world(cam);
  const q = world(p);
  return [w / 2 + (q[0] - c[0]) * s, h / 2 + (q[1] - c[1]) * s];
}
/**
 * The longest stretch in the frames: nothing arriving or leaving on the stage, from the first frame the walker moved to
 * the last. Its rates a second, how far apart the dot and the line's end were, how far the map's centre was from
 * where its frame put the camera, and how far off the screen the dot was, at the most. The camera no longer rides the
 * walker (replay ceremony RC12): it is where the ceremony says, and the dot is somewhere on the screen.
 * Only stretches after the first card: the telling's first frames are its making (the map's first sends, the walk's
 * first run beginning), not time passing.
 */
function stretchOf(frames) {
  let best = null;
  let from = -1;
  const carded = frames.findIndex((f) => f.card);
  for (let i = Math.max(1, carded); carded >= 0 && i <= frames.length; i++) {
    const free = i < frames.length && !frames[i].busy && !!frames[i].clock && !!frames[i].walker;
    if (free && from < 0) from = i;
    if (free || from < 0) continue;
    let a = from;
    let b = i - 1;
    while (a < b && frames[a].walker === frames[a - 1].walker) a++;
    while (b > a && frames[b].walker === frames[b - 1].walker) b--;
    if (!best || frames[b].t - frames[a].t > frames[best.b].t - frames[best.a].t) best = { a, b };
    from = -1;
  }
  if (!best) return null;
  const A = frames[best.a];
  const B = frames[best.b];
  const seconds = (B.t - A.t) / 1000;
  const rate = (k) => (seconds > 0 ? (B[k] - A[k]) / seconds : Infinity);
  // React's commits are counted from 150 ms in: the stretch's first frames still commit what left as it began (a card
  // shrunk away, its picture standing, the stack taking it).
  const settled = frames.slice(best.a, best.b + 1).find((f) => f.t - A.t >= 150) ?? A;
  const commits = B.t > settled.t ? ((B.commits - settled.commits) * 1000) / (B.t - settled.t) : Infinity;
  let line = 0;
  let centre = 0;
  let ended = 0;
  let followed = 0;
  let off = 0;
  for (let i = best.a; i <= best.b; i++) {
    const w = lonLat(frames[i].walker);
    const e = lonLat(frames[i].end);
    const c = lonLat(frames[i].centre);
    const cam = lonLat(frames[i].cam);
    if (w && e) { ended++; line = Math.max(line, pxApart(w, e, frames[i].zoom)); }
    if (c && cam && cam.length === 3) {
      followed++;
      centre = Math.max(centre, pxApart(c, cam, cam[2]));
      if (w) {
        const at = screenAt(cam, w, frames[i].w, frames[i].h);
        off = Math.max(off, -at[0], at[0] - frames[i].w, -at[1], at[1] - frames[i].h);
      }
    }
  }
  const n = best.b - best.a + 1;
  // "At most two a second" over a stretch of about a second is a count: two renders half a second apart are within it,
  // though the stretch's own length would call them 2.3 a second.
  const within = (k, aSecond) => B[k] - A[k] <= Math.ceil(aSecond * seconds);
  return {
    seconds, frames: n, screen: rate('screen'), map: rate('map'), sends: rate('sends'), commits, engine: rate('engine'), line, centre, off, ended, followed, puck: B.puck,
    fewRenders: within('screen', 2) && within('map', 2), fewSends: within('sends', 1),
  };
}
/** The legs between this walk's moments take about a second each: a stretch is long enough to read from 0.7 s. */
const STRETCH_S = 0.7;
/** How often the screen rendered while the frames were recorded. */
const rendersIn = (frames) => (frames.length ? frames[frames.length - 1].screen - frames[0].screen : 0);
const fix1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : String(x));
const stretchSaid = (s) => (s ? `a ${fix1(s.seconds)} s stretch of ${s.frames} frames: screen ${fix1(s.screen)}/s, map ${fix1(s.map)}/s, sends ${fix1(s.sends)}/s, commits ${fix1(s.commits)}/s, engine frames ${fix1(s.engine)}/s, line's end ${fix1(s.line)} px from the dot and the map's centre ${fix1(s.centre)} px from where its frame put the camera at the most, the dot ${s.off <= 0 ? 'on the screen' : `${fix1(s.off)} px off the screen`}, the end said in ${s.ended} frames` : 'no stretch seen');

/**
 * The camera through a watch (replay ceremony RC12, RC14), from the frames recorded: the runs of frames in which it
 * moved, how much of the watch it stood exactly still, whether it ever moved under a card at rest, and where each
 * card's pin was on the screen against the card's own lower edge. `places` are the cards' places, by the card's name.
 */
function cameraOf(frames, places) {
  const told = frames.filter((f) => f.clock && f.cam);
  const runs = [];
  let still = 0;
  let underCard = 0;
  const pins = {};
  for (let i = 1; i < told.length; i++) {
    const f = told[i];
    const was = told[i - 1];
    const movedNow = f.cam !== was.cam;
    if (movedNow) {
      const last = runs[runs.length - 1];
      if (last && last.b === i - 1) last.b = i;
      else runs.push({ a: i - 1, b: i });
    } else still++;
    // A card at rest: the same box as the frame before, at its full width.
    const rest = f.card && f.card === was.card;
    if (rest && movedNow) underCard++;
    const place = rest && Object.entries(places).find(([name]) => f.cardName.startsWith(name));
    if (place) {
      const [x, y, cw, ch] = f.card.split(',').map(Number);
      const pin = screenAt(lonLat(f.cam), place[1], f.w, f.h);
      pins[place[0]] = { dx: Math.round((pin[0] - (x + cw / 2)) * 10) / 10, under: Math.round((pin[1] - (y + ch)) * 10) / 10, y: Math.round(pin[1]), foot: Math.round(y + ch), h: f.h };
    }
  }
  const seconds = runs.map((r) => (told[r.b].t - told[r.a].t) / 1000);
  // The walker went on while the camera stood: frames in which the dot moved and the camera did not.
  const walkedStill = told.filter((f, i) => i > 0 && f.cam === told[i - 1].cam && f.walker && told[i - 1].walker && f.walker !== told[i - 1].walker).length;
  return { frames: told.length, runs: runs.length, longest: Math.max(0, ...seconds), still: told.length > 1 ? still / (told.length - 1) : 0, walkedStill, underCard, pins, zooms: [...new Set(told.map((f) => lonLat(f.cam)[2].toFixed(2)))] };
}

/**
 * The breaks through a watch (replay ceremony RC17-RC21), from the frames recorded. Time is counted only while the
 * replay is not held (a picture holds it). `far` is the break crossed by a hop, read while its line is under the clock
 * (the walk's 20-minute gap); `stand` the one too small to see (its 4-minute gap).
 */
function breaksOf(frames) {
  const told = frames.filter((f) => f.clock);
  const passed = (list) => list.reduce((n, f) => n + (f.dt ?? 0), 0);
  told.forEach((f, i) => { f.dt = i > 0 && !f.held && !told[i - 1].held ? f.t - told[i - 1].t : 0; });
  const hopOf = (f) => {
    const m = /^(-?[\d.]+),(-?[\d.]+)>(-?[\d.]+),(-?[\d.]+)@([\d.]+)/.exec(f.hops || '');
    return m ? { from: [Number(m[1]), Number(m[2])], to: [Number(m[3]), Number(m[4])], p: Number(m[5]) } : null;
  };
  const first = told.findIndex((f) => hopOf(f));
  const hop = first >= 0 ? hopOf(told[first]) : null;
  const out = { frames: told.length, veiled: told.filter((f) => f.veil).length, veil: told.find((f) => f.veil)?.veil ?? '', laters: [...new Set(told.map((f) => f.later).filter(Boolean))], far: null, stand: null };
  if (hop) {
    const lon = (f) => lonLat(f.walker)?.[0];
    const between = (f) => { const x = lon(f); return x != null && x > hop.from[0] + 1e-6 && x < hop.to[0] - 1e-6; };
    const drawing = told.filter((f) => { const k = hopOf(f); return k && k.p > 0 && k.p < 1; });
    const sliding = told.filter(between);
    const said = told.filter((f) => /^20 min later$/.test(f.later));
    const after = told.slice(first).filter((f) => !hopOf(f) || hopOf(f).p < 1).length - drawing.length;
    const inView = (f, place) => { const c = lonLat(f.cam); if (!c || c.length !== 3) return false; const at = screenAt(c, place, f.w, f.h); return at[0] >= 0 && at[0] <= f.w && at[1] >= 0 && at[1] <= f.h; };
    const last = told[told.length - 1];
    // Where the walker stands once the camera has closed in: the last frame it is where the trace picks up, before it walks on.
    const landed = told.slice(first).filter((f) => lon(f) != null && Math.abs(lon(f) - hop.to[0]) < 2e-6 && lonLat(f.cam)?.[2] === 15).pop();
    const landedAt = landed ? screenAt(lonLat(landed.cam), lonLat(landed.walker), landed.w, landed.h) : null;
    out.far = {
      steps: new Set(drawing.map((f) => hopOf(f).p)).size, endsInView: drawing.every((f) => inView(f, hop.from) && inView(f, hop.to)) && sliding.every((f) => inView(f, hop.from) && inView(f, hop.to)),
      slid: new Set(sliding.map((f) => f.walker)).size, onLine: sliding.every((f) => Math.abs(lonLat(f.walker)[1] - hop.from[1]) < 2e-6), drawnFirst: sliding.every((f) => hopOf(f)?.p === 1),
      pulledBack: Math.min(...drawing.concat(sliding).map((f) => lonLat(f.cam)?.[2] ?? 99)), undrawnAfter: after, stays: hopOf(last)?.p === 1,
      landed: landedAt ? landedAt.map(Math.round) : null, focus: landed ? [Math.round(landed.w / 2), Math.round(landed.h * 0.42)] : null,
      // The clock's times while the walker is on the hop: the line stays a little longer, into the stretch after it.
      saidS: Math.round(passed(said) / 10) / 100, clocks: [...new Set(said.filter((f) => lon(f) != null && lon(f) <= hop.to[0] + 2e-6).map((f) => f.clock))], faded: Math.min(1, ...said.map((f) => f.clockFade ?? 1)),
    };
  }
  const stood = told.filter((f) => /^4 min later$/.test(f.later));
  // The stand itself is its line's first second and a bit; the line stays a little after, into the walk's last view.
  const standing = stood.filter((f) => f.t - stood[0].t <= 1100);
  if (stood.length) out.stand = { frames: stood.length, saidS: Math.round(passed(stood) / 10) / 100, cams: new Set(stood.map((f) => f.cam)).size, hops: new Set(stood.map((f) => f.hops)).size, clocks: [...new Set(standing.map((f) => f.clock))], walkers: new Set(standing.map((f) => f.walker)).size };
  return out;
}

/**
 * The opening and the close through a watch (replay ceremony RC23, RC24), from frames recorded from the first beat on,
 * through the path, to a little after the card. Time is counted only while the replay is not held (a picture holds it).
 * `opened`: how far the path's first frame was from the first beat's own view, how long the dive took and whether the
 * camera ever pulled back in it. `closed`: how long the walker stood before the camera pulled back, how long that took,
 * how long its last view held, and how far the map moved once the card came.
 */
function bookendsOf(frames) {
  const camOf = (f) => { const c = lonLat(f.cam); return c && c.length === 3 ? c : null; };
  const first = frames.findIndex((f) => camOf(f));
  const out = { opened: null, closed: null };
  if (first < 0) return out;
  const last = frames.length - 1 - [...frames].reverse().findIndex((f) => camOf(f));
  const told = frames.slice(first, last + 1);
  told.forEach((f, i) => { f.dt = i > 0 && !f.held && !told[i - 1].held ? f.t - told[i - 1].t : 0; });
  const passed = (a, b) => told.slice(a + 1, b + 1).reduce((n, f) => n + f.dt, 0) / 1000;
  const r2 = (x) => Math.round(x * 100) / 100;
  // The first beat's own view: where the map was before the path's first frame.
  const before = frames.slice(0, first).filter((f) => f.centre && Number.isFinite(f.zoom)).pop();
  const c0 = camOf(told[0]);
  const down = told.findIndex((f) => Math.abs(camOf(f)[2] - 15) < 1e-6);
  let back = 0;
  for (let i = 1; i <= Math.max(0, down); i++) if (camOf(told[i])[2] < camOf(told[i - 1])[2] - 1e-9) back++;
  out.opened = {
    fromZoom: r2(c0[2]), cutPx: before ? r2(pxApart(lonLat(before.centre), c0, c0[2])) : null, cutZoom: before ? r2(Math.abs(before.zoom - c0[2])) : null,
    // How long the whole stood before the camera first moved (the day's own hold), and the dive from there.
    heldS: r2(passed(0, Math.max(0, told.findIndex((f) => f.cam !== told[0].cam) - 1))), diveS: down > 0 ? r2(passed(Math.max(0, told.findIndex((f) => f.cam !== told[0].cam) - 1), down)) : null, back,
  };
  // The close, read back from the end: the last view held, the pull-back before it, the walker standing before that.
  const end = told.length - 1;
  let hold = end;
  while (hold > 0 && told[hold - 1].cam === told[end].cam) hold--;
  let pull = hold;
  while (pull > 0 && camOf(told[pull - 1])[2] >= camOf(told[pull])[2] - 1e-9 && told[pull - 1].cam !== told[pull].cam) pull--;
  let stood = pull;
  while (stood > 0 && told[stood - 1].walker === told[pull].walker && told[stood - 1].cam === told[pull].cam) stood--;
  const lastCam = camOf(told[end]);
  const after = frames.slice(last + 1).filter((f) => f.centre && Number.isFinite(f.zoom));
  out.closed = {
    stoodS: r2(passed(stood, pull)), pullS: r2(passed(pull, hold)), holdS: r2(passed(hold, end)), toZoom: r2(lastCam[2]), fromZoom: r2(camOf(told[pull])[2]),
    // Once the card is there: the farthest the map's own centre was from the last view, and its zoom from the last view's.
    after: after.length, movedPx: after.length ? r2(Math.max(...after.map((f) => pxApart(lonLat(f.centre), lastCam, lastCam[2])))) : null, movedZoom: after.length ? r2(Math.max(...after.map((f) => Math.abs(f.zoom - lastCam[2])))) : null,
  };
  return out;
}

/**
 * What stays behind through a watch (replay ceremony RC28-RC36), from the frames recorded. `places` are the cards'
 * places by name, `keys` their moments' ids in the order they come. Boxes are "left,top,right,bottom".
 */
function staysOf(frames, places, keys) {
  const told = frames.filter((f) => f.cam);
  const box = (s) => s.split(',').map(Number);
  const meets = (a, b) => !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);
  const picsOf = (f) => (f.pics ? f.pics.split('|').map((p) => { const m = /^(.*):([^:@]+)@([\d.]+)@([\d.]+)$/.exec(p); return m ? { key: m[1], box: box(m[2]), opacity: Number(m[3]), edge: Number(m[4]) } : null; }).filter(Boolean) : []);
  const entriesOf = (f) => (f.entries ? f.entries.split('|').map((p) => { const m = /^(.*):([^:@]+)@([\d.]+)$/.exec(p); return m ? { key: m[1], box: box(m[2]), opacity: Number(m[3]) } : null; }).filter(Boolean) : []);
  const out = { frames: told.length, landed: {}, entries: [], grewUp: true, stackTexts: [...new Set(told.map((f) => f.stackText).filter((s) => /[\d\p{L}]/u.test(s)))], overlaps: [], scrim: { up: 0, upMax: 0, off: 0, offMax: 0, inBreak: 0 }, pinsOfPictured: Math.max(0, ...told.map((f) => f.pictured ?? 0)), pictures: 0, drift: null, control: null, last: null };
  // RC28: each card's last frame against where its picture then stands, and its own place on the map.
  Object.entries(places).forEach(([name, place], k) => {
    const i = told.findIndex((f, j) => j > 0 && !f.cardName.startsWith(name) && told[j - 1].cardName.startsWith(name));
    if (i < 1) return;
    // The card's last frame (its box is x, y, width, height).
    const [l, t, cw, ch] = box(told[i - 1].card);
    const r = l + cw;
    const b = t + ch;
    const at = screenAt(lonLat(told[i].cam), place, told[i].w, told[i].h);
    const pic = picsOf(told[i]).find((p) => p.key === keys[k]) ?? picsOf(told[Math.min(told.length - 1, i + 2)]).find((p) => p.key === keys[k]);
    const pc = pic ? [(pic.box[0] + pic.box[2]) / 2, (pic.box[1] + pic.box[3]) / 2] : null;
    out.landed[name] = {
      cardW: Math.round(r - l), cardAt: [Math.round((l + r) / 2), Math.round((t + b) / 2)], place: at.map(Math.round), picture: pc && pc.map(Math.round),
      // The card's last frame from the picture's middle, and the picture's foot from the place it stands on.
      cardToPicture: pc ? Math.round(Math.hypot((l + r) / 2 - pc[0], (t + b) / 2 - pc[1])) : null, footToPlace: pic ? Math.round(Math.hypot((pic.box[0] + pic.box[2]) / 2 - at[0], pic.box[3] - at[1])) : null,
    };
  });
  // A card at rest is at its widest, where the frame before had it too (a frame drawn twice mid-flight is not at rest).
  const widest = {};
  for (const f of told) if (f.card) widest[f.cardName] = Math.max(widest[f.cardName] ?? 0, Number(f.card.split(',')[2]));
  // RC29, RC30: the stack's entries as they come: how many, the newest the highest, and what they ever met.
  let count = 0;
  for (const f of told) {
    const es = entriesOf(f).filter((e) => e.opacity > 0.5);
    if (es.length !== count) { count = es.length; out.entries.push({ n: count, keys: es.map((e) => e.key), t: Math.round(f.t) }); }
    const tops = es.map((e) => e.box[1]);
    if (tops.some((y, i) => i > 0 && y >= tops[i - 1])) out.grewUp = false;
    const sb = f.stack ? box(f.stack) : null;
    if (sb) {
      if (f.card && meets(sb, (() => { const [x, y, w, h] = f.card.split(',').map(Number); return [x, y, x + w, y + h]; })())) out.overlaps.push('card');
      for (const b of (f.bubbles ? f.bubbles.split('|') : [])) if (meets(sb, box(b))) out.overlaps.push('bubble');
      if (f.laterBox && meets(sb, box(f.laterBox))) out.overlaps.push('line');
      out.control = { w: Math.round(sb[2] - sb[0]), h: Math.round(sb[3] - sb[1]) };
    }
    // RC35: the dim while a card rests, and with none up.
    if (f.scrim != null) {
      const resting = f.card && f.cardName && f.card === (told[told.indexOf(f) - 1] || {}).card && Number(f.card.split(',')[2]) >= widest[f.cardName] - 0.5;
      if (resting) { out.scrim.up++; out.scrim.upMax = Math.max(out.scrim.upMax, f.scrim); out.scrim.upMin = Math.min(out.scrim.upMin ?? 1, f.scrim); }
      else if (!f.card) { out.scrim.off++; out.scrim.offMax = Math.max(out.scrim.offMax, f.scrim); }
      if (f.later && f.scrim > 0.001 && !f.card) out.scrim.inBreak++;
    }
    if (f.drift != null && f.card) out.drift = { min: Math.min(out.drift?.min ?? 9, f.drift), max: Math.max(out.drift?.max ?? 0, f.drift) };
  }
  out.overlaps = [...new Set(out.overlaps)];
  out.pictures = Math.max(0, ...told.map((f) => picsOf(f).length));
  // RC34: the last frame told: which pictures stand, which is under a later one, and whose edge is layered.
  const end = picsOf(told[told.length - 1] ?? {});
  out.last = end.map((p) => ({ key: p.key, shown: p.opacity > 0.5, layered: p.edge > 0.5, at: [Math.round((p.box[0] + p.box[2]) / 2), Math.round(p.box[3])] }));
  return out;
}

/**
 * The opening's two fades through a watch (replay-ceremony ui 7), from frames recorded from the first beat on: the
 * opacity the whole trace was drawn at in the first beat's last frame and in the path's first (no cut between them),
 * how it went down from there (its largest fall between two frames, and whether it ever rose), when it was gone, and
 * the walker's dot coming in (the values seen between none and whole). Time is counted only while not held.
 */
function fadesOf(frames) {
  const first = frames.findIndex((f) => f.cam);
  if (first < 0) return null;
  const told = frames.slice(first).filter((f) => f.cam);
  const num = (v) => (v === '' || v == null ? null : Number(v));
  const before = frames.slice(0, first).map((f) => num(f.traceShown)).filter((v) => v != null).pop() ?? null;
  let t = 0;
  let fall = 0;
  let rose = 0;
  let goneS = null;
  let wholeS = null;
  const marks = new Set();
  for (let i = 0; i < told.length; i++) {
    if (i > 0 && !told[i].held && !told[i - 1].held) t += told[i].t - told[i - 1].t;
    if (t > 4000) break;
    const a = num(told[i].traceShown);
    const b = i > 0 ? num(told[i - 1].traceShown) : a;
    if (a != null && b != null) { fall = Math.max(fall, b - a); if (a > b + 1e-6) rose++; }
    if (goneS == null && a === 0) goneS = Math.round(t / 10) / 100;
    const m = told[i].puckFade;
    if (m != null && m > 0.02 && m < 0.98) marks.add(Math.round(m * 100) / 100);
    if (wholeS == null && m != null && m >= 0.999) wholeS = Math.round(t / 10) / 100;
  }
  const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
  return { before: r2(before), first: r2(num(told[0].traceShown)), firstMark: told[0].puckFade, fall: r2(fall), rose, goneS, between: marks.size, wholeS };
}

/**
 * The white edge under a hop's dots through a watch (replay-ceremony ui 6): its opacity while the path is told (every
 * value seen), and once the card is there.
 */
function hopEdgeOf(frames) {
  const first = frames.findIndex((f) => f.cam);
  if (first < 0) return null;
  const last = frames.length - 1 - [...frames].reverse().findIndex((f) => f.cam);
  const told = [...new Set(frames.slice(first, last + 1).map((f) => f.hopEdge))];
  const after = frames.slice(last + 1).map((f) => f.hopEdge).filter((v) => v !== '').pop() ?? null;
  return { told, after };
}

/**
 * What the last view shows (replay ceremony RC25, RC26), read in the page: the date, the names of places passed, any
 * text over the map with a figure in it set larger than body text, and anything in the accent.
 */
const lastViewOf = (pg) => pg.evaluate(() => {
  const shown = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const st = getComputedStyle(n); if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) < 0.05) return false; } return e.getBoundingClientRect().width > 0; };
  const texts = [...document.querySelectorAll('div, span')].filter((e) => !e.closest('.maplibregl-map') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && shown(e));
  const date = document.querySelector('[data-testid=replay-date]');
  const names = [...document.querySelectorAll('[data-testid=replay-passed]')].filter(shown);
  // As seen: an element's own opacity through every element it stands in.
  const seen = (e) => { let o = 1; for (let n = e; n && n.nodeType === 1; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return Math.round(o * 100) / 100; };
  const box = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
  const styled = (e) => { const st = getComputedStyle(e); return { text: e.textContent.trim(), size: parseFloat(st.fontSize), ink: st.color, opacity: seen(e), box: box(e), cut: e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1 }; };
  return {
    date: date && shown(date) ? styled(date) : null, names: names.map(styled),
    // What stands on the map: the pictures the replay drew, as seen.
    pictures: [...document.querySelectorAll('[data-testid=replay-picture]')].filter(shown).map(box),
    // Each picture's own control (replay-ceremony ui 1): whether it shows, whether it takes a tap, how big its target is.
    taps: [...document.querySelectorAll('[data-testid=replay-picture]')].map((e) => {
      const ctl = e.querySelector('[data-testid=picture-open]');
      const b = ctl ? ctl.getBoundingClientRect() : null;
      return { key: e.getAttribute('data-key'), shown: Number(e.style.opacity || 1) > 0.5, takes: !!ctl && getComputedStyle(ctl).pointerEvents !== 'none', role: ctl?.getAttribute('role') ?? null, name: ctl?.getAttribute('aria-label') ?? null, w: b ? Math.round(b.width) : 0, h: b ? Math.round(b.height) : 0 };
    }),
    // The mark on each named place itself.
    dots: [...document.querySelectorAll('[data-testid=replay-passed-dot]')].filter(shown).map(box),
    // The top row's controls: the date stands between them.
    hold: (() => { const e = document.querySelector('[data-testid=hold]'); return e ? box(e) : null; })(), skip: (() => { const e = document.querySelector('[data-testid=skip], [data-testid=day-skip]'); return e ? box(e) : null; })(),
    bigFigures: texts.filter((e) => /\d/.test(e.textContent) && parseFloat(getComputedStyle(e).fontSize) > 16).map((e) => e.textContent.trim()),
    accent: texts.filter((e) => getComputedStyle(e).color === 'rgb(194, 65, 12)').map((e) => e.textContent.trim()),
    clock: !!document.querySelector('[data-testid=replay-clock]'),
  };
});

async function run(h) {
  const { navUrl, BASE, at, check, shot, freshPage, openWalk, errors, toStop } = h;
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
      // React's commits, the app's root and the pins' own roots apart (replay ceremony RC7).
      window.__commits = [0, 0];
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true, renderers: new Map(), isDisabled: false,
        inject(r) { const id = this.renderers.size + 1; this.renderers.set(id, r); return id; },
        onCommitFiberRoot(id, root) { window.__commits[root && root.containerInfo && root.containerInfo.id === 'root' ? 0 : 1]++; },
        onPostCommitFiberRoot() {}, onCommitFiberUnmount() {}, onScheduleFiberRoot() {}, checkDCE() {}, setStrictMode() {},
      };
      // Every collection a map sends to its worker ('LD'), by map and source: one the same as the last, or empty after
      // empty, is told to the journey (replay ceremony RC4). A source's first, empty, is its making.
      const W = window.Worker;
      const lastSent = new Map();
      let sends = 0;
      let told = 0;
      window.Worker = class extends W {
        postMessage(m, t) {
          if (m && m.type === 'LD' && m.data && m.data.source) {
            const d = m.data.data;
            const body = typeof d === 'string' ? d : JSON.stringify(d ?? null);
            const key = `${m.sourceMapId}:${m.data.source}`;
            sends++;
            if (lastSent.get(key) === body && told < 40) {
              told++;
              window.__sentAgain?.(`${m.data.source}${/"features":\[\]/.test(body) ? ' (empty)' : ''} on ${location.pathname}`);
            }
            lastSent.set(key, body);
          }
          return super.postMessage(m, t);
        }
      };
      window.setInterval(() => window.__sentCount?.(sends), 1000);
    });
    const sentAgain = [];
    let sentInAll = 0;
    let sentBefore = 0;
    await c.exposeFunction('__sentAgain', (what) => { sentAgain.push(what); });
    // Each page counts from 0 again: a count that falls back is a reload.
    let sentHere = 0;
    await c.exposeFunction('__sentCount', (n) => {
      if (n < sentHere) sentBefore += sentHere;
      sentHere = n;
      sentInAll = sentBefore + sentHere;
    });
    // The walk (scripts/e2e/replayWalk.js, shared with scripts/perf-replay.js): 600 m east along Transit Street, a photo
    // early on and a note at the end; 20 min with no fixes; 40 m more and a memo; 4 min with no fixes and 38 m on, a
    // break too small to see. Stopped, so its first replay opens.
    const { here, places } = await seedReplayWalk(h, c, pg);
    const min = 60_000;
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
        // The viewer (the stack opened) has its own "1 of 2"; the path itself counts nothing.
        const m = document.querySelector('[data-testid=viewer-close]') ? null : /\b\d+ of \d+\b/.exec(document.body.innerText);
        if (m) add(window.__rrSeen.counted, m[0]);
      }, 50);
    });

    const clockNow = () => pg.locator('[data-testid=replay-clock]').getAttribute('aria-label').catch(() => null);
    const clocks = new Set();
    const seen = { note: false, card: false, later: '', counted: '' };
    let holdChecked = false;
    let tapChecked = false;
    let stackChecked = false;
    let stackSeen = null;
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
      if (!stackChecked && (await pg.locator('[data-testid=stack-entry]').count()) >= 2 && !(await pg.locator('[data-testid=replay-card]').count())) {
        // RC31: the stack is one control, 44 px or more, named for a screen reader; it opens the photos so far at the
        // latest, and the replay holds until the viewer closes. It shows no number (RC30, RC45).
        const ctl = await pg.evaluate(() => {
          const e = document.querySelector('[data-testid=replay-stack]');
          const b = e.getBoundingClientRect();
          return { role: e.getAttribute('role'), name: e.getAttribute('aria-label'), w: Math.round(b.width), h: Math.round(b.height), text: e.innerText.trim(), buttons: document.querySelectorAll('[data-testid=replay-stack] [role=button]').length, entries: document.querySelectorAll('[data-testid=stack-entry]').length, right: Math.round(window.innerWidth - b.right) };
        });
        await shot(pg, 'rc-stack-390');
        await pg.click('[data-testid=replay-stack]');
        const open = await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 5000 }).then(() => true, () => false);
        const latest = await pg.waitForSelector('[aria-label="Caption: Green gate"]', { timeout: 3000 }).then(() => true, () => false);
        const a = [await clockNow(), await pg.locator('[data-walker]').first().getAttribute('data-walker')].join(' @ ');
        await pg.waitForTimeout(1200);
        const bb = [await clockNow(), await pg.locator('[data-walker]').first().getAttribute('data-walker')].join(' @ ');
        await pg.click('[data-testid=viewer-close]').catch(() => {});
        stackSeen = { ...ctl, open, latest, held: a === bb };
        stackChecked = true;
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
        // Opening the stack mid-video pauses the video too, not only the clock (replay-rhythm audit 4).
        const before = await pg.evaluate(() => window.__media.length);
        await pg.click('[data-testid=replay-stack]');
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
    // The pile is the stack now (replay ceremony RC29-RC31): what the pile's checks held, the stack's hold.
    check(stackChecked, 'RR11: the photo shrinks away and is in the stack');
    check(!!stackSeen && !/[\d\p{L}]/u.test(stackSeen.text), `RR19: the stack shows no count ("${stackSeen && stackSeen.text}")`);
    check(!!stackSeen && stackSeen.open && stackSeen.held, `RR13: the stack opens the viewer and the replay holds (${JSON.stringify(stackSeen)})`);
    check(!!stackSeen && stackSeen.latest, 'replay-rhythm audit 7: the stack opens at its latest photo');
    check(!!stackSeen && stackSeen.role === 'button' && stackSeen.name === 'Photos and videos so far' && stackSeen.w >= 44 && stackSeen.h >= 44 && stackSeen.buttons === 0 && stackSeen.open && stackSeen.latest && stackSeen.held, `RC31: the stack is one control of 44 px or more, named "Photos and videos so far", that opens them at the latest while the replay holds (${JSON.stringify(stackSeen)})`);
    check(!!stackSeen && stackSeen.entries >= 2 && !/[\d\p{L}]/u.test(stackSeen.text) && !/\d/.test(stackSeen.name ?? '0'), `RC45: the stack shows no numeral, in what it draws or in its name (${JSON.stringify(stackSeen)})`);
    // The cut went with replay ceremony RC17-RC20: the gap is crossed by a hop and the small one is a stand, each said.
    check(/^20 min later \| 4 min later$/.test(seen.later), `RR4: each break is said under the clock, "20 min later" and "4 min later" ("${seen.later}")`);
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
    // tend replay T19 (decision 0165, "Clauses, one hint"): what the walk kept is one clause in words, and the hint is a
    // line of its own, worded as the day's card words it.
    const keptLine = await pg.evaluate(() => {
      const e = document.querySelector('[data-testid=card-kept]');
      const card = e && e.closest('[data-testid=card-kept]')?.parentElement;
      return { kept: e?.textContent ?? null, hint: !!card && [...card.querySelectorAll('div, span')].some((x) => x.textContent === 'Tap a pin to open it'), lower: !!card && /tap a pin to open(?! it)/.test(card.textContent) };
    });
    check(/^(A|An|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)[ \u00a0]/.test(keptLine.kept ?? '') && /photo|video|voice memo|note/.test(keptLine.kept) && !/\d|·/.test(keptLine.kept) && keptLine.hint && !keptLine.lower,
      `tend replay T19: the walk's card says what it kept as one clause in words, the hint "Tap a pin to open it" on its own line (${JSON.stringify(keptLine)})`);
    // tend tabs 11 (decision 0172, O18): the card's More is named by the title the card shows, as the walk's row is.
    const cardMore = await pg.evaluate(() => {
      const more = document.querySelector('[data-testid=card-more]');
      const head = more?.parentElement?.querySelector('[role=heading]');
      return { name: more?.getAttribute('aria-label') ?? null, title: head?.textContent?.trim() ?? null };
    });
    check(!!cardMore.title && cardMore.name === `More for ${cardMore.title}`, `tend tabs 11: the walk's card names its More by the title it shows (${JSON.stringify(cardMore)})`);
    // tend replay audit 10: the hint is the card's last line before its buttons, as on the day's card.
    const hintAt = await pg.evaluate(() => {
      const again = [...document.querySelectorAll('[role=button]')].find((b) => b.textContent.trim() === 'Watch again');
      const row = again?.parentElement;
      let prev = row?.previousElementSibling;
      while (prev && !prev.textContent.trim()) prev = prev.previousElementSibling;
      const pins = document.querySelectorAll('.maplibregl-map [aria-label$=". Open"]').length;
      const hint = [...document.querySelectorAll('div, span')].some((x) => x.textContent === 'Tap a pin to open it');
      return { before: prev?.textContent ?? null, pins, hint };
    });
    check(hintAt.before === 'Tap a pin to open it', `tend replay audit 10: the walk's card ends on its hint, right above its buttons (${JSON.stringify(hintAt)})`);
    check(hintAt.hint === hintAt.pins > 0, `tend replay audit 11: the walk's card gives its hint only with a pin on its map (${JSON.stringify(hintAt)})`);
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

    // tend replay T21 (decision 0165, "A quiet Back"): the name sheet's top row holds a quiet Back in Not now's style, no
    // new colour, a 44 px target above the first field, and it returns to the card with the words kept; at 390 and 320.
    for (const [w, ht] of [[390, 844], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.click('[data-testid=to-name]');
      await pg.fill('[data-testid=title-input]', 'Plums by the bridge');
      await pg.waitForTimeout(300);
      const back = await pg.evaluate(() => {
        const b = document.querySelector('[data-testid=name-back]');
        const label = document.getElementById('title-label');
        if (!b || !label) return null;
        const r = b.getBoundingClientRect();
        const text = [...b.querySelectorAll('*')].find((x) => x.childElementCount === 0 && x.textContent === 'Back');
        const ink = text ? getComputedStyle(text).color : null;
        // The chevron (tend replay audit 16): the icon font's glyph, before the word.
        const glyph = [...b.querySelectorAll('*')].find((x) => x.childElementCount === 0 && /ionicons/i.test(getComputedStyle(x).fontFamily));
        return {
          word: text ? text.textContent : null, w: Math.round(r.width), h: Math.round(r.height),
          left: Math.round(r.left), above: r.bottom <= label.getBoundingClientRect().top + 1, ink, muted: getComputedStyle(label).color,
          chevronInk: glyph ? getComputedStyle(glyph).color : null,
          chevronFirst: !!glyph && !!text && glyph.getBoundingClientRect().right <= text.getBoundingClientRect().left + 1,
          ground: getComputedStyle(b).backgroundColor,
        };
      });
      // The field labels are theme.muted, Not now's ink: the Back's word and chevron take that ink, no new colour.
      check(back && back.word === 'Back' && back.h >= 44 && back.w >= 44 && back.left >= 0 && back.above && back.ink === back.muted && back.ink !== 'rgb(194, 65, 12)' && /rgba\(0, 0, 0, 0\)|transparent/.test(back.ground),
        `tend replay T21: at ${w} px the name sheet's top row holds a quiet Back, 44 px, in the muted ink, no ground (${JSON.stringify(back)})`);
      check(back && back.chevronInk === back.muted && back.chevronFirst,
        `tend replay audit 16: at ${w} px a muted back chevron stands before "Back" (${JSON.stringify(back)})`);
      await shot(pg, `rr-name-back-${w}`);
      await pg.click('[data-testid=name-back]');
      const onCardAgain = await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).then(() => true, () => false);
      const stillHere = /\/replay\//.test(new URL(pg.url()).pathname);
      // After Back the card shows the name typed, unsaved, and its More is named by it (tend replay audit 16, tend tabs 11).
      const shown = await pg.evaluate(() => {
        const more = document.querySelector('[data-testid=card-more]');
        const head = more?.parentElement?.querySelector('[role=heading]');
        return { title: head?.textContent?.trim() ?? null, more: more?.getAttribute('aria-label') ?? null };
      });
      check(shown.title === 'Plums by the bridge' && shown.more === 'More for Plums by the bridge',
        `tend replay audit 16: at ${w} px after Back the card's title is the name typed, unsaved (${JSON.stringify(shown)})`);
      await shot(pg, `rr-card-typed-${w}`);
      await pg.click('[data-testid=to-name]').catch(() => {});
      const keptBack = await pg.inputValue('[data-testid=title-input]').catch(() => null);
      check(onCardAgain && stillHere && keptBack === 'Plums by the bridge', `tend replay T21: at ${w} px Back returns to the card, the words kept (${onCardAgain}, ${stillHere}, "${keptBack}")`);
      await pg.click('[data-testid=name-back]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).catch(() => {});
      // tend replay 15 (the owner's "Ask there too", Nov 16): Escape twice with words typed, the name step to the card and
      // then out, asks "Discard these edits?" in Rename's words, the fields and their words above it; Enter (a phone's
      // Done) while it asks is Keep editing, and so is Escape; Keep editing stays with the words.
      const askState = () => pg.evaluate(() => {
        const ask = document.querySelector('[data-testid=name-ask]');
        const btn = (id) => document.querySelector(`[data-testid=${id}]`)?.textContent ?? null;
        const r = ask?.getBoundingClientRect();
        return {
          ask: ask ? ask.textContent : null, keep: btn('name-keep'), discard: btn('name-discard'), back: !!document.querySelector('[data-testid=name-back]'),
          save: !!document.querySelector('[data-testid=save]'), field: document.querySelector('[data-testid=title-input]')?.value ?? null,
          inside: !!r && r.left >= 0 && r.right <= window.innerWidth, replay: /\/replay\//.test(location.pathname),
        };
      });
      await pg.click('[data-testid=to-name]');
      await pg.keyboard.press('Escape');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).catch(() => {});
      await pg.keyboard.press('Escape');
      await pg.waitForSelector('[data-testid=name-ask]', { timeout: 3000 }).catch(() => {});
      const asked = await askState();
      check(asked.replay && /^Discard these edits\?/.test(asked.ask ?? '') && asked.keep === 'Keep editing' && asked.discard === 'Discard' && !asked.back && !asked.save && asked.field === 'Plums by the bridge' && asked.inside,
        `tend replay 15: at ${w} px Escape twice with words typed asks "Discard these edits?" over the words, Keep editing and Discard in Keep it's place (${JSON.stringify(asked)})`);
      await shot(pg, `rr-name-ask-${w}`);
      await pg.click('[data-testid=epilogue-input]');
      await pg.keyboard.press('Enter');
      await pg.waitForTimeout(400);
      const entered = await askState();
      check(entered.replay && !entered.ask && entered.save && entered.back && entered.field === 'Plums by the bridge',
        `tend replay 15: at ${w} px Enter while it asks is Keep editing, nothing stored and nothing left (${JSON.stringify(entered)})`);
      await pg.keyboard.press('Escape');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).catch(() => {});
      await pg.keyboard.press('Escape');
      await pg.waitForSelector('[data-testid=name-ask]', { timeout: 3000 }).catch(() => {});
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(400);
      const escaped = await askState();
      check(escaped.replay && !escaped.ask && escaped.save && escaped.field === 'Plums by the bridge',
        `tend replay 15: at ${w} px Escape while it asks is Keep editing (${JSON.stringify(escaped)})`);
      await pg.keyboard.press('Escape');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).catch(() => {});
      await pg.keyboard.press('Escape');
      await pg.waitForSelector('[data-testid=name-ask]', { timeout: 3000 }).catch(() => {});
      await pg.click('[data-testid=name-keep]').catch(() => {});
      await pg.waitForTimeout(400);
      const kept15 = await askState();
      check(kept15.replay && !kept15.ask && kept15.save && kept15.field === 'Plums by the bridge',
        `tend replay 15: at ${w} px Keep editing stays on the name step with the words (${JSON.stringify(kept15)})`);
      await pg.click('[data-testid=name-back]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).catch(() => {});
    }
    await pg.setViewportSize({ width: 390, height: 844 });

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
      check(hb && sb && hb.y >= sb.y + sb.height + 8 - 0.5, `tend replay audit 6: at ${w} px the fog's headline starts 8 px below Skip (headline ${hb && hb.y}, Skip's foot ${sb && sb.y + sb.height})`);
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
      await shot(pg, `rr-beat-${w}`);
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
      // The walk's card at this width, once its title shows, its map drawing both ends of the walk (tend map audit 11:
      // these pictures showed a moment's beat, so no 320 or 375 picture held either marker). This page has no
      // window.__project (only contexts with window.__perf do), so where the ends stand is the picture's to show.
      const titled = await pg.waitForFunction(() => {
        const more = document.querySelector('[data-testid=card-more]');
        const head = more && more.parentElement && more.parentElement.querySelector('[role=heading]');
        return !!(head && head.textContent && head.textContent.trim());
      }, null, { timeout: 15000 }).then(() => true, () => false);
      await pg.waitForTimeout(600);
      const endsHere = await pg.evaluate(() => {
        const els = [...document.querySelectorAll('[data-ends]')].filter((e) => !e.closest('[aria-hidden=true]'));
        return els.length ? els[els.length - 1].getAttribute('data-ends') : null;
      });
      const [endA, endB] = (endsHere ?? '').split('|');
      check(titled && /^-?\d/.test(endA ?? '') && /^-?\d/.test(endB ?? ''),
        `tend map audit 11: at ${w} px the walk's card is up with its title, its map drawing both ends of the walk (data-ends ${JSON.stringify(endsHere)})`);
      await shot(pg, `rr-card-${w}`);
    }
    // Replay pace (RY12, RY13, RY17, RY18; decision 0203): the next-moment button beside Skip, on a re-watch, at 390 and
    // at 320 px. The seeded walk has four moments, so the button has somewhere to go (the steward's S6).
    for (const [w, ht] of [[390, 844], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.getByText('Watch again').click();
      await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(400);
      const controls = () => pg.evaluate(() => {
        const one = (id) => {
          const e = document.querySelector(`[data-testid=${id}]`);
          if (!e) return null;
          const b = e.getBoundingClientRect();
          const st = getComputedStyle(e);
          return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), edge: `${st.borderTopWidth} ${st.borderTopColor}`, ground: st.backgroundColor, name: e.getAttribute('aria-label'), text: (e.textContent || '').trim() };
        };
        return { next: one('next-moment'), skip: one('skip'), hold: one('hold'), bars: document.querySelectorAll('[role=progressbar]').length, counted: (/\b\d+ of \d+\b/.exec(document.body.innerText) || [null])[0] };
      });
      const row = await controls();
      const nb = row.next;
      const sb = row.skip;
      // Under Skip, at the same edge: the clock sits between Hold and Skip, and the three do not fit one row on a 375 px phone.
      check(!!nb && !!sb && nb.w >= 44 && nb.h >= 44 && nb.y >= sb.y + sb.h && nb.y - (sb.y + sb.h) <= 16 && Math.abs(nb.x + nb.w - (sb.x + sb.w)) <= 2 && nb.x >= 0 && nb.x + nb.w <= w
        && nb.name === 'Next moment' && nb.text === 'Next' && nb.edge === sb.edge && nb.ground === sb.ground && !!row.hold && row.hold.x + row.hold.w <= nb.x,
        `RY12: at ${w} px the replay's controls have a Next button with Skip, right under it, 44 px, in Skip's outline, named "Next moment" for a screen reader (${JSON.stringify(row)})`);
      await shot(pg, `ry-next-${w}`);
      // The cold find took a bare chevron for something else and tapped Skip first (Nov 18): the button says its word.
      check(!!nb && nb.text === 'Next', `replay-pace ui 1: at ${w} px the next-moment button says "Next" ("${nb && nb.text}")`);
      // A press: the walker is at the next moment and its first piece comes (RY13); nothing counts (RY18).
      const walkerAt = () => pg.locator('[data-walker]').first().getAttribute('data-walker').catch(() => null);
      const before = await walkerAt();
      const pressed = nb ? await pg.click('[data-testid=next-moment]', { timeout: 2000 }).then(() => true, () => false) : false;
      const came = pressed && (await pg.waitForSelector('[data-testid=replay-card], [data-testid=replay-note], [data-testid=memo-bubble]', { timeout: 2500 }).then(() => true, () => false));
      const after = await walkerAt();
      check(pressed && came && before !== after, `RY13: at ${w} px a press goes to the next moment, which then plays (pressed ${pressed}, its piece came ${came}, walker ${before} → ${after})`);
      await shot(pg, `ry-next-landed-${w}`);
      const then = await controls();
      const words = [then.next, then.skip, then.hold].map((b) => (b ? b.text : '')).join(' ').replace(/[^\x20-\x7e]/g, '');
      check(pressed && then.bars === 0 && !then.counted && !/\d/.test(words), `RY18: at ${w} px nothing counts with the button, before or after a press (bars ${then.bars}, "${then.counted}", "${words}")`);
      // Pressed on until nothing lies ahead: the button goes, and Skip is still the way to the card (RY17).
      let presses = 0;
      while (presses < 8 && (await pg.locator('[data-testid=next-moment]').count())) {
        await pg.click('[data-testid=next-moment]', { timeout: 2000 }).catch(() => {});
        presses++;
        await pg.waitForTimeout(250);
      }
      const gone = (await pg.locator('[data-testid=next-moment]').count()) === 0;
      const skipStays = (await pg.locator('[data-testid=skip]').count()) === 1;
      check(pressed && gone && skipStays && presses >= 1 && presses <= 5, `RY17: at ${w} px with no moment ahead the button is not shown and Skip stays (${presses} more presses, gone ${gone}, Skip ${skipStays})`);
      await shot(pg, `ry-next-none-${w}`);
      // RC27: Skip goes to the card at once, as today: pressed on the last view, while the camera pulls back, too.
      const closing = await pg.waitForFunction(() => { const e = document.querySelector('[data-testid=replay-date]'); return !!e && Number(getComputedStyle(e).opacity) > 0.3; }, null, { timeout: 45000 }).then(() => true, () => false);
      const skipAt = Date.now();
      await pg.click('[data-testid=skip]').catch(() => {});
      const skipped = await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 }).then(() => Date.now() - skipAt, () => null);
      const stageGone = (await pg.locator('[data-testid=replay-date], [data-testid=replay-clock], [data-testid=replay-stage]').count()) === 0;
      check(closing && skipped != null && skipped <= 1500 && stageGone, `RC27: at ${w} px Skip goes to the card at once, pressed on the last view too (the last view came ${closing}, the card ${skipped} ms after the press, the stage gone ${stageGone})`);
    }
    await pg.setViewportSize({ width: 390, height: 844 });

    {
      // Replay ceremony, the engine (RC1-RC3, RC7; decision 0206): a re-watch with the app's counters on, read frame by
      // frame in the page, with no tap, as far as the note at the end of the first stretch of the walk: two photos' cards,
      // the video's, the stretches between them and the note's bubble coming in.
      await pg.getByText('Watch again').click();
      await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 30000 });
      await recordFrames(pg);
      await pg.waitForSelector('[data-testid=replay-note]', { timeout: 120000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const watched = await stopFrames(pg);
      await shot(pg, 'rc-engine-note');
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      const stretch = stretchOf(watched);
      // RC1: in every frame of the stretch the dot and the end of the walked line are one place, and the map's camera is
      // where that frame put it, the dot on the screen: none of the three a frame behind another. (The camera holds and
      // re-frames now, RC12: it is no longer at the dot.)
      const together = !!stretch && stretch.seconds >= STRETCH_S && stretch.ended >= stretch.frames - 1 && stretch.followed >= stretch.frames - 1 && stretch.line <= 1.5 && stretch.centre <= 1.5 && stretch.off <= 0 && stretch.puck;
      check(together, `RC1: through the path the walker's dot, the end of the walked line and the camera are drawn together in every frame (${stretchSaid(stretch)})`);
      // RC2: nothing arriving or leaving, the screen and the map component are not rendered again as time passes.
      // The counter must be there to be read: the screen rendered at least once in the watch (a pin arriving).
      const rendered = rendersIn(watched);
      const quiet = !!stretch && stretch.seconds >= STRETCH_S && rendered > 0 && stretch.fewRenders;
      check(quiet, `RC2: on a stretch the replay screen and the map component render at most twice a second each (${stretchSaid(stretch)}; the screen rendered ${rendered} times in the watch)`);
      // RC3: nor is anything sent to the map's sources.
      // The engine's own frames are counted too: a stretch where nothing was drawn would send nothing either.
      const unsent = !!stretch && stretch.seconds >= STRETCH_S && stretch.engine >= 10 && stretch.fewSends;
      check(unsent, `RC3: on a stretch nothing is sent to the map's data sources as time passes, at most one send a second (${stretchSaid(stretch)})`);
      // RC7: the card grew from its pin, the note's bubble came in and the clock rolled, frame by frame, with the screen
      // rendered only for what arrived or left; on the stretch React committed next to nothing: three or four times a
      // second (the clock's own leaf at each new minute, the map's view twice a second at the most), where it was 21.
      const moves = (k) => watched.filter((f, i) => i > 0 && f[k] && watched[i - 1][k] && f[k] !== watched[i - 1][k]).length;
      const fades = new Set(watched.map((f) => f.note).filter(Boolean)).size;
      const moved = { card: moves('card'), bubble: fades, clock: moves('clock'), frames: watched.length, screen: rendered, commits: stretch ? stretch.commits : null };
      const offReact = !!stretch && rendered > 0 && moved.card >= 8 && moved.bubble >= 3 && moved.clock >= 2 && moved.screen < moved.frames / 20 && stretch.commits <= 8;
      check(offReact, `RC7: the card, the note's bubble and the clock move without the screen rendering again (${JSON.stringify(moved)})`);

      // RC10: with reduce motion on, the timing is the same and the map stays still (RR18): the first card comes when it
      // did with motion, the walker moving over a map that does not.
      const untilCard = (frames) => {
        const clocked = frames.find((f) => f.clock);
        const carded = frames.find((f) => f.card);
        return clocked && carded ? carded.t - clocked.t : null;
      };
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      await pg.waitForTimeout(300);
      await pg.getByText('Watch again').click();
      await pg.waitForSelector('[data-testid=replay-headline], [data-testid=replay-clock]', { timeout: 30000 });
      await recordFrames(pg);
      await pg.waitForSelector('[data-testid=replay-card]', { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(600);
      const stillFrames = await stopFrames(pg);
      await shot(pg, 'rc-engine-reduced');
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await pg.emulateMedia({ reducedMotion: 'no-preference' });
      const onPath = stillFrames.filter((f) => f.clock);
      const still = {
        centres: new Set(onPath.map((f) => f.centre)).size, walkers: new Set(onPath.map((f) => f.walker).filter(Boolean)).size,
        engine: onPath.length ? onPath[onPath.length - 1].engine - onPath[0].engine : 0, puck: onPath.some((f) => f.puck),
        card: untilCard(stillFrames),
      };
      // RC36, RC35 with reduce motion: the photo in its card does not drift, and the dim does not fade: there or not.
      const stillDrift = stillFrames.filter((f) => f.drift != null).map((f) => f.drift);
      const stillScrims = [...new Set(stillFrames.filter((f) => f.scrim != null).map((f) => Math.round(f.scrim * 1000) / 1000))];
      check(stillDrift.length >= 5 && stillDrift.every((d) => d === 1), `RC36: with reduce motion a held photo does not drift (${stillDrift.length} frames, ${[...new Set(stillDrift)].join(', ')})`);
      check(stillScrims.length === 2 && stillScrims.includes(0) && stillScrims.includes(0.2), `RC35: with reduce motion the dim under a card does not fade: there or not (${stillScrims.join(', ')})`);
      check(still.centres === 1 && still.walkers >= 10 && still.engine >= 10 && still.puck && still.card != null,
        `RC10: with reduce motion on the map stays still and the walker moves over it, on the same engine, to the first card (${JSON.stringify(still)})`);

      // RC22: with reduce motion a break is one still view with both ends and the hop drawn. Next to the note, then the
      // break by itself: the map does not move, the hop is whole from its first frame, the walker is at one end and then
      // the other, and the line is said for as long as with motion.
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      await pg.waitForTimeout(300);
      await pg.getByText('Watch again').click();
      await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 30000 });
      for (let k = 0; k < 4 && !(await pg.locator('[data-testid=replay-note]').count()); k++) {
        await pg.click('[data-testid=next-moment]', { timeout: 2000 }).catch(() => {});
        await pg.waitForTimeout(700);
      }
      await recordFrames(pg);
      await pg.waitForFunction(() => document.querySelector('[data-testid=replay-later]')?.textContent === '20 min later', null, { timeout: 60000 }).catch(() => {});
      await pg.waitForTimeout(900);
      await shot(pg, 'rc-hop-reduced');
      await pg.waitForSelector('[data-testid=memo-bubble]', { timeout: 30000 }).catch(() => {});
      const reduced = (await stopFrames(pg)).filter((f) => f.clock);
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await pg.emulateMedia({ reducedMotion: 'no-preference' });
      const hopped = reduced.filter((f) => f.hops);
      const saidReduced = reduced.filter((f) => f.later === '20 min later');
      const one = {
        frames: reduced.length, centres: new Set(reduced.map((f) => f.centre)).size, hopFrames: hopped.length, partial: hopped.filter((f) => !/@1\.000$/.test(f.hops)).length,
        between: hopped.filter((f) => { const m = /^(-?[\d.]+),[^>]*>(-?[\d.]+),/.exec(f.hops); const x = lonLat(f.walker)?.[0]; return !!m && x != null && x > Number(m[1]) + 1e-6 && x < Number(m[2]) - 1e-6; }).length, saidS: saidReduced.length > 1 ? Math.round((saidReduced[saidReduced.length - 1].t - saidReduced[0].t) / 10) / 100 : 0,
        veiled: reduced.filter((f) => f.veil).length,
      };
      const stillOk = one.frames > 100 && one.centres === 1 && one.hopFrames >= 30 && one.partial === 0 && one.between === 0 && one.saidS >= 3.0 && one.saidS <= 4.1 && one.veiled === 0;
      check(stillOk, `RC22: with reduce motion a break is one still view, the hop drawn whole, the walker at one end and then the other, and it lasts as long (${JSON.stringify(one)})`);
    }

    // Replay ceremony, the camera and the breaks (RC11, RC12, RC14, RC17-RC21; decision 0206): a re-watch at 390 and at
    // 320 px, read frame by frame to its card, with a picture of each state: walking at the walking zoom, a card up
    // with its pin under it, the camera re-framing as the walker leaves the card, a break mid-hop, a stand. Hold stands
    // the replay still for each picture.
    for (const [w, ht] of [[390, 844], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.waitForTimeout(300);
      await pg.getByText('Watch again').click();
      // Read from the first beat on (replay ceremony RC23): the path begins from that beat's own view.
      await pg.waitForSelector('[data-testid=replay-headline]', { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(900);
      await recordFrames(pg);
      const pictured = async (name) => {
        await pg.click('[data-testid=hold]').catch(() => {});
        await pg.waitForTimeout(250);
        await shot(pg, `${name}-${w}`);
        await pg.click('[data-testid=hold]').catch(() => {});
      };
      // The opening: the path's first frames, the whole walk as the first beat left it, and the dive part of the way in.
      await pg.waitForFunction(() => !![...document.querySelectorAll('[data-cam]')].pop()?.getAttribute('data-cam'), null, { timeout: 30000 }).catch(() => {});
      await pictured('rc-open');
      await pg.waitForTimeout(700);
      await pictured('rc-dive');
      // The walker coming in as the dive ends (replay-ceremony ui 7): held as soon as any of it shows.
      await pg.waitForFunction(() => { const e = document.querySelector('[data-testid=walker-puck]'); return !!e && e.style.display !== 'none' && Number(e.style.opacity || 1) > 0.05; }, null, { timeout: 15000, polling: 'raf' }).catch(() => {});
      await pictured('rc-dive-walker');
      // Walking, the opening over: the walking zoom.
      await pg.waitForFunction(() => {
        const map = [...document.querySelectorAll('[data-cam]')].pop();
        return !!map && Number((map.getAttribute('data-cam') || '').split(',')[2]) === 15;
      }, null, { timeout: 15000 }).catch(() => {});
      await pictured('rc-walking');
      // The first photo's card at rest, its pin under it.
      await pg.waitForSelector('[data-testid=replay-card]', { timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(1100);
      await pictured('rc-card-pin');
      // The first photo's card gone: its picture standing on its place, its entry at the edge.
      await pg.waitForSelector('[data-testid=replay-card]', { state: 'detached', timeout: 30000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=stack-entry]', { timeout: 5000 }).catch(() => {});
      await pictured('rc-picture-stands');
      // The video's card gone, the walker setting off for the note 100 m on: the camera re-framing.
      await pg.waitForSelector('[data-testid=replay-card][aria-label^=Video]', { timeout: 60000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=replay-card]', { state: 'detached', timeout: 60000 }).catch(() => {});
      await pg.waitForTimeout(150);
      await pictured('rc-reframe');
      await pg.waitForTimeout(400);
      await pictured('rc-stack-three');
      // The place passed without stopping, said as the walker goes by (replay-ceremony ui 5): its words on a ground of
      // their own, clear of the walker's dot, ending short of the stack (ui 3).
      const whispered = await pg.waitForFunction(() => { const e = document.querySelector('[data-testid=replay-whisper]'); return !!e && Number(e.parentElement.style.opacity || 0) > 0.9; }, null, { timeout: 20000, polling: 'raf' }).then(() => true, () => false);
      await pg.click('[data-testid=hold]').catch(() => {});
      await pg.waitForTimeout(250);
      const whisper = await pg.evaluate(() => {
        const e = document.querySelector('[data-testid=replay-whisper]');
        if (!e) return null;
        const box = (n) => { const b = n.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
        const st = getComputedStyle(e);
        const alpha = /rgba\([^)]*,\s*([\d.]+)\)/.exec(st.backgroundColor);
        const puck = document.querySelector('[data-testid=walker-puck]');
        const pb = puck ? puck.getBoundingClientRect() : null;
        const stack = document.querySelector('[data-testid=replay-stack]');
        return {
          text: e.textContent.trim(), box: box(e), ground: st.backgroundColor, solid: /rgb/.test(st.backgroundColor) && !/rgba\(0, 0, 0, 0\)/.test(st.backgroundColor) && (!alpha || Number(alpha[1]) >= 0.9),
          weight: Number(st.fontWeight), halo: st.textShadow, size: parseFloat(st.fontSize),
          dot: pb ? [Math.round(pb.left + pb.width / 2), Math.round(pb.top + pb.height / 2)] : null, stack: stack ? box(stack) : null,
        };
      });
      await shot(pg, `rc-whisper-${w}`);
      await pg.click('[data-testid=hold]').catch(() => {});
      const offDot = !!whisper && !!whisper.dot && (whisper.dot[0] < whisper.box[0] - 9 || whisper.dot[0] > whisper.box[2] + 9 || whisper.dot[1] < whisper.box[1] - 9 || whisper.dot[1] > whisper.box[3] + 9);
      check(whispered && !!whisper && whisper.text === 'Passed Hessian Memorial without stopping' && whisper.solid && whisper.halo === 'none' && whisper.weight < 600 && whisper.size >= 13 && offDot, `replay-ceremony ui 5: at ${w} px a whisper stands on a solid ground, lighter than the last view's name, clear of the walker's dot (${JSON.stringify(whisper)})`);
      check(!!whisper && !!whisper.stack && whisper.box[2] <= whisper.stack[0] - 6 && whisper.box[0] >= 8, `replay-ceremony ui 3: at ${w} px a whisper ends short of the stack (${JSON.stringify(whisper && { box: whisper.box, stack: whisper.stack })})`);
      // The 20-minute gap: its line under the clock once both ends are in view, the walker part of the way across.
      await pg.waitForFunction(() => document.querySelector('[data-testid=replay-later]')?.textContent === '20 min later', null, { timeout: 120000 }).catch(() => {});
      await pg.waitForTimeout(650);
      await pictured('rc-hop');
      // The 4-minute gap, too small to see: a stand.
      await pg.waitForFunction(() => document.querySelector('[data-testid=replay-later]')?.textContent === '4 min later', null, { timeout: 45000 }).catch(() => {});
      await pg.waitForTimeout(300);
      await pictured('rc-stand');
      // The last view (replay ceremony RC24-RC26): the walk whole above where the card will sit, its date under the
      // top row; pictured with no hold, so the close's own times are read as they ran.
      const dated = await pg.waitForFunction(() => { const e = document.querySelector('[data-testid=replay-date]'); return !!e && Number(getComputedStyle(e).opacity) > 0.98; }, null, { timeout: 30000 }).then(() => true, () => false);
      const lastView = await lastViewOf(pg);
      await shot(pg, `rc-last-${w}`);
      // On to the card, by itself, and a little past its arrival: the map must not move under it.
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 60000 }).catch(() => {});
      await pg.waitForTimeout(1200);
      const seenFrames = await stopFrames(pg);
      await shot(pg, `rc-card-after-${w}`);
      const ends = bookendsOf(seenFrames);
      const endsSaid = JSON.stringify(ends);
      // The opening does not cut (replay-ceremony ui 7): the path's first frame draws the whole trace as faint as the
      // first beat left it, it fades from there and is gone before the dive is over, and the walker's dot fades in.
      const fades = fadesOf(seenFrames);
      check(!!fades && fades.before === 0.3 && fades.first === 0.3 && fades.rose === 0 && fades.fall <= 0.1 && fades.goneS != null && fades.goneS >= 1.2 && fades.goneS <= 2.4 && (fades.firstMark == null || fades.firstMark === 0) && fades.between >= 2 && fades.wholeS != null && fades.wholeS >= 1.9 && fades.wholeS <= 3.0, `replay-ceremony ui 7: at ${w} px through the dive the first beat's faint trace fades out and the walker fades in, neither cutting (${JSON.stringify(fades)})`);
      // A hop's dots stand on a white edge while the path is told, and on the card the links are as they were (ui 6).
      const hopEdge = hopEdgeOf(seenFrames);
      check(!!hopEdge && hopEdge.told.length === 1 && Number(hopEdge.told[0]) >= 0.5 && Number(hopEdge.after) === 0, `replay-ceremony ui 6: at ${w} px a hop's dots have their white edge through the path and none on the card (${JSON.stringify(hopEdge)})`);
      // On the last view the earlier of the two photos is under the later: it takes no tap, the one showing does (ui 1).
      const lastTaps = lastView.taps ?? [];
      const tapOf = (k) => lastTaps.find((x) => x.key === k);
      check(lastTaps.length === 3 && !!tapOf('rr-photo') && !tapOf('rr-photo').shown && !tapOf('rr-photo').takes && tapOf('rr-photo-2').shown && tapOf('rr-photo-2').takes && tapOf('rr-video').takes && lastTaps.every((x) => x.w >= 44 && x.h >= 44 && x.role === 'button' && x.name === 'Open this moment'), `replay-ceremony ui 1: at ${w} px each standing picture is a 44 px control named in plain words, and one under a later picture takes no tap (${JSON.stringify(lastTaps)})`);
      // What stays behind and a moment on screen (RC28-RC30, RC34-RC36), from the same frames.
      const stays = staysOf(seenFrames, places, ['rr-photo', 'rr-photo-2', 'rr-video']);
      const landed = Object.values(stays.landed);
      check(landed.length === 3 && landed.every((x) => x.cardW <= 60 && x.cardToPicture != null && x.cardToPicture <= 14 && x.footToPlace <= 6 && x.cardAt[0] < w - 80), `RC28: at ${w} px each card shrinks onto its own place on the map, where its picture then stands, not into a corner (${JSON.stringify(stays.landed)})`);
      check(stays.entries.map((e) => e.n).join(',') === '1,2,3' && stays.entries[2].keys.join(',') === 'rr-photo,rr-photo-2,rr-video' && stays.grewUp, `RC29: at ${w} px the stack gathers one entry for each moment with a picture or a video, each as its card lands, the newest on top (${JSON.stringify(stays.entries)}, upward ${stays.grewUp})`);
      check(stays.entries.length === 3 && stays.stackTexts.length === 0 && stays.overlaps.length === 0 && !!stays.control && stays.control.w >= 44, `RC30: at ${w} px the stack shows no number and never meets a card, a bubble or the line under the clock (texts ${JSON.stringify(stays.stackTexts)}, met ${JSON.stringify(stays.overlaps)}, ${JSON.stringify(stays.control)})`);
      // RC34: three pictures stand through the path and on the last view, where the two photos, a few px apart with the
      // walk whole, are one place: the later shows, with a layered edge. The map draws no pin for them until the card.
      const [door, gate, vid] = ['rr-photo', 'rr-photo-2', 'rr-video'].map((k) => (stays.last ?? []).find((p) => p.key === k));
      const pinsOnCard = await pg.evaluate(() => [...document.querySelectorAll('.maplibregl-map [data-ids]')].filter((e) => /rr-photo|rr-video/.test(e.getAttribute('data-ids'))).length);
      check(stays.pictures === 3 && stays.pinsOfPictured === 0 && !!door && !!gate && !!vid && !door.shown && gate.shown && gate.layered && vid.shown && pinsOnCard >= 1, `RC34: at ${w} px each moment with a picture or a video stands as that picture at its place, the later of two close together showing with a layered edge, and the map's own pins for them wait for the card (${JSON.stringify(stays.last)}; pins of theirs on the path's map ${stays.pinsOfPictured}, on the card's ${pinsOnCard})`);
      // RC35: the map dims by a fifth under a card at rest, and not at all with none up, a break among them.
      check(stays.scrim.up >= 30 && Math.abs(stays.scrim.upMax - 0.2) < 0.005 && stays.scrim.upMin >= 0.19 && stays.scrim.off >= 100 && stays.scrim.offMax <= 0.001 && stays.scrim.inBreak === 0, `RC35: at ${w} px the map under a card dims by a fifth, and not at all with no card up (${JSON.stringify(stays.scrim)})`);
      // RC36: a held photo drifts closer by 3%, and no more.
      check(!!stays.drift && stays.drift.min <= 1.004 && stays.drift.max >= 1.02 && stays.drift.max <= 1.0301, `RC36: at ${w} px a photo held in its card drifts 3% closer (${JSON.stringify(stays.drift)})`);
      // RC23: the path's first frame is the first beat's own view (no cut), the camera only ever closes in from it (no
      // second overview), and it is down at the walking zoom 2.2 s on.
      const op = ends.opened;
      check(!!op && op.cutPx != null && op.cutPx <= 2 && op.cutZoom <= 0.02 && op.fromZoom < 14.6 && op.back === 0 && op.diveS >= 1.9 && op.diveS <= 3.0, `RC23: at ${w} px the path begins from the first beat's own view and dives to the walker's start in 2.2 s, no cut and no second overview (${endsSaid})`);
      // RC24: the walker stands, the camera pulls back in 3 s and holds 2 s, and the card's arrival moves nothing.
      const cl = ends.closed;
      check(!!cl && cl.stoodS >= 1.4 && cl.stoodS <= 3.4 && cl.pullS >= 2.6 && cl.pullS <= 3.8 && cl.holdS >= 1.7 && cl.holdS <= 2.8 && cl.toZoom < cl.fromZoom - 0.3 && cl.after >= 10 && cl.movedPx <= 2 && cl.movedZoom <= 0.02, `RC24: at ${w} px the walker stands, the camera pulls back in 3 s to the card's view and holds it 2 s, and the card arrives without the map moving (${endsSaid})`);
      // RC26: the last view shows the date in ink no larger than body text; the clock's figures are gone, and nothing
      // on it is in the accent.
      check(dated && !!lastView.date && /^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}$/.test(lastView.date.text) && !lastView.date.cut && lastView.date.size <= 16 && lastView.date.ink === 'rgb(29, 36, 48)' && !lastView.clock && lastView.bigFigures.length === 0 && lastView.accent.length === 0 && lastView.pictures.every((p) => p[1] >= lastView.date.box[3]) && !!lastView.hold && !!lastView.skip && lastView.date.box[0] >= lastView.hold[2] && lastView.date.box[2] <= lastView.skip[0], `RC26: at ${w} px the last view shows the date, between Hold and Skip and clear of what stands on the map, with no figure larger than body text and nothing in the accent (${JSON.stringify(lastView)})`);

      // RC25: the place the walk passed without stopping is named beside it, in body ink at full strength, by the words
      // its card uses, on the screen and clear of the date; its mark stands on the place.
      const named = lastView.names[0];
      const dot = lastView.dots[0];
      const beside = !!named && !!dot && named.box[0] <= (dot[0] + dot[2]) / 2 && named.box[2] >= (dot[0] + dot[2]) / 2 && Math.min(Math.abs(named.box[1] - dot[3]), Math.abs(dot[1] - named.box[3])) <= 16;
      check(lastView.names.length === 1 && named.text === 'Passed Hessian Memorial without stopping' && named.ink === 'rgb(29, 36, 48)' && named.opacity >= 0.95 && named.size <= 16 && !named.cut && beside && named.box[0] >= 0 && named.box[2] <= w && (!lastView.date || named.box[1] >= lastView.date.box[3]), `RC25: at ${w} px the walk's last view names the place passed beside it, in body ink at full strength (${JSON.stringify({ names: lastView.names, dots: lastView.dots, date: lastView.date && lastView.date.box })})`);
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      await pg.waitForTimeout(600);
      // On the card the far break is a gap with a way offered: the card draws it its own way, faint (G6), or by its dots.
      const onCardMap = await pg.locator('[data-gaplinks]').last().evaluate((e) => ({ links: Number(e.dataset.gaplinks ?? -1), faint: Number(e.dataset.faint ?? -1) })).catch(() => ({ links: -1, faint: -1 }));
      const cam = cameraOf(seenFrames, places);
      const said = JSON.stringify({ ...cam, longest: Math.round(cam.longest * 100) / 100, still: Math.round(cam.still * 100) / 100 });
      // RC12: the camera moves in a few short runs (a card's pin settling, a re-frame as the walker leaves the middle)
      // and is exactly still between them: more of the watch than not, and the walker goes on meanwhile.
      check(cam.frames > 200 && cam.runs >= 3 && cam.runs <= 18 && cam.longest <= 2.6 && cam.still >= 0.6 && cam.walkedStill >= 20, `RC12: at ${w} px the camera holds still between its re-frames, the walker going on meanwhile (${said})`);
      // RC14: with a photo's or the video's card at rest, its pin stands on the screen just under the card, in line with
      // its middle, and the camera does not move while the card is up.
      const pins = Object.values(cam.pins);
      check(pins.length === 3 && pins.every((p) => Math.abs(p.dx) <= 2 && p.under >= 44 && p.under <= 60 && p.y < p.h) && cam.underCard === 0, `RC14: at ${w} px each card's pin shows just under where the card rests, the camera still while it is up (${said})`);
      // RC11: the walking zoom is 15: every frame of the watch but the opening and a stretch's rise.
      check(cam.zooms.includes('15.00') && cam.zooms.every((z) => Number(z) <= 15) && !cam.zooms.includes('16.00'), `RC11: at ${w} px the replay walks at zoom 15 (${cam.zooms.slice(0, 8).join(', ')}${cam.zooms.length > 8 ? ', …' : ''})`);
      const br = breaksOf(seenFrames);
      const brSaid = JSON.stringify(br);
      // RC17: nothing is laid over the map in any frame of the watch, the two breaks' among them.
      check(br.frames > 400 && br.laters.length === 2 && br.veiled === 0, `RC17: at ${w} px a break never dims the map: nothing is laid over it in any frame (${br.frames} frames, ${br.veiled} with something over the map${br.veil ? `: ${br.veil}` : ''}; said: ${br.laters.join(' | ')})`);
      // RC18: across the far break the camera is pulled back with both ends in view while a dotted line draws from where
      // the trace stops, step by step; the walker then slides along it, on the line; and the camera closes in at the far
      // end, the walker in the middle of the screen. A 340 m break is far: its line shows for 0.7 of 4.2 s and 0.6 s more.
      const far = br.far;
      const hopOk = !!far && far.steps >= 3 && far.endsInView && far.slid >= 8 && far.onLine && far.drawnFirst && far.undrawnAfter === 0 && !!far.landed && Math.abs(far.landed[0] - far.focus[0]) <= 2 && Math.abs(far.landed[1] - far.focus[1]) <= 2 && far.saidS >= 3.0 && far.saidS <= 4.1;
      check(hopOk, `RC18: at ${w} px the camera holds both ends in view while a dotted line draws and the walker slides along it, and closes in at the far end (${brSaid})`);
      // RC19: the clock is one time, then the other, and fades out between them.
      check(!!far && far.clocks.length === 2 && far.faded < 0.35, `RC19: at ${w} px across the break the clock changes from one time to the other in a dissolve (${JSON.stringify(far && { clocks: far.clocks, faded: far.faded })})`);
      // RC20: the small break is a stand: its line and the clock's change, the camera where it was, no hop drawn for it
      // (the far break's stays as it is), the walker on one side and then the other.
      const stand = br.stand;
      const standOk = !!stand && stand.frames >= 20 && stand.cams === 1 && stand.hops === 1 && stand.clocks.length === 2 && stand.walkers <= 2 && stand.saidS >= 1.3 && stand.saidS <= 2.3;
      check(standOk, `RC20: at ${w} px a break too small to see is a stand: the line and the clock's change, no hop, no camera move (${JSON.stringify(stand)})`);
      // RC21: the hop stays whole to the end of the path; on the card that break, a gap, is drawn the card's own way
      // (its offered way, faint, or its dots), never left bare. (A hop across a pause stays as dots: breaks.test.ts.)
      check(!!far && far.stays && onCardMap.links + onCardMap.faint >= 1, `RC21: at ${w} px the hop stays on the map through the path, and the card draws that break (whole in the path's last frame: ${far && far.stays}; on the card: ${JSON.stringify(onCardMap)})`);
    }

    // replay-ceremony ui 1 (the UI review's U1): a picture standing on the map opens its moment. A re-watch at each
    // width as far as the first photo's picture: a tap on it opens the viewer on that photo, the replay holds while it
    // is open exactly as the stack's viewer holds it (RR13), and goes on when it closes; a tap beside it only holds.
    for (const [w, ht] of [[390, 844], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.waitForTimeout(300);
      await pg.getByText('Watch again').click();
      await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 30000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=replay-card]', { timeout: 30000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=replay-card]', { state: 'detached', timeout: 30000 }).catch(() => {});
      const standing = '[data-testid=replay-picture][data-key=rr-photo]';
      await pg.waitForSelector(standing, { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(200);
      const now = async () => [await clockNow(), await pg.locator('[data-walker]').first().getAttribute('data-walker').catch(() => null)].join(' @ ');
      const target = await pg.locator(`${standing} [data-testid=picture-open]`).boundingBox({ timeout: 2000 }).catch(() => null);
      // The tap, as a finger gives it: on the tile's middle.
      const tile = await pg.locator(standing).boundingBox({ timeout: 2000 }).catch(() => null);
      if (tile) await pg.mouse.click(tile.x + tile.width / 2, tile.y + 18);
      const opened = await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 5000 }).then(() => true, () => false);
      const itsOwn = opened && (await pg.waitForSelector('[aria-label="Caption: Blue door"]', { timeout: 3000 }).then(() => true, () => false));
      const a = await now();
      await pg.waitForTimeout(1200);
      const b = await now();
      const heldPill = await pg.locator('[data-testid=replay-held]').count();
      await shot(pg, `rc-picture-open-${w}`);
      await pg.click('[data-testid=viewer-close]', { timeout: 2000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 5000 }).catch(() => {});
      // Unheld again, if the tap fell through to the stage (a build before the fix): the rest reads a running replay.
      if (await pg.locator('[data-testid=replay-held]').count()) await pg.click('[data-testid=hold]').catch(() => {});
      await pg.waitForTimeout(1500);
      const after = await now();
      check(!!target && target.width >= 44 && target.height >= 44 && opened && itsOwn && a === b && heldPill === 0 && after !== b, `replay-ceremony ui 1: at ${w} px a tap on a standing picture opens its moment, the replay holding until the viewer closes and going on after (target ${JSON.stringify(target && [Math.round(target.width), Math.round(target.height)])}, opened ${opened} on its photo ${itsOwn}; ${a} → ${b} while open, ${after} after)`);
      // A tap elsewhere on the stage still holds, and another goes on (RR7).
      await pg.mouse.click(40, Math.round(ht * 0.72));
      await pg.waitForTimeout(300);
      const held = await pg.locator('[data-testid=replay-held]').count();
      const viewer = await pg.locator('[data-testid=viewer-close]').count();
      await pg.mouse.click(40, Math.round(ht * 0.72));
      await pg.waitForTimeout(300);
      check(held === 1 && viewer === 0 && (await pg.locator('[data-testid=replay-held]').count()) === 0, `replay-ceremony ui 1: at ${w} px a tap beside a picture still only holds the replay (held ${held}, viewer ${viewer})`);
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
    }

    // replay-ceremony ui 8: a card's map turned by hand, then Watch again: the first beat's own fit turns it north-up,
    // so the path's first frame, which is flat and north-up (RC15), snaps nothing.
    {
      await pg.setViewportSize({ width: 390, height: 844 });
      await pg.waitForTimeout(600);
      const bearingNow = async () => Number((await pg.locator('[data-bearing]').last().getAttribute('data-bearing', { timeout: 1000 }).catch(() => null)) || 0);
      const cdp = await c.newCDPSession(pg);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      const r = 60;
      const cx = 195;
      let cy = 200;
      const pts = (ang) => [{ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang), id: 1 }, { x: cx - r * Math.cos(ang), y: cy - r * Math.sin(ang), id: 2 }];
      // Both fingers on the map itself: the first height where nothing (a pin, the Undo pill) lies under them.
      for (const y of [200, 150, 250, 110]) {
        cy = y;
        const off = await pg.evaluate((qs) => qs.filter((q) => !document.elementFromPoint(q.x, q.y)?.classList.contains('maplibregl-canvas')).length, [...pts(0), ...pts(Math.PI / 4)]);
        if (!off) break;
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(0) });
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts((i * Math.PI) / 48) });
        await pg.waitForTimeout(30);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      await pg.waitForTimeout(500);
      const turned = await bearingNow();
      await shot(pg, 'rc-card-turned');
      await pg.getByText('Watch again').click();
      await pg.waitForSelector('[data-testid=replay-headline]', { timeout: 30000 }).catch(() => {});
      // Every bearing the map reports from the first beat's start to a little into the path.
      const bearings = [];
      const t0 = Date.now();
      let atClock = null;
      while (Date.now() - t0 < 9000) {
        bearings.push(await bearingNow());
        if (atClock == null && (await pg.locator('[data-testid=replay-clock]').count())) atClock = bearings.length - 1;
        if (atClock != null && bearings.length - atClock > 6) break;
        await pg.waitForTimeout(80);
      }
      // North-up well before the first beat is over, and from then on: the path's first frame finds it so.
      const settled = bearings.findIndex((x) => Math.abs(x) < 0.5);
      const inBeat = atClock != null && settled >= 0 && settled < atClock - 5;
      const stays = settled >= 0 && bearings.slice(settled).every((x) => Math.abs(x) < 0.5);
      check(Math.abs(turned) > 5 && inBeat && stays, `replay-ceremony ui 8: a card's map turned by hand opens north-up in the first beat, with no snap as the path begins (turned ${turned}; then ${bearings.slice(0, 6).join(', ')} … north from reading ${settled}, the path at ${atClock})`);
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
    }
    await pg.setViewportSize({ width: 390, height: 844 });

    // The day (RR16): its replay reaches the day's card with no taps, the note on the way.
    const wakesBefore = (await pg.evaluate(() => window.__wake.log.length));
    // Not now with words typed asks as Back and Escape do (tend replay audit 15; the owner's "Ask there too", Nov 17);
    // with nothing typed it leaves at once (the tabs journey's U14). Then Discard leaves the first replay for Chronicle,
    // the words typed gone with it (tend replay 15), at 390 here and at 320 on the second walk.
    await pg.click('[data-testid=not-now]');
    const notNowAsks = await pg.waitForSelector('[data-testid=name-ask]', { timeout: 3000 }).then(() => true, () => false);
    const notNowStays = /\/replay\//.test(new URL(pg.url()).pathname);
    const notNowWords = await pg.inputValue('[data-testid=title-input]').catch(() => null);
    check(notNowAsks && notNowStays && notNowWords === 'Plums by the bridge', `tend replay audit 15: at 390 px Not now with words typed asks "Discard these edits?" over them (${notNowAsks}, ${new URL(pg.url()).pathname}, "${notNowWords}")`);
    await pg.click('[data-testid=name-discard]').catch(() => {});
    const discarded = await pg.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 }).then(() => true, () => false);
    check(discarded, `tend replay 15: at 390 px Discard leaves the first replay for Chronicle (${new URL(pg.url()).pathname})`);
    if (!discarded) await pg.click('[data-testid=not-now]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 });
    await h.mapUp(pg);
    await pg.click('[data-testid=sheet-days]');
    await pg.click('[data-testid=day-row]');
    await pg.click('[data-testid=day-replay]');
    await pg.waitForURL(/\/day\//, { timeout: 15000 });
    let dayNote = false;
    let dayNext = null;
    // The day's replay on the same engine (RC9): read frame by frame as the walk's was.
    // From its first frames: the day has no first beat, so its telling shows the whole day itself before it dives (RC23).
    await pg.waitForSelector('[data-testid=replay-stage]', { timeout: 30000 }).catch(() => {});
    await recordFrames(pg);
    await pg.waitForTimeout(700);
    await shot(pg, 'rc-day-open');
    let dayLast = null;
    for (let k = 0; k < 400 && !(await pg.locator('[data-testid=day-card]').count()); k++) {
      if (!dayLast && (await pg.locator('[data-testid=replay-date]').count()) && (await pg.locator('[data-testid=replay-date]').evaluate((e) => Number(getComputedStyle(e).opacity) > 0.98).catch(() => false))) {
        dayLast = await lastViewOf(pg);
        await shot(pg, 'rc-day-last');
      }
      if (await pg.getByText('Bought two plums').count()) dayNote = true;
      // The day's replay has the same button, named the same (RY19).
      if (!dayNext && (await pg.locator('[data-testid=next-moment]').count())) dayNext = await pg.locator('[data-testid=next-moment]').getAttribute('aria-label').catch(() => null);
      await pg.waitForTimeout(150);
    }
    const dayFrames = await stopFrames(pg);
    const dayStretch = stretchOf(dayFrames);
    const dayRendered = rendersIn(dayFrames);
    check(!!dayStretch && dayStretch.seconds >= STRETCH_S && dayStretch.puck && dayRendered > 0 && dayStretch.engine >= 10 && dayStretch.fewRenders && dayStretch.fewSends && dayStretch.ended >= dayStretch.frames - 1 && dayStretch.line <= 1.5 && dayStretch.centre <= 1.5 && dayStretch.off <= 0,
      `RC9: the day's replay runs on the same engine: its dot, line and camera together, nothing rendered or sent as time passes (${stretchSaid(dayStretch)}; the screen rendered ${dayRendered} times)`);
    check(dayNext === 'Next moment', `RY19: the day's replay shows the next-moment button too (${dayNext})`);

    // RC23, the day's: the whole day stands 2 s, then the camera dives to its first moment; RC24: it closes on the whole
    // day the same way. RC25, RC26: its last view shows the day's date and names no passed place.
    const dayEnds = bookendsOf(dayFrames);
    const dop = dayEnds.opened;
    check(!!dop && dop.heldS >= 1.2 && dop.heldS <= 2.6 && dop.fromZoom < 14.6 && dop.back === 0 && dop.diveS >= 1.9 && dop.diveS <= 3.0, `RC23: the day's replay shows the whole day for 2 s and dives (${JSON.stringify(dayEnds)})`);
    check(!!dayEnds.closed && dayEnds.closed.pullS >= 2.6 && dayEnds.closed.pullS <= 3.8 && dayEnds.closed.holdS >= 1.7, `RC24: the day's replay pulls back to the whole day in 3 s and holds it 2 s (${JSON.stringify(dayEnds.closed)})`);
    const dayStays = staysOf(dayFrames, {}, []);
    check(dayStays.entries.length >= 3 && dayStays.pictures >= 3 && dayStays.stackTexts.length === 0 && dayStays.pinsOfPictured === 0, `RC46: the day's replay plays the same way: its pictures stand on the map and gather in the stack (${JSON.stringify({ entries: dayStays.entries, pictures: dayStays.pictures, pins: dayStays.pinsOfPictured })})`);
    check(!!dayLast && dayLast.names.length === 0, `RC25: the day's last view names no place passed (${JSON.stringify(dayLast && dayLast.names)})`);
    check(!!dayLast && !!dayLast.date && /^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}$/.test(dayLast.date.text) && dayLast.date.size <= 16 && !dayLast.clock && dayLast.bigFigures.length === 0 && dayLast.accent.length === 0, `RC26: the day's last view shows the day's date, with no figure larger than body text and nothing in the accent (${JSON.stringify(dayLast)})`);
    // As in the walk's replay, no Continue ever mounts on the web (tend replay 14).
    check((await pg.locator('[data-testid=day-card]').count()) === 1 && dayNote, `RR16: the day's replay reaches its card by itself, its note on the way (${dayNote})`);
    const dayWake = await pg.evaluate(() => window.__wake);
    check(dayWake.log.length > wakesBefore && dayWake.held === 0, `RR24: the day's replay holds the screen awake too, and lets it go on its card (${JSON.stringify(dayWake)})`);
    // The day framed above its card once the fit has settled.
    await pg.waitForTimeout(1200);
    await shot(pg, 'rr-day-card');
    // tend replay T19: the day's line is a clause in words, with the walk card's one hint; whole at 320 px too.
    for (const w of [390, 320]) {
      if (w !== 390) {
        await pg.setViewportSize({ width: w, height: 700 });
        await pg.waitForTimeout(900);
        await shot(pg, `rr-day-card-${w}`);
      }
      const day = await pg.evaluate(() => {
        const card = document.querySelector('[data-testid=day-card]');
        const line = document.querySelector('[data-testid=day-card-line]');
        const r = line?.getBoundingClientRect();
        const pins = document.querySelectorAll('.maplibregl-map [aria-label$=". Open"]').length;
        return { line: line?.textContent ?? null, right: r ? Math.round(r.right) : null, pins, hint: !!card && [...card.querySelectorAll('div, span')].some((x) => x.textContent === 'Tap a pin to open it') };
      });
      check(day.hint === day.pins > 0, `tend replay audit 11: at ${w} px the day's card gives its hint only with a pin on its map (${JSON.stringify(day)})`);
      check(/^(One moment|[A-Z][a-z-]+ moments)(, around .+| around .+)?$/.test(day.line ?? '') && !/\d|·/.test(day.line) && day.hint && day.right <= w,
        `tend replay T19: at ${w} px the day's card says its moments in a clause, with "Tap a pin to open it" (${JSON.stringify(day)})`);
    }
    await pg.setViewportSize({ width: 390, height: 844 });
    await pg.waitForTimeout(600);
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

    // tend replay T31 (the owner's yes, Nov 14): a second walk, zigzag over Arnold, Williams and Wickenden Streets (all
    // new: the first walk took Transit Street) with five places found, so the card's counts pass where it names them.
    // Its line says the streets walked and new in words, its finds "and two more", and the fog beat's headline "Three
    // streets new to you"; each whole at 390 and 320 px.
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]');
    await pg.click('[data-testid=start]');
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    for (let k = 0; k < 3; k++) {
      await c.setGeolocation({ longitude: here[0], latitude: here[1] + k * 0.000001, accuracy: 6 });
      await pg.waitForTimeout(1000);
    }
    const walk2 = await openWalk(pg);
    const t2 = Date.now() - 40 * min;
    const legs = [[[-1.5, 0.5], [0.5, 0.5]], [[0.5, 0.5], [0.5, 1.5]], [[0.5, 1.5], [2.5, 1.5]], [[2.5, 1.5], [2.5, -1.5]], [[2.5, -1.5], [3.5, -1.5]]];
    const zig = [];
    for (const [from, to] of legs) {
      const n = Math.max(1, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) * 100 / 7));
      for (let k = zig.length ? 1 : 0; k <= n; k++) {
        const p = at(from[0] + ((to[0] - from[0]) * k) / n, from[1] + ((to[1] - from[1]) * k) / n);
        zig.push({ walk_id: walk2.id, t: t2 + zig.length * 5000, lon: p[0], lat: p[1], accuracy_m: 6, speed: 1.4, course: null });
      }
    }
    const placesFound = ['Hessian Memorial', 'Coffee Exchange', 'Grace Church', 'Gano Park', 'Sunny Bakery'];
    await pg.evaluate(([id, startedAt, pts, names]) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction(['walk', 'trace_point', 'find'], 'readwrite');
        const w = tx.objectStore('walk').get(id);
        w.onsuccess = () => tx.objectStore('walk').put({ ...w.result, started_at: startedAt });
        for (const p of pts) tx.objectStore('trace_point').add(p);
        names.forEach((name, i) => {
          const p = pts[10 + i * 12];
          tx.objectStore('find').put({ key: `t31-${i}`, area_key: null, walk_id: id, capture_id: `t31-cap-${i}`, found_at: p.t, name, category: 'culture', kind: 'museums', at: [p.lon, p.lat], generic: false });
        });
        tx.oncomplete = () => resolve(true);
      };
    }), [walk2.id, zig[0].t - 1000, zig, placesFound]);
    await pg.reload();
    await pg.waitForURL((u) => u.pathname === `${BASE}/walk`, { timeout: 15000 });
    await c.setGeolocation({ longitude: here[0], latitude: here[1], accuracy: 6 });
    await pg.waitForTimeout(2000);
    await toStop(pg);
    const b2 = await pg.locator('[data-testid=stop]').boundingBox();
    await pg.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1100);
    await pg.mouse.up();
    await pg.waitForURL(/replay/, { timeout: 30000 });
    await pg.waitForSelector('[data-testid=skip]', { timeout: 60000 });
    await pg.click('[data-testid=skip]');
    await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
    const NUM = '(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|(twenty|thirty|forty|fifty)(-[a-z]+)?|many)';
    for (const [w, ht] of [[390, 844], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.waitForTimeout(900);
      const said = await pg.evaluate(() => {
        const read = (id) => {
          const e = document.querySelector(`[data-testid=${id}]`);
          const r = e?.getBoundingClientRect();
          return e ? { text: e.textContent.replace(/\u00a0/g, ' '), right: Math.round(r.right), cut: e.scrollWidth > e.clientWidth + 1 } : null;
        };
        return { line: read('card-line'), finds: read('card-finds') };
      });
      // Every street this walk walked is new to you, so the card says it once (tend replay audit 14, the owner's "three
      // streets, all new to you"); with an old street among them it would say both clauses.
      check(new RegExp(`· ${NUM} streets, all new to you$`).test(said.line?.text ?? '') && !/\d+ streets?\b/.test(said.line.text) && !/walked, .* new to you/.test(said.line.text) && said.line.right <= w && !said.line.cut,
        `tend replay T31, tend replay audit 14: at ${w} px the walk's card says its streets in words, once when all are new, whole (${JSON.stringify(said.line)})`);
      check(said.finds?.text === 'Found Hessian Memorial · Coffee Exchange · Grace Church and two more' && said.finds.right <= w && !said.finds.cut,
        `tend replay T31: at ${w} px the walk's card says "and two more" of its finds, whole (${JSON.stringify(said.finds)})`);
      await shot(pg, `rr-t31-card-${w}`);
    }
    for (const [w, ht] of [[390, 844], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.getByText('Watch again').click();
      const up = await pg.waitForSelector('[data-testid=replay-headline]', { timeout: 15000 }).then(() => true, () => false);
      await pg.waitForTimeout(400);
      const head = await pg.evaluate(() => {
        const e = document.querySelector('[data-testid=replay-headline]');
        const r = e?.getBoundingClientRect();
        return e ? { text: e.textContent, name: e.getAttribute('aria-label'), left: Math.round(r.left), right: Math.round(r.right) } : null;
      });
      check(up && head && /^Three streets new to you/.test(head.text) && head.left >= 16 && head.right <= w - 16,
        `tend replay T31: at ${w} px the fog beat's headline says "Three streets new to you", inside the screen (${JSON.stringify(head)})`);
      await shot(pg, `rr-t31-fog-${w}`);
      await pg.click('[data-testid=skip]');
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 15000 });
    }
    // tend replay 15 at 320 px: words typed, Escape twice asks, and Discard leaves for Chronicle.
    await pg.setViewportSize({ width: 320, height: 568 });
    await pg.click('[data-testid=to-name]');
    await pg.fill('[data-testid=title-input]', 'Wickenden at dusk');
    await pg.keyboard.press('Escape');
    await pg.waitForSelector('[data-testid=to-name]', { timeout: 3000 }).catch(() => {});
    await pg.keyboard.press('Escape');
    const asked320 = await pg.waitForSelector('[data-testid=name-ask]', { timeout: 3000 }).then(() => true, () => false);
    await pg.click('[data-testid=name-discard]').catch(() => {});
    const left320 = await pg.waitForURL((u) => u.pathname === `${BASE}/`, { timeout: 15000 }).then(() => true, () => false);
    check(asked320 && left320, `tend replay 15: at 320 px Escape twice with words typed asks, and Discard leaves for Chronicle (${asked320}, ${new URL(pg.url()).pathname})`);

    // Replay ceremony RC30, the stack's bound: a third walk of eighteen photos, each a stop of its own, on a 320 px
    // phone. Next goes from one to the next, so the stack fills in seconds: more than the screen holds.
    {
      // One place passed without stopping near the walk's east end, where the stack stands on the last view (ui 3).
      const { ids } = await seedPhotoWalk(h, c, pg, 18, { passedAt: 0.82 });
      await pg.waitForSelector('[data-testid=replay-stage]', { timeout: 90000 }).catch(() => {});
      const stackNow = () => pg.evaluate(() => {
        const es = [...document.querySelectorAll('[data-testid=stack-entry]')].map((e) => ({ key: e.getAttribute('data-key'), top: Math.round(e.getBoundingClientRect().top), opacity: Number(e.style.opacity || 1) })).filter((e) => e.opacity > 0.5);
        const foot = (id) => { const e = document.querySelector(`[data-testid=${id}]`); return e ? Math.round(e.getBoundingClientRect().bottom) : null; };
        const s = document.querySelector('[data-testid=replay-stack]');
        return { keys: es.map((e) => e.key), top: es.length ? Math.min(...es.map((e) => e.top)) : null, under: Math.max(foot('skip') ?? 0, foot('next-moment') ?? 0), text: s ? s.innerText.trim() : null };
      });
      let most = 0;
      let highest = Infinity;
      let controls = 0;
      let half = null;
      for (let k = 0; k < 60 && (await pg.locator('[data-testid=next-moment]').count()); k++) {
        await pg.click('[data-testid=next-moment]', { timeout: 2000 }).catch(() => {});
        await pg.waitForTimeout(450);
        const s = await stackNow();
        most = Math.max(most, s.keys.length);
        if (s.top != null) highest = Math.min(highest, s.top);
        controls = Math.max(controls, s.under);
        if (!half && s.keys.length >= 6) { half = s; await shot(pg, 'rc-stack-growing-320'); }
      }
      // The last photo's card, then all eighteen in: the stack at its bound.
      await pg.waitForSelector('[data-testid=replay-card]', { timeout: 15000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=replay-card]', { state: 'detached', timeout: 30000 }).catch(() => {});
      await pg.waitForTimeout(900);
      await pg.click('[data-testid=hold]').catch(() => {});
      await pg.waitForTimeout(300);
      const full = await stackNow();
      await shot(pg, 'rc-stack-bound-320');
      // Dropped ones still open: the control opens every photo so far.
      await pg.click('[data-testid=replay-stack]').catch(() => {});
      await pg.waitForSelector('[data-testid=viewer-close]', { timeout: 5000 }).catch(() => {});
      await pg.waitForTimeout(500);
      const opens = await pg.evaluate(() => Number((/\b1 of (\d+)\b/.exec(document.body.innerText) || [0, 0])[1]));
      await pg.click('[data-testid=viewer-close]').catch(() => {});
      await pg.click('[data-testid=hold]').catch(() => {});
      const n = full.keys.length;
      check(n >= 8 && n < 18 && most <= n && full.keys.join(',') === ids.slice(-n).join(',') && full.top >= controls && highest >= controls && !/[\d\p{L}]/u.test(full.text) && opens === 18, `RC30: at 320 px eighteen photos fill the stack to what the screen holds and no further, the oldest dropping off the bottom, every one still opened by it (${JSON.stringify({ shown: n, most, first: full.keys[0], last: full.keys[n - 1], top: full.top, highest, controls, text: full.text, opens, sixIn: half && half.keys.length })})`);
      // The stack keeps clear of Next (replay-ceremony ui 2, the UI review's U3): its highest entry at rest is 12 px
      // or more under Next's foot.
      check(full.top != null && controls > 0 && full.top - controls >= 12, `replay-ceremony ui 2: at 320 px the stack at its bound stands 12 px or more under Next (its top ${full.top}, Next's foot ${controls})`);
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 }).catch(() => {});
      // The last view at 320 px with the stack at its bound (replay-ceremony ui 3, the UI review's U4): watched again,
      // Next to the last photo, then on by itself to the last view: the passed place's name ends short of the stack.
      await pg.getByText('Watch again').click();
      await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 30000 }).catch(() => {});
      for (let k = 0; k < 60 && (await pg.locator('[data-testid=next-moment]').count()); k++) {
        await pg.click('[data-testid=next-moment]', { timeout: 2000 }).catch(() => {});
        await pg.waitForTimeout(300);
      }
      const named = await pg.waitForFunction(() => { const e = document.querySelector('[data-testid=replay-passed]'); return !!e && Number(e.parentElement.style.opacity || 0) > 0.98; }, null, { timeout: 60000, polling: 'raf' }).then(() => true, () => false);
      const beside = await pg.evaluate(() => {
        const box = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
        const name = document.querySelector('[data-testid=replay-passed]');
        const stack = document.querySelector('[data-testid=replay-stack]');
        const entries = [...document.querySelectorAll('[data-testid=stack-entry]')].filter((e) => Number(e.style.opacity || 1) > 0.5).length;
        return { name: name ? box(name) : null, text: name ? name.textContent.trim() : null, cut: name ? name.scrollWidth > name.clientWidth + 1 : null, stack: stack ? box(stack) : null, entries };
      });
      await shot(pg, 'rc-passed-stack-320');
      check(named && !!beside.name && !!beside.stack && beside.entries >= 8 && beside.name[2] <= beside.stack[0] - 6 && beside.name[0] >= 8 && !beside.cut, `replay-ceremony ui 3: at 320 px, the stack at its bound, the last view's passed-place name ends short of it (${JSON.stringify(beside)})`);
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name], [data-testid=done]', { timeout: 30000 }).catch(() => {});
    }
    await pg.setViewportSize({ width: 390, height: 844 });
    // RC4: through the whole journey (the walk screen, both replays, Chronicle's map, the day's replay) no map sent a
    // collection the same as its last, or empty after empty.
    await pg.waitForTimeout(1100);
    check(sentInAll > 20 && sentAgain.length === 0, `RC4: no map data is sent again unchanged, or empty after empty (${sentInAll} collections sent; again: ${sentAgain.length}${sentAgain.length ? `, as ${[...new Set(sentAgain)].slice(0, 6).join('; ')}` : ''})`);
    await c.close();
    // The scenario refuses a video's sound on purpose; expo-video lets that refusal go unhandled.
    for (let i = errors.length - 1; i >= 0; i--) if (/NotAllowedError: refused/.test(errors[i])) errors.splice(i, 1);
}

module.exports = {
  name: 'replay',
  covers: [
    'src/components/Picture.tsx',
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
