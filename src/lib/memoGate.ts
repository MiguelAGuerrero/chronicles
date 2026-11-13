// @layer shell
/**
 * Whether a voice memo is recording anywhere (Navigate's row, the walk
 * screen), and the saves still under way (tabs audit 3). A walk never starts
 * while a memo records: leaving Navigate mid-memo saves it, and a Start or
 * Walk here tapped meanwhile waits for that save rather than starting under
 * it. Photos and videos being kept are tracked too, for the bar's Stop. Pure: no storage, no React.
 */
export function createMemoGate() {
  const on = new Set<object>();
  const saves = new Set<Promise<unknown>>();
  const keeps = new Set<Promise<unknown>>();
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
    /** A memo's save (or stop) under way; a start waits for it. */
    track(p: Promise<unknown>) {
      const settled = p.then(
        () => {},
        () => {},
      );
      saves.add(settled);
      void settled.then(() => saves.delete(settled));
    },
    /** True once every save under way has ended and no memo records. */
    async readyToStart(): Promise<boolean> {
      while (saves.size) await Promise.all([...saves]);
      return on.size === 0;
    },
  };
}

export const memoGate = createMemoGate();
