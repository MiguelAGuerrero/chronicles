// @layer core

/**
 * Go here's find and its Cancel, as data. A find is the work of one Go here, from the tap to a route, a preview or a
 * failure; one is found at a time, and its spinner shows Cancel. Each find has its own number, so a Cancel ends only the
 * find it was pressed in, and ends with it: a later read is never told to stop by a Cancel that is over.
 */
export interface Finds {
  /** Counts the finds started: work begun for one can tell when another has taken over. */
  gen: number;
  /** A find is under way: its spinner and Cancel are up. */
  busy: boolean;
  /** Cancel was pressed during the find under way. */
  cancelled: boolean;
}

export const NO_FINDS: Finds = { gen: 0, busy: false, cancelled: false };

/** Go here: a new find, or null while one is under way (one route is found at a time; its spinner says so). */
export function startFind(f: Finds): Finds | null {
  return f.busy ? null : { ...f, gen: f.gen + 1, busy: true, cancelled: false };
}

/** Cancel: stops the find under way after the read at hand. With none under way, nothing changes. */
export function cancelFind(f: Finds): Finds {
  return f.busy ? { ...f, cancelled: true } : f;
}

/** After each await of find `gen`: it goes on only while it is the find under way and Cancel was not pressed. */
export function findGoesOn(f: Finds, gen: number): boolean {
  return f.busy && f.gen === gen && !f.cancelled;
}

/** Find `gen` ends, however it ends; its Cancel ends with it. Another find's ending leaves this one alone. */
export function endFind(f: Finds, gen: number): Finds {
  return f.gen === gen ? { ...f, busy: false, cancelled: false } : f;
}
