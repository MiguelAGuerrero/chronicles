// Unsaved captures have one owner (specs/unsaved-captures, UN1-UN15): a photo, video or memo whose save fails is held
// by one app-wide holder, shown on every screen with capture pills, asked by both Stops, and kept by Retry into its own
// walk. Saves are refused on cue (`__failMedia`, `__failMoment`, scripts/e2e/failStorage.js) and a memo's stop ignored
// (`__stopOff`). E2E_ONLY=unsaved runs it alone.
const path = require('path');
const { failStorage } = require('../failStorage');

const OUT = 'Not saved: there is no room left. It is held here for Retry.';
const OUT_WALK = 'Not saved: there is no room left. It is held for Retry on the walk screen.';
// The bar's own, shorter words (the owner, Nov 17; unsaved-captures audit 7).
const OUT_BAR = 'No room left. Retry on the walk screen.';
const MEMO = /Voice (memo|note)s? not saved/;

async function run(h) {
  const { navUrl, check, freshPage, scriptsDir, shot, tabTo, toStop } = h;
  const fixtures = path.join(scriptsDir, 'fixtures');
  const { c, pg } = await freshPage('unsaved');
  await failStorage(c);
  await c.addInitScript(() => {
    // A memo's stop ignored on cue, as the space journey does; the journey ends those recorders itself.
    const stop = MediaRecorder.prototype.stop;
    window.__stopOff = 0;
    window.__stopIgnored = [];
    window.__stopOwn = stop;
    MediaRecorder.prototype.stop = function () {
      if (window.__stopOff > 0) {
        window.__stopOff--;
        window.__stopIgnored.push(this);
        return undefined;
      }
      return stop.call(this);
    };
  });

  await c.addInitScript(() => {
    // tend tabs audit 42: the next picked or recorded file's read waits until a given walk's end is written, so a memo
    // still being saved fails while that walk's Stop is ending it.
    let release = null;
    let until = null;
    window.__holdBlobUntilEnd = (walkId) => {
      window.__holdFor = walkId;
      until = new Promise((r) => (release = r));
    };
    const fetchBefore = window.fetch;
    window.fetch = async function (input, ...rest) {
      const url = typeof input === 'string' ? input : input?.url ?? '';
      if (url.startsWith('blob:') && until) {
        const u = until;
        until = null;
        await u;
      }
      return fetchBefore.call(this, input, ...rest);
    };
    const putBefore = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, ...rest) {
      if (this.name === 'walk' && value && value.id === window.__holdFor && value.ended_at != null && release) {
        const r = release;
        release = null;
        window.__holdFor = null;
        r();
      }
      return putBefore.call(this, value, ...rest);
    };
  });

  const say = (t) => String(t).replace(/\n/g, ' ');
  const shown = (sel) => pg.locator(sel).filter({ visible: true });
  const there = (sel, timeout = 8000) => shown(sel).first().waitFor({ timeout }).then(() => true, () => false);
  const textShown = async (re) => (await pg.locator(`text=${re}`).filter({ visible: true }).count()) > 0;
  const textOf = async (sel) => (await shown(sel).count()) ? say(await shown(sel).first().innerText()) : '';
  const rows = () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
      g.onsuccess = () => resolve(g.result.map((m) => ({ id: m.id, walk: m.walk_id ?? null, t: m.t, kinds: m.pieces.map((x) => x.kind), files: m.pieces.map((x) => x.file_path) })));
    };
  }));
  const voices = async (walk) => (await rows()).filter((m) => m.kinds.includes('voice') && (walk === undefined || m.walk === walk));
  const mediaKeys = () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('media')) return resolve([]);
      const g = db.transaction('media', 'readonly').objectStore('media').getAllKeys();
      g.onsuccess = () => resolve(g.result.map(String));
    };
    req.onerror = () => resolve([]);
  }));
  // The walk's Save is `voice-save`; the ready screen's `moment-voice-save`.
  const saveOf = (prefix) => (prefix === 'cap' ? 'voice-save' : `${prefix}-voice-save`);
  const memo = async (prefix, { stopOff = 0, leave = null } = {}) => {
    await pg.click(`[data-testid=${prefix}-voice]`, { timeout: 10000 }).catch(() => {});
    await pg.waitForSelector(`[data-testid=${saveOf(prefix)}]`, { timeout: 10000 }).catch(() => {});
    await pg.waitForTimeout(1300);
    await pg.evaluate((n) => { window.__stopOff = n; }, stopOff);
    if (leave) return leave();
    await pg.click(`[data-testid=${saveOf(prefix)}]`, { timeout: 10000 }).catch(() => {});
    await pg.waitForSelector(`[data-testid=${saveOf(prefix)}]`, { state: 'detached', timeout: 10000 }).catch(() => {});
    await pg.waitForTimeout(900);
  };
  const shoot = async (button) => {
    const got = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click(`[data-testid=${button}]`, { timeout: 10000 })]).catch(() => null);
    if (got) await got[0].setFiles(path.join(fixtures, 'photo.jpg'));
    await pg.waitForTimeout(1500);
  };
  const hold = async (sel) => {
    const b = await shown(sel).first().boundingBox().catch(() => null);
    if (!b) return;
    await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(1300);
    await pg.mouse.up();
    await pg.waitForTimeout(1500);
  };
  // The hold's fill, as a share of its button (UN7).
  const fillOf = (sel) => pg.evaluate((q) => {
    const b = [...document.querySelectorAll(q)].find((e) => e.getBoundingClientRect().width > 0);
    const f = b?.firstElementChild;
    return b && f ? f.getBoundingClientRect().width / b.getBoundingClientRect().width : -1;
  }, sel);
  const enabled = async (id) => (await pg.locator(`[data-testid=${id}]`).first().getAttribute('aria-disabled')) !== 'true';
  const wide = async (w) => {
    await pg.setViewportSize({ width: w, height: 844 });
    await pg.waitForTimeout(500);
  };
  const pictures = async (name) => {
    await wide(320);
    await shot(pg, `unsaved-${name}-320`);
    await wide(390);
    await shot(pg, `unsaved-${name}-390`);
  };
  const endIgnored = () => pg.evaluate(() => {
    for (const r of window.__stopIgnored) if (r.state !== 'inactive') window.__stopOwn.call(r);
    window.__stopIgnored = [];
  });

  await wide(390);
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=moment-voice]', { timeout: 30000 });
  await pg.waitForTimeout(1500);

  // UN1, UN9: a memo whose save fails as Navigate, ready is left mid-memo (the chevron) is held, and said once by
  // the first screen in front that shows it: Memories' open line.
  await pg.evaluate(() => { window.__failMedia = 1; });
  await memo('moment', { leave: () => pg.click('[data-testid=ready-close]') });
  await pg.waitForTimeout(2500);
  const onMemories = await there('[data-testid=band-voice-retry]', 8000);
  check(onMemories && /Voice note not saved/.test(await textOf('[data-testid=band-voice-retry]')),
    `UN1: a memo that failed as the ready screen closed is held on Memories, with Retry ("${await textOf('[data-testid=band-voice-retry]')}")`);
  const saidOnce = await textOf('[data-testid=band-error]');
  check(saidOnce.includes(OUT), `UN9: Memories says why, in SA9's words, for a memo that failed on a screen gone ("${saidOnce}")`);
  await pictures('memories-pill');

  // UN2: Navigate, ready shows the same memo, and does not say it again (UN9).
  await tabTo(pg, 'navigate').catch(() => {});
  await pg.waitForSelector('[data-testid=moment-voice]', { timeout: 20000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  const onReady = await there('[data-testid=held-memo]', 5000);
  check(onReady && /Voice memo not saved/.test(await textOf('[data-testid=held-memo]')) && !(await textShown(OUT)),
    `UN2, UN9: Navigate, ready shows the held memo with Retry, and does not say why again (${onReady})`);
  await pictures('ready-pill');

  // UN1, UN4: Start keeps it held; the walk screen shows it; its Retry keeps it as a moment of its own, not in the walk.
  await pg.click('[data-testid=start]').catch(() => {});
  await pg.waitForSelector('[data-testid=cap-voice]', { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  const onWalk = await there('[data-testid=held-memo]', 5000);
  check(onWalk, 'UN1: the memo held on the ready screen is still held after Start, on the walk screen');
  const loose0 = (await voices(null)).length;
  if (onWalk) await shown('[data-testid=held-memo-retry]').first().click();
  await pg.waitForTimeout(2500);
  const loose1 = (await voices(null)).length;
  const walkVoices0 = (await rows()).filter((m) => m.walk && m.kinds.includes('voice')).length;
  check(loose1 === loose0 + 1 && walkVoices0 === 0 && !(await there('[data-testid=held-memo]', 1000)),
    `UN4: Retry on the walk screen keeps the ready screen's memo as a moment of its own (${loose0} → ${loose1} outside a walk, ${walkVoices0} in it)`);
  check(!(await there('[data-testid=add-to-moment]', 1500)), 'unsaved-captures audit 1: a loose memo kept by Retry on the walk screen opens no Add to this moment pill');

  // UN3: two memos that fail in turn are both held; Retry keeps both, in the order taken.
  const walkId = await pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
      g.onsuccess = () => resolve((g.result.find((w) => w.ended_at == null) ?? {}).id ?? null);
    };
  }));
  await pg.evaluate(() => { window.__failMedia = 2; });
  await memo('cap');
  await memo('cap');
  const both = await textOf('[data-testid=held-memo]');
  check(/Voice memos not saved/.test(both), `UN3: two failed memos are both held ("${both}")`);
  check((await enabled('cap-photo')) && (await enabled('cap-voice')) && (await enabled('cap-note')), 'UN14: the capture buttons stay enabled while memos are held');
  await pictures('walk-memos');
  if (both) await shown('[data-testid=held-memo-retry]').first().click();
  await pg.waitForTimeout(3000);
  const kept = await voices(walkId);
  check(kept.length === 2 && kept[0].t < kept[1].t && !(await there('[data-testid=held-memo]', 1000)),
    `UN3: Retry keeps both memos in the walk, in the order taken (${kept.length})`);

  // unsaved-captures audit 3: a photo still being kept when the walk screen's Stop is held fails while Stop waits: it is
  // warned of, and the walk goes on. Stop shows only while paused (decision 0220); captures still work paused (0009).
  await toStop(pg);
  await pg.evaluate(() => { window.__slowBlob = 2500; window.__failMedia = 1; });
  const picked = await Promise.all([pg.waitForEvent('filechooser', { timeout: 10000 }), pg.click('[data-testid=cap-photo]', { timeout: 10000 })]).catch(() => null);
  if (picked) await picked[0].setFiles(path.join(fixtures, 'photo.jpg'));
  await hold('[data-testid=stop]');
  await pg.waitForTimeout(3000);
  const waited = await pg.locator('body').innerText();
  check(/Photo not saved yet\. Retry, or hold Stop again/.test(waited) && /\/walk/.test(pg.url()),
    `unsaved-captures audit 3: a photo failing while the walk screen's Stop waits is warned of, and the walk goes on (${pg.url().slice(-12)})`);
  if (await there('[data-testid=held-retry]', 2000)) await shown('[data-testid=held-retry]').first().click();
  await pg.waitForTimeout(2500);

  // unsaved-captures audit 9: a reply failing in the viewer over the walk screen is said by the walk screen once the viewer
  // closes, not behind it.
  const walkPhoto = (await rows()).filter((m) => m.walk === walkId && m.kinds[0] === 'photo').sort((a, b) => b.t - a.t)[0];
  await pg.click('[data-testid=walk-minimize]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  if (walkPhoto) {
    await pg.evaluate((id) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key: 'recall_open', value: JSON.stringify([id]) });
        tx.oncomplete = () => resolve();
      };
    }), walkPhoto.id);
  }
  await pg.click('[data-testid=recording-return]', { timeout: 10000 }).catch(() => {});
  const viewerUp = await there('[data-testid=viewer-respond]', 10000);
  let behind = false;
  if (viewerUp) {
    await pg.evaluate(() => { window.__failMedia = 1; });
    await shown('[data-testid=viewer-respond]').first().click();
    await pg.click('[data-testid=respond-voice]', { timeout: 5000 }).catch(() => {});
    await pg.waitForSelector('[data-testid=respond-voice-stop]', { timeout: 10000 }).catch(() => {});
    await pg.waitForTimeout(1300);
    await pg.click('[data-testid=respond-voice-stop]', { timeout: 5000 }).catch(() => {});
    // Longer than the walk's notice stays: one said behind the viewer is gone by the time it closes.
    await pg.waitForTimeout(7500);
    await pg.click('[data-testid=viewer-close]', { timeout: 5000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    behind = (await pg.locator('body').innerText()).includes(OUT);
  }
  check(viewerUp && behind, `unsaved-captures audit 9: a reply that failed in the viewer over the walk is said by the walk screen once the viewer closes (${viewerUp})`);
  if (await there('[data-testid=held-memo]', 2000)) await shown('[data-testid=held-memo-retry]').first().click();
  await pg.waitForTimeout(2500);

  // UN10: the recording bar's photo, refused out of room, says where its Retry is; UN2: Memories and the walk show it.
  await pg.click('[data-testid=walk-minimize]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  await tabTo(pg, 'explore').catch(() => {});
  await pg.waitForTimeout(1500);
  const keys0 = await mediaKeys();
  await pg.evaluate(() => { window.__failMedia = 1; });
  if (await there('[data-testid=bar-photo]', 5000)) await shoot('bar-photo');
  const barSaid = await textOf('[data-testid=recording-said]');
  await wide(320);
  // Whole: the clamped line is as tall as the same words unclamped.
  const saidBox = await pg.evaluate(() => {
    const e = document.querySelector('[data-testid=recording-said]');
    if (!e) return null;
    const free = e.cloneNode(true);
    free.style.webkitLineClamp = 'unset';
    free.style.display = 'block';
    free.style.overflow = 'visible';
    free.style.position = 'absolute';
    free.style.visibility = 'hidden';
    free.style.width = `${e.getBoundingClientRect().width}px`;
    e.parentElement.appendChild(free);
    const whole = free.getBoundingClientRect().height;
    free.remove();
    return { shown: e.getBoundingClientRect().height, whole };
  });
  const saidWhole = !!saidBox && saidBox.shown >= saidBox.whole - 1;
  await wide(390);
  check(/Retry on the walk screen\./.test(barSaid) && !barSaid.includes('held here'), `UN10: the bar's photo says its Retry is on the walk screen ("${barSaid}")`);
  check(barSaid === OUT_BAR, `unsaved-captures audit 7: the bar says the owner's words ("${barSaid}")`);
  check(saidWhole, `unsaved-captures audit 7: the bar's room words are whole at 320 px, nothing cut (${JSON.stringify(saidBox)})`);
  await pictures('bar-said');
  await tabTo(pg, 'chronicle', 'memories').catch(() => {});
  await pg.waitForTimeout(1500);
  const photoOnMemories = await there('[data-testid=held-captures]', 5000);
  check(photoOnMemories && /Photo not saved/.test(await textOf('[data-testid=held-captures]')), 'UN2: the bar\'s held photo shows on Memories, with Retry');

  // UN12: Retry keeps its file once; the row refused twice leaves one file, used again by each Retry.
  await pg.evaluate(() => { window.__failMoment = 1; });
  if (photoOnMemories) await shown('[data-testid=held-captures-act]').first().click();
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => { window.__failMoment = 1; });
  if (await there('[data-testid=held-captures]', 3000)) await shown('[data-testid=held-captures-act]').first().click();
  await pg.waitForTimeout(2500);
  const keys1 = await mediaKeys();
  const added = keys1.filter((k) => !keys0.includes(k));
  check(added.length === 1 && (await there('[data-testid=held-captures]', 2000)),
    `UN12: two refused Retries leave one kept file, and the photo still held (${added.length} new)`);

  // UN5, UN6, UN7: the bar's Stop warns of the photo held, on one line at 320 px, and the walk goes on; its fill empties.
  await wide(320);
  await hold('[data-testid=bar-stop]');
  const warned = await textOf('[data-testid=recording-said]');
  // Whole: nothing cut by the bar's two-line clamp, and no more than two lines (UN6, amended: see the spec's Decisions).
  const whole = await pg.evaluate(() => {
    const e = document.querySelector('[data-testid=recording-said]');
    if (!e) return false;
    const line = parseFloat(getComputedStyle(e).lineHeight) || 20;
    return e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1 && e.getBoundingClientRect().height < line * 2.5;
  });
  check(/Not saved yet\. Hold Stop again to end without it\./.test(warned) && (await there('[data-testid=recording-bar]', 2000)),
    `UN5, UN6: the bar's Stop warns of the held photo, and the walk goes on ("${warned}")`);
  check(whole, 'UN6: the bar\'s warning is whole at 320 px, two lines at most, nothing cut');
  await shot(pg, 'unsaved-bar-warning-320');
  await wide(390);
  await shot(pg, 'unsaved-bar-warning-390');
  check((await fillOf('[data-testid=bar-stop]')) === 0, `UN7: the bar's Stop is empty again after the refused hold (${await fillOf('[data-testid=bar-stop]')})`);

  // unsaved-captures audit 4: a second hold whose Stop fails keeps the walk's held captures.
  await pg.evaluate(() => { window.__failWalk = 1; });
  await hold('[data-testid=bar-stop]');
  const notStopped = await textOf('[data-testid=recording-said]');
  check(/could not be stopped/.test(notStopped) && (await there('[data-testid=held-captures]', 3000)),
    `unsaved-captures audit 4: a Stop that fails keeps the walk's held photo ("${notStopped}")`);
  await pg.evaluate(() => { window.__failWalk = 0; });
  await pg.waitForTimeout(6500);

  // UN8: the second hold ends the walk without it: no pill anywhere, and no file of it left.
  await hold('[data-testid=bar-stop]');
  await pg.waitForURL(/\/replay\//, { timeout: 15000 }).catch(() => {});
  const keys2 = await mediaKeys();
  check(added.length === 1 && /\/replay\//.test(pg.url()) && added.every((k) => !keys2.includes(k)),
    `UN8: the second hold ended the walk and removed the held photo's kept file (${pg.url().slice(-20)}, ${added.filter((k) => keys2.includes(k)).length} left)`);
  await tabTo(pg, 'chronicle', 'memories').catch(() => {});
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=moment-voice]', { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  check(added.length === 1 && !(await there('[data-testid=held-captures]', 1500)) && !(await there('[data-testid=held-memo]', 500)), 'UN8: nothing of the walk\'s held photo shows after the walk ended');

  // unsaved-captures audit 5: a memo whose save fails as Memories loses the front (a tab change) is said there on return.
  await tabTo(pg, 'chronicle', 'memories').catch(() => {});
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { window.__failMedia = 1; });
  await pg.click('[data-testid=band-voice]', { timeout: 10000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1300);
  await tabTo(pg, 'explore').catch(() => {});
  // Longer than Memories' error stays: a why said to the hidden line is gone by the time it is back.
  await pg.waitForTimeout(7500);
  await tabTo(pg, 'chronicle', 'memories').catch(() => {});
  await pg.waitForTimeout(1500);
  const onReturn = await textOf('[data-testid=band-error]');
  check(onReturn.includes(OUT) && (await there('[data-testid=band-voice-retry]', 1000)), `unsaved-captures audit 5: a memo failing as Memories loses the front is said on return ("${onReturn}")`);
  if (await there('[data-testid=band-voice-retry]', 1000)) await shown('[data-testid=band-voice-retry-act]').first().click();
  await pg.waitForTimeout(2500);
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=moment-voice]', { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(1500);

  // UN11: a memo for an open moment, refused; the moment is deleted meanwhile; Retry keeps it as its own moment.
  await shoot('moment-photo');
  if (await there('[data-testid=add-voice]', 5000)) {
    await pg.evaluate(() => { window.__failMedia = 1; });
    await pg.click('[data-testid=add-voice]', { timeout: 10000 }).catch(() => {});
    await pg.waitForSelector('[data-testid=moment-voice-save]', { timeout: 10000 }).catch(() => {});
    await pg.waitForTimeout(1300);
    await pg.click('[data-testid=moment-voice-save]').catch(() => {});
    await pg.waitForTimeout(1500);
  }
  const photoMoment = (await rows()).filter((m) => m.kinds[0] === 'photo' && !m.walk).sort((a, b) => b.t - a.t)[0];
  if (photoMoment) {
    await pg.evaluate((id) => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const tx = req.result.transaction('moment', 'readwrite');
        tx.objectStore('moment').delete(id);
        tx.oncomplete = () => resolve();
      };
    }), photoMoment.id);
  }
  const loose2 = (await voices(null)).length;
  if (await there('[data-testid=held-memo]', 3000)) await shown('[data-testid=held-memo-retry]').first().click();
  await pg.waitForTimeout(2500);
  const loose3 = await voices(null);
  check(!!photoMoment && loose3.length === loose2 + 1 && loose3.some((m) => m.kinds.length === 1) && !(await there('[data-testid=held-memo]', 1000)),
    `UN11: a memo for a moment deleted meanwhile is kept as a moment of its own (${loose2} → ${loose3.length})`);

  // UN15: held while the app is open: a reload drops what is held, and nothing of it is stored.
  await pg.evaluate(() => { window.__failMedia = 1; });
  await memo('moment');
  const heldBefore = await there('[data-testid=held-memo]', 3000);
  await pg.reload();
  await pg.waitForSelector('[data-testid=moment-voice]', { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(2000);
  check(heldBefore && !(await there('[data-testid=held-memo]', 1500)), 'UN15: a held memo lives while the app is open; a reload drops it');

  // UN13, UN7: a memo lost at the walk's Stop (its stop ignored) is said; the walk ends only on a second hold.
  await pg.click('[data-testid=start]').catch(() => {});
  await pg.waitForSelector('[data-testid=cap-voice]', { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  // Paused first (decision 0220): a memo recorded while paused is the one Stop can still lose (0009).
  await toStop(pg).catch(() => {});
  await pg.click('[data-testid=cap-voice]', { timeout: 10000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=voice-save]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1300);
  await pg.evaluate(() => { window.__stopOff = 1; });
  await hold('[data-testid=stop]');
  await pg.waitForTimeout(3500);
  const lost = /Couldn’t save this voice memo\. Hold Stop again to end the walk\./.test(await pg.locator('body').innerText());
  check(lost && /\/walk/.test(pg.url()), `UN13: a memo lost at Stop is said on the walk screen, and the walk goes on (${pg.url().slice(-12)})`);
  check((await fillOf('[data-testid=stop]')) === 0, `UN7: the walk's Stop is empty again after the refused hold (${await fillOf('[data-testid=stop]')})`);
  await pictures('walk-lost');
  await endIgnored();
  await hold('[data-testid=stop]');
  await pg.waitForURL(/\/replay\/|\/$/, { timeout: 15000 }).catch(() => {});
  check(lost && !/\/walk/.test(pg.url()), `UN13: the second hold ends the walk (${pg.url().slice(-20)})`);

  // The bar's said line: whole within its four-line clamp for its words (UN10's room line), and the lines it takes.
  const saidBoxOf = () => pg.evaluate(() => {
    const e = document.querySelector('[data-testid=recording-said]');
    if (!e) return null;
    const line = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.2;
    const free = e.cloneNode(true);
    Object.assign(free.style, { webkitLineClamp: 'unset', display: 'block', overflow: 'visible', position: 'absolute', visibility: 'hidden', width: `${e.getBoundingClientRect().width}px` });
    e.parentElement.appendChild(free);
    const wholeH = free.getBoundingClientRect().height;
    free.remove();
    const shownH = e.getBoundingClientRect().height;
    return { whole: shownH >= wholeH - 1 && e.scrollWidth <= e.clientWidth + 1, lines: Math.round(wholeH / line) };
  });

  // tend tabs T35 (the owner, Nov 18): a memo still being saved past the bar's 5 s wait is said as saving, not as
  // recording; the next hold ends the walk through it, the walk is kept (never dropped mid-save), and the memo lands in it.
  await pg.goto(navUrl);
  await pg.waitForSelector('[data-testid=start]', { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  await pg.click('[data-testid=start]').catch(() => {});
  await pg.waitForSelector('[data-testid=cap-voice]', { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(2500);
  const savingWalk = await pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
      g.onsuccess = () => resolve((g.result.find((w) => w.ended_at == null) ?? {}).id ?? null);
    };
  }));
  await pg.click('[data-testid=walk-minimize]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  await tabTo(pg, 'chronicle', 'memories').catch(() => {});
  await pg.waitForTimeout(1500);
  // The memo's file is read back slowly: its save runs past both holds' waits.
  await pg.evaluate(() => { window.__slowBlob = 25000; });
  await memo('band');
  // On Explore, where the bar shows its camera beside the line (tend tabs audit 46).
  await tabTo(pg, 'explore').catch(() => {});
  await pg.waitForTimeout(1500);
  await wide(320);
  await hold('[data-testid=bar-stop]');
  await pg.waitForTimeout(4500);
  const stillSaving = await textOf('[data-testid=recording-said]');
  const savingBox = await saidBoxOf();
  const savingWhole = !!savingBox && savingBox.whole;
  check(stillSaving === 'The voice memo is still being saved. Hold Stop again in a moment.' && (await there('[data-testid=recording-bar]', 2000)),
    `tend tabs T35: past the wait, the bar says the memo is still being saved, not recording, and the walk goes on ("${stillSaving}")`);
  check(savingWhole && (await there('[data-testid=bar-photo]', 1000)),
    `tend tabs audit 46: the bar's saving words are whole at 320 px with its camera shown, nothing cut (${JSON.stringify(savingBox)})`);
  await shot(pg, 'unsaved-bar-saving-explore-320');
  await wide(390);
  await shot(pg, 'unsaved-bar-saving-explore-390');
  await hold('[data-testid=bar-stop]');
  await pg.waitForURL(/\/replay\//, { timeout: 15000 }).catch(() => {});
  const through = /\/replay\//.test(pg.url());
  const inWalk0 = (await voices(savingWalk)).length;
  check(!!savingWalk && through && inWalk0 === 0,
    `tend tabs T35: the second hold ends the walk while the memo is still saving, and the walk is kept for its replay (${pg.url().slice(-20)}, ${inWalk0} kept yet)`);
  await pg.waitForTimeout(12000);
  const walkRow = await pg.evaluate((id) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('walk', 'readonly').objectStore('walk').get(id);
      g.onsuccess = () => resolve(g.result ?? null);
    };
  }), savingWalk);
  const inWalk = (await voices(savingWalk)).length;
  check(!!walkRow && walkRow.ended_at != null && inWalk === 1 && !(await there('[data-testid=held-memo]', 500)),
    `tend tabs T35: the memo saving through the stop lands once, in its ended walk (${inWalk} in walk, walk ${walkRow ? 'kept' : 'gone'})`);

  // A walk opened and minimized onto Memories, for the bar's Stop; its id.
  const walkOnMemories = async () => {
    await pg.goto(navUrl);
    await pg.waitForSelector('[data-testid=start]', { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    await pg.click('[data-testid=start]').catch(() => {});
    await pg.waitForSelector('[data-testid=cap-voice]', { timeout: 30000 }).catch(() => {});
    await pg.waitForTimeout(2500);
    const id = await pg.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('chronicles');
      req.onsuccess = () => {
        const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
        g.onsuccess = () => resolve((g.result.find((w) => w.ended_at == null) ?? {}).id ?? null);
      };
    }));
    await pg.click('[data-testid=walk-minimize]', { timeout: 10000 }).catch(() => {});
    await pg.waitForTimeout(1500);
    await tabTo(pg, 'chronicle', 'memories').catch(() => {});
    await pg.waitForTimeout(1500);
    return id;
  };
  const walkStands = (id) => pg.evaluate((w) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('walk', 'readonly').objectStore('walk').get(w);
      g.onsuccess = () => resolve(!!g.result);
    };
  }), id);

  // tend tabs audit 41: a memo kept by Undo of its discard is a save like any: the bar's Stop says it is still being
  // saved, and the walk it lands in is kept.
  const undoWalk = await walkOnMemories();
  await pg.click('[data-testid=band-voice]', { timeout: 10000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-discard]', { timeout: 10000 }).catch(() => {});
  await pg.waitForTimeout(1300);
  await pg.click('[data-testid=band-voice-discard]').catch(() => {});
  await pg.waitForSelector('[data-testid=band-voice-undo]', { timeout: 5000 }).catch(() => {});
  await pg.evaluate(() => { window.__slowBlob = 25000; });
  await shown('[data-testid=band-voice-undo-act]').first().click({ timeout: 5000 }).catch(() => {});
  await pg.waitForTimeout(900);
  await wide(320);
  await hold('[data-testid=bar-stop]');
  await pg.waitForTimeout(4500);
  const undoSaying = await textOf('[data-testid=recording-said]');
  check(undoSaying === 'The voice memo is still being saved. Hold Stop again in a moment.',
    `tend tabs audit 41: a memo kept by Undo of its discard holds the bar's Stop and keeps the walk: the first hold says it is saving ("${undoSaying}")`);
  await shot(pg, 'unsaved-bar-saving-320');
  await wide(390);
  await shot(pg, 'unsaved-bar-saving-390');
  await hold('[data-testid=bar-stop]');
  await pg.waitForURL(/\/replay\//, { timeout: 15000 }).catch(() => {});
  await pg.waitForTimeout(14000);
  const undoKept = (await voices(undoWalk)).length;
  check(!!undoWalk && /\/replay\//.test(pg.url()) && (await walkStands(undoWalk)) && undoKept === 1,
    `tend tabs audit 41: a memo kept by Undo of its discard holds the bar's Stop and keeps the walk: the walk stands with the memo in it (${undoKept})`);

  // tend tabs audit 42: a memo from Memories whose save fails while the walk screen's Stop is ending the walk stays held
  // (not let go unwarned with what the Stop warned of), its walk stands, and its Retry lands in that walk.
  const failWalk = await walkOnMemories();
  await pg.evaluate((id) => { window.__holdBlobUntilEnd(id); window.__failMedia = 1; }, failWalk);
  await memo('band');
  await pg.click('[data-testid=recording-return]', { timeout: 10000 }).catch(() => {});
  await pg.waitForSelector('[data-testid=cap-voice]', { timeout: 30000 }).catch(() => {});
  await pg.waitForTimeout(1500);
  await toStop(pg).catch(() => {});
  await hold('[data-testid=stop]');
  await pg.waitForURL(/\/replay\//, { timeout: 15000 }).catch(() => {});
  const failStood = /\/replay\//.test(pg.url()) && (await walkStands(failWalk));
  await pg.evaluate(() => { window.__failMedia = 0; });
  // Out of the first replay by its own way (a reload would drop what is held, UN15), to Chronicle's Memories.
  if (await there('[data-testid=not-now]', 15000)) await shown('[data-testid=not-now]').first().click().catch(() => {});
  await pg.waitForTimeout(1500);
  await tabTo(pg, 'chronicle', 'memories').catch(() => {});
  await pg.waitForTimeout(1500);
  const failHeld = await there('[data-testid=band-voice-retry]', 5000);
  check(!!failWalk && failStood && failHeld,
    `tend tabs audit 42: a memo from Memories failing while the walk screen stops stays held, and its walk stands (${pg.url().slice(-20)}, held ${failHeld})`);
  if (failHeld) await shown('[data-testid=band-voice-retry-act]').first().click();
  await pg.waitForTimeout(3000);
  const failKept = (await voices(failWalk)).length;
  check(failKept === 1 && !(await there('[data-testid=band-voice-retry]', 1000)),
    `tend tabs audit 42: the held memo's Retry lands in its walk (${failKept})`);
  await c.close();
}

module.exports = {
  name: 'unsaved',
  covers: [
    'src/lib/unsaved/**',
    'src/lib/stopEnd/**',
    'src/lib/useCaptures.ts',
    'src/lib/media/memoSave.ts',
    'src/components/RecordingBar.tsx',
    'src/components/MomentBar.tsx',
    'src/components/journal/OpenLine.tsx',
    'src/components/threads/ReplyDock.tsx',
    'src/components/planner/PlannerCapture.tsx',
    'src/app/walk.tsx',
    'src/components/ui.tsx',
    'scripts/e2e/failStorage.js',
  ],
  run,
};
