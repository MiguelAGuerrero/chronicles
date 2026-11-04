import { settleWithin } from './settleWithin';

/**
 * An open walk at launch (NV2): the walk screen comes up straight away, with no
 * Explore first. The app is covered until the open walk has been looked up;
 * only then is the recorder picked back up, since on web that waits for the
 * browser's first fix (up to 10 s), and Explore showed all that time (the
 * owner's Home Screen app, Nov 3). Pure, so `npm test` can import it.
 */
export async function openWalkAtLaunch(deps: {
  /** The walk left open, read from the device. */
  findOpen: () => Promise<{ id: string } | null>;
  /** Opens the walk screen; may return a promise that settles once it is in front. */
  showWalk: () => unknown;
  /** Takes the launch cover down. */
  lift: () => void;
  /** Re-attaches recording, or stops a recorder left on with no walk (`reconcileOpenWalk`). */
  resume: () => Promise<unknown>;
  /** The longest the cover waits on the read, and again on the walk screen. */
  capMs: number;
}): Promise<void> {
  let open: { id: string } | null = null;
  const read = deps.findOpen().then(
    (w) => {
      open = w;
    },
    () => {},
  );
  await settleWithin(read, deps.capMs);
  // A replace commits a frame later: lifting at once showed the tabs for that frame.
  if (open) await settleWithin(Promise.resolve(deps.showWalk()), deps.capMs);
  deps.lift();
  await deps.resume().catch(() => {});
}
