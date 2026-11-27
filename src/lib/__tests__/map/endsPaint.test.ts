/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { CircleLayerSpecification } from 'maplibre-gl';
import { COLORS, ENDS_LOOP_PAINT, ENDS_PAINT, ENDS_RING_PAINT, endsGeoJSON, endsLoopGeoJSON, traceShown, WALKER_FILL } from '../../../components/map/types';
import { contrast } from './colourSight';

// tend map T16 (the owner's yes, Nov 12): a walk's start and end differed by colour alone, two white discs
// ringed one green and one orange (WCAG 2.2, 1.4.1 Use of Color). The start stays hollow; the end is solid,
// filled in the walked colour with a white ring, so shape tells them apart. No new hue (T22 is open).

/** A maplibre `['match', ['get', 'kind'], 'start', a, b]`, or a constant, read for one marker. */
function paintFor(value: unknown, kind: string): unknown {
  if (!Array.isArray(value) || value[0] !== 'match') return value;
  const [, input, ...rest] = value as [string, unknown, ...unknown[]];
  assert.deepEqual(input, ['get', 'kind'], 'the markers are told apart by their kind');
  const fallback = rest[rest.length - 1];
  for (let i = 0; i + 1 < rest.length - 1; i += 2) if (rest[i] === kind) return rest[i + 1];
  return fallback;
}

const WHITE = '#ffffff';

const num = (v: unknown): number => {
  assert.equal(typeof v, 'number');
  return v as number;
};
/**
 * A marker's outer edge, in px from its point: MapLibre strokes a circle outside its radius. Both are drawn widest by
 * the first layer, ENDS_RING_PAINT: the start whole, the end's outer ring (tend map audit 25).
 */
function outerOf(kind: 'start' | 'end'): number {
  return num(paintFor(ENDS_RING_PAINT['circle-radius'], kind)) + num(paintFor(ENDS_RING_PAINT['circle-stroke-width'], kind));
}

test('tend map T16: the start is hollow, a white disc ringed in the trace\'s green', () => {
  // Drawn by the first layer since tend map audit 25.
  assert.equal(paintFor(ENDS_RING_PAINT['circle-color'], 'start'), WHITE);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-stroke-color'], 'start'), COLORS.trace);
});

test('tend map T16: the end is solid, a disc filled in the walked colour with a white ring', () => {
  assert.equal(paintFor(ENDS_PAINT['circle-color'], 'end'), COLORS.walked);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], 'end'), WHITE);
});

test('tend map T16: the two differ in their fill, not only their ring, and are one size', () => {
  assert.notEqual(paintFor(ENDS_RING_PAINT['circle-color'], 'start'), paintFor(ENDS_PAINT['circle-color'], 'end'));
  // One size since tend map T25: the start's outer edge and the end's outer ring's are one width across.
  assert.equal(outerOf('start'), outerOf('end'));
  // No new hue: the end takes the walked colour the streets already have.
  const hues = new Set([WHITE, COLORS.trace, COLORS.walked]);
  for (const paint of [ENDS_RING_PAINT, ENDS_PAINT]) {
    for (const kind of ['start', 'end'] as const) {
      assert.ok(hues.has(paintFor(paint['circle-color'], kind) as string));
      assert.ok(hues.has(paintFor(paint['circle-stroke-color'], kind) as string));
    }
  }
});

