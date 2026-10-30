// maplibre-gl loads its web worker as a separate module, which Metro does not
// bundle. Copy it into public/ so Expo serves it next to the app, at the same
// version as the installed package.
const fs = require('fs');
const path = require('path');

const src = require.resolve('maplibre-gl/dist/maplibre-gl-worker.mjs');
const dest = path.join(__dirname, '..', 'public', 'maplibre-gl-worker.mjs');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
