// Replay rhythm (RR6-RR16, RR19): a walk seeded with a captioned photo, a note, a memo, a 20-minute
// gap and a long stretch, watched with no taps but the ones it checks; then its day. E2E_ONLY=replay runs it alone.

const { seedReplayWalk } = require('../replayWalk');

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
    E.frames.push({
      t, busy: !!card || !!note || has('memo-bubble') || has('replay-whisper') || has('replay-later'),
      walker: map?.getAttribute('data-walker') ?? '', centre: map?.getAttribute('data-center') ?? '', zoom: Number(map?.getAttribute('data-zoom')), end: map?.getAttribute('data-reveal-end') ?? '',
      cam: map?.getAttribute('data-cam') ?? '', held: has('replay-held'), w: window.innerWidth, h: window.innerHeight,
      screen: (p['render:replay'] ?? 0) + (p['render:day'] ?? 0), map: p['render:map'] ?? 0, sends, commits: window.__commits?.[0] ?? 0, engine: p['replay:frame'] ?? 0,
      card: cb ? `${cb.x.toFixed(1)},${cb.y.toFixed(1)},${cb.width.toFixed(1)},${cb.height.toFixed(1)}` : '', cardName: card?.getAttribute('aria-label') ?? '', note: note ? getComputedStyle(note.parentElement).opacity : '',
      clock: document.querySelector('[data-testid=replay-clock]')?.getAttribute('aria-label') ?? '', puck: !!document.querySelector('[data-testid=walker-puck]'),
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
  // tucked away, the pile taking it).
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

async function run(h) {
  const { navUrl, BASE, at, check, shot, freshPage, openWalk, errors } = h;
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
    // early on and a note at the end; 20 min with no fixes; 80 m more and a memo. Stopped, so its first replay opens.
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
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
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
      check(still.centres === 1 && still.walkers >= 10 && still.engine >= 10 && still.puck && still.card != null,
        `RC10: with reduce motion on the map stays still and the walker moves over it, on the same engine, to the first card (${JSON.stringify(still)})`);
    }

    // Replay ceremony, the camera (RC11, RC12, RC14; decision 0206): a re-watch at 390 and at 320 px, read frame by
    // frame to its card, with a picture of each state: walking at the walking zoom, a card up with its pin under it,
    // the camera re-framing as the walker leaves the card. Hold stands the replay still for each picture.
    for (const [w, ht] of [[390, 844], [320, 568]]) {
      await pg.setViewportSize({ width: w, height: ht });
      await pg.waitForTimeout(300);
      await pg.getByText('Watch again').click();
      await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 30000 });
      await recordFrames(pg);
      const pictured = async (name) => {
        await pg.click('[data-testid=hold]').catch(() => {});
        await pg.waitForTimeout(250);
        await shot(pg, `${name}-${w}`);
        await pg.click('[data-testid=hold]').catch(() => {});
      };
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
      // The video's card gone, the walker setting off for the note 100 m on: the camera re-framing.
      await pg.waitForSelector('[data-testid=replay-card][aria-label^=Video]', { timeout: 60000 }).catch(() => {});
      await pg.waitForSelector('[data-testid=replay-card]', { state: 'detached', timeout: 60000 }).catch(() => {});
      await pg.waitForTimeout(150);
      await pictured('rc-reframe');
      await pg.waitForSelector('[data-testid=replay-note]', { timeout: 120000 }).catch(() => {});
      await pg.waitForTimeout(1500);
      const seenFrames = await stopFrames(pg);
      await pg.click('[data-testid=skip]').catch(() => {});
      await pg.waitForSelector('[data-testid=to-name]', { timeout: 30000 });
      const cam = cameraOf(seenFrames, places);
      const said = JSON.stringify({ ...cam, longest: Math.round(cam.longest * 100) / 100, still: Math.round(cam.still * 100) / 100 });
      // RC12: the camera moves in a few short runs (a card's pin settling, a re-frame as the walker leaves the middle)
      // and is exactly still between them: more of the watch than not, and the walker goes on meanwhile.
      check(cam.frames > 200 && cam.runs >= 3 && cam.runs <= 12 && cam.longest <= 2.6 && cam.still >= 0.6 && cam.walkedStill >= 20, `RC12: at ${w} px the camera holds still between its re-frames, the walker going on meanwhile (${said})`);
      // RC14: with a photo's or the video's card at rest, its pin stands on the screen just under the card, in line with
      // its middle, and the camera does not move while the card is up.
      const pins = Object.values(cam.pins);
      check(pins.length === 3 && pins.every((p) => Math.abs(p.dx) <= 2 && p.under >= 44 && p.under <= 60 && p.y < p.h) && cam.underCard === 0, `RC14: at ${w} px each card's pin shows just under where the card rests, the camera still while it is up (${said})`);
      // RC11: the walking zoom is 15: every frame of the watch but the opening and a stretch's rise.
      check(cam.zooms.includes('15.00') && cam.zooms.every((z) => Number(z) <= 15) && !cam.zooms.includes('16.00'), `RC11: at ${w} px the replay walks at zoom 15 (${cam.zooms.slice(0, 8).join(', ')}${cam.zooms.length > 8 ? ', …' : ''})`);
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
    await pg.waitForSelector('[data-testid=replay-clock]', { timeout: 30000 }).catch(() => {});
    await recordFrames(pg);
    for (let k = 0; k < 400 && !(await pg.locator('[data-testid=day-card]').count()); k++) {
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
