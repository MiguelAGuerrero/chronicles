// @layer core
import type { WalkStatus } from '../walk/layer';

/** SM7, SM10: what the shop marks inside the Storefronts layer are doing: drawn, a covered area with none, no pack over the map, a read that failed, reading, or too far out to draw. */
export type ShopMarksStatus = 'ok' | 'empty' | 'uncovered' | 'failed' | 'reading' | 'far';

const SHOP_MARK_LINES: Record<ShopMarksStatus, string | null> = {
  ok: 'Shops from OpenStreetMap. Tap a mark for its name.',
  // A covered area with none is not a failure: it says nothing (SM7).
  empty: null,
  uncovered: 'No shop marks here yet',
  failed: "Couldn't read the shops",
  reading: 'Reading…',
  far: 'Zoom in to see shops',
};

/**
 * The quiet line under a layer while it works or can't (layers audit 7): in words, and never for a layer that is off. The Storefronts
 * layer is one layer with two drawings, the street shading and the shop marks: the shading's own reading or failure is said first, else
 * the shop marks' line.
 */
export function layerNotes(s: { walkability: WalkStatus; storefrontsReading: boolean; storefrontsFailed: boolean; shopMarks?: ShopMarksStatus }): Record<string, string | null> {
  const walk = s.walkability;
  return {
    walkability: walk === 'reading' ? 'Reading…' : walk === 'unavailable' ? 'Not available now' : walk === 'waiting' ? 'Waiting for your position' : null,
    storefronts: s.storefrontsReading ? 'Reading…' : s.storefrontsFailed ? 'Not available now' : s.shopMarks ? SHOP_MARK_LINES[s.shopMarks] : null,
  };
}
