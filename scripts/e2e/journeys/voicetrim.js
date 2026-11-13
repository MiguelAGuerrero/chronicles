// Voice trim (VT1-VT12): a memo's Edit in the viewer, the trim-only editor, what is stored, what the
// viewer and the card say. E2E_ONLY=voicetrim runs it alone.

async function run(h) {
  const { url, check, freshPage, shot } = h;
  const { c, pg } = await freshPage('voicetrim', { permissions: ['geolocation', 'microphone'] });
  const there = (sel, timeout = 10000) => pg.waitForSelector(sel, { timeout }).then(() => true, () => false);
  const voiceRow = () => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('moment', 'readonly').objectStore('moment').getAll();
      g.onsuccess = () => resolve(g.result.map((m) => m.pieces[0]).filter((x) => x.kind === 'voice')[0] ?? null);
    };
  }));

  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  await there('[data-testid=capture-band]', 20000);
  // A memo of about four seconds from the fake microphone.
  await pg.click('[data-testid=band-voice]');
  await pg.waitForSelector('[data-testid=band-voice-save]', { timeout: 8000 });
  await pg.waitForTimeout(4200);
  await pg.click('[data-testid=band-voice-save]');
  await pg.waitForSelector('[data-testid=memories-list] [data-testid=moment-card]', { timeout: 15000 });
  const whole = await pg.locator('[data-testid=memories-list] [data-testid=moment-card]').first().innerText();
  await pg.locator('[data-testid=memories-list] [data-testid=moment-open]').first().click();
  await there('[data-testid=capture-viewer]');
  await pg.waitForTimeout(900);

  // VT1: Edit sits in the viewer's toolbar for a memo, opening a trim-only editor inside the viewer.
  const edit = await there('[data-testid=viewer-edit]', 5000);
  if (edit) await pg.click('[data-testid=viewer-edit]');
  const editor = edit && (await there('[data-testid=media-editor]', 5000));
  const tools = editor ? await pg.locator('[data-testid^=edit-tool-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').slice(10))) : [];
  check(edit && editor && tools.join(',') === 'trim', `VT1: a voice memo's viewer offers Edit, opening a trim-only editor (${edit}, ${tools})`);

  await pg.waitForTimeout(800);
  await shot(pg, 'voicetrim-editor-whole');
  // voice-trim ui 1: the trim bar fills the row (at least 70% of the 390 px viewport, handles included).
  const bar = editor ? await Promise.all([pg.locator('[data-testid=trim-start]').boundingBox(), pg.locator('[data-testid=trim-end]').boundingBox()]).catch(() => null) : null;
  const barW = bar && bar[0] && bar[1] ? bar[1].x - bar[0].x : 0;
  check(barW >= 390 * 0.7, `voice-trim ui 1: the trim bar is wide enough to cut precisely (${Math.round(barW)} px between the handles)`);
  // voice-trim ui 4: Revert says it is disabled while nothing is changed.
  const revertOff = editor ? await pg.locator('[data-testid=edit-revert]').getAttribute('aria-disabled').catch(() => null) : null;
  check(revertOff === 'true', `voice-trim ui 4: Revert is disabled for a screen reader while nothing is changed (${revertOff})`);

  // VT2, VT3: the whole memo kept at first; the end handle changes the kept times; Play is there.
  const label = editor ? await pg.locator('[data-testid=trim-label]').innerText().catch(() => '') : '';
  const end = editor ? await pg.locator('[data-testid=trim-end]').boundingBox().catch(() => null) : null;
  const start = editor ? await pg.locator('[data-testid=trim-start]').boundingBox().catch(() => null) : null;
  check(/^0:00 – 0:0[3-9]$/.test(label), `VT2: the editor opens with the whole memo kept ("${label}")`);
  let after = '';
  if (end && start) {
    const width = end.x - start.x;
    await pg.mouse.move(end.x + end.width / 2, end.y + end.height / 2);
    await pg.mouse.down();
    await pg.mouse.move(end.x + end.width / 2 - width * 0.4, end.y + end.height / 2, { steps: 8 });
    await pg.mouse.up();
    after = await pg.locator('[data-testid=trim-label]').innerText();
  }
  check(!!label && label !== after && /^0:00 – 0:0[1-3]$/.test(after), `VT2: dragging the end handle changes the kept times ("${label}" → "${after}")`);
  check((await pg.locator('[data-testid=trim-play]').count()) === 1, 'VT3: the editor has a Play button for the kept part');
  const ofWhole = editor ? await pg.locator('[data-testid=trim-whole]').innerText().catch(() => '') : '';
  check(/^of 0:0[3-9]$/.test(ofWhole), `VT11: the editor shows the whole length beside the kept span ("${ofWhole}")`);

  await shot(pg, 'voicetrim-editor-trimmed');

  // VT4, VT5: nothing stored until Done; then the trim is on the piece and the file is untouched.
  const before = await voiceRow();
  check(before && !before.edit?.trim, 'VT4: nothing is stored until Done');
  if (editor) {
    await pg.click('[data-testid=edit-done]');
    await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 10000 }).catch(() => {});
  }
  const row = await voiceRow();
  check(row?.edit?.trim && row.edit.trim.start_ms === 0 && row.edit.trim.end_ms >= 1000 && row.edit.trim.end_ms < Number(row.body) && row.file_path === before?.file_path && row.body === before?.body,
    `VT5: the trim is kept on the memo and the recording is as it was (${JSON.stringify({ trim: row?.edit?.trim, body: row?.body })})`);

  // VT6, VT11: the viewer says it in words with both times, and its clock reads against the kept part.
  const said = await pg.locator('[data-testid=capture-meta]').innerText().catch(() => '');
  check(/Trimmed\s·\s0:0[1-3]\sof\s0:0[3-9]/.test(said), `VT11: a trimmed memo's viewer says so with both times ("${said.replace(/\n/g, ' ')}")`);
  await pg.waitForTimeout(800);
  await shot(pg, 'voicetrim-viewer-trimmed');
  // voice-trim ui 3: the trimmed phrase never splits across lines (its spaces do not break).
  check(/Trimmed\u00a0\u00b7\u00a00:\d\d\u00a0of\u00a00:\d\d/.test(said), `voice-trim ui 3: "Trimmed · kept of whole" is one unbreakable phrase (${JSON.stringify(said)})`);
  const clock = await pg.locator('[data-testid=voice-time]').innerText().catch(() => '');
  check(/^0:00 \/ 0:0[1-3]$/.test(clock), `VT6: the clock reads against the kept length ("${clock}")`);
  await pg.click('[aria-label="Play voice memo"]').catch(() => {});
  await pg.waitForTimeout(3500);
  const stopped = await pg.evaluate(() => [...document.querySelectorAll('audio')].every((a) => a.paused));
  const again = await pg.locator('[aria-label="Play voice memo"]').count();
  check(stopped && again === 1, 'VT6: a trimmed memo stops at the kept part’s end and offers Play again');
  // voice-trim audit 2: Play after the end starts the kept part again and keeps playing.
  await pg.click('[aria-label="Play voice memo"]').catch(() => {});
  await pg.waitForTimeout(700);
  const replaying = await pg.evaluate(() => [...document.querySelectorAll('audio')].some((a) => !a.paused));
  check.todo(replaying, 'voice-trim audit 2: Play after a trimmed memo has ended plays it again, from the start');
  await pg.waitForTimeout(3000);

  // voice-trim audit 10: the editor reopens on the saved trim with the whole length beside it, Revert on, Close writes nothing.
  await pg.click('[data-testid=viewer-edit]').catch(() => {});
  await pg.waitForSelector('[data-testid=media-editor]', { timeout: 5000 }).catch(() => {});
  const reopened = await pg.locator('[data-testid=trim-label]').innerText().catch(() => '');
  const whole2 = await pg.locator('[data-testid=trim-whole]').innerText().catch(() => '');
  const revertOn = await pg.locator('[data-testid=edit-revert]').getAttribute('aria-disabled').catch(() => 'true');
  await pg.click('[data-testid=edit-close]').catch(() => {});
  await pg.waitForSelector('[data-testid=media-editor]', { state: 'detached', timeout: 5000 }).catch(() => {});
  const kept = await voiceRow();
  check.todo(reopened === `0:00 – 0:0${Math.round(row.edit.trim.end_ms / 1000)}` && /^of 0:0[3-9]$/.test(whole2) && revertOn !== 'true' && kept?.edit?.trim?.end_ms === row?.edit?.trim?.end_ms,
    `voice-trim audit 10: the editor reopens on the saved trim ("${reopened}", "${whole2}"), Revert on, Close writes nothing`);
  await pg.locator('[data-testid=viewer-close]').click({ timeout: 3000 }).catch(() => {});

  // VT10: the card says the kept length.
  await pg.waitForTimeout(600);
  const card = await pg.locator('[data-testid=memories-list] [data-testid=moment-card]').first().innerText();
  const len = (t) => (/Voice memo, (\d+:\d\d)/.exec(t) ?? [])[1];
  check(len(whole) && len(card) && len(card) !== len(whole), `VT10: the moment card says the kept length ("${len(whole)}" → "${len(card)}")`);
  await c.close();
}

module.exports = {
  name: 'voicetrim',
  // Voice trim (VT1-VT12): the viewer's Edit on a memo, the trim editor, the words on the viewer and the card.
  covers: [
    'src/components/edit/**',
    'src/components/{CaptureView,ceremony/Bubbles,chronicle/MomentCard}.tsx',
    'src/components/threads/ResponseEntry.tsx',
    'src/lib/{voiceTrim,editSession,mediaEdit}.ts',
  ],
  run,
};
