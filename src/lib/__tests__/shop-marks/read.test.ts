/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';

// Shop marks (specs/shop-marks): the pure read, written before the code.
type At = [number, number];
type Shop = { type: string; name: string; at: At; chain: boolean };
type Mark = { at: At; merged: boolean; place?: Shop };
type Target = 'control' | 'pin' | 'mark' | 'zoom' | 'card' | 'none';
const read = () =>
  import('../../shopMarks/read' as string) as Promise<{
    shopsFromTile: (f: { geometry: { type: string; coordinates: unknown }; properties?: Record<string, unknown> }[]) => Shop[];
    thin: (places: readonly Shop[], zoom: number) => Mark[];
    nearest: (marks: readonly Mark[], at: At, radiusM: number) => Mark | null;
    withinOf: (places: readonly Shop[], you: At, m: number) => Shop[];
    pressTarget: (i: { control: boolean; capturePin: boolean; mark: boolean; shop: Mark | null }) => Target;
    shopMarkOrder: () => string[];
  }>;

const pt = (lon: number, lat: number, properties: Record<string, unknown>) => ({ geometry: { type: 'Point', coordinates: [lon, lat] }, properties });
const shop = (name: string, at: At, o: Partial<Shop> = {}): Shop => ({ type: 'second_hand', name, at, chain: false, ...o });

test('SM4: a record keeps its type, name, position and chain flag, and every other field is dropped', async () => {
  const { shopsFromTile } = await read();
  const [s] = shopsFromTile([pt(-75.19, 40.69, { type: 'second_hand', name: 'Second Chance', rating: 4.8, popularity: 9, hours: 'Mo-Su 9-5', phone: '1', website: 'x', description: 'd', id: 'n1', brand: 'b', stars: 5 })]);
  assert.deepEqual(Object.keys(s).sort(), ['at', 'chain', 'name', 'type']);
  assert.deepEqual([s.type, s.name, s.at, s.chain], ['second_hand', 'Second Chance', [-75.19, 40.69], false]);
});

test('SM4, SM9: a record with no name, a bad position or a value that is not drawn is not a place', async () => {
  const { shopsFromTile } = await read();
  const got = shopsFromTile([
    pt(-75.19, 40.69, { type: 'second_hand' }),
    pt(-75.19, 40.69, { type: 'second_hand', name: '  ' }),
    pt(NaN, 40.69, { type: 'second_hand', name: 'Nowhere' }),
    pt(-75.19, 40.69, { type: 'supermarket', name: 'Grocer' }),
    { geometry: { type: 'LineString', coordinates: [] }, properties: { type: 'books', name: 'Line' } },
    pt(-75.19, 40.69, { type: 'books', name: 'Page One' }),
  ]);
  assert.deepEqual(got.map((p) => p.name), ['Page One']);
});

test('SM5: the chain flag is kept when the record says so, and is never inferred from a name', async () => {
  const { shopsFromTile } = await read();
  const got = shopsFromTile([pt(0, 0, { type: 'charity', name: 'Goodwill', chain: true }), pt(0, 1, { type: 'charity', name: 'Goodwill' }), pt(0, 2, { type: 'charity', name: 'Goodwill', chain: 'yes' })]);
  assert.deepEqual(got.map((p) => p.chain), [true, false, false], 'only a boolean true is a flag');
});

test('SM10: marks are one size: a mark holds a position, whether it is merged and, if single, its place, and no count', async () => {
  const { thin } = await read();
  const marks = thin([shop('A', [-75.19, 40.69]), shop('B', [-75.1901, 40.6901]), shop('C', [-75.1902, 40.6902]), shop('Far', [-75.0, 40.5])], 14);
  for (const m of marks) assert.ok(Object.keys(m).every((k) => ['at', 'merged', 'place'].includes(k)), Object.keys(m).join());
  assert.ok(marks.some((m) => m.merged && !m.place), 'close places merge into one mark with no place');
  assert.ok(marks.some((m) => !m.merged && m.place?.name === 'Far'));
});

