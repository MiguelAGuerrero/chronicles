// @layer view
import { useEffect, useState } from 'react';
import { ensureOvertureRelease, knownRelease } from './overture';

/**
 * The Overture release known, for screens that judge staleness (activity-density audit 8): checked once when the
 * screen mounts, so a walk opened straight from a launch knows it without visiting the Explore tab.
 */
export function useOvertureRelease(): string | null {
  const [release, setRelease] = useState<string | null>(knownRelease);
  useEffect(() => {
    let live = true;
    ensureOvertureRelease()
      .then((r) => live && setRelease(r))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return release;
}
