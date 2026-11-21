// @layer core
import type { PastStatus } from '../pastLines/usePastLines';
import type { WalkStatus } from '../walk/layer';

/** The quiet line under a layer while it works or can't (layers audit 7): in words, and never for a layer that is off. */
export function layerNotes(s: {
  walkability: WalkStatus;
  storefrontsReading: boolean;
  storefrontsFailed: boolean;
  past?: PastStatus;
  placesRange?: string;
  /** The ready map's read for places (ready-map-places RQ17): reading, failed, or neither. */
  placesRead?: 'reading' | 'failed' | null;
}): Record<string, string | null> {
  const walk = s.walkability;
  const past = s.past ?? 'off';
  return {
    walkability: walk === 'reading' ? 'Reading…' : walk === 'unavailable' ? 'Not available now' : walk === 'waiting' ? 'Waiting for your position' : null,
    storefronts: s.storefrontsReading ? 'Reading…' : s.storefrontsFailed ? 'Not available now' : null,
    // Places (modes-to-layers ui 1): how far a "?" shows and where that is set, on the maps that have a range; a distance, never a count.
    // RQ17: while the ready map reads the area, or after it failed, the row says so, so an empty map never looks like an empty square.
    places: s.placesRead === 'reading' ? 'Reading…' : s.placesRead === 'failed' ? 'Not available now' : s.placesRange ? `Shows places within ${s.placesRange}. Set in Walk settings.` : null,
    // Where I've been (WB12): in words, never how many.
    past: past === 'waiting' ? 'Waiting for your position' : past === 'preparing' ? 'Getting your walks ready…' : past === 'none' ? 'None of your walks pass here' : null,
  };
}
