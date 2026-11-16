// The full flow (no E2E_ONLY): every journey's checks once, in the order the one sequential story ran them,
// about 15 minutes. It runs only when the owner asks (decision 0074). It has no `covers` and no row in
// SCENARIOS. Each block is a journey file's `checks(h)`, which continues from the screen the one before
// it left; the fresh-browser flows and the five named journeys run after the shared page's story.
//
// STEPS is the one list of what it runs: `npm run e2e:all` (scripts/e2e-all.js) reads `journeys` to run every
// other journey by name, and the `# journey: <name>` line before each block to count each journey's checks.

const journey = (name) => require(`./${name}`);

const STEPS = [
  ['launch', 'checks'],
  ['walk', 'checks'],
  ['chronicle', 'checks'],
  ['notifications', 'checks'],
  ['atlas', 'checks'],
  ['memories', 'checks'],
  ['days', 'checks'],
  ['sensors', 'checks'],
  ['launch', 'fresh'],
  ...['tabs', 'gaps', 'ready', 'hidden', 'nudge', 'snap'].map((name) => [name, 'run']),
  ['deletion', 'checks'],
];

async function run(h) {
  for (const [name, step] of STEPS) {
    console.log(`# journey: ${name}`);
    await journey(name)[step](h);
  }
  console.log('# journey: full');
  h.nothingLeaves();
  h.noConsoleErrors();
}

module.exports = { name: 'full', full: true, run, journeys: [...new Set(STEPS.map(([name]) => name))] };
