// @layer view
import { useEffect, useMemo } from 'react';
import { useHidden, useOnDeleted } from '../deletion/useDeletions';
import { useStore } from '../useStore';
import { threads } from './index';
import { visibleThreads } from './rules';
import type { ThreadsData } from './types';

/**
 * The owner's threads as a screen shows them: read when a screen mounts, read again once a delete reached
 * storage, and with what waits in the Undo window already gone (OT14, OT15).
 */
export function useThreads(): { data: ThreadsData; loaded: boolean; reload: () => void } {
  const raw = useStore(threads.store, (s) => s.data);
  const loaded = useStore(threads.store, (s) => s.loaded);
  const hidden = useHidden();
  useEffect(() => {
    void threads.load().catch(() => {});
  }, []);
  useOnDeleted(() => void threads.load().catch(() => {}));
  const data = useMemo(() => visibleThreads(raw, hidden), [raw, hidden]);
  return { data, loaded, reload: () => void threads.load().catch(() => {}) };
}
