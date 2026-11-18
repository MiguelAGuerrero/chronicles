// @layer view
import type { Faced } from './moment';
import { useEffect, useState } from 'react';
import { releaseMedia, resolveMedia } from './media';

/** How long a URL lives past its last use, so a load already started can finish. */
const RELEASE_AFTER_MS = 2000;

/** Resolves a capture's stored media to a URI it can be shown or played from. */
export function useMediaUri(capture: Faced | null): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let resolved: string | null = null;
    if (capture?.file_path) {
      resolveMedia(capture.file_path)
        .then((u) => {
          resolved = u;
          if (alive) setUri(u);
          else if (u) releaseMedia(u);
        })
        .catch(() => alive && setUri(null));
    }
    return () => {
      alive = false;
      setUri(null);
      // Let go a moment later: a picture still loading the old URL as its file changes (an edit's new still) would
      // otherwise ask for a revoked blob, which the browser logs as an error (video-thumbnails ui 1).
      const old = resolved;
      if (old) setTimeout(() => releaseMedia(old), RELEASE_AFTER_MS);
    };
  }, [capture?.file_path]);
  return uri;
}
