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

/** Screen px of a mark's point at a bearing (the map turned so `bearing` is up), plus its spread. */
function onScreen(m: { at: [number, number]; spread?: { dx: number; dy: number } }, bearing: number): [number, number] {
  const s = 512 * 2 ** Z;
  const wx = (m.at[0] / 360) * s;
  const wy = (0.5 - Math.log(Math.tan(Math.PI / 4 + (m.at[1] * Math.PI) / 360)) / (2 * Math.PI)) * s;
  const t = (-bearing * Math.PI) / 180;
  return [wx * Math.cos(t) - wy * Math.sin(t) + (m.spread?.dx ?? 0), wx * Math.sin(t) + wy * Math.cos(t) + (m.spread?.dy ?? 0)];
}
const clearOf = (a: [number, number], b: [number, number]) => Math.abs(a[0] - b[0]) >= HIT_W || Math.abs(a[1] - b[1]) >= HIT_W;
const PX_PER_DEG_LAT = PX_PER_DEG / Math.cos((40.6 * Math.PI) / 180);
const at2 = (id: string, x: number, y: number, name = id) => ({ id, at: [lng(x), 40.6 - y / PX_PER_DEG_LAT] as [number, number], name, revealed: true });

test('fix mark-overlap audit 1: on a turned map no two spread heads stand in each other\'s tap room', () => {
  for (const bearing of [90, 180, 270, 33]) {
    for (const marks of [[at2('a', 0, 0), at2('b', 20, 0)], [at2('a', 0, 0), at2('b', 0, 30)]]) {
      const out = declutterMarks(marks, Z, { bearing });
      const [p, q] = out.map((m) => onScreen(m, bearing));
      assert.ok(clearOf(p, q), `bearing ${bearing}: heads at ${p.map(Math.round)} and ${q.map(Math.round)}`);
    }
  }
});

test('fix mark-overlap audit 2: a chain of marks never makes one long row: every leg under 60 px', () => {
  // Eight along a street, 30 px apart: each overlaps the next, so one row would take them all (the auditor's F2).
  const line = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => at2(`m${k}`, k * 30, 0));
  // And six down a street, 40 px apart.
  const column = [0, 1, 2, 3, 4, 5].map((k) => at2(`n${k}`, 0, k * 40));
  for (const marks of [line, column]) {
    const out = declutterMarks(marks, Z);
    for (const m of out) assert.ok(Math.hypot(m.spread?.dx ?? 0, m.spread?.dy ?? 0) <= 60, `${m.id} moved ${JSON.stringify(m.spread)}`);
  }
});

test('fix mark-overlap audit 3: every order of an L of three gives the same spreads and hidden names', () => {
  const a = at2('a', -40, 0, 'Alpha');
  const b = at2('b', 0, 0, 'Beta');
  const c = at2('c', 20, 47, 'Gamma');
  const shape = (l: typeof a[]) => JSON.stringify(declutterMarks(l, Z).map((m) => [m.id, m.spread ?? null, !!m.nameHidden]).sort());
  const want = shape([a, b, c]);
  for (const l of [[a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]]) assert.equal(shape(l), want);
});

test('fix mark-overlap audit 4: a map that asks for no spread (Explore lays its own pins out) gets none', () => {
  const out = declutterMarks([mark('a', 0, 'A'), mark('b', 4, 'B')], Z, { spread: false });
  assert.ok(out.every((m) => !m.spread));
});

test('fix mark-overlap audit 5: a row leaves 8 px between its tap rooms', () => {
  const out = declutterMarks([mark('a', 0, 'A'), mark('b', 0, 'B')], Z);
  assert.ok(Math.abs(headX(out[0]) - headX(out[1])) >= HIT_W + 8);
});

/** The closest two heads stand, on screen, by the larger of their two gaps (they clear on either axis). */
const closest = (heads: [number, number][]) => {
  let best = Infinity;
  for (let i = 0; i < heads.length; i++)
    for (let j = i + 1; j < heads.length; j++) best = Math.min(best, Math.max(Math.abs(heads[i][0] - heads[j][0]), Math.abs(heads[i][1] - heads[j][1])));
  return best;
};

test('fix mark-overlap audit 7: a chain never leaves two heads closer than their points were', () => {
  for (const gap of [20, 30, 40]) {
    const line = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => at2(`m${k}`, k * gap, 0));
    const out = declutterMarks(line, Z);
    assert.ok(closest(out.map((m) => onScreen(m, 0))) >= Math.min(gap, HIT_W), `gap ${gap}: ${JSON.stringify(out.map((m) => m.spread?.dx ?? 0))}`);
  }
});

test('fix mark-overlap audit 8: a row never stands in the tap room of a mark it could not take in', () => {
  const cases = [
    [at2('a', 0, 0), at2('b', 0, 0), at2('c', 0, 0), at2('d', 0, 0), at2('e', 90, 0)],
    [at2('a', 0, 0), at2('b', 4, 0), at2('c', 76, 0)],
  ];
  for (const marks of cases) {
    const out = declutterMarks(marks, Z);
    const heads = out.map((m) => onScreen(m, 0));
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) {
        if (!out[i].spread && !out[j].spread) continue;
        // Two of one row stand 56 apart; a row and a mark beside it must clear too.
        assert.ok(clearOf(heads[i], heads[j]), `${out[i].id} and ${out[j].id}: ${JSON.stringify(out.map((m) => m.spread ?? null))}`);
      }
  }
});
