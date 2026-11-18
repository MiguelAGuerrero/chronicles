/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { LngLat } from '../../types';
import type { Road, RoadKind } from '../../roads/types';

// Guiding a drive (RE20-RE24, RE26, RE32): turns read from the road, the turn ahead of a fix, leaving the way, the words.
// Written before the code.

const TODO = { todo: 'test first' };
const O: LngLat = [8.5, 47.3];
const M_LAT = 1 / 111_320;
const M_LON = 1 / (111_320 * Math.cos((O[1] * Math.PI) / 180));
const at = (e: number, n: number): LngLat => [O[0] + e * M_LON, O[1] + n * M_LAT];
const road = (pts: [number, number][], kind: RoadKind = 'primary', oneWay: -1 | 0 | 1 = 0): Road => ({ kind, link: false, oneWay, points: pts.map(([e, n]) => at(e, n)) });
async function turnsOf(roads: Road[], from: [number, number], to: [number, number]) {
  const { RoadGraph } = await import('../../roads/graph');
  const { findWay } = await import('../../roads/way');
  const { manoeuvres } = await import('../../roads/turns');
  const g = RoadGraph.build(roads, 10);
  const run = findWay(g, [at(...from), at(...to)]);
  let r = run.next();
  while (!r.done) r = run.next();
  return { way: r.value, turns: manoeuvres(g, r.value) };
}
const near = (a: number, b: number, tol = 15) => Math.abs(a - b) <= tol;

test('RE21: a change of road at a junction is a turn, said by its side, where it is along the way', TODO, async () => {
  const roads = [road([[0, 0], [500, 0], [1000, 0]]), road([[1000, 0], [2000, 0]]), road([[1000, 0], [1000, 500], [1000, 1000]])];
  const left = await turnsOf(roads, [0, 0], [1000, 1000]);
  assert.deepEqual(left.turns.map((t) => t.say), ['left']);
  assert.ok(near(left.turns[0].alongM, 1000), `${left.turns[0].alongM}`);
  const right = await turnsOf(roads, [2000, 0], [1000, 1000]);
  assert.deepEqual(right.turns.map((t) => t.say), ['right']);
});

test('RE21: staying on the road around a bend is not a turn, and neither is going straight over a crossroads', TODO, async () => {
  const bend = await turnsOf([road([[0, 0], [1000, 0], [1000, 1000]])], [0, 0], [1000, 1000]);
  assert.deepEqual(bend.turns, []);
  const cross = [road([[0, 0], [1000, 0]]), road([[1000, 0], [2000, 0]]), road([[1000, -800], [1000, 0]]), road([[1000, 0], [1000, 800]])];
  assert.deepEqual((await turnsOf(cross, [0, 0], [2000, 0])).turns, []);
});

test('RE21: a fork is said by the side kept', TODO, async () => {
  const fork = [road([[0, 0], [1000, 0]]), road([[1000, 0], [1500, 100], [2000, 250]]), road([[1000, 0], [1500, -100], [2000, -250]])];
  assert.deepEqual((await turnsOf(fork, [0, 0], [2000, 250])).turns.map((t) => t.say), ['keep-left']);
  assert.deepEqual((await turnsOf(fork, [0, 0], [2000, -250])).turns.map((t) => t.say), ['keep-right']);
});

test('RE21: joining and leaving a motorway are turns of their own', TODO, async () => {
  const roads = [road([[0, 0], [1000, 0]]), road([[1000, 0], [1000, 900]]), road([[1000, 0], [3000, 0]], 'motorway'), road([[3000, 0], [3000, 900]]), road([[3000, 0], [4000, 0]])];
  const got = await turnsOf(roads, [0, 0], [4000, 0]);
  assert.deepEqual(got.turns.map((t) => t.say), ['join', 'leave']);
  assert.ok(near(got.turns[0].alongM, 1000) && near(got.turns[1].alongM, 3000));
});

test('RE21: the two halves of one turn across a divided road are one turn', TODO, async () => {
  // Heading east, then north over a road whose two carriageways are 20 m apart.
  const roads = [road([[0, 0], [1000, 0]]), road([[1000, 0], [1020, 0]]), road([[1020, 0], [2000, 0]]), road([[1000, 0], [1000, 1000]], 'primary', -1), road([[1020, 0], [1020, 1000]], 'primary', 1), road([[1000, -500], [1000, 0]], 'primary', -1), road([[1020, -500], [1020, 0]], 'primary', 1)];
  const got = await turnsOf(roads, [0, 0], [1020, 1000]);
  assert.deepEqual(got.turns.map((t) => t.say), ['left']);
});