test('tend map T16: both maps draw the ends layer with this paint, web and native', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  // Since tend map audit 25 the `ends` layer draws the end's centre alone, over `ends-ring`.
  assert.match(web, /id: 'ends', type: 'circle', source: 'ends', filter: \['==', \['get', 'kind'\], 'end'\],\s*paint: ENDS_PAINT\b/);
  assert.match(native, /<Layer id="ends" type="circle" filter=\{\['==', \['get', 'kind'\], 'end'\]\} paint=\{\{\s*\.\.\.ENDS_PAINT,/);
});

test('tend map audit 9: ENDS_PAINT is a valid circle paint, type-checked with no cast', () => {
  // A misspelt key or a wrong value type fails the typecheck here: the maps no longer cast it away.
  const paint: NonNullable<CircleLayerSpecification['paint']> = ENDS_PAINT;
  for (const key of Object.keys(paint)) assert.match(key, /^circle-/);
  const web = readFileSync(join(__dirname, '../../../components/map/WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(__dirname, '../../../components/map/WalkMap.native.tsx'), 'utf8');
  assert.match(web, /paint: ENDS_PAINT \}\);/, 'the web passes ENDS_PAINT as it is');
  assert.doesNotMatch(native, /'circle-stroke-opacity': props\.traceOpacity \?\? 1,\s*\} as never\}/, 'native spreads it with no cast');
});

test('tend map audit 10: endsGeoJSON\'s features take the paint\'s own branches, and nothing on a map overrides a colour', () => {
  const a: [number, number] = [-71.4, 41.812];
  const b: [number, number] = [-71.401, 41.813];
  const kinds = endsGeoJSON(a, b).features.map((f) => (f.properties as { kind: string }).kind);
  assert.equal(kinds.length, 2);
  const [start, end] = kinds;
  // The start feature reaches the first layer's start branch (hollow, green ring), the end its fallback (the walked
  // ring, a white edge) and the second layer (a walked centre, a white band).
  assert.equal(paintFor(ENDS_RING_PAINT['circle-color'], start), '#ffffff');
  assert.equal(paintFor(ENDS_RING_PAINT['circle-stroke-color'], start), COLORS.trace);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-color'], end), COLORS.walked);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-stroke-color'], end), '#ffffff');
  assert.equal(paintFor(ENDS_PAINT['circle-color'], end), COLORS.walked);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], end), '#ffffff');
  assert.deepEqual(endsGeoJSON(a, null).features.map((f) => (f.properties as { kind: string }).kind), [start], 'a live walk: the start alone');
  // Native spreads ENDS_PAINT and adds only the trace's opacity after it.
  const native = readFileSync(join(__dirname, '../../../components/map/WalkMap.native.tsx'), 'utf8');
  const layer = /<Layer id="ends" type="circle" filter=\{\['==', \['get', 'kind'\], 'end'\]\} paint=\{\{([\s\S]*?)\}\} \/>/.exec(native)?.[1] ?? '';
  const keys = [...layer.matchAll(/'([a-z-]+)':/g)].map((m) => m[1]);
  assert.ok(layer.includes('...ENDS_PAINT'));
  assert.deepEqual(keys, ['circle-opacity', 'circle-stroke-opacity']);
});

// tend map T25 (the owner's yes, Nov 13; decision 0162): mid-replay the walker's dot (a navy disc, a white ring) and
// the solid end (an orange disc, a white ring) differed by colour alone (WCAG 2.2, 1.4.1). The end is a bullseye: a
// walked centre, a white band and a walked outer ring, two circle layers on the `ends` source, the outer drawn first.
// The start and the dot unchanged; no hue of its own.

test('tend map T25: the end is a bullseye, a walked centre, a white band and a walked outer ring', () => {
  // The centre and its band: the `ends` layer's end branch.
  const centre = num(paintFor(ENDS_PAINT['circle-radius'], 'end'));
  const band = num(paintFor(ENDS_PAINT['circle-stroke-width'], 'end'));
  assert.equal(paintFor(ENDS_PAINT['circle-color'], 'end'), COLORS.walked);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], 'end'), WHITE);
  assert.ok(centre >= 3, `a centre that reads as a dot (radius ${centre})`);
  assert.ok(band >= 2, `a white band that reads (${band} px)`);
  // The outer ring: a walked disc wider than the centre and its band, so a walked ring shows round the band.
  assert.equal(paintFor(ENDS_RING_PAINT['circle-color'], 'end'), COLORS.walked);
  const ring = num(paintFor(ENDS_RING_PAINT['circle-radius'], 'end')) - (centre + band);
  assert.ok(ring >= 3, `a walked outer ring that reads (${ring} px)`);
});

