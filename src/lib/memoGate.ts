// @layer shell
import { stopUnderOf, type StopUnder } from './unsaved/stopEnd/core';
/**
 * Whether a voice memo is recording anywhere (Navigate's row, the walk
 * screen), and the saves still under way (tabs audit 3). A walk never starts
 * while a memo records: leaving Navigate mid-memo saves it, and a Start or
 * Walk here tapped meanwhile waits for that save rather than starting under
 * it. Photos and videos being kept are tracked too, for the bar's Stop. Pure: no storage, no React.
 *
 * The bar's Stop tells a memo recording from one still being saved (T35, the owner's yes, Nov 18): each save has a
 * number, and a hold whose wait ends with saves it already said goes through them. Anything under way keeps the walk
 * from the empty-walk drop (`underWay`).
 */
export function createMemoGate() {
  const on = new Set<object>();
  /** Each memo save under way: its number (T35) and its capture path (tend tabs audit 44). */
  const saves = new Map<Promise<unknown>, { n: number; owner: unknown }>();
  let numbered = 0;
  const keeps = new Set<Promise<unknown>>();
  /** Stops that went through a save, each until its walk's drop is decided (T35). */
  const pins = new Set<object>();
  return {
    /**
     * A photo or video being kept, from any capture path (capture-from-chronicle audit 6): Stop from the
     * recording bar waits for it, so a capture from Memories' band lands before the walk ends.
     */
    keep(p: Promise<unknown>) {
      const settled = p.then(
        () => {},
        () => {},
      );
      keeps.add(settled);
      void settled.then(() => keeps.delete(settled));
    },
    /** Resolves once every capture being kept has landed (or failed). */
    async kept(): Promise<void> {
      while (keeps.size) await Promise.all([...keeps]);
    },
    /** A capture path's memo started or stopped. */
    recording(owner: object, recording: boolean) {
      if (recording) on.add(owner);
      else on.delete(owner);
    },
    /** True while a memo records anywhere (the transcripts wait for it, TX15). */
    recordingNow(): boolean {
      return on.size > 0;
    },
    /** A memo's save (or stop) under way, of the capture path `owner`; a start waits for it. */
    track(p: Promise<unknown>, owner: unknown = null) {
      const settled = p.then(
        () => {},
        () => {},
      );
      saves.set(settled, { n: ++numbered, owner });
      void settled.then(() => saves.delete(settled));
    },
    /** True once every save under way has ended and no memo records. */
    async readyToStart(): Promise<boolean> {
      while (saves.size) await Promise.all([...saves.keys()]);
      return on.size === 0;
    },
    /** What a Stop meets once its wait is over (T35), decided in core from this gate's state (tend tabs audit 43). */
    stopUnder(warned: readonly number[]): StopUnder {
      return stopUnderOf({ saving: [...saves.values()], on: [...on], warned });
    },
    /** A memo recording or being saved, a photo or video being kept, or a stop through one: the walk is not dropped. */
    underWay(): boolean {
      return on.size > 0 || saves.size > 0 || keeps.size > 0 || pins.size > 0;
    },
    /** Holds `underWay` until released (twice is harmless): a stop through a save, until its walk's drop is decided. */
    pin(): () => void {
      const mine = {};
      pins.add(mine);
      return () => void pins.delete(mine);
    },
  };
}

export const memoGate = createMemoGate();
