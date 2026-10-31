/** The navigation rules from the v0.5 spec (criteria N2-N9). */
export const NAV = {
  /** Where the trace passed within this of itself, walk me back cuts across (N2). */
  loopM: 30,
  /** A street route joins the nearest street within this of each end (N3, N4). */
  joinM: 150,
  /** Further than this in a straight line is too far to walk (N5). */
  maxM: 10_000,
  /** Off your route: further than this, for offFixes accepted fixes in a row (N8). */
  offM: 50,
  offFixes: 2,
  /** Re-routing happens at most this often (N8). */
  rerouteMs: 15_000,
  /** Arrived: within this of the destination (N9). */
  arriveM: 30,
};