test('tend map T25: the start is unchanged, hollow, and the end is as wide as it', () => {
  assert.equal(paintFor(ENDS_RING_PAINT['circle-color'], 'start'), WHITE);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-stroke-color'], 'start'), COLORS.trace);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-radius'], 'start'), 7);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-stroke-width'], 'start'), 4);
  assert.equal(outerOf('end'), outerOf('start'));
});

test('tend map T25: no hue of its own: every colour of the ends is white, the trace\'s or the walked colour', () => {
  const hues = new Set([WHITE, COLORS.trace, COLORS.walked]);
  for (const paint of [ENDS_RING_PAINT, ENDS_PAINT]) {
    for (const kind of ['start', 'end'] as const) {
      assert.ok(hues.has(paintFor(paint['circle-color'], kind) as string));
      assert.ok(hues.has(paintFor(paint['circle-stroke-color'], kind) as string));
    }
  }
  const ring: NonNullable<CircleLayerSpecification['paint']> = ENDS_RING_PAINT;
  for (const key of Object.keys(ring)) assert.match(key, /^circle-/);
});

test('tend map T25: the walker\'s dot is unchanged, and differs from the end in shape, not only colour', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  // The dot: one navy disc of radius 7 with a 2 px white ring, one layer, on both maps; stone only for a fix that stands in for a
  // fresh one on a planning page (fix outing-current-position audit 11, the owner's "Muted dot when old", Nov 27).
  assert.deepEqual(WALKER_FILL, ['case', ['==', ['get', 'muted'], true], COLORS.walkerMuted, COLORS.walker]);
  assert.match(web, /id: 'points', type: 'circle', source: 'points',\s*paint: \{\s*(\/\/.*\s*)?'circle-color': WALKER_FILL as unknown as string,\s*'circle-radius': 7,\s*'circle-stroke-color': '#ffffff',\s*'circle-stroke-width': 2,/);
  assert.match(native, /<Layer id="points" type="circle" paint=\{\{\s*(\/\/.*\s*)?'circle-color': WALKER_FILL as unknown as string,\s*'circle-radius': 7,\s*'circle-stroke-color': '#ffffff',\s*'circle-stroke-width': 2,/);
  // The end has a ring round its band, which the dot has not.
  assert.ok(num(paintFor(ENDS_RING_PAINT['circle-radius'], 'end')) > num(paintFor(ENDS_PAINT['circle-radius'], 'end')) + num(paintFor(ENDS_PAINT['circle-stroke-width'], 'end')));
});

test('tend map T25: both maps draw the outer ring first, on the ends source, the centre for the end alone, with the trace\'s opacity', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  const endOnly = String.raw`\['==', \['get', 'kind'\], 'end'\]`;
  // The web: ends-ring (the start and the end's ring, tend map audit 25) added before ends (the end's centre alone),
  // both on the ends source; the trace's opacity set on both.
  const webRing = /id: 'ends-ring', type: 'circle', source: 'ends',\s*paint: ENDS_RING_PAINT \}\);/;
  assert.match(web, webRing);
  const webCentre = new RegExp(String.raw`id: 'ends', type: 'circle', source: 'ends', filter: ${endOnly},\s*paint: ENDS_PAINT \}\);`);
  assert.match(web, webCentre);
  assert.ok(web.search(webRing) < web.search(webCentre), 'the outer ring is drawn first');
  // (Since replay-ceremony ui 7 the trace's look is `traceShown` of the screen's opacity: the same number on every
  // map but a replay's path, where the frames say how much of the first beat's trace still shows.)
  assert.match(web, /for \(const id of \['ends-ring', 'ends'\]\) \{\s*map\.setPaintProperty\(id, 'circle-opacity', look\.marks\);\s*map\.setPaintProperty\(id, 'circle-stroke-opacity', look\.marks\);/,
    'both layers of the ends go with the trace');
  assert.match(web, /paintTrace\(traceShown\(props\.traceOpacity \?\? 1, replayOn, whole\)\);/);
  for (const o of [0, 0.3, 1]) assert.equal(traceShown(o, false, 1).marks, o, 'with no replay told, the trace\'s own opacity');
  // Native: in the one ends source, ends-ring before ends, spreading its paint and adding only the trace's opacity.
  const source = /<GeoJSONSource id="ends" data=\{(?:ends|data)\}>([\s\S]*?)<\/GeoJSONSource>/.exec(native)?.[1] ?? '';
  const ringLayer = /<Layer id="ends-ring" type="circle" paint=\{\{([\s\S]*?)\}\} \/>/.exec(source);
  assert.ok(ringLayer, 'native draws ends-ring on the ends source, for both kinds');
  assert.match(source, new RegExp(String.raw`<Layer id="ends" type="circle" filter=\{${endOnly}\} paint=\{\{\s*\.\.\.ENDS_PAINT,`), 'and ends for the end alone');
  assert.ok(source.indexOf('id="ends-ring"') < source.indexOf('id="ends"'), 'the outer ring is drawn first');
  assert.ok(ringLayer[1].includes('...ENDS_RING_PAINT'));
  assert.deepEqual([...ringLayer[1].matchAll(/'([a-z-]+)':/g)].map((m) => m[1]), ['circle-opacity', 'circle-stroke-opacity']);
  // Since native map frames (NF3) the ends are their own memo source, handed the trace's opacity as `opacity`.
  assert.match(ringLayer[1], /'circle-opacity': opacity,\s*'circle-stroke-opacity': opacity\s*\}?$/);
});

