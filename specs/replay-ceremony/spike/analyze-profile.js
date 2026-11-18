// Reads a profile written by perf-replay.js (PERF_PROFILE) and groups its time.
//
//   node analyze-profile.js <profile.json> [<raw-*.json>] [<dist dir with index-*.js.map>]
//
// With the raw file, the profile is cut into windows on the page's clock (a long stretch with the map moving; a photo's
// card held with the map still); with the source map, every function is named by the source file it came from.
const fs = require('fs');
const path = require('path');
const [, , file, rawFile, dist] = process.argv;
const { sync, profile } = JSON.parse(fs.readFileSync(file, 'utf8'));
const raw = rawFile && rawFile !== '-' ? JSON.parse(fs.readFileSync(rawFile, 'utf8')).P : null;

let trace = null;
if (dist) {
  // Metro's map is one section per module: the module a line belongs to is the last section starting at or before it.
  const dir = path.join(dist, '_expo/static/js/web');
  const mapFile = fs.readdirSync(dir).find((f) => /^index-.*\.js\.map$/.test(f));
  const secs = JSON.parse(fs.readFileSync(path.join(dir, mapFile), 'utf8')).sections.map((x) => [x.offset.line, (x.map.sources ?? [])[0] ?? '']);
  trace = (line) => {
    let lo = 0;
    let hi = secs.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (secs[mid][0] <= line) lo = mid; else hi = mid - 1; }
    return secs[lo][1];
  };
}

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const srcOf = new Map();
const source = (n) => {
  if (srcOf.has(n.id)) return srcOf.get(n.id);
  const f = n.callFrame;
  let s = f.url ? f.url.split('/').pop().split('?')[0] : '';
  if (trace && /index-.*\.js$/.test(s)) s = trace(f.lineNumber, f.columnNumber) ?? s;
  srcOf.set(n.id, s);
  return s;
};
// The group a function's own time belongs to.
function group(n) {
  const f = n.callFrame;
  const name = f.functionName;
  const s = source(n);
  if (name === '(idle)') return 'idle';
  if (name === '(program)') return 'browser (program: paint, composite, GL readback)';
  if (name === '(garbage collector)') return 'garbage collector';
  if (name === '__perfSyncMarker') return 'harness';
  if (!f.url) return 'harness / native';
  if (/node_modules\/maplibre-gl\//.test(s) || /maplibre/.test(f.url)) return 'maplibre';
  if (/node_modules\/(react-dom|react|scheduler)\//.test(s)) return 'react (render, reconcile, commit)';
  if (/node_modules\/react-native-web\//.test(s) || /node_modules\/(styleq|inline-style-prefixer|postcss-value-parser|@react-native\/normalize-colors)\//.test(s)) return 'react-native-web (styles, Animated, View/Text)';
  if (/src\/lib\/ceremony\//.test(s)) return 'ceremony core (rhythmFrame, story)';
  if (/src\/components\/ceremony\//.test(s)) return 'stage overlays (Cards, Bubbles, Pile, Whispers, RollingClock)';
  if (/src\/components\/map\//.test(s) || /src\/lib\/(pins|useZoomPins|markNames)/.test(s)) return 'WalkMap.web + pins (app code)';
  if (/src\/app\/replay\//.test(s)) return 'replay screen (app/replay/[id].tsx)';
  if (/src\//.test(s)) return 'other app code';
  if (/node_modules\//.test(s)) return 'other libraries';
  return 'other';
}

// The profile's clock against the page's: the first sample inside the marker function.
const times = [];
let t = profile.startTime;
for (let i = 0; i < profile.samples.length; i++) { t += profile.timeDeltas[i]; times.push(t); }
let offset = null;
if (sync != null) {
  const i = profile.samples.findIndex((id) => byId.get(id).callFrame.functionName === '__perfSyncMarker');
  if (i >= 0) offset = times[i] / 1000 - sync;
}
const pageT = (i) => (offset == null ? null : times[i] / 1000 - offset);

function windows() {
  if (!raw || offset == null) return [{ name: 'whole profile', keep: () => true }];
  const { beat, classifier } = require('./summarise');
  const { T0, T1 } = beat(raw);
  const { cls } = classifier(raw);
  return [
    { name: `path beat (${((T1 - T0) / 1000).toFixed(1)} s)`, keep: (p) => p >= T0 && p <= T1 },
    { name: '(a) stretches: no card up, the walker and the map moving', keep: (p) => cls(p) === 'stretch' },
    { name: '(b) a photo card up (the walker creeps along its stop under it)', keep: (p) => cls(p) === 'photo' },
  ];
}

// Whose work a sample is: the innermost frame on its stack that names a job decides.
const MAPLIBRE_JOBS = [
  [/^_update$/, 'DOM markers: maplibre Marker._update on each move'],
  [/^(_updatePlacement|placeLayerBucketPart|continuePlacement|updateLayerOpacities|_placeNextBucket|updateBucketOpacities)$/, 'maplibre: symbol placement'],
  [/^(setData|_updateWorkerData|_sendWorkerUpdate|_getLoadGeoJSONParameters)$/, 'maplibre: setData, sending GeoJSON to the worker'],
  [/^(receive|processTask|completeTask|_onWorkerUpdateResult|loadTile|reloadTile|loadVectorData|_tileLoaded|_reloadTile|_loadTile)$/, 'maplibre: worker answers and tile reloads (main-thread side)'],
  [/^(_render|render)$/, 'maplibre: render (draw calls, source updates)'],
  [/^(jumpTo|_fireMoveEvents)$/, 'maplibre: jumpTo (transform, move events)'],
];
const DOM_COMMIT = /^(commitMutationEffectsOnFiber|recursivelyTraverseMutationEffects|commitHostUpdate|updateProperties|setValueForStyles|setValueForStyle|setProp|commitUpdate|commitTextUpdate)$/;
function job(id) {
  const leaf = byId.get(id);
  const ln = leaf.callFrame.functionName;
  if (ln === '(idle)') return 'idle';
  if (ln === '(program)') return 'browser, outside JS: (program)';
  if (ln === '(garbage collector)') return 'garbage collector';
  // The harness's own frames (the init script: no URL, a real line). Its listener on the worker is where a worker's
  // answer is deserialised (the first read of `e.data`), which maplibre's own `receive` would pay without it.
  const mine = (n) => !n.callFrame.url && n.callFrame.lineNumber >= 0 && n.callFrame.functionName !== '(root)';
  if (mine(leaf)) {
    const up = byId.get(parent.get(id));
    if (!leaf.callFrame.functionName && (!up || up.callFrame.functionName === '(root)') && leaf.callFrame.lineNumber >= 50 && leaf.callFrame.lineNumber <= 58) return 'maplibre: worker answers, deserialising each message (structured clone)';
    return 'harness (the measurement itself)';
  }
  let maplibre = false;
  for (let k = id; k != null; k = parent.get(k)) {
    const n = byId.get(k);
    const name = n.callFrame.functionName;
    const s = source(n);
    if (name === '__perfSyncMarker') return 'harness';
    if (/node_modules\/maplibre-gl\//.test(s)) {
      maplibre = true;
      for (const [re, what] of MAPLIBRE_JOBS) if (re.test(name)) return what;
      continue;
    }
    if (/src\/components\/ceremony\//.test(s)) return 'stage overlays: their render (Cards, Bubbles, Pile, Whispers, RollingClock, Stage)';
    if (/src\/lib\/ceremony\//.test(s)) return 'ceremony core (rhythmFrame, pathDrawnAt, clock)';
    if (/src\/components\/map\/|src\/lib\/(pins|useZoomPins)/.test(s)) return maplibre ? 'maplibre: other, called from WalkMap' : 'WalkMap.web and pins: their own code (render body, effects, GeoJSON builders)';
    if (/src\/app\/replay\//.test(s)) return 'replay screen: its render body';
    if (/react-dom/.test(s) && DOM_COMMIT.test(name)) return 'React commit: DOM and style writes';
  }
  if (maplibre) return 'maplibre: other (timers, events)';
  const s = source(leaf);
  if (/node_modules\/(react-dom|react|scheduler)\//.test(s)) return 'React: render, reconcile, effects bookkeeping';
  if (/node_modules\/(react-native-web|styleq|inline-style-prefixer)\//.test(s)) return 'react-native-web: style resolution, View/Text/Animated';
  if (!leaf.callFrame.url) return 'native callbacks with no JS caller';
  if (/src\//.test(s)) return 'other app code';
  return 'other libraries';
}

const label = (n) => `${n.callFrame.functionName || '(anonymous)'} ${source(n).replace(/^.*node_modules\//, '').replace(/^.*\/src\//, 'src/')}:${n.callFrame.lineNumber + 1}`;
for (const w of windows()) {
  let total = 0;
  const groups = new Map();
  const self = new Map();
  const incl = new Map();
  const inclGroup = new Map();
  const jobs = new Map();
  profile.samples.forEach((id, i) => {
    const p = pageT(i);
    if (p != null && !w.keep(p)) return;
    const dt = profile.timeDeltas[i] ?? 0;
    total += dt;
    const n = byId.get(id);
    const g = group(n);
    groups.set(g, (groups.get(g) ?? 0) + dt);
    const j = job(id);
    jobs.set(j, (jobs.get(j) ?? 0) + dt);
    self.set(label(n), (self.get(label(n)) ?? 0) + dt);
    const seen = new Set();
    const seenG = new Set();
    for (let k = id; k != null; k = parent.get(k)) {
      const m = byId.get(k);
      if (!m.callFrame.url) continue;
      const l = label(m);
      if (!seen.has(l)) { seen.add(l); incl.set(l, (incl.get(l) ?? 0) + dt); }
      const gg = group(m);
      if (!seenG.has(gg)) { seenG.add(gg); inclGroup.set(gg, (inclGroup.get(gg) ?? 0) + dt); }
    }
  });
  const pct = (v) => `${((v / total) * 100).toFixed(1).padStart(5)}%`;
  console.log(`\n=== ${w.name}: ${(total / 1e6).toFixed(1)} s sampled ===`);
  const busy = total - (jobs.get('idle') ?? 0);
  console.log(`busy ${((busy / total) * 100).toFixed(1)}% of the window. By whose work (innermost named job on the stack), % of the window and of busy JS time:`);
  const js = busy - (jobs.get('browser, outside JS: (program)') ?? 0);
  for (const [k, v] of [...jobs].sort((a, b) => b[1] - a[1])) console.log(`  ${pct(v)}  ${/idle|program/.test(k) ? '      ' : `${((v / js) * 100).toFixed(1).padStart(5)}%`}  ${k}`);
  console.log('self time by source:');
  for (const [k, v] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`  ${pct(v)}  ${k}`);
  console.log('time under each group (inclusive, a sample counts once per group on its stack):');
  for (const [k, v] of [...inclGroup].sort((a, b) => b[1] - a[1])) console.log(`  ${pct(v)}  ${k}`);
  const N = Number(process.env.TOP ?? 22);
  console.log('top self time:');
  for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, N)) console.log(`  ${pct(v)}  ${k}`);
  console.log('top total time:');
  for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, N + 18)) console.log(`  ${pct(v)}  ${k}`);
}
