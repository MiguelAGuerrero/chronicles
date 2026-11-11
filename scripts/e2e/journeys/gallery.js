// Media gallery (MG1-MG22): Chronicle's Media section. Seeded straight into IndexedDB. E2E_ONLY=gallery runs it alone.

async function run(h) {
  const { url, check, freshPage } = h;
  const { c, pg } = await freshPage('gallery');
  await pg.goto(url);
  await pg.waitForSelector('[data-testid=tab-chronicle]', { timeout: 30000 });
  check.todo(false, 'MG1: Media is the fifth section and resets to Memories');
  check.todo(false, 'MG2: five labels in one row at 320 px');
  check.todo(false, 'MG4: tiles are bare');
  check.todo(false, 'MG7: nothing counts on Media, its menu or its viewer');
  check.todo(false, 'MG8: a tile opens its moment at its piece, with its context; steps follow the gallery; Close keeps the scroll');
  check.todo(false, 'MG10: empty in words');
  check.todo(false, 'MG11: a photo tile loads its small copy');
  check.todo(false, 'MG13: a delete leaves at once and Undo brings it back');
  check.todo(false, 'MG16: the day\'s header stays pinned while its tiles scroll');
  check.todo(false, 'MG17: no capture stack on Media');
  check.todo(false, 'MG19: a month opens its days');
  check.todo(false, 'MG20: Zoom In and Out from the menu, and a pinch');
  check.todo(false, 'MG21: Aspect Ratio Grid shows a photo whole in its square cell');
  await c.close();
}

module.exports = {
  name: 'gallery',
  covers: ['src/components/gallery/**', 'src/lib/gallery/**', 'src/components/chronicle/SectionBar.tsx'],
  run,
};
