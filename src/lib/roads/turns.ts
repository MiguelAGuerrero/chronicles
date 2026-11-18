// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { RoadGraph } from './graph';
import type { RoadKind, RoadWay, Turn, TurnSay } from './types';

/*
 * Turns read from the road (RE21, RE23): at a junction (a point of the way with another road to take), a change of heading is a
 * turn by its side, two roads ahead are a fork by the side kept, and a motorway begun or ended is said as that. A bend with no
 * other road is not a turn, and neither is going straight on. The tiles at this zoom name few roads and mark no roundabouts, so a
 * turn has no name and a roundabout is read as the turns it is made of.
 */
export const TURN_RULES = {
  /** A heading is read over this much road each side of a junction, so a kink at the junction itself does not decide it. */
  lookM: 40,
  /** A change of heading of at least this is a turn; less, with another road ahead as well, a fork. */
  turnDeg: 40,
  /** Two turns to the same side nearer than this are one: the two halves of a turn across a divided road. */
  sameM: 60,
} as const;

function bearing(a: LngLat, b: LngLat): number {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return (Math.atan2((b[0] - a[0]) * k, b[1] - a[1]) * 180) / Math.PI;
}
/** b - a, as a turn: positive to the right, in (-180, 180]. */
const turnOf = (a: number, b: number): number => ((((b - a + 180) % 360) + 360) % 360) - 180;

/** The point `m` along the path from index `i`, forward or back, or the path's end. */
function along(path: readonly LngLat[], i: number, step: 1 | -1, m: number): LngLat {
  let left = m;
  let j = i;
  while (j + step >= 0 && j + step < path.length) {
    const d = distanceM(path[j], path[j + step]);
    if (d >= left && d > 0) {
      const t = left / d;
      return [path[j][0] + (path[j + step][0] - path[j][0]) * t, path[j][1] + (path[j + step][1] - path[j][1]) * t];
    }
    left -= d;
    j += step;
  }
  return path[j];
}

function legTurns(graph: RoadGraph, nodes: readonly number[], kinds: readonly RoadKind[], startM: number): Turn[] {
  const path = nodes.map((n) => graph.at(n));
  const out: Turn[] = [];
  let m = startM;
  for (let i = 1; i < nodes.length - 1; i++) {
    m += distanceM(path[i - 1], path[i]);
    const others: number[] = [];
    graph.eachFrom(nodes[i], (to) => {
      if (to !== nodes[i - 1] && to !== nodes[i + 1] && !others.includes(to)) others.push(to);
    });
    if (!others.length) continue;
    const here = path[i];
    const inB = bearing(along(path, i, -1, TURN_RULES.lookM), here);
    const delta = turnOf(inB, bearing(here, along(path, i, 1, TURN_RULES.lookM)));
    let say: TurnSay | null = null;
    // Audit 4: a real change of heading is said by its side, a motorway begun or ended there or not.
    if (Math.abs(delta) >= TURN_RULES.turnDeg) say = delta > 0 ? 'right' : 'left';
    else if (kinds[i - 1] !== 'motorway' && kinds[i] === 'motorway') say = 'join';
    else if (kinds[i - 1] === 'motorway' && kinds[i] !== 'motorway') say = 'leave';
    else {
      // Going on ahead: a fork when another road goes ahead too, said by the side this one keeps to.
      const ahead = others.map((to) => turnOf(inB, bearing(here, graph.at(to)))).filter((d) => Math.abs(d) < TURN_RULES.turnDeg);
      if (ahead.length) say = ahead.every((d) => d > delta) ? 'keep-left' : ahead.every((d) => d < delta) ? 'keep-right' : null;
    }
    if (!say) continue;
    const last = out[out.length - 1];
    if (last && last.say === say && m - last.alongM < TURN_RULES.sameM) continue;
    out.push({ at: here, alongM: m, say });
  }
  return out;
}

/** RE21: the turns of a way, in order, each with how far along the way it is. A stretch with no road has none. */
export function manoeuvres(graph: RoadGraph, way: RoadWay): Turn[] {
  const out: Turn[] = [];
  let m = 0;
  for (const leg of way.legs) {
    if (!leg) return out;
    out.push(...legTurns(graph, leg.nodes, leg.kinds, m));
    m += leg.lengthM;
  }
  return out;
}
