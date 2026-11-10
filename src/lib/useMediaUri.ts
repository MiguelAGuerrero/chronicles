// @layer view
import type { Faced } from './moment';
import { useEffect, useState } from 'react';
import { releaseMedia, resolveMedia } from './media';

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
      if (resolved) releaseMedia(resolved);
    };
  }, [capture?.file_path]);
  return uri;
}