// tend map audit 25 (the T25 review, auditor 25): a walk that ends on or near its start lost the end's outer ring under
// the start's marker: `ends-ring` drew the end's ring, then `ends` drew the start (white to 7 px, green to 11) over
// it, then the end's centre. The start now lies in the first layer with the end's ring, under it (endsGeoJSON puts the
// start first), and the last layer draws the end's centre and band alone.

type Layer = { paint: Record<string, unknown>; only?: string };
/** The colour a stack of circle layers paints at a point, the last layer and the last feature on top. */
function colourAt(layers: Layer[], features: { kind: string; at: [number, number] }[], p: [number, number]): unknown {
  let out: unknown;
  for (const layer of layers) {
    for (const f of features) {
      if (layer.only && f.kind !== layer.only) continue;
      const d = Math.hypot(p[0] - f.at[0], p[1] - f.at[1]);
      const r = num(paintFor(layer.paint['circle-radius'], f.kind));
      const s = num(paintFor(layer.paint['circle-stroke-width'], f.kind));
      if (d <= r) out = paintFor(layer.paint['circle-color'], f.kind);
      else if (d <= r + s) out = paintFor(layer.paint['circle-stroke-color'], f.kind);
    }
  }
  return out;
}

/** The layers as both maps draw them, read from their source: their order, paints and filters. */
function drawnLayers(): Layer[] {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  const PAINTS: Record<string, Record<string, unknown>> = { ENDS_PAINT, ENDS_RING_PAINT };
  const webLayers = [...web.matchAll(/map\.addLayer\(\{ id: '(ends[a-z-]*)', type: 'circle', source: 'ends',(?: filter: \['==', \['get', 'kind'\], '(\w+)'\],)?\s*paint: (ENDS_[A-Z_]+) \}\);/g)]
    .map((m) => ({ id: m[1], only: m[2], paint: m[3] }));
  const source = /<GeoJSONSource id="ends" data=\{(?:ends|data)\}>([\s\S]*?)<\/GeoJSONSource>/.exec(native)?.[1] ?? '';
  const nativeLayers = [...source.matchAll(/<Layer id="(ends[a-z-]*)" type="circle"(?: filter=\{\['==', \['get', 'kind'\], '(\w+)'\]\})? paint=\{\{\s*\.\.\.(ENDS_[A-Z_]+),/g)]
    .map((m) => ({ id: m[1], only: m[2], paint: m[3] }));
  assert.equal(webLayers.length, 2, 'the web draws two circle layers on the ends source');
  assert.deepEqual(nativeLayers, webLayers, 'native draws the same layers, in the same order, with the same filters');
  return webLayers.map((l) => ({ paint: PAINTS[l.paint], only: l.only }));
}

test('tend map audit 25: a walk that ends on its start shows the bullseye whole, the start under it', () => {
  const layers = drawnLayers();
  const kinds = endsGeoJSON([0, 0], [1, 1]).features.map((f) => (f.properties as { kind: string }).kind);
  assert.deepEqual(kinds, ['start', 'end'], 'the start is the first feature, so a layer draws the end over it');
  const both = (end: [number, number]) => [{ kind: 'start', at: [0, 0] as [number, number] }, { kind: 'end', at: end }];
  // The end on the start: from its point out, walked, white, walked, white, as when the two lie apart.
  const on = both([0, 0]);
  for (const [r, want] of [[0, COLORS.walked], [2.5, COLORS.walked], [5, WHITE], [8, COLORS.walked], [9, COLORS.walked], [10.5, WHITE]] as const) {
    assert.equal(colourAt(layers, on, [r, 0]), want, `on the start, ${r} px out`);
  }
  // The end 6 px from the start: the side of its ring that faces the start is still walked.
  const near = both([6, 0]);
  assert.equal(colourAt(layers, near, [6 - 8, 0]), COLORS.walked, 'the ring towards the start');
  assert.equal(colourAt(layers, near, [6 - 5, 0]), WHITE, 'the band towards the start');
  assert.equal(colourAt(layers, near, [6, 0]), COLORS.walked, 'the centre');
  // Apart, both look as before: the start hollow, its green ring; the end a bullseye.
  const apart = both([40, 0]);
  assert.equal(colourAt(layers, apart, [0, 0]), WHITE);
  assert.equal(colourAt(layers, apart, [9, 0]), COLORS.trace);
  for (const [r, want] of [[0, COLORS.walked], [5, WHITE], [8, COLORS.walked], [10.5, WHITE]] as const) {
    assert.equal(colourAt(layers, apart, [40 + r, 0]), want, `apart, ${r} px out from the end`);
  }
});

test('tend map audit 25: the start keeps its look: a white disc of 7 px with a 4 px green ring, in the first layer', () => {
  assert.equal(paintFor(ENDS_RING_PAINT['circle-color'], 'start'), WHITE);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-radius'], 'start'), 7);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-stroke-width'], 'start'), 4);
  assert.equal(paintFor(ENDS_RING_PAINT['circle-stroke-color'], 'start'), COLORS.trace);
});

