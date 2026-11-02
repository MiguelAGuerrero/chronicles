/**
 * Whether a voice memo is recording anywhere (Navigate's row, the walk
 * screen), and the saves still under way (tabs audit 3). A walk never starts
 * while a memo records: leaving Navigate mid-memo saves it, and a Start or
 * Walk here tapped meanwhile waits for that save rather than starting under
 * it. Pure: no storage, no React.
 */
export function createMemoGate() {
  const on = new Set<object>();
  const saves = new Set<Promise<unknown>>();
  return {
    /** A capture path's memo started or stopped. */
    recording(owner: object, recording: boolean) {
      if (recording) on.add(owner);
      else on.delete(owner);
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
