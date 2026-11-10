// @layer core
import { positionAt, type PauseSpan } from './geo';
import { GAP_MS } from './replay';
import type { TracePoint } from './types';

/**
 * Where a piece split out of its moment goes (moment stacks MS16, decision 0123): on a walk, the trace at its own time,
 * as a capture is placed today (`placeAt`): inside a pause, where the pause began; inside a gap in the fixes (none
 * within `GAP_MS` on either side), the last fix before it, never a line across the gap. Off a walk, or with no fix
 * to place it by, the original moment's place: nothing reads the location again (0036).
 */
export function splitPlace(
  t: number,
  walk: { fixes: TracePoint[]; pauses: PauseSpan[] } | null,
  original: { lat: number | null; lon: number | null },
): { lat: number | null; lon: number | null } {
  const keep = { lat: original.lat, lon: original.lon };
  if (!walk || !walk.fixes.length) return keep;
  const fixes = [...walk.fixes].sort((a, b) => a.t - b.t);
  const inPause = walk.pauses.find((p) => t >= p.started_at && t <= (p.ended_at ?? Infinity));
  const at = inPause ? inPause.started_at : t;
  let before: TracePoint | null = null;
  let after: TracePoint | null = null;
  for (const f of fixes) {
    if (f.t <= at) before = f;
    else if (!after) after = f;
  }
  if (before && after && after.t - before.t > GAP_MS && at - before.t > 0) return { lat: before.lat, lon: before.lon };
  const pos = positionAt(fixes, at);
  return pos ? { lat: pos[1], lon: pos[0] } : keep;
}
