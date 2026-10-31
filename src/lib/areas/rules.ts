/**
 * The rules for placing walks. Bump AREA_RULES when any of these change, so
 * every walk is placed again (the owner tunes the reaches after ten walks).
 */
export const AREA_RULES = '1';

/** How far from a place's point a walk still counts as in it. */
export const AREA_REACH_M = {
  neighborhood: 1000,
  town: 3000,
  city: 10_000,
  state: 300_000,
  country: 2_000_000,
};

/** The trace is placed in pieces this long, each by the places nearest its middle. */
export const AREA_SAMPLE_M = 50;
