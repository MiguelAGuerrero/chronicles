import type { Walk } from './types';

const PARTS: [number, string][] = [[5, 'night'], [12, 'morning'], [17, 'afternoon'], [21, 'evening'], [24, 'night']];

/**
 * "Tuesday evening in Fox Point", from the start time and the area found at
 * stop. Pure (no db), so `rename.ts` and its test can use it; `summary.ts`
 * re-exports it.
 */
export function suggestTitle(walk: Walk): string {
  const d = new Date(walk.started_at);
  const day = d.toLocaleDateString(undefined, { weekday: 'long' });
  const part = PARTS.find(([h]) => d.getHours() < h)?.[1] ?? 'walk';
  return walk.area ? `${day} ${part} in ${walk.area}` : `${day} ${part} walk`;
}
