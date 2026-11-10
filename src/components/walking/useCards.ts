import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import type { Faced } from '../../lib/moment';
import { deletions } from '../../lib/deletion';
import { distanceM } from '../../lib/geo';
import { capturesHere, type HereResult } from '../../lib/here';
import { MEMORY_RULES } from '../../lib/memories';
import { feedback } from '../../lib/motion';
import type { LngLat } from '../../lib/types';

/**
 * The walk's cards, one at a time: This spot, a place's card, a memory's preview, and the options
 * drawer, with the viewer they open. The rules are the screen's as they were: each opener closes the
 * others it closed before; Back (Android) and Escape (web) close the spot and memory cards and the
 * drawer; walking 30 m on closes the spot card and a memory's preview (MR4).
 */
export function useCards(a: { here: LngLat | null; setFollowing: (on: boolean) => void; navDest: LngLat | null; closeGap: () => void }) {
  const { here, setFollowing } = a;
  // A long press on the map opens a small sheet for that spot: Go here, and
  // what happened here (every capture near it, on any walk) when there is any.
  const [spot, setSpot] = useState<{ at: LngLat; here: HereResult | null; from: LngLat | null } | null>(null);
  const [whatHere, setWhatHere] = useState<HereResult | null>(null);
  const [hereKey, setHereKey] = useState(0);
  const hereTaps = useRef(0);
  const [markOpen, setMarkOpen] = useState<string | null>(null);
  // A memory pin's preview (MR4).
  const [memory, setMemory] = useState<{ result: HereResult; from: LngLat | null } | null>(null);
  // The walk's options (A2): the strip's drawer.
  const [options, setOptions] = useState(false);
  const [viewing, setViewing] = useState<Faced[] | null>(null);

  /** A long press on the map: the spot's card, with what happened there (MR, here). */
  async function pressMap(at: LngLat, radiusM: number | undefined, c: { busy: boolean; captures: Faced[] }) {
    if (c.busy || viewing || whatHere) return;
    setMarkOpen(null);
    setOptions(false);
    setMemory(null);
    feedback('tap');
    const tap = ++hereTaps.current;
    const found = await capturesHere(at, c.captures, radiusM).catch(() => null);
    if (tap !== hereTaps.current) return; // a newer press won
    // Storage still holds what waits in Undo: it isn't counted here (deletion audit 7).
    const r = found && { ...found, captures: found.captures.filter((x) => !deletions.hidden().has(x.id)) };
    setSpot({ at, here: r && r.captures.length ? r : null, from: here });
  }
  /** What happened here, from the spot card: its viewer, fresh each time. */
  const openHere = (r: HereResult) => {
    setHereKey((k) => k + 1);
    setWhatHere(r);
  };

  // The spot card (and the options card) goes once you walk on, or with Back (Android) and Escape (web).
  useEffect(() => {
    if (!spot && !memory) return;
    const close = () => {
      setSpot(null);
      setMemory(null);
      setOptions(false);
      setFollowing(true);
    };
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('keydown', onKey);
    return () => {
      back.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('keydown', onKey);
    };
  }, [spot, memory, setFollowing]);
  useEffect(() => {
    if (!spot?.from || !here || distanceM(spot.from, here) < 30) return;
    const t = setTimeout(() => setSpot(null), 0);
    return () => clearTimeout(t);
  }, [spot, here]);
  // The preview goes once you walk 30 m on (MR4).
  useEffect(() => {
    if (!memory?.from || !here || distanceM(memory.from, here) < MEMORY_RULES.closeM) return;
    const t = setTimeout(() => setMemory(null), 0);
    return () => clearTimeout(t);
  }, [memory, here]);

  // The map's marks: where you are going, and the spot whose card is open.
  const navDest = a.navDest;
  const marks = useMemo<LngLat[]>(() => [...(navDest ? [navDest] : []), ...(spot ? [spot.at] : [])], [navDest, spot]);

  /**
   * The drawer raised or lowered (NR7): raising it closes any card; mid-memo it stays down; lowered with the
   * range ring up, the map follows you again, out of the ring's zoom (audit, UI); a pan stays otherwise.
   */
  const drawer = (up: boolean, c: { locked: boolean; ringUp: boolean }) => {
    if (up) {
      setSpot(null);
      setMarkOpen(null);
      setMemory(null);
      a.closeGap();
    }
    setOptions(up && !c.locked);
    if (!up && c.ringUp) setFollowing(true);
  };
  /** A card (or the drawer) holds the slot: the pills and the other cards wait. `openMark` is the open place's item, if it still has one. */
  const covering = (openMark: unknown) => !!spot || !!openMark || options || !!memory;

  return {
    marks, drawer, covering,
    spot, setSpot, pressMap,
    whatHere, setWhatHere, hereKey, openHere,
    markOpen, setMarkOpen,
    memory, setMemory,
    options, setOptions,
    viewing, setViewing,
  };
}

export type Cards = ReturnType<typeof useCards>;
