import assert from 'node:assert/strict';
import { test } from 'node:test';
import { declutterMarks } from '../../markNames';

// Two marks whose heads would cover each other (fix mark-overlap): laid side by side, each on a leg to its own point.
const Z = 18;
const PX_PER_DEG = (512 * 2 ** Z) / 360;
const lng = (px: number) => -75.4 + px / PX_PER_DEG;
const mark = (id: string, px: number, name: string, extra: object = {}) => ({ id, at: [lng(px), 40.6] as [number, number], name, revealed: true, ...extra });
/** Where a mark's head stands on screen, in px from the first mark's point (x only; every test here keeps one latitude). */
const headX = (m: { at: [number, number]; spread?: { dx: number } }) => (m.at[0] + 75.4) * PX_PER_DEG + (m.spread?.dx ?? 0);
/** A pin's tap room: 36 px of head and 6 either side. */
const HIT_W = 48;

test('fix mark-overlap 1: two marks a few px apart stand side by side, clear of each other, both named', () => {
  const out = declutterMarks([mark('a', 0, 'Keep Creating Art Wellness Center'), mark('b', 4, 'Library')], Z);
  assert.ok(out.every((m) => m.spread), 'both are spread');
  assert.ok(Math.abs(headX(out[0]) - headX(out[1])) >= HIT_W, 'their tap rooms never overlap');
  assert.ok(out.every((m) => m.spread!.dy < 0), 'lifted off their points, so each leg runs down to its own');
  assert.ok(out.every((m) => !m.nameHidden), 'both names show');
  assert.deepEqual(out.map((m) => m.spread!.side).sort(), ['left', 'right'], 'one name to each outer side');
});

test('fix mark-overlap 2: two marks on the very same point share it, one either side', () => {
  const out = declutterMarks([mark('a', 0, 'Wine & Design'), mark('b', 0, 'Library')], Z);
  const [l, r] = out[0].spread!.side === 'left' ? out : [out[1], out[0]];
  assert.equal(l.spread!.dx, -r.spread!.dx, 'centred on the shared point');
  assert.ok(headX(r) - headX(l) >= HIT_W);
});

test('fix mark-overlap 3: three on one spot make one row; the middle one keeps its name only in its spoken label', () => {
  const marks = [mark('a', 0, 'Alpha'), mark('b', 1, 'Beta'), mark('c', 2, 'Gamma')];
  const out = declutterMarks(marks, Z);
  const xs = out.map(headX).sort((p, q) => p - q);
  assert.ok(xs[1] - xs[0] >= HIT_W && xs[2] - xs[1] >= HIT_W);
  assert.deepEqual(out.map((m) => !!m.nameHidden), [false, true, false]);
  // The order they arrive in changes nothing.
  const back = declutterMarks([...marks].reverse(), Z);
  assert.deepEqual(back.map((m) => [m.id, m.spread, !!m.nameHidden]).reverse(), out.map((m) => [m.id, m.spread, !!m.nameHidden]));
});

test('fix mark-overlap 4: a row that would land on a neighbour takes it in', () => {
  // a and b on one point; c 60 px off is clear of both points, but not of b's place in a row of two.
  const out = declutterMarks([mark('a', 0, 'A'), mark('b', 0, 'B'), mark('c', 60, 'C')], Z);
  const xs = out.map(headX).sort((p, q) => p - q);
  assert.equal(xs.length, 3);
  assert.ok(xs[1] - xs[0] >= HIT_W && xs[2] - xs[1] >= HIT_W, `heads at ${xs.join(', ')}`);
});

test('fix mark-overlap 5: marks clear of each other stay on their points, the same objects', () => {
  const marks = [mark('a', 0, 'A'), mark('b', 200, 'B')];
  const out = declutterMarks(marks, Z);
  assert.ok(out.every((m, i) => m === marks[i]));
});

test('fix mark-overlap 6: a found mark is never moved (it lets taps through to the moment beside it)', () => {
  const out = declutterMarks([mark('a', 0, 'A'), mark('f', 2, 'F', { found: true })], Z);
  assert.ok(out.every((m) => !m.spread));
});
