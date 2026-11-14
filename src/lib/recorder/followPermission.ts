// @layer core
import type { LocatePermission } from '../atlas/findYou';

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
