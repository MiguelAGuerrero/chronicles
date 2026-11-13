// Memo transcripts (TX7-TX9, TX14): nothing shows while a memo has no words; a stored transcript appears as a caption
// under the memo on the journal page and in the viewer, labelled as the phone's reading. The web reads no memos
// (phones only), so the row is stored the way the phone's shell stores it. E2E_ONLY=transcript runs it alone.

async function run(h) {
  const { url, check, freshPage, shot } = h;
  const { c, pg } = await freshPage('transcript', { permissions: ['geolocation', 'microphone'] });
  const there = (sel, timeout = 10000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const entries = '[data-testid=journal-page] [data-testid=moment-card]';
  const voiceId = () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
      g.onsuccess = () => resolve(g.result.flatMap((m) => m.pieces).filter((x) => x.kind === 'voice')[0]?.id ?? null);
    };
  }));

  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await there('[data-testid=capture-band]', 20000);
  await pg.click('[data-testid=band-voice]');
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 });
  await pg.waitForTimeout(4200);
  await pg.click('[data-testid=band-voice-save]');
  await pg.waitForSelector(entries, { timeout: 15000 });
  await pg.waitForTimeout(1200);

  // TX9: while there are no words, nothing shows, anywhere.
  const before = await pg.locator('[data-testid=memo-transcript]').count();
  const id = await voiceId();
  const seeded = await pg.evaluate((pieceId) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('transcript', 'readwrite');
        tx.objectStore('transcript').put({ capture_id: pieceId, text: ' the bakery  before it opens ', lang: 'en-US', from_ms: null, to_ms: null, made_at: 1 });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch { resolve(false); }
    };
    req.onerror = () => resolve(false);
  }), id).catch(() => false);
  await pg.reload();
  await pg.waitForSelector(entries, { timeout: 20000 }).catch(() => {});
  await pg.waitForTimeout(1200);

  await shot(pg, 'transcript-journal');
  // TX8: the journal's voice note shows the words under its bar.
  const inLine = await pg.locator(`${entries} [data-testid=memo-transcript]`).first().innerText().catch(() => '');
  check(before === 0 && seeded === true && inLine === 'the bakery before it opens', `TX8, TX9: nothing shows without words; the stored words appear under the journal's voice note (${before}, ${seeded}, "${inLine}")`);

  // TX7, TX14: the viewer shows them as a caption, labelled as the phone's reading.
  await pg.locator(`${entries} [data-testid=moment-open]`).first().click().catch(() => {});
  await there('[data-testid=capture-viewer]');
  await pg.waitForTimeout(900);
  await shot(pg, 'transcript-viewer');
  const words = await pg.locator('[data-testid=capture-viewer] [data-testid=memo-transcript]').innerText().catch(() => '');
  check(words === 'the bakery before it opens', `TX7: the viewer shows the words as a caption under the memo ("${words}")`);
  const label = await pg.locator('[data-testid=capture-viewer] [data-testid=memo-transcript-label]').innerText().catch(() => null);
  const italic = await pg.locator('[data-testid=capture-viewer] [data-testid=memo-transcript]').evaluate((e) => getComputedStyle(e).fontStyle).catch(() => '');
  check(label === 'Read by your phone' && italic === 'italic', `TX14, memo-transcripts audit 13: a sighted person is told it is the phone's reading, and the words are set apart ("${label}", ${italic})`);
  await pg.locator('[data-testid=viewer-close]').click({ timeout: 3000 }).catch(() => {});
  // memo-transcripts audit 16: a long transcript wraps in the journal and in the viewer's card without covering the bars.
  const long = 'we passed the bakery before it opened and the smell of bread was already in the street and then the fox statue by the river came up on the left and we stopped there for a while to look at the light on the water '.repeat(2).trim();
  await pg.evaluate(([pieceId, text]) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const tx = req.result.transaction('transcript', 'readwrite');
      tx.objectStore('transcript').put({ capture_id: pieceId, text, lang: 'en-US', from_ms: null, to_ms: null, made_at: 2 });
      tx.oncomplete = () => resolve(true);
    };
  }), [id, long]);
  await pg.reload();
  await pg.waitForSelector(entries, { timeout: 20000 }).catch(() => {});
  await pg.waitForTimeout(1200);
  await shot(pg, 'transcript-journal-long');
  await pg.locator(`${entries} [data-testid=moment-open]`).first().click().catch(() => {});
  await there('[data-testid=capture-viewer]');
  await pg.waitForTimeout(900);
  await shot(pg, 'transcript-viewer-long');
  const boxes = await pg.evaluate(() => {
    const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
    return { words: r('[data-testid=capture-viewer] [data-testid=memo-transcript]'), close: r('[data-testid=viewer-close]') };
  });
  check(!!boxes.words && !!boxes.close && boxes.words.top > boxes.close.bottom, `memo-transcripts audit 16: a long transcript in the viewer stays under the top bar (${JSON.stringify(boxes)})`);
  await c.close();
}

module.exports = {
  name: 'transcript',
  covers: [
    'src/components/MemoTranscript.tsx',
    'src/lib/useTranscript.ts',
    'src/lib/transcript/**',
  ],
  run,
};
