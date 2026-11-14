// @layer core
import type { LocatePermission } from '../atlas/findYou';
import type { Db } from '../db/types';

/**
 * After location is refused mid-walk, the web recorder follows the site's location permission (decision 0172, O22):
 * once it changes to granted, the walk records again by itself, with no new words. `watch` is the permission reader
 * (`watchLocatePermission`); `onGranted` runs once, and the following stops there (a restart that is refused again
 * follows again). The first report is how the permission stood at the refusal, never a change: a phone that blocks
 * the browser can refuse every fix while the site reads granted, and a restart on it would be refused at once, round
 * and round. A reset to ask, or no permissions API, resumes nothing. Returns the stop: a start or a stop of the
 * recorder ends the following it supersedes.
 */
export function followPermission(watch: (on: (state: LocatePermission) => void) => () => void, onGranted: () => void): () => void {
  let seen: LocatePermission | null = null;
  let done = false;
  let off: (() => void) | null = null;
  const stop = () => {
    done = true;
    off?.();
    off = null;
  };
  off = watch((state) => {
    if (done) return;
    const before = seen;
    seen = state;
    if (before === null || before === 'granted' || state !== 'granted') return;
    stop();
    onGranted();
  });
  if (done) stop();
  return stop;
}

/** What the refusal follower reads and does: the permission, the store's walks, and the recorder's resume. */
export interface RefusalPorts {
  watch: (on: (state: LocatePermission) => void) => () => void;
  walks: Pick<Db, 'getOpenWalk' | 'getPauses'>;
  resume: (walkId: string) => Promise<void>;
}

/**
 * Whether a refused walk is one to resume as location comes back (tend walk-screen audit 2-4): the walk the store holds
 * open, with no open pause. A refused Start has no row yet, a refused Resume leaves its walk paused, and a walk ended in
 * another tab is closed: none of them records. A failed read is a no.
 */
export async function resumable(walks: RefusalPorts['walks'], walkId: string): Promise<boolean> {
  try {
    const open = await walks.getOpenWalk();
    if (!open || open.id !== walkId || !open.open) return false;
    return !(await walks.getPauses(walkId)).some((p) => p.ended_at == null);
  } catch {
    return false;
  }
}

/**
 * The web recorder's follower (O22): `refused(id)` as location is refused while recording a walk; it follows the
 * permission only for a walk `resumable` says so of, and checks again before it resumes, ending the following when the
 * walk was paused or ended meanwhile. `stop` ends it (the recorder stopped, or started for another walk).
 */
export function refusalFollower(p: RefusalPorts) {
  let id: string | null = null;
  let off: (() => void) | null = null;
  // Each stop or new refusal makes an earlier one's pending read stale.
  let turn = 0;
  const stop = () => {
    turn++;
    id = null;
    off?.();
    off = null;
  };
  const granted = async (walkId: string, mine: number) => {
    const ok = await resumable(p.walks, walkId);
    if (mine !== turn) return;
    if (!ok) {
      stop();
      return;
    }
    stop();
    await p.resume(walkId).catch(() => {});
  };
  return {
    /** The walk being followed, if any. */
    following: (): string | null => id,
    stop,
    async refused(walkId: string): Promise<void> {
      stop();
      const mine = turn;
      if (!(await resumable(p.walks, walkId)) || mine !== turn) return;
      id = walkId;
      off = followPermission(p.watch, () => void granted(walkId, mine));
    },
  };
}
