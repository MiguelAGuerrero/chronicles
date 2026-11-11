// Memo transcripts (MX1-MX27): a memo's words read on the device, with the model fetched on a tap and the engine
// loaded only for a run. The harness injects a stub engine (a test harness, as with mocked GPS) so the whole web
// path runs: the row in the walk settings, the dialog, the download from a local file, a run in a Worker that is
// terminated, and the words under the memo, on the card and in a thread. The real engine is timed by hand.
// Written before the code: every check is a todo. E2E_ONLY=transcripts runs it alone.

async function run(h) {
  const { check, freshPage } = h;
  const { c, pg } = await freshPage('transcripts');
  const seen = new Set();
  c.on('request', (r) => seen.add(new URL(r.url()).host));
  const count = (id) => pg.locator(`[data-testid=${id}]`).count();
  const text = async (id) => (await count(id)) ? pg.locator(`[data-testid=${id}]`).first().innerText() : '';

  // MX10, MX11: the switch is a row in the walk settings, off, and asks before anything comes down.
  check.todo((await count('transcribe-switch')) === 1, 'MX10: the walk settings hold the "Transcribe memos on this phone" switch, shown on the web too');
  check.todo((await pg.locator('[data-testid=transcribe-switch]').getAttribute('aria-checked')) === 'false', 'MX10: the switch is off by default, with a screen reader label');
  check.todo((await text('transcribe-line')) === '', 'MX13: with the switch off the row says nothing about the model');
  check.todo((await pg.evaluate(() => performance.getEntriesByType('resource').filter((e) => /model/.test(e.name)).length)) === 0, 'MX11: nothing is fetched before Download');
  check.todo((await count('transcribe-ask')) === 1 && /sixty megabytes/.test(await text('transcribe-ask')) && !/[0-9]/.test(await text('transcribe-ask')), 'MX11: turning it on asks, the size in words');

  // MX12, MX13, MX15: a download, an eviction and a removal, each said in words.
  check.todo((await count('transcribe-download')) === 1, 'MX12: Download fetches the pinned file and installs it');
  check.todo(/Couldn.t get it/.test(await text('transcribe-line')), 'MX12: a wrong file is said in words and installs nothing');
  check.todo((await count('transcribe-remove')) === 1, 'MX15: turning it off offers Remove the model, on the owner\'s tap only');

  // MX1, MX2, MX8, MX9: the words under a memo, on the card and in a thread, always with place and time.
  check.todo((await text('transcript-words')).length > 0, 'MX1: a memo with a transcript shows its words under it in the viewer');
  check.todo((await text('transcript-label')) === 'Heard by this phone', 'MX1: the words are labelled "Heard by this phone"');
  check.todo((await count('transcript-edit')) === 0, 'MX3: a transcript has no edit control');
  check.todo((await count('memo-play')) >= 0 && (await count('transcript-pending')) === 0, 'MX2: a memo with no transcript shows and plays as before, with no pending state');
  check.todo((await count('card-transcript-label')) === 1, 'MX8: the resurfaced card and the thread row carry the same label, set apart from a note');
  check.todo((await text('transcript-context')).length > 0, 'MX9: the words never appear without the moment\'s place and time');

  // MX16, MX17, MX25: a run in a Worker, nothing held while idle, capture never waits.
  check.todo((await pg.evaluate(() => window.__transcribeStub?.workers === 0)) === true, 'MX16: while idle no Worker and no engine exist');
  check.todo((await pg.evaluate(() => window.__transcribeStub?.terminated >= 1)) === true, 'MX25: a run\'s Worker is terminated when it ends');
  check.todo((await count('cap-photo')) === 1, 'MX17: the capture buttons stay one tap away while a run is going');

  // MX23, MX26: nothing but the app's own host and the Pages host; no cross-origin isolation needed.
  check.todo([...seen].every((x) => ['localhost', '127.0.0.1', 'miguelaguerrero.github.io', 'tiles.openfreemap.org'].includes(x) || x.startsWith('localhost')), `MX23: a web run reaches no other host (${[...seen].join(', ')})`);
  check.todo((await pg.evaluate(() => window.crossOriginIsolated)) === false && (await pg.evaluate(() => window.__transcribeStub?.ran === true)) === true, 'MX26: the run works on a page served without COOP and COEP');
  check.todo((await text('transcribe-line')).length === 0 || !/[0-9]/.test(await text('transcribe-line')), 'MX23: no count, percentage or progress in the slice\'s copy');
  check.todo((await pg.evaluate(() => (window.__transcribeStub?.unsupportedSaid ?? '') !== '')) === true, 'MX27: a browser that cannot run the engine says so in words and fetches nothing');

  await c.close();
}

module.exports = {
  name: 'transcripts',
  covers: ['src/lib/transcribe/**', 'src/components/StartSettings.tsx', 'src/components/CaptureView.tsx', 'src/components/chronicle/**'],
  run,
};
