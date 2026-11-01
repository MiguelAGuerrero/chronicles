/**
 * The open walk changed (NV8): started, paused, resumed or stopped. The
 * keeper of the open walk, mounted above the tabs, reads it again, so the
 * recording bar and the walk screen show the same walk and pauses. Pure: no
 * storage here.
 */
type Listener = () => Promise<void> | void;
const listeners = new Set<Listener>();

export function onWalkChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Resolves once every listener has read the change. */
export async function notifyWalkChanged(): Promise<void> {
  await Promise.all([...listeners].map((l) => Promise.resolve(l()).catch(() => {})));
}
