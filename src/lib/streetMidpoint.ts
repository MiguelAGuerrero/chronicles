// @layer core
// A street piece's middle point, for the live fog (out of walk.tsx, a file over the size limit; decision 0178).
import type { LngLat, StreetSegment } from './types';

export function streetMidpoint(s: StreetSegment): LngLat {
  const line = s.geometry[0] ?? [];
  return line[Math.floor(line.length / 2)] ?? [0, 0];
}
