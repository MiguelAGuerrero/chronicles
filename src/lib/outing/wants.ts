// @layer core
import type { Want } from './candidates';

/*
 * The vocabulary (QC2, QC4, QC5): what the walker may say they want to see. Data, not code; a gate of kinds (what a place is),
 * never a measure: no field orders, weights or prefers an entry, and the page lists them alphabetically by label (steward R4).
 */
export const WANTS: readonly Want[] = [];

/** QC2: the entries whose label or aliases hold the query (case-insensitive, whole-prefix words); nothing else is matched. */
export function matchWants(_query: string, _wants: readonly Want[] = WANTS): Want[] {
  throw new Error('not built: quick-circuit QC2');
}
