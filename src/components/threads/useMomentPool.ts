import { useEffect, useMemo, useState } from 'react';
import type { MomentView } from '../../lib/resurface/types';
import { poolWithOpenWalks, toMomentViews } from '../../lib/resurface/views';
import type { Faced } from '../../lib/moment';
import type { Walk } from '../../lib/types';
import { threads } from '../../lib/threads';

export interface MomentPool {
  views: MomentView[];
  byId: Map<string, MomentView>;
  /** `byId` and the moments of a walk still open: what a responses sheet lists (response thread RT13). */
  every: Map<string, MomentView>;
  walks: Map<string, Walk>;
  /** What the picker's gallery reads (picker media MP4): every moment whole, and every walk. */
  moments: Faced[];
  walkList: Walk[];
  ready: boolean;
}

/**
 * Every kept moment as the pickers and reference cards show it (OT5, moment references RF1, RF4, RF7), read once
 * when a screen that needs it mounts, and again when `key` or `again` changes (a response kept, RT7). Places come
 * from each walk's placing.
 */
export function useMomentPool(key: unknown = null, again = 0): MomentPool {
  const [data, setData] = useState<{ views: MomentView[]; every: MomentView[]; walks: Walk[]; moments: Faced[] } | null>(null);
  useEffect(() => {
    let live = true;
    threads.moments().then(
      (r) => live && setData({ views: toMomentViews(r.captures, r.walks), every: poolWithOpenWalks(r.captures, r.walks), walks: r.walks, moments: r.captures }),
      () => live && setData({ views: [], every: [], walks: [], moments: [] }),
    );
    return () => {
      live = false;
    };
  }, [key, again]);
  return useMemo(
    () => ({
      views: data?.views ?? [],
      byId: new Map((data?.views ?? []).map((v) => [v.id, v])),
      every: new Map((data?.every ?? []).map((v) => [v.id, v])),
      walks: new Map((data?.walks ?? []).map((w) => [w.id, w])),
      moments: data?.moments ?? [],
      walkList: data?.walks ?? [],
      ready: !!data,
    }),
    [data],
  );
}
