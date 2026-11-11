// Memo transcripts (MX1-MX27): a memo's words read on the device, with the model fetched on a tap and the engine
// loaded only for a run. The harness puts a stub engine in the page before the app loads (`__transcribeStub`, a test
// harness as with mocked GPS) and serves a tiny model pack from a route, so the whole web path runs: the row in the
// walk settings, the dialog, the download checked against its hash and unzipped into Cache Storage, a run that loads
// and releases the engine, a real browser decode of the memo, and the words under the memo and on the cards. The
// real engine in a real browser is timed by hand (docs/NATIVE_UNVERIFIED.md). E2E_ONLY=transcripts runs it alone.
const crypto = require('crypto');
const { Buffer } = require('buffer');
const { zipSync, strToU8 } = require('fflate');

const POOL = ['the stub heard the bakery', 'it was quiet by the river'];

/** The page's side of the stub engine (runs before the app): counts loads and releases; says the words it is told. */
const STUB = ({ sha, unavailable }) => {
  const s = { loads: 0, releases: 0, runs: 0, live: false, samples: [] };
  s.engine = {
    id: 'stub',
    offline: true,
    inputs: ['samples16k'],
    model: { url: `${location.origin}/stub-model.zip`, sha256: sha, bytes: 1024, size: 'about a kilobyte', tag: `stub@${sha.slice(0, 8)}` },
    available: async () => !unavailable,
    load: async () => { s.loads++; s.live = true; },
    transcribe: async (a) => {
      if (!s.live) throw new Error('not loaded');
      s.samples.push(a.data.length);
      return ['the stub heard the bakery', 'it was quiet by the river'][s.runs++ % 2];
    },
    release: async () => { s.releases++; s.live = false; },
  };
  window.__transcribeStub = s;
};

/** Two voice memos, days old, a second of tone each, in the media store: a real file for the browser to decode. */
const SEED = () => {
  const DAY = 86400000;
  const now = Date.now();
  const wav = () => {
    const rate = 8000;
    const n = rate;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const w = (o, str) => [...str].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(i / 10) * 8000, true);
    return new Blob([buf], { type: 'audio/wav' });
  };
  const memos = [['mx1', now - 3 * DAY, 'walks/moments/mx1.wav'], ['mx2', now - 4 * DAY, 'walks/moments/mx2.wav']];
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chronicles');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction(['moment', 'media'], 'readwrite');
      for (const [id, t, key] of memos) {
        tx.objectStore('media').put({ key, blob: wav() });
        tx.objectStore('moment').put({ id, walk_id: null, t, lat: 41.81, lon: -71.4, segment_id: null, piece_ids: [id], pieces: [{ id, moment_id: id, t, kind: 'voice', file_path: key, body: '1000' }] });
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
  });
};

const rowsOf = (pg, store) => pg.evaluate((name) => new Promise((resolve) => {
  const req = indexedDB.open('chronicles');
  req.onsuccess = () => {
    const g = req.result.transaction(name, 'readonly').objectStore(name).getAll();
    g.onsuccess = () => resolve(g.result);
  };
}), store);

