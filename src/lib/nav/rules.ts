// @layer core
/** The navigation rules from the v0.5 spec (criteria N2-N9). */
export const NAV = {
  /** Where the trace passed within this of itself, walk me back cuts across (N2). */
  loopM: 30,
  /** A street route joins the nearest street within this of each end (N3, N4). */
  joinM: 150,
  /**
   * A route starts on the street you are walking along (NB7): one within
   * this of the nearest street, running within headingDeg of your heading.
   */
  headingJoinM: 12,
  headingDeg: 35,
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

/** Scenic routes (specs/scenic-routes, SR2-SR10; the owner's calls, Nov 4). */
export const SCENIC = {
  /** A scenic route is at most this share longer than the direct one (SR5). */
  detour: 0.3,
  /** Offered only when the destination is this close in a straight line (SR2, SR9). */
  maxM: 5000,
  /** A corridor of more z14 tiles than this is not read (about 5 km across at 45° north). */
  maxTiles: 40,
  /** Green and busy: a route must gain this many metres of what it leans on (SR6). */
  minGainM: 100,
  /** Sights: a route must pass this many more places (SR6). */
  minSights: 1,
  /** A place is passed within this of the route (SR6). */
  sightM: 40,
  /** A busy street counts within this of the route. */
  busyM: 15,
  /** The share of length two routes must share to be one row (SR7), or to be like Direct. */
  sameShare: 0.8,
  directShare: 0.9,
  /** Within this, a route's point lies on another route. */
  sharedM: 15,
  /** A park, or a busy street, is named once the route runs this long in it or along it (SR4). */
  greenRunM: 30,
  busyRunM: 50,
  /** How strongly an appealing metre is discounted: each is tried, the best within the detour wins. */
  strengths: [0.4, 0.6, 0.85] as readonly number[],
  /** Routes and edges are sampled this often. */
  sampleM: 10,
  /** Sights: at most this many stops on the way, chosen from this many nearest the straight line. */
  maxStops: 3,
  candidates: 8,
};
