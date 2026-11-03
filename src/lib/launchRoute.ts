/**
 * The route the app opened on (NV2). A Home Screen web app can reopen on a
 * replay whose walk is no longer kept; that launch goes to Explore, while the
 * same replay reached from inside the app keeps its message and its way back.
 * Pure, so `npm test` can import it; the root layout notes every path.
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
