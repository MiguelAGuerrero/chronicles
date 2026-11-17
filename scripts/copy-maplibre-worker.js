// Files the web build serves next to the app that Metro does not bundle, copied
// into public/ (gitignored) so Expo's export puts them in dist/. Run on install
// (postinstall), by export:web and by the e2e baseline; a new worktree runs it once.
// - maplibre-gl's web worker, a separate module, at the installed package's version.
// - The place-name pack (assets/gazetteer/places.json, the one committed copy): the
//   web fetches it on first search (src/lib/gazetteer/source.web.ts, PACK_FILE in
//   pack.ts) instead of inlining it in the entry script; a web exception,
//   docs/ARCHITECTURE.md. Phones bundle it with `require`.
const fs = require('fs');
const path = require('path');

const pub = path.join(__dirname, '..', 'public');
const copy = (src, rel) => {
  const dest = path.join(pub, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};
copy(require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs'), 'maplibre-gl-worker.mjs');
copy(path.join(__dirname, '..', 'assets', 'gazetteer', 'places.json'), path.join('gazetteer', 'places.json'));
