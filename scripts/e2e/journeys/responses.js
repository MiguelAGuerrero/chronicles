// Response thread (RT1-RT14, decision 0128): a moment's responses in a sheet over the viewer. Seeded straight into
// IndexedDB. E2E_ONLY=responses runs it alone.

async function run(h) {
  const { url, check, freshPage } = h;
  const { c, pg } = await freshPage('responses');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  check.todo(false, 'RT1: More has Responses and the info line names them, only on a moment with responses');
  check.todo(false, 'RT2: a swipe up opens the sheet on a moment with responses, does nothing on one without; a swipe across still steps the pieces');
  check.todo(false, 'RT3: the sheet is inside the viewer (one dialog), opens at half, drags to full, closes with a drag down, Close and Escape');
  check.todo(false, 'RT5: every entry shows its date and time, place, walk line and content');
  check.todo(false, 'RT6: an entry opens alone in the viewer and Back returns to the sheet');
  check.todo(false, 'RT7: a note kept from the sheet\'s Respond answers the sheet\'s moment and shows at the end of the sheet');
  check.todo(false, 'RT8: delete a response, it leaves the sheet; Undo brings it back');
  check.todo(false, 'RT10: no badge, unread or avatar mark, and every entry has the same ink and the same alignment');
  check.todo(false, 'RT11: with the sheet closed nothing interactive sits over the photo; the toolbar fits on 320 px');
  check.todo(false, 'RT12: opening, reading and closing the sheet writes nothing to IndexedDB');
  check.todo(false, 'RT13: a response on a walk still open is listed, with no replay link');
  await c.close();
}

module.exports = {
  name: 'responses',
  covers: [
    'src/components/threads/{ResponsesSheet,ResponseEntry,useMomentPool}.tsx',
    'src/components/threads/useMomentPool.ts',
    'src/components/CaptureView.tsx',
    'src/lib/threads/{responses,lines}.ts',
  ],
  run,
};
