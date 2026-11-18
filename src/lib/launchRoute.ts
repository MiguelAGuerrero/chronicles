// @layer shell
/**
 * The route the app opened on (NV2). A Home Screen web app can reopen on a
 * replay whose walk is no longer kept; that launch goes to Chronicle (decision
 * 0112), while the same replay reached from inside the app keeps its message
 * and its way back. The factory imports nothing, so `npm test` can run it; the
 * root layout notes every path. It keeps the app's instance beside it, so it is
 * a shell, as `memoGate` is (tend tabs 15).
 */
export function createLaunchRoute() {
  let first: string | null = null;
  let moved = false;
  return {
    /** Called with each path the app shows, from the first. */
    note(path: string) {
      if (first === null) first = path;
      else if (path !== first) moved = true;
    },
    /** Whether `path` is the one the app opened on and has not left. */
    isLaunch: (path: string) => !moved && first !== null && path === first,
  };
}

export const launchRoute = createLaunchRoute();
