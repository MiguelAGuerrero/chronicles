// Storage awareness (specs/storage-awareness, SA1-SA10): the room left is said in words beside the
// captures, a photo whose save fails is kept for Retry, and the web asks once to be kept.
// The browser's storage API is replaced in this page only (`__free`, `__persistAsked`), and the media
// store's write is refused as out of quota on cue (`__failMedia`). E2E_ONLY=space runs it alone.
const path = require('path');

const LOW = 'Room for new photos and videos is running low.';
const VERY_LOW = 'There is almost no room left for new photos, videos and memos.';
const OUT = 'Not saved: there is no room left. It is held here for Retry.';
const REFUSED = 'This browser may clear Chronicles’ moments when it needs room.';

async function run(h) {
  const { navUrl, check, freshPage, scriptsDir } = h;
  const fixtures = path.join(scriptsDir, 'fixtures');
  const { c, pg } = await freshPage('space');
  await c.addInitScript(() => {
    window.__free = 300 * 1024 * 1024;
    window.__persistAsked = 0;
    window.__failMedia = 0;
    const quota = 1e12;
    // Only these three: the rest of the storage API (a worker's) stays the browser's own.
    const sm = StorageManager.prototype;
    sm.estimate = async () => ({ quota, usage: quota - window.__free });
    sm.persisted = async () => false;
    sm.persist = async () => {
      window.__persistAsked++;
      return false;
    };
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'media' && window.__failMedia > 0) {
        window.__failMedia--;
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return put.apply(this, args);
    };
  });
  const lineText = (timeout = 8000) =>
    pg.waitForSelector('[data-testid=space-line]', { timeout }).then((e) => e.innerText(), () => '');
  const enabled = async (id) => (await pg.locator(`[data-testid=${id}]`).getAttribute('aria-disabled')) !== 'true';
  const photoRows = () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
      g.onsuccess = () => resolve(g.result.map((m) => ({ ...m.pieces[0], id: m.id, walk_id: m.walk_id, t: m.t, lat: m.lat, lon: m.lon, segment_id: m.segment_id })).filter((x) => x.kind === 'photo').length);
    };
  }));

  const say = (t) => t.replace(/\n/g, ' ');
  const dismiss = async () => {
    await pg.click('[data-testid=space-dismiss]').catch(() => {});
    return pg.waitForSelector('[data-testid=space-line]', { state: 'detached', timeout: 3000 }).then(() => true, () => false);
  };
  const shoot = async (button) => {
    const [chooser] = await Promise.all([pg.waitForEvent('filechooser'), pg.click(`[data-testid=${button}]`)]);
    await chooser.setFiles(path.join(fixtures, 'photo.jpg'));
  };

  // Navigate, ready: moments outside a walk (SA3), the captures still enabled (SA6), no number (SA7).
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]');
  const ready = await lineText();
  check(ready.includes(LOW), `SA3: Navigate, ready says the room is low beside the captures ("${say(ready)}")`);
  check(ready !== '' && !/[0-9%]/.test(ready), `SA7: the line holds no digit or percentage ("${say(ready)}")`);
  check((await enabled('moment-photo')) && (await enabled('moment-voice')) && (await enabled('moment-note')), 'SA6: the moment buttons stay enabled with the line shown');
  check(!!ready && (await dismiss()), 'SA6: the line has a dismiss button, and it goes');

  // A moment kept outside a walk: the browser is asked once to keep the data; its refusal said there (SA10).
  await shoot('moment-photo');
  const refused = await lineText(10000);
  check((await pg.evaluate(() => window.__persistAsked)) === 1 && refused.includes(REFUSED), `SA10: asked once after a moment kept outside a walk; the refusal said ("${say(refused)}")`);
  await dismiss();

  // The walk, with the room now very low: said again, because it got worse (SA3, SA4).
  await pg.evaluate(() => { window.__free = 50 * 1024 * 1024; });
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=start]');
  await pg.waitForURL(/\/walk/, { timeout: 30000 });
  const walk = await lineText();
  check(walk.includes(VERY_LOW), `SA4: room that got worse is said again when the walk opens ("${say(walk)}")`);
  check((await enabled('cap-photo')) && (await enabled('cap-voice')) && (await enabled('cap-note')), 'SA6: the capture buttons stay enabled');
  await dismiss();

  // Two photos whose saves are refused for lack of room: both held, with Retry, and why in words (SA8, SA9).
  await pg.evaluate(() => { window.__failMedia = 2; });
  const before = await photoRows();
  await shoot('cap-photo');
  await pg.waitForSelector('[data-testid=held-captures]', { timeout: 10000 }).catch(() => {});
  await shoot('cap-photo');
  await pg.waitForTimeout(1500);
  const pill = await pg.locator('[data-testid=held-captures]').innerText().catch(() => '');
  check(/Photos not saved/.test(pill) && /Retry/.test(pill), `SA8: both refused photos are held with Retry ("${say(pill)}")`);
  const said = await pg.locator(`text=${OUT}`).count();
  const raw = await pg.locator('text=/quota/i').count();
  check(said > 0 && raw === 0, `SA9: it says why in words, never the raw error (${said}, ${raw})`);
  check((await photoRows()) === before, 'SA8: nothing is stored while they wait');
  check((await pg.evaluate(() => window.__persistAsked)) === 1, 'SA10: nothing is asked while the walk records');
  if (pill) await pg.click('[data-testid=held-retry]');
  const kept = await pg.waitForSelector('[data-testid=held-captures]', { state: 'detached', timeout: 10000 }).then(() => true, () => false);
  check(!!pill && kept && (await photoRows()) === before + 2, `SA8: Retry keeps both photos (${(await photoRows()) - before})`);

  // tend walk-screen 1: Stop warns about what is held at that moment, not only the first time in the walk (SA8). A held photo,
  // Stop's warning, Retry keeps it; a later photo is held too: Stop warns again instead of ending the walk without it.
  const holdStop = async () => {
    const b = await pg.locator('[data-testid=stop]').boundingBox();
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1100);
    await pg.mouse.up();
    await pg.waitForTimeout(1500);
  };
  const warned = () => pg.locator('text=/hold Stop again/').count();
  // Let the kept photos' own writes (their small copies) land first, so the one refusal falls on the next photo.
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { window.__failMedia = 1; });
  await shoot('cap-photo');
  await pg.waitForSelector('[data-testid=held-captures]', { timeout: 10000 }).catch(() => {});
  await holdStop();
  check((await warned()) > 0 && /\/walk/.test(pg.url()), `SA8: Stop with a held photo warns first and the walk goes on (${await warned()}, ${pg.url().slice(-12)})`);
  // tend walk-screen audit 1: a second photo held while the first still is, after the warning, is warned about too.
  const dismissBanners = () => pg.evaluate(() => document.querySelectorAll('[data-testid=banner-dismiss]').forEach((b) => b.click()));
  await dismissBanners();
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { window.__failMedia = 1; });
  await shoot('cap-photo');
  await pg.waitForFunction(() => /Photos not saved/.test(document.querySelector('[data-testid=held-captures]')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {});
  await dismissBanners();
  await pg.waitForTimeout(300);
  await holdStop();
  check(/\/walk/.test(pg.url()) && (await warned()) > 0, `tend walk-screen audit 1: a photo that fails while another is held, after the warning, is warned about too (${await warned()}, ${pg.url().slice(-12)})`);
  await pg.click('[data-testid=held-retry]').catch(() => {});
  await pg.waitForSelector('[data-testid=held-captures]', { state: 'detached', timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { window.__failMedia = 1; });
  await shoot('cap-photo');
  await pg.waitForSelector('[data-testid=held-captures]', { timeout: 10000 }).catch(() => {});
  await pg.evaluate(() => document.querySelectorAll('[data-testid=banner-dismiss]').forEach((b) => b.click()));
  await pg.waitForTimeout(300);
  await holdStop();
  check(/\/walk/.test(pg.url()) && (await warned()) > 0 && (await pg.locator('[data-testid=held-captures]').count()) > 0, `tend walk-screen 1: a photo held after the first warning is warned about too; the walk does not end without it (${pg.url().slice(-12)})`);
  if (/\/walk/.test(pg.url())) {
    await pg.click('[data-testid=held-retry]').catch(() => {});
    await pg.waitForSelector('[data-testid=held-captures]', { state: 'detached', timeout: 10000 }).catch(() => {});
  } else {
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
    await pg.click('[data-testid=start]');
    await pg.waitForURL(/\/walk/, { timeout: 30000 });
  }

  // A reload: the room is low again, which is better than very low, so nothing is said; nothing is asked (SA4, SA10).
  await pg.reload();
  await pg.waitForSelector('[data-testid=cap-photo]', { timeout: 30000 });
  await pg.waitForTimeout(2500);
  const again = await pg.locator('[data-testid=space-line]').count();
  check(again === 0 && (await pg.evaluate(() => window.__persistAsked)) === 0, `SA4: a level said is not said again after a reload (${again})`);
  await c.close();
}

module.exports = {
  name: 'space',
  covers: [
    'src/lib/space/**',
    'src/components/SpaceLine.tsx',
    'src/lib/useCaptures.ts',
    'src/components/MomentBar.tsx',
    'src/app/walk.tsx',
  ],
  run,
};
