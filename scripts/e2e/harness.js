// The e2e harness: the local server over dist/, the fake street grid and tiles, Overture's fake bucket, the
// browser with its init scripts, and the helpers every journey shares. `createHarness()` returns them as one
// object `h`; a journey (scripts/e2e/journeys/<name>.js) destructures what it uses. Test harness only: the
// browser's GPS is mocked with Playwright and the tile host is replaced by a small fake street grid (a GeoJSON
// source tiled at z14, like OpenMapTiles), so it runs without network access to OpenFreeMap. The app itself has
// no simulation.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
// Ionicons' glyphs, to tell which icon a button draws (tabs audit U10, U11).
const IONS = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
const glyph = (name) => String.fromCodePoint(IONS[name]);
// A glyph's icon name, for messages: the characters themselves don't print.
const iconOf = (text) => Object.keys(IONS).find((k) => glyph(k) === text) ?? JSON.stringify(text);

// E2E_DIST=<dir> serves another export (a second build while one run is still going).
const DIST = process.env.E2E_DIST ?? path.join(__dirname, '..', '..', 'dist');
// The sub-path the build was exported for (GitHub Pages serves it at /chronicles).
const BASE = process.env.E2E_BASE ?? '';
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };

/**
 * Places worth the stop (PW1-PW3): the e2e build reads the places archive from `/places-e2e/` on this server
 * (`export:web` sets EXPO_PUBLIC_PLACES_BASE), so no journey reaches another host. An empty manifest unless a
 * journey sets one; every request is logged with the headers PW1 forbids.
 */
const PLACES_PATH = '/places-e2e/';
const places = { manifest: JSON.stringify({ schema: 1, regions: [] }), files: {}, asked: [] };

function servePlaces(q, r, pathname) {
  const name = pathname.slice(PLACES_PATH.length);
  places.asked.push({ name, range: q.headers.range ?? null, cookie: q.headers.cookie ?? null, referer: q.headers.referer ?? null });
  const cors = { 'access-control-allow-origin': '*' };
  if (name === 'manifest.json') {
    r.writeHead(200, { ...cors, 'content-type': 'application/json' });
    r.end(places.manifest);
    return;
  }
  const file = places.files[name];
  if (!file) {
    r.writeHead(404, cors);
    r.end();
    return;
  }
  const m = /bytes=(\d+)-(\d+)/.exec(q.headers.range ?? '');
  const from = m ? Number(m[1]) : 0;
  const to = Math.min(m ? Number(m[2]) : file.length - 1, file.length - 1);
  r.writeHead(m ? 206 : 200, { ...cors, 'content-type': 'application/octet-stream', 'accept-ranges': 'bytes', 'content-length': String(to - from + 1), ...(m ? { 'content-range': `bytes ${from}-${to}/${file.length}` } : {}) });
  r.end(Buffer.from(file.subarray(from, to + 1)));
}