// tend map T50 (the owner's yes, Nov 20, "One combined mark (Recommended)", decision 0244): a walk that ends within one
// marker's diameter of its start (on screen, `endsTogether` in lib/traceEnds) drew the end's bullseye over the start,
// whose green showed only as a crescent. Now one mark: the start's hollow ring, in the trace's green, as a halo round
// the end's bullseye, a white band between them so the two read apart in greyscale (the green and the walked colour are
// near one grey). Apart, the two marks as before. The halo is its own source and layer, `ends-loop`, under `ends-ring`.

test('tend map T50: the halo is the start\'s ring: a white middle ringed in the trace\'s green, as wide a ring as the start\'s', () => {
  assert.equal(ENDS_LOOP_PAINT['circle-color'], WHITE);
  assert.equal(ENDS_LOOP_PAINT['circle-stroke-color'], COLORS.trace);
  assert.equal(ENDS_LOOP_PAINT['circle-stroke-width'], paintFor(ENDS_RING_PAINT['circle-stroke-width'], 'start'));
  const paint: NonNullable<CircleLayerSpecification['paint']> = ENDS_LOOP_PAINT;
  for (const key of Object.keys(paint)) assert.match(key, /^circle-/);
  // No hue of its own.
  const hues = new Set([WHITE, COLORS.trace, COLORS.walked]);
  assert.ok(hues.has(ENDS_LOOP_PAINT['circle-color']) && hues.has(ENDS_LOOP_PAINT['circle-stroke-color']));
});