async function run(h) {
  const { check, freshPage, url, drawerTo, tabTo } = h;
  const pack = Buffer.from(zipSync({ 'config.json': strToU8('{}'), 'onnx/model.onnx': strToU8('stub') }));
  const sha = crypto.createHash('sha256').update(pack).digest('hex');

  const open = async (label, unavailable) => {
    const { c, pg } = await freshPage(label);
    const asked = [];
    const everything = [];
    c.on('request', (r) => {
      everything.push(r.url());
      if (/stub-model/.test(r.url())) asked.push(r.url());
    });
    await c.route('**/stub-model.zip', (route) => route.fulfill({ status: 200, contentType: 'application/zip', body: pack }));
    await c.addInitScript(STUB, { sha, unavailable });
    await pg.goto(url);
    await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
    await pg.waitForTimeout(1500);
    return { c, pg, asked, everything };
  };
  const toMemories = async (pg) => {
    await tabTo(pg, 'explore');
    await tabTo(pg, 'chronicle', 'memories');
    await pg.waitForSelector('[data-testid=moment-card]', { timeout: 20000 });
  };
  const toSettings = async (pg) => {
    await tabTo(pg, 'navigate');
    await drawerTo(pg, 'full');
    await pg.waitForSelector('[data-testid=transcribe-switch]', { timeout: 10000 });
  };
  const count = (pg, id) => pg.locator(`[data-testid=${id}]`).count();
  const text = async (pg, id) => ((await count(pg, id)) ? (await pg.locator(`[data-testid=${id}]`).first().innerText()).replace(/\s+/g, ' ') : '');
  const isOn = async (pg) => (await pg.locator('[data-testid=transcribe-switch]').getAttribute('aria-checked')) === 'true';

  // ---- A browser that can run the engine.
  const { c, pg, asked, everything } = await open('transcripts');
  await pg.evaluate(SEED);
  await toMemories(pg);

  // MX2: a memo with no transcript shows as before: no words, no pending state, no label.
  check((await count(pg, 'card-transcript')) === 0 && (await count(pg, 'transcript-pending')) === 0 && /oice memo/.test(await pg.locator('[data-testid=moment-card]').first().innerText()),
    'MX2: a memo with no transcript shows as a voice memo, with no words, no label and no pending state');

  // MX10, MX13: the switch is a row in the walk settings, off, and says nothing about the model while off.
  await toSettings(pg);
  check((await count(pg, 'transcribe-switch')) === 1 && !(await isOn(pg)), 'MX10: the walk settings hold the "Transcribe memos on this phone" switch, off by default, on the web too');
  check((await pg.locator('[data-testid=transcribe-switch]').getAttribute('role')) === 'switch' && /Transcribe memos on this phone/.test(await pg.locator('[data-testid=transcribe-switch]').getAttribute('aria-label') || ''),
    'MX10: the switch has a screen reader role and label');
  check((await count(pg, 'transcribe-line')) === 0 && asked.length === 0, 'MX13: with the switch off the row says nothing about the model, and nothing was fetched at launch');

  // MX11: turning it on asks, the size in words, and fetches nothing; Not now leaves it off.
  await pg.click('[data-testid=transcribe-switch]');
  await pg.waitForSelector('[data-testid=transcribe-ask]', { timeout: 5000 });
  const ask = await text(pg, 'transcribe-ask');
  check(/about a kilobyte/.test(ask) && !/[0-9]/.test(ask) && asked.length === 0, `MX11, MX23: turning it on asks with the size in words, no digit, and fetches nothing (${ask})`);
  await pg.click('[data-testid=transcribe-notnow]');
  await pg.waitForTimeout(300);
  check((await count(pg, 'transcribe-ask')) === 0 && !(await isOn(pg)) && asked.length === 0, 'MX11: Not now leaves the switch off and fetches nothing');

  // MX12: Download fetches the one pinned pack, checks it, unzips it into Cache Storage and turns the switch on.
  await pg.click('[data-testid=transcribe-switch]');
  await pg.waitForSelector('[data-testid=transcribe-download]', { timeout: 5000 });
  await pg.click('[data-testid=transcribe-download]');
  await pg.waitForSelector('[data-testid=transcribe-switch][aria-checked=true]', { timeout: 15000 });
  const cached = await pg.evaluate(async () => (await (await caches.open('chronicles-models')).keys()).map((r) => r.url));
  check(asked.length === 1 && cached.length >= 3 && cached.some((u) => u.endsWith('/.complete')) && (await count(pg, 'transcribe-line')) === 0,
    `MX12, MX13: the Download tap fetched the pack once and it is in Cache Storage, whole (${asked.length} fetch, ${cached.length} entries)`);

  // MX16, MX17: a run loads the engine once, reads each memo, and lets it go; nothing is held while idle.
  await pg.waitForFunction(() => window.__transcribeStub.runs >= 2 && window.__transcribeStub.live === false, null, { timeout: 20000 });
  const st = await pg.evaluate(() => ({ loads: window.__transcribeStub.loads, releases: window.__transcribeStub.releases, runs: window.__transcribeStub.runs, live: window.__transcribeStub.live, lens: window.__transcribeStub.samples }));
  check(st.loads === 1 && st.releases >= 1 && st.live === false && st.runs === 2, `MX16, MX17: one load for the run, one read for each memo, released after (${JSON.stringify({ ...st, lens: st.lens.length })})`);
  check(st.lens.every((n) => n > 15000 && n < 17000), `MX20: the browser decoded each memo to about a second of 16 kHz samples (${st.lens})`);

  // MX4, MX6: stored by piece id with the engine and tag; the memo rows are untouched.
  const rows = (await rowsOf(pg, 'transcript')).sort((a, b) => a.piece_id.localeCompare(b.piece_id));
  const moments = (await rowsOf(pg, 'moment')).filter((m) => /^mx/.test(m.id)).sort((a, b) => a.id.localeCompare(b.id));
  check(rows.length === 2 && rows.every((r) => r.engine === 'stub' && /^stub@/.test(r.tag) && r.text && r.text.length > 0) && POOL.includes(rows[0].text),
    `MX4: each memo's words are stored by piece id with the engine and tag (${rows.map((r) => `${r.piece_id}: ${r.text}`).join('; ')})`);
  check(moments.length === 2 && moments.every((m) => m.pieces.length === 1 && m.pieces[0].file_path === `walks/moments/${m.id}.wav` && m.pieces[0].kind === 'voice'), 'MX4: the memos themselves are unchanged');

  // MX8, MX9, MX24: the words on the card with the label, and with the moment's own context.
  await toMemories(pg);
  await pg.waitForSelector('[data-testid=card-transcript-label]', { timeout: 15000 });
  const label = await text(pg, 'card-transcript-label');
  const words = await text(pg, 'card-transcript-words');
  const ctx = await text(pg, 'moment-context');
  check(label === 'Heard by this phone' && POOL.some((w) => words.includes(w)), `MX1, MX8: a card shows a memo's words with the label (${label}: ${words})`);
  check(ctx.length > 0, `MX9: the card's words are never without the moment's place and time (${ctx})`);

  // MX1, MX3: the viewer shows the words under the memo, labelled, with no way to edit them.
  await pg.locator('[data-testid=moment-card]:has([data-testid=card-transcript])').first().click();
  await pg.waitForSelector('[data-testid=transcript-words]', { timeout: 15000 });
  check((await text(pg, 'transcript-label')) === 'Heard by this phone' && POOL.some((w) => w === '') === false && POOL.includes(await text(pg, 'transcript-words')), 'MX1: the viewer shows the words under the memo with the label, as heard');
  check((await text(pg, 'capture-meta')).length > 0, 'MX9: the viewer\'s line gives the moment\'s place and time with the words');
  check((await count(pg, 'transcript-edit')) === 0 && (await count(pg, 'transcript-pending')) === 0, 'MX3: a transcript has no edit control');
  await pg.locator('[data-testid=viewer-close]').click();
  await pg.waitForSelector('[data-testid=viewer-close]', { state: 'detached', timeout: 5000 });

  // MX15: turning the switch off offers Remove, on the owner's tap; Remove deletes the pack and keeps every transcript.
  await toSettings(pg);
  await pg.click('[data-testid=transcribe-switch]');
  await pg.waitForSelector('[data-testid=transcribe-remove]', { timeout: 5000 });
  check(!(await isOn(pg)) && (await pg.evaluate(async () => (await (await caches.open('chronicles-models')).keys()).length)) >= 3, 'MX15: turning it off keeps the model until the owner taps Remove');
  await pg.click('[data-testid=transcribe-remove]');
  await pg.waitForTimeout(500);
  const left = await pg.evaluate(async () => (await (await caches.open('chronicles-models')).keys()).length);
  const line = await text(pg, 'transcribe-line');
  check(left === 0 && line === 'The room is back.' && !/[0-9]/.test(line) && (await rowsOf(pg, 'transcript')).length === 2, `MX15: Remove deletes the model, says the room is back in words, and keeps the transcripts (${line})`);

  // MX23: the run reached no host of the engine's own.
  check(!everything.some((u) => /huggingface|jsdelivr|onnx|\.wasm/.test(u)), 'MX23: no request went to a host or file of the engine\'s own');
  await c.close();

  // ---- A browser that cannot run the engine (MX27).
  const b = await open('transcripts-unsupported', true);
  await toSettings(b.pg);
  await b.pg.click('[data-testid=transcribe-switch]');
  await b.pg.waitForTimeout(600);
  const said = await text(b.pg, 'transcribe-line');
  check(/can.t read memos/.test(said) && b.asked.length === 0, `MX27: a browser that cannot run the engine says so in words and fetches nothing (${said})`);
  await b.c.close();
}

module.exports = {
  name: 'transcripts',
  covers: [
    'src/lib/transcribe/**',
    'src/components/TranscribeSettings.tsx',
    'src/components/StartSettings.tsx',
    'src/components/CaptureView.tsx',
    'src/components/chronicle/**',
  ],
  run,
};