test('RE20, RE23: the turn ahead of a fix and how far to it; a turn passed is not ahead; after the last, the road and what is left of it', TODO, async () => {
  const { driveStep, DRIVE_RULES } = await import('../../roads/drive');
  const roads = [road([[0, 0], [1000, 0]]), road([[1000, 0], [2000, 0]]), road([[1000, 0], [1000, 1000]]), road([[1000, 1000], [1000, 2000]]), road([[1000, 1000], [2000, 1000]]), road([[1000, 1000], [0, 1000]])];
  const { way, turns } = await turnsOf(roads, [0, 0], [2000, 1000]);
  assert.deepEqual(turns.map((t) => t.say), ['left', 'right']);
  const a = driveStep(way.path, turns, at(400, 5), null, DRIVE_RULES);
  assert.equal(a.off, false);
  assert.equal(a.turn?.say, 'left');
  assert.ok(near(a.turn!.toM, 600), `${a.turn!.toM}`);
  const b = driveStep(way.path, turns, at(1003, 300), a.left, DRIVE_RULES);
  assert.equal(b.turn?.say, 'right');
  assert.ok(near(b.turn!.toM, 700));
  const c = driveStep(way.path, turns, at(1500, 1002), b.left, DRIVE_RULES);
  assert.equal(c.turn?.say, 'on');
  assert.ok(near(c.turn!.toM, 500));
  // At the road's end nothing is left to say.
  assert.equal(driveStep(way.path, turns, at(1995, 1000), c.left, DRIVE_RULES).turn, null);
});

test('RE22: off the way no turn is shown and nothing is flagged; the way is asked for again only after a set distance, a driving rule', TODO, async () => {
  const { driveStep, DRIVE_RULES } = await import('../../roads/drive');
  const { NAV_RULES_M } = { NAV_RULES_M: 60 };
  const roads = [road([[0, 0], [1000, 0]]), road([[1000, 0], [2000, 0]]), road([[1000, 0], [1000, 1000]])];
  const { way, turns } = await turnsOf(roads, [0, 0], [1000, 1000]);
  const on = driveStep(way.path, turns, at(900, 0), null, DRIVE_RULES);
  assert.equal(on.left, null);
  // Missed the turn: carried straight on.
  const off = driveStep(way.path, turns, at(1000 + DRIVE_RULES.offM + 30, 0), on.left, DRIVE_RULES);
  assert.equal(off.off, true);
  assert.equal(off.turn, null);
  assert.equal(off.again, false);
  assert.deepEqual(Object.keys(off).sort(), ['again', 'left', 'off', 'turn'], 'nothing else comes back: no word, no flag for the screen');
  const further = driveStep(way.path, turns, at(1000 + DRIVE_RULES.offM + 30 + DRIVE_RULES.againM + 10, 0), off.left, DRIVE_RULES);
  assert.equal(further.again, true);
  assert.ok(DRIVE_RULES.againM > NAV_RULES_M, 'a wait by distance, longer than a walker\'s drift');
  // Back on the way before that: the turn returns and nothing is asked.
  const back = driveStep(way.path, turns, at(1000, 200), off.left, DRIVE_RULES);
  assert.equal(back.off, false);
  assert.equal(back.left, null);
  assert.equal(back.again, false);
});

test('RE20, RE21, RE25, RE26, RE32: the words of a drive: the turn and how far, the one-time lines; no time, speed, count or rebuke', TODO, async () => {
  const w = await import('../../roads/words');
  assert.equal(w.turnLine({ say: 'left', toM: 2400 }, 'km'), 'Left. 2.4 km.');
  assert.equal(w.turnLine({ say: 'right', toM: 350 }, 'km'), 'Right. 350 m.');
  assert.equal(w.turnLine({ say: 'keep-left', toM: 900 }, 'km'), 'Keep left. 900 m.');
  assert.equal(w.turnLine({ say: 'keep-right', toM: 900 }, 'km'), 'Keep right. 900 m.');
  assert.equal(w.turnLine({ say: 'join', toM: 5000 }, 'km'), 'Onto the motorway. 5.0 km.');
  assert.equal(w.turnLine({ say: 'leave', toM: 31_000 }, 'km'), 'Off the motorway. 31 km.');
  assert.equal(w.turnLine({ say: 'on', toM: 12_000 }, 'km'), 'On this road. 12 km.');
  assert.equal(w.DRIVE_LABEL, 'Drive there');
  assert.equal(w.END_LABEL, 'End');
  assert.equal(w.SHOWN_LINE, 'Turns are shown, not said.');
  assert.equal(w.LIMITS_LINE, 'The map holds no turn restrictions and no closures.');
  assert.match(w.MAPS_ROAD_LINE, /Maps chooses its own road/);
  const all = [...(['left', 'right', 'keep-left', 'keep-right', 'join', 'leave', 'on'] as const).map((say) => w.turnLine({ say, toM: 1200 }, 'mi')), w.DRIVE_LABEL, w.END_LABEL, w.SHOWN_LINE, w.LIMITS_LINE, w.MAPS_ROAD_LINE, w.NO_ROAD_LINE];
  for (const s of all) assert.doesNotMatch(s, /\b(min|minutes?|hours?|mph|km\/h|fast\w*|quick\w*|short\w*|best|recalculat\w*|off route|turn around|wrong|missed|caution|check|arriv\w*|first|second|next)\b/i, s);
});

test('RE1, RE21: the service answers a way with its turns', TODO, async () => {
  const { createRoads } = await import('../../roads/service');
  const { memoryRoads } = await import('../../roads/types');
  const roads = [road([[0, 0], [1000, 0]]), road([[1000, 0], [2000, 0]]), road([[1000, 0], [1000, 1000]])];
  const got = await createRoads({ source: memoryRoads(roads), pause: async () => {} }).way([at(0, 0), at(1000, 1000)]);
  assert.equal(got?.state, 'found');
  if (got?.state === 'found') assert.deepEqual(got.turns.map((t) => t.say), ['left']);
});
