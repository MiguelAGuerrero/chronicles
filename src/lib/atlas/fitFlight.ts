// @layer core
/** A fit the map is flying, and the size of the box it was asked in (tend explore 17). */
export interface FitFlight {
  width: number;
  height: number;
}

/**
 * Whether the map's box, resized, makes the fit under way again (tend explore 17; AT9). An area's card folds the tabs
 * away as it opens, so Explore's map grows while the card's fit is flying, and maplibre (6.16) lands that flight at the
 * bounds' own middle and the wrong zoom, the padding's offset lost. A fit still flying when its box changes size is asked
 * again at the new size; a landed one (a move of the reader's lands it too), a box the same size or a map at rest is left be.
 */
export function refitOnResize(flight: FitFlight | null, box: { width: number; height: number }, moving: boolean): boolean {
  return !!flight && moving && (flight.width !== box.width || flight.height !== box.height);
}

/** The fit the map is flying, with what was asked (`ask`: its bounds and options) and the key it settles (tend explore audit 19). */
export interface Flight<A> extends FitFlight {
  key: number;
  ask: A;
}

/** What the web map knows of its fits: the one flying, and whether a refit's own call is under way. */
export interface FitState<A> {
  flight: Flight<A> | null;
  refitting: boolean;
}

export const FIT_IDLE: FitState<never> = { flight: null, refitting: false };

type Box = { width: number; height: number };

/** The map's events, as the fit hears them: a fit asked (`moving`: whether the map moves once it is asked), a resize, a move's end, a refit's call returned. */
export type FitEvent<A> =
  | { kind: 'fit'; key: number; ask: A; box: Box; moving: boolean }
  | { kind: 'resize'; box: Box; moving: boolean }
  | { kind: 'moveend' }
  | { kind: 'refitted' };

/** What the map does: nothing; the fit again, its settle restarted for `settle` (F1); or skip a moveend fired mid-air by the refit's own stop (F2). */
export type FitDo<A> = { kind: 'none' } | { kind: 'refit'; ask: A; settle: number } | { kind: 'skip' };

/**
 * The web map's fit, one event at a time (tend explore 17 and its review, audit 19). A fit that moves is the flight; a
 * resize while it flies asks it again at the new size and restarts its settle, so a tab left before it lands redoes it
 * (`useTabMap`, NV3/NV4); the moveend that refit's own stop fires is not the map at rest (DC9) and keeps the record; any
 * other moveend (landed, or cut by the reader, a jump or another ease) clears it.
 */
export function fitStep<A>(s: FitState<A>, e: FitEvent<A>): { state: FitState<A>; do: FitDo<A> } {
  const none = { kind: 'none' } as const;
  switch (e.kind) {
    case 'fit':
      return { state: { flight: e.moving ? { key: e.key, ask: e.ask, ...e.box } : null, refitting: false }, do: none };
    case 'resize': {
      const f = s.flight;
      if (!f || !refitOnResize(f, e.box, e.moving)) return { state: s, do: none };
      return { state: { flight: { ...f, ...e.box }, refitting: true }, do: { kind: 'refit', ask: f.ask, settle: f.key } };
    }
    case 'moveend':
      return s.refitting ? { state: s, do: { kind: 'skip' } } : { state: { flight: null, refitting: false }, do: none };
    case 'refitted':
      return { state: { ...s, refitting: false }, do: none };
  }
}
