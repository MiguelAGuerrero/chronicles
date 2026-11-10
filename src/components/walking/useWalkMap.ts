import { useCallback, useRef, useState } from 'react';
import type { WalkMapHandle } from '../map/types';

/** The one map's handle, its turn for the compass (CP2: it opens north-up), and whether it follows the walker. */
export function useWalkMap() {
  const mapRef = useRef<WalkMapHandle>(null);
  const [bearing, setBearing] = useState(0);
  // The map follows the walker until they pan or zoom it themselves.
  const [following, setFollowing] = useState(true);
  /** The compass's tap: the map back to north (CP2). */
  const resetNorth = useCallback(() => mapRef.current?.resetNorth(), []);
  return { mapRef, bearing, setBearing, following, setFollowing, resetNorth };
}