function serve() {
  // Unknown paths get index.html, as GitHub Pages serves 404.html; .mjs must be
  // served as JavaScript for the map worker. Paths outside BASE are a 404.
  const server = http.createServer((q, r) => {
    const pathname = decodeURIComponent(q.url.split('?')[0]);
    if (pathname.startsWith(PLACES_PATH)) return servePlaces(q, r, pathname);
    if (!pathname.startsWith(`${BASE}/`)) {
      r.writeHead(404);
      r.end();
      return;
    }
    let p = path.join(DIST, pathname.slice(BASE.length));
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(DIST, 'index.html');
    r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(r);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

// A grid of streets 100 m apart near Fox Point, Providence. Arnold Street lies on a z14 tile edge.
const O = [-71.4, 41.82];
const dLat = 100 / 111320;
const dLon = 100 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x, y) => [O[0] + x * dLon, O[1] + y * dLat];
/** Metres between two points, near O. */
const distanceM = (a, b) => 100 * Math.hypot((a[0] - b[0]) / dLon, (a[1] - b[1]) / dLat);
const features = [];
const names = ['Wickenden Street', 'Transit Street', 'Arnold Street', 'Williams Street'];
const xs = [-1.5, -0.5, 0.5, 1.5, 2.5, 3.5];
const ys = [-1.5, -0.5, 0.5, 1.5];
ys.forEach((y, i) => features.push({ type: 'Feature', properties: { class: 'minor', name: names[i] }, geometry: { type: 'LineString', coordinates: [at(-2, y), at(4, y)] } }));
xs.forEach((x) => features.push({ type: 'Feature', properties: { class: 'minor' }, geometry: { type: 'LineString', coordinates: [at(x, -2), at(x, 2)] } }));
features.push({ type: 'Feature', properties: { class: 'neighbourhood', name: 'Fox Point' }, geometry: { type: 'Point', coordinates: at(1, 0) } });
// Atlas grading (AG3): a neighborhood 6 km west, far from every other area and place, whose ring holds
// one café: too little on the map to say anything about its kinds. E2E_ONLY=grading goes there.
features.push({ type: 'Feature', properties: { class: 'neighbourhood', name: 'Quiet Hollow' }, geometry: { type: 'Point', coordinates: at(-60, 0) } });
features.push({ type: 'Feature', properties: { class: 'cafe', subclass: 'cafe', name: 'Hollow Café' }, geometry: { type: 'Point', coordinates: at(-60.5, 0.3) } });
// A town point 2.9 km east: in reach of the walk, but outside the z14 tiles read for its streets.
features.push({ type: 'Feature', properties: { class: 'city', name: 'Providence' }, geometry: { type: 'Point', coordinates: at(29, 0) } });
// Points of interest for discovery (D1): a memorial and an unnamed artwork are
// attractions on Fox Point's checklist; a café and a plain church are places but never
// on a checklist (S18, S20); a bus stop is not a place.
features.push({ type: 'Feature', properties: { class: 'monument', subclass: 'memorial', name: 'Hessian Memorial' }, geometry: { type: 'Point', coordinates: at(0.65, -0.35) } });
features.push({ type: 'Feature', properties: { class: 'cafe', subclass: 'cafe', name: 'Coffee Exchange' }, geometry: { type: 'Point', coordinates: at(-0.6, 0.4) } });
features.push({ type: 'Feature', properties: { class: 'place_of_worship', subclass: 'place_of_worship', name: 'Grace Church' }, geometry: { type: 'Point', coordinates: at(-0.4, -0.6) } });
features.push({ type: 'Feature', properties: { class: 'art_gallery', subclass: 'artwork' }, geometry: { type: 'Point', coordinates: at(1.1, 0.6) } });
features.push({ type: 'Feature', properties: { class: 'bus', subclass: 'bus_stop', name: 'Wickenden at Hope' }, geometry: { type: 'Point', coordinates: at(0.4, -0.6) } });
// Three more out east, within Fox Point's 1 km but far from the walk: on its checklist, never in range (E3, E6).
features.push({ type: 'Feature', properties: { class: 'park', subclass: 'park', name: 'Gano Park' }, geometry: { type: 'Point', coordinates: at(5.4, 0.6) } });
features.push({ type: 'Feature', properties: { class: 'bakery', subclass: 'bakery', name: 'Sunny Bakery' }, geometry: { type: 'Point', coordinates: at(5.2, -1.0) } });
features.push({ type: 'Feature', properties: { class: 'museum', subclass: 'museum', name: 'Fox Point Museum' }, geometry: { type: 'Point', coordinates: at(4.6, 1.8) } });
// Kind walk (KW1-KW14): Green Row, a neighborhood 12 km west, far from every other area, with one street and six parks in
// three clumps along it (three cells of green, each within 300 m of the street). E2E_ONLY=kindwalk goes there.
features.push({ type: 'Feature', properties: { class: 'neighbourhood', name: 'Green Row' }, geometry: { type: 'Point', coordinates: at(-120, 0) } });
features.push({ type: 'Feature', properties: { class: 'minor', name: 'Row Street' }, geometry: { type: 'LineString', coordinates: [at(-130, 0), at(-110, 0)] } });
[[-126, 'Elm'], [-125.7, 'Oak'], [-121, 'Ash'], [-120.8, 'Fir'], [-115, 'Yew'], [-114.8, 'Bay']].forEach(([x, n]) => {
  features.push({ type: 'Feature', properties: { class: 'park', subclass: 'park', name: `${n} Green` }, geometry: { type: 'Point', coordinates: at(x, 1) } });
});
// Three memorials by the start of Row Street, in one cell: History along the parks' routes, so a row can say it "also passes" it (WP28).
[[-124.2, 'First'], [-124, 'Second'], [-123.8, 'Third']].forEach(([x, n]) => {
  features.push({ type: 'Feature', properties: { class: 'monument', subclass: 'memorial', name: `${n} Memorial` }, geometry: { type: 'Point', coordinates: at(x, 0.8) } });
});
// A busy strip 1.1 km east of Fox Point (v1.5 landing): Thayer Street lined with shops for 250 m,
// inside the read around a press at Fox Point, and inside the walk's own explore read (E2).
features.push({ type: 'Feature', properties: { class: 'tertiary', name: 'Thayer Street' }, geometry: { type: 'LineString', coordinates: [at(11, -3), at(11, 3)] } });
features.push({ type: 'Feature', properties: { class: 'minor', name: 'Angell Street' }, geometry: { type: 'LineString', coordinates: [at(9, 0.2), at(13, 0.2)] } });
for (let i = 0; i <= 10; i++) {
  const [cls, sub] = i % 2 ? ['cafe', 'cafe'] : ['shop', 'gift'];
  features.push({ type: 'Feature', properties: { class: cls, subclass: sub, name: `Thayer ${i}` }, geometry: { type: 'Point', coordinates: at(11 + (i % 2 ? 0.15 : -0.15), -1.2 + i * 0.25) } });
}
// Activity density (AD3, AD4): Brook Street, 200 m east of Thayer, has its places only in Overture's tiles: nine
// restaurants 6 m off it, plus one Overture is unsure of and one closed, which never count.
features.push({ type: 'Feature', properties: { class: 'tertiary', name: 'Brook Street' }, geometry: { type: 'LineString', coordinates: [at(13, -3), at(13, 3)] } });
const overtureFeatures = [];
const ovPlace = (id, name, xy, extra = {}) => overtureFeatures.push({
  type: 'Feature', geometry: { type: 'Point', coordinates: at(...xy) },
  properties: { id, '@name': name, confidence: '0.95', operating_status: 'open', taxonomy: '{"primary":"restaurant","hierarchy":["food_and_drink","restaurant"]}', ...extra },
});
for (let i = 0; i < 9; i++) ovPlace(`brook-${i}`, `Brook ${i}`, [13 + (i % 2 ? 0.06 : -0.06), -0.92 + i * 0.25]);
ovPlace('brook-unsure', 'Brook Unsure', [13.06, 1.33], { confidence: '0.5' });
ovPlace('brook-closed', 'Brook Closed', [12.94, 1.58], { operating_status: 'permanently_closed' });
// Complexes (CX1, CX4, CX9): the Wickenden Street Arcade, a named building with a long name (the UI review's longest case, decision 0145), 80 m across a block west of Fox Point's point, holding nine
// restaurants (Overture's places) and drawn in Overture's `buildings`; served only while the complexes journey asks for it, so
// no other journey's busy streets or areas change.
const complexWorld = { serve: false };
const complexPlaces = [];
for (let i = 0; i < 9; i++) {
  complexPlaces.push({
    type: 'Feature', geometry: { type: 'Point', coordinates: at(-1.1 + 0.2 * (i % 4), -0.9 + 0.2 * Math.floor(i / 4)) },
    properties: { id: `arcade-${i}`, '@name': `Arcade ${i}`, confidence: '0.95', operating_status: 'open', taxonomy: '{"primary":"restaurant","hierarchy":["food_and_drink","restaurant"]}' },
  });
}
const complexBuildings = [
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[at(-1.2, -1.0), at(-0.4, -1.0), at(-0.4, -0.2), at(-1.2, -0.2), at(-1.2, -1.0)]] }, properties: { id: 'arcade-building', '@name': 'The Wickenden Street Arcade and Public Market Hall at Transit Street' } },
];
// Town outlines (TO10): Overture's divisions, with a town only in the outlines journey (elsewhere none is in them).
// Pawtucket is known only by its outline, a 2 km square around the start; Providence's city point is 2.9 km east.
const divisionFeatures = [
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[at(-10, -10), at(10, -10), at(10, 10), at(-10, 10), at(-10, -10)]] },
    properties: { subtype: 'locality', class: 'land', '@name': 'Pawtucket', division_id: 'pawtucket', id: 'pawtucket-area' } },
  { type: 'Feature', geometry: { type: 'Point', coordinates: at(-3, 4) }, properties: { subtype: 'locality', '@name': 'Pawtucket', id: 'pawtucket' } },
  // Town borders (TB1): a neighbor east of it, drawn as a thin line.
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[at(10, -10), at(20, -10), at(20, 10), at(10, 10), at(10, -10)]] },
    properties: { subtype: 'locality', class: 'land', '@name': 'Central Falls', division_id: 'central-falls', id: 'central-falls-area' } },
];
const divisions = { serve: false };
// The Walkability layer (specs/walkability-urban-form): Overture's transportation tile around the start. A dense grid of
// residential streets 100 m apart with a connector at every crossing, which reads easy on foot, and two long arterials 1.2 km
// east with next to no junctions, which read built around cars.
const transportFeatures = [];
const mph = (v) => JSON.stringify([{ max_speed: { unit: 'mph', value: v }, between: [0, 1] }]);
const wkConn = (id, p) => transportFeatures.push({ type: 'Feature', properties: { id }, geometry: { type: 'Point', coordinates: p } });
const wkSeg = (id, props, a, b, ids = []) => transportFeatures.push({
  type: 'Feature', properties: { id, subtype: 'road', ...props, connectors: JSON.stringify(ids.map((c, k) => ({ connector_id: c, at: k / Math.max(1, ids.length - 1) }))) },
  geometry: { type: 'LineString', coordinates: [a, b] },
});
const GRID = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
for (const gx of GRID) for (const gy of GRID) wkConn(`c${gx}_${gy}`, at(gx, gy));
for (const gy of GRID) wkSeg(`h${gy}`, { class: 'residential', '@name': `Grid ${gy} Street`, speed_limits: mph(25) }, at(-5, gy), at(5, gy), GRID.map((gx) => `c${gx}_${gy}`));
for (const gx of GRID) wkSeg(`v${gx}`, { class: 'residential', speed_limits: mph(25) }, at(gx, -5), at(gx, 5), GRID.map((gy) => `c${gx}_${gy}`));
wkConn('far-w', at(14, -2)); wkConn('far-e', at(26, -2));
wkSeg('far-a', { class: 'primary', '@name': 'Route 6', speed_limits: mph(55) }, at(14, -2), at(26, -2), ['far-w', 'far-e']);
wkSeg('far-b', { class: 'primary', '@name': 'Route 7', speed_limits: mph(55) }, at(14, 3), at(26, 3), []);
// The Overpass answer for the same ground, for when Overture can't be read (WK1b).
const overpassAnswer = { elements: [
  { type: 'way', id: 1, tags: { highway: 'secondary', 'sidewalk:both': 'no', maxspeed: '35 mph', name: 'Route 6' }, geometry: [{ lat: at(0, 3)[1], lon: at(-2, 3)[0] }, { lat: at(0, 3)[1], lon: at(2, 3)[0] }] },
] };
// What the transportation archive holds: 'ok' the fixture, 'grid' every street of the grid as a fast road (the heads-up
// journey), 'broken' a 200 that is not a PMTiles file (not a 404, which would be a console error), so Overture "can't be read".
const walkability = { mode: 'ok' };
const OVERPASS_HOST = 'overpass-api.de';
// Discrete navigation (DN1-DN13): four neighborhoods around Fox Point, one each way, and a second town
// west of Providence, only in the snap journey (serveSnap), so other journeys' areas don't change.
const snapFeatures = [
  { type: 'Feature', properties: { class: 'neighbourhood', name: 'Wickenden' }, geometry: { type: 'Point', coordinates: at(10, 0) } },
  { type: 'Feature', properties: { class: 'neighbourhood', name: 'Point Street' }, geometry: { type: 'Point', coordinates: at(-9, 0) } },
  { type: 'Feature', properties: { class: 'neighbourhood', name: 'Hope Village' }, geometry: { type: 'Point', coordinates: at(1, 12) } },
  { type: 'Feature', properties: { class: 'neighbourhood', name: 'Ship Street' }, geometry: { type: 'Point', coordinates: at(1, -11) } },
  { type: 'Feature', properties: { class: 'town', name: 'Cranston' }, geometry: { type: 'Point', coordinates: at(-40, 2) } },
];
const snapWorld = { serve: false };
// Whole towns (WT5-WT14, decision 0132), with snapWorld and its Allentown border: a hamlet and a ward inside the border,
// and six murals 30 m apart beside Wickenden, so its map has more places than room. Only in the carousel's wholeTowns.
const wholeFeatures = [
  { type: 'Feature', properties: { class: 'hamlet', name: 'Quarry Hill' }, geometry: { type: 'Point', coordinates: at(-20, 15) } },
  { type: 'Feature', properties: { class: 'neighbourhood', name: '3rd Ward' }, geometry: { type: 'Point', coordinates: at(-15, 8) } },
  ...['A', 'B', 'C', 'D', 'E', 'F'].map((n, i) => ({ type: 'Feature', properties: { class: 'art_gallery', subclass: 'artwork', name: `Mural ${n}` }, geometry: { type: 'Point', coordinates: at(9.4 + i * 0.3, 0.6) } })),
];
const wholeWorld = { serve: false };
// Quiet Hollow's town (fix explore-town-scope): near you Explore lists towns, and a neighborhood is on its town's page, so the
// grading journey serves a town point beside it; only there, so other journeys' rows don't change.
const hollowFeatures = [{ type: 'Feature', properties: { class: 'town', name: 'Hollow' }, geometry: { type: 'Point', coordinates: at(-61, 0.5) } }];
const hollowWorld = { serve: false };
// Scenic routes (SR2-SR14): India Point Park one block north of Transit Street, 30 m off it, with a footway
// through it from the street at x=-0.5 to the one at x=3.5; only in the scenic journey (scenicWorld.serve),
// so other journeys' routes don't change. Transit Street is the direct way; the footway is 15% longer.
const scenicFeatures = [
  { type: 'Feature', properties: { class: 'path', subclass: 'footway' }, geometry: { type: 'LineString', coordinates: [at(-0.5, -0.2), at(3.5, -0.2)] } },
  { type: 'Feature', properties: { class: 'grass', subclass: 'park' }, geometry: { type: 'Polygon', coordinates: [[at(0, -0.32), at(3, -0.32), at(3, -0.08), at(0, -0.08), at(0, -0.32)]] } },
  { type: 'Feature', properties: { class: 'park', subclass: 'park', name: 'India Point Park' }, geometry: { type: 'Point', coordinates: at(1.5, -0.25) } },
];
const scenicWorld = { serve: false };
// Discrete navigation's town swipe (the owner, Nov 4: Allentown to Catasauqua kept Allentown's zoom): a 4 km town
// around the start and a 600 m one north-east of it, served in place of the others while both flags are on.
// Catasauqua is a town on the map too (a place point inside its border), as the real one is.
const snapTownFeatures = [
  { type: 'Feature', properties: { class: 'town', name: 'Catasauqua' }, geometry: { type: 'Point', coordinates: at(20.5, 6.5) } },
];
const snapDivisionFeatures = [
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[at(-25, -20), at(15, -20), at(15, 20), at(-25, 20), at(-25, -20)]] },
    properties: { subtype: 'locality', class: 'land', '@name': 'Allentown', division_id: 'allentown', id: 'allentown-area' } },
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[at(18, 4), at(24, 4), at(24, 10), at(18, 10), at(18, 4)]] },
    properties: { subtype: 'locality', class: 'land', '@name': 'Catasauqua', division_id: 'catasauqua', id: 'catasauqua-area' } },
  // Neighborhood boundaries (HB9): Point Street has a real shape, 800 m across; the other three neighborhoods have only their points.
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[at(-13, -4), at(-5, -4), at(-5, 4), at(-13, 4), at(-13, -4)]] },
    properties: { subtype: 'neighborhood', class: 'land', '@name': 'Point Street', division_id: 'point-street', id: 'point-street-area' } },
];
// A dense downtown (explore-dense-city, the owner's Baltimore report, Nov 12): 3 km around the start with a named street
// every 60 m cut into blocks as OSM ways are, an unnamed alley between each pair, 2,000 places thickest in the middle, a
// city point, eight neighborhoods on a 700 m ring and one, Far Point, 2.2 km west, past what the first busy read covers.
// Served only while denseWorld.serve is on (the dense journey and scripts/perf-explore.js), so no other journey changes.
// Smooth switches (SS1-SS10, the owner's small-town report, Nov 13): Smallton, 20 km east of the harness's other places, with
// its Main Street, five neighborhoods 0.9-1.3 km from its point each with a short shopping street and a cross street, and Far
// Hollow 2.4 km west, past one read's 1.5 km, so a town's page has more than one remembered area. Served only while
// smallWorld.serve is on (the switches journey).
const smallWorld = { serve: false };
const SMALL_TOWN = [200, 0];
const SMALL_HOODS = [['Mill End', 188, 2, 'Mill Street'], ['Church Hill', 196, 10, 'Church Street'], ['Depot', 212, 4, 'Depot Street'],
  ['Riverside', 207, -6, 'River Road'], ['Westfield', 192, -9, 'Field Avenue'], ['Far Hollow', 176, 0, 'Hollow Lane']];
