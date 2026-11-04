// The full flow (no E2E_ONLY): every journey's checks once, in the order the one sequential story ran them,
// about 15 minutes. It runs only when the owner asks (decision 0074). It has no `covers` and no row in
// SCENARIOS. Each block is a journey file's `checks(h)`, which continues from the screen the one before
// it left; the fresh-browser flows and the five named journeys run after the shared page's story.

const journey = (name) => require(`./${name}`);

async function run(h) {
  await journey('launch').checks(h);
  await journey('walk').checks(h);
  await journey('chronicle').checks(h);
  await journey('notifications').checks(h);
  await journey('atlas').checks(h);
  await journey('memories').checks(h);
  await journey('days').checks(h);
  await journey('sensors').checks(h);
  await journey('launch').fresh(h);
  for (const name of ['tabs', 'gaps', 'ready', 'hidden', 'nudge']) await journey(name).run(h);
  await journey('deletion').checks(h);
  h.nothingLeaves();
  h.noConsoleErrors();
}

module.exports = { name: 'full', full: true, run };
