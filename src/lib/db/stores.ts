/**
 * Which stores are cache and which are truth. A tile-build change clears the
 * derived ones; the kept ones are never cleared by the app (the owner's rule:
 * a place once offered is never offered again).
 */
export const DERIVED_STORES: readonly string[] = ['street_segment', 'place'];

/** Discovery's truth: places offered, marks set, reminders shown. */
export const KEPT_STORES: readonly string[] = ['offered', 'mark', 'recall'];