const smallFeatures = (() => {
  const out = [];
  const kinds = [['cafe', 'cafe'], ['shop', 'gift'], ['restaurant', 'restaurant'], ['bar', 'bar'], ['bakery', 'bakery'], ['clothing_store', 'clothes']];
  const street = (name, x0, y0, x1, y1, shops) => {
    out.push({ type: 'Feature', properties: { class: 'tertiary', name }, geometry: { type: 'LineString', coordinates: [at(x0, y0), at(x1, y1)] } });
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let i = 0; i < shops; i++) {
      const f = (i + 0.5) / shops;
      // 8 m off the street, on alternate sides.
      const side = i % 2 ? 1 : -1;
      const [cls, sub] = kinds[i % kinds.length];
      out.push({ type: 'Feature', properties: { class: cls, subclass: sub, name: `${name} ${i}` },
        geometry: { type: 'Point', coordinates: at(x0 + (x1 - x0) * f - ((y1 - y0) / len) * 0.08 * side, y0 + (y1 - y0) * f + ((x1 - x0) / len) * 0.08 * side) } });
    }
  };
  out.push({ type: 'Feature', properties: { class: 'town', name: 'Smallton' }, geometry: { type: 'Point', coordinates: at(...SMALL_TOWN) } });
  street('Main Street', 197, 0.3, 203, 0.3, 24);
  street('Bridge Street', 200.3, -3, 200.3, 3, 12);
  for (const [name, x, y, st] of SMALL_HOODS) {
    out.push({ type: 'Feature', properties: { class: 'neighbourhood', name }, geometry: { type: 'Point', coordinates: at(x, y) } });
    street(st, x - 2.5, y + 0.3, x + 2.5, y + 0.3, 14);
    out.push({ type: 'Feature', properties: { class: 'minor', name: `${st} Cross` }, geometry: { type: 'LineString', coordinates: [at(x, y - 2), at(x, y + 2)] } });
  }
  return out;
})();
const denseWorld = { serve: false };
const DENSE_HOODS = ['Old Market', 'Mount Hill', 'Harbor East', 'Little Port', 'Ridge Row', 'Canal Side', 'Upper Fells', 'Station North'];
const denseFeatures = (() => {
  const out = [];
  const P = (x, y) => at(-0.5 + x / 100, -0.5 + y / 100);
  const HALF = 1500;
  const STEP = 60;
  let n = 0;
  for (let v = -HALF; v <= HALF; v += STEP) {
    n++;
    for (let b = -HALF; b < HALF; b += STEP) {
      out.push({ type: 'Feature', properties: { class: n % 5 ? 'minor' : 'tertiary', name: `${n} Avenue` }, geometry: { type: 'LineString', coordinates: [P(v, b), P(v, b + STEP)] } });
      out.push({ type: 'Feature', properties: { class: n % 5 ? 'minor' : 'tertiary', name: `${n} Street` }, geometry: { type: 'LineString', coordinates: [P(b, v), P(b + STEP, v)] } });
    }
    if (v + STEP / 2 <= HALF) {
      out.push({ type: 'Feature', properties: { class: 'service', subclass: 'alley' }, geometry: { type: 'LineString', coordinates: [P(v + STEP / 2, -HALF), P(v + STEP / 2, HALF)] } });
      out.push({ type: 'Feature', properties: { class: 'service', subclass: 'alley' }, geometry: { type: 'LineString', coordinates: [P(-HALF, v + STEP / 2), P(HALF, v + STEP / 2)] } });
    }
  }
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const kinds = [['cafe', 'cafe'], ['restaurant', 'restaurant'], ['shop', 'gift'], ['bar', 'bar'], ['clothing_store', 'clothes'], ['museum', 'museum'],
    ['art_gallery', 'artwork'], ['park', 'park'], ['monument', 'memorial'], ['library', 'library'], ['theatre', 'theatre'], ['bakery', 'bakery']];
  for (let i = 0; i < 2000; i++) {
    const [cls, sub] = kinds[i % kinds.length];
    // Thickest in the middle; on a street's side, 8 m off it, clear of the corner, as the grading tests place them.
    const r = HALF * Math.pow(rnd(), 1.4);
    const a = rnd() * 2 * Math.PI;
    const x = Math.round((r * Math.cos(a)) / STEP) * STEP + 8;
    const y = r * Math.sin(a);
    const [px, py] = i % 2 ? [x, y] : [y, x];
    out.push({ type: 'Feature', properties: { class: cls, subclass: sub, name: `Place ${i}` }, geometry: { type: 'Point', coordinates: P(px, py) } });
  }
  out.push({ type: 'Feature', properties: { class: 'city', name: 'Densburg' }, geometry: { type: 'Point', coordinates: P(0, 0) } });
  DENSE_HOODS.forEach((name, i) => {
    const a = (i / DENSE_HOODS.length) * 2 * Math.PI;
    out.push({ type: 'Feature', properties: { class: 'neighbourhood', name }, geometry: { type: 'Point', coordinates: P(700 * Math.cos(a), 700 * Math.sin(a)) } });
  });
  out.push({ type: 'Feature', properties: { class: 'neighbourhood', name: 'Far Point' }, geometry: { type: 'Point', coordinates: P(-2200, 0) } });
  return out;
})();
// The map's text (explore-dense-city DC1): OpenFreeMap's Noto Sans Bold, Latin-1 block, served for every range the map asks.
const GLYPHS = fs.readFileSync(path.join(__dirname, 'fixtures', 'fonts', 'Noto Sans Bold', '0-255.pbf'));
const OVERTURE_HOST = 'overturemaps-extras-us-west-2.s3.amazonaws.com';
const OVERTURE_RELEASE = '2026-10-21.0';

