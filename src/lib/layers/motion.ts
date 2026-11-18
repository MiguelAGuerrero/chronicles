// @layer core
/**
 * Whether a map is moving, and a promise for its next settle (explore-dense-city DC9, audit 7): Explore keeps one outside
 * React, fed by the map's movestart and moveend, so a move never renders the screen. A map that goes away mid-move (a tab
 * change, a plan opening) is still: whatever waited for its settle goes on.
 */
export interface Motion {
  readonly moving: boolean;
  set(moving: boolean): void;
  settled(): Promise<void>;
  /** The map went away: whatever waited for its settle goes on. */
  gone(): void;
}

export function createMotion(): Motion {
  let moving = false;
  let waiting: (() => void)[] = [];
  const wake = () => {
    const all = waiting;
    waiting = [];
    for (const w of all) w();
  };
  return {
    get moving() {
      return moving;
    },
    set(m) {
      moving = m;
      if (!m) wake();
    },
    settled() {
      return moving ? new Promise<void>((resolve) => { waiting.push(resolve); }) : Promise.resolve();
    },
    gone() {
      moving = false;
      wake();
    },
  };
}
