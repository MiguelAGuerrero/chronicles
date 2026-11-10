import { useEffect, useMemo, useRef, useState } from 'react';
import { useVisible } from '../../lib/deletion/useDeletions';
import { deletions } from '../../lib/deletion';
import { capturesHere, type HereResult } from '../../lib/here';
import { groupFirst, groupRadiusM, memoriesNear, memoryReader } from '../../lib/memories';
import type { Faced } from '../../lib/moment';
import type { LngLat, Walk } from '../../lib/types';
import { walkScreen } from '../../lib/walkScreen';
import type { Cards } from './useCards';

/**
 * Memories on revisit: earlier walks' captures within 100 m, as faint pins, on every walk (the owner's
 * call), never a buzz or a notification (MR1, MR6). The area is read once per 50 m (MR8). A pin opens its
 * preview (MR4), and the preview Memories here.
 */
export function useWalkMemories(a: { walk: Walk | null; here: LngLat | null; reminder: { captures: Faced[] } | null; cards: Cards }) {
  const { walk, here, cards } = a;
  const [memoryStore, setMemoryPool] = useState<Faced[]>([]);
  // A memory deleted from its viewer leaves its pin (D3).
  const memoryPool = useVisible(memoryStore);
  // The memory card drops what was deleted from its viewer (deletion audit 7).
  const memoryShown = useVisible(cards.memory?.result.captures);
  // One reader per walk: a slow read lands even as fixes come in, a failed one is tried again, and
  // it sends only a changed set (audit 1, 10).
  const [memoryReads] = useState(() => memoryReader((at) => walkScreen.momentsNear(at), setMemoryPool));
  useEffect(() => () => memoryReads.stop(), [memoryReads]);
  useEffect(() => {
    if (here) memoryReads.poll(here);
  }, [here, memoryReads]);
  // A capture whose reminder card is up has no pin meanwhile (MR7); the pins change only with the set (MR8).
  const memoryIds = memoriesNear({ pool: memoryPool, here, walkId: walk?.id ?? null, hidden: new Set(a.reminder?.captures.map((c) => c.id) ?? []) })
    .map((c) => c.id)
    .join(',');
  const memories = useMemo(() => {
    const ids = new Set(memoryIds.split(','));
    return memoryPool.filter((c) => ids.has(c.id));
  }, [memoryIds, memoryPool]);
  const [memoryView, setMemoryView] = useState<HereResult | null>(null);
  const memoryTaps = useRef(0);
  const openMemory = async (group: Faced[], at: LngLat) => {
    const tap = ++memoryTaps.current;
    // The tapped pin's own captures first, then every other memory from that spot, reaching the
    // group's farthest member (MR5, audit 3); this walk's own captures aren't memories.
    const r = await capturesHere(at, [], groupRadiusM(at, group)).catch(() => null);
    if (tap !== memoryTaps.current) return;
    const captures = groupFirst(group, r?.captures ?? [], walk?.id ?? null).filter((c) => !deletions.hidden().has(c.id));
    if (!captures.length) return;
    // One card at a time (audit 5).
    cards.setSpot(null);
    cards.setMarkOpen(null);
    cards.setOptions(false);
    cards.setMemory({ result: { captures, context: r?.context ?? new Map() }, from: here });
  };
  return { memories, memoryShown, memoryView, setMemoryView, openMemory };
}

export type WalkMemories = ReturnType<typeof useWalkMemories>;
