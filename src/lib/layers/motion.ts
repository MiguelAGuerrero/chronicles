// @layer core
/**
 * Whether a map is moving, and a promise for its next settle (explore-dense-city DC9, audit 7). Not built yet.
 */
export interface Motion {
  readonly moving: boolean;
  set(moving: boolean): void;
  settled(): Promise<void>;
  /** The map went away: whatever waited for its settle goes on. */
  gone(): void;
}
export function createMotion(): Motion {
  throw new Error('createMotion: not built (explore-dense-city audit 7)');
}