test('SM10: close places merge at a low zoom and split at a high one', async () => {
  const { thin } = await read();
  const two = [shop('A', [-75.19, 40.69]), shop('B', [-75.1903, 40.6903])];
  assert.equal(thin(two, 14).length, 1, 'zoom 14: one mark');
  assert.equal(thin(two, 19).length, 2, 'zoom 19: two marks');
});

test('SM12: on the walk maps only places within the distance of you', async () => {
  const { withinOf } = await read();
  const you: At = [-75.19, 40.69];
  const got = withinOf([shop('Near', [-75.19, 40.695]), shop('Far', [-75.19, 40.71])], you, 800);
  assert.deepEqual(got.map((p) => p.name), ['Near']);
});

test('SM12: the marks draw above the base map and under the dot, trace, route, capture pins, mark pins and busy names', async () => {
  const { shopMarkOrder } = await read();
  const o = shopMarkOrder();
  const i = o.indexOf('shop-marks');
  assert.ok(i > o.indexOf('base'), 'above the base map');
  for (const above of ['dot', 'trace', 'route', 'capture-pins', 'mark-pins', 'storefront-names']) assert.ok(o.indexOf(above) > i, `${above} is above the shop marks`);
});

test('SM14: the nearest unmerged mark within the reach is the one tapped, and none beyond', async () => {
  const { thin, nearest } = await read();
  const marks = thin([shop('Near', [-75.19, 40.6901]), shop('Nearer', [-75.19, 40.69002]), shop('Far', [-75.19, 40.71])], 18);
  assert.equal(nearest(marks, [-75.19, 40.69], 60)?.place?.name, 'Nearer');
  assert.equal(nearest(marks, [-75.19, 40.80], 60), null);
});

test('SM14: a capture pin, a mark or the walker\'s controls take a tap before a shop; a merged mark zooms and opens no card', async () => {
  const { pressTarget } = await read();
  const single: Mark = { at: [0, 0], merged: false, place: shop('A', [0, 0]) };
  const merged: Mark = { at: [0, 0], merged: true };
  const base = { control: false, capturePin: false, mark: false, shop: single };
  assert.equal(pressTarget(base), 'card');
  assert.equal(pressTarget({ ...base, shop: merged }), 'zoom');
  assert.equal(pressTarget({ ...base, mark: true }), 'mark');
  assert.equal(pressTarget({ ...base, capturePin: true, mark: true }), 'pin');
  assert.equal(pressTarget({ ...base, control: true, capturePin: true }), 'control');
  assert.equal(pressTarget({ ...base, shop: null }), 'none');
});

test('SM18: nothing a read returns can say a shop was visited, passed, found or done', async () => {
  const { shopsFromTile, thin } = await read();
  const [p] = shopsFromTile([pt(0, 0, { type: 'books', name: 'B', visited: true, passed: true, found: true, done: true })]);
  const keys = [...Object.keys(p), ...thin([p], 18).flatMap((m) => Object.keys(m))];
  assert.ok(!keys.some((k) => /visit|pass|found|done|seen|count|rank/i.test(k)), keys.join());
});

test('SM14: with the card open a tap anywhere else only closes it; a tap on another single mark swaps the card; nothing falls through', async () => {
  const { pressAction } = (await import('../../shopMarks/read' as string)) as { pressAction: (i: { cardOpen: boolean; target: Target }) => 'card' | 'zoom' | 'close' | 'press' };
  assert.equal(pressAction({ cardOpen: false, target: 'none' }), 'press', 'no card: the map\'s own tap goes on as before');
  assert.equal(pressAction({ cardOpen: false, target: 'card' }), 'card');
  assert.equal(pressAction({ cardOpen: false, target: 'zoom' }), 'zoom');
  assert.equal(pressAction({ cardOpen: true, target: 'none' }), 'close', 'a tap that closes the card does nothing else');
  assert.equal(pressAction({ cardOpen: true, target: 'zoom' }), 'close');
  assert.equal(pressAction({ cardOpen: true, target: 'card' }), 'card');
});
