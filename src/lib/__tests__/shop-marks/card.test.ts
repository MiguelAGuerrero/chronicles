/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Shop marks (specs/shop-marks): the tap card, written before the code.
type Shop = { type: string; name: string; at: [number, number]; chain: boolean };
type Box = { x: number; y: number; w: number; h: number };
const card = () =>
  import('../../shopMarks/card') as Promise<{
    cardLines: (p: Shop) => { name: string; kind: string; chain: string | null };
    cardBox: (v: { width: number; height: number; topInset: number }) => Box;
    CLOSE_MIN_PX: number;
  }>;
const shop = (o: Partial<Shop> = {}): Shop => ({ type: 'second_hand', name: 'Second Chance', at: [0, 0], chain: false, ...o });
const SRC = join(__dirname, '../../shopMarks');

test('SM15: the card holds a name, a kind in words and, only for a flagged shop, a line saying the map data records a chain', async () => {
  const { cardLines } = await card();
  const plain = cardLines(shop());
  assert.equal(plain.name, 'Second Chance');
  assert.ok(plain.kind.length > 0);
  assert.equal(plain.chain, null, 'nothing about a chain for an unflagged shop');
  assert.match(cardLines(shop({ chain: true })).chain ?? '', /OpenStreetMap/);
  assert.deepEqual(Object.keys(plain).sort(), ['chain', 'kind', 'name'], 'three fields and nothing else');
});

test('SM15: no card text treats an unflagged shop as independent, local or unique, nor holds a digit, rating or hours', async () => {
  const { cardLines } = await card();
  for (const chain of [false, true]) {
    const l = cardLines(shop({ chain, name: 'Page One' }));
    const text = [l.kind, l.chain ?? ''].join(' ');
    assert.ok(!/independent|local|unique|one of a kind|family|rating|stars?|\bopen\b|hours|popular|best/i.test(text), text);
    assert.ok(!/\d/.test(text), text);
  }
});

test('SM15: the shop modules never read chains.json, so there is one definition of a chain here', () => {
  for (const f of ['read.ts', 'card.ts', 'shell.ts', 'types.ts']) {
    let src = '';
    try { src = readFileSync(join(SRC, f), 'utf8'); } catch { assert.fail(`${f} does not exist yet`); }
    assert.ok(!/chains\.json|isChain|normalizeBrand/.test(src), f);
  }
});

test('SM16: the card sits in a fixed region at the map\'s top, clear of the capture stack, on a tall and a short phone', async () => {
  const { cardBox } = await card();
  for (const v of [{ width: 390, height: 844, topInset: 47 }, { width: 360, height: 568, topInset: 24 }]) {
    const b = cardBox(v);
    assert.ok(b.y >= v.topInset && b.y + b.h <= v.height * 0.4, `inside the top part (${JSON.stringify(b)})`);
    assert.ok(b.x >= 0 && b.x + b.w <= v.width);
    const stack = { x: 0, y: v.height * 0.55, w: v.width, h: v.height * 0.45 };
    const hit = b.x < stack.x + stack.w && b.x + b.w > stack.x && b.y < stack.y + stack.h && b.y + b.h > stack.y;
    assert.equal(hit, false, 'never meets the capture stack');
  }
});

test('SM16: the close control is at least 44 px', async () => {
  const { CLOSE_MIN_PX } = await card();
  assert.ok(CLOSE_MIN_PX >= 44);
});
