// @layer core

/**
 * Go here's find and its Cancel, as data. A find is the work of one Go here, from the tap to a route, a preview or a
 * failure; one is found at a time, and its spinner shows Cancel. Each find has its own number, so a Cancel ends only the
 * find it was pressed in, and ends with it: a later read is never told to stop by a Cancel that is over.
 *
 * A re-read is the streets read again around a walker off a route no source can mend (at most once a minute, up to
 * 90 s). It has its own flag and no spinner, so it never holds back a Go here: a Go here tapped meanwhile is found at
 * once (its map read waits for the re-read to let go of the map), and the re-read stops between views. Its streets join
 * the route only if that route is still followed when it ends.
 */
export interface Finds {
  /** Counts the finds started: work begun for one can tell when another has taken over. */
  gen: number;
  /** A find is under way: its spinner and Cancel are up. */
  underWay: boolean;
  /** Cancel was pressed during the find under way. */
  cancelled: boolean;
  /** The find count when the re-read under way began, or null when none runs. */
  reread: number | null;
}

export const NO_FINDS: Finds = { gen: 0, underWay: false, cancelled: false, reread: null };

/** Go here: a new find, or null while one is under way (one route is found at a time; its spinner says so). */
export function startFind(f: Finds): Finds | null {
  return f.underWay ? null : { ...f, gen: f.gen + 1, underWay: true, cancelled: false };
}

/** Cancel: stops the find under way after the read at hand. With none under way, nothing changes. */
export function cancelFind(f: Finds): Finds {
  return f.underWay ? { ...f, cancelled: true } : f;
}

/** After each await of find `gen`: it goes on only while it is the find under way and Cancel was not pressed. */
export function findGoesOn(f: Finds, gen: number): boolean {
  return f.underWay && f.gen === gen && !f.cancelled;
}

/** Find `gen` ends, however it ends; its Cancel ends with it. Another find's ending leaves this one alone. */
export function endFind(f: Finds, gen: number): Finds {
  return f.gen === gen ? { ...f, underWay: false, cancelled: false } : f;
}

/** A failed re-route reads the streets again: not while one runs or a Go here is found (it reads its own), and at most every `everyMs`. */
export function startReread(f: Finds, now: number, lastAt: number, everyMs: number): Finds | null {
  return f.underWay || f.reread !== null || now - lastAt < everyMs ? null : { ...f, reread: f.gen };
}

/** The re-read stops between views once a Go here has started since it began: the route it serves is being replaced. */
export function rereadStops(f: Finds): boolean {
  return f.reread !== null && f.gen !== f.reread;
}

/**
 * The re-read ends. Its streets join the route's sources only if the route it was read for is still followed: a Go here
 * that was cancelled or failed meanwhile leaves that route, which keeps them; one that started a new route replaced it.
 */
export function endReread(f: Finds, stillFollowed: boolean): { finds: Finds; keep: boolean } {
  return { finds: { ...f, reread: null }, keep: stillFollowed };
}