test('tend map T50: a white band separates the start\'s ring from the end\'s bullseye', () => {
  // The halo's white middle reaches past the bullseye's own white edge by at least 2 px, so the band between the
  // end's walked ring and the start's green is the edge and that much more.
  const halo = num(ENDS_LOOP_PAINT['circle-radius']);
  assert.ok(halo - outerOf('end') >= 2, `a white band past the bullseye (${halo - outerOf('end')} px)`);
  assert.ok(halo - num(paintFor(ENDS_RING_PAINT['circle-radius'], 'end')) >= 3, 'at least 3 px of white between the walked ring and the green');
});

test('tend map T50: endsLoopGeoJSON is the halo\'s one point, or nothing', () => {
  assert.deepEqual(endsLoopGeoJSON(null).features, []);
  const p: [number, number] = [-71.4, 41.812];
  const f = endsLoopGeoJSON(p).features;
  assert.equal(f.length, 1);
  assert.deepEqual((f[0].geometry as GeoJSON.Point).coordinates, p);
  assert.equal((f[0].properties as { kind: string }).kind, 'loop');
});

/** The halo's layer and the two ends layers as the web draws them, the halo first. */
function loopLayers(): Layer[] {
  const web = readFileSync(join(__dirname, '../../../components/map/WalkMap.web.tsx'), 'utf8');
  const at = web.search(/map\.addLayer\(\{ id: 'ends-loop', type: 'circle', source: 'ends-loop',\s*paint: ENDS_LOOP_PAINT \}\);/);
  assert.ok(at >= 0, 'the web draws the halo on its own source');
  assert.ok(at < web.indexOf("id: 'ends-ring'"), 'under the ends');
  // The halo's source holds the halo alone; the ends' sources never hold it (drawn at the end's point, it would match).
  return [{ paint: ENDS_LOOP_PAINT as unknown as Record<string, unknown>, only: 'loop' }, ...drawnLayers()];
}

test('tend map T50: one mark: from its middle out, the bullseye, a white band, the start\'s green, read apart in greyscale', () => {
  const layers = loopLayers();
  const p: [number, number] = [0, 0];
  // Together, the ends source holds the end alone and the halo source the halo, both at the end's point.
  const kinds = [...endsLoopGeoJSON(p).features, ...endsGeoJSON(null, p).features].map((f) => (f.properties as { kind: string }).kind);
  assert.deepEqual(kinds, ['loop', 'end']);
  const mark = kinds.map((kind) => ({ kind, at: p }));
  const halo = num(ENDS_LOOP_PAINT['circle-radius']);
  const outer = halo + num(ENDS_LOOP_PAINT['circle-stroke-width']);
  const bands: [number, string][] = [[0, COLORS.walked], [5, WHITE], [8, COLORS.walked], [10.5, WHITE], [halo - 0.5, WHITE], [halo + 2, COLORS.trace], [outer - 0.5, COLORS.trace]];
  for (const [r, want] of bands) assert.equal(colourAt(layers, mark, [r, 0]), want, `${r} px out`);
  assert.equal(colourAt(layers, mark, [outer + 1, 0]), undefined, 'nothing past the green');
  // In greyscale: each band differs from the next by 3:1 or more, so the green is never read as the walked ring.
  const seq = bands.map(([, c]) => c).filter((c, i, all) => i === 0 || c !== all[i - 1]);
  assert.deepEqual(seq, [COLORS.walked, WHITE, COLORS.walked, WHITE, COLORS.trace]);
  for (let i = 1; i < seq.length; i++) assert.ok(contrast(seq[i - 1], seq[i]) >= 3, `${seq[i - 1]} beside ${seq[i]}: ${contrast(seq[i - 1], seq[i]).toFixed(2)}:1`);
  // Without the band they would not: the green and the walked colour are near one grey.
  assert.ok(contrast(COLORS.trace, COLORS.walked) < 3);
});

