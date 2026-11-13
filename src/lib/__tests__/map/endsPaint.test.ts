/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { CircleLayerSpecification } from 'maplibre-gl';
import { COLORS, ENDS_PAINT, ENDS_RING_PAINT, endsGeoJSON } from '../../../components/map/types';

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
/** A marker's outer edge, in px from its point: MapLibre strokes a circle outside its radius. The end's is its outer ring's. */
function outerOf(kind: 'start' | 'end'): number {
  if (kind === 'end') return num(ENDS_RING_PAINT['circle-radius']) + num(ENDS_RING_PAINT['circle-stroke-width']);
  return num(paintFor(ENDS_PAINT['circle-radius'], kind)) + num(paintFor(ENDS_PAINT['circle-stroke-width'], kind));
}

test('tend map T16: the start is hollow, a white disc ringed in the trace\'s green', () => {
  assert.equal(paintFor(ENDS_PAINT['circle-color'], 'start'), WHITE);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], 'start'), COLORS.trace);
});

test('tend map T16: the end is solid, a disc filled in the walked colour with a white ring', () => {
  assert.equal(paintFor(ENDS_PAINT['circle-color'], 'end'), COLORS.walked);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], 'end'), WHITE);
});

test('tend map T16: the two differ in their fill, not only their ring, and are one size', () => {
  assert.notEqual(paintFor(ENDS_PAINT['circle-color'], 'start'), paintFor(ENDS_PAINT['circle-color'], 'end'));
  // One size since tend map T25: the start's outer edge and the end's outer ring's are one width across.
  assert.equal(outerOf('start'), outerOf('end'));
  // No new hue: the end takes the walked colour the streets already have.
  const hues = new Set([WHITE, COLORS.trace, COLORS.walked]);
  for (const kind of ['start', 'end'] as const) {
    assert.ok(hues.has(paintFor(ENDS_PAINT['circle-color'], kind) as string));
    assert.ok(hues.has(paintFor(ENDS_PAINT['circle-stroke-color'], kind) as string));
  }
});

test('tend map T16: both maps draw the ends layer with this paint, web and native', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  assert.match(web, /id: 'ends', type: 'circle', source: 'ends',\s*paint: ENDS_PAINT\b/);
  assert.match(native, /<Layer id="ends" type="circle" paint=\{\{\s*\.\.\.ENDS_PAINT,/);
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
  // The start feature reaches the match's start branch (hollow, green ring), the end the fallback (solid).
  assert.equal(paintFor(ENDS_PAINT['circle-color'], start), '#ffffff');
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], start), COLORS.trace);
  assert.equal(paintFor(ENDS_PAINT['circle-color'], end), COLORS.walked);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], end), '#ffffff');
  assert.deepEqual(endsGeoJSON(a, null).features.map((f) => (f.properties as { kind: string }).kind), [start], 'a live walk: the start alone');
  // Native spreads ENDS_PAINT and adds only the trace's opacity after it.
  const native = readFileSync(join(__dirname, '../../../components/map/WalkMap.native.tsx'), 'utf8');
  const layer = /<Layer id="ends" type="circle" paint=\{\{([\s\S]*?)\}\} \/>/.exec(native)?.[1] ?? '';
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
  assert.equal(ENDS_RING_PAINT['circle-color'], COLORS.walked);
  const ring = num(ENDS_RING_PAINT['circle-radius']) - (centre + band);
  assert.ok(ring >= 3, `a walked outer ring that reads (${ring} px)`);
});

test('tend map T25: the start is unchanged, hollow, and the end is as wide as it', () => {
  assert.equal(paintFor(ENDS_PAINT['circle-color'], 'start'), WHITE);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-color'], 'start'), COLORS.trace);
  assert.equal(paintFor(ENDS_PAINT['circle-radius'], 'start'), 7);
  assert.equal(paintFor(ENDS_PAINT['circle-stroke-width'], 'start'), 4);
  assert.equal(outerOf('end'), outerOf('start'));
});

