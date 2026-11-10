import { useEffect, useMemo, useState } from 'react';
import type { MomentView } from '../../lib/resurface/types';
import { toMomentViews } from '../../lib/resurface/views';
import type { Walk } from '../../lib/types';
import { threads } from '../../lib/threads';

export interface MomentPool {
  views: MomentView[];
  byId: Map<string, MomentView>;
  walks: Map<string, Walk>;
  ready: boolean;
}

/**
 * Every kept moment as the pickers and reference cards show it (OT5, moment references RF1, RF4, RF7), read once
 * when a screen that needs it mounts, and again when `key` changes. Places come from each walk's placing.
 */
export function useMomentPool(key: unknown = null): MomentPool {
  const [data, setData] = useState<{ views: MomentView[]; walks: Walk[] } | null>(null);
  useEffect(() => {
    let live = true;
    threads.moments().then(
      (r) => live && setData({ views: toMomentViews(r.captures, r.walks), walks: r.walks }),
      () => live && setData({ views: [], walks: [] }),
    );
    return () => {
      live = false;
    };
  }, [key]);
  return useMemo(
    () => ({
      views: data?.views ?? [],
      byId: new Map((data?.views ?? []).map((v) => [v.id, v])),
      walks: new Map((data?.walks ?? []).map((w) => [w.id, w])),
      ready: !!data,
    }),
    [data],
  );
}
