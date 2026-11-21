// Your data (specs/back-up-everything, BK1, BK8-BK10, BK12, BK13; decisions 0241, 0248): Walk settings ends with a "Your
// data" row; its page backs up everything into one zip that downloads; the zip's manifest, walk, trace, moments and a
// photo's bytes match what the journey seeded; the page then says when. E2E_ONLY=backup runs it alone.
const { strFromU8, unzipSync } = require('fflate');

const FILE_LINE = 'One zip of every walk and moment you kept. Anyone with the file can see your walks, where they went, and your photos, videos and memos.';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function run(h) {
  const { url, navUrl, check, drawerTo, freshPage, shot } = h;
  const { c, pg } = await freshPage('backup');
  // A media read held back while `__slowMedia` is set, so the page's busy state can be seen (BK12).
  await c.addInitScript(() => {
    const real = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const u = typeof input === 'string' ? input : input?.url;
      if (window.__slowMedia && typeof u === 'string' && u.startsWith('blob:')) await new Promise((r) => setTimeout(r, 1500));
      return real(input, init);
    };
  });
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });

  // One finished walk with a trace, a photo (its bytes in the media store) and a note: the library the zip must hold.
  const T = Date.UTC(2026, 9, 3, 14);
  const PHOTO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  await pg.evaluate(({ T, PHOTO }) => new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction(['walk', 'trace_point', 'moment', 'media'], 'readwrite');
      tx.objectStore('walk').put({ id: 'w-e2e', started_at: T, ended_at: T + 3_600_000, title: 'Benefit Street', epilogue: null, open: false, area: null, snapped_build: null });
      for (const s of [10, 20, 30]) tx.objectStore('trace_point').put({ walk_id: 'w-e2e', t: T + s * 1000, lat: 41.82 + s / 1e5, lon: -71.4, accuracy_m: 5, speed: 1, course: null });
      const piece = (id, kind, more) => ({ id, moment_id: id, t: T + 60_000, kind, file_path: null, body: null, ...more });
      tx.objectStore('moment').put({ id: 'p-e2e', walk_id: 'w-e2e', t: T + 60_000, lat: 41.82, lon: -71.4, segment_id: null, pieces: [piece('p-e2e', 'photo', { file_path: 'walks/w-e2e/p-e2e.jpg' })], piece_ids: ['p-e2e'] });
      tx.objectStore('moment').put({ id: 'n-e2e', walk_id: 'w-e2e', t: T + 90_000, lat: 41.82, lon: -71.4, segment_id: null, pieces: [{ ...piece('n-e2e', 'text', { body: 'the bells at noon' }), t: T + 90_000 }], piece_ids: ['n-e2e'] });
      tx.objectStore('media').put({ key: 'walks/w-e2e/p-e2e.jpg', blob: new Blob([new Uint8Array(PHOTO)], { type: 'image/jpeg' }) });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  }), { T, PHOTO });
  // back-up-everything audit 11 (the owner, Nov 21: "Add a door in Chronicle"): from launch, Chronicle's Contents holds
  // "Your data", which opens the same page; Back names Chronicle. The cold find's pictures carry neutral names (cf-N).
  await pg.goto(url);
  await pg.waitForTimeout(2500);
  await shot(pg, 'cf-1');
  await shot(pg, 'backup-launch-390');
  const contents = pg.locator('[data-testid=memories-menu]:visible');
  if ((await contents.count()) === 1) await contents.click();
  const entry = await pg.waitForSelector('[data-testid=menu-your-data]', { state: 'visible', timeout: 5000 }).then(() => true, () => false);
  const entryText = entry ? (await pg.locator('[data-testid=menu-your-data]').innerText()).replace(/\s+/g, ' ').trim() : '';
  // The sheet fades in: pictured once it has settled.
  await pg.waitForTimeout(900);
  await shot(pg, 'cf-2');
  if (entry) await pg.click('[data-testid=menu-your-data]');
  const fromChronicle = await pg.waitForSelector('[data-testid=your-data-page]', { state: 'visible', timeout: 8000 }).then(() => true, () => false);
  await pg.waitForTimeout(400);
  await shot(pg, 'cf-3');
  check(entry && /Your data/.test(entryText) && fromChronicle, `BK13, back-up-everything audit 11: from launch, Chronicle's Contents holds "Your data" and it opens the page (${JSON.stringify(entryText)}, page ${fromChronicle})`);
  const chronicleBack = pg.locator('[aria-label="Chronicle, back"]:visible');
  const namedChronicle = (await chronicleBack.count()) > 0;
  if (namedChronicle) await chronicleBack.first().click();
  else await pg.locator('[aria-label="Go back"]:visible').first().click().catch(() => {});
  const backHome = await pg.waitForSelector('[data-testid=your-data-page]', { state: 'hidden', timeout: 8000 }).then(() => true, () => false);
  check(namedChronicle && backHome, `back-up-everything audit 18: Back from the page opened in Chronicle is named "Chronicle, back" and returns there (named ${namedChronicle}, back ${backHome})`);
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 });
  await pg.waitForTimeout(1200);
  await shot(pg, 'backup-navigate-390');

  // BK1, BK13: from launch, Navigate's bar pulled up, Walk settings scrolled to its foot: the row's words and its second line.
  await drawerTo(pg, 'half');
  await shot(pg, 'backup-settings-top-390');
  const row = pg.locator('[data-testid=your-data-row]:visible');
  const found = (await row.count()) === 1;
  if (found) await row.scrollIntoViewIfNeeded().catch(() => {});
  await pg.waitForTimeout(400);
  const look = found ? await pg.evaluate(() => {
    const r = document.querySelector('[data-testid=your-data-row]');
    const b = r.getBoundingClientRect();
    const title = [...document.querySelectorAll('[data-testid=start-settings] [role=heading]')].find((e) => e.textContent.trim() === 'Walk settings');
    const label = [...r.querySelectorAll('*')].find((e) => e.childElementCount === 0 && e.textContent.trim() === 'Your data');
    const last = [...document.querySelectorAll('[data-testid=start-settings] [role=button], [data-testid=start-settings] [role=radio], [data-testid=start-settings] [role=switch]')]
      .filter((e) => e.getBoundingClientRect().height > 0).pop();
    return {
      text: r.innerText.replace(/\s+/g, ' ').trim(),
      inView: b.top >= 0 && b.bottom <= window.innerHeight && b.height >= 44,
      ink: label && title ? getComputedStyle(label).color === getComputedStyle(title).color : false,
      last: last === r,
    };
  }) : null;
  check(!!look && look.text.includes('Your data') && look.text.includes('Back up every walk and moment') && look.inView,
    `BK13, back-up-everything audit 4: from launch, Walk settings scrolled to its foot shows "Your data" and "Back up every walk and moment" in view (${JSON.stringify(look)})`);
  check(!!look && look.ink && look.last, `BK1: the row is the last of Walk settings, its words in ink (${JSON.stringify(look)})`);
  await shot(pg, 'backup-row-390');

  if (found) await row.click();
  const page = await pg.waitForSelector('[data-testid=your-data-page]', { state: 'visible', timeout: 8000 }).then(() => true, () => false);
  const pageText = page ? await pg.locator('[data-testid=your-data-page]').innerText() : '';
  check(page, 'BK1: the row opens the "Your data" page');
  check(pageText.includes(FILE_LINE), `BK9: the page says in one line what the file is and who can see it (${JSON.stringify(pageText)})`);
  check(/Not backed up yet/.test(pageText), `BK8: before any backup the line reads "Not backed up yet" (${JSON.stringify(pageText)})`);
  check(page && !/\d/.test(pageText), `BK9, back-up-everything audit 8: no size, count or numeral on the page (${JSON.stringify(pageText)})`);
  await shot(pg, 'backup-page-390');
  // audit 19: what the file is, in ink; when the last one was made, quietly.
  const colours = page ? await pg.evaluate(() => ({
    line: getComputedStyle(document.querySelector('[data-testid=backup-file-line]')).color,
    last: getComputedStyle(document.querySelector('[data-testid=backup-last]')).color,
  })) : null;
  check(!!colours && colours.line === 'rgb(29, 36, 48)' && colours.last === 'rgb(89, 98, 115)', `back-up-everything audit 19: the file's line in ink, the last backup's line muted (${JSON.stringify(colours)})`);
  // audit 21: nothing downloads until the button is tapped.
  let early = 0;
  const countEarly = () => { early++; };
  pg.on('download', countEarly);
  await pg.waitForTimeout(1500);
  pg.off('download', countEarly);
  check(page && early === 0, `back-up-everything audit 21: no file leaves the page before the tap (${early} downloads)`);

  // BK10, BK12: one tap; the button says so while it works; the download is one zip.
  await pg.evaluate(() => { window.__slowMedia = true; });
  const dl = pg.waitForEvent('download', { timeout: 30000 }).catch(() => null);
  if (page) await pg.click('[data-testid=backup-now]');
  const busy = await pg.waitForSelector('[data-testid=backup-now]:has-text("Backing up…")', { timeout: 3000 }).then(() => true, () => false);
  if (page) await pg.click('[data-testid=backup-now]', { force: true, timeout: 2000 }).catch(() => {});
  const d = await dl;
  const second = await pg.waitForEvent('download', { timeout: 3000 }).then(() => true, () => false);
  check(busy && !second, `BK12: while the backup is made the button says "Backing up…", and a second tap makes no second file (busy ${busy}, second ${second})`);
  await pg.evaluate(() => { window.__slowMedia = false; });
  let zip = null;
  if (d) {
    const fs = require('fs');
    try {
      zip = unzipSync(new Uint8Array(fs.readFileSync(await d.path())));
    } catch {
      zip = null;
    }
  }
  const j = (n) => (zip && zip[n] ? JSON.parse(strFromU8(zip[n])) : null);
  const man = j('manifest.json');
  const walks = j('walks.json');
  const trace = j('trace/w-e2e.json');
  const moments = j('moments.json');
  const photo = zip ? zip['media/walks/w-e2e/p-e2e.jpg'] : null;
  const match = !!man && man.format === 'chronicles-backup' && man.version === 1 && man.schema?.store === 'indexeddb'
    && JSON.stringify((walks ?? []).map((w) => w.id)) === '["w-e2e"]'
    && JSON.stringify((trace ?? []).map((p) => p.t - T)) === '[10000,20000,30000]'
    && JSON.stringify((moments ?? []).map((m) => m.id).sort()) === '["n-e2e","p-e2e"]'
    && !!photo && JSON.stringify([...photo]) === JSON.stringify(PHOTO);
  check(match, `BK10: the download is a zip whose manifest, walk, trace, moments and photo match the seeded walk (${d?.suggestedFilename()}: ${JSON.stringify({ man, walks: walks?.length, trace: trace?.length, moments: moments?.length, photo: photo?.length })})`);
  const now = new Date();
  const today = `Last backup made ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const after = await pg.waitForSelector(`[data-testid=backup-last]:has-text("${today}")`, { timeout: 5000 }).then(() => true, () => false);
  check(after, `BK10, BK8: the line then reads "${today}"`);
  await shot(pg, 'backup-done-390');

  // BK1: Back returns to the drawer as it was, Walk settings still raised.
  const navBack = pg.locator('[aria-label="Navigate, back"]:visible');
  const namedNavigate = (await navBack.count()) > 0;
  if (namedNavigate) await navBack.first().click();
  else await pg.locator('[aria-label="Go back"]:visible').first().click().catch(() => {});
  const gone = await pg.waitForSelector('[data-testid=your-data-page]', { state: 'hidden', timeout: 8000 }).then(() => true, () => false);
  await pg.waitForTimeout(500);
  const raised = (await pg.locator('[data-testid=start-settings]:visible').count()) === 1;
  check(gone && raised, `BK1: Back returns to the drawer as it was (page gone ${gone}, Walk settings up ${raised})`);
  check(namedNavigate, 'back-up-everything audit 18: Back from the page opened in Walk settings is named "Navigate, back"');
  await pg.waitForTimeout(300);
  const focusBack = await pg.evaluate(() => document.activeElement?.closest('[data-testid=your-data-row]') != null);
  check(focusBack, 'back-up-everything audit 17: after Back, focus is on the "Your data" row again');

  // The same at 320 px: the row and the page whole.
  await pg.setViewportSize({ width: 320, height: 700 });
  await pg.waitForTimeout(500);
  await pg.locator('[data-testid=your-data-row]:visible').scrollIntoViewIfNeeded().catch(() => {});
  await shot(pg, 'backup-row-320');
  await pg.locator('[data-testid=your-data-row]:visible').click().catch(() => {});
  await pg.waitForSelector('[data-testid=your-data-page]', { state: 'visible', timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(400);
  await shot(pg, 'backup-page-320');
  await c.close();
}

module.exports = {
  name: 'backup',
  covers: ['src/lib/backup/**', 'src/app/your-data.tsx', 'src/components/StartSettings.tsx', 'src/components/PageRow.tsx', 'src/components/chronicle/MemoriesMenu.tsx', 'src/lib/export/index.web.ts'],
  run,
};