const style = {
  version: 8,
  // maxzoom 14 matters: at the default 18, lines are clipped to z18 tiles, which real data never is.
  // The credit makes maplibre draw its attribution control, as the real tiles' do.
  sources: { openmaptiles: { type: 'geojson', maxzoom: 14, attribution: 'Data from OpenStreetMap', data: { type: 'FeatureCollection', features } } },
  // The real style's glyphs (Positron's), so the map's own text draws (explore-dense-city DC1).
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#eeeae4' } },
    { id: 'roads', type: 'line', source: 'openmaptiles', paint: { 'line-color': '#ffffff', 'line-width': 6 } },
  ],
};

// E2E_SHOTS=<dir> saves screenshots along the way, for looking at the UI.
const SHOTS = process.env.E2E_SHOTS;
async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

// The one check, with check.todo for a test written before its code (TG25).
const { check } = require('./check');

async function createHarness() {
  const server = await serve();
  const url = `http://localhost:${server.address().port}${BASE}/`;
  // Explore is the root (NV2); scenarios that begin on Navigate open its own path.
  const navUrl = `${url}navigate`;
  // Chronicle is the root since decision 0112 (HC1): the journeys that begin on Explore open it at its own path.
  const exploreUrl = `${url}explore`;
  // A fake microphone, so voice memos can be recorded headless.
  // Sound only after a tap, as on iOS: the replay reaches its stops on its own clock.
  // The full Chromium in headless mode ('chromium' channel): the old headless shell always denies
  // notifications, whatever is granted, so the test notification couldn't be checked (NT6).
  const browser = await chromium.launch({
    channel: 'chromium',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=user-gesture-required'],
  });
  const start = at(-0.5, -0.5);
  // Headless Chromium reports en-US, whose default is miles (QL13). The checks read metres, so every
  // context tells the app's units default it is in Canada; formatting is untouched. E2E_MILES=1 keeps en-US.
  const metricRegion = (c) => (process.env.E2E_MILES ? Promise.resolve() : c.addInitScript(() => {
    const ro = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function () { return { ...ro.call(this), locale: 'en-CA' }; };
  }));
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation', 'microphone', 'notifications'],
    geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 },
  });
  // iOS's Audio Session API, which Chromium lacks: the stub records what the
  // app asks for, so the web's "play with the ringer off" can be checked.
  await ctx.addInitScript(() => {
    const seen = [];
    window.__audioSessions = seen;
    let type = 'auto';
    Object.defineProperty(navigator, 'audioSession', {
      configurable: true,
      value: { get type() { return type; }, set type(v) { type = v; seen.push(v); } },
    });
  });
  await metricRegion(ctx);
  // Opt-in render and map-update counters (src/lib/perfCount.ts).
  await ctx.addInitScript(() => { window.__perf = {}; });
  // Open in Maps (NH1-NH7): links the app opens are recorded, never followed.
  await ctx.addInitScript(() => {
    window.__opened = [];
    window.open = (u) => {
      window.__opened.push(String(u));
      return null;
    };
  });
  // Motion (M7): whether each pill or banner that lifts in was animating a frame after it appeared.
  await ctx.addInitScript(() => {
    const lifts = [];
    window.__lifts = lifts;
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          const els = n.matches('[data-testid=lift-in]') ? [n] : [...n.querySelectorAll('[data-testid=lift-in]')];
          for (const el of els)
            requestAnimationFrame(() => lifts.push({ el, animated: el.getAnimations().length > 0 || Number(getComputedStyle(el).opacity) < 1 }));
        }
    }).observe(document, { childList: true, subtree: true });
  });
  // The deferred four (M9-M12): each entrance as it appears, whether it was moving a frame later, and
  // what it marks; a stuck or vacuous wrapper fails (audit 3).
  await ctx.addInitScript(() => {
    const enters = [];
    window.__enters = enters;
    const moving = (el) => {
      const cs = getComputedStyle(el);
      const t = cs.transform;
      const m = t && t !== 'none' ? new DOMMatrix(t) : null;
      const still = !m || (Math.abs(m.a - 1) < 0.001 && Math.abs(m.d - 1) < 0.001 && Math.abs(m.f) < 0.1 && Math.abs(m.b) < 0.001);
      const ring = el.firstElementChild && el.dataset.testid === 'enter-pulse' ? Number(getComputedStyle(el.firstElementChild).opacity) > 0.05 : false;
      return Number(cs.opacity) < 0.99 || !still || ring;
    };
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          const els = n.matches('[data-testid^=enter-]') ? [n] : [...n.querySelectorAll('[data-testid^=enter-]')];
          for (const el of els)
            requestAnimationFrame(() => {
              const marker = el.closest('button, [role=img]');
              enters.push({ kind: el.dataset.testid.slice(6), animated: moving(el), label: marker?.getAttribute('aria-label') ?? '', ids: marker?.dataset.ids ?? '', el });
            });
        }
    }).observe(document, { childList: true, subtree: true });
  });
  // How far a button is pressed down (M4): its own scale and opacity while held, and its scale after.
  const pressedScale = async (pg, selector) => {
    const loc = pg.locator(selector).first();
    const box = await loc.boundingBox();
    const read = () => loc.evaluate((el) => {
      const t = getComputedStyle(el).transform;
      return { scale: t && t !== 'none' ? new DOMMatrix(t).a : 1, opacity: Number(getComputedStyle(el).opacity) };
    });
    await pg.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await pg.mouse.down();
    await pg.waitForTimeout(250);
    const held = await read();
    // Away, then up: the press is cancelled, not fired.
    await pg.mouse.move(box.x + box.width / 2, box.y - 300, { steps: 4 });
    await pg.mouse.up();
    await pg.waitForTimeout(500);
    const after = await read();
    return { scale: held.scale, opacity: held.opacity, after: after.scale };
  };
  // A meta value, read from IndexedDB.
  const metaOf = (pg, key) => pg.evaluate((k) => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('meta', 'readonly').objectStore('meta').get(k);
      g.onsuccess = () => resolve(g.result?.value ?? null);
    };
  }), key);
  // Navigate is the ready walk screen (NR7): 'half' and 'full' raise its bar to the walk settings (a pull on
  // its grip), 'peek' lowers it with Escape. Other sheets (home, Explore) still go by their own handles.
  const drawerTo = async (pg, size, testid = 'drawer-drag') => {
    if (testid === 'drawer-drag') {
      const up = (await pg.locator('[data-testid=start-settings]').count()) > 0;
      if (size === 'peek') {
        if (up) {
          await pg.keyboard.press('Escape');
          await pg.waitForFunction(() => !document.querySelector('[data-testid=start-settings]'), null, { timeout: 4000 }).catch(() => {});
        }
      } else if (!up) {
        const g = await pg.locator('[data-testid=ready-grip]').boundingBox();
        await pg.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
        await pg.mouse.down();
        await pg.mouse.move(g.x + g.width / 2, 120, { steps: 8 });
        await pg.mouse.up();
        await pg.waitForSelector('[data-testid=start-settings]');
        await pg.waitForTimeout(700);
      }
      return;
    }
    if (size === 'peek') {
      await pg.keyboard.press('Escape');
      await pg.waitForTimeout(600);
      return;
    }
    const hb = await pg.locator(`[data-testid=${testid}]`).boundingBox();
    if (size === 'half') await pg.mouse.click(hb.x + hb.width / 2, hb.y + 8);
    else {
      await pg.mouse.move(hb.x + hb.width / 2, hb.y + 8);
      await pg.mouse.down();
      await pg.mouse.move(hb.x + hb.width / 2, 30, { steps: 8 });
      await pg.mouse.up();
    }
    await pg.waitForTimeout(700);
  };
  // A tab, from wherever the test is (NR1-NR4): the ready screen covers the tabs, so its chevron goes back
  // to them first; Navigate opens the walk screen (ready or walking) and is left alone if it is up.
  const tabTo = async (pg, id, section = 'map') => {
    const shown = async (sel) => (await pg.locator(sel).filter({ visible: true }).count()) > 0;
    if (id === 'navigate') {
      if ((await shown('[data-testid=ready-bar]')) || (await shown('[data-testid=stop]'))) return;
    } else if (await shown('[data-testid=ready-close]')) {
      await pg.click('[data-testid=ready-close]');
      await pg.waitForTimeout(600);
    }
    await pg.click(`[data-testid=tab-${id}]`);
    // Chronicle opens on Memories (RM1); the journeys written before it want the map and its sheet.
    if (id === 'chronicle' && section !== 'memories') {
      await pg.waitForSelector('[data-testid=chronicle-sections]', { timeout: 15000 }).catch(() => {});
      if (await pg.locator(`[data-testid=section-${section}]`).filter({ visible: true }).count()) await pg.click(`[data-testid=section-${section}]`);
    }
  };
  // Memories is a journal (decision 0155): the threads, the Chronicle's and the owner's, are behind its contents
  // button. `toThreads` opens them from the page; `toJournal` goes back to the page. Both do nothing when already there,
  // or inside a thread or Hidden (their own Back comes first).
  const toThreads = async (pg) => {
    await pg.waitForSelector('[data-testid=threads-screen], [data-testid=memories-menu], [data-testid=thread-screen], [data-testid=own-thread]', { timeout: 20000, state: 'visible' }).catch(() => {});
    if (await pg.locator('[data-testid=threads-screen], [data-testid=thread-screen], [data-testid=own-thread]').filter({ visible: true }).count()) return;
    if (!(await pg.locator('[data-testid=memories-menu]').filter({ visible: true }).count())) return;
    await pg.click('[data-testid=memories-menu]');
    await pg.waitForSelector('[data-testid=menu-threads]', { timeout: 5000 }).catch(() => {});
    await pg.click('[data-testid=menu-threads]').catch(() => {});
    await pg.waitForSelector('[data-testid=threads-screen]', { timeout: 5000 }).catch(() => {});
  };
  const toJournal = async (pg) => {
    if (await pg.locator('[data-testid=threads-back]').filter({ visible: true }).count()) {
      await pg.click('[data-testid=threads-back]');
      await pg.waitForSelector('[data-testid=journal-page]', { timeout: 5000 }).catch(() => {});
    }
  };
  // Chronicle opens on Memories (RM1); a journey that wants the map's sheet after leaving a replay brings it up.
  const mapUp = async (pg) => {
    await pg.waitForSelector('[data-testid=chronicle-sections]', { timeout: 15000 }).catch(() => {});
    const sheetShown = (await pg.locator('[data-testid=home-sheet]').filter({ visible: true }).count()) > 0;
    if (!sheetShown && (await pg.locator('[data-testid=section-map]').filter({ visible: true }).count())) await pg.click('[data-testid=section-map]');
  };
  // Elements on the tab in front: JS tabs keep the others mounted beneath it, aria-hidden.
  const shownCount = (pg, sel) => pg.evaluate((q) => [...document.querySelectorAll(q)].filter((e) => !e.closest('[aria-hidden=true]')).length, sel);
  // What is drawn at a point: the tab bar hides under the walk and the replays (NV6).
  const tabBarShown = (pg) => pg.evaluate(() => {
    const t = document.querySelector('[data-testid=tab-navigate]');
    if (!t) return false;
    const b = t.getBoundingClientRect();
    if (!b.width) return false;
    return !!document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('[data-testid^=tab-]');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // Nothing leaves the device (D10): every request goes to this server or the tile host.
  const hosts = new Set();
  ctx.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol)) hosts.add(u.host); });
  // The app's own tile reads (landing, explore) get the same fake world as vector tiles.
  const { encodeTile } = await import('../mvt-encode.mjs');
  // Slow tiles on demand, so Cancel can land while a read is still out.
  const tiles = { delayMs: 0, stall: null };
  // A stalled TileJSON request on demand, as on a phone with a weak signal (bug: a blank replay after Stop).
  // tiles.stall: a stalled TileJSON request, set by a journey (tiles.stall = promise).
  const tileRoute = async (r) => {
    if (/\/fonts\/[^/]+\/\d+-\d+\.pbf$/.test(r.request().url())) return r.fulfill({ contentType: 'application/x-protobuf', body: GLYPHS });
    const tile = /\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(r.request().url());
    if (tile && tiles.delayMs) await new Promise((res) => setTimeout(res, tiles.delayMs));
    if (tile) {
      const [z, x, y] = tile.slice(1).map(Number);
      return r.fulfill({ contentType: 'application/x-protobuf', body: Buffer.from(encodeTile([...features, ...(snapWorld.serve ? [...snapFeatures, ...(divisions.serve ? snapTownFeatures : []), ...(wholeWorld.serve ? wholeFeatures : [])] : []), ...(scenicWorld.serve ? scenicFeatures : []), ...(hollowWorld.serve ? hollowFeatures : []), ...(denseWorld.serve ? denseFeatures : []), ...(smallWorld.serve ? smallFeatures : [])], z, x, y)) });
    }
    if (tiles.stall && r.request().url().endsWith('/planet')) await tiles.stall;
    return r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        r.request().url().endsWith('/planet')
          ? { tiles: ['https://tiles.openfreemap.org/planet/20261028_001001_pt/{z}/{x}/{y}.pbf'] }
          : style,
      ),
    });
  };
  await ctx.route('https://tiles.openfreemap.org/**', tileRoute);
  // Overture's bucket (AD3, AD6): its release listing, and the release's one PMTiles file, by byte range.
  const { encodeArchive } = await import('../pmtiles-encode.mjs');
  const overtureArchive = (() => {
    const z = 14;
    const keys = new Set(overtureFeatures.map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const x = Math.floor(((lon + 180) / 360) * 2 ** z);
      const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
      return `${x},${y}`;
    }));
    return encodeArchive([...keys].map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { z, x, y, data: encodeTile(overtureFeatures, z, x, y, () => ['place']) };
    }));
  })();
  // Complexes (CX16): the places with the arcade's nine in them, and the release's buildings.pmtiles, every z14 tile its features touch.
  const archiveAt14 = (feats, layer) => {
    const z = 14;
    const keys = new Set();
    for (const f of feats) for (const [lon, lat] of (f.geometry.type === 'Point' ? [f.geometry.coordinates] : f.geometry.coordinates[0])) {
      const x = Math.floor(((lon + 180) / 360) * 2 ** z);
      const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
      keys.add(`${x},${y}`);
    }
    return encodeArchive([...keys].map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { z, x, y, data: encodeTile(feats, z, x, y, () => [layer]) };
    }));
  };
  const complexPlacesArchive = archiveAt14([...overtureFeatures, ...complexPlaces], 'place');
  const buildingsArchive = archiveAt14(complexBuildings, 'building');
  // Every other journey: a buildings archive with nothing in it (a 404 would be a console error).
  const noBuildings = encodeArchive([{ z: 14, x: 0, y: 0, data: encodeTile([], 14, 0, 0) }]);
  // z12 to decide (TO10), z10 to draw (TB6): the same towns in both.
  const divisionsArchive = encodeArchive([10, 12].map((z) => {
    const [lon, lat] = O;
    const x = Math.floor(((lon + 180) / 360) * 2 ** z);
    const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
    return { z, x, y, data: encodeTile(divisionFeatures, z, x, y, (f) => [f.geometry.type === 'Polygon' ? 'division_area' : 'division']) };
  }));
  const snapDivisionsArchive = encodeArchive([10, 12].map((z) => {
    const [lon, lat] = O;
    const x = Math.floor(((lon + 180) / 360) * 2 ** z);
    const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
    return { z, x, y, data: encodeTile(snapDivisionFeatures, z, x, y, () => ['division_area']) };
  }));
  // Every other journey: an archive with no towns in it (a 404 would be a console error), so towns go by points.
  const noDivisions = encodeArchive([{ z: 12, x: 0, y: 0, data: encodeTile([], 12, 0, 0) }]);
  // Walkability (WK1): the release's transportation.pmtiles, every z14 tile its segments touch.
  const transportArchiveOf = (feats) => {
    const z = 14;
    const keys = new Set();
    for (const f of feats) for (const [lon, lat] of (f.geometry.type === 'Point' ? [f.geometry.coordinates] : f.geometry.coordinates)) {
      const x = Math.floor(((lon + 180) / 360) * 2 ** z);
      const y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
      keys.add(`${x},${y}`);
    }
    return encodeArchive([...keys].map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { z, x, y, data: encodeTile(feats, z, x, y, (f) => (f.geometry.type === 'Point' ? ['connector'] : ['segment'])) };
    }));
  };
  const transportArchive = transportArchiveOf(transportFeatures);
  const gridTransportArchive = transportArchiveOf(features.filter((f) => f.geometry.type === 'LineString').map((f, i) => ({
    type: 'Feature', geometry: f.geometry,
    properties: { id: `grid-${i}`, subtype: 'road', class: 'primary', ...(f.properties.name ? { '@name': f.properties.name } : {}), speed_limits: mph(55) },
  })));
  // The heads-up's second reason (UF15): the same grid as arterial streets at 25 mph, so no fast road, only ground built around cars.
  const gridSlowArchive = transportArchiveOf(features.filter((f) => f.geometry.type === 'LineString').map((f, i) => ({
    type: 'Feature', geometry: f.geometry,
    properties: { id: `slow-${i}`, subtype: 'road', class: 'primary', ...(f.properties.name ? { '@name': f.properties.name } : {}), speed_limits: mph(25) },
  })));
  const overtureAsked = [];
  const overpassAsked = [];
  const overpassRoute = async (r) => {
    const req = r.request();
    overpassAsked.push({ url: req.url(), method: req.method(), body: req.postData() });
    return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify(overpassAnswer) });
  };
  const overtureRoute = async (r) => {
    const req = r.request();
    const url = new URL(req.url());
    overtureAsked.push({ url: req.url(), range: req.headers().range ?? null });
    const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'ETag, Content-Length, Content-Range, Accept-Ranges' };
    if (url.searchParams.get('list-type') === '2') {
      return r.fulfill({ status: 200, headers: cors, contentType: 'application/xml',
        body: `<ListBucketResult><Prefix>tiles/</Prefix><CommonPrefixes><Prefix>tiles/2026-09-23.0/</Prefix></CommonPrefixes><CommonPrefixes><Prefix>tiles/${OVERTURE_RELEASE}/</Prefix></CommonPrefixes></ListBucketResult>` });
    }
    const archive = url.pathname === `/tiles/${OVERTURE_RELEASE}/places.pmtiles`
      ? (complexWorld.serve ? complexPlacesArchive : overtureArchive)
      : url.pathname === `/tiles/${OVERTURE_RELEASE}/buildings.pmtiles` ? (complexWorld.serve ? buildingsArchive : noBuildings)
      : url.pathname === `/tiles/${OVERTURE_RELEASE}/divisions.pmtiles` ? (divisions.serve ? (snapWorld.serve ? snapDivisionsArchive : divisionsArchive) : noDivisions)
        : url.pathname === `/tiles/${OVERTURE_RELEASE}/transportation.pmtiles` ? (walkability.mode === 'ok' ? transportArchive : walkability.mode === 'grid' ? gridTransportArchive : walkability.mode === 'arterial' ? gridSlowArchive : Buffer.alloc(200, 7)) : null;
    if (archive) {
      const m = /bytes=(\d+)-(\d+)/.exec(req.headers().range ?? '');
      const from = m ? Number(m[1]) : 0;
      const to = Math.min(m ? Number(m[2]) : archive.length - 1, archive.length - 1);
      return r.fulfill({ status: 206, headers: { ...cors, 'content-range': `bytes ${from}-${to}/${archive.length}`, etag: '"e2e"' },
        contentType: 'application/octet-stream', body: archive.subarray(from, to + 1) });
    }
    return r.fulfill({ status: 404, headers: cors, body: '' });
  };
  await ctx.route(`https://${OVERTURE_HOST}/**`, overtureRoute);
  await ctx.route(`https://${OVERPASS_HOST}/**`, overpassRoute);