test('tend map T25: no hue of its own: every colour of the ends is white, the trace\'s or the walked colour', () => {
  const hues = new Set([WHITE, COLORS.trace, COLORS.walked]);
  for (const kind of ['start', 'end'] as const) {
    assert.ok(hues.has(paintFor(ENDS_PAINT['circle-color'], kind) as string));
    assert.ok(hues.has(paintFor(ENDS_PAINT['circle-stroke-color'], kind) as string));
  }
  assert.ok(hues.has(ENDS_RING_PAINT['circle-color']));
  assert.ok(hues.has(ENDS_RING_PAINT['circle-stroke-color']));
  const ring: NonNullable<CircleLayerSpecification['paint']> = ENDS_RING_PAINT;
  for (const key of Object.keys(ring)) assert.match(key, /^circle-/);
});

test('tend map T25: the walker\'s dot is unchanged, and differs from the end in shape, not only colour', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  // The dot: one navy disc of radius 7 with a 2 px white ring, one layer, on both maps.
  assert.match(web, /id: 'points', type: 'circle', source: 'points',\s*paint: \{\s*'circle-color': COLORS\.walker,\s*'circle-radius': 7,\s*'circle-stroke-color': '#ffffff',\s*'circle-stroke-width': 2,/);
  assert.match(native, /<Layer id="points" type="circle" paint=\{\{\s*'circle-color': COLORS\.walker,\s*'circle-radius': 7,\s*'circle-stroke-color': '#ffffff',\s*'circle-stroke-width': 2,/);
  // The end has a ring round its band, which the dot has not.
  assert.ok(num(ENDS_RING_PAINT['circle-radius']) > num(paintFor(ENDS_PAINT['circle-radius'], 'end')) + num(paintFor(ENDS_PAINT['circle-stroke-width'], 'end')));
});

test('tend map T25: both maps draw the outer ring first, on the ends source, for the end alone, with the trace\'s opacity', () => {
  const dir = join(__dirname, '../../../components/map');
  const web = readFileSync(join(dir, 'WalkMap.web.tsx'), 'utf8');
  const native = readFileSync(join(dir, 'WalkMap.native.tsx'), 'utf8');
  const endOnly = String.raw`\['==', \['get', 'kind'\], 'end'\]`;
  // The web: ends-ring added before ends, both on the ends source; the trace's opacity set on both.
  const webRing = new RegExp(String.raw`id: 'ends-ring', type: 'circle', source: 'ends', filter: ${endOnly},\s*paint: ENDS_RING_PAINT \}\);`);
  assert.match(web, webRing);
  assert.ok(web.search(webRing) < web.search(/id: 'ends', type: 'circle', source: 'ends'/), 'the outer ring is drawn first');
  assert.match(web, /for \(const id of \['ends-ring', 'ends'\]\) \{\s*mapRef\.current\?\.setPaintProperty\(id, 'circle-opacity', props\.traceOpacity \?\? 1\);\s*mapRef\.current\?\.setPaintProperty\(id, 'circle-stroke-opacity', props\.traceOpacity \?\? 1\);/,
    'both layers of the ends go with the trace');
  // Native: in the one ends source, ends-ring before ends, spreading its paint and adding only the trace's opacity.
  const source = /<GeoJSONSource id="ends" data=\{ends\}>([\s\S]*?)<\/GeoJSONSource>/.exec(native)?.[1] ?? '';
  const ringLayer = new RegExp(String.raw`<Layer id="ends-ring" type="circle" filter=\{${endOnly}\} paint=\{\{([\s\S]*?)\}\} \/>`).exec(source);
  assert.ok(ringLayer, 'native draws ends-ring on the ends source, for the end alone');
  assert.ok(source.indexOf('id="ends-ring"') < source.indexOf('id="ends"'), 'the outer ring is drawn first');
  assert.ok(ringLayer[1].includes('...ENDS_RING_PAINT'));
  assert.deepEqual([...ringLayer[1].matchAll(/'([a-z-]+)':/g)].map((m) => m[1]), ['circle-opacity', 'circle-stroke-opacity']);
  assert.match(ringLayer[1], /'circle-opacity': props\.traceOpacity \?\? 1,\s*'circle-stroke-opacity': props\.traceOpacity \?\? 1,/);
});
