// Video thumbnails (VT1-VT9): a video's frame in every preview. Seeded straight into IndexedDB, with a real WebM made
// in the page. E2E_ONLY=videothumbs runs it alone.

async function run(h) {
  const { url, check, freshPage } = h;
  const { c, pg } = await freshPage('videothumbs');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  check.todo(false, 'VT1: a video kept on the web gets its frame as a small copy');
  check.todo(false, 'VT3: every preview shows the frame');
  check.todo(false, 'VT4: a video\'s frame keeps its play mark');
  check.todo(false, 'VT6: an edit makes a new copy');
  check.todo(false, 'VT8: the web\'s frame stays on the device');
  await c.close();
}

module.exports = {
  name: 'videothumbs',
  covers: ['src/lib/thumbPlan.ts', 'src/lib/media/thumb.ts', 'src/lib/media/index.web.ts', 'src/lib/thumbs/**', 'src/components/VideoMark.tsx'],
  run,
};