// A fresh browser, for a flow of its own (NV12, NV15, NV25, the tabs audit).
  // `permissions: []` makes a browser that denies location (QL19).
  const freshPage = async (label, opts = {}) => {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
      // E2E_MOBILE=1: a phone's touch screen, so taps come as touches and the browser makes the clicks.
      ...(process.env.E2E_MOBILE ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}),
      ...(opts.touch ? { hasTouch: true } : {}),
      permissions: opts.permissions ?? ['geolocation'],
      geolocation: { longitude: start[0], latitude: start[1], accuracy: 6 },
    });
    // A touch screen is Android Chrome unless a journey says otherwise: headless Chromium has no navigator.vibrate (the pocket alert needs it, decision 0138).
    if ((process.env.E2E_MOBILE || opts.touch) && !opts.noVibrate) await c.addInitScript(() => { if (!('vibrate' in navigator)) navigator.vibrate = () => true; });
    await metricRegion(c);
    await c.route('https://tiles.openfreemap.org/**', tileRoute);
    await c.route(`https://${OVERTURE_HOST}/**`, overtureRoute);
    await c.route(`https://${OVERPASS_HOST}/**`, overpassRoute);
    c.on('request', (r) => { const u = new URL(r.url()); if (/^(https?|wss?):$/.test(u.protocol)) hosts.add(u.host); });
    const pg = await c.newPage();
    pg.on('pageerror', (e) => errors.push(`${label}: ${e}`));
    pg.on('console', (m) => m.type() === 'error' && errors.push(`${label}: ${m.text()}`));
    return { c, pg };
  };
  const openWalk = (pg) => pg.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('chronicles');
    req.onsuccess = () => {
      const g = req.result.transaction('walk', 'readonly').objectStore('walk').getAll();
      g.onsuccess = () => resolve(g.result.find((w) => w.open) ?? null);
    };
  }));
  // A route found (scenic routes, SR2): the blue bar, or the preview first when a scenic way is offered,
  // where Direct's Go is taken, so a journey about the direct route goes on as before.
  const routed = async (pg, timeout = 30000) => {
    const first = await pg.waitForSelector('[data-testid=nav-bar], [data-testid=route-preview]', { timeout });
    if ((await first.getAttribute('data-testid')) === 'route-preview') {
      await pg.click('[data-testid=route-go-0]');
      return pg.waitForSelector('[data-testid=nav-bar]', { timeout: 5000 });
    }
    return first;
  };
  const scriptsDir = path.join(__dirname, '..');
  // A tab on the shared page, by its bar (NV4, NV5): the ready screen covers the tabs, so its chevron goes
  // back to them first (NR4). Returns the path and the live map count after the move.
  const onTab = async (id) => {
    if (id !== 'navigate' && (await page.locator('[data-testid=ready-close]').count())) {
      await page.click('[data-testid=ready-close]');
      await page.waitForTimeout(600);
    }
    await page.click(`[data-testid=tab-${id}]`);
    if (id === 'chronicle') await mapUp(page);
    await page.waitForTimeout(800);
    return { path: new URL(page.url()).pathname.slice(BASE.length), canvases: await page.locator('canvas.maplibregl-canvas').count() };
  };
  // The walk screen's map on the shared page, and its "?" marks.
  const walkMap = () => page.locator('.maplibregl-map').last();
  const walkMarks = () => walkMap().locator('[data-testid=mark-pin]');
  // The first walk's route (the walk journey): 300 m at 5 m/s, one fix a second, 20 fixes a leg. The
  // memories journey walks back along it.
  const walkRoute = [at(-0.5, -0.5), at(0.5, -0.5), at(0.5, 0.5), at(1.5, 0.5)];
  const walkPts = [];
  for (let k = 1; k < walkRoute.length; k++)
    for (let s = 1; s <= 20; s++)
      walkPts.push([walkRoute[k - 1][0] + ((walkRoute[k][0] - walkRoute[k - 1][0]) * s) / 20, walkRoute[k - 1][1] + ((walkRoute[k][1] - walkRoute[k - 1][1]) * s) / 20]);
  // Nothing leaves the device (D10): every request so far went to this server, the tile host or Overture.
  const nothingLeaves = () => {
    const away = [...hosts].filter((h) => !h.startsWith('localhost') && h !== 'tiles.openfreemap.org' && h !== OVERTURE_HOST);
    // Nothing leaves the device (D10): reminders need no network (R10), routes are made on the device (N14),
    // landing reads nothing but tiles (L18).
    check(away.length === 0, `nothing is sent anywhere but the map tiles and Overture's places (D10, R10, N14, L18: ${away.join(', ')})`);
  };
  const noConsoleErrors = () => check(errors.length === 0, `no console errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
  const close = async () => {
    await browser.close();
    server.close();
  };
  // Switches a map layer on (or off) through the Layers panel and closes the panel (specs/map-layers ML3-ML5): the layers all
  // start off, so a journey that looks at one turns it on first.
  const switchLayer = async (pg, id, wantOn = true) => {
    await pg.waitForSelector('[data-testid=layers]', { timeout: 30000 });
    if (!(await pg.locator('[data-testid=layers-panel]').count())) await pg.click('[data-testid=layers]');
    await pg.waitForSelector(`[data-testid=layer-${id}]`, { timeout: 5000 });
    if (((await pg.locator(`[data-testid=layer-${id}]`).getAttribute('aria-checked')) === 'true') !== wantOn) await pg.click(`[data-testid=layer-${id}]`);
    await pg.click('[data-testid=layers]');
  };
  // Near you Explore's row is the towns (fix explore-town-scope): a neighborhood's card is on its town's page. Waits for the
  // area's card in the row, opening the selected town's page (yours, leading the row) while it is not there.
  const areaTile = async (pg, name, timeout = 60000) => {
    const sel = `[data-testid=atlas-tile][data-name="${name}"]`;
    const until = Date.now() + timeout;
    while (Date.now() < until && !(await pg.locator(sel).count())) {
      const town = pg.locator('[data-testid=atlas-tile][data-level="town"][data-selected="1"]');
      if (!(await pg.locator('[data-testid=atlas-back-pill]').count()) && (await town.count())) await town.first().click().catch(() => {});
      await pg.waitForTimeout(500);
    }
    return pg.locator(sel).first();
  };
  // Where a gesture on Explore's map starts: a point over the bare canvas, never a "?" or an area point, which take the
  // touch themselves (a tap on a "?" opens the area's card). The middle first, then around it.
  const bareMapPoint = (pg) => pg.evaluate(() => {
    const m = document.querySelector('.maplibregl-map').getBoundingClientRect();
    for (const fy of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      for (const fx of [0.5, 0.35, 0.65, 0.25, 0.75]) {
        const x = m.x + m.width * fx;
        const y = m.y + m.height * fy;
        // Room for the drag's own path too: its ends and middle are bare canvas.
        const bare = [-90, 0, 90].every((d) => document.elementFromPoint(x + d, y)?.tagName === 'CANVAS');
        if (bare) return { x, y };
      }
    }
    return { x: m.x + m.width / 2, y: m.y + m.height / 2 };
  });
  return {
    url, navUrl, exploreUrl, BASE, browser, ctx, page, errors, hosts, start, at, distanceM, dLat, dLon, features, names, overtureFeatures, OVERTURE_HOST, OVERTURE_RELEASE, overtureAsked, style, check, shot, glyph, iconOf, metricRegion, pressedScale, metaOf, drawerTo, tabTo, toThreads, toJournal, mapUp, shownCount, tabBarShown, tileRoute, overtureRoute, freshPage, openWalk, tiles, scriptsDir,
    onTab, walkMap, walkMarks, walkRoute, walkPts, nothingLeaves, noConsoleErrors, close, divisions, snapWorld, wholeWorld, walkability, overpassAsked, OVERPASS_HOST, scenicWorld, routed, switchLayer, places, areaTile, hollowWorld, complexWorld, bareMapPoint, denseWorld, DENSE_HOODS, smallWorld, SMALL_TOWN, SMALL_HOODS,
  };
}

module.exports = { createHarness };