test('tend map T50: apart, the two marks as before, and no halo', () => {
  const layers = loopLayers();
  const feats = [...endsLoopGeoJSON(null).features, ...endsGeoJSON([0, 0], [40, 0]).features];
  const marks = feats.map((f) => ({ kind: (f.properties as { kind: string }).kind, at: (f.geometry as GeoJSON.Point).coordinates as [number, number] }));
  assert.deepEqual(marks.map((m) => m.kind), ['start', 'end']);
  assert.equal(colourAt(layers, marks, [0, 0]), WHITE);
  assert.equal(colourAt(layers, marks, [9, 0]), COLORS.trace);
  assert.equal(colourAt(layers, marks, [13, 0]), undefined);
  assert.equal(colourAt(layers, marks, [40, 0]), COLORS.walked);
});

test('tend map T50: both maps draw the halo under the ends with the trace\'s opacity, and send the ends again as the zoom decides', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  // The web: its own source, the layer before ends-ring, going with the trace's opacity.
  assert.match(web, /'ends-loop'[^\n]*map\.addSource\(id/, 'the web adds the halo\'s source');
  assert.match(web, /map\.setPaintProperty\('ends-loop', 'circle-opacity', look\.marks\);\s*map\.setPaintProperty\('ends-loop', 'circle-stroke-opacity', look\.marks\);/);
  // Judged at the map's zoom; together, the start leaves the ends source for the halo's.
  assert.match(web, /const together = endsTogether\(ends, view\?\.zoom \?\? props\.initialZoom\);/);
  assert.match(web, /setData\('ends', endsGeoJSON\(together \? null : ends\.start, ends\.end\)\);\s*setData\('ends-loop', endsLoopGeoJSON\(together \? ends\.end : null\)\);/);
  assert.match(web, /\}, \[ready, endsKey, together\]\);/, 'sent again when the zoom makes them one mark or two, never per frame');
  assert.match(web, /data-ends-together=\{together \? '1' : '0'\}/, 'the e2e reads which');
  // Native: the halo's source mounted before the ends', with its paint and the trace's opacity.
  const loopSource = /<GeoJSONSource id="ends-loop" data=\{loop\}>\s*<Layer id="ends-loop" type="circle" paint=\{\{ \.\.\.ENDS_LOOP_PAINT, 'circle-opacity': opacity, 'circle-stroke-opacity': opacity \}\} \/>\s*<\/GeoJSONSource>/;
  assert.match(native, loopSource);
  assert.ok(native.search(loopSource) < native.indexOf('<GeoJSONSource id="ends"'), 'mounted first, so drawn under');
  assert.match(native, /const together = endsTogether\(endPoints, view\?\.zoom \?\? props\.initialZoom\);/);
  // One memo for the two sources, keyed on the ends and the flip (one React rule suppression, as before T50).
  assert.match(native, /const \{ ends, loop \} = useMemo\(\s*\(\) => \(\{ ends: endsGeoJSON\(together \? null : endPoints\.start, endPoints\.end\), loop: endsLoopGeoJSON\(together \? endPoints\.end : null\) \}\),[\s\S]{0,80}\[endsKey, together\],\s*\);/);
});

test('tend map T50: one mark or two, the web still writes both ends for the e2e, and both maps keep the ends\' points', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  // The key names the start and the end whatever is drawn, so the journeys that read them (qol, replay, gaps) hold.
  assert.match(web, /const endsKey = `\$\{fmt\(ends\.start\)\}\|\$\{fmt\(ends\.end\)\}`;/);
  assert.match(web, /data-ends=\{endsKey\}/);
  assert.match(native, /<EndsSource data=\{ends\} loop=\{loop\} opacity=/);
});
