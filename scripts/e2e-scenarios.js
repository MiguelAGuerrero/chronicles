// The e2e's journeys and the source files each one covers (affected checks, AC9), read from
// scripts/e2e/journeys/*.js: each file exports { name, covers, run }, and the file is the
// registration. `npm run check:affected` names the journeys that cover a changed file, to run
// with `E2E_ONLY=<name> npm run e2e:web` after `npm run export:web`. Each journey runs alone in
// a fresh browser, a fraction of the full flow.
//
// The owner's rule (decision 0074): a slice that changes a screen adds or extends a journey for
// its change, with its `covers`, and runs only the journeys check:affected names. The full flow
// (`npm run e2e:web` with no E2E_ONLY, about 15 minutes; `full.js`) runs only when the owner
// asks; it has no row. `affected.test.ts` fails while a journey file has no `covers`, or its
// name differs from its file's.
// Globs: `**` any depth, `*` within one folder, `{a,b}` either.

const fs = require('fs');
const path = require('path');

const JOURNEYS = path.join(__dirname, 'e2e', 'journeys');

const SCENARIOS = fs
  .readdirSync(JOURNEYS)
  .filter((f) => f.endsWith('.js'))
  .sort()
  .map((f) => ({ file: `scripts/e2e/journeys/${f}`, ...require(path.join(JOURNEYS, f)) }))
  .filter((j) => !j.full)
  .map((j) => ({ name: j.name, covers: j.covers, file: j.file }));

module.exports = { SCENARIOS };
